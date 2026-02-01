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
        lines.push(`${indent}    <image caption="${escapeXml(img.name)}" filePath="${escapeXml(img.name)}"/>`);
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
  const idmGuid = generateUUID();
  const ucGuid = generateUUID();
  const bcmGuid = generateUUID();
  const pmId = `PM-${Date.now()}`;

  // Handle authors array or legacy author string
  const authorsArray = Array.isArray(headerData?.authors) ? headerData.authors :
    (headerData?.author ? [headerData.author] : ['IDMxPPM User']);
  const author = authorsArray.join(', ');

  const title = headerData?.title || 'IDM Specification';
  const version = headerData?.version || '1.0';
  const status = headerData?.status || 'WD';
  const language = headerData?.language || 'EN';
  const creationDate = headerData?.creationDate || formatDate();

  const lines = [];

  // XML Declaration
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<idm xmlns="https://standards.buildingsmart.org/IDM/idmXML/0.2">');

  // IDM specId
  lines.push('  <specId');
  lines.push(`    guid="${idmGuid}"`);
  lines.push(`    shortTitle="${escapeXml(title)}"`);
  lines.push(`    fullTitle="${escapeXml(title)}"`);
  lines.push(`    idmCode="IDM-${Date.now()}"`);
  lines.push(`    documentStatus="${escapeXml(status)}"`);
  lines.push(`    version="${escapeXml(version)}"/>`);

  // IDM authoring - include all authors
  lines.push('  <authoring');
  lines.push(`    author="${escapeXml(author)}"`);
  lines.push(`    creationDate="${creationDate}"/>`);

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
  lines.push(`      shortTitle="${escapeXml(title)}"`);
  lines.push(`      fullTitle="${escapeXml(title)}"`);
  lines.push(`      idmCode="UC-${Date.now()}"`);
  lines.push(`      documentStatus="${escapeXml(status)}"/>`);

  // UC authoring
  lines.push('    <authoring');
  lines.push(`      author="${escapeXml(author)}"`);
  lines.push(`      creationDate="${creationDate}"/>`);

  // Summary
  lines.push('    <summary>');
  lines.push(`      <description>${escapeXml(headerData?.summary || 'IDM Specification')}</description>`);
  lines.push('    </summary>');

  // Aim and Scope
  lines.push('    <aimAndScope>');
  lines.push(`      <description>${escapeXml(headerData?.objectives || 'Define exchange requirements for BIM processes')}</description>`);
  lines.push('    </aimAndScope>');

  // Language
  lines.push(`    <language>${escapeXml(language)}</language>`);

  // Use Categories (can have multiple)
  const useCategories = Array.isArray(headerData?.useCategories) ? headerData.useCategories :
    (headerData?.useCategory ? [headerData.useCategory] : ['coordination']);
  useCategories.forEach(cat => {
    lines.push(`    <use name="${escapeXml(cat)}"/>`);
  });

  // Region (required)
  const region = headerData?.region || 'international';
  lines.push(`    <region value="${escapeXml(region)}">`);
  lines.push('      <type>USR</type>');
  lines.push('    </region>');

  // Standard Project Stages (can have multiple)
  const projectStages = Array.isArray(headerData?.projectStages) ? headerData.projectStages :
    (headerData?.projectStage ? [headerData.projectStage] : ['design']);
  const validStages = ['inception', 'brief', 'design', 'production', 'handover', 'operation', 'end-of-life'];

  projectStages.forEach(stage => {
    const normalizedStage = validStages.includes(stage) ? stage : 'design';
    lines.push('    <standardProjectStage>');
    lines.push(`      <name>${normalizedStage}</name>`);
    lines.push('    </standardProjectStage>');
  });

  // Benefits (optional)
  if (headerData?.benefits) {
    lines.push('    <benefits>');
    lines.push(`      <description>${escapeXml(headerData.benefits)}</description>`);
    lines.push('    </benefits>');
  }

  // Limitations (optional)
  if (headerData?.limitations) {
    lines.push('    <limitations>');
    lines.push(`      <description>${escapeXml(headerData.limitations)}</description>`);
    lines.push('    </limitations>');
  }

  // Actors (per ISO 29481-1)
  if (headerData?.actors) {
    lines.push('    <actors>');
    lines.push(`      <description>${escapeXml(headerData.actors)}</description>`);
    lines.push('    </actors>');
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

  return lines.join('\n');
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
