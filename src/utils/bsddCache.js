/**
 * bsddCache.js — Persistent local cache for the bSDD IFC 4.3 dictionary.
 *
 * On first use:  fetches dictionary metadata + all classes (paginated, "Ifc"/"Pset_"/"Qto_" prefixes)
 * Version check: compares stored lastUpdatedUtc with live API on every app start; re-fetches if stale
 * Properties:    fetched lazily per class via API; results cached in-memory + persisted to file
 */

const BSDD_API_BASE = 'https://api.bsdd.buildingsmart.org';
const IFC_DICT_URI = 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3';
const CLASSES_CACHE_KEY = 'bsdd-ifc43-classes';
const PROPS_CACHE_KEY = 'bsdd-ifc43-props';
const FETCH_TIMEOUT = 30000;
const PAGE_LIMIT = 1000;

// ─── Session state ────────────────────────────────────────────────────────────
let _state = 'idle';   // 'idle' | 'loading' | 'ready' | 'error'
let _stage = '';
let _current = 0;
let _total = 0;
let _classCount = 0;
let _version = '';
let _lastUpdatedUtc = '';
let _classData = null;          // Array<{code,name,uri,description,classType}>
let _propsMap = new Map();      // uri → Array<property>
let _inFlightProps = new Map(); // uri → Promise (dedup parallel requests)
let _initPromise = null;
let _progressCallback = null;
let _propsSaveTimer = null;

// ─── Local-only utilities (duplicated to avoid circular import with schemaSearch.js) ─
const splitCamelCase = (str) => {
  if (!str) return [];
  const result = [];
  for (const seg of str.split(/[._]+/)) {
    if (!seg) continue;
    // Pure all-caps segment (e.g. "FRAME", "BRACED") — treat as one word
    if (/^[A-Z][A-Z0-9]*$/.test(seg) && seg.length > 1) {
      result.push(seg.toLowerCase());
    } else {
      // PascalCase: [A-Z][a-z]+ grabs mixed-case words; [A-Z]+(?=[A-Z]|$) grabs all-caps runs
      const parts = seg.match(/[A-Z][a-z]+|[A-Z]+(?=[A-Z]|$)/g) || [];
      result.push(...parts.map(w => w.toLowerCase()));
    }
  }
  return result.filter(w => w.length > 1 && w !== 'ifc' && w !== 'pset' && w !== 'qto');
};
const wordMatches = (q, n) => {
  if (q === n) return true;
  const min = Math.min(q.length, n.length);
  return min >= 4 && (q.startsWith(n) || n.startsWith(q));
};
const matchesByParts = (name, queryWords) => {
  const parts = splitCamelCase(name);
  return parts.length > 0 && queryWords.every(qw => parts.some(p => wordMatches(qw, p)));
};
// True if queryWords appear as consecutive camelCase parts (e.g. ["door","lining"] in ["door","lining","properties"])
const matchesAdjacentParts = (code, queryWords) => {
  if (queryWords.length < 2) return false;
  const parts = splitCamelCase(code);
  if (parts.length < queryWords.length) return false;
  for (let i = 0; i <= parts.length - queryWords.length; i++) {
    if (queryWords.every((qw, j) => wordMatches(qw, parts[i + j]))) return true;
  }
  return false;
};
// True if the code contains all query words concatenated as a substring (e.g. "doorlining" in "IfcDoorLiningProperties")
const matchesConcatenated = (code, queryWords) => {
  if (queryWords.length < 2) return false;
  const flat = (code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return flat.includes(queryWords.join(''));
};
// Extract searchable words from both code (camelCase) and human-readable name
const getEntityWords = (c) => {
  const codeParts = splitCamelCase(c.code || '');
  const nameWords = (c.name || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 1 && w !== 'ifc');
  const seen = new Set(codeParts);
  const all = [...codeParts];
  for (const w of nameWords) { if (!seen.has(w)) { seen.add(w); all.push(w); } }
  return all;
};

// ─── Storage helpers ──────────────────────────────────────────────────────────
const _readCache = async (key) => {
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.cacheRead)
      return await window.electronAPI.cacheRead(key);
    const s = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`bsdd_${key}`) : null;
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};
const _writeCache = async (key, data) => {
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.cacheWrite) {
      await window.electronAPI.cacheWrite(key, data); return;
    }
    if (typeof sessionStorage !== 'undefined')
      sessionStorage.setItem(`bsdd_${key}`, JSON.stringify(data));
  } catch (e) { console.warn('[bsddCache] write failed:', key, e.message); }
};

// ─── Progress notification ────────────────────────────────────────────────────
const _notify = () => _progressCallback?.({ state: _state, stage: _stage, current: _current, total: _total, classCount: _classCount, version: _version });

// ─── bSDD API fetch (single-retry on 429) ────────────────────────────────────
const _apiFetch = async (url, signal, retried = false) => {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  signal?.addEventListener('abort', () => ctrl.abort());
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' }, signal: ctrl.signal });
    clearTimeout(tid);
    if (res.status === 429 && !retried) {
      const wait = Math.min(parseInt(res.headers.get('Retry-After') || '10', 10) * 1000, 10000);
      await new Promise(r => setTimeout(r, wait));
      return _apiFetch(url, signal, true);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.json();
  } finally { clearTimeout(tid); }
};

// ─── Fetch dictionary metadata (for version check) ───────────────────────────
const _fetchDictMeta = async () => {
  const data = await _apiFetch(`${BSDD_API_BASE}/api/Dictionary/v1?${new URLSearchParams({ Uri: IFC_DICT_URI })}`);
  return {
    version: data?.version || data?.Version || '',
    lastUpdatedUtc: data?.lastUpdatedUtc || data?.LastUpdatedUtc || data?.releaseDate || ''
  };
};

// ─── Fetch all IFC classes (paginated, three prefix searches) ────────────────
const _fetchAllClasses = async () => {
  const all = [];
  const seen = new Set();
  for (const prefix of ['Ifc', 'Pset_', 'Qto_']) {
    let offset = 0;
    while (true) {
      const params = new URLSearchParams({ SearchText: prefix, DictionaryUris: IFC_DICT_URI, Offset: String(offset), Limit: String(PAGE_LIMIT) });
      const data = await _apiFetch(`${BSDD_API_BASE}/api/Class/Search/v1?${params}`);
      const page = data?.classes || data?.Classes || [];
      for (const c of page) {
        if (!c?.uri || seen.has(c.uri)) continue;
        seen.add(c.uri);
        all.push({ code: c.referenceCode || c.code || c.name || '', name: c.name || '', uri: c.uri || '', description: c.definition || c.description || '', classType: c.classType || 'Class' });
      }
      _current = all.length;
      _notify();
      if (page.length < PAGE_LIMIT) break;
      offset += PAGE_LIMIT;
      await new Promise(r => setTimeout(r, 250)); // rate-limit buffer between pages
    }
    await new Promise(r => setTimeout(r, 500)); // buffer between prefix searches
  }
  return all;
};

// ─── Main initialisation ──────────────────────────────────────────────────────
const _doInit = async () => {
  _stage = 'Checking version…'; _notify();
  let meta;
  try { meta = await _fetchDictMeta(); }
  catch (e) { throw new Error(`Cannot reach bSDD: ${e.message}`); }

  const [savedClasses, savedProps] = await Promise.all([_readCache(CLASSES_CACHE_KEY), _readCache(PROPS_CACHE_KEY)]);
  const cacheValid = savedClasses?.lastUpdatedUtc && savedClasses.lastUpdatedUtc === meta.lastUpdatedUtc && Array.isArray(savedClasses.classes) && savedClasses.classes.length > 0;

  if (cacheValid) {
    _classData = savedClasses.classes;
    _propsMap = savedProps ? new Map(Object.entries(savedProps).filter(([, v]) => Array.isArray(v) && v.length > 0)) : new Map();
    _version = meta.version; _lastUpdatedUtc = meta.lastUpdatedUtc; _classCount = _classData.length;
    return;
  }

  _stage = 'Loading IFC classes…'; _current = 0; _total = 0; _notify();
  _classData = await _fetchAllClasses();
  _version = meta.version; _lastUpdatedUtc = meta.lastUpdatedUtc; _classCount = _classData.length;
  _propsMap = new Map(); // clear stale property cache on version change

  await _writeCache(CLASSES_CACHE_KEY, { lastUpdatedUtc: meta.lastUpdatedUtc, version: meta.version, fetchedAt: Date.now(), classes: _classData });
  await _writeCache(PROPS_CACHE_KEY, {});
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const getBsddCacheState = () => ({ state: _state, stage: _stage, current: _current, total: _total, classCount: _classCount, version: _version });

export const initBsddCache = (onProgress) => {
  _progressCallback = onProgress;
  if (_state === 'ready') { _stage = 'ready'; _notify(); return Promise.resolve(); }
  if (_state === 'loading') return _initPromise;
  _state = 'loading';
  _initPromise = _doInit()
    .then(() => { _state = 'ready'; _stage = 'ready'; _notify(); })
    .catch(e => { _state = 'error'; _stage = 'error'; console.error('[bsddCache] Init failed:', e.message); _notify(); throw e; });
  return _initPromise;
};

const BSDD_STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'in', 'for', 'to', 'and', 'or', 'with', 'by', 'at', 'on', 'is', 'are', 'its', 'from', 'as', 'that', 'this']);

/** Local class search. Returns null if cache not yet ready (caller should fall back to API). */
export const searchBsddCached = (query, matchType = 'exact') => {
  if (_state !== 'ready' || !_classData) return null;
  const ql = query.toLowerCase().trim();
  if (!ql) return [];

  // Strip stop words from multi-word queries; fall back to full term if all words are stop words
  const allWords = ql.split(/\s+/).filter(w => w.length > 0);
  const qw = allWords.filter(w => !BSDD_STOP_WORDS.has(w));
  const effectiveWords = qw.length > 0 ? qw : allWords;

  const toResult = (c, score) => ({ name: c.code || c.name || '', code: c.code, description: c.name && c.code && c.name !== c.code ? c.name : (c.description || ''), category: 'bSDD (IFC 4.3)', uri: c.uri, score, matchType, resultType: c.classType === 'GroupOfProperties' ? 'propertySet' : 'class' });

  // Substring match on full query (single word or phrase)
  const subMatches = _classData.filter(c => {
    const n = (c.name || '').toLowerCase(), co = (c.code || '').toLowerCase();
    if (n.includes(ql) || co.includes(ql)) return true;
    if (matchType === 'semantic' && (c.description || '').toLowerCase().includes(ql)) return true;
    return false;
  });
  if (subMatches.length > 0) return subMatches.map(c => toResult(c, 1)).slice(0, 25);

  // AND match: all effective words must appear in code or name words
  // Score tiers: concatenated adjacent (e.g. "doorlining") > adjacent parts > anywhere in parts
  const andMatches = _classData.filter(c => {
    const words = getEntityWords(c);
    return words.length > 0 && effectiveWords.every(qw => words.some(p => wordMatches(qw, p)));
  });
  if (andMatches.length > 0) {
    return andMatches
      .map(c => {
        const words = getEntityWords(c);
        const coverage = effectiveWords.filter(w => words.some(p => wordMatches(w, p))).length;
        const adjacentBonus = matchesAdjacentParts(c.code, effectiveWords) ? 2
          : matchesConcatenated(c.code, effectiveWords) ? 1 : 0;
        return { ...toResult(c, coverage), _coverage: coverage + adjacentBonus };
      })
      .sort((a, b) => b._coverage - a._coverage)
      .slice(0, 25);
  }

  // OR fallback: any effective word matches — return sorted by how many words match
  // Same adjacency bonus within the OR tier for better ranking
  if (effectiveWords.length > 1) {
    const orMatches = _classData
      .map(c => {
        const words = getEntityWords(c);
        const count = effectiveWords.filter(w => words.some(p => wordMatches(w, p))).length;
        if (count === 0) return null;
        const adjacentBonus = matchesAdjacentParts(c.code, effectiveWords) ? 2
          : matchesConcatenated(c.code, effectiveWords) ? 1 : 0;
        return { ...toResult(c, count), _coverage: count + adjacentBonus };
      })
      .filter(Boolean)
      .sort((a, b) => b._coverage - a._coverage)
      .slice(0, 25);
    if (orMatches.length > 0) return orMatches;
  }

  return [];
};

/** Fetch class properties, using the persistent cache when possible. */
export const getOrFetchBsddProperties = async (classUri, className, signal) => {
  if (!classUri) return [];
  if (_propsMap.has(classUri)) return _propsMap.get(classUri);
  if (_inFlightProps.has(classUri)) return _inFlightProps.get(classUri);

  const promise = (async () => {
    try {
      const params = new URLSearchParams({ uri: classUri, includeClassProperties: 'true' });
      const data = await _apiFetch(`${BSDD_API_BASE}/api/Class/v1?${params}`, signal);
      const rawProps = data?.classProperties || data?.ClassProperties || data?.properties || [];
      const props = rawProps
        .filter(p => p && (p.name || p.Name || p.propertyCode || p.code))
        .map(p => {
          const name = p.name || p.Name || p.propertyCode || p.code || '';
          const code = p.propertyCode || p.code || p.referenceCode || name;
          const dt = p.dataType || p.DataType || p.dataTypeName || '';
          const desc = p.definition || p.description || p.Definition || p.Description || '';
          const ps = p.propertySet || p.PropertySet || p.propertySetName || '';
          return { name, code, description: [dt ? `[${dt}]` : '', desc].filter(Boolean).join(' '), category: ps ? `${className} · ${ps}` : `${className} · Property`, uri: p.propertyUri || p.uri || p.Uri || '', score: 1, matchType: 'exact', resultType: 'property' };
        });
      // Only cache non-empty results so empty responses (from API errors or truly empty classes)
      // can be retried on the next call rather than being silently stuck as empty forever.
      if (props.length > 0) {
        _propsMap.set(classUri, props);
        _schedulePropsSave();
      }
      return props;
    } catch (e) {
      if (signal?.aborted || e.name === 'AbortError') throw new DOMException('Aborted', 'AbortError');
      console.warn('[bsddCache] Property fetch failed:', classUri, e.message);
      // Do NOT cache the failure — allow the next call to retry the API.
      return [];
    }
  })().finally(() => _inFlightProps.delete(classUri));

  _inFlightProps.set(classUri, promise);
  return promise;
};

const _schedulePropsSave = () => {
  if (_propsSaveTimer) clearTimeout(_propsSaveTimer);
  _propsSaveTimer = setTimeout(() => {
    _propsSaveTimer = null;
    _writeCache(PROPS_CACHE_KEY, Object.fromEntries([..._propsMap.entries()].filter(([, v]) => Array.isArray(v) && v.length > 0))).catch(() => {});
  }, 3000);
};
