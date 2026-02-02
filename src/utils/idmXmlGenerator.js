/**
 * idmXML Generator
 * Generates ISO 29481-3 (idmXSD 2.0) compliant XML
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
 * Generate XML for figures (images attached to sections)
 * @param {Array} figures - Array of figure objects with data, caption, type
 * @param {string} indent - Indentation string
 * @returns {string[]} Array of XML lines
 */
const generateFiguresXml = (figures, indent = '      ') => {
  const lines = [];
  if (!figures || !Array.isArray(figures) || figures.length === 0) {
    return lines;
  }

  figures.forEach(fig => {
    const caption = fig.caption || fig.name || 'Figure';
    const mimeType = fig.type || 'image/png';

    if (fig.data && fig.data.startsWith('data:')) {
      // Embed base64 data directly
      const base64Data = fig.data.split(',')[1] || '';
      lines.push(`${indent}<figure caption="${escapeXml(caption)}" mimeType="${escapeXml(mimeType)}" encoding="base64">`);
      lines.push(`${indent}  <![CDATA[${base64Data}]]>`);
      lines.push(`${indent}</figure>`);
    } else if (fig.filePath) {
      // Reference external file
      lines.push(`${indent}<figure caption="${escapeXml(caption)}" filePath="${escapeXml(fig.filePath)}"/>`);
    }
  });

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
 * Generate Information Unit XML
 */
const generateInformationUnitXml = (unit, indent = '      ') => {
  const lines = [];

  lines.push(`${indent}<informationUnit`);
  lines.push(`${indent}  id="${escapeXml(unit.id)}"`);
  lines.push(`${indent}  name="${escapeXml(unit.name || '')}"`);
  lines.push(`${indent}  dataType="${escapeXml(unit.dataType || 'String')}"`);
  lines.push(`${indent}  isMandatory="${unit.isMandatory ? 'true' : 'false'}"`);
  lines.push(`${indent}  definition="${escapeXml(unit.definition || '')}">`);

  // Examples
  if (unit.examples || (unit.exampleImages && unit.exampleImages.length > 0)) {
    lines.push(`${indent}  <examples>`);
    if (unit.examples) {
      lines.push(`${indent}    <description>${escapeXml(unit.examples)}</description>`);
    }
    if (unit.exampleImages && unit.exampleImages.length > 0) {
      unit.exampleImages.forEach(img => {
        const caption = img.caption || img.name || 'Image';
        const mimeType = img.type || 'image/png';

        // Embed base64 data directly if available (self-contained idmXML)
        if (img.data && img.data.startsWith('data:')) {
          // Extract base64 part from data URL (remove "data:image/png;base64," prefix)
          const base64Data = img.data.split(',')[1] || '';
          lines.push(`${indent}    <image caption="${escapeXml(caption)}" mimeType="${escapeXml(mimeType)}" encoding="base64">`);
          lines.push(`${indent}      <![CDATA[${base64Data}]]>`);
          lines.push(`${indent}    </image>`);
        } else if (img.filePath) {
          // Use filePath for bundle export (separate files)
          lines.push(`${indent}    <image caption="${escapeXml(caption)}" filePath="${escapeXml(img.filePath)}"/>`);
        } else {
          // Fallback to filename reference
          const filePath = img.name || 'image.png';
          lines.push(`${indent}    <image caption="${escapeXml(caption)}" filePath="${escapeXml(filePath)}"/>`);
        }
      });
    }
    lines.push(`${indent}  </examples>`);
  }

  // Corresponding External Elements
  if (unit.correspondingExternalElements && unit.correspondingExternalElements.length > 0) {
    unit.correspondingExternalElements.forEach(mapping => {
      // For "Other" schema, use customBasis if available
      const basis = mapping.basis === 'Other' && mapping.customBasis
        ? mapping.customBasis
        : mapping.basis;
      lines.push(`${indent}  <correspondingExternalElement basis="${escapeXml(basis)}" name="${escapeXml(mapping.name)}"/>`);
    });
  }

  // Sub Information Units (recursive)
  if (unit.subInformationUnits && unit.subInformationUnits.length > 0) {
    lines.push(`${indent}  <subInformationUnit>`);
    unit.subInformationUnits.forEach(subUnit => {
      lines.push(generateInformationUnitXml(subUnit, indent + '    '));
    });
    lines.push(`${indent}  </subInformationUnit>`);
  }

  lines.push(`${indent}</informationUnit>`);

  return lines.join('\n');
};

/**
 * Generate Exchange Requirement XML
 */
const generateErXml = (er, authorName, indent = '  ') => {
  const lines = [];
  const erGuid = generateUUID();

  lines.push(`${indent}<er>`);

  // specId
  lines.push(`${indent}  <specId`);
  lines.push(`${indent}    guid="${erGuid}"`);
  lines.push(`${indent}    shortTitle="${escapeXml(er.name || 'ER')}"`);
  lines.push(`${indent}    fullTitle="${escapeXml(er.name || 'Exchange Requirement')}"`);
  lines.push(`${indent}    idmCode="ER-${er.id || Date.now()}"`);
  lines.push(`${indent}    documentStatus="WD"/>`);

  // authoring
  lines.push(`${indent}  <authoring`);
  lines.push(`${indent}    author="${escapeXml(authorName)}"`);
  lines.push(`${indent}    creationDate="${formatDate()}"/>`);

  // description
  if (er.description) {
    lines.push(`${indent}  <description>${escapeXml(er.description)}</description>`);
  }

  // Information Units
  if (er.informationUnits && er.informationUnits.length > 0) {
    er.informationUnits.forEach(unit => {
      lines.push(generateInformationUnitXml(unit, indent + '  '));
    });
  }

  // Sub-ERs (recursive per ISO 29481-3)
  if (er.subERs && er.subERs.length > 0) {
    er.subERs.forEach(subER => {
      lines.push(`${indent}  <subEr>`);
      // Generate sub-ER content (nested ER structure)
      const subErGuid = generateUUID();
      lines.push(`${indent}    <specId`);
      lines.push(`${indent}      guid="${subErGuid}"`);
      lines.push(`${indent}      shortTitle="${escapeXml(subER.name || 'Sub-ER')}"`);
      lines.push(`${indent}      fullTitle="${escapeXml(subER.name || 'Sub Exchange Requirement')}"`);
      lines.push(`${indent}      idmCode="ER-${subER.id || Date.now()}"`);
      lines.push(`${indent}      documentStatus="WD"/>`);
      lines.push(`${indent}    <authoring`);
      lines.push(`${indent}      author="${escapeXml(authorName)}"`);
      lines.push(`${indent}      creationDate="${formatDate()}"/>`);
      if (subER.description) {
        lines.push(`${indent}    <description>${escapeXml(subER.description)}</description>`);
      }
      if (subER.informationUnits && subER.informationUnits.length > 0) {
        subER.informationUnits.forEach(unit => {
          lines.push(generateInformationUnitXml(unit, indent + '    '));
        });
      }
      lines.push(`${indent}  </subEr>`);
    });
  }

  lines.push(`${indent}</er>`);

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
 * @returns {string} idmXML content
 */
export const generateIdmXml = ({ headerData, bpmnXml, erDataMap, dataObjects = [] }) => {
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
  lines.push('<idm xmlns="https://standards.buildingsmart.org/IDM/idmXML/0.2">');

  // IDM specId - use separate shortTitle and fullTitle per idmXSD
  const idmCode = headerData?.idmCode || `IDM-${Date.now()}`;
  lines.push('  <specId');
  lines.push(`    guid="${idmGuid}"`);
  lines.push(`    shortTitle="${escapeXml(shortTitle)}"`);
  lines.push(`    fullTitle="${escapeXml(title)}"`);
  lines.push(`    idmCode="${escapeXml(idmCode)}"`);
  lines.push(`    documentStatus="${escapeXml(status)}"`);
  lines.push(`    version="${escapeXml(version)}"/>`);

  // IDM authoring - include all authors (now properly formatted)
  lines.push('  <authoring');
  lines.push(`    author="${escapeXml(author)}"`);
  lines.push(`    creationDate="${creationDate}">`);

  // Add detailed author information per ISO 29481-3
  if (authorsArray.length > 0) {
    authorsArray.forEach(authorObj => {
      if (authorObj && typeof authorObj === 'object') {
        if (authorObj.type === 'person') {
          lines.push('    <person');
          if (authorObj.givenName) lines.push(`      givenName="${escapeXml(authorObj.givenName)}"`);
          if (authorObj.familyName) lines.push(`      familyName="${escapeXml(authorObj.familyName)}"`);
          if (authorObj.uri) lines.push(`      uri="${escapeXml(authorObj.uri)}"`);
          lines.push('    >');
          if (authorObj.affiliation) {
            lines.push(`      <affiliation>${escapeXml(authorObj.affiliation)}</affiliation>`);
          }
          lines.push('    </person>');
        } else if (authorObj.type === 'organization') {
          lines.push('    <organization');
          if (authorObj.name) lines.push(`      name="${escapeXml(authorObj.name)}"`);
          if (authorObj.uri) lines.push(`      uri="${escapeXml(authorObj.uri)}"`);
          lines.push('    />');
        }
      }
    });
  }
  lines.push('  </authoring>');

  // Revision history (if any)
  if (headerData?.revisionHistory && headerData.revisionHistory.length > 0) {
    lines.push('  <revisionHistory>');
    headerData.revisionHistory.forEach(entry => {
      lines.push(`    <revision date="${escapeXml(entry.date)}" description="${escapeXml(entry.description)}"/>`);
    });
    lines.push('  </revisionHistory>');
  }

  // Use Case (uc)
  lines.push('  <uc>');

  // UC specId
  lines.push('    <specId');
  lines.push(`      guid="${ucGuid}"`);
  lines.push(`      shortTitle="${escapeXml(shortTitle)}"`);
  lines.push(`      fullTitle="${escapeXml(title)}"`);
  lines.push(`      idmCode="UC-${idmCode.replace('IDM-', '')}"`);
  lines.push(`      documentStatus="${escapeXml(status)}"/>`);

  // UC authoring
  lines.push('    <authoring');
  lines.push(`      author="${escapeXml(author)}"`);
  lines.push(`      creationDate="${creationDate}"/>`);

  // Summary (required per idmXSD) - with optional figures
  lines.push('    <summary>');
  lines.push(`      <description>${escapeXml(headerData?.summary || 'IDM Specification')}</description>`);
  if (headerData?.summaryFigures && headerData.summaryFigures.length > 0) {
    lines.push(...generateFiguresXml(headerData.summaryFigures, '      '));
  }
  lines.push('    </summary>');

  // Aim and Scope (required per idmXSD) - with optional figures
  const aimAndScopeContent = headerData?.aimAndScope || headerData?.objectives || 'Define exchange requirements for BIM processes';
  lines.push('    <aimAndScope>');
  lines.push(`      <description>${escapeXml(aimAndScopeContent)}</description>`);
  if (headerData?.aimAndScopeFigures && headerData.aimAndScopeFigures.length > 0) {
    lines.push(...generateFiguresXml(headerData.aimAndScopeFigures, '      '));
  }
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

  uses.forEach(use => {
    if (typeof use === 'object' && use.verb && use.noun) {
      lines.push(`    <use name="${escapeXml(use.verb)} ${escapeXml(use.noun)}"/>`);
    } else if (typeof use === 'string') {
      lines.push(`    <use name="${escapeXml(use)}"/>`);
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

  const validStages = ['inception', 'brief', 'design', 'production', 'handover', 'operation', 'end-of-life'];

  isoStages.forEach(stage => {
    const normalizedStage = validStages.includes(stage) ? stage : 'design';
    lines.push('    <standardProjectStage>');
    lines.push(`      <name>${normalizedStage}</name>`);
    lines.push('    </standardProjectStage>');
  });

  // Additional Project Stages - AIA B101 (US) - as userDefinedProjectStage
  if (Array.isArray(headerData?.projectStagesAia) && headerData.projectStagesAia.length > 0) {
    headerData.projectStagesAia.forEach(stage => {
      lines.push('    <userDefinedProjectStage>');
      lines.push(`      <name>${escapeXml(stage)}</name>`);
      lines.push('      <classification system="AIA B101" code="US"/>');
      lines.push('    </userDefinedProjectStage>');
    });
  }

  // Additional Project Stages - RIBA Plan of Work (UK) - as userDefinedProjectStage
  if (Array.isArray(headerData?.projectStagesRiba) && headerData.projectStagesRiba.length > 0) {
    headerData.projectStagesRiba.forEach(stage => {
      lines.push('    <userDefinedProjectStage>');
      lines.push(`      <name>${escapeXml(stage)}</name>`);
      lines.push('      <classification system="RIBA Plan of Work" code="UK"/>');
      lines.push('    </userDefinedProjectStage>');
    });
  }

  // Benefits (optional) - with optional figures
  if (headerData?.benefits || (headerData?.benefitsFigures && headerData.benefitsFigures.length > 0)) {
    lines.push('    <benefits>');
    if (headerData?.benefits) {
      lines.push(`      <description>${escapeXml(headerData.benefits)}</description>`);
    }
    if (headerData?.benefitsFigures && headerData.benefitsFigures.length > 0) {
      lines.push(...generateFiguresXml(headerData.benefitsFigures, '      '));
    }
    lines.push('    </benefits>');
  }

  // Limitations (optional) - with optional figures
  if (headerData?.limitations || (headerData?.limitationsFigures && headerData.limitationsFigures.length > 0)) {
    lines.push('    <limitations>');
    if (headerData?.limitations) {
      lines.push(`      <description>${escapeXml(headerData.limitations)}</description>`);
    }
    if (headerData?.limitationsFigures && headerData.limitationsFigures.length > 0) {
      lines.push(...generateFiguresXml(headerData.limitationsFigures, '      '));
    }
    lines.push('    </limitations>');
  }

  // Actors (per ISO 29481-3 - structured with id/name attributes)
  if (headerData?.actorsList && headerData.actorsList.length > 0) {
    headerData.actorsList.forEach(actor => {
      const actorId = actor.id || `actor-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const actorName = actor.name || 'Unnamed Actor';
      lines.push(`    <actor id="${escapeXml(actorId)}" name="${escapeXml(actorName)}">`);
      if (actor.role) {
        lines.push(`      <classification id="role" name="${escapeXml(actor.role)}"/>`);
      }
      lines.push('    </actor>');
    });
  } else if (headerData?.actors && typeof headerData.actors === 'string') {
    // Legacy support for text-only actors description
    lines.push('    <actor id="actor-legacy" name="Actors">');
    lines.push(`      <description>${escapeXml(headerData.actors)}</description>`);
    lines.push('    </actor>');
  }

  // Preconditions (per ISO 29481-1)
  if (headerData?.preconditions) {
    lines.push('    <preconditions>');
    lines.push(`      <description>${escapeXml(headerData.preconditions)}</description>`);
    lines.push('    </preconditions>');
  }

  // Postconditions (per ISO 29481-1)
  if (headerData?.postconditions) {
    lines.push('    <postconditions>');
    lines.push(`      <description>${escapeXml(headerData.postconditions)}</description>`);
    lines.push('    </postconditions>');
  }

  // Triggering Events (per ISO 29481-1)
  if (headerData?.triggeringEvents) {
    lines.push('    <triggeringEvents>');
    lines.push(`      <description>${escapeXml(headerData.triggeringEvents)}</description>`);
    lines.push('    </triggeringEvents>');
  }

  // Required Capabilities (per ISO 29481-1)
  if (headerData?.requiredCapabilities) {
    lines.push('    <requiredCapabilities>');
    lines.push(`      <description>${escapeXml(headerData.requiredCapabilities)}</description>`);
    lines.push('    </requiredCapabilities>');
  }

  // Compliance Criteria (per ISO 29481-1)
  if (headerData?.complianceCriteria) {
    lines.push('    <complianceCriteria>');
    lines.push(`      <description>${escapeXml(headerData.complianceCriteria)}</description>`);
    lines.push('    </complianceCriteria>');
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

  // BCM authoring
  lines.push('    <authoring');
  lines.push(`      author="${escapeXml(author)}"`);
  lines.push(`      creationDate="${formatDate()}"/>`);

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

  // Exchange Requirements
  if (erDataMap && Object.keys(erDataMap).length > 0) {
    Object.values(erDataMap).forEach(er => {
      lines.push(generateErXml(er, author));
    });
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
 * Generate standalone ER XML (for .erxml export)
 */
export const generateErXmlStandalone = (er, authorName = 'IDMxPPM User') => {
  const lines = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<er xmlns="https://standards.buildingsmart.org/IDM/idmXML/0.2">');

  const erGuid = generateUUID();

  // specId
  lines.push('  <specId');
  lines.push(`    guid="${erGuid}"`);
  lines.push(`    shortTitle="${escapeXml(er.name || 'ER')}"`);
  lines.push(`    fullTitle="${escapeXml(er.name || 'Exchange Requirement')}"`);
  lines.push(`    idmCode="ER-${er.id || Date.now()}"`);
  lines.push('    documentStatus="WD"/>');

  // authoring
  lines.push('  <authoring');
  lines.push(`    author="${escapeXml(authorName)}"`);
  lines.push(`    creationDate="${formatDate()}"/>`);

  // description
  if (er.description) {
    lines.push(`  <description>${escapeXml(er.description)}</description>`);
  }

  // Information Units
  if (er.informationUnits && er.informationUnits.length > 0) {
    er.informationUnits.forEach(unit => {
      lines.push(generateInformationUnitXml(unit, '  '));
    });
  }

  lines.push('</er>');

  return lines.join('\n');
};

export default {
  generateIdmXml,
  generateErXmlStandalone
};
