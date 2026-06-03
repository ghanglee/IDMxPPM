/**
 * IDS v1.0 Validator
 * Validates IDS XML files structurally against the buildingSMART XSD schema rules
 * and the semantic requirements described in the developer guide.
 *
 * Returns { valid: bool, errors: string[], warnings: string[] }
 * - errors:   schema violations (file will be rejected by compliant tools)
 * - warnings: semantic issues (file is valid XML but may behave unexpectedly)
 *
 * Reference schema: http://standards.buildingsmart.org/IDS/1.0/ids.xsd
 * Reference guide:  https://github.com/buildingSMART/IDS/tree/master/Documentation
 */

const IDS_NAMESPACE = 'http://standards.buildingsmart.org/IDS';

const VALID_IFC_VERSIONS = new Set(['IFC2X3', 'IFC4', 'IFC4X3_ADD2']);

const VALID_CONDITIONAL_CARDINALITY = new Set(['required', 'optional', 'prohibited']);
const VALID_SIMPLE_CARDINALITY = new Set(['required', 'prohibited']);

const VALID_RELATIONS = new Set([
  'IFCRELAGGREGATES',
  'IFCRELASSIGNSTOGROUP',
  'IFCRELCONTAINEDINSPATIALSTRUCTURE',
  'IFCRELNESTS',
  'IFCRELVOIDSELEMENT',
  'IFCRELFILLSELEMENT',
]);

// xs:date: YYYY-MM-DD (simplified — no timezone/leap-year semantics)
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// xs:pattern value="[^@]+@[^\.]+\..+" from IDS XSD
const EMAIL_PATTERN = /[^@]+@[^.]+\..+/;

// xs:pattern value="[A-Z]+" for dataType attribute
const UPPERCASE_PATTERN = /^[A-Z]+$/;

// --- XML helpers (namespace-safe, mirrors idsImporter helpers) ---

function getChild(parent, tagName) {
  if (!parent) return null;
  for (const child of parent.childNodes) {
    if (child.nodeType === 1 && child.localName === tagName) return child;
  }
  return null;
}

function getChildren(parent, tagName) {
  if (!parent) return [];
  const result = [];
  for (const child of parent.childNodes) {
    if (child.nodeType === 1 && child.localName === tagName) result.push(child);
  }
  return result;
}

function getChildText(parent, tagName) {
  const el = getChild(parent, tagName);
  return el ? (el.textContent || '').trim() : '';
}

function getAllElementChildren(parent) {
  if (!parent) return [];
  const result = [];
  for (const child of parent.childNodes) {
    if (child.nodeType === 1) result.push(child);
  }
  return result;
}

// --- idsValue validation ---

function validateIdsValue(el, path, errors) {
  if (!el) return;
  const children = getAllElementChildren(el);
  if (children.length === 0) {
    errors.push(`${path}: <${el.localName}> must contain either <simpleValue> or <restriction>, but is empty`);
    return;
  }
  const hasSimple = children.some(c => c.localName === 'simpleValue');
  const hasRestriction = children.some(c => c.localName === 'restriction');
  if (!hasSimple && !hasRestriction) {
    errors.push(`${path}: <${el.localName}> must contain <simpleValue> or <restriction>`);
  }
  if (hasRestriction) {
    validateRestriction(getChild(el, 'restriction'), path, errors);
  }
}

function validateRestriction(restrictionEl, path, errors) {
  if (!restrictionEl) return;
  const base = restrictionEl.getAttribute('base') || '';
  if (!base) {
    errors.push(`${path}: <restriction> must have a "base" attribute`);
  }
  // At least one facet child expected
  const facetChildren = getAllElementChildren(restrictionEl);
  if (facetChildren.length === 0) {
    errors.push(`${path}: <restriction> must contain at least one constraint element (e.g. enumeration, pattern, minExclusive)`);
  }
}

// --- Facet validators ---

function validateEntityFacet(entityEl, path, errors, warnings) {
  const nameEl = getChild(entityEl, 'name');
  if (!nameEl) {
    errors.push(`${path} <entity>: missing required <name>`);
    return;
  }
  validateIdsValue(nameEl, `${path} <entity>/<name>`, errors);

  // Semantic: entity name should be uppercase IFC class
  const simpleVal = getChildText(nameEl, 'simpleValue');
  if (simpleVal && !/^IFC[A-Z]+$/.test(simpleVal)) {
    warnings.push(`${path} <entity>/<name>: "${simpleVal}" does not look like an uppercase IFC class name (expected e.g. IFCWALL)`);
  }

  const ptEl = getChild(entityEl, 'predefinedType');
  if (ptEl) validateIdsValue(ptEl, `${path} <entity>/<predefinedType>`, errors);
}

function validatePropertyFacet(propEl, path, errors, warnings) {
  const psetEl = getChild(propEl, 'propertySet');
  if (!psetEl) {
    errors.push(`${path} <property>: missing required <propertySet>`);
  } else {
    validateIdsValue(psetEl, `${path} <property>/<propertySet>`, errors);
  }

  const baseNameEl = getChild(propEl, 'baseName');
  if (!baseNameEl) {
    errors.push(`${path} <property>: missing required <baseName>`);
  } else {
    validateIdsValue(baseNameEl, `${path} <property>/<baseName>`, errors);
  }

  const valueEl = getChild(propEl, 'value');
  if (valueEl) validateIdsValue(valueEl, `${path} <property>/<value>`, errors);

  const dataType = propEl.getAttribute('dataType') || '';
  if (dataType && !UPPERCASE_PATTERN.test(dataType)) {
    errors.push(`${path} <property>: dataType "${dataType}" must be all uppercase (e.g. IFCLABEL, IFCREAL)`);
  }
}

function validateAttributeFacet(attrEl, path, errors) {
  const nameEl = getChild(attrEl, 'name');
  if (!nameEl) {
    errors.push(`${path} <attribute>: missing required <name>`);
  } else {
    validateIdsValue(nameEl, `${path} <attribute>/<name>`, errors);
  }
  const valueEl = getChild(attrEl, 'value');
  if (valueEl) validateIdsValue(valueEl, `${path} <attribute>/<value>`, errors);
}

function validateClassificationFacet(classEl, path, errors) {
  const systemEl = getChild(classEl, 'system');
  if (!systemEl) {
    errors.push(`${path} <classification>: missing required <system>`);
  } else {
    validateIdsValue(systemEl, `${path} <classification>/<system>`, errors);
  }
  const valueEl = getChild(classEl, 'value');
  if (valueEl) validateIdsValue(valueEl, `${path} <classification>/<value>`, errors);
}

function validateMaterialFacet(matEl, path, errors) {
  const valueEl = getChild(matEl, 'value');
  if (valueEl) validateIdsValue(valueEl, `${path} <material>/<value>`, errors);
}

function validatePartOfFacet(partOfEl, path, errors, warnings) {
  const entityEl = getChild(partOfEl, 'entity');
  if (!entityEl) {
    errors.push(`${path} <partOf>: missing required <entity>`);
  } else {
    validateEntityFacet(entityEl, `${path} <partOf>`, errors, warnings);
  }
  const relation = partOfEl.getAttribute('relation') || '';
  if (relation && !VALID_RELATIONS.has(relation)) {
    errors.push(`${path} <partOf>: invalid relation "${relation}". Must be one of: ${[...VALID_RELATIONS].join(', ')}`);
  }
}

// --- Applicability section ---

function validateApplicability(applEl, specPath, errors, warnings) {
  const path = `${specPath} <applicability>`;

  // minOccurs / maxOccurs — per developer guide: valid combinations are
  // (1, unbounded), (0, unbounded), (0, 0)
  const minOccurs = applEl.getAttribute('minOccurs');
  const maxOccurs = applEl.getAttribute('maxOccurs');
  if (minOccurs !== null || maxOccurs !== null) {
    const min = parseInt(minOccurs ?? '0', 10);
    const maxStr = maxOccurs ?? 'unbounded';
    const validCombos = [
      [0, 'unbounded'],
      [1, 'unbounded'],
      [0, '0'],
    ];
    const isValid = validCombos.some(([m, x]) => min === m && maxStr === x);
    if (!isValid) {
      warnings.push(`${path}: unusual minOccurs="${minOccurs}" maxOccurs="${maxOccurs}". Expected: (0,unbounded)=optional, (1,unbounded)=required, (0,0)=prohibited`);
    }
  }

  const entityEls = getChildren(applEl, 'entity');
  for (const el of entityEls) validateEntityFacet(el, path, errors, warnings);

  const partOfEls = getChildren(applEl, 'partOf');
  for (const el of partOfEls) validatePartOfFacet(el, path, errors, warnings);

  const classEls = getChildren(applEl, 'classification');
  for (const el of classEls) validateClassificationFacet(el, path, errors);

  const attrEls = getChildren(applEl, 'attribute');
  for (const el of attrEls) validateAttributeFacet(el, path, errors);

  const propEls = getChildren(applEl, 'property');
  for (const el of propEls) validatePropertyFacet(el, path, errors, warnings);

  const matEls = getChildren(applEl, 'material');
  for (const el of matEls) validateMaterialFacet(el, path, errors);

  // Semantic: applicability should have at least one facet to be meaningful
  const allFacets = entityEls.length + partOfEls.length + classEls.length +
    attrEls.length + propEls.length + matEls.length;
  if (allFacets === 0) {
    warnings.push(`${path}: has no facets — will match every element in the model`);
  }
}

// --- Requirements section ---

function validateRequirementsCardinality(el, path, kind, errors) {
  const cardAttr = el.getAttribute('cardinality');
  if (!cardAttr) return; // optional attribute, defaults handled by tools
  const validSet = kind === 'simple' ? VALID_SIMPLE_CARDINALITY : VALID_CONDITIONAL_CARDINALITY;
  if (!validSet.has(cardAttr)) {
    errors.push(`${path}: invalid cardinality "${cardAttr}". Must be: ${[...validSet].join(', ')}`);
  }
}

function validateRequirements(reqEl, specPath, errors, warnings) {
  const path = `${specPath} <requirements>`;

  const entityEls = getChildren(reqEl, 'entity');
  for (const el of entityEls) {
    validateEntityFacet(el, path, errors, warnings);
    // entity in requirements does not use cardinality (always "required" per spec)
  }

  const partOfEls = getChildren(reqEl, 'partOf');
  for (const el of partOfEls) {
    validatePartOfFacet(el, path, errors, warnings);
    validateRequirementsCardinality(el, `${path} <partOf>`, 'simple', errors);
  }

  const classEls = getChildren(reqEl, 'classification');
  for (const el of classEls) {
    validateClassificationFacet(el, path, errors);
    validateRequirementsCardinality(el, `${path} <classification>`, 'conditional', errors);
  }

  const attrEls = getChildren(reqEl, 'attribute');
  for (const el of attrEls) {
    validateAttributeFacet(el, path, errors);
    validateRequirementsCardinality(el, `${path} <attribute>`, 'conditional', errors);
  }

  const propEls = getChildren(reqEl, 'property');
  for (const el of propEls) {
    validatePropertyFacet(el, path, errors, warnings);
    validateRequirementsCardinality(el, `${path} <property>`, 'conditional', errors);
  }

  const matEls = getChildren(reqEl, 'material');
  for (const el of matEls) {
    validateMaterialFacet(el, path, errors);
    validateRequirementsCardinality(el, `${path} <material>`, 'conditional', errors);
  }

  // Semantic: at least one requirement facet should be present
  const total = entityEls.length + partOfEls.length + classEls.length +
    attrEls.length + propEls.length + matEls.length;
  if (total === 0) {
    warnings.push(`${path}: has no requirement facets — this specification checks nothing`);
  }
}

// --- Main export ---

/**
 * Validate an IDS XML string against the buildingSMART IDS v1.0 XSD schema rules.
 *
 * @param {string} content  Raw XML text of the .ids file
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateIdsXml(content) {
  const errors = [];
  const warnings = [];

  // 1. XML parse check
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    return { valid: false, errors: ['XML parse error: ' + (parseError.textContent || 'unknown').substring(0, 200)], warnings };
  }

  const root = doc.documentElement;

  // 2. Root element name
  if (root.localName !== 'ids') {
    errors.push(`Root element must be <ids>, got <${root.localName}>`);
    return { valid: false, errors, warnings };
  }

  // 3. Namespace
  const ns = root.namespaceURI || '';
  if (ns !== IDS_NAMESPACE) {
    errors.push(`Invalid namespace: expected "${IDS_NAMESPACE}", got "${ns || '(none)'}".\n  Add xmlns:ids="http://standards.buildingsmart.org/IDS" to the root element.`);
  }

  // 4. <info> section
  const infoEl = getChild(root, 'info');
  if (!infoEl) {
    errors.push('Missing required <info> element');
  } else {
    const title = getChildText(infoEl, 'title');
    if (!title) {
      errors.push('<info>: missing required <title>');
    }

    const author = getChildText(infoEl, 'author');
    if (author && !EMAIL_PATTERN.test(author)) {
      errors.push(`<info>/<author>: "${author}" is not a valid email address (required format: user@domain.tld)`);
    }

    const date = getChildText(infoEl, 'date');
    if (date && !DATE_PATTERN.test(date)) {
      errors.push(`<info>/<date>: "${date}" is not a valid xs:date (required format: YYYY-MM-DD)`);
    }
  }

  // 5. <specifications> section
  const specsEl = getChild(root, 'specifications');
  if (!specsEl) {
    errors.push('Missing required <specifications> element');
    return { valid: errors.length === 0, errors, warnings };
  }

  const specs = getChildren(specsEl, 'specification');
  if (specs.length === 0) {
    errors.push('<specifications>: must contain at least one <specification>');
    return { valid: errors.length === 0, errors, warnings };
  }

  // 6. Each <specification>
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const specName = spec.getAttribute('name');
    const label = specName ? `Specification "${specName}"` : `specification[${i + 1}]`;

    if (!specName) {
      errors.push(`${label}: missing required "name" attribute`);
    }

    const ifcVersion = spec.getAttribute('ifcVersion');
    if (!ifcVersion) {
      errors.push(`${label}: missing required "ifcVersion" attribute`);
    } else {
      const versions = ifcVersion.trim().split(/\s+/).filter(Boolean);
      if (versions.length === 0) {
        errors.push(`${label}: "ifcVersion" is empty`);
      }
      for (const v of versions) {
        if (!VALID_IFC_VERSIONS.has(v)) {
          errors.push(`${label}: unknown ifcVersion value "${v}". Valid values: ${[...VALID_IFC_VERSIONS].join(', ')}`);
        }
      }
    }

    // <applicability> is required
    const applEl = getChild(spec, 'applicability');
    if (!applEl) {
      errors.push(`${label}: missing required <applicability>`);
    } else {
      validateApplicability(applEl, label, errors, warnings);
    }

    // <requirements> is optional but validated when present
    const reqEl = getChild(spec, 'requirements');
    if (reqEl) {
      validateRequirements(reqEl, label, errors, warnings);
    } else {
      warnings.push(`${label}: has no <requirements> — this specification only identifies elements, it does not check them`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Format validation results into a human-readable string for display.
 *
 * @param {{ valid: boolean, errors: string[], warnings: string[] }} result
 * @returns {string}
 */
export function formatValidationReport(result) {
  const lines = [];
  if (result.valid) {
    lines.push('IDS validation passed.');
  } else {
    lines.push(`IDS validation FAILED — ${result.errors.length} error(s) found.`);
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
