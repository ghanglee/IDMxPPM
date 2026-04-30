/**
 * mvdXML 1.1 Importer
 *
 * Mapping:
 *   mvdXML/@uuid                → idmGuid
 *   ModelView/@uuid             → ucGuid  (per ISO 29481 correspondence)
 *   ExchangeRequirement         → Sub-ER; @applicability prepended to description
 *   ConceptRoot + Concept       → Sub-Sub-ER with applicableRootEntity as ext.elem
 *   Each leaf <TemplateRule>    → separate informationUnit (AND = independent requirement)
 *   Template Rules tree         → RuleID → IFC-path map for external element resolution
 */

const SCHEMA_TO_BASIS = {
  IFC2X3: 'IFC 2x3', IFC4: 'IFC 4', IFC4X1: 'IFC 4x1',
  IFC4X2: 'IFC 4x2', IFC4X3: 'IFC 4x3 ADD2', IFC4X3_ADD2: 'IFC 4x3 ADD2',
};

const MAX_EXPAND_DEPTH = 12;

// IFC primitive/value types — skipped in structural path maps
const IFC_PRIMITIVE_TYPES = new Set([
  'IfcIdentifier', 'IfcLabel', 'IfcText', 'IfcReal', 'IfcBoolean',
  'IfcInteger', 'IfcValue', 'IfcMeasureValue', 'IfcLogical',
  'IfcPositiveLengthMeasure', 'IfcLengthMeasure',
]);

// ─── utilities ────────────────────────────────────────────────────────────────

function genUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function normalizeWS(s) {
  return s ? s.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim() : '';
}

function mapSchemaToBasis(schema) {
  if (!schema) return 'IFC 4x3 ADD2';
  return SCHEMA_TO_BASIS[schema.toUpperCase()] || schema;
}

// ─── namespace-safe DOM helpers (index loops for @xmldom compatibility) ───────

function getChild(parent, localName) {
  if (!parent || !parent.childNodes) return null;
  const nodes = parent.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const c = nodes[i];
    if (c.nodeType === 1 && c.localName === localName) return c;
  }
  return null;
}

function getChildren(parent, localName) {
  if (!parent || !parent.childNodes) return [];
  const out = [];
  const nodes = parent.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const c = nodes[i];
    if (c.nodeType === 1 && c.localName === localName) out.push(c);
  }
  return out;
}

function getDefinitionBody(el) {
  if (!el) return '';
  const defs = getChild(el, 'Definitions');
  if (!defs) return '';
  const def = getChild(defs, 'Definition');
  if (!def) return '';
  const bodies = getChildren(def, 'Body');
  if (!bodies.length) return '';
  const enBody = bodies.find(b => (b.getAttribute('lang') || '').toLowerCase() === 'en');
  return normalizeWS((enBody || bodies[0]).textContent || '');
}

// ─── author parsing ───────────────────────────────────────────────────────────

function parseAuthorString(str) {
  if (!str || !str.trim()) return null;
  const s = str.trim();
  const commaMatch = s.match(/^([^,]+),\s*([^(]+?)(?:\s*\(([^)]+)\))?\s*$/);
  if (commaMatch) {
    return {
      id: genUuid(), type: 'person',
      familyName: commaMatch[1].trim(), givenName: commaMatch[2].trim(),
      uri: '', affiliation: commaMatch[3] ? commaMatch[3].trim() : '',
    };
  }
  const parts = s.split(/\s+/);
  if (parts.length >= 2) {
    return {
      id: genUuid(), type: 'person',
      givenName: parts[0], familyName: parts.slice(1).join(' '),
      uri: '', affiliation: '',
    };
  }
  return { id: genUuid(), type: 'organization', organizationName: s, organizationUri: '' };
}

// ─── template indexing ────────────────────────────────────────────────────────

function indexTemplates(mvdRoot) {
  const map = new Map();
  const templatesEl = getChild(mvdRoot, 'Templates');
  if (!templatesEl) return map;

  const indexOne = (tplEl) => {
    const uuid = tplEl.getAttribute('uuid');
    if (!uuid) return;
    map.set(uuid, { body: getDefinitionBody(tplEl), el: tplEl });
    const subTpls = getChild(tplEl, 'SubTemplates');
    if (subTpls) {
      const nodes = subTpls.childNodes;
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].nodeType === 1 && nodes[i].localName === 'ConceptTemplate') indexOne(nodes[i]);
      }
    }
  };

  const topNodes = templatesEl.childNodes;
  for (let i = 0; i < topNodes.length; i++) {
    if (topNodes[i].nodeType === 1 && topNodes[i].localName === 'ConceptTemplate') indexOne(topNodes[i]);
  }
  return map;
}

// ─── TemplateRule parameter parsing ──────────────────────────────────────────

/**
 * Parse a TemplateRule Parameters string.
 * Returns { key: { value, op, isRegex, qualifier } }.
 * qualifier comes from Key[Qualifier]=... e.g., [Value], [Size], [Exists], [Type].
 */
function parseTemplateRuleParams(params) {
  if (!params) return {};
  const out = {};
  const re = /(\w+)(?:\[(\w+)\])?\s*(?:=reg'((?:[^']|'')*)'|=\s*'((?:[^']|'')*)'|([><=!]+)\s*'((?:[^']|'')*)'|([><=!]+)\s*([\d.]+))/g;
  let m;
  while ((m = re.exec(params)) !== null) {
    const key       = m[1];
    const qualifier = m[2] || '';
    let value, op = '=', isRegex = false;
    if (m[3] !== undefined)      { value = m[3]; isRegex = true; }
    else if (m[4] !== undefined) { value = m[4]; }
    else if (m[6] !== undefined) { value = m[6]; op = m[5].trim(); }
    else if (m[8] !== undefined) { value = m[8]; op = m[7].trim(); }
    else                         { value = ''; }
    out[key] = { value: value.replace(/''/g, "'"), op, isRegex, qualifier };
  }
  return out;
}

/**
 * Human-readable annotation for a param entry.
 * Returns null when no meaningful annotation can be produced.
 */
function paramAnnotation(paramEntry) {
  if (!paramEntry) return null;
  const { value, op, isRegex, qualifier } = paramEntry;
  if (value === undefined || value === null || value === '') return null;
  if (isRegex)                return `Pattern: ${value}`;
  if (qualifier === 'Exists') return value === 'TRUE' ? 'Required' : 'Optional';
  if (qualifier === 'Size')   return `count ${op} ${value}`;
  if (qualifier === 'Type')   return `is ${value}`;
  if (op && op !== '=')       return `${op} ${value}`;
  return String(value);
}

// ─── RuleID → IFC path map ────────────────────────────────────────────────────

/**
 * Walk a Rules (or AttributeRules) element and map each RuleID to its IFC path.
 * Used to resolve TemplateRule param keys to IFC attribute paths for ext. elements.
 */
function buildRuleIdPathMap(rulesEl, contextEntity, templateMap, visited, depth) {
  const pathMap = {};
  if (!rulesEl || depth > MAX_EXPAND_DEPTH) return pathMap;

  const walkAttr = (attrEl, curEntity) => {
    const attrName = attrEl.getAttribute('AttributeName') || '';
    const ruleId   = attrEl.getAttribute('RuleID') || '';
    if (ruleId && attrName) {
      pathMap[ruleId] = { fullPath: `${curEntity}.${attrName}` };
    }

    const entityRulesEl = getChild(attrEl, 'EntityRules');
    if (!entityRulesEl) return;

    const erNodes = entityRulesEl.childNodes;
    for (let j = 0; j < erNodes.length; j++) {
      const entityRule = erNodes[j];
      if (entityRule.nodeType !== 1 || entityRule.localName !== 'EntityRule') continue;

      const entityName   = entityRule.getAttribute('EntityName') || '';
      const entityRuleId = entityRule.getAttribute('RuleID') || '';
      if (!entityName || IFC_PRIMITIVE_TYPES.has(entityName)) continue;

      if (entityRuleId) pathMap[entityRuleId] = { fullPath: entityName };

      const subAttrRulesEl = getChild(entityRule, 'AttributeRules');
      if (subAttrRulesEl) {
        const subNodes = subAttrRulesEl.childNodes;
        for (let k = 0; k < subNodes.length; k++) {
          const sub = subNodes[k];
          if (sub.nodeType === 1 && sub.localName === 'AttributeRule') walkAttr(sub, entityName);
        }
      }

      // Inline referenced sub-template
      const refsEl = getChild(entityRule, 'References');
      if (refsEl) {
        const refNodes = refsEl.childNodes;
        for (let k = 0; k < refNodes.length; k++) {
          const tplRef = refNodes[k];
          if (tplRef.nodeType !== 1 || tplRef.localName !== 'Template') continue;
          const refUuid = tplRef.getAttribute('ref') || '';
          if (!refUuid || visited.has(refUuid)) continue;
          const tplInfo = templateMap.get(refUuid);
          if (!tplInfo || !tplInfo.el) continue;
          const newVisited = new Set(visited);
          newVisited.add(refUuid);
          const subRulesEl = getChild(tplInfo.el, 'Rules');
          if (subRulesEl) {
            const sub = buildRuleIdPathMap(subRulesEl, entityName, templateMap, newVisited, depth + 1);
            Object.assign(pathMap, sub);
          }
        }
      }
    }
  };

  const nodes = rulesEl.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const attrEl = nodes[i];
    if (attrEl.nodeType === 1 && attrEl.localName === 'AttributeRule') walkAttr(attrEl, contextEntity);
  }
  return pathMap;
}

// ─── Leaf TemplateRule collection ─────────────────────────────────────────────

/** Recursively collect the raw Parameters string from every leaf <TemplateRule>. */
function collectLeafTemplateRules(el, results) {
  if (!el || !el.childNodes) return;
  const nodes = el.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const c = nodes[i];
    if (c.nodeType !== 1) continue;
    if (c.localName === 'TemplateRule') {
      const p = c.getAttribute('Parameters') || '';
      if (p.trim()) results.push(p.trim());
    } else {
      collectLeafTemplateRules(c, results);
    }
  }
}

// ─── TemplateRules → hierarchical IU list ────────────────────────────────────

/**
 * Map a TemplateRules element to informationUnits, preserving the nesting structure
 * via subInformationUnits — no artificial group containers.
 *
 * Each nested <TemplateRules> attaches its IUs as subInformationUnits of the last
 * leaf IU in the enclosing group ("attach to preceding leaf"). If there is no
 * preceding leaf in the group, the sub-IUs are promoted to siblings.
 */
function buildIusFromTemplateRules(templateRulesEl, rootEntity, basis, templateMap, tplRef) {
  if (!templateRulesEl) return [];
  const result = [];
  const nodes = templateRulesEl.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const child = nodes[i];
    if (child.nodeType !== 1) continue;
    if (child.localName === 'TemplateRule') {
      const params = (child.getAttribute('Parameters') || '').trim();
      if (params) result.push(...buildIusFromLeafRules([params], rootEntity, basis, templateMap, tplRef));
    } else if (child.localName === 'TemplateRules') {
      const subIus = buildIusFromTemplateRules(child, rootEntity, basis, templateMap, tplRef);
      if (result.length > 0) {
        const last = result[result.length - 1];
        last.subInformationUnits = [...(last.subInformationUnits || []), ...subIus];
      } else {
        result.push(...subIus);
      }
    }
  }
  return result;
}

// ─── IU construction from leaf TemplateRules ─────────────────────────────────

function paramVal(params, ...keys) {
  for (const k of keys) {
    const e = params[k];
    if (e !== undefined && e.value !== undefined) return e.value;
  }
  return null;
}

/**
 * Convert each leaf TemplateRule param string to a separate informationUnit.
 *
 * Pset+property pattern → property IU with Pset.Property external element.
 * RuleID-based pattern  → structural IU with IFC path from template rules tree.
 * [Exists]=TRUE         → isMandatory = true, no annotation text.
 * [Size] operator       → cardinality constraint string.
 */
function buildIusFromLeafRules(leafRuleParams, rootEntity, basis, templateMap, tplRef) {
  if (!leafRuleParams.length) return [];

  let pathMap = {};
  if (tplRef) {
    const tplInfo = templateMap.get(tplRef);
    if (tplInfo && tplInfo.el) {
      const rulesEl = getChild(tplInfo.el, 'Rules');
      if (rulesEl) {
        pathMap = buildRuleIdPathMap(rulesEl, rootEntity, templateMap, new Set([tplRef]), 0);
      }
    }
  }

  const ius = [];

  for (let ri = 0; ri < leafRuleParams.length; ri++) {
    const params = parseTemplateRuleParams(leafRuleParams[ri]);
    if (!Object.keys(params).length) continue;

    const pset         = paramVal(params, 'PsetName', 'PropertySetName', 'psetName');
    const prop         = paramVal(params, 'PropName', 'SimplePropertyName', 'PropertyName', 'propName');
    const nominalEntry = params['NominalValue'] || params['PropValue'];

    if (pset !== null || prop !== null) {
      // Property value requirement: Pset_X.PropertyName
      const iuName  = prop || pset || 'Property';
      const extName = pset && prop ? `${pset}.${prop}` : (pset || prop || '');
      let constraints = '', examples = '';
      if (nominalEntry) {
        const ann = paramAnnotation(nominalEntry);
        if (ann) {
          if (nominalEntry.op !== '=') constraints = ann;
          else examples = ann;
        }
      }
      ius.push({
        id: genUuid(),
        name: iuName,
        _mvdParams: leafRuleParams[ri],
        dataType: nominalEntry ? 'Numeric' : 'String',
        isMandatory: true,
        definition: leafRuleParams[ri],
        examples,
        constraints,
        correspondingExternalElements: extName
          ? [{ id: genUuid(), basis, name: extName, description: 'IFC Property' }]
          : [],
        subInformationUnits: [],
      });
    } else {
      // RuleID-based parameters: one IU per key
      const keys = Object.keys(params);
      for (let ki = 0; ki < keys.length; ki++) {
        const key        = keys[ki];
        const paramEntry = params[key];
        const pathInfo   = pathMap[key] || null;
        const extName    = pathInfo ? pathInfo.fullPath : '';

        // [Exists]=TRUE → mark mandatory, no extra annotation
        if (paramEntry.qualifier === 'Exists') {
          ius.push({
            id: genUuid(),
            name: key,
            _mvdParams: leafRuleParams[ri],
            dataType: 'String',
            isMandatory: paramEntry.value === 'TRUE',
            definition: leafRuleParams[ri],
            examples: '',
            constraints: '',
            correspondingExternalElements: extName
              ? [{ id: genUuid(), basis, name: extName, description: 'IFC Attribute' }]
              : [],
            subInformationUnits: [],
          });
          continue;
        }

        const ann = paramAnnotation(paramEntry);
        let constraints = '', examples = '';
        if (ann) {
          if (paramEntry.op !== '=' || paramEntry.qualifier === 'Size') constraints = ann;
          else examples = ann;
        }
        ius.push({
          id: genUuid(),
          name: key,
          _mvdParams: leafRuleParams[ri],
          dataType: 'String',
          isMandatory: true,
          definition: leafRuleParams[ri],
          examples,
          constraints,
          correspondingExternalElements: extName
            ? [{ id: genUuid(), basis, name: extName, description: 'IFC Attribute' }]
            : [],
          subInformationUnits: [],
        });
      }
    }
  }

  return ius;
}

// ─── Body metadata (round-trip DataType recovery) ────────────────────────────

function parseBodyMetadata(body) {
  if (!body) return { definition: '', dataType: '' };
  const idx = body.indexOf('DataType:');
  if (idx === -1) return { definition: body.trim(), dataType: '' };
  const before = body.slice(0, idx).trim();
  const after  = body.slice(idx);
  const m = after.match(/^DataType:\s*(\S+)/);
  return { definition: before, dataType: m ? m[1] : '' };
}

const DATA_TYPE_ALIASES = {
  string: 'String', text: 'String', real: 'Numeric', double: 'Numeric',
  numeric: 'Numeric', float: 'Numeric', integer: 'Integer', int: 'Integer',
  boolean: 'Boolean', bool: 'Boolean', date: 'Date', datetime: 'Date/Time',
  'date/time': 'Date/Time', timestamp: 'Date/Time', image: 'Image',
  document: 'Document', structured: 'Structured',
};

function normalizeDataType(dt) {
  if (!dt) return 'String';
  return DATA_TYPE_ALIASES[dt.trim().toLowerCase()] || dt.trim() || 'String';
}

// ─── main import ──────────────────────────────────────────────────────────────

/**
 * Parse an mvdXML 1.1 document and convert to IDM project data.
 *
 * @param {string} content - raw XML string
 * @returns {{ headerData, erHierarchy, bpmnXml, totalERs, totalConcepts, totalIUs }}
 */
export function parseMvdXml(content) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');

  const docRoot = doc.documentElement;
  if (docRoot && docRoot.localName === 'parsererror') {
    throw new Error('Invalid XML: ' + (docRoot.textContent || '').slice(0, 200));
  }
  if (docRoot && docRoot.childNodes) {
    const nodes = docRoot.childNodes;
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].nodeType === 1 && nodes[i].localName === 'parsererror') {
        throw new Error('Invalid XML: ' + (nodes[i].textContent || '').slice(0, 200));
      }
    }
  }

  const root = doc.documentElement;
  if (!root || root.localName !== 'mvdXML') {
    throw new Error('Not an mvdXML document: root element is <' + (root ? root.localName : 'null') + '>');
  }

  const mvdName      = root.getAttribute('name')      || 'mvdXML Import';
  const mvdCopyright = root.getAttribute('copyright') || '';
  const mvdVersion   = root.getAttribute('version')   || '';
  const mvdAuthor    = root.getAttribute('author')    || '';

  const templateMap = indexTemplates(root);

  // Capture raw <Templates> section so the exporter can re-emit it verbatim,
  // enabling faithful round-trip of ConceptTemplate structures via IDM sub-ER hierarchy.
  const _tplStart = content.indexOf('<Templates');
  const _tplEnd   = content.indexOf('</Templates>');
  const _mvdTemplatesSection = (_tplStart !== -1 && _tplEnd !== -1)
    ? content.slice(_tplStart, _tplEnd + '</Templates>'.length)
    : null;

  const viewsEl   = getChild(root, 'Views');
  const modelView = viewsEl ? getChild(viewsEl, 'ModelView') : null;
  if (!modelView) throw new Error('mvdXML has no <Views><ModelView>');

  const schema     = modelView.getAttribute('applicableSchema') || 'IFC4';
  const basis      = mapSchemaToBasis(schema);
  const viewName   = modelView.getAttribute('name')   || mvdName;
  const viewBody   = getDefinitionBody(modelView);
  const viewAuthor = modelView.getAttribute('author') || '';
  const viewUuid   = modelView.getAttribute('uuid')   || '';  // → ucGuid

  // ── Parse ExchangeRequirements → store metadata for verbatim export ──
  const ersEl      = getChild(modelView, 'ExchangeRequirements');
  const erEls      = ersEl ? getChildren(ersEl, 'ExchangeRequirement') : [];
  const erMetadata = [];  // [{ uuid, name, applicability, body }]
  const erByUuid   = new Map();

  for (let i = 0; i < erEls.length; i++) {
    const erEl = erEls[i];
    const uuid = erEl.getAttribute('uuid') || genUuid();
    const meta = {
      uuid,
      name:          erEl.getAttribute('name') || 'Exchange Requirement',
      applicability: erEl.getAttribute('applicability') || 'both',
      body:          getDefinitionBody(erEl),
    };
    erMetadata.push(meta);
    erByUuid.set(uuid, meta);
  }
  const firstErUuid = erMetadata.length > 0 ? erMetadata[0].uuid : null;

  // ── Walk ConceptRoots → build one ER per ConceptRoot ──
  const rootsEl      = getChild(modelView, 'Roots');
  const conceptRoots = rootsEl ? getChildren(rootsEl, 'ConceptRoot') : [];

  let totalConcepts = 0;
  let totalIUs = 0;
  const conceptRootERs = [];

  for (let ri = 0; ri < conceptRoots.length; ri++) {
    const rootEl     = conceptRoots[ri];
    const rootEntity = rootEl.getAttribute('applicableRootEntity') ||
                       rootEl.getAttribute('name') || 'IfcRoot';
    const rootName   = rootEl.getAttribute('name') || rootEntity;
    const rootUuid   = rootEl.getAttribute('uuid') || genUuid();
    const rootBody   = getDefinitionBody(rootEl);

    const conceptsWrap  = getChild(rootEl, 'Concepts');
    const concepts      = conceptsWrap ? getChildren(conceptsWrap, 'Concept') : [];
    const conceptSubERs = [];

    for (let ci = 0; ci < concepts.length; ci++) {
      const conceptEl   = concepts[ci];
      totalConcepts++;

      const conceptName = conceptEl.getAttribute('name') || '';
      const conceptBody = getDefinitionBody(conceptEl);

      const tplRefEl = getChild(conceptEl, 'Template');
      const tplRef   = tplRefEl ? (tplRefEl.getAttribute('ref') || '') : '';
      const tplInfo  = tplRef ? templateMap.get(tplRef) : null;

      // Hierarchical IU list: nested TemplateRules → subInformationUnits of preceding leaf
      const tplRulesEl = getChild(conceptEl, 'TemplateRules');
      const ius = buildIusFromTemplateRules(tplRulesEl, rootEntity, basis, templateMap, tplRef);
      totalIUs += ius.length;

      // Raw TemplateRules XML for verbatim re-emission on export
      let _mvdTemplateRulesXml = null;
      if (tplRulesEl) {
        try {
          const raw = new XMLSerializer().serializeToString(tplRulesEl);
          _mvdTemplateRulesXml = raw.replace(/ xmlns(?::\w+)?="[^"]*"/g, '');
        } catch (_) { /* ignore — export falls back to IU reconstruction */ }
      }

      const reqsEl = getChild(conceptEl, 'Requirements');
      const reqs   = reqsEl ? getChildren(reqsEl, 'Requirement') : [];
      const isMandatory = reqs.length === 0 ||
        reqs.some(r => (r.getAttribute('requirement') || '').toLowerCase() === 'mandatory');

      // Which ExchangeRequirement and applicability apply to this Concept?
      let exchangeReqUuid = firstErUuid;
      let applicability   = 'both';
      for (let k = 0; k < reqs.length; k++) {
        const erUuid = reqs[k].getAttribute('exchangeRequirement') || '';
        if (erByUuid.has(erUuid)) exchangeReqUuid = erUuid;
        const app = reqs[k].getAttribute('applicability') || '';
        if (app) applicability = app;
      }

      const effectiveBody = conceptBody || (tplInfo && tplInfo.body) || '';
      const { definition: conceptDef } = parseBodyMetadata(effectiveBody);

      conceptSubERs.push({
        id:   genUuid(),
        guid: conceptEl.getAttribute('uuid') || genUuid(),
        name: conceptName || rootEntity,
        description: conceptDef,
        _mvdTemplateRef:             tplRef || null,
        _mvdTopOperator:             tplRulesEl ? (tplRulesEl.getAttribute('operator') || 'and') : null,
        _mvdTemplateRulesXml:        _mvdTemplateRulesXml || null,
        _mvdExchangeRequirementUuid: exchangeReqUuid,
        _mvdApplicability:           applicability,
        isMandatory,
        informationUnits: ius,
        subERs:           [],
        correspondingExternalElements: [],
      });
    }

    // ConceptRoot ER: entity ext.elm identifies it as a ConceptRoot for the exporter
    conceptRootERs.push({
      id:   genUuid(),
      guid: rootUuid,
      name: `er_${rootName}`,
      description: rootBody,
      informationUnits: [],
      subERs: conceptSubERs,
      correspondingExternalElements: rootEntity
        ? [{ id: genUuid(), basis, name: rootEntity, description: 'IFC Entity' }]
        : [],
    });
  }

  // Single ConceptRoot → it is the root ER directly.
  // Multiple ConceptRoots → wrap under a ModelView ER.
  const rootER = conceptRootERs.length === 1
    ? conceptRootERs[0]
    : {
        id:   genUuid(),
        name: `er_${viewName || mvdName}`,
        description: viewBody || '',
        informationUnits: [],
        subERs: conceptRootERs,
        correspondingExternalElements: [],
      };

  // ── Authors (deduplicated) ──
  const authors = [];
  const seenAuthors = new Set();
  const addAuthor = (str) => {
    if (!str || seenAuthors.has(str)) return;
    seenAuthors.add(str);
    const a = parseAuthorString(str);
    if (a) authors.push(a);
  };
  addAuthor(mvdAuthor);
  addAuthor(viewAuthor);
  if (mvdCopyright && !seenAuthors.has(mvdCopyright)) {
    seenAuthors.add(mvdCopyright);
    authors.push({ id: genUuid(), type: 'organization', organizationName: mvdCopyright, organizationUri: '' });
  }

  const headerData = {
    title:       viewName || mvdName,
    fullTitle:   viewName || mvdName,
    shortTitle:  mvdName,
    status:      'WD',
    version:     mvdVersion || '',
    idmGuid:     root.getAttribute('uuid') || genUuid(),
    ucGuid:      viewUuid || genUuid(),
    bcmGuid:     genUuid(),
    copyright:   mvdCopyright,
    language:    'EN',
    aimAndScope: viewBody || mvdName,
    aimScope:    viewBody || mvdName,
    use:         '',
    summary:     viewBody || mvdName,
    authors,
    actorsList:  [],
    _mvdTemplatesSection:     _mvdTemplatesSection || null,
    _mvdExchangeRequirements: erMetadata,
  };

  return {
    headerData,
    erHierarchy:   [rootER],
    bpmnXml:       null,
    totalERs:      erMetadata.length,
    totalConcepts,
    totalIUs,
  };
}

/** Detect whether XML content is an mvdXML file. */
export function isMvdXml(content) {
  if (!content) return false;
  return /<mvdXML[\s>]/.test(content) || /buildingsmart-tech\.org\/mvd(?:XML)?\//.test(content);
}
