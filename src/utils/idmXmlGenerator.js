/**
 * idmXML Generator
 * Generates ISO 29481-3 compliant XML (supports idmXSD 1.0 and 2.0)
 *
 * Schema v2.0: https://standards.buildingsmart.org/IDM/idmXML/2.0
 * Schema v1.0: https://standards.buildingsmart.org/IDM/idmXML/0.2
 *
 * Key v2.0 differences from v1.0:
 * - Namespace: idmXML/2.0 (not idmXML/0.2)
 * - Uses standardProjectStage (not standardProjectPhase)
 * - Uses localProjectStage (not localProjectPhase)
 * - author element contains person/organization children
 * - changeLog under authoring (with id, changeDateTime, changeSummary, changedBy attributes)
 */

// Generate UUID
const generateUUID = () => {
  return crypto.randomUUID?.() ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
};

// Escape XML special characters
const escapeXml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
 * Per schema, image element has only caption and filePath attributes (no inline base64)
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
    // Per idmXSD V2, image requires filePath attribute
    // Generate synthetic path for base64 images (they should be bundled separately)
    const filePath = img.filePath || img.name || `images/figure_${index + 1}.png`;
    lines.push(`${indent}<image caption="${escapeXml(caption)}" filePath="${escapeXml(filePath)}"/>`);
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
const generateInformationUnitXml = (unit, indent = '      ') => {
  const lines = [];

  // Check if IU has children (definition figures, examples, external elements, or sub-units)
  const hasDefinitionFigures = unit.definitionFigures && unit.definitionFigures.length > 0;
  const hasExamples = unit.examples || (unit.exampleImages && unit.exampleImages.length > 0);
  const hasExternalElements = unit.correspondingExternalElements && unit.correspondingExternalElements.length > 0;
  const hasSubUnits = unit.subInformationUnits && unit.subInformationUnits.length > 0;
  const hasChildren = hasDefinitionFigures || hasExamples || hasExternalElements || hasSubUnits;

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
      unit.correspondingExternalElements.forEach(mapping => {
        // For "Other" schema, use customBasis if available
        const basis = mapping.basis === 'Other' && mapping.customBasis
          ? mapping.customBasis
          : mapping.basis;
        lines.push(`${indent}  <correspondingExternalElement basis="${escapeXml(basis)}" name="${escapeXml(mapping.name)}"/>`);
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
 * Generate Exchange Requirement XML (recursive for nested subERs)
 * Per ISO 29481-3 Clause 10: ER must have at least one informationUnit or subEr
 *
 * @param {Object} er - Exchange Requirement data
 * @param {string} authorName - Author name
 * @param {string} indent - Current indentation
 * @param {boolean} isRoot - Whether this is the root ER element (not wrapped in subEr)
 * @returns {string} ER XML content
 */
const generateErXml = (er, authorName, indent = '  ', isRoot = true) => {
  const lines = [];
  const erGuid = er.guid || generateUUID();

  if (isRoot) {
    lines.push(`${indent}<er>`);
  }

  // specId
  lines.push(`${indent}  <specId`);
  lines.push(`${indent}    guid="${erGuid}"`);
  lines.push(`${indent}    shortTitle="${escapeXml(er.name || er.shortTitle || 'ER')}"`);
  lines.push(`${indent}    fullTitle="${escapeXml(er.fullTitle || er.name || 'Exchange Requirement')}"`);
  lines.push(`${indent}    idmCode="${escapeXml(er.idmCode || `ER-${er.id || Date.now()}`)}"`);
  lines.push(`${indent}    documentStatus="${escapeXml(er.documentStatus || 'WD')}"/>`);

  // authoring per idmXSD v2.0
  const erCreationDate = er.creationDate || formatDate();
  lines.push(`${indent}  <authoring copyright="Copyright ${new Date().getFullYear()}">`);
  lines.push(`${indent}    <changeLog id="er-log-1" changeDateTime="${erCreationDate}T00:00:00" changeSummary="Initial creation" changedBy="author-1"/>`);
  lines.push(`${indent}    <author id="author-1">`);
  lines.push(`${indent}      <person firstName="${escapeXml(authorName)}"/>`);
  lines.push(`${indent}    </author>`);
  lines.push(`${indent}  </authoring>`);

  // constraint (optional)
  if (er.constraints && er.constraints.length > 0) {
    er.constraints.forEach((constraint, idx) => {
      lines.push(`${indent}  <constraint id="${escapeXml(constraint.id || `constraint-${idx + 1}`)}">`);
      if (constraint.description) {
        lines.push(`${indent}    <description title="${escapeXml(constraint.description)}"/>`);
      }
      lines.push(`${indent}  </constraint>`);
    });
  }

  // correspondingMvd (optional)
  if (er.correspondingMvd && er.correspondingMvd.length > 0) {
    er.correspondingMvd.forEach(mvd => {
      lines.push(`${indent}  <correspondingMvd basis="${escapeXml(mvd.basis)}" name="${escapeXml(mvd.name)}"/>`);
    });
  }

  // description (optional, per idmXSD V2 uses title attribute, with optional image children)
  if (er.description || (er.descriptionFigures && er.descriptionFigures.length > 0)) {
    lines.push(...generateDescriptionXml(er.description || '', er.descriptionFigures || [], indent + '  '));
  }

  // Per ISO 29481-3 Clause 10: ER must have at least one informationUnit OR subEr
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
      // Recursively generate sub-ER (pass isRoot=false since it's already wrapped in <subEr>)
      lines.push(`${indent}    <er>`);
      lines.push(generateErXml(subER, authorName, indent + '    ', false));
      lines.push(`${indent}    </er>`);
      lines.push(`${indent}  </subEr>`);
    });
  }

  // If ER has neither informationUnits nor subERs, add a placeholder informationUnit
  // per ISO 29481-3 Clause 10 requirement
  if (!hasInfoUnits && !hasSubERs) {
    lines.push(`${indent}  <informationUnit`);
    lines.push(`${indent}    id="iu-placeholder"`);
    lines.push(`${indent}    name="Placeholder"`);
    lines.push(`${indent}    dataType="String"`);
    lines.push(`${indent}    isMandatory="false"`);
    lines.push(`${indent}    definition="Placeholder information unit (ER requires at least one IU or subER per ISO 29481-3)"/>`);
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
  const rootErGuid = headerData?.rootErGuid || generateUUID();

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

/**
 * Generate full idmXML document
 *
 * @param {Object} params
 * @param {Object} params.headerData - IDM header/metadata
 * @param {string} params.bpmnXml - BPMN XML content
 * @param {Object} params.erDataMap - Map of dataObjectId to ER data
 * @param {Array} params.dataObjects - List of data objects from BPMN
 * @param {string} params.idmXsdVersion - idmXSD version ('1.0' or '2.0', default '2.0')
 * @returns {string} idmXML content
 */
export const generateIdmXml = ({ headerData, bpmnXml, erDataMap, erHierarchy, dataObjects = [], idmXsdVersion = '2.0' }) => {
  const isV1 = idmXsdVersion === '1.0';
  const namespace = isV1
    ? 'https://standards.buildingsmart.org/IDM/idmXML/0.2'
    : 'https://standards.buildingsmart.org/IDM/idmXML/2.0';
  // Use persistent GUIDs if available, otherwise generate new ones
  const idmGuid = headerData?.idmGuid || generateUUID();
  const ucGuid = headerData?.ucGuid || generateUUID();
  const bcmGuid = headerData?.bcmGuid || generateUUID();
  const pmId = headerData?.pmId || `PM-${Date.now()}`;

  // Handle authors array or legacy author string - FIX: properly format author objects
  const authorsArray = Array.isArray(headerData?.authors) ? headerData.authors :
    (headerData?.author ? [headerData.author] : []);
  const author = authorsArray.length > 0
    ? authorsArray.map(formatAuthor).filter(Boolean).join(', ')
    : 'IDMxPPM User';

  const title = headerData?.title || 'IDM Specification';
  const shortTitle = headerData?.shortTitle || title; // Separate shortTitle
  const version = headerData?.version || '1.0';
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
  lines.push(`    fullTitle="${escapeXml(title)}"`);
  lines.push(`    idmCode="${escapeXml(idmCode)}"`);
  lines.push(`    documentStatus="${escapeXml(status)}"`);
  lines.push(`    version="${escapeXml(version)}"/>`);

  // IDM authoring per idmXSD v2.0 - copyright attribute required, contains changeLog and author elements
  const copyright = headerData?.copyright || `Copyright ${new Date().getFullYear()}`;
  lines.push(`  <authoring copyright="${escapeXml(copyright)}">`);

  // changeLog elements (required per v2.0, at least one)
  // Per schema: id, changeDateTime, changeSummary, changedBy attributes required
  if (headerData?.changeLogs && headerData.changeLogs.length > 0) {
    headerData.changeLogs.forEach((log, index) => {
      const logId = log.id || `log-${index + 1}`;
      const changeDateTime = log.changeDateTime || `${creationDate}T00:00:00`;
      const changeSummary = log.changeSummary || 'Initial creation';
      const changedBy = log.changedBy || 'author-1';
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
      const changeDateTime = entry.date ? `${entry.date}T00:00:00` : `${creationDate}T00:00:00`;
      const changeSummary = entry.description || 'Modified';
      lines.push(`    <changeLog id="${escapeXml(logId)}" changeDateTime="${escapeXml(changeDateTime)}" changeSummary="${escapeXml(changeSummary)}" changedBy="author-1"/>`);
    });
  } else {
    // Default changeLog entry (required)
    lines.push(`    <changeLog id="log-1" changeDateTime="${creationDate}T00:00:00" changeSummary="Initial creation" changedBy="author-1"/>`);
  }

  // author elements per idmXSD v2.0 - id required, contains person or organization
  if (authorsArray.length > 0) {
    authorsArray.forEach((authorObj, index) => {
      const authorId = authorObj?.id || `author-${index + 1}`;
      if (authorObj && typeof authorObj === 'object') {
        lines.push(`    <author id="${escapeXml(authorId)}">`);
        if (authorObj.type === 'person') {
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
          if (authorObj.affiliation) {
            lines.push(`        affiliation="${escapeXml(authorObj.affiliation)}"`);
          }
          lines.push('      />');
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
        lines.push(`    <author id="author-${index + 1}">`);
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

  lines.push('  </authoring>');

  // Use Case (uc)
  lines.push('  <uc>');

  // UC specId
  lines.push('    <specId');
  lines.push(`      guid="${ucGuid}"`);
  lines.push(`      shortTitle="${escapeXml(shortTitle)}"`);
  lines.push(`      fullTitle="${escapeXml(title)}"`);
  lines.push(`      idmCode="UC-${idmCode.replace('IDM-', '')}"`);
  lines.push(`      documentStatus="${escapeXml(status)}"/>`);

  // UC authoring per idmXSD v2.0
  lines.push(`    <authoring copyright="${escapeXml(copyright)}">`);
  lines.push(`      <changeLog id="uc-log-1" changeDateTime="${creationDate}T00:00:00" changeSummary="Initial creation" changedBy="author-1"/>`);
  if (authorsArray.length > 0) {
    authorsArray.forEach((authorObj, index) => {
      const authorId = authorObj?.id || `author-${index + 1}`;
      if (authorObj && typeof authorObj === 'object') {
        lines.push(`      <author id="${escapeXml(authorId)}">`);
        if (authorObj.type === 'person') {
          lines.push(`        <person firstName="${escapeXml(authorObj.givenName || authorObj.firstName || '')}"`);
          if (authorObj.familyName || authorObj.lastName) {
            lines.push(`          lastName="${escapeXml(authorObj.familyName || authorObj.lastName)}"`);
          }
          if (authorObj.affiliation) {
            lines.push(`          affiliation="${escapeXml(authorObj.affiliation)}"`);
          }
          lines.push('        />');
        } else if (authorObj.type === 'organization') {
          lines.push(`        <organization name="${escapeXml(authorObj.name || '')}"/>`);
        }
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

  // Standard Project Stages (required per idmXSD, 1..*)
  // Use ISO 22263 stages from projectStagesIso, fall back to projectStages, then default
  const isoStages = Array.isArray(headerData?.projectStagesIso) && headerData.projectStagesIso.length > 0
    ? headerData.projectStagesIso
    : (Array.isArray(headerData?.projectStages) && headerData.projectStages.length > 0
      ? headerData.projectStages
      : ['design']); // Default required value

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

  // Use standardProjectPhase for v1.0, standardProjectStage for v2.0
  const stdStageElement = isV1 ? 'standardProjectPhase' : 'standardProjectStage';
  const localStageElement = isV1 ? 'localProjectPhase' : 'localProjectStage';

  isoStages.forEach(stage => {
    const normalizedStage = stageMapping[stage?.toLowerCase()] ||
                           (validStagesV2.includes(stage?.toLowerCase()) ? stage.toLowerCase() : 'design');
    lines.push(`    <${stdStageElement}>`);
    lines.push(`      <name>${normalizedStage}</name>`);
    lines.push(`    </${stdStageElement}>`);
  });

  // Additional Project Stages - AIA B101 (US)
  if (Array.isArray(headerData?.projectStagesAia) && headerData.projectStagesAia.length > 0) {
    headerData.projectStagesAia.forEach((stage, index) => {
      lines.push(`    <${localStageElement}>`);
      lines.push(`      <name>${escapeXml(stage)}</name>`);
      // classification requires id (required) and name (required) per idmXSD V2
      lines.push(`      <classification id="aia-stage-${index + 1}" name="AIA B101"/>`);
      lines.push(`    </${localStageElement}>`);
    });
  }

  // Additional Project Stages - RIBA Plan of Work (UK)
  if (Array.isArray(headerData?.projectStagesRiba) && headerData.projectStagesRiba.length > 0) {
    headerData.projectStagesRiba.forEach((stage, index) => {
      lines.push(`    <${localStageElement}>`);
      lines.push(`      <name>${escapeXml(stage)}</name>`);
      // classification requires id (required) and name (required) per idmXSD V2
      lines.push(`      <classification id="riba-stage-${index + 1}" name="RIBA Plan of Work"/>`);
      lines.push(`    </${localStageElement}>`);
    });
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

  // Actors (per idmXSD V2 - id and name required, actorType attribute, bpmnShapeName and subActor children)
  if (headerData?.actorsList && headerData.actorsList.length > 0) {
    headerData.actorsList.forEach((actor, index) => {
      const actorId = actor.id || `actor-${index + 1}`;
      const actorName = actor.name || 'Unnamed Actor';
      const actorType = actor.actorType || 'group'; // 'group' or 'individual' per IDM 2.0

      // Check if actor has children (bpmnShapeName, subActors, classification)
      const hasBpmnShape = actor.bpmnShapeName || actor.bpmnId;
      const hasSubActors = actor.subActors && actor.subActors.length > 0;
      const hasRole = actor.role;
      const hasChildren = hasBpmnShape || hasSubActors || hasRole;

      if (hasChildren) {
        lines.push(`    <actor id="${escapeXml(actorId)}" name="${escapeXml(actorName)}" actorType="${escapeXml(actorType)}">`);

        // bpmnShapeName (per idmXSD V2 - links to BPMN Pool/Participant)
        if (hasBpmnShape) {
          lines.push(`      <bpmnShapeName>${escapeXml(actor.bpmnShapeName || actor.bpmnId)}</bpmnShapeName>`);
        }

        // classification for role (per idmXSD V2 - id and name required)
        if (hasRole) {
          lines.push(`      <classification id="role-${index + 1}" name="${escapeXml(actor.role)}"/>`);
        }

        // subActor elements (per idmXSD V2 - for BPMN lanes within pool)
        if (hasSubActors) {
          actor.subActors.forEach((subActor, subIndex) => {
            const subActorId = subActor.id || `actor-${index + 1}-sub-${subIndex + 1}`;
            const subActorName = subActor.name || 'Unnamed Lane';
            const subActorHasBpmnShape = subActor.bpmnShapeName;

            if (subActorHasBpmnShape) {
              lines.push(`      <subActor>`);
              lines.push(`        <actor id="${escapeXml(subActorId)}" name="${escapeXml(subActorName)}" actorType="individual">`);
              lines.push(`          <bpmnShapeName>${escapeXml(subActor.bpmnShapeName)}</bpmnShapeName>`);
              lines.push(`        </actor>`);
              lines.push(`      </subActor>`);
            } else {
              lines.push(`      <subActor>`);
              lines.push(`        <actor id="${escapeXml(subActorId)}" name="${escapeXml(subActorName)}" actorType="individual"/>`);
              lines.push(`      </subActor>`);
            }
          });
        }

        lines.push('    </actor>');
      } else {
        lines.push(`    <actor id="${escapeXml(actorId)}" name="${escapeXml(actorName)}" actorType="${escapeXml(actorType)}"/>`);
      }
    });
  } else if (headerData?.actors && typeof headerData.actors === 'string') {
    // Legacy support - parse text-only actors into structured format
    const actorNames = headerData.actors.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    if (actorNames.length > 0) {
      actorNames.forEach((name, index) => {
        lines.push(`    <actor id="actor-${index + 1}" name="${escapeXml(name)}" actorType="group"/>`);
      });
    }
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
  lines.push(`      shortTitle="Process Map"`);
  lines.push(`      fullTitle="Business Context Map"`);
  lines.push(`      idmCode="BCM-${Date.now()}"`);
  lines.push(`      documentStatus="${escapeXml(status)}"/>`);

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
        lines.push(`        <associatedDataObject>${escapeXml(dataObj.id)}</associatedDataObject>`);
        lines.push(`        <associatedEr>${escapeXml(er.id)}</associatedEr>`);
        lines.push('      </dataObjectAndEr>');
      }
    });
  }

  lines.push('    </pm>');
  lines.push('  </businessContextMap>');

  // Exchange Requirements - per idmXSD V2, only 0..1 er at root level
  // Use erHierarchy directly when available (preserves root ER's own IUs)
  if (erHierarchy && erHierarchy.length > 0) {
    // Generate from the ER-first hierarchy (root ER with its IUs and subERs)
    lines.push(generateErXml(erHierarchy[0], author, '  ', true));
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
  lines.push('<er xmlns="https://standards.buildingsmart.org/IDM/idmXML/2.0">');

  const erGuid = er.guid || generateUUID();

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

  // description - per idmXSD V2, uses title attribute
  if (er.description) {
    lines.push(`  <description title="${escapeXml(er.description)}"/>`);
  }

  // Per ISO 29481-3 Clause 10: ER must have at least one informationUnit OR subEr
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
      lines.push(generateErXml(subER, authorName, '    ', false));
      lines.push('    </er>');
      lines.push('  </subEr>');
    });
  }

  // If ER has neither informationUnits nor subERs, add a placeholder
  if (!hasInfoUnits && !hasSubERs) {
    lines.push('  <informationUnit');
    lines.push('    id="iu-placeholder"');
    lines.push('    name="Placeholder"');
    lines.push('    dataType="String"');
    lines.push('    isMandatory="false"');
    lines.push('    definition="Placeholder information unit (ER requires at least one IU or subER per ISO 29481-3)"/>');
  }

  lines.push('</er>');

  return lines.join('\n');
};

export default {
  generateIdmXml,
  generateErXmlStandalone
};
