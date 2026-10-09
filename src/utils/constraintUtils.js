/**
 * Business rule / constraint helpers (idmXSD v2.0 Rev 11).
 *
 * Data model
 *   headerData.businessRules = [{ id, name, statement, images: [], commentary: [{ id, text }], reference }]
 *     (Rev 12: exactly one statement, no translations; commentary = description elements;
 *      reference holds one reference per line)
 *   er.constraints = [{
 *     id,
 *     businessRuleIds: [],        // -> <associatedBusinessRule ref>
 *     informationUnitIds: [],     // -> <associatedInformationUnit ref>
 *     description,                // informal statement
 *     expressions: [{ id, language: { name, version, publicationYear, uri },
 *                     form: 'text' | 'xml' | 'external', body, uri }]
 *   }]
 *
 * Constraints reference IUs by id, so renaming an IU never breaks a link. Free text
 * (description / expression body) refers to an IU with the token {{IU:<id>}}, which is
 * displayed with the current IU name and resolved to the name on export.
 */

const uid = () => crypto.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const newId = uid;

// ─── IU / constraint traversal ───────────────────────────────────────────────

const walkIUs = (ius, visit, erInfo, parentIuId = null, depth = 0) => {
  (ius || []).forEach(iu => {
    visit(iu, erInfo, parentIuId, depth);
    walkIUs(iu.subInformationUnits, visit, erInfo, iu.id, depth + 1);
  });
};

const walkERs = (ers, visit, parentEr = null, path = []) => {
  (ers || []).forEach(er => {
    const label = er.name || er.shortTitle || 'ER';
    const erPath = [...path, label];
    visit(er, parentEr, erPath);
    walkERs(er.subERs, visit, er, erPath);
  });
};

/** Flat list of every ER in the hierarchy with its nesting depth. */
export const flattenERs = (erHierarchy) => {
  const result = [];
  walkERs(erHierarchy, (er, _parent, erPath) => {
    result.push({ id: er.id, name: er.name || er.shortTitle || 'ER', depth: erPath.length - 1 });
  });
  return result;
};

/** Flat list of every IU in the hierarchy (including sub-IUs and sub-ERs). */
export const flattenIUs = (erHierarchy) => {
  const result = [];
  walkERs(erHierarchy, (er, _parent, erPath) => {
    const erInfo = { erId: er.id, erName: er.name || er.shortTitle || 'ER', erPath };
    walkIUs(er.informationUnits, (iu, info, parentIuId, depth) => {
      result.push({ id: iu.id, name: iu.name || '', dataType: iu.dataType, parentIuId, depth, ...info });
    }, erInfo);
  });
  return result;
};

export const iuNameMap = (erHierarchy) => {
  const map = {};
  flattenIUs(erHierarchy).forEach(iu => { map[iu.id] = iu.name; });
  return map;
};

/** Flat list of every constraint with the ER that owns it. */
export const collectConstraints = (erHierarchy) => {
  const result = [];
  walkERs(erHierarchy, (er, _parent, erPath) => {
    (er.constraints || []).forEach(constraint => {
      result.push({ constraint, erId: er.id, erName: er.name || er.shortTitle || 'ER', erPath });
    });
  });
  return result;
};

/** All IU ids in an IU subtree (the IU itself and all nested sub-IUs). */
export const collectIuSubtreeIds = (iu) => {
  const ids = [];
  walkIUs([iu], (u) => ids.push(u.id), null);
  return ids;
};

/** Ids of an IU and all its nested sub-IUs, looked up by id in the hierarchy. */
export const iuSubtreeIdsById = (erHierarchy, iuId) => {
  const all = flattenIUs(erHierarchy);
  const result = new Set([iuId]);
  let grew = true;
  while (grew) {
    grew = false;
    all.forEach(iu => {
      if (iu.parentIuId && result.has(iu.parentIuId) && !result.has(iu.id)) { result.add(iu.id); grew = true; }
    });
  }
  return [...result];
};

/** Constraints (with owner ER) that reference any of the given IU ids. */
export const constraintsReferencingIUs = (erHierarchy, iuIds) => {
  const set = new Set(iuIds);
  return collectConstraints(erHierarchy).filter(({ constraint }) =>
    (constraint.informationUnitIds || []).some(id => set.has(id))
  );
};

const idNumber = (id, prefix) => {
  const m = new RegExp(`^${prefix}-(\\d+)$`).exec(id || '');
  return m ? parseInt(m[1], 10) : 0;
};

export const nextConstraintId = (erHierarchy) => {
  const max = collectConstraints(erHierarchy).reduce((n, { constraint }) => Math.max(n, idNumber(constraint.id, 'C')), 0);
  return `C-${max + 1}`;
};

/** Short display number for a rule id: BR-1 / BR-07 -> BR1 / BR7; other ids are shown as they are. */
export const ruleLabel = (id) => {
  const m = /^BR[-_ ]?0*(\d+)$/i.exec(String(id || ''));
  return m ? `BR${m[1]}` : String(id || '');
};

export const nextBusinessRuleId = (businessRules) => {
  const max = (businessRules || []).reduce((n, br) => Math.max(n, idNumber(br.id, 'BR')), 0);
  return `BR-${max + 1}`;
};

// ─── IU reference tokens ─────────────────────────────────────────────────────

export const iuToken = (id) => `{{IU:${id}}}`;

const TOKEN_RE = /\{\{IU:([^}]+)\}\}/g;

export const findIuTokens = (text) => {
  const ids = [];
  String(text || '').replace(TOKEN_RE, (_m, id) => { ids.push(id); return ''; });
  return ids;
};

/** Replace tokens with IU names (falls back to the id when the IU no longer exists). */
export const resolveIuTokens = (text, nameById = {}) =>
  String(text || '').replace(TOKEN_RE, (_m, id) => (nameById[id] != null && nameById[id] !== '' ? nameById[id] : id));

// ─── Editor display form ─────────────────────────────────────────────────────
// Stored text uses {{IU:<id>}}; the editor shows [[IU: <name>]] so authors never see ids.

const DISPLAY_RE = /\[\[IU: ([^\]]+)\]\]/g;

export const iuDisplayToken = (name, id) => (name ? `[[IU: ${name}]]` : `[[IU: #${id}]]`);

export const tokensToDisplay = (text, nameById = {}) =>
  String(text || '').replace(TOKEN_RE, (_m, id) => iuDisplayToken(nameById[id], id));

/** candidates: [{id, name}] in priority order (linked IUs first); unknown labels stay as typed. */
export const displayToTokens = (text, candidates = []) =>
  String(text || '').replace(DISPLAY_RE, (match, label) => {
    if (label.startsWith('#')) return iuToken(label.slice(1));
    const hit = candidates.find(c => c.name === label);
    return hit ? iuToken(hit.id) : match;
  });

// ─── Re-linking IU names in imported text ────────────────────────────────────
// idmXML stores resolved names. On import, names of the constraint's own associated IUs are
// turned back into tokens so they follow later renames. Resolving gives identical text.

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const retokenizeText = (text, ius) => {
  const source = String(text || '');
  if (!source || !ius.length) return source;
  const counts = {};
  ius.forEach(iu => { if (iu.name) counts[iu.name] = (counts[iu.name] || 0) + 1; });
  const unique = ius.filter(iu => iu.name && iu.name.trim().length >= 2 && counts[iu.name] === 1);
  if (!unique.length) return source;
  const byName = {};
  unique.forEach(iu => { byName[iu.name] = iu.id; });
  const names = Object.keys(byName).sort((a, b) => b.length - a.length).map(escapeRegExp);
  const re = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${names.join('|')})(?![\\p{L}\\p{N}_])`, 'gu');
  // Leave existing tokens untouched
  return source.split(/(\{\{IU:[^}]+\}\})/).map(part =>
    part.startsWith('{{IU:') ? part : part.replace(re, (name) => iuToken(byName[name]))
  ).join('');
};

export const retokenizeHierarchy = (erHierarchy) => {
  const iuById = {};
  flattenIUs(erHierarchy).forEach(iu => { iuById[iu.id] = iu; });
  return mapERs(erHierarchy, (er) => {
    if (!er.constraints || er.constraints.length === 0) return er;
    return {
      ...er,
      constraints: er.constraints.map(c => {
        const linked = (c.informationUnitIds || []).map(id => iuById[id]).filter(Boolean);
        return {
          ...c,
          description: retokenizeText(c.description, linked),
          expressions: (c.expressions || []).map(x => (x.form === 'text' ? { ...x, body: retokenizeText(x.body, linked) } : x))
        };
      })
    };
  });
};

// ─── Business rules (Rev 12: one statement, images, commentary, references) ──

export const newBusinessRule = (id, name = '') => ({
  id,
  name,
  statement: '',
  images: [],
  commentary: [],
  reference: ''
});

const isCurrentRuleShape = (br) =>
  typeof br?.statement === 'string' && Array.isArray(br.images) && Array.isArray(br.commentary)
  && br.description === undefined && br.statements === undefined;

/**
 * Bring a stored business rule to the Rev 12 shape. Older shapes:
 *  - Rev 11: a single `description` becomes the statement.
 *  - interim Rev 12 draft: `statements[]` per language - the English one (else the first) is kept;
 *    the others are preserved as commentary prefixed with their language, so no text is lost.
 */
export const normalizeBusinessRule = (br) => {
  if (isCurrentRuleShape(br)) return br;
  const { description, statements, statement, commentary, ...rest } = br || {};
  let text = typeof statement === 'string' ? statement : '';
  const extra = [];
  if (Array.isArray(statements) && statements.length > 0) {
    const filled = statements.filter(st => (st.text || '').trim());
    const keep = filled.find(st => /^en(-|$)/i.test(st.lang || '')) || filled[0];
    if (!text && keep) text = keep.text;
    filled.filter(st => st !== keep).forEach(st => extra.push({ id: uid(), text: `${st.lang ? `[${st.lang}] ` : ''}${st.text}` }));
  }
  if (!text && typeof description === 'string' && description.trim()) text = description;
  return {
    ...rest,
    statement: text,
    images: Array.isArray(br?.images) ? br.images : [],
    commentary: [...(Array.isArray(commentary) ? commentary : []), ...extra],
    reference: br?.reference || ''
  };
};

/** Convert stored business rules of any earlier shape to Rev 12. */
export const migrateBusinessRules = (rules = []) => {
  let changed = false;
  const migrated = rules.map(br => {
    if (isCurrentRuleShape(br)) return br;
    changed = true;
    return normalizeBusinessRule(br);
  });
  return { rules: migrated, changed };
};

// ─── Formal rule languages ───────────────────────────────────────────────────

export const FORMAL_LANGUAGES = [
  { name: 'RuleML', version: '1.03', publicationYear: '', uri: 'http://ruleml.org/spec', form: 'xml' },
  { name: 'LegalRuleML', version: '1.0', publicationYear: '2021', uri: 'http://docs.oasis-open.org/legalruleml/ns/v1.0/', form: 'xml' },
  { name: 'SPARQL', version: '1.1', publicationYear: '2013', uri: '', form: 'text' },
  { name: 'SHACL', version: '', publicationYear: '2017', uri: 'http://www.w3.org/ns/shacl#', form: 'text' },
  { name: 'Python', version: '', publicationYear: '', uri: '', form: 'text' },
  { name: 'Other', version: '', publicationYear: '', uri: '', form: 'text' }
];

export const EXPRESSION_FORMS = [
  { value: 'text', label: 'Text' },
  { value: 'xml', label: 'Embedded XML' },
  { value: 'external', label: 'External file' }
];

export const newExpression = (preset = FORMAL_LANGUAGES[2]) => ({
  id: uid(),
  language: {
    name: preset.name === 'Other' ? '' : preset.name,
    version: preset.version || '',
    publicationYear: preset.publicationYear || '',
    uri: preset.uri || ''
  },
  form: preset.form || 'text',
  body: '',
  uri: '',
  xmlId: ''
});

/**
 * Work out what a pasted rule is, so the editor needs no type / URL fields:
 *  - well-formed XML whose root element has a namespace  -> embedded XML; the language comes from the
 *    namespace (RuleML, LegalRuleML, otherwise "XML" with the namespace as its URI)
 *  - anything else -> text (stored as CDATA); SPARQL and SHACL are recognised from their keywords
 * Returns { form: 'xml' | 'text', language: {name, version, publicationYear, uri} | null, looksLikeBrokenXml }.
 */
export const analyzeExpressionText = (text) => {
  const t = String(text || '').trim();
  const result = { form: 'text', language: null, looksLikeBrokenXml: false };
  if (!t) return result;

  const preset = (name) => {
    const p = FORMAL_LANGUAGES.find(l => l.name === name);
    return p ? { name: p.name, version: p.version, publicationYear: p.publicationYear, uri: p.uri } : { name, version: '', publicationYear: '', uri: '' };
  };

  if (t.startsWith('<') && typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(`<w>${t.replace(/^<\?xml[^>]*\?>\s*/, '')}</w>`, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
      result.looksLikeBrokenXml = true;
    } else {
      let root = null;
      for (let i = 0; i < doc.documentElement.childNodes.length; i++) {
        if (doc.documentElement.childNodes[i].nodeType === 1) { root = doc.documentElement.childNodes[i]; break; }
      }
      const ns = root && root.namespaceURI;
      if (ns && ns !== 'null' && !ns.includes('standards.iso.org/iso/29481')) {
        result.form = 'xml';
        if (/legalruleml/i.test(ns)) result.language = { ...preset('LegalRuleML'), uri: ns };
        else if (/ruleml\.org/i.test(ns)) result.language = preset('RuleML');
        else result.language = { name: 'XML', version: '', publicationYear: '', uri: ns };
        return result;
      }
    }
  }

  if (/^\s*(PREFIX|BASE|SELECT|ASK|CONSTRUCT|DESCRIBE)\b/im.test(t)) result.language = preset('SPARQL');
  else if (/@prefix\b|\bsh:(NodeShape|PropertyShape|property)\b/.test(t)) result.language = preset('SHACL');
  return result;
};

/**
 * Check embedded-XML expression bodies. The schema requires namespaced markup and forbids
 * elements of the IDM namespace. Returns an error string or ''.
 */
export const checkEmbeddedXml = (body) => {
  const text = String(body || '').trim();
  if (!text) return '';
  if (typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(`<wrapper>${text}</wrapper>`, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return 'Not well-formed XML';
  const root = doc.documentElement;
  for (let i = 0; i < root.childNodes.length; i++) {
    const node = root.childNodes[i];
    if (node.nodeType !== 1) continue;
    if (!node.namespaceURI || node.namespaceURI === 'null') return `<${node.localName}> has no namespace (put non-namespaced content in text form)`;
    if (node.namespaceURI.includes('standards.iso.org/iso/29481')) return 'IDM-namespace elements are not allowed in an expression';
  }
  return '';
};

// ─── Referential integrity ───────────────────────────────────────────────────

const mapERs = (ers, fn) => (ers || []).map(er => {
  const mapped = fn(er);
  return mapped.subERs && mapped.subERs.length > 0
    ? { ...mapped, subERs: mapERs(mapped.subERs, fn) }
    : mapped;
});

/** Remove references to the given (deleted) IU ids from every constraint. */
export const pruneDanglingIuRefs = (erHierarchy, removedIds) => {
  let changed = false;
  const result = mapERs(erHierarchy, (er) => {
    if (!er.constraints || er.constraints.length === 0) return er;
    let erChanged = false;
    const constraints = er.constraints.map(c => {
      const ids = c.informationUnitIds || [];
      const kept = ids.filter(id => !removedIds.has(id));
      if (kept.length === ids.length) return c;
      erChanged = true;
      return { ...c, informationUnitIds: kept };
    });
    if (!erChanged) return er;
    changed = true;
    return { ...er, constraints };
  });
  return { erHierarchy: result, changed };
};

/** Remove references to deleted business rules from every constraint. */
export const pruneBusinessRuleRefs = (erHierarchy, removedBrIds) => {
  let changed = false;
  const result = mapERs(erHierarchy, (er) => {
    if (!er.constraints || er.constraints.length === 0) return er;
    let erChanged = false;
    const constraints = er.constraints.map(c => {
      const ids = c.businessRuleIds || [];
      const kept = ids.filter(id => !removedBrIds.has(id));
      if (kept.length === ids.length) return c;
      erChanged = true;
      return { ...c, businessRuleIds: kept };
    });
    if (!erChanged) return er;
    changed = true;
    return { ...er, constraints };
  });
  return { erHierarchy: result, changed };
};

// ─── Legacy migration (per-IU constraints -> ER-level constraints) ───────────

const legacyEntries = (raw) => {
  if (Array.isArray(raw)) {
    return raw
      .map(c => (typeof c === 'string'
        ? { description: c.trim(), businessRule: '' }
        : { description: String(c?.description || '').trim(), businessRule: String(c?.businessRule || '').trim() }))
      .filter(e => e.description || e.businessRule);
  }
  if (typeof raw === 'string' && raw.trim()) return [{ description: raw.trim(), businessRule: '' }];
  return [];
};

const hasLegacyConstraints = (erHierarchy) => {
  let found = false;
  walkERs(erHierarchy, (er) => {
    walkIUs(er.informationUnits, (iu) => { if (iu.constraints !== undefined) found = true; }, null);
  });
  return found;
};

/**
 * Convert IU.constraints (description + free-text business rule) into ER-level constraints
 * linked to the IU, creating a businessRule entry for each distinct free-text rule.
 */
export const migrateLegacyConstraints = (erHierarchy, businessRules = []) => {
  if (!hasLegacyConstraints(erHierarchy)) return { erHierarchy, businessRules, changed: false };

  const rules = [...businessRules];
  const ruleIdByName = {};
  rules.forEach(r => { ruleIdByName[(r.name || '').trim()] = r.id; });

  let nextC = collectConstraints(erHierarchy).reduce((n, { constraint }) => Math.max(n, idNumber(constraint.id, 'C')), 0);
  let nextBr = rules.reduce((n, br) => Math.max(n, idNumber(br.id, 'BR')), 0);

  const stripIUs = (ius, added) => (ius || []).map(iu => {
    const entries = legacyEntries(iu.constraints);
    entries.forEach(entry => {
      let brIds = [];
      if (entry.businessRule) {
        let brId = ruleIdByName[entry.businessRule];
        if (!brId) {
          brId = `BR-${++nextBr}`;
          rules.push({ id: brId, name: entry.businessRule, description: entry.businessRule, reference: '' });
          ruleIdByName[entry.businessRule] = brId;
        }
        brIds = [brId];
      }
      added.push({
        id: `C-${++nextC}`,
        businessRuleIds: brIds,
        informationUnitIds: [iu.id],
        description: entry.description,
        expressions: []
      });
    });
    const { constraints: _legacy, ...rest } = iu;
    return { ...rest, subInformationUnits: stripIUs(iu.subInformationUnits, added) };
  });

  const result = mapERs(erHierarchy, (er) => {
    const added = [];
    const informationUnits = stripIUs(er.informationUnits, added);
    return { ...er, informationUnits, constraints: [...(er.constraints || []), ...added] };
  });

  return { erHierarchy: result, businessRules: rules, changed: true };
};

/**
 * For exporters that still work with per-IU constraint text (IDS): attach a derived
 * IU.constraints array built from the ER-level constraints that reference each IU.
 */
export const deriveIuConstraints = (erHierarchy, businessRules = []) => {
  const brName = {};
  businessRules.forEach(br => { brName[br.id] = br.name; });
  const nameById = iuNameMap(erHierarchy);
  const byIu = {};
  collectConstraints(erHierarchy).forEach(({ constraint }) => {
    (constraint.informationUnitIds || []).forEach(iuId => {
      (byIu[iuId] = byIu[iuId] || []).push({
        id: constraint.id,
        description: resolveIuTokens(constraint.description || '', nameById),
        businessRule: (constraint.businessRuleIds || []).map(id => brName[id]).filter(Boolean).join('; ')
      });
    });
  });
  const mapIUs = (ius) => (ius || []).map(iu => ({
    ...iu,
    constraints: byIu[iu.id] || iu.constraints,
    subInformationUnits: mapIUs(iu.subInformationUnits)
  }));
  return mapERs(erHierarchy, er => ({ ...er, informationUnits: mapIUs(er.informationUnits) }));
};

// ─── Validation ──────────────────────────────────────────────────────────────

export const validateConstraintModel = (erHierarchy, businessRules = []) => {
  const issues = [];
  const iuIds = new Set(flattenIUs(erHierarchy).map(i => i.id));
  const brIds = new Set(businessRules.map(b => b.id));
  const brNames = {};
  businessRules.forEach(br => {
    const n = (br.name || '').trim();
    if (!n) issues.push({ severity: 'error', message: `Business rule ${br.id} has no name` });
    else if (brNames[n]) issues.push({ severity: 'error', message: `Business rule name "${n}" is used more than once` });
    brNames[n] = true;

    // Rev 12: exactly one statement (mandatory, non-empty)
    if (!(normalizeBusinessRule(br).statement || '').trim()) {
      issues.push({ severity: 'error', message: `Business rule "${n || br.id}" needs a statement` });
    }
  });

  const perEr = {};
  collectConstraints(erHierarchy).forEach(({ constraint, erId, erName }) => {
    const key = `${erId}:${constraint.id}`;
    if (perEr[key]) issues.push({ severity: 'error', message: `Constraint id ${constraint.id} is used twice in ER "${erName}"` });
    perEr[key] = true;
    (constraint.informationUnitIds || []).forEach(id => {
      if (!iuIds.has(id)) issues.push({ severity: 'error', message: `Constraint ${constraint.id} references missing information unit ${id}` });
    });
    (constraint.businessRuleIds || []).forEach(id => {
      if (!brIds.has(id)) issues.push({ severity: 'error', message: `Constraint ${constraint.id} references missing business rule ${id}` });
    });
    const tokenIds = [...findIuTokens(constraint.description), ...(constraint.expressions || []).flatMap(e => findIuTokens(e.body))];
    tokenIds.forEach(id => {
      if (!iuIds.has(id)) issues.push({ severity: 'warning', message: `Constraint ${constraint.id} text refers to missing information unit ${id}` });
    });
    if (!(constraint.informationUnitIds || []).length) {
      issues.push({ severity: 'warning', message: `Constraint ${constraint.id} has no associated information unit` });
    }
    if (!(constraint.description || '').trim() && !(constraint.expressions || []).length) {
      issues.push({ severity: 'warning', message: `Constraint ${constraint.id} has neither a description nor an expression` });
    }
    (constraint.expressions || []).forEach((expr, i) => {
      if (!(expr.language?.name || '').trim()) issues.push({ severity: 'error', message: `Constraint ${constraint.id}, expression ${i + 1}: rule language name is required` });
      if (expr.form === 'xml') {
        const err = checkEmbeddedXml(expr.body);
        if (err) issues.push({ severity: 'error', message: `Constraint ${constraint.id}, expression ${i + 1}: ${err}` });
      }
    });
  });
  return issues;
};

/** True when the project holds content that idmXSD v1.0 cannot represent (synonyms, constraints, business rules). */
export const hasContentBeyondV1 = (erHierarchy, businessRules = []) => {
  if (businessRules.length > 0) return true;
  if (collectConstraints(erHierarchy).length > 0) return true;
  let found = false;
  walkERs(erHierarchy, (er) => {
    walkIUs(er.informationUnits, (iu) => {
      if ((iu.synonyms || []).some(syn => (syn.text || '').trim())) found = true;
    }, null);
  });
  return found;
};
