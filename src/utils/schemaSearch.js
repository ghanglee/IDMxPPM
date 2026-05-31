/**
 * Schema Search Utility
 * Provides exact and semantic search for external schemas
 */

import SCHEMA_INFO from '../data/schemas/idsSchema';
import { getBsddCacheState, searchBsddCached, getOrFetchBsddProperties } from './bsddCache.js';

/**
 * Calculate similarity score between two strings (for semantic matching)
 * Uses Levenshtein distance and keyword matching
 */
const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Exact match
  if (s1 === s2) return 1;

  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Word overlap
  const words1 = s1.split(/\W+/).filter(w => w.length > 2);
  const words2 = s2.split(/\W+/).filter(w => w.length > 2);
  const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
  if (commonWords.length > 0) {
    return 0.5 + (commonWords.length / Math.max(words1.length, words2.length)) * 0.3;
  }

  // Character-based similarity (simple)
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1;

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length * 0.4;
};

/**
 * Normalize schema result to ensure consistent field structure
 * @param {Object} item - Raw schema item
 * @param {string} schemaName - Schema name for fallback category
 * @returns {Object} Normalized result
 */
const normalizeSchemaItem = (item, schemaName = 'Unknown') => {
  if (!item) return null;

  return {
    name: item.name || item.code || 'Unknown',
    code: item.code || item.name || '',
    description: item.description || '',
    category: item.category || schemaName,
    uri: item.uri || '',
    score: item.score || 1,
    matchType: item.matchType || 'exact'
  };
};

// Split a PascalCase/CamelCase IFC name into lowercase word parts.
// "IfcDoorPaneProperties" → ["door", "pane", "properties"]
// "OverallHeight" → ["overall", "height"]
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

// True if a query word matches a camelCase part word.
// Allows prefix matching so plurals/stems resolve: "walls"↔"wall", "heights"↔"height".
const wordMatches = (queryWord, nameWord) => {
  if (queryWord === nameWord) return true;
  const minLen = Math.min(queryWord.length, nameWord.length);
  if (minLen >= 4 && (queryWord.startsWith(nameWord) || nameWord.startsWith(queryWord))) return true;
  return false;
};

// True if every query word matches some camelCase part of a name.
const matchesByParts = (name, queryWords) => {
  const parts = splitCamelCase(name);
  if (parts.length === 0) return false;
  return queryWords.every(qw => parts.some(part => wordMatches(qw, part)));
};
// True if queryWords appear as consecutive camelCase parts.
const matchesAdjacentParts = (code, queryWords) => {
  if (queryWords.length < 2) return false;
  const parts = splitCamelCase(code);
  if (parts.length < queryWords.length) return false;
  for (let i = 0; i <= parts.length - queryWords.length; i++) {
    if (queryWords.every((qw, j) => wordMatches(qw, parts[i + j]))) return true;
  }
  return false;
};
// True if the code contains all query words concatenated as a contiguous substring.
const matchesConcatenated = (code, queryWords) => {
  if (queryWords.length < 2) return false;
  const flat = (code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return flat.includes(queryWords.join(''));
};
// Adjacency bonus: 2 for adjacent camelCase parts, 1 for concatenated substring, 0 otherwise.
const adjacencyBonus = (code, queryWords) =>
  matchesAdjacentParts(code, queryWords) ? 2 : matchesConcatenated(code, queryWords) ? 1 : 0;

// Strip the most common English plural suffixes before sending to an external API.
// "walls" → "wall", "properties" → "property", "openings" → "opening".
const stemWord = (w) => {
  const word = (w || '').toLowerCase();
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.length > 5 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
};

/**
 * Grouped search for local schemas.
 * Multi-word queries can span a class name AND a property name in a single search.
 * e.g. "door height" → finds IfcDoor entity, then filters its properties by "height"
 * and returns { results: [], groups: [{ classCode, className, classUri, properties }] }.
 * Falls back to the flat searchSchema result for single-word or non-IFC schemas.
 * NOTE: resolveSchemaKey is declared below; this is safe because searchSchemaGrouped's body
 * only runs at call time (after the module finishes loading), not at module evaluation time.
 */
export const searchSchemaGrouped = (schema, query, matchType = 'exact') => {
  const key = resolveSchemaKey(schema);
  const schemaInfo = SCHEMA_INFO[key];
  if (!schemaInfo?.data?.length) return { results: [], groups: [] };

  const data = schemaInfo.data;
  const queryLower = (query || '').toLowerCase().trim();
  if (!queryLower) return { results: [], groups: [] };

  const words = queryLower.split(/\s+/).filter(w => w.length > 0);

  // Single-word or no properties in this schema: plain flat search
  const hasProperties = data.some(item => item.resultType === 'property');
  if (words.length < 2 || !hasProperties) {
    return { results: searchSchema(schema, query, matchType), groups: [] };
  }

  // Partition data into entities and properties
  const entities = data.filter(item => item.resultType !== 'property');
  const properties = data.filter(item => item.resultType === 'property');

  // Find entities where ANY query word matches a camelCase part of the entity name
  const matchedEntities = entities.filter(item => {
    const parts = splitCamelCase(item.name || '');
    return words.some(qw => parts.some(part => wordMatches(qw, part)));
  });

  const standaloneResults = [];
  const groups = [];
  const seenGroupKeys = new Set();

  for (const entity of matchedEntities) {
    const entityParts = splitCamelCase(entity.name);
    // Words not consumed by the entity name → these must match a property
    const propWords = words.filter(qw => !entityParts.some(part => wordMatches(qw, part)));

    // Collect properties that belong to this entity (category starts with "EntityName ·")
    const entityProps = properties.filter(p =>
      (p.category || '').toLowerCase().startsWith(entity.name.toLowerCase() + ' ·')
    );

    if (propWords.length === 0) {
      // All query words consumed by the entity name → entity is a direct class-level result
      // Apply adjacency bonus so e.g. "IfcDoorLining*" ranks above plain "IfcDoor" for "door lining"
      const bonus = adjacencyBonus(entity.name, words);
      standaloneResults.push(normalizeSchemaItem({ ...entity, score: 1 + bonus, matchType: 'exact' }, schema));
      continue;
    }

    if (entityProps.length === 0) continue;

    // Filter properties by remaining words; also try camelCase split for property name matching
    const matching = entityProps.filter(p => {
      const haystack = `${p.name} ${p.description}`.toLowerCase();
      return matchType === 'semantic'
        ? propWords.some(w => haystack.includes(w) || matchesByParts(p.name || '', [w]))
        : propWords.every(w => haystack.includes(w) || matchesByParts(p.name || '', [w]));
    });
    if (matching.length === 0) continue;

    // Sub-group by category (e.g. "IfcDoor · Attributes" vs "IfcDoor · Pset_DoorCommon")
    const catMap = new Map();
    for (const prop of matching) {
      const cat = prop.category || entity.name;
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat).push(prop);
    }
    for (const [cat, props] of catMap) {
      if (seenGroupKeys.has(cat)) continue;
      seenGroupKeys.add(cat);
      const parts = cat.split(' · ');
      groups.push({
        classCode: entity.name,
        className: parts[1] || '',
        classUri: cat,
        resultType: 'propertySet',
        properties: props
      });
    }
  }

  if (standaloneResults.length > 0 || groups.length > 0) {
    standaloneResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    return { results: standaloneResults, groups };
  }

  // No matches — fall back to flat search
  return { results: searchSchema(schema, query, matchType), groups: [] };
};

/**
 * Normalize a schema name for lookup — strips whitespace and compares case-insensitively.
 * Returns the canonical SCHEMA_INFO key, or the original string if no match found.
 */
const resolveSchemaKey = (schema) => {
  if (!schema) return schema;
  if (SCHEMA_INFO[schema]) return schema; // Fast path: exact match
  const stripped = schema.replace(/\s/g, '').toLowerCase();
  return Object.keys(SCHEMA_INFO).find(k => k.replace(/\s/g, '').toLowerCase() === stripped) || schema;
};

/**
 * Search schema data with exact or semantic matching
 * @param {string} schema - Schema name (e.g., 'IFC 2x3', 'CityGML')
 * @param {string} query - Search query
 * @param {string} matchType - 'exact' or 'semantic'
 * @param {number} limit - Maximum results to return
 * @returns {Array} Search results
 */
export const searchSchema = (schema, query, matchType = 'exact', limit = 20) => {
  try {
    // Defensive check for SCHEMA_INFO
    if (!SCHEMA_INFO || typeof SCHEMA_INFO !== 'object') {
      console.error('SCHEMA_INFO not loaded properly');
      return [];
    }

    const schemaInfo = SCHEMA_INFO[resolveSchemaKey(schema)];

    if (!schemaInfo) {
      console.warn(`Schema '${schema}' not found in SCHEMA_INFO`);
      return [];
    }

    if (!schemaInfo.searchable) {
      console.warn(`Schema '${schema}' is not searchable`);
      return [];
    }

    const data = schemaInfo.data;
    if (!data || !Array.isArray(data)) {
      console.warn(`Schema '${schema}' has no data array`);
      return [];
    }

    if (data.length === 0) {
      // Schema may use API instead of local data (like bSDD)
      if (schemaInfo.apiEnabled) {
        console.info(`Schema '${schema}' uses API, no local data available`);
      }
      return [];
    }

    const queryLower = (query || '').toLowerCase().trim();
    if (!queryLower) {
      // Return first N items if no query
      return data
        .slice(0, limit)
        .map(item => normalizeSchemaItem(item, schema))
        .filter(item => item !== null);
    }

    let results = [];

    if (matchType === 'exact') {
      // Exact match: substring fast path, then camelCase-split + fuzzy word matching.
      // Handles composite names ("door pane" → IfcDoorPaneProperties) and
      // plural forms ("walls" → IfcWall, "properties" → IfcProperty*).
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
      results = data.filter(item => {
        if (!item) return false;
        const name = (item.name || '').toLowerCase();
        const code = (item.code || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        if (name.includes(queryLower) || code.includes(queryLower) || description.includes(queryLower)) return true;
        return matchesByParts(item.name || '', queryWords) || matchesByParts(item.code || '', queryWords);
      }).map(item => normalizeSchemaItem({
        ...item,
        score: 1,
        matchType: 'exact'
      }, schema));
    } else {
      // Semantic match - also search in descriptions and calculate relevance
      results = data.filter(item => item).map(item => {
        const name = item.name || '';
        const code = item.code || '';
        const description = item.description || '';
        const category = item.category || '';

        // Calculate scores for different fields
        const nameScore = calculateSimilarity(name, query);
        const codeScore = calculateSimilarity(code, query);
        const descScore = calculateSimilarity(description, query);
        const categoryScore = calculateSimilarity(category, query);

        // Weighted average (code gets extra weight for classification systems)
        const score = Math.max(nameScore, codeScore) * 0.5 + descScore * 0.3 + categoryScore * 0.2;

        return normalizeSchemaItem({
          ...item,
          score,
          matchType: 'semantic'
        }, schema);
      }).filter(item => item && item.score > 0.2)
        .sort((a, b) => b.score - a.score);
    }

    // Filter out any null results and return
    return results.filter(item => item !== null).slice(0, limit);
  } catch (error) {
    console.error('searchSchema error:', error);
    return [];
  }
};

// bSDD API configuration
// Search endpoints are unsecured (no auth required), only need User-Agent header
const BSDD_API_BASE = 'https://api.bsdd.buildingsmart.org';
const BSDD_IFC_DICTIONARY_URI = 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3';
const BSDD_USER_AGENT = 'xPPM-NeoSeoul/1.5';
const BSDD_TIMEOUT = 30000; // 30 seconds (bSDD API can have cold-start latency)

/** Thrown when bSDD returns 429 and all retries are exhausted. */
export class RateLimitError extends Error {
  constructor(retryAfterMs) {
    super('bSDD rate limit exceeded. Please wait before retrying.');
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Helper: make a bSDD API request with timeout and error handling.
 * Retries once on 429 after honouring the Retry-After header (capped at 10 s).
 * If the retry also gets 429, throws RateLimitError so callers can show a countdown.
 * Accepts an external AbortSignal so callers can cancel in-flight requests.
 */
const bsddFetch = async (url, externalSignal, _retries = 1) => {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => { timedOut = true; controller.abort(); }, BSDD_TIMEOUT);

  if (externalSignal?.aborted) {
    clearTimeout(timeoutId);
    throw new DOMException('Aborted', 'AbortError');
  }

  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': BSDD_USER_AGENT
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.status === 429) {
      const retryAfterSec = parseInt(response.headers.get('Retry-After') || '60', 10);
      if (_retries > 0) {
        // Brief transient rate-limit: wait up to 10 s and retry once silently
        const delay = Math.min(retryAfterSec * 1000, 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        if (externalSignal?.aborted) throw new DOMException('Aborted', 'AbortError');
        return bsddFetch(url, externalSignal, _retries - 1);
      }
      // Both attempts rate-limited — throw so callers show the countdown UX
      throw new RateLimitError(Math.max(retryAfterSec, 60) * 1000);
    }

    if (!response.ok) {
      throw new Error(`bSDD API error: ${response.status} ${response.statusText}`);
    }
    try {
      return await response.json();
    } catch (jsonError) {
      throw new Error('bSDD API returned an invalid response. The server may be experiencing issues.');
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      if (externalSignal?.aborted) throw error;
      if (timedOut) throw new Error('bSDD server did not respond within 30 seconds. Check your internet connection and try again.');
    }
    throw error;
  } finally {
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
};

/**
 * Map bSDD class/property-set items to our result format.
 * classType "Class" → resultType "class" (Entity badge)
 * classType "GroupOfProperties" → resultType "propertySet" (Property Set badge, drillable)
 */
const mapBsddResults = (classes, matchType, defaultCategory = 'bSDD (IFC 4.3)') => {
  if (!Array.isArray(classes)) return [];
  const results = [];
  for (const item of classes) {
    if (!item) continue;
    const name = item.name || item.Name || '';
    const code = item.referenceCode || item.code || item.Code || name;
    if (!code && !name) continue;
    const isPropertySet = item.classType === 'GroupOfProperties';
    results.push({
      name: code || name,
      code: code || name,
      description: (name && code && name !== code) ? name : (item.definition || item.Definition || item.description || item.Description || ''),
      category: item.dictionaryName || item.DictionaryName || defaultCategory,
      uri: item.uri || item.Uri || '',
      score: matchType === 'exact' ? 1 : 0.8,
      matchType,
      resultType: isPropertySet ? 'propertySet' : 'class'
    });
  }
  return results;
};

// Common English words that carry no IFC meaning — excluded from per-word fallback
const BSDD_STOP_WORDS = new Set(['the','a','an','of','in','for','to','and','or','with','by','at','on','is','are','its','from']);

/**
 * Single bSDD phrase search — returns mapped results or [] on failure.
 */
const bsddPhraseSearch = async (text, matchType, signal) => {
  try {
    const params = new URLSearchParams({ SearchText: text, DictionaryUri: BSDD_IFC_DICTIONARY_URI, Offset: '0', Limit: '25' });
    const data = await bsddFetch(`${BSDD_API_BASE}/api/SearchInDictionary/v1?${params}`, signal);
    const classes = data?.dictionary?.classes || data?.classes || data?.Classes || [];
    if (classes.length > 0) return mapBsddResults(classes, matchType);
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'RateLimitError') throw error;
    console.warn('bSDD SearchInDictionary failed:', error.message);
  }

  // Fallback: Class/Search/v1
  try {
    const params = new URLSearchParams({ SearchText: text, DictionaryUris: BSDD_IFC_DICTIONARY_URI, Offset: '0', Limit: '25' });
    const data = await bsddFetch(`${BSDD_API_BASE}/api/Class/Search/v1?${params}`, signal);
    const classes = data?.classes || data?.Classes || [];
    return mapBsddResults(classes, matchType);
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'RateLimitError') throw error;
    return [];
  }
};

/**
 * Search bSDD for IFC classes (entities) and property sets.
 * If the full phrase returns nothing (e.g. "door height"), automatically retries
 * with each significant word in parallel and merges deduplicated results, so that
 * multi-concept queries still surface useful entities.
 */
/**
 * Given a list of mapped class results and a search word, return the single best
 * matching class (strips the "Ifc" prefix for comparison).
 */
const findBestClassMatch = (classResults, word) => {
  const w = word.toLowerCase();
  return (
    classResults.find(r => (r.code || '').replace(/^Ifc/i, '').toLowerCase() === w) ||
    classResults.find(r => (r.code || '').replace(/^Ifc/i, '').toLowerCase().startsWith(w)) ||
    classResults.find(r => (r.code || '').toLowerCase().includes(w)) ||
    classResults[0] || null
  );
};

const _searchWithCache = async (query, matchType, signal, onStep) => {
  const queryLower = (query || '').toLowerCase().trim();
  const allWords = queryLower.split(/[\s./,_]+/).map(w => w.replace(/[^a-z0-9]/g, '')).filter(w => w.length > 1);
  const queryWords = allWords.filter(w => !BSDD_STOP_WORDS.has(w));
  const effectiveWords = queryWords.length > 0 ? queryWords : allWords;
  const classResults = searchBsddCached(query, matchType) || [];
  if (classResults.length === 0) return { results: [], groups: [], note: null };
  if (effectiveWords.length < 2) return { results: classResults, groups: [], note: null };

  onStep?.('properties');
  const candidates = classResults.slice(0, 3).filter(c => c.uri);
  const fetches = await Promise.allSettled(candidates.map(c => getOrFetchBsddProperties(c.uri, c.code || c.name, signal)));
  for (const s of fetches) {
    if (s.status === 'rejected' && s.reason?.name === 'AbortError') throw s.reason;
  }

  const standaloneResults = [];
  const groups = [];
  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    const clsParts = splitCamelCase(cand.code || '');
    const filterTerms = effectiveWords.filter(w => !clsParts.some(p => wordMatches(w, p)));
    if (filterTerms.length === 0) {
      // All query words are accounted for by the class name itself — return it as a flat result
      standaloneResults.push(cand);
      continue;
    }
    if (fetches[i].status !== 'fulfilled') continue;
    const props = fetches[i].value;
    if (!props?.length) continue;
    const matching = props.filter(p => {
      const hay = `${p.name} ${p.code} ${p.description}`.toLowerCase();
      return matchType === 'semantic'
        ? filterTerms.some(t => hay.includes(t) || matchesByParts(p.name || '', [t]))
        : filterTerms.every(t => hay.includes(t) || matchesByParts(p.name || '', [t]));
    });
    if (matching.length > 0) groups.push({ classCode: cand.code, className: cand.name, classUri: cand.uri, resultType: cand.resultType, properties: matching });
  }
  if (standaloneResults.length > 0 || groups.length > 0) return { results: standaloneResults, groups, note: null };
  return { results: classResults, groups: [], note: null };
};

/**
 * Search bSDD API for IFC entities and property sets.
 *
 * Multi-word / dotted queries (e.g. "door height", "door.height"):
 *   1. Try the full phrase first.
 *   2. If no results, split into words and search each as a potential class.
 *   3. For each word that resolves to a class, fetch that class's properties
 *      and filter them by the remaining words — producing results like
 *      { class: IfcDoor, property: OverallHeight }.
 *   4. If no class→property pairs found, fall back to returning whatever class
 *      results were found for the individual words.
 *
 * Returns { results, note } where note explains what the fallback did.
 */
export const searchBsdd = async (query, matchType = 'exact', signal, onStep) => {
  if (!query || query.trim().length < 2) return { results: [], groups: [], note: null };

  // Use local cache when available — no API calls, no rate limiting
  if (getBsddCacheState().state === 'ready') {
    return _searchWithCache(query, matchType, signal, onStep);
  }

  const searchText = query.trim();
  const words = searchText.split(/[\s./,_]+/)
    .map(w => stemWord(w.replace(/[^a-zA-Z0-9]/g, '')))
    .filter(w => w.length > 1 && !BSDD_STOP_WORDS.has(w.toLowerCase()));

  // Step 1: Collect candidate classes AND property sets.
  let classResults = [];
  let propertySetCandidates = [];
  const seenUris = new Set();

  onStep?.('classes');
  if (words.length >= 2) {
    // Multi-word strategy:
    //   1. Full-phrase search + per-word searches run in parallel
    //   2. Phrase results collected first (classes + Psets at highest priority)
    //   3. Top-3 classes per word collected (not just best-1) for cross-word entity names
    //   4. All class candidates ranked by coverage: how many query words appear in
    //      the entity name's camelCase parts (e.g. "door panel" scores IfcDoorPanelProperties=2)
    const [phraseSettled, ...wordSettled] = await Promise.allSettled([
      bsddPhraseSearch(searchText, matchType, signal),
      ...words.map(w => bsddPhraseSearch(w, matchType, signal))
    ]);
    for (const s of [phraseSettled, ...wordSettled]) {
      if (s.status === 'rejected' && (s.reason?.name === 'AbortError' || s.reason?.name === 'RateLimitError')) throw s.reason;
    }

    // 1. Phrase search — collect classes AND property sets (highest relevance)
    if (phraseSettled.status === 'fulfilled') {
      for (const r of phraseSettled.value) {
        if (!r.uri || seenUris.has(r.uri)) continue;
        seenUris.add(r.uri);
        if (r.resultType === 'propertySet') propertySetCandidates.push(r);
        else classResults.push(r);
      }
    }

    // 2. Per-word searches — top-3 classes per word + property sets
    for (let i = 0; i < words.length; i++) {
      if (wordSettled[i].status !== 'fulfilled') continue;
      const all = wordSettled[i].value;
      for (const r of all) {
        if (!r.uri || seenUris.has(r.uri)) continue;
        if (r.resultType === 'propertySet') {
          seenUris.add(r.uri);
          propertySetCandidates.push(r);
        }
      }
      const classOnly = all.filter(r => r.resultType !== 'propertySet');
      let added = 0;
      for (const c of classOnly) {
        if (added >= 3) break;
        if (!c.uri || seenUris.has(c.uri)) continue;
        seenUris.add(c.uri);
        classResults.push(c);
        added++;
      }
    }

    // 3. Rank by coverage score (classes matching more query words rank first)
    const qw = words.map(w => w.toLowerCase());
    for (const r of classResults) {
      const parts = splitCamelCase(r.code || '');
      r._coverage = qw.filter(w => parts.some(p => wordMatches(w, p))).length;
    }
    classResults.sort((a, b) => (b._coverage || 0) - (a._coverage || 0));
  } else {
    // Single word: separate classes from property sets. Use stemmed form for better API matching.
    const all = await bsddPhraseSearch(words[0] || searchText, matchType, signal);
    for (const r of all) {
      if (!r.uri || seenUris.has(r.uri)) continue;
      seenUris.add(r.uri);
      if (r.resultType === 'propertySet') propertySetCandidates.push(r);
      else classResults.push(r);
    }
  }

  if (classResults.length === 0 && propertySetCandidates.length === 0) {
    return { results: [], groups: [], note: null };
  }

  // Step 2: Build class→property and propertySet→property groups.
  // For single-word exact searches with only class results (no property sets), skip property
  // fetching and return the flat class list so the user can drill in manually.
  const shouldFetchProperties =
    words.length >= 2 || matchType === 'semantic' || propertySetCandidates.length > 0;

  if (!shouldFetchProperties) {
    return { results: classResults, groups: [], note: null };
  }

  onStep?.('properties');

  const queryWords = words.map(w => w.toLowerCase());
  const classCandidates = classResults.slice(0, 3).filter(c => c.uri);
  const propSetLimited = propertySetCandidates.slice(0, 3).filter(c => c.uri);
  const allCandidates = [...classCandidates, ...propSetLimited];

  const propFetches = await Promise.allSettled(
    allCandidates.map(c => fetchBsddClassProperties(c.uri, c.code || c.name, signal))
  );
  for (const s of propFetches) {
    if (s.status === 'rejected' && (s.reason?.name === 'AbortError' || s.reason?.name === 'RateLimitError')) throw s.reason;
  }

  const groups = [];
  for (let i = 0; i < allCandidates.length; i++) {
    if (propFetches[i].status !== 'fulfilled') continue;
    const candidate = allCandidates[i];
    const props = propFetches[i].value;
    if (!props) continue;

    let matching;
    if (candidate.resultType === 'propertySet') {
      // Property sets: filter their properties by ALL query words.
      matching = queryWords.length > 0
        ? props.filter(p => {
            const haystack = `${p.name} ${p.code} ${p.description}`.toLowerCase();
            return matchType === 'semantic'
              ? queryWords.some(t => haystack.includes(t))
              : queryWords.every(t => haystack.includes(t));
          })
        : props;
      if (matching.length === 0) continue;
    } else {
      // Classes: filter by words that aren't consumed by the class name's camelCase parts.
      const clsParts = splitCamelCase(candidate.code || '');
      const filterTerms = queryWords.filter(w => !clsParts.some(part => wordMatches(w, part)));
      if (filterTerms.length === 0) continue; // All words match the class name — skip, user can drill in
      matching = props.filter(p => {
        const haystack = `${p.name} ${p.code} ${p.description}`.toLowerCase();
        return matchType === 'semantic'
          ? filterTerms.some(t => haystack.includes(t))
          : filterTerms.every(t => haystack.includes(t));
      });
    }

    if (matching.length > 0) {
      if (matchType === 'semantic') {
        matching.sort((a, b) => {
          const scoreA = queryWords.reduce((s, w) => s + (`${a.name} ${a.code}`.toLowerCase().includes(w) ? 1 : 0), 0);
          const scoreB = queryWords.reduce((s, w) => s + (`${b.name} ${b.code}`.toLowerCase().includes(w) ? 1 : 0), 0);
          return scoreB - scoreA;
        });
      }
      groups.push({ classCode: candidate.code, className: candidate.name, classUri: candidate.uri, resultType: candidate.resultType, properties: matching });
    }
  }

  if (groups.length > 0) return { results: [], groups, note: null };

  // No property groups found — return flat class list
  return { results: classResults, groups: [], note: null };
};

export const fetchBsddClassProperties = (classUri, className, signal) =>
  getOrFetchBsddProperties(classUri, className, signal);

/**
 * Get all available schemas
 * @returns {Array} List of schema options
 */
export const getAvailableSchemas = () => {
  return Object.keys(SCHEMA_INFO).map(key => ({
    value: key,
    label: SCHEMA_INFO[key].name,
    description: SCHEMA_INFO[key].description,
    searchable: SCHEMA_INFO[key].searchable,
    apiEnabled: SCHEMA_INFO[key].apiEnabled || false
  }));
};

/**
 * Check if schema supports search
 * @param {string} schema - Schema name
 * @returns {boolean}
 */
export const isSchemaSearchable = (schema) => {
  return SCHEMA_INFO[resolveSchemaKey(schema)]?.searchable || false;
};

export default {
  searchSchema,
  searchBsdd,
  getAvailableSchemas,
  isSchemaSearchable
};
