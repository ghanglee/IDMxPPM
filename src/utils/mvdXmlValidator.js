/**
 * mvdXML 1.2 Validator
 * Validates mvdXML files structurally against the buildingSMART mvdXML 1.2 XSD schema rules.
 *
 * Returns { valid: bool, version: string, errors: string[], warnings: string[] }
 * - errors:   schema violations (file will be rejected by compliant tools)
 * - warnings: semantic issues (file is valid XML but may behave unexpectedly)
 *
 * Reference schema: http://buildingsmart-tech.org/mvd/XML/1.2
 * Reference XSD: https://github.com/buildingSMART/mvdXML/tree/master/mvdXML1.2
 */

const MVD_NS_1_2      = 'https://standards.buildingsmart.org/MVD/RELEASE/mvdXML/v1-2/'; // Draft9+
const MVD_NS_1_2_OLD  = 'http://buildingsmart-tech.org/mvd/XML/1.2';                   // Draft1–8
const MVD_NS_1_1      = 'http://buildingsmart-tech.org/mvdXML/mvdXML1-1';

// Lowercase hex UUID per mvdXML 1.2 XSD pattern
const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

const VALID_STATUSES = new Set(['sample', 'proposal', 'draft', 'candidate', 'final', 'deprecated']);
const VALID_APPLICABILITY = new Set(['export', 'import', 'both']);
const VALID_REQUIREMENT = new Set(['mandatory', 'recommended', 'not-relevant', 'not-recommended', 'excluded']);
// Draft9 removed "not" from operator; use negation="true" on TemplateRule instead
const VALID_OPERATORS = new Set(['and', 'or', 'nand', 'nor', 'xor', 'nxor']);

// --- XML helpers (namespace-safe, index loops for Chromium/xmldom) ---

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

function getAllDescendants(parent, localName, results) {
  if (!parent || !parent.childNodes) return;
  const nodes = parent.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const c = nodes[i];
    if (c.nodeType !== 1) continue;
    if (c.localName === localName) results.push(c);
    getAllDescendants(c, localName, results);
  }
}

// --- Validation helpers ---

function validateUuid(uuid, path, errors) {
  if (!uuid) {
    errors.push(`${path}: missing required "uuid" attribute`);
    return false;
  }
  if (!UUID_PATTERN.test(uuid)) {
    errors.push(`${path}: "uuid" value "${uuid}" is not a valid mvdXML 1.2 UUID (must be lowercase hex, e.g. a1b2c3d4-e5f6-4000-8000-000000000000)`);
    return false;
  }
  return true;
}

function validateIdentityAttrs(el, path, errors, warnings) {
  const uuid = el.getAttribute('uuid') || '';
  validateUuid(uuid, path, errors);

  const name = el.getAttribute('name') || '';
  if (!name) {
    errors.push(`${path}: missing required "name" attribute`);
  }

  const status = el.getAttribute('status') || '';
  if (status && !VALID_STATUSES.has(status)) {
    errors.push(`${path}: invalid "status" value "${status}". Must be one of: ${[...VALID_STATUSES].join(', ')}`);
  }

  return uuid;
}

// --- ConceptTemplate ---

function validateConceptTemplate(tplEl, path, errors, warnings) {
  validateIdentityAttrs(tplEl, path, errors, warnings);

  const applicableSchema = tplEl.getAttribute('applicableSchema') || '';
  if (!applicableSchema) {
    errors.push(`${path}: missing required "applicableSchema" attribute`);
  }

  // Recurse into SubTemplates
  const subTplsEl = getChild(tplEl, 'SubTemplates');
  if (subTplsEl) {
    const subs = getChildren(subTplsEl, 'ConceptTemplate');
    for (let i = 0; i < subs.length; i++) {
      validateConceptTemplate(subs[i], `${path}/SubTemplates/ConceptTemplate[${i + 1}]`, errors, warnings);
    }
  }
}

// --- TemplateRules ---

function validateTemplateRules(tplRulesEl, path, errors, warnings) {
  const op = tplRulesEl.getAttribute('operator') || '';
  if (op && !VALID_OPERATORS.has(op)) {
    errors.push(`${path}: invalid "operator" value "${op}". Must be one of: ${[...VALID_OPERATORS].join(', ')} (note: "not" was removed in Draft9; use negation="true" on TemplateRule instead)`);
  }

  // Draft9: <xs:choice minOccurs="2"> — TemplateRules must have ≥2 child rules
  let childRuleCount = 0;
  const nodes = tplRulesEl.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const child = nodes[i];
    if (child.nodeType !== 1) continue;
    if (child.localName === 'TemplateRules') {
      childRuleCount++;
      validateTemplateRules(child, `${path}/TemplateRules`, errors, warnings);
    } else if (child.localName === 'TemplateRule') {
      childRuleCount++;
      const params = child.getAttribute('Parameters');
      if (params === null || params === undefined) {
        errors.push(`${path}/TemplateRule: missing required "Parameters" attribute`);
      }
    }
  }
  if (childRuleCount < 2) {
    errors.push(`${path}: <TemplateRules> requires at least 2 child rules (minOccurs="2" per Draft9). Found ${childRuleCount}. Use a bare <TemplateRule> directly under <Concept> for a single rule.`);
  }
}

// --- Concept ---

function validateConcept(conceptEl, path, exchangeUuids, templateUuids, errors, warnings) {
  validateIdentityAttrs(conceptEl, path, errors, warnings);

  const tplEl = getChild(conceptEl, 'Template');
  if (!tplEl) {
    errors.push(`${path}: missing required <Template> child element`);
  } else {
    const ref = tplEl.getAttribute('ref') || '';
    const href = tplEl.getAttribute('href') || '';
    if (!ref && !href) {
      errors.push(`${path}/<Template>: must have "ref" (in-document) or "href" (external) attribute`);
    } else if (ref && !templateUuids.has(ref)) {
      errors.push(`${path}/<Template ref="${ref}">: references unknown ConceptTemplate UUID`);
    }
  }

  // Validate Requirements
  const reqsEl = getChild(conceptEl, 'Requirements');
  if (reqsEl) {
    const reqs = getChildren(reqsEl, 'Requirement');
    for (let i = 0; i < reqs.length; i++) {
      const req = reqs[i];
      const reqPath = `${path}/<Requirements>/Requirement[${i + 1}]`;

      const erUuid = req.getAttribute('exchangeRequirement') || '';
      if (!erUuid) {
        errors.push(`${reqPath}: missing required "exchangeRequirement" attribute`);
      } else if (exchangeUuids.size > 0 && !exchangeUuids.has(erUuid)) {
        errors.push(`${reqPath}: exchangeRequirement "${erUuid}" references unknown ExchangeRequirement UUID`);
      }

      const reqType = req.getAttribute('requirement') || '';
      if (!reqType) {
        errors.push(`${reqPath}: missing required "requirement" attribute`);
      } else if (!VALID_REQUIREMENT.has(reqType)) {
        errors.push(`${reqPath}: invalid "requirement" value "${reqType}". Must be one of: ${[...VALID_REQUIREMENT].join(', ')}`);
      }

      const app = req.getAttribute('applicability') || '';
      if (app && !VALID_APPLICABILITY.has(app)) {
        errors.push(`${reqPath}: invalid "applicability" value "${app}". Must be one of: ${[...VALID_APPLICABILITY].join(', ')}`);
      }
    }
  } else {
    warnings.push(`${path}: has no <Requirements> — concept makes no exchange requirement claims`);
  }

  // Validate rule element: Draft9 allows either <TemplateRules> (≥2 children) OR a bare <TemplateRule>
  const tplRulesEl = getChild(conceptEl, 'TemplateRules');
  const bareRuleEl  = getChild(conceptEl, 'TemplateRule');
  if (tplRulesEl && bareRuleEl) {
    errors.push(`${path}: has both <TemplateRules> and a bare <TemplateRule>; only one is allowed per Draft9`);
  }
  if (tplRulesEl) {
    validateTemplateRules(tplRulesEl, `${path}/<TemplateRules>`, errors, warnings);
  }
  if (bareRuleEl) {
    const params = bareRuleEl.getAttribute('Parameters');
    if (params === null || params === undefined) {
      errors.push(`${path}/<TemplateRule>: missing required "Parameters" attribute`);
    }
  }

  // Draft9 strict sequence: Definitions?, Template+, Requirements?, (TemplateRules|TemplateRule)?
  // Verify Requirements appears before any rule element.
  let reqsPos = -1, rulesPos = -1, pos = 0;
  const childNodes = conceptEl.childNodes;
  for (let n = 0; n < childNodes.length; n++) {
    const child = childNodes[n];
    if (child.nodeType !== 1) continue;
    if (child.localName === 'Requirements') reqsPos = pos;
    if (child.localName === 'TemplateRules' || child.localName === 'TemplateRule') rulesPos = pos;
    pos++;
  }
  if (reqsPos !== -1 && rulesPos !== -1 && reqsPos > rulesPos) {
    errors.push(`${path}: sequence error — <Requirements> must appear before <TemplateRules>/<TemplateRule> per Draft9 strict sequence (Definitions?, Template+, Requirements?, rule?)`);
  }
}

// --- ConceptRoot ---

function validateConceptRoot(rootEl, path, exchangeUuids, templateUuids, errors, warnings) {
  validateIdentityAttrs(rootEl, path, errors, warnings);

  const entity = rootEl.getAttribute('applicableRootEntity') || '';
  if (!entity) {
    warnings.push(`${path}: missing "applicableRootEntity" attribute — no IFC entity scope defined`);
  }

  const conceptsEl = getChild(rootEl, 'Concepts');
  if (!conceptsEl) {
    warnings.push(`${path}: has no <Concepts> — this root defines no requirements`);
  } else {
    const concepts = getChildren(conceptsEl, 'Concept');
    if (concepts.length === 0) {
      warnings.push(`${path}/<Concepts>: contains no <Concept> elements`);
    }
    for (let i = 0; i < concepts.length; i++) {
      validateConcept(
        concepts[i],
        `${path}/<Concepts>/Concept[${i + 1}]`,
        exchangeUuids, templateUuids, errors, warnings
      );
    }
  }
}

// --- ModelView ---

function validateModelView(mvEl, path, templateUuids, errors, warnings) {
  validateIdentityAttrs(mvEl, path, errors, warnings);

  const schema = mvEl.getAttribute('applicableSchema') || '';
  if (!schema) {
    errors.push(`${path}: missing required "applicableSchema" attribute`);
  }

  // Collect ExchangeRequirement UUIDs in this ModelView scope
  const exchangeUuids = new Set();
  const ersEl = getChild(mvEl, 'ExchangeRequirements');
  if (!ersEl) {
    warnings.push(`${path}: has no <ExchangeRequirements> — requirements cannot be linked to exchange scenarios`);
  } else {
    const ers = getChildren(ersEl, 'ExchangeRequirement');
    if (ers.length === 0) {
      warnings.push(`${path}/<ExchangeRequirements>: contains no <ExchangeRequirement> elements`);
    }
    for (let i = 0; i < ers.length; i++) {
      const er = ers[i];
      const erPath = `${path}/<ExchangeRequirements>/ExchangeRequirement[${i + 1}]`;
      validateIdentityAttrs(er, erPath, errors, warnings);

      const uuid = er.getAttribute('uuid') || '';
      if (uuid) exchangeUuids.add(uuid);

      const app = er.getAttribute('applicability') || '';
      if (app && !VALID_APPLICABILITY.has(app)) {
        errors.push(`${erPath}: invalid "applicability" value "${app}". Must be one of: ${[...VALID_APPLICABILITY].join(', ')}`);
      }
    }
  }

  // Validate ConceptRoots
  const rootsEl = getChild(mvEl, 'Roots');
  if (!rootsEl) {
    warnings.push(`${path}: has no <Roots> — this ModelView defines no concept roots`);
  } else {
    const roots = getChildren(rootsEl, 'ConceptRoot');
    if (roots.length === 0) {
      warnings.push(`${path}/<Roots>: contains no <ConceptRoot> elements`);
    }
    for (let i = 0; i < roots.length; i++) {
      validateConceptRoot(
        roots[i],
        `${path}/<Roots>/ConceptRoot[${i + 1}]`,
        exchangeUuids, templateUuids, errors, warnings
      );
    }
  }

  // Handle nested ModelViews (new in mvdXML 1.2)
  const nestedViewsEl = getChild(mvEl, 'Views');
  if (nestedViewsEl) {
    const nestedViews = getChildren(nestedViewsEl, 'ModelView');
    for (let i = 0; i < nestedViews.length; i++) {
      validateModelView(
        nestedViews[i],
        `${path}/<Views>/ModelView[${i + 1}]`,
        templateUuids, errors, warnings
      );
    }
  }
}

// --- Main export ---

/**
 * Validate an mvdXML string against the buildingSMART mvdXML 1.2 schema rules.
 * Also accepts mvdXML 1.1 files with a warning.
 *
 * @param {string} content  Raw XML text
 * @returns {{ valid: boolean, version: string, errors: string[], warnings: string[] }}
 */
export function validateMvdXml(content) {
  const errors = [];
  const warnings = [];

  // 1. Parse XML
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');

  const docRoot = doc.documentElement;
  if (docRoot && docRoot.localName === 'parsererror') {
    return { valid: false, version: 'unknown', errors: ['XML parse error: ' + (docRoot.textContent || '').slice(0, 200)], warnings };
  }
  if (docRoot && docRoot.childNodes) {
    const nodes = docRoot.childNodes;
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].nodeType === 1 && nodes[i].localName === 'parsererror') {
        return { valid: false, version: 'unknown', errors: ['XML parse error: ' + (nodes[i].textContent || '').slice(0, 200)], warnings };
      }
    }
  }

  const root = doc.documentElement;

  // 2. Root element name
  if (root.localName !== 'mvdXML') {
    errors.push(`Root element must be <mvdXML>, got <${root.localName}>`);
    return { valid: false, version: 'unknown', errors, warnings };
  }

  // 3. Namespace — determine version
  const ns = root.namespaceURI || '';
  let version = 'unknown';
  if (ns === MVD_NS_1_2) {
    version = '1.2';
  } else if (ns === MVD_NS_1_2_OLD) {
    version = '1.2-draft1-8';
    warnings.push(`File uses an earlier mvdXML 1.2 namespace ("${MVD_NS_1_2_OLD}"). Update xmlns and xsi:schemaLocation to "${MVD_NS_1_2}" for Draft9 compliance.`);
  } else if (ns === MVD_NS_1_1) {
    version = '1.1';
    warnings.push(`File uses mvdXML 1.1 namespace. Consider updating to mvdXML 1.2 Draft9 (xmlns="${MVD_NS_1_2}").`);
  } else if (ns) {
    errors.push(`Unknown namespace "${ns}". Expected "${MVD_NS_1_2}" for mvdXML 1.2 Draft9.`);
  } else {
    warnings.push(`No XML namespace declared. Add xmlns="${MVD_NS_1_2}" for mvdXML 1.2 Draft9 compliance.`);
  }

  // 4. Root required attributes
  const rootUuid = root.getAttribute('uuid') || '';
  validateUuid(rootUuid, '<mvdXML>', errors);

  const rootName = root.getAttribute('name') || '';
  if (!rootName) {
    errors.push('<mvdXML>: missing required "name" attribute');
  }

  const rootStatus = root.getAttribute('status') || '';
  if (rootStatus && !VALID_STATUSES.has(rootStatus)) {
    errors.push(`<mvdXML>: invalid "status" value "${rootStatus}". Must be one of: ${[...VALID_STATUSES].join(', ')}`);
  }

  // 5. Collect all ConceptTemplate UUIDs for cross-reference checking
  const templateUuids = new Set();
  const templatesEl = getChild(root, 'Templates');

  if (templatesEl) {
    const allTpls = [];
    const collectTpls = (parentEl) => {
      const tpls = getChildren(parentEl, 'ConceptTemplate');
      for (const t of tpls) {
        allTpls.push(t);
        const subTplsEl = getChild(t, 'SubTemplates');
        if (subTplsEl) collectTpls(subTplsEl);
      }
    };
    collectTpls(templatesEl);

    for (let i = 0; i < allTpls.length; i++) {
      validateConceptTemplate(allTpls[i], `<Templates>/ConceptTemplate[${i + 1}]`, errors, warnings);
      const uuid = allTpls[i].getAttribute('uuid') || '';
      if (uuid) templateUuids.add(uuid);
    }

    if (allTpls.length === 0) {
      warnings.push('<Templates>: contains no <ConceptTemplate> elements');
    }
  }

  // 6. Validate ModelViews
  const viewsEl = getChild(root, 'Views');
  if (!viewsEl) {
    warnings.push('<mvdXML>: has no <Views> element — no ModelViews are defined');
  } else {
    const modelViews = getChildren(viewsEl, 'ModelView');
    if (modelViews.length === 0) {
      errors.push('<Views>: must contain at least one <ModelView>');
    }
    for (let i = 0; i < modelViews.length; i++) {
      validateModelView(modelViews[i], `<Views>/ModelView[${i + 1}]`, templateUuids, errors, warnings);
    }
  }

  // 7. UUID uniqueness across key element types (per mvdXML 1.2 xs:unique constraints)
  const allUuids = new Map(); // uuid → first-seen path
  const checkUnique = (localName, container) => {
    const els = [];
    getAllDescendants(container, localName, els);
    for (const el of els) {
      const uuid = el.getAttribute('uuid') || '';
      if (!uuid) continue;
      const path = `<${localName}> uuid="${uuid}"`;
      if (allUuids.has(uuid)) {
        errors.push(`Duplicate UUID "${uuid}" — used by both ${allUuids.get(uuid)} and ${path}`);
      } else {
        allUuids.set(uuid, path);
      }
    }
  };

  if (templatesEl) checkUnique('ConceptTemplate', templatesEl);
  if (viewsEl) {
    checkUnique('ModelView', viewsEl);
    checkUnique('ExchangeRequirement', viewsEl);
    checkUnique('ConceptRoot', viewsEl);
    checkUnique('Concept', viewsEl);
  }

  return { valid: errors.length === 0, version, errors, warnings };
}

/**
 * Format mvdXML validation results into a human-readable string.
 *
 * @param {{ valid: boolean, version: string, errors: string[], warnings: string[] }} result
 * @returns {string}
 */
export function formatMvdValidationReport(result) {
  const lines = [];
  if (result.valid) {
    lines.push(`mvdXML ${result.version} validation passed.`);
  } else {
    lines.push(`mvdXML ${result.version} validation FAILED — ${result.errors.length} error(s) found.`);
  }
  if (result.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const e of result.errors) lines.push('  • ' + e);
  }
  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const w of result.warnings) lines.push('  • ' + w);
  }
  return lines.join('\n');
}
