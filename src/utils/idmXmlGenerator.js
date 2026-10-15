/**
 * idmXML Generator
 * Generates ISO 29481-3 compliant XML (idmXSD 2.0)
 *
 * Schema v2.0: https://standards.iso.org/iso/29481/-3/ed-2/en
 */

import { isDataUri, parseDataUri } from './filePathUtils.js';
import { iuNameMap, resolveIuTokens, normalizeBusinessRule } from './constraintUtils.js';
import { toIso8601DateTime, hasTimeComponent } from './dateTime.js';
import { normalizeIso22263Phases, getCorrespondingEvds } from './idmSchemaRev14.js';

// changeLog/@changedBy is an xs:NCName that must match an author/@id (keyref_changedBy),
// so author ids such as UUIDs (which may start with a digit) are prefixed to form a valid NCName.
const toNcName = (id) => {
  const s = String(id || '').trim();
  if (/^[A-Za-z_][A-Za-z0-9._-]*$/.test(s)) return s;
  const cleaned = s.replace(/[^A-Za-z0-9._-]/g, '-');
  return cleaned ? `a-${cleaned}` : '';
};

// xml:lang values must be BCP 47 tags; anything else is written without a language
const BCP47_TAG = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const cleanLang = (value) => { const lang = String(value || '').trim(); return BCP47_TAG.test(lang) ? lang : ''; };

// Generate UUID
const generateUUID = () => {
  return crypto.randomUUID?.() ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
};

// Validate UUID format (idmXSD uuid pattern)
const isValidUUID = (str) => {
  return typeof str === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(str);
};

// Ensure a value is a valid UUID, generating one if not
const ensureUUID = (value) => isValidUUID(value) ? value : generateUUID();

// Escape XML special characters
const escapeXml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Keep line breaks in attribute values (XML parsers turn literal ones into spaces)
    .replace(/\r\n|\r|\n/g, '&#10;')
    .replace(/\t/g, '&#9;');
};

// Format date for XML
const formatDate = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

// Convert array or string to comma-separated string
const arrayToString = (value, separator = ', ') => {
  if (Array.isArray(value)) {
    return value.join(separator);
  }
  return value || '';
};

/**
 * Generate XML for images per idmXSD V2 specification
 * For standalone idmXML export, base64 data is embedded inline.
 * For ZIP bundle export, only filePath is written (images are in separate files).
 * @param {Array} images - Array of image objects
 * @param {string} indent - Indentation string
 * @returns {string[]} Array of XML lines
 */
const generateImagesXml = (images, indent = '      ') => {
  const lines = [];
  if (!images || !Array.isArray(images) || images.length === 0) {
    return lines;
  }

  images.forEach((img, index) => {
    const caption = img.caption || img.name || `Figure ${index + 1}`;
    const mimeType = img.type || 'image/png';

    if (img.data && isDataUri(img.data)) {
      // Embed base64 inline (standard idmXML 2.0 standalone export)
      const parsed = parseDataUri(img.data);
      const base64Data = parsed ? parsed.base64Data : '';
      lines.push(`${indent}<image caption="${escapeXml(caption)}" mimeType="${escapeXml(mimeType)}" encoding="base64">${base64Data}</image>`);
    }
    // filePath-only figures are skipped here: this function is only used for standalone
    // idmXML 2.0 export where external file references cannot be resolved.
    // The v1 ZIP generator uses v1Description() which handles filePath references directly.
  });

  return lines;
};

/**
 * Generate description element per idmXSD V2
 * Schema: description has @title (optional) and image children (no inline text content)
 * @param {string} text - Description text (goes in title attribute)
 * @param {Array} images - Optional images
 * @param {string} indent - Indentation string
 * @returns {string[]} Array of XML lines
 */
const generateDescriptionXml = (text, images = [], indent = '      ') => {
  const lines = [];
  const hasImages = images && Array.isArray(images) && images.length > 0;

  if (hasImages) {
    lines.push(`${indent}<description title="${escapeXml(text || '')}">`);
    lines.push(...generateImagesXml(images, indent + '  '));
    lines.push(`${indent}</description>`);
  } else {
    lines.push(`${indent}<description title="${escapeXml(text || '')}"/>`);
  }

  return lines;
};

/**
 * Format author object to display string
 * Handles both Person and Organization types per ISO 29481-3
 */
const formatAuthor = (author) => {
  if (typeof author === 'string') return author;
  if (!author || typeof author !== 'object') return '';

  if (author.type === 'person') {
    // ISO 29481-3 Person format: prefix givenName middleInitial familyName suffix postnominalDesignation
    const parts = [
      author.prefix,
      author.givenName || author.firstName,
      author.middleInitial || author.middleName,
      author.familyName || author.lastName,
      author.suffix,
      author.postnominalDesignation
    ].filter(Boolean);
    const name = parts.join(' ');
    return author.affiliation ? `${name} (${author.affiliation})` : name;
  } else if (author.type === 'organization') {
    return author.name || author.organizationName || '';
  }

  // Fallback for unknown format
  return author.name || author.givenName || '';
};

/**
 * Generate Information Unit XML per idmXSD V2
 */
const generateSynonymsXml = (synonyms, indent) => {
  const lines = [];
  (synonyms || []).forEach(syn => {
    const text = (syn && syn.text ? String(syn.text) : '').trim();
    if (!text) return; // synonymText has minLength 1
    const lang = cleanLang(syn.lang);
    lines.push(`${indent}<synonym${lang ? ` xml:lang="${escapeXml(lang)}"` : ''}>${escapeXml(text)}</synonym>`);
  });
  return lines;
};

const generateInformationUnitXml = (unit, indent = '      ') => {
  const lines = [];
  const synonymLines = generateSynonymsXml(unit.synonyms, indent + '  ');
  const hasSynonyms = synonymLines.length > 0;

  // Check if IU has children (definition figures, examples, external elements, or sub-units)
  const hasDefinitionFigures = unit.definitionFigures && unit.definitionFigures.length > 0;
  const hasExamples = unit.examples || (unit.exampleImages && unit.exampleImages.length > 0);
  const hasExternalElements = unit.correspondingExternalElements && unit.correspondingExternalElements.length > 0;
  const hasSubUnits = unit.subInformationUnits && unit.subInformationUnits.length > 0;
  const hasChildren = hasDefinitionFigures || hasSynonyms || hasExamples || hasExternalElements || hasSubUnits;

  if (hasChildren) {
    lines.push(`${indent}<informationUnit`);
    lines.push(`${indent}  id="${escapeXml(unit.id)}"`);
    lines.push(`${indent}  name="${escapeXml(unit.name || '')}"`);
    lines.push(`${indent}  dataType="${escapeXml(unit.dataType || 'String')}"`);
    lines.push(`${indent}  isMandatory="${unit.isMandatory ? 'true' : 'false'}"`);
    // When definition has figures, use child element instead of attribute
    if (hasDefinitionFigures) {
      lines.push(`${indent}  definition="">`);
      lines.push(...generateDescriptionXml(unit.definition || '', unit.definitionFigures, indent + '  '));
    } else {
      lines.push(`${indent}  definition="${escapeXml(unit.definition || '')}">`);
    }

    // Synonyms - idmXSD v2.0 Rev 10: directly after description, before examples
    if (hasSynonyms) {
      lines.push(...synonymLines);
    }

    // Examples - per idmXSD V2: examples contains description elements (with title attribute)
    if (hasExamples) {
      lines.push(`${indent}  <examples>`);
      // Use description element with title attribute for text content
      // and optional image children
      if (unit.examples && unit.exampleImages && unit.exampleImages.length > 0) {
        // Has both text and images
        lines.push(`${indent}    <description title="${escapeXml(unit.examples)}">`);
        lines.push(...generateImagesXml(unit.exampleImages, indent + '      '));
        lines.push(`${indent}    </description>`);
      } else if (unit.examples) {
        // Text only
        lines.push(`${indent}    <description title="${escapeXml(unit.examples)}"/>`);
      } else if (unit.exampleImages && unit.exampleImages.length > 0) {
        // Images only
        lines.push(`${indent}    <description title="">`);
        lines.push(...generateImagesXml(unit.exampleImages, indent + '      '));
        lines.push(`${indent}    </description>`);
      }
      lines.push(`${indent}  </examples>`);
    }

    // Corresponding External Elements - per idmXSD V2: basis and name required
    if (hasExternalElements) {
      unit.correspondingExternalElements.filter(m => (m?.name || '').trim()).forEach(mapping => {
        // For "Other" schema, use customBasis if available
        const basis = mapping.basis === 'Other' && mapping.customBasis
          ? mapping.customBasis
          : mapping.basis;
        const mDesc = (mapping.description || '').trim();
        if (mDesc) {
          lines.push(`${indent}  <correspondingExternalElement basis="${escapeXml(basis)}" name="${escapeXml(mapping.name)}">`);
          lines.push(`${indent}    <description title="${escapeXml(mDesc)}"/>`);
          lines.push(`${indent}  </correspondingExternalElement>`);
        } else {
          lines.push(`${indent}  <correspondingExternalElement basis="${escapeXml(basis)}" name="${escapeXml(mapping.name)}"/>`);
        }
      });
    }

    // Sub Information Units (recursive)
    if (hasSubUnits) {
      lines.push(`${indent}  <subInformationUnit>`);
      unit.subInformationUnits.forEach(subUnit => {
        lines.push(generateInformationUnitXml(subUnit, indent + '    '));
      });
      lines.push(`${indent}  </subInformationUnit>`);
    }

    lines.push(`${indent}</informationUnit>`);
  } else {
    // No children - self-closing element
    lines.push(`${indent}<informationUnit`);
    lines.push(`${indent}  id="${escapeXml(unit.id)}"`);
    lines.push(`${indent}  name="${escapeXml(unit.name || '')}"`);
    lines.push(`${indent}  dataType="${escapeXml(unit.dataType || 'String')}"`);
    lines.push(`${indent}  isMandatory="${unit.isMandatory ? 'true' : 'false'}"`);
    lines.push(`${indent}  definition="${escapeXml(unit.definition || '')}"/>`);
  }

  return lines.join('\n');
};

/**
 * Generate constraint elements (idmXSD v2.0 Rev 11).
 * Links are repeatable child elements with a ref attribute; references to IUs or business
 * rules that no longer exist are omitted so the output stays schema-valid.
 * ctx: { iuNames: {iuId: name}, brIds: Set<string> }
 */
const generateConstraintsXml = (constraints, indent, ctx = {}) => {
  const lines = [];
  const iuNames = ctx.iuNames || {};
  const brIds = ctx.brIds;
  (constraints || []).forEach((constraint, idx) => {
    lines.push(`${indent}<constraint id="${escapeXml(constraint.id || `constraint-${idx + 1}`)}">`);
    (constraint.businessRuleIds || []).forEach(ref => {
      if (!brIds || brIds.has(ref)) lines.push(`${indent}  <associatedBusinessRule ref="${escapeXml(ref)}"/>`);
    });
    (constraint.informationUnitIds || []).forEach(ref => {
      if (Object.prototype.hasOwnProperty.call(iuNames, ref)) lines.push(`${indent}  <associatedInformationUnit ref="${escapeXml(ref)}"/>`);
    });
    const description = resolveIuTokens(constraint.description || '', iuNames);
    if (description) {
      lines.push(`${indent}  <description title="${escapeXml(description)}"/>`);
    }
    (constraint.expressions || []).forEach(expr => {
      const lang = expr.language || {};
      // id and uri are optional schema attributes: kept for every form (inline content may also name its source file)
      const attrs = [];
      if (expr.xmlId) attrs.push(`id="${escapeXml(expr.xmlId)}"`);
      if (expr.uri) attrs.push(`uri="${escapeXml(expr.uri)}"`);
      lines.push(`${indent}  <expression${attrs.length ? ' ' + attrs.join(' ') : ''}>`);
      const langAttrs = [`name="${escapeXml(lang.name || '')}"`];
      if (lang.version) langAttrs.push(`version="${escapeXml(lang.version)}"`);
      if (lang.publicationYear && /^-?\d{4,}$/.test(String(lang.publicationYear).trim())) {
        langAttrs.push(`publicationYear="${escapeXml(String(lang.publicationYear).trim())}"`);
      }
      if (lang.uri) langAttrs.push(`uri="${escapeXml(lang.uri)}"`);
      lines.push(`${indent}    <formalRuleLanguage ${langAttrs.join(' ')}/>`);
      const body = String(expr.body || '').trim();
      if (body && expr.form !== 'external') {
        if (expr.form === 'xml') {
          // Embedded markup in its own namespace; names substituted for IU tokens are escaped
          const escapedNames = {};
          Object.keys(iuNames).forEach(k => { escapedNames[k] = escapeXml(iuNames[k]); });
          lines.push(resolveIuTokens(body.replace(/^<\?xml[^>]*\?>\s*/, ''), escapedNames));
        } else {
          const text = resolveIuTokens(body, iuNames).replace(/\]\]>/g, ']]]]><![CDATA[>');
          lines.push(`<![CDATA[${text}]]>`);
        }
      }
      lines.push(`${indent}  </expression>`);
    });
    lines.push(`${indent}</constraint>`);
  });
  return lines;
};

/**
 * Generate uc/businessRule elements (idmXSD v2.0 Rev 12):
 * statement (exactly one), images/image (0..1 group), description (0..*, commentary), reference (0..*).
 */
const generateBusinessRulesXml = (businessRules, indent) => {
  const lines = [];
  (businessRules || []).forEach((rawRule, idx) => {
    const br = normalizeBusinessRule(rawRule);
    lines.push(`${indent}<businessRule id="${escapeXml(br.id || `BR-${idx + 1}`)}" name="${escapeXml(br.name || '')}">`);

    // statement is mandatory and must not be empty; fall back to the rule name to stay schema-valid
    const statement = String(br.statement || '').trim() || br.name || br.id || 'Business rule';
    lines.push(`${indent}  <statement>${escapeXml(statement)}</statement>`);

    const imageLines = [];
    (br.images || []).forEach((img, i) => {
      const caption = escapeXml(img.caption || img.name || `Figure ${i + 1}`);
      const mimeType = escapeXml(img.type || 'image/png');
      if (img.data && isDataUri(img.data)) {
        const parsed = parseDataUri(img.data);
        imageLines.push(`${indent}    <image caption="${caption}" mimeType="${mimeType}" encoding="base64">${parsed ? parsed.base64Data : ''}</image>`);
      } else if (img.filePath) {
        imageLines.push(`${indent}    <image caption="${caption}" mimeType="${mimeType}" filePath="${escapeXml(img.filePath)}"/>`);
      }
    });
    if (imageLines.length > 0) { // images needs at least one image
      lines.push(`${indent}  <images>`, ...imageLines, `${indent}  </images>`);
    }

    (br.commentary || []).forEach(c => {
      const text = String(c?.text ?? c ?? '').trim();
      if (text) lines.push(`${indent}  <description title="${escapeXml(text)}"/>`);
    });

    String(br.reference || '').split(/\r?\n/).map(r => r.trim()).filter(Boolean).forEach(ref => {
      lines.push(`${indent}  <reference>${escapeXml(ref)}</reference>`);
    });
    lines.push(`${indent}</businessRule>`);
  });
  return lines;
};

/**
 * Generate Exchange Requirement XML (recursive for nested subERs)
 * Per ISO 29481-3 Clause 10: ER must have at least one informationUnit or subEr
 *
 * @param {Object} er - Exchange Requirement data
 * @param {string} authorName - Author name
 * @param {string} indent - Current indentation
 * @param {boolean} isRoot - Whether this is the root ER element (not wrapped in subEr)
 * @returns {string} ER XML content
 */
const generateErXml = (er, authorName, indent = '  ', isRoot = true, ctx = {}) => {
  const lines = [];
  const erGuid = ensureUUID(er.guid);

  if (isRoot) {
    lines.push(`${indent}<er>`);
  }

  // specId
  lines.push(`${indent}  <specId`);
  lines.push(`${indent}    guid="${erGuid}"`);
  const erShortTitle = (isCodeShortTitle(er.shortTitle) && er.name === er.fullTitle)
    ? er.shortTitle
    : (er.name || er.shortTitle || 'ER');
  lines.push(`${indent}    shortTitle="${escapeXml(erShortTitle)}"`);
  lines.push(`${indent}    fullTitle="${escapeXml(er.fullTitle || er.name || 'Exchange Requirement')}"`);
  lines.push(`${indent}    idmCode="${escapeXml(er.idmCode || `ER-${er.id || Date.now()}`)}"`);
  lines.push(...optionalSpecIdAttrs({ version: er.version }, `${indent}    `));
  lines.push(`${indent}    documentStatus="${escapeXml(er.documentStatus || 'WD')}"/>`);

  // authoring per idmXSD v2.0
  const erCreationDate = er.creationDate || formatDate();
  lines.push(`${indent}  <authoring copyright="Copyright ${new Date().getFullYear()}">`);
  lines.push(`${indent}    <changeLog id="er-log-1" changeDateTime="${erCreationDate}T00:00:00" changeSummary="Initial creation" changedBy="author-1"/>`);
  lines.push(`${indent}    <author id="author-1">`);
  lines.push(`${indent}      <person firstName="${escapeXml(authorName)}"/>`);
  lines.push(`${indent}    </author>`);
  lines.push(`${indent}  </authoring>`);

  // constraint (optional) - idmXSD v2.0 Rev 11 child-element form
  lines.push(...generateConstraintsXml(er.constraints, indent + '  ', ctx));

  // correspondingEvd (optional) - idmXSD v2.0 Rev 14: exchange view definition (formerly correspondingMvd)
  getCorrespondingEvds(er).filter(e => (e.name || '').trim() || (e.basis || '').trim()).forEach(evd => {
    const open = `${indent}  <correspondingEvd basis="${escapeXml(evd.basis || '')}" name="${escapeXml(evd.name || '')}"`;
    if ((evd.description || '').trim()) {
      lines.push(`${open}>`);
      lines.push(`${indent}    <description title="${escapeXml(evd.description.trim())}"/>`);
      lines.push(`${indent}  </correspondingEvd>`);
    } else {
      lines.push(`${open}/>`);
    }
  });

  // description (optional, per idmXSD V2 uses title attribute, with optional image children)
  if (er.description || (er.descriptionFigures && er.descriptionFigures.length > 0)) {
    lines.push(...generateDescriptionXml(er.description || '', er.descriptionFigures || [], indent + '  '));
  }

  // examples (optional) — mirrors the IU examples pattern
  const hasErExamples = er.examples || (er.exampleImages && er.exampleImages.length > 0);
  if (hasErExamples) {
    lines.push(`${indent}  <examples>`);
    if (er.examples && er.exampleImages && er.exampleImages.length > 0) {
      lines.push(`${indent}    <description title="${escapeXml(er.examples)}">`);
      lines.push(...generateImagesXml(er.exampleImages, indent + '      '));
      lines.push(`${indent}    </description>`);
    } else if (er.examples) {
      lines.push(`${indent}    <description title="${escapeXml(er.examples)}"/>`);
    } else {
      lines.push(`${indent}    <description title="">`);
      lines.push(...generateImagesXml(er.exampleImages, indent + '      '));
      lines.push(`${indent}    </description>`);
    }
    lines.push(`${indent}  </examples>`);
  }

  // ISO 29481-3 Clause 10 / idmXSD v2.0:
  // An ER must have at least one informationUnit OR subEr.
  // ERs with only sub-ERs are valid (IUs inherited transitively).
  // Leaf ERs (no sub-ERs) must have at least one IU.
  const hasInfoUnits = er.informationUnits && er.informationUnits.length > 0;
  const hasSubERs = er.subERs && er.subERs.length > 0;

  // Information Units
  if (hasInfoUnits) {
    er.informationUnits.forEach(unit => {
      lines.push(generateInformationUnitXml(unit, indent + '  '));
    });
  }

  // Sub-ERs (recursive per ISO 29481-3)
  if (hasSubERs) {
    er.subERs.forEach(subER => {
      lines.push(`${indent}  <subEr>`);
      lines.push(`${indent}    <er>`);
      lines.push(generateErXml(subER, authorName, indent + '    ', false, ctx));
      lines.push(`${indent}    </er>`);
      lines.push(`${indent}  </subEr>`);
    });
  }

  // Leaf ER with no IUs: add placeholder to satisfy xs:choice minOccurs="1"
  // (filtered out on re-import by the parser)
  if (!hasInfoUnits && !hasSubERs) {
    lines.push(`${indent}  <informationUnit`);
    // idmXSD v2.0 Rev 11: IU ids are unique across the whole ER tree, so derive from the ER guid
    lines.push(`${indent}    id="iu-placeholder-${erGuid}"`);
    lines.push(`${indent}    name="Placeholder"`);
    lines.push(`${indent}    dataType="String"`);
    lines.push(`${indent}    isMandatory="false"`);
    lines.push(`${indent}    definition="Placeholder - leaf ER requires at least one Information Unit"/>`);
  }

  if (isRoot) {
    lines.push(`${indent}</er>`);
  }

  return lines.join('\n');
};

/**
 * Generate root ER with all ERs as subERs
 * Per idmXSD V2, idm element can have only 0..1 er at root level
 */
const generateRootErXml = (erDataMap, headerData, authorName) => {
  const lines = [];

  // Get all ERs from the map and deduplicate by guid/id
  // Multiple data objects can reference the same ER, so we filter duplicates
  const processedErGuids = new Set();
  const allERs = [];

  Object.values(erDataMap || {}).forEach(er => {
    if (!er) return;

    // Get unique identifier for this ER (prefer guid, fallback to id or name)
    const erUniqueId = er.guid || er.id || er.name;

    // Skip if we've already added this ER (deduplicate)
    if (erUniqueId && processedErGuids.has(erUniqueId)) {
      return;
    }

    allERs.push(er);
    if (erUniqueId) {
      processedErGuids.add(erUniqueId);
    }
  });

  if (allERs.length === 0) {
    return ''; // No ERs to export
  }

  // Create a root ER that contains all ERs as subERs
  const rootERName = headerData?.rootERName ||
    (headerData?.shortTitle ? `er_${headerData.shortTitle.replace(/\s+/g, '_')}` : 'er_IDM_Specification');
  const rootErGuid = ensureUUID(headerData?.rootErGuid);

  lines.push('  <er>');

  // Root ER specId
  lines.push('    <specId');
  lines.push(`      guid="${rootErGuid}"`);
  lines.push(`      shortTitle="${escapeXml(rootERName)}"`);
  lines.push(`      fullTitle="${escapeXml(headerData?.title || 'Exchange Requirements')}"`);
  lines.push(`      idmCode="ER-ROOT"`);
  lines.push(`      documentStatus="${escapeXml(headerData?.status || 'WD')}"/>`);

  // Root ER authoring per idmXSD v2.0
  const rootErCreationDate = headerData?.creationDate || formatDate();
  lines.push(`    <authoring copyright="Copyright ${new Date().getFullYear()}">`);
  lines.push(`      <changeLog id="root-er-log-1" changeDateTime="${rootErCreationDate}T00:00:00" changeSummary="Initial creation" changedBy="author-1"/>`);
  lines.push('      <author id="author-1">');
  lines.push(`        <person firstName="${escapeXml(authorName)}"/>`);
  lines.push('      </author>');
  lines.push('    </authoring>');

  // Root ER description
  lines.push(`    <description title="Exchange Requirements for ${escapeXml(headerData?.title || 'IDM Specification')}"/>`);

  // Add all ERs as subERs of the root ER
  allERs.forEach(er => {
    lines.push('    <subEr>');
    lines.push('      <er>');
    lines.push(generateErXml(er, authorName, '      ', false));
    lines.push('      </er>');
    lines.push('    </subEr>');
  });

  lines.push('  </er>');

  return lines.join('\n');
};

// Optional specId attributes kept from an imported file (written only when non-empty)
const optionalSpecIdAttrs = (vals, indent) => Object.entries(vals)
  .filter(([, v]) => v != null && String(v).trim() !== '')
  .map(([k, v]) => `${indent}${k}="${escapeXml(String(v).trim())}"`);

// idmXML 1.0-style code in shortTitle (ER_xxx, er_xxx, ...) is kept while the ER name is unchanged
const isCodeShortTitle = (st) => /^(?:er|uc|idm|pm|bcm|req|usecase)_/i.test(st || '');

/**
 * Generate full idmXML document
 *
 * @param {Object} params
 * @param {Object} params.headerData - IDM header/metadata
 * @param {string} params.bpmnXml - BPMN XML content
 * @param {Object} params.erDataMap - Map of dataObjectId to ER data
 * @param {Array} params.dataObjects - List of data objects from BPMN
 * @returns {string} idmXML content
 */
export const generateIdmXml = ({ headerData, bpmnXml, erDataMap, erHierarchy, dataObjects = [] }) => {
  const namespace = 'https://standards.iso.org/iso/29481/-3/ed-2/en';
  // Use persistent GUIDs if available, otherwise generate new ones
  const idmGuid = ensureUUID(headerData?.idmGuid);
  const ucGuid = ensureUUID(headerData?.ucGuid);
  const bcmGuid = ensureUUID(headerData?.bcmGuid);
  const pmId = headerData?.pmId || `PM-${Date.now()}`;

  // Handle authors array or legacy author string - FIX: properly format author objects
  const authorsArray = Array.isArray(headerData?.authors) ? headerData.authors :
    (headerData?.author ? [headerData.author] : []);
  const author = authorsArray.length > 0
    ? authorsArray.map(formatAuthor).filter(Boolean).join(', ')
    : 'IDMxPPM User';

  const title = headerData?.title || 'IDM Specification';
  const shortTitle = headerData?.shortTitle || title; // Separate shortTitle
  const version = headerData?.version ?? '1.0'; // preserve "" when stored; default 1.0 for new
  const status = headerData?.status || 'WD';
  const language = headerData?.language || 'EN';
  const creationDate = headerData?.creationDate || formatDate();

  const lines = [];

  // XML Declaration
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(`<idm xmlns="${namespace}">`);

  // IDM specId - use separate shortTitle and fullTitle per idmXSD
  const idmCode = headerData?.idmCode || `IDM-${Date.now()}`;
  lines.push('  <specId');
  lines.push(`    guid="${idmGuid}"`);
  lines.push(`    shortTitle="${escapeXml(shortTitle)}"`);
  // Optional specId attributes (idmXSD v2.0): written only when set
  const optAttr = (name, value) => { const v = String(value || '').trim(); if (v) lines.push(`    ${name}="${escapeXml(v)}"`); };
  optAttr('localShortTitle', headerData?.localShortTitle);
  lines.push(`    fullTitle="${escapeXml(title)}"`);
  optAttr('subTitle', headerData?.subTitle);
  lines.push(`    idmCode="${escapeXml(idmCode)}"`);
  optAttr('localCode', headerData?.localCode);
  lines.push(`    documentStatus="${escapeXml(status)}"`);
  optAttr('localDocumentStatus', headerData?.localDocumentStatus);
  lines.push(`    version="${escapeXml(version)}"/>`);

  // IDM authoring per idmXSD v2.0 - copyright attribute required, contains changeLog and author elements
  const copyright = headerData?.copyright || `Copyright ${new Date().getFullYear()}`;
  lines.push(`  <authoring copyright="${escapeXml(copyright)}">`);

  // Author ids as written below (NCName); changeLog/@changedBy must refer to one of them
  const authorIdOf = (authorObj, index) =>
    toNcName((authorObj && typeof authorObj === 'object' && authorObj.id) || `author-${index + 1}`) || `author-${index + 1}`;
  const emittedAuthorIds = authorsArray.length > 0 ? authorsArray.map(authorIdOf) : ['author-1'];
  const resolveChangedBy = (raw) => {
    const id = toNcName(raw);
    return emittedAuthorIds.includes(id) ? id : emittedAuthorIds[0];
  };

  // changeLog elements (required per v2.0, at least one)
  // Per schema: id, changeDateTime, changeSummary, changedBy attributes required
  if (headerData?.changeLogs && headerData.changeLogs.length > 0) {
    headerData.changeLogs.forEach((log, index) => {
      const logId = log.id || `log-${index + 1}`;
      const changeDateTime = toIso8601DateTime(log.changeDateTime) || `${creationDate}T00:00:00`;
      const changeSummary = log.changeSummary || 'Initial creation';
      const changedBy = resolveChangedBy(log.changedBy);
      lines.push(`    <changeLog id="${escapeXml(logId)}" changeDateTime="${escapeXml(changeDateTime)}" changeSummary="${escapeXml(changeSummary)}" changedBy="${escapeXml(changedBy)}">`);
      // Optional change children
      if (log.changes && log.changes.length > 0) {
        log.changes.forEach(change => {
          lines.push(`      <change changedElement="${escapeXml(change.changedElement || '')}" changedFrom="${escapeXml(change.changedFrom || '')}"/>`);
        });
      }
      lines.push('    </changeLog>');
    });
  } else if (headerData?.revisionHistory && headerData.revisionHistory.length > 0) {
    // Convert legacy revisionHistory to changeLog format
    headerData.revisionHistory.forEach((entry, index) => {
      const logId = `log-${index + 1}`;
      const changeDateTime = entry.date
        ? (hasTimeComponent(entry.date) ? toIso8601DateTime(entry.date) : `${entry.date}T00:00:00`)
        : `${creationDate}T00:00:00`;
      const changeSummary = entry.description || 'Modified';
      lines.push(`    <changeLog id="${escapeXml(logId)}" changeDateTime="${escapeXml(changeDateTime)}" changeSummary="${escapeXml(changeSummary)}" changedBy="${emittedAuthorIds[0]}"/>`);
    });
  } else {
    // Default changeLog entry (required)
    lines.push(`    <changeLog id="log-1" changeDateTime="${creationDate}T00:00:00" changeSummary="Initial creation" changedBy="${emittedAuthorIds[0]}"/>`);
  }

  // author elements per idmXSD v2.0 - id required, contains person or organization
  // Lead author (isLead: true) is emitted first; order of others preserved.

  // Org lookup and helper hoisted — also used by UC authoring section below
  const orgById = {};
  authorsArray.forEach(a => { if (a?.type === 'organization' && a.id) orgById[a.id] = a; });
  const getLinkedOrgIds = (authorObj) => {
    if (Array.isArray(authorObj.affiliationOrgIds)) return authorObj.affiliationOrgIds;
    if (authorObj.affiliationOrgId) return [authorObj.affiliationOrgId];
    return [];
  };

  if (authorsArray.length > 0) {
    const sorted = [
      ...authorsArray.filter(a => a && typeof a === 'object' && a.isLead),
      ...authorsArray.filter(a => !(a && typeof a === 'object' && a.isLead))
    ];

    sorted.forEach((authorObj, index) => {
      const authorId = authorIdOf(authorObj, authorsArray.indexOf(authorObj));
      if (authorObj && typeof authorObj === 'object') {
        lines.push(`    <author id="${escapeXml(authorId)}">`);
        if (authorObj.type === 'person') {
          const linkedOrgIds = getLinkedOrgIds(authorObj);
          const linkedOrgs = linkedOrgIds.map(id => orgById[id]).filter(Boolean);
          lines.push('      <person');
          lines.push(`        firstName="${escapeXml(authorObj.givenName || authorObj.firstName || '')}"`);
          if (authorObj.middleInitial || authorObj.middleName) {
            lines.push(`        middleName="${escapeXml(authorObj.middleInitial || authorObj.middleName)}"`);
          }
          if (authorObj.familyName || authorObj.lastName) {
            lines.push(`        lastName="${escapeXml(authorObj.familyName || authorObj.lastName)}"`);
          }
          if (authorObj.uri || authorObj.emailAddress) {
            lines.push(`        emailAddress="${escapeXml(authorObj.uri || authorObj.emailAddress)}"`);
          }
          // Free-text affiliation only when no structured org links
          if (linkedOrgs.length === 0 && authorObj.affiliation) {
            lines.push(`        affiliation="${escapeXml(authorObj.affiliation)}"`);
          }
          lines.push('      />');
          // Emit one <organization/> per linked org inside the same <author> block
          linkedOrgs.forEach(org => {
            const orgAttrs = [`name="${escapeXml(org.name || '')}"`];
            if (org.uri) orgAttrs.push(`uri="${escapeXml(org.uri)}"`);
            lines.push(`      <organization ${orgAttrs.join(' ')}/>`);
          });
          // Also emit free-text affiliation as an org when linked orgs are present but user typed an extra one
          if (linkedOrgs.length > 0 && authorObj.affiliation) {
            lines.push(`      <organization name="${escapeXml(authorObj.affiliation)}"/>`);
          }
        } else if (authorObj.type === 'organization') {
          lines.push(`      <organization name="${escapeXml(authorObj.name || '')}"/>`);
        } else {
          // Default to person if type unknown
          lines.push('      <person');
          lines.push(`        firstName="${escapeXml(authorObj.givenName || authorObj.name || 'Unknown')}"`);
          lines.push('      />');
        }
        lines.push('    </author>');
      } else if (typeof authorObj === 'string') {
        lines.push(`    <author id="${escapeXml(authorId)}">`);
        lines.push(`      <person firstName="${escapeXml(authorObj)}"/>`);
        lines.push('    </author>');
      }
    });
  } else {
    // Default author (required)
    lines.push('    <author id="author-1">');
    lines.push(`      <person firstName="${escapeXml(author)}"/>`);
    lines.push('    </author>');
  }

  // Publisher (optional, after authors)
  if (headerData?.publisher && (headerData.publisher.name || '').trim()) {
    const loc = (headerData.publisher.location || '').trim();
    lines.push(`    <publisher name="${escapeXml(headerData.publisher.name.trim())}"${loc ? ` location="${escapeXml(loc)}"` : ''}/>`);
  }

  lines.push('  </authoring>');

  // Use Case (uc)
  lines.push('  <uc>');

  // UC specId
  lines.push('    <specId');
  lines.push(`      guid="${ucGuid}"`);
  lines.push(`      shortTitle="${escapeXml(headerData?.ucShortTitle || shortTitle)}"`);
  lines.push(`      fullTitle="${escapeXml(headerData?.ucFullTitle || title)}"`);
  lines.push(`      idmCode="${escapeXml(headerData?.ucIdmCode || `UC-${idmCode.replace('IDM-', '')}`)}"`);
  lines.push(...optionalSpecIdAttrs({ version: headerData?.ucVersion }, '      '));
  lines.push(`      documentStatus="${escapeXml(headerData?.ucDocumentStatus || status)}"/>`);

  // UC authoring per idmXSD v2.0
  lines.push(`    <authoring copyright="${escapeXml(copyright)}">`);
  lines.push(`      <changeLog id="uc-log-1" changeDateTime="${creationDate}T00:00:00" changeSummary="Initial creation" changedBy="${emittedAuthorIds[0]}"/>`);
  if (authorsArray.length > 0) {
    authorsArray.forEach((authorObj, index) => {
      const authorId = authorIdOf(authorObj, authorsArray.indexOf(authorObj));
      if (authorObj && typeof authorObj === 'object') {
        lines.push(`      <author id="${escapeXml(authorId)}">`);
        if (authorObj.type === 'person') {
          const linkedOrgIds = getLinkedOrgIds(authorObj);
          const linkedOrgs = linkedOrgIds.map(id => orgById[id]).filter(Boolean);
          lines.push(`        <person firstName="${escapeXml(authorObj.givenName || authorObj.firstName || '')}"`);
          if (authorObj.familyName || authorObj.lastName) {
            lines.push(`          lastName="${escapeXml(authorObj.familyName || authorObj.lastName)}"`);
          }
          if (linkedOrgs.length === 0 && authorObj.affiliation) {
            lines.push(`          affiliation="${escapeXml(authorObj.affiliation)}"`);
          }
          lines.push('        />');
          linkedOrgs.forEach(org => {
            const orgAttrs = [`name="${escapeXml(org.name || '')}"`];
            if (org.uri) orgAttrs.push(`uri="${escapeXml(org.uri)}"`);
            lines.push(`        <organization ${orgAttrs.join(' ')}/>`);
          });
          if (linkedOrgs.length > 0 && authorObj.affiliation) {
            lines.push(`        <organization name="${escapeXml(authorObj.affiliation)}"/>`);
          }
        } else if (authorObj.type === 'organization') {
          lines.push(`        <organization name="${escapeXml(authorObj.name || '')}"/>`);
        } else {
          lines.push(`        <person firstName="${escapeXml(authorObj.givenName || authorObj.name || 'Unknown')}"/>`);
        }
        lines.push('      </author>');
      } else if (typeof authorObj === 'string') {
        lines.push(`      <author id="${escapeXml(authorId)}">`);
        lines.push(`        <person firstName="${escapeXml(authorObj)}"/>`);
        lines.push('      </author>');
      }
    });
  } else {
    lines.push('      <author id="author-1">');
    lines.push(`        <person firstName="${escapeXml(author)}"/>`);
    lines.push('      </author>');
  }
  lines.push('    </authoring>');

  // Summary (required per idmXSD V2) - description with title attribute and image children
  lines.push('    <summary>');
  lines.push(...generateDescriptionXml(
    headerData?.summary || 'IDM Specification',
    headerData?.summaryFigures,
    '      '
  ));
  lines.push('    </summary>');

  // Aim and Scope (required per idmXSD V2) - description with title attribute and image children
  const aimAndScopeContent = headerData?.aimAndScope || headerData?.objectives || 'Define exchange requirements for BIM processes';
  lines.push('    <aimAndScope>');
  lines.push(...generateDescriptionXml(
    aimAndScopeContent,
    headerData?.aimAndScopeFigures,
    '      '
  ));
  lines.push('    </aimAndScope>');

  // Language
  lines.push(`    <language>${escapeXml(language)}</language>`);

  // Use elements (required per idmXSD, 1..*)
  // Support new format (uses: [{verb, noun}]) and legacy (useCategories: string[])
  const uses = Array.isArray(headerData?.uses) && headerData.uses.length > 0
    ? headerData.uses
    : (Array.isArray(headerData?.useCategories) && headerData.useCategories.length > 0
      ? headerData.useCategories.map(cat => ({ verb: 'Perform', noun: cat }))
      : [{ verb: 'Coordinate', noun: 'Design Model' }]); // Default required value

  // Use Classification info (optional, e.g., "BIM Uses" library reference)
  const useClassification = headerData?.useClassification;

  uses.forEach((use, index) => {
    let useName = '';
    if (typeof use === 'object' && use.verb && use.noun) {
      useName = `${use.verb} ${use.noun}`;
    } else if (typeof use === 'string') {
      useName = use;
    }

    if (useName) {
      if (useClassification && useClassification.name) {
        // Include classification child per idmXSD V2 (id and name required)
        lines.push(`    <use name="${escapeXml(useName)}">`);
        lines.push(`      <classification id="use-class-${index + 1}" name="${escapeXml(useClassification.name)}"`);
        if (useClassification.version) {
          lines.push(`        version="${escapeXml(useClassification.version)}"`);
        }
        if (useClassification.publicationYear) {
          lines.push(`        publicationYear="${escapeXml(useClassification.publicationYear)}"`);
        }
        lines.push('      />');
        lines.push('    </use>');
      } else {
        lines.push(`    <use name="${escapeXml(useName)}"/>`);
      }
    }
  });

  // Regions (required per idmXSD, 1..*)
  const regions = Array.isArray(headerData?.regions) && headerData.regions.length > 0
    ? headerData.regions
    : (headerData?.region ? [headerData.region] : ['international']);

  regions.forEach(region => {
    lines.push(`    <region value="${escapeXml(region)}">`);
    lines.push('      <type>USR</type>');
    lines.push('    </region>');
  });

  // Standard project phases (required per idmXSD, 1..*) - idmXSD v2.0 Rev 13: standardProjectPhase
  // Use ISO 22263 phases from projectStagesIso, fall back to projectStages, then default
  const isoStagesRaw = Array.isArray(headerData?.projectStagesIso) && headerData.projectStagesIso.length > 0
    ? headerData.projectStagesIso
    : (Array.isArray(headerData?.projectStages) && headerData.projectStages.length > 0
      ? headerData.projectStages
      : []);
  const isoStagesNorm = normalizeIso22263Phases(isoStagesRaw);
  const isoStages = isoStagesNorm.length > 0 ? isoStagesNorm : ['design']; // Default required value

  // Valid standardProjectStage values per idmXSD V2 enum
  const validStagesV2 = ['inception', 'brief', 'design', 'production', 'maintenance', 'demolition'];

  // Map common stage names to idmXSD V2 enum values
  const stageMapping = {
    'inception': 'inception',
    'brief': 'brief',
    'design': 'design',
    'production': 'production',
    'maintenance': 'maintenance',
    'demolition': 'demolition',
    // Map legacy/alternative names
    'handover': 'production', // handover is end of production
    'operation': 'maintenance', // operation phase maps to maintenance
    'end-of-life': 'demolition',
    'concept': 'inception',
    'feasibility': 'brief',
    'construction': 'production'
  };

  // idmXSD v2.0 Rev 13: "project phase" as in ISO 29481-1:2025 (was standardProjectStage/localProjectStage)
  const stdStageElement = 'standardProjectPhase';
  const localStageElement = 'localProjectPhase';

  const emittedStages = new Set();
  isoStages.forEach(stage => {
    const normalizedStage = stageMapping[stage?.toLowerCase()] ||
                           (validStagesV2.includes(stage?.toLowerCase()) ? stage.toLowerCase() : 'design');
    if (emittedStages.has(normalizedStage)) return; // Skip duplicates after normalization
    emittedStages.add(normalizedStage);
    lines.push(`    <${stdStageElement}>`);
    lines.push(`      <name>${normalizedStage}</name>`);
    lines.push(`    </${stdStageElement}>`);
  });

  // Local project phases - AIA B101 (US)
  if (Array.isArray(headerData?.projectStagesAia) && headerData.projectStagesAia.length > 0) {
    headerData.projectStagesAia.forEach((stage, index) => {
      lines.push(`    <${localStageElement}>`);
      lines.push(`      <name>${escapeXml(stage)}</name>`);
      // classification requires id (required) and name (required) per idmXSD V2
      lines.push(`      <classification id="aia-stage-${index + 1}" name="AIA B101"/>`);
      lines.push(`    </${localStageElement}>`);
    });
  }

  // Local project phases - RIBA Plan of Work (UK)
  if (Array.isArray(headerData?.projectStagesRiba) && headerData.projectStagesRiba.length > 0) {
    headerData.projectStagesRiba.forEach((stage, index) => {
      lines.push(`    <${localStageElement}>`);
      lines.push(`      <name>${escapeXml(stage)}</name>`);
      // classification requires id (required) and name (required) per idmXSD V2
      lines.push(`      <classification id="riba-stage-${index + 1}" name="RIBA Plan of Work"/>`);
      lines.push(`    </${localStageElement}>`);
    });
  }

  // Custom project phase classifications (user-defined local project phases)
  (Array.isArray(headerData?.customProjectPhases) ? headerData.customProjectPhases : []).forEach((phase, index) => {
    const phaseName = (phase?.phaseName || '').trim();
    if (!phaseName) return;
    const classificationName = (phase?.classificationName || '').trim();
    lines.push(`    <${localStageElement}>`);
    lines.push(`      <name>${escapeXml(phaseName)}</name>`);
    if (classificationName) {
      lines.push(`      <classification id="custom-phase-${index + 1}" name="${escapeXml(classificationName)}"/>`);
    }
    lines.push(`    </${localStageElement}>`);
  });

  // Target construction entities (uc/constructionEntity)
  (Array.isArray(headerData?.constructionEntities) ? headerData.constructionEntities : [])
    .map(c => String(c || '').trim()).filter(Boolean)
    .forEach(name => lines.push(`    <constructionEntity name="${escapeXml(name)}"/>`));

  // Business rules (idmXSD v2.0) - after constructionEntity, before actor
  lines.push(...generateBusinessRulesXml(headerData?.businessRules, '    '));

  // Actors (per idmXSD V2 - must come before benefits/limitations per schema sequence)
  // Actor-to-BPMN shape mapping is now in businessContextMap (shapeAndActor), not in actor element
  if (headerData?.actorsList && headerData.actorsList.length > 0) {
    headerData.actorsList.forEach((actor, index) => {
      const actorId = actor.id || `actor-${index + 1}`;
      const actorName = actor.name || 'Unnamed Actor';
      // idmXSD v2.0 Rev 13: an actor is an actor role; external="true" marks an external actor role
      const externalAttr = actor.external ? ' external="true"' : '';

      const hasSubActors = actor.subActors && actor.subActors.length > 0;
      const hasRole = actor.role;
      const hasChildren = hasSubActors || hasRole;

      if (hasChildren) {
        lines.push(`    <actor id="${escapeXml(actorId)}" name="${escapeXml(actorName)}"${externalAttr}>`);

        // classification for role (per idmXSD V2 - id and name required)
        if (hasRole) {
          lines.push(`      <classification id="role-${index + 1}" name="${escapeXml(actor.role)}"/>`);
        }

        // subActor elements (per idmXSD V2 - direct id/name attributes, optional classification)
        if (hasSubActors) {
          actor.subActors.forEach((subActor, subIndex) => {
            const subActorId = subActor.id || `actor-${index + 1}-sub-${subIndex + 1}`;
            const subActorName = subActor.name || 'Unnamed Lane';
            if (subActor.role) {
              lines.push(`      <subActor id="${escapeXml(subActorId)}" name="${escapeXml(subActorName)}">`);
              lines.push(`        <classification id="sub-role-${index + 1}-${subIndex + 1}" name="${escapeXml(subActor.role)}"/>`);
              lines.push('      </subActor>');
            } else {
              lines.push(`      <subActor id="${escapeXml(subActorId)}" name="${escapeXml(subActorName)}"/>`);
            }
          });
        }

        lines.push('    </actor>');
      } else {
        lines.push(`    <actor id="${escapeXml(actorId)}" name="${escapeXml(actorName)}"${externalAttr}/>`);
      }
    });
  } else if (headerData?.actors && typeof headerData.actors === 'string') {
    // Legacy support - parse text-only actors into structured format
    const actorNames = headerData.actors.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    if (actorNames.length > 0) {
      actorNames.forEach((name, index) => {
        lines.push(`    <actor id="actor-${index + 1}" name="${escapeXml(name)}"/>`);
      });
    }
  }

  // Benefits (optional) - per idmXSD V2, uses description with title attribute
  if (headerData?.benefits || (headerData?.benefitsFigures && headerData.benefitsFigures.length > 0)) {
    lines.push('    <benefits>');
    lines.push(...generateDescriptionXml(
      headerData?.benefits || '',
      headerData?.benefitsFigures,
      '      '
    ));
    lines.push('    </benefits>');
  }

  // Limitations (optional) - per idmXSD V2, uses description with title attribute
  if (headerData?.limitations || (headerData?.limitationsFigures && headerData.limitationsFigures.length > 0)) {
    lines.push('    <limitations>');
    lines.push(...generateDescriptionXml(
      headerData?.limitations || '',
      headerData?.limitationsFigures,
      '      '
    ));
    lines.push('    </limitations>');
  }

  // Required Resources (per idmXSD V2 schema)
  if (headerData?.requiredResources) {
    lines.push('    <requiredResources>');
    lines.push(`      <description title="${escapeXml(headerData.requiredResources)}"/>`);
    lines.push('    </requiredResources>');
  }

  // Required Competencies (per idmXSD V2 schema)
  if (headerData?.requiredCompetencies) {
    lines.push('    <requiredCompetencies>');
    lines.push(`      <description title="${escapeXml(headerData.requiredCompetencies)}"/>`);
    lines.push('    </requiredCompetencies>');
  }

  // Scope and benefit keywords (uc/scopeKeyword, uc/benefitKeyword)
  const keywordList = (v) => (Array.isArray(v) ? v : String(v || '').split(','))
    .map(k => String(k || '').trim()).filter(Boolean);
  keywordList(headerData?.keywords).forEach(k => lines.push(`    <scopeKeyword>${escapeXml(k)}</scopeKeyword>`));
  keywordList(headerData?.benefitKeywords).forEach(k => lines.push(`    <benefitKeyword>${escapeXml(k)}</benefitKeyword>`));

  // References (uc/reference): one per line; a leading "[basis] " marks a basis standard
  String(headerData?.references || '').split(/\r?\n/).map(r => r.trim()).filter(Boolean).forEach(ref => {
    const isBasis = /^\[basis\]\s*/i.test(ref);
    const citation = ref.replace(/^\[basis\]\s*/i, '');
    lines.push(`    <reference basisStandard="${isBasis ? 'true' : 'false'}" fullCitation="${escapeXml(citation)}"/>`);
  });

  // Additional description: "name = value" lines become userDefinedProperty elements
  String(headerData?.additionalDescription || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(line => {
    const m = line.match(/^([^=]+?)\s*=\s*(.*)$/);
    const name = m ? m[1].trim() : 'Additional description';
    const value = m ? m[2].trim() : line;
    lines.push(`    <userDefinedProperty name="${escapeXml(name)}">`);
    lines.push(`      <description title="${escapeXml(value)}"/>`);
    lines.push('    </userDefinedProperty>');
  });

  // Additional ISO 29481-1 elements mapped to userDefinedProperty per idmXSD V2
  // (preconditions, postconditions, triggeringEvents, requiredCapabilities, complianceCriteria
  // are not in idmXSD V2 schema, so we map them to userDefinedProperty)
  if (headerData?.preconditions) {
    lines.push('    <userDefinedProperty name="Preconditions">');
    lines.push(`      <description title="${escapeXml(headerData.preconditions)}"/>`);
    lines.push('    </userDefinedProperty>');
  }

  if (headerData?.postconditions) {
    lines.push('    <userDefinedProperty name="Postconditions">');
    lines.push(`      <description title="${escapeXml(headerData.postconditions)}"/>`);
    lines.push('    </userDefinedProperty>');
  }

  if (headerData?.triggeringEvents) {
    lines.push('    <userDefinedProperty name="Triggering Events">');
    lines.push(`      <description title="${escapeXml(headerData.triggeringEvents)}"/>`);
    lines.push('    </userDefinedProperty>');
  }

  if (headerData?.requiredCapabilities) {
    lines.push('    <userDefinedProperty name="Required Capabilities">');
    lines.push(`      <description title="${escapeXml(headerData.requiredCapabilities)}"/>`);
    lines.push('    </userDefinedProperty>');
  }

  if (headerData?.complianceCriteria) {
    lines.push('    <userDefinedProperty name="Compliance Criteria">');
    lines.push(`      <description title="${escapeXml(headerData.complianceCriteria)}"/>`);
    lines.push('    </userDefinedProperty>');
  }

  lines.push('  </uc>');

  // Business Context Map
  lines.push('  <businessContextMap>');

  // BCM specId
  lines.push('    <specId');
  lines.push(`      guid="${bcmGuid}"`);
  lines.push(`      shortTitle="${escapeXml(headerData?.bcmShortTitle || 'Process Map')}"`);
  lines.push(`      fullTitle="${escapeXml(headerData?.bcmFullTitle || 'Business Context Map')}"`);
  // Stable code: kept from import, otherwise derived from the IDM code (was a timestamp per export)
  lines.push(`      idmCode="${escapeXml(headerData?.bcmIdmCode || `BCM-${idmCode.replace(/^IDM-/i, '')}`)}"`);
  lines.push(...optionalSpecIdAttrs({ version: headerData?.bcmVersion }, '      '));
  lines.push(`      documentStatus="${escapeXml(headerData?.bcmDocumentStatus || status)}"/>`);

  // BCM authoring per idmXSD v2.0
  lines.push(`    <authoring copyright="${escapeXml(copyright)}">`);
  lines.push(`      <changeLog id="bcm-log-1" changeDateTime="${creationDate}T00:00:00" changeSummary="Initial creation" changedBy="author-1"/>`);
  lines.push('      <author id="author-1">');
  lines.push(`        <person firstName="${escapeXml(author)}"/>`);
  lines.push('      </author>');
  lines.push('    </authoring>');

  // Process Map
  lines.push('    <pm>');
  lines.push('      <diagram');
  lines.push(`        id="${pmId}"`);
  lines.push(`        name="Process Map"`);
  lines.push(`        notation="BPMN 2.0"`);
  lines.push(`        diagramFilePath="process-map.bpmn">`);

  // Embed BPMN XML content within CDATA section
  if (bpmnXml) {
    lines.push('        <diagramContent><![CDATA[');
    lines.push(bpmnXml);
    lines.push(']]></diagramContent>');
  }
  lines.push('      </diagram>');

  // Data Object and ER links
  if (dataObjects && dataObjects.length > 0) {
    dataObjects.forEach((dataObj, index) => {
      const er = erDataMap?.[dataObj.id];
      if (er) {
        lines.push(`      <dataObjectAndEr id="DOER-${index + 1}">`);
        lines.push(`        <associatedDataObject ref="${escapeXml(dataObj.id)}"/>`);
        lines.push(`        <associatedEr ref="${escapeXml(er.guid || er.id)}"/>`);
        lines.push('      </dataObjectAndEr>');
      }
    });
  }

  // shapeAndActor links - map BPMN Pools/Lanes to Actors/SubActors
  if (headerData?.actorsList && headerData.actorsList.length > 0) {
    let shapeAndActorIndex = 0;
    headerData.actorsList.forEach(actor => {
      const actorId = actor.id || '';
      const bpmnShape = actor.bpmnShapeName || actor.bpmnId || actor.bpmnLaneId;
      if (bpmnShape && actorId) {
        shapeAndActorIndex++;
        lines.push(`      <shapeAndActor id="SA-${shapeAndActorIndex}">`);
        lines.push(`        <associatedShape ref="${escapeXml(bpmnShape)}"/>`);
        lines.push(`        <associatedActor ref="${escapeXml(actorId)}"/>`);
        lines.push('      </shapeAndActor>');
      }
      // Also map subActors (lanes) to their BPMN shapes
      if (actor.subActors && actor.subActors.length > 0) {
        actor.subActors.forEach(subActor => {
          const subActorId = subActor.id || '';
          const subBpmnShape = subActor.bpmnShapeName;
          if (subBpmnShape && subActorId) {
            shapeAndActorIndex++;
            lines.push(`      <shapeAndActor id="SA-${shapeAndActorIndex}">`);
            lines.push(`        <associatedShape ref="${escapeXml(subBpmnShape)}"/>`);
            lines.push(`        <associatedActor ref="${escapeXml(subActorId)}"/>`);
            lines.push('      </shapeAndActor>');
          }
        });
      }
    });
  }

  lines.push('    </pm>');
  lines.push('  </businessContextMap>');

  // Exchange Requirements - per idmXSD V2, only 0..1 er at root level
  const constraintCtx = {
    iuNames: iuNameMap(erHierarchy || []),
    brIds: new Set((headerData?.businessRules || []).map(b => b.id))
  };
  // Use erHierarchy directly when available (preserves root ER's own IUs)
  if (erHierarchy && erHierarchy.length === 1) {
    lines.push(generateErXml(erHierarchy[0], author, '  ', true, constraintCtx));
  } else if (erHierarchy && erHierarchy.length > 1) {
    // Multiple top-level ERs: promote first ER as root, rest become its subERs
    const [syntheticRoot, ...rest] = erHierarchy;
    const mergedRoot = { ...syntheticRoot, subERs: [...(syntheticRoot.subERs || []), ...rest] };
    lines.push(generateErXml(mergedRoot, author, '  ', true, constraintCtx));
  } else if (erDataMap && Object.keys(erDataMap).length > 0) {
    // Fallback: generate synthetic root ER from legacy erDataMap
    lines.push(generateRootErXml(erDataMap, headerData, author));
  }

  lines.push('</idm>');

  // Return XML content along with generated GUIDs for persistence
  return {
    xml: lines.join('\n'),
    guids: {
      idmGuid,
      ucGuid,
      bcmGuid,
      pmId,
      idmCode
    }
  };
};

/**
 * Generate standalone ER XML (for .erxml export) per idmXSD V2
 */
export const generateErXmlStandalone = (er, authorName = 'IDMxPPM User') => {
  const lines = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<er xmlns="https://standards.iso.org/iso/29481/-3/ed-2/en">');

  const erGuid = ensureUUID(er.guid);

  // specId
  lines.push('  <specId');
  lines.push(`    guid="${erGuid}"`);
  lines.push(`    shortTitle="${escapeXml(er.name || er.shortTitle || 'ER')}"`);
  lines.push(`    fullTitle="${escapeXml(er.fullTitle || er.name || 'Exchange Requirement')}"`);
  lines.push(`    idmCode="${escapeXml(er.idmCode || `ER-${er.id || Date.now()}`)}"`);
  lines.push(`    documentStatus="${escapeXml(er.documentStatus || 'WD')}"/>`);

  // authoring per idmXSD v2.0
  const standaloneErCreationDate = er.creationDate || formatDate();
  lines.push(`  <authoring copyright="Copyright ${new Date().getFullYear()}">`);
  lines.push(`    <changeLog id="er-log-1" changeDateTime="${standaloneErCreationDate}T00:00:00" changeSummary="Initial creation" changedBy="author-1"/>`);
  lines.push('    <author id="author-1">');
  lines.push(`      <person firstName="${escapeXml(authorName)}"/>`);
  lines.push('    </author>');
  lines.push('  </authoring>');

  // Constraints (Rev 11). A standalone ER has no use case, so business-rule links are left out
  // (brIds is empty) and IU links are limited to IUs inside this ER's subtree.
  const standaloneCtx = { iuNames: iuNameMap([er]), brIds: new Set() };
  lines.push(...generateConstraintsXml(er.constraints, '  ', standaloneCtx));

  // description - per idmXSD V2, uses title attribute
  if (er.description) {
    lines.push(`  <description title="${escapeXml(er.description)}"/>`);
  }

  // ISO 29481-3 Clause 10 / idmXSD v2.0:
  // ERs with only sub-ERs are valid. Leaf ERs must have at least one IU.
  const hasInfoUnits = er.informationUnits && er.informationUnits.length > 0;
  const hasSubERs = er.subERs && er.subERs.length > 0;

  // Information Units
  if (hasInfoUnits) {
    er.informationUnits.forEach(unit => {
      lines.push(generateInformationUnitXml(unit, '  '));
    });
  }

  // Sub-ERs (recursive)
  if (hasSubERs) {
    er.subERs.forEach(subER => {
      lines.push('  <subEr>');
      lines.push('    <er>');
      lines.push(generateErXml(subER, authorName, '    ', false, standaloneCtx));
      lines.push('    </er>');
      lines.push('  </subEr>');
    });
  }

  // Leaf ER with no IUs: add placeholder to satisfy xs:choice minOccurs="1"
  if (!hasInfoUnits && !hasSubERs) {
    lines.push('  <informationUnit');
    lines.push(`    id="iu-placeholder-${erGuid}"`);
    lines.push('    name="Placeholder"');
    lines.push('    dataType="String"');
    lines.push('    isMandatory="false"');
    lines.push('    definition="Placeholder - leaf ER requires at least one Information Unit"/>');
  }

  lines.push('</er>');

  return lines.join('\n');
};

// ─── idmXSD v1.0 Generator ────────────────────────────────────────────────────

const escapeXmlV1 = escapeXml; // same escaping rules

/** v1.0 description element: <description><content>text</content></description> */
const v1Description = (text, images, indent) => {
  if (!text && (!images || images.length === 0)) return [];
  const lines = [];
  lines.push(`${indent}<description>`);
  if (text) lines.push(`${indent}  <content>${escapeXmlV1(text)}</content>`);
  if (images && images.length > 0) {
    images.forEach(img => {
      if (!img.filePath) return; // skip inline base64 — should have been extracted before calling
      const caption = img.caption || img.name || '';
      lines.push(`${indent}  <image caption="${escapeXmlV1(caption)}" filePath="${escapeXmlV1(img.filePath)}"/>`);
    });
  }
  lines.push(`${indent}</description>`);
  return lines;
};

/** v1.0 examples element (text + optional images) */
const v1Examples = (text, images, indent) => {
  if (!text && (!images || images.length === 0)) return [];
  return [
    `${indent}<examples>`,
    ...v1Description(text, images, indent + '  '),
    `${indent}</examples>`
  ];
};

/**
 * v1.0 authoring block.
 * @param {Array|null} storedChangeLogs - parsed changeLogs from headerData (IDM level only)
 */
const v1Authoring = (headerData, authorsList, copyright, creationDate, indent, storedChangeLogs) => {
  const lines = [];
  const firstAuthorId = authorsList[0]?.id || 'author-1';
  lines.push(`${indent}<authoring copyright="${escapeXmlV1(copyright || '')}">`);

  if (storedChangeLogs && storedChangeLogs.length > 0) {
    storedChangeLogs.forEach(log => {
      const hasCh = log.changes && log.changes.length > 0;
      if (hasCh) {
        lines.push(`${indent}  <changeLog id="${escapeXmlV1(log.id)}" changeDateTime="${escapeXmlV1(toIso8601DateTime(log.changeDateTime))}" changeSummary="${escapeXmlV1(log.changeSummary || '')}" changedBy="${escapeXmlV1(log.changedBy)}">`);
        log.changes.forEach(ch => {
          lines.push(`${indent}    <change changedElement="${escapeXmlV1(ch.changedElement)}" changedFrom="${escapeXmlV1(ch.changedFrom)}" />`);
        });
        lines.push(`${indent}  </changeLog>`);
      } else {
        lines.push(`${indent}  <changeLog id="${escapeXmlV1(log.id)}" changeDateTime="${escapeXmlV1(toIso8601DateTime(log.changeDateTime))}" changeSummary="${escapeXmlV1(log.changeSummary || '')}" changedBy="${escapeXmlV1(log.changedBy)}"/>`);
      }
    });
  } else {
    lines.push(`${indent}  <changeLog id="${ensureUUID(null)}" changeDateTime="${creationDate}" changeSummary="" changedBy="${firstAuthorId}"/>`);
  }

  if (authorsList.length > 0) {
    authorsList.forEach((a, i) => {
      const aid = a?.id || `author-${i + 1}`;
      const fn = a?.givenName || a?.firstName || (typeof a === 'string' ? a : '');
      const ln = a?.familyName || a?.lastName || '';
      const mn = a?.middleInitial || a?.middleName || '';
      const af = a?.affiliation || '';
      const ds = a?.uri || a?.emailAddress || '';
      lines.push(`${indent}  <author id="${escapeXmlV1(aid)}" digitalSignature="${escapeXmlV1(ds)}" firstName="${escapeXmlV1(fn)}" middleName="${escapeXmlV1(mn)}" lastName="${escapeXmlV1(ln)}" affiliation="${escapeXmlV1(af)}" />`);
    });
  } else {
    lines.push(`${indent}  <author id="author-1" digitalSignature="" firstName="IDMxPPM" middleName="" lastName="User" affiliation="" />`);
  }
  // Note: v1 format does NOT have <committee> — only <publisher>
  lines.push(`${indent}  <publisher name="" location="" />`);
  lines.push(`${indent}</authoring>`);
  return lines;
};

/** v1.0 informationUnit (recursive) */
const v1InformationUnit = (unit, indent) => {
  const lines = [];
  const hasDefinitionFigures = unit.definitionFigures && unit.definitionFigures.filter(f => f.filePath).length > 0;
  const hasExamples = unit.examples || (unit.exampleImages && unit.exampleImages.length > 0);
  const hasExternal = unit.correspondingExternalElements && unit.correspondingExternalElements.length > 0;
  const hasSubUnits = unit.subInformationUnits && unit.subInformationUnits.length > 0;
  const hasChildren = hasDefinitionFigures || hasExamples || hasExternal || hasSubUnits;

  if (hasChildren) {
    lines.push(`${indent}<informationUnit id="${escapeXmlV1(unit.id)}" name="${escapeXmlV1(unit.name || '')}" dataType="${escapeXmlV1(unit.dataType || 'String')}" isMandatory="${unit.isMandatory ? 'true' : 'false'}" definition="${escapeXmlV1(unit.definition || '')}">`);
    if (hasDefinitionFigures) {
      // Definition figures emitted as a <description> child (images only, no duplicate text)
      lines.push(...v1Description('', unit.definitionFigures, indent + '  '));
    }
    if (hasExamples) lines.push(...v1Examples(unit.examples || '', unit.exampleImages || [], indent + '  '));
    if (hasExternal) {
      unit.correspondingExternalElements.forEach(m => {
        const basis = m.basis === 'Other' && m.customBasis ? m.customBasis : m.basis;
        lines.push(`${indent}  <correspondingExternalElement basis="${escapeXmlV1(basis)}" name="${escapeXmlV1(m.name)}"/>`);
      });
    }
    if (hasSubUnits) {
      lines.push(`${indent}  <subInformationUnit>`);
      unit.subInformationUnits.forEach(sub => lines.push(v1InformationUnit(sub, indent + '    ')));
      lines.push(`${indent}  </subInformationUnit>`);
    }
    lines.push(`${indent}</informationUnit>`);
  } else {
    lines.push(`${indent}<informationUnit id="${escapeXmlV1(unit.id)}" name="${escapeXmlV1(unit.name || '')}" dataType="${escapeXmlV1(unit.dataType || 'String')}" isMandatory="${unit.isMandatory ? 'true' : 'false'}" definition="${escapeXmlV1(unit.definition || '')}"/>`);
  }
  return lines.join('\n');
};

/** v1.0 ER XML (recursive) */
const v1ErXml = (er, authorsList, creationDate, copyright, indent, isRoot = true) => {
  const lines = [];
  const erGuid = ensureUUID(er.guid);

  if (isRoot) lines.push(`${indent}<er>`);

  lines.push(`${indent}  <specId guid="${erGuid}" shortTitle="${escapeXmlV1(er.shortTitle || er.name || 'ER')}" fullTitle="${escapeXmlV1(er.fullTitle || er.name || 'Exchange Requirement')}" subTitle="${escapeXmlV1(er.subTitle || '')}" idmCode="${escapeXmlV1(er.idmCode || `ER-${er.id || Date.now()}`)}" localCode="${escapeXmlV1(er.localCode || '')}" documentStatus="${escapeXmlV1(er.documentStatus || 'WD')}" localDocumentStatus="${escapeXmlV1(er.localDocumentStatus || '')}" version="" />`);
  lines.push(...v1Authoring(null, authorsList, copyright, er.creationDate || creationDate, indent + '  ', er.changeLogs || null));

  // v1 element order: correspondingMvd → description → informationUnits → subERs
  // Always emit at least one correspondingMvd (empty if none stored)
  const evdsV1 = getCorrespondingEvds(er);
  if (evdsV1.length > 0) {
    evdsV1.forEach(m => lines.push(`${indent}  <correspondingMvd basis="${escapeXmlV1(m.basis)}" name="${escapeXmlV1(m.name)}"/>`));
  } else {
    lines.push(`${indent}  <correspondingMvd basis="" name="" />`);
  }

  if (er.description || (er.descriptionFigures && er.descriptionFigures.length > 0)) {
    lines.push(...v1Description(er.description || '', er.descriptionFigures || [], indent + '  '));
  }

  if (er.examples || (er.exampleImages && er.exampleImages.filter(f => f.filePath).length > 0)) {
    lines.push(...v1Examples(er.examples || '', er.exampleImages || [], indent + '  '));
  }

  if (er.informationUnits && er.informationUnits.length > 0) {
    er.informationUnits.forEach(u => lines.push(v1InformationUnit(u, indent + '  ')));
  }
  if (er.subERs && er.subERs.length > 0) {
    er.subERs.forEach(sub => {
      lines.push(`${indent}  <subEr>`);
      lines.push(`${indent}    <er>`);
      lines.push(v1ErXml(sub, authorsList, creationDate, copyright, indent + '    ', false));
      lines.push(`${indent}    </er>`);
      lines.push(`${indent}  </subEr>`);
    });
  }

  if (isRoot) lines.push(`${indent}</er>`);
  return lines.join('\n');
};

/**
 * Generate idmXSD v1.0 compliant XML document.
 * Key differences from v2.0:
 *   - No XML namespace on <idm>
 *   - Flat <author> attributes (id, firstName, middleName, lastName, etc.)
 *   - No <committee> inside <authoring>
 *   - <standardProjectPhase> instead of <standardProjectStage>
 *   - <localProjectPhase> instead of <localProjectStage>
 *   - Descriptions use <description><content>text</content></description>
 *   - Sub-IDMs via <subIdm><idm>...</idm></subIdm> (mirrors <subEr> pattern)
 */
export const generateIdmXmlV1 = ({ headerData, bpmnXml, bpmnSvg, erDataMap, erHierarchy, dataObjects = [], bpmnFilePath = 'Diagram/Diagram(1).bpmn', subIdms = [] }) => {
  const idmGuid = ensureUUID(headerData?.idmGuid);
  const ucGuid = ensureUUID(headerData?.ucGuid);
  const bcmGuid = ensureUUID(headerData?.bcmGuid);
  const pmId = headerData?.pmId || `PM-${Date.now()}`;

  const authorsArray = Array.isArray(headerData?.authors) ? headerData.authors :
    (headerData?.author ? [{ givenName: headerData.author }] : []);

  const title = headerData?.title || 'IDM Specification';
  const shortTitle = headerData?.shortTitle || title;
  const version = headerData?.version ?? ''; // preserve "" from original; new v1 projects default to empty
  const status = headerData?.status || 'WD';
  const language = headerData?.language || 'EN';
  const creationDate = headerData?.creationDate || formatDate();
  const copyright = headerData?.copyright || '';
  const idmCode = headerData?.idmCode || `IDM-${Date.now()}`;

  const lines = [];
  lines.push('<?xml version="1.0" encoding="utf-8"?>');

  // Emit stylesheet PI if stored from original import
  if (headerData?.stylesheetHref) {
    lines.push(`<?xml-stylesheet type="text/xsl" href="${headerData.stylesheetHref}"?>`);
  }

  // Emit <idm> root with optional xsi schema location
  if (headerData?.xsiSchemaLocation) {
    lines.push(`<idm xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="${escapeXmlV1(headerData.xsiSchemaLocation)}">`);
  } else {
    lines.push('<idm>');
  }

  const subTitle = headerData?.subTitle || '';

  // IDM specId (v1.0 includes subTitle, localCode, localDocumentStatus attributes)
  lines.push(`  <specId guid="${idmGuid}" shortTitle="${escapeXmlV1(shortTitle)}" fullTitle="${escapeXmlV1(title)}" subTitle="${escapeXmlV1(subTitle)}" idmCode="${escapeXmlV1(idmCode)}" localCode="" documentStatus="${escapeXmlV1(status)}" localDocumentStatus="" version="${escapeXmlV1(version)}" />`);

  // IDM authoring — pass stored changeLogs to preserve original change history
  const storedChangeLogs = Array.isArray(headerData?.changeLogs) && headerData.changeLogs.length > 0
    ? headerData.changeLogs : null;
  lines.push(...v1Authoring(headerData, authorsArray, copyright, creationDate, '  ', storedChangeLogs));

  // Use Case
  const ucShortTitle = headerData?.ucShortTitle || shortTitle;
  const ucIdmCode = headerData?.ucIdmCode || `UC-${idmCode.replace(/^IDM-/i, '')}`;
  const ucSubTitle = headerData?.ucSubTitle ?? subTitle;
  const ucDocumentStatus = headerData?.ucDocumentStatus || status;
  const ucVersion = headerData?.ucVersion ?? version;
  const ucLocalCode = headerData?.ucLocalCode || '';
  const ucLocalDocumentStatus = headerData?.ucLocalDocumentStatus || '';
  lines.push('  <uc>');
  lines.push(`    <specId guid="${ucGuid}" shortTitle="${escapeXmlV1(ucShortTitle)}" fullTitle="${escapeXmlV1(title)}" subTitle="${escapeXmlV1(ucSubTitle)}" idmCode="${escapeXmlV1(ucIdmCode)}" localCode="${escapeXmlV1(ucLocalCode)}" documentStatus="${escapeXmlV1(ucDocumentStatus)}" localDocumentStatus="${escapeXmlV1(ucLocalDocumentStatus)}" version="${escapeXmlV1(ucVersion)}" />`);
  lines.push(...v1Authoring(headerData, authorsArray, copyright, creationDate, '    ', headerData?.ucChangeLogs || null));

  // Summary
  lines.push('    <summary>');
  lines.push(...v1Description(headerData?.summary || title, headerData?.summaryFigures || [], '      '));
  lines.push('    </summary>');

  // Aim and Scope
  lines.push('    <aimAndScope>');
  lines.push(...v1Description(headerData?.aimAndScope || headerData?.objectives || 'Define exchange requirements for BIM processes', headerData?.aimAndScopeFigures || [], '      '));
  lines.push('    </aimAndScope>');

  lines.push(`    <language>${escapeXmlV1(language)}</language>`);

  // Use elements
  const uses = Array.isArray(headerData?.uses) && headerData.uses.length > 0
    ? headerData.uses
    : (Array.isArray(headerData?.useCategories) && headerData.useCategories.length > 0
      ? headerData.useCategories.map(cat => ({ verb: '', noun: '', name: cat }))
      : [{ name: 'Coordinate Design Model' }]);

  const useClassif = headerData?.useClassification;
  uses.forEach(use => {
    // Build the display name — handle {verb, noun}, {name}, or plain string
    let useName;
    if (typeof use === 'object') {
      useName = (use.verb || use.noun)
        ? [use.verb, use.noun].filter(Boolean).join(' ')
        : (use.name || '');
    } else {
      useName = String(use || '');
    }
    if (!useName) return;
    if (useClassif && useClassif.name) {
      lines.push(`    <use name="${escapeXmlV1(useName)}">`);
      lines.push(`      <classification name="${escapeXmlV1(useClassif.name)}" version="${escapeXmlV1(useClassif.version || '')}" publicationYear="${escapeXmlV1(useClassif.publicationYear || '')}"/>`);
      lines.push(`    </use>`);
    } else {
      lines.push(`    <use name="${escapeXmlV1(useName)}"/>`);
    }
  });

  // Standard Project Phases (v1.0 uses standardProjectPhase)
  const isoStages = Array.isArray(headerData?.projectStagesIso) && headerData.projectStagesIso.length > 0
    ? headerData.projectStagesIso
    : (Array.isArray(headerData?.projectStages) && headerData.projectStages.length > 0
      ? headerData.projectStages
      : []);

  const emittedStages = new Set();
  isoStages.forEach(stage => {
    if (!stage || emittedStages.has(stage)) return;
    emittedStages.add(stage);
    lines.push('    <standardProjectPhase>');
    lines.push(`      <name>${escapeXmlV1(stage)}</name>`);
    lines.push('    </standardProjectPhase>');
  });

  // Local project phases (AIA, RIBA)
  if (Array.isArray(headerData?.projectStagesAia) && headerData.projectStagesAia.length > 0) {
    headerData.projectStagesAia.forEach(stage => {
      lines.push('    <localProjectPhase>');
      lines.push(`      <name>${escapeXmlV1(stage)}</name>`);
      lines.push('      <classification name="AIA B101"/>');
      lines.push('    </localProjectPhase>');
    });
  }
  if (Array.isArray(headerData?.projectStagesRiba) && headerData.projectStagesRiba.length > 0) {
    headerData.projectStagesRiba.forEach(stage => {
      lines.push('    <localProjectPhase>');
      lines.push(`      <name>${escapeXmlV1(stage)}</name>`);
      lines.push('      <classification name="RIBA Plan of Work"/>');
      lines.push('    </localProjectPhase>');
    });
  }

  // Actors (v1.0: no actorType, classification has no id).
  // Use importedActorsList when present: this is the snapshot taken at import time,
  // which excludes actors auto-synced from BPMN pools after import. Preserves round-trip
  // fidelity with v1 files — actors the old tool wrote are the only ones re-emitted.
  const v1Actors = headerData?.importedActorsList !== undefined
    ? headerData.importedActorsList
    : (headerData?.actorsList || []);
  if (v1Actors.length > 0) {
    v1Actors.forEach((actor, i) => {
      const actorId = actor.id || `actor-${i + 1}`;
      const actorName = actor.name || 'Unnamed Actor';
      const hasChildren = actor.role || (actor.subActors && actor.subActors.length > 0);
      if (hasChildren) {
        lines.push(`    <actor id="${escapeXmlV1(actorId)}" name="${escapeXmlV1(actorName)}">`);
        if (actor.role) lines.push(`      <classification name="${escapeXmlV1(actor.role)}"/>`);
        if (actor.subActors) {
          actor.subActors.forEach((sub, si) => {
            lines.push(`      <subActor id="${escapeXmlV1(sub.id || `actor-${i + 1}-sub-${si + 1}`)}" name="${escapeXmlV1(sub.name || '')}"/>`);
          });
        }
        lines.push('    </actor>');
      } else {
        lines.push(`    <actor id="${escapeXmlV1(actorId)}" name="${escapeXmlV1(actorName)}"/>`);
      }
    });
  }

  // Benefits / Limitations
  if (headerData?.benefits) {
    lines.push('    <benefits>');
    lines.push(...v1Description(headerData.benefits, headerData.benefitsFigures || [], '      '));
    lines.push('    </benefits>');
  }
  if (headerData?.limitations) {
    lines.push('    <limitations>');
    lines.push(...v1Description(headerData.limitations, headerData.limitationsFigures || [], '      '));
    lines.push('    </limitations>');
  }

  lines.push('  </uc>');

  // Business Context Map
  const pmShortTitle = headerData?.pmShortTitle || shortTitle;
  const bcmShortTitle = headerData?.bcmShortTitle || pmShortTitle;
  const bcmIdmCode = headerData?.bcmIdmCode || (idmCode.replace(/^IDM-/i, 'BCM-') || `BCM-${idmCode}`);
  const bcmSubTitle = headerData?.bcmSubTitle ?? subTitle;
  const bcmDocumentStatus = headerData?.bcmDocumentStatus || status;
  const bcmVersion = headerData?.bcmVersion ?? version;
  const bcmLocalCode = headerData?.bcmLocalCode || '';
  const bcmLocalDocumentStatus = headerData?.bcmLocalDocumentStatus || '';
  lines.push('  <businessContextMap>');
  lines.push(`    <specId guid="${bcmGuid}" shortTitle="${escapeXmlV1(bcmShortTitle)}" fullTitle="${escapeXmlV1(title)}" subTitle="${escapeXmlV1(bcmSubTitle)}" idmCode="${escapeXmlV1(bcmIdmCode)}" localCode="${escapeXmlV1(bcmLocalCode)}" documentStatus="${escapeXmlV1(bcmDocumentStatus)}" localDocumentStatus="${escapeXmlV1(bcmLocalDocumentStatus)}" version="${escapeXmlV1(bcmVersion)}" />`);
  lines.push(...v1Authoring(headerData, authorsArray, copyright, creationDate, '    ', headerData?.bcmChangeLogs || null));

  lines.push('    <pm>');
  // v1.0: <diagram> references the BPMN file externally via filePath — no embedded content
  const pmDiagramName = headerData?.pmDiagramName || pmShortTitle;
  lines.push(`      <diagram id="${pmId}" name="${escapeXmlV1(pmDiagramName)}" filePath="${escapeXmlV1(bpmnFilePath)}" notation="" />`);

  // Use stored dataObjectAndErLinks (with original UUIDs) if available; otherwise build from dataObjects
  const doErEntries = headerData?.dataObjectAndErLinks ||
    (dataObjects || [])
      .filter(dataObj => erDataMap?.[dataObj.id])
      .map(dataObj => {
        const er = erDataMap[dataObj.id];
        return { id: null, doId: dataObj.id, erId: er.guid || er.id };
      });

  doErEntries.forEach(entry => {
    // v1.0 uses text content for associatedDataObject/associatedEr, NOT ref attributes
    lines.push(`      <dataObjectAndEr id="${ensureUUID(entry.id)}">`);
    lines.push(`        <associatedDataObject>${escapeXmlV1(entry.doId)}</associatedDataObject>`);
    lines.push(`        <associatedEr>${escapeXmlV1(entry.erId)}</associatedEr>`);
    lines.push('      </dataObjectAndEr>');
  });
  lines.push('    </pm>');
  lines.push('  </businessContextMap>');

  // Exchange Requirements
  if (erHierarchy && erHierarchy.length === 1) {
    // Single root ER — emit directly (preserves its own IUs and nested subERs)
    lines.push(v1ErXml(erHierarchy[0], authorsArray, creationDate, copyright, '  ', true));
  } else if (erHierarchy && erHierarchy.length > 1) {
    // Multiple top-level ERs — wrap in a synthetic root so none are silently dropped.
    // The first ER in the array is used as the root (its existing subERs are preserved).
    const [syntheticRoot, ...rest] = erHierarchy;
    const mergedRoot = {
      ...syntheticRoot,
      subERs: [...(syntheticRoot.subERs || []), ...rest]
    };
    lines.push(v1ErXml(mergedRoot, authorsArray, creationDate, copyright, '  ', true));
  } else if (erDataMap && Object.keys(erDataMap).length > 0) {
    // Fallback: wrap all ERs from legacy erDataMap under a synthetic root
    const allERs = Object.values(erDataMap).filter(Boolean);
    if (allERs.length > 0) {
      const rootGuid = ensureUUID(headerData?.rootErGuid);
      lines.push('  <er>');
      lines.push(`    <specId guid="${rootGuid}" shortTitle="${escapeXmlV1(shortTitle)}" fullTitle="${escapeXmlV1(title)}" subTitle="" idmCode="ER-ROOT" localCode="" documentStatus="${escapeXmlV1(status)}" localDocumentStatus="" version="" />`);
      lines.push(...v1Authoring(headerData, authorsArray, copyright, creationDate, '    '));
      allERs.forEach(er => {
        lines.push('    <subEr>');
        lines.push('      <er>');
        lines.push(v1ErXml(er, authorsArray, creationDate, copyright, '      ', false));
        lines.push('      </er>');
        lines.push('    </subEr>');
      });
      lines.push('  </er>');
    }
  }

  // Sub-IDMs: recursively generate and embed with <subIdm><idm>...</idm></subIdm>
  if (subIdms && subIdms.length > 0) {
    subIdms.forEach(sub => {
      const subResult = generateIdmXmlV1({
        headerData: sub.headerData,
        bpmnXml: null,
        erDataMap: sub.erDataMap || {},
        erHierarchy: sub.erHierarchy || [],
        dataObjects: sub.dataObjects || [],
        bpmnFilePath: sub.bpmnFilePath || bpmnFilePath,
        subIdms: sub.subIdms || []
      });
      // Strip the XML declaration + PI + root <idm> tag from the sub-output,
      // then indent every line and wrap in <subIdm>
      const subLines = subResult.xml.split('\n');
      const firstIdmLine = subLines.findIndex(l => /^<idm[\s>]/.test(l.trim()));
      const innerLines = firstIdmLine >= 0 ? subLines.slice(firstIdmLine) : subLines;
      lines.push('  <subIdm>');
      innerLines.forEach(l => lines.push('  ' + l));
      lines.push('  </subIdm>');
    });
  }

  lines.push('</idm>');

  return { xml: lines.join('\n'), guids: { idmGuid, ucGuid, bcmGuid, pmId, idmCode } };
};

export default {
  generateIdmXml,
  generateIdmXmlV1,
  generateErXmlStandalone
};
