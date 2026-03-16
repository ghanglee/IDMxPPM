/**
 * IDS (Information Delivery Specification) Importer
 * Parses IDS XML (buildingSMART) and converts to IDM project data
 * Reference: https://github.com/buildingSMART/IDS
 * Schema: http://standards.buildingsmart.org/IDS/1.0/ids.xsd
 */

// Map IFC data type names to IDM data types
const IFC_DATA_TYPE_MAP = {
  'ifctext': 'String',
  'ifclabel': 'String',
  'ifcidentifier': 'String',
  'ifcdescription': 'String',
  'ifcinteger': 'Numeric',
  'ifccountmeasure': 'Numeric',
  'ifcreal': 'Numeric',
  'ifclengthmeasure': 'Numeric',
  'ifcareameasure': 'Numeric',
  'ifcvolumemeasure': 'Numeric',
  'ifcmassmeasure': 'Numeric',
  'ifcthermaltransmittancemeasure': 'Numeric',
  'ifcpositivelengthmeasure': 'Numeric',
  'ifcplaneanglemeasure': 'Numeric',
  'ifcforcemeasure': 'Numeric',
  'ifcpressuremeasure': 'Numeric',
  'ifcboolean': 'Boolean',
  'ifclogical': 'Boolean',
  'ifcdatetime': 'Date/Time',
  'ifcdate': 'Date/Time',
  'ifctime': 'Date/Time',
  'ifctimestamp': 'Date/Time',
};

// Map IFC version strings to IDM external element basis
const IFC_VERSION_MAP = {
  'IFC2X3': 'IFC 2x3',
  'IFC4': 'IFC 4x3 ADD2',
  'IFC4X3': 'IFC 4x3 ADD2',
  'IFC4X3_ADD2': 'IFC 4x3 ADD2',
  'IFC4X3_ADD1': 'IFC 4x3 ADD2',
};

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/**
 * Get text content of first child element with given localName
 */
function normalizeWS(str) {
  return str ? str.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim() : '';
}

function getChildText(parent, tagName) {
  if (!parent) return '';
  for (const child of parent.childNodes) {
    if (child.nodeType === 1 && child.localName === tagName) {
      return normalizeWS(child.textContent || '');
    }
  }
  return '';
}

/**
 * Get first child element with given localName
 */
function getChild(parent, tagName) {
  if (!parent) return null;
  for (const child of parent.childNodes) {
    if (child.nodeType === 1 && child.localName === tagName) {
      return child;
    }
  }
  return null;
}

/**
 * Get all child elements with given localName
 */
function getChildren(parent, tagName) {
  if (!parent) return [];
  const result = [];
  for (const child of parent.childNodes) {
    if (child.nodeType === 1 && child.localName === tagName) {
      result.push(child);
    }
  }
  return result;
}

/**
 * Extract value from an IDS value element.
 * Returns { type, value, description } where type is 'simple', 'pattern', 'enumeration', 'range'
 */
function extractValue(valueEl) {
  if (!valueEl) return null;

  // Simple value: <ids:simpleValue>...</ids:simpleValue>
  const simpleVal = getChildText(valueEl, 'simpleValue');
  if (simpleVal) {
    return { type: 'simple', value: simpleVal, description: '' };
  }

  // xs:restriction patterns
  const restrictionEl = getChild(valueEl, 'restriction');
  if (restrictionEl) {
    const base = restrictionEl.getAttribute('base') || '';
    const parts = [];
    let description = '';

    // xs:annotation > xs:documentation
    const annotationEl = getChild(restrictionEl, 'annotation');
    if (annotationEl) {
      description = getChildText(annotationEl, 'documentation') || '';
    }

    // xs:pattern
    const patternEl = getChild(restrictionEl, 'pattern');
    if (patternEl) {
      const patternValue = patternEl.getAttribute('value') || '';
      return { type: 'pattern', value: `Pattern: ${patternValue}`, description };
    }

    // xs:enumeration
    const enumerations = getChildren(restrictionEl, 'enumeration');
    if (enumerations.length > 0) {
      const values = enumerations.map(e => e.getAttribute('value') || '').filter(Boolean);
      return { type: 'enumeration', value: values.join(', '), description };
    }

    // xs:minExclusive, xs:maxExclusive, xs:minInclusive, xs:maxInclusive
    const minExcl = getChild(restrictionEl, 'minExclusive');
    const maxExcl = getChild(restrictionEl, 'maxExclusive');
    const minIncl = getChild(restrictionEl, 'minInclusive');
    const maxIncl = getChild(restrictionEl, 'maxInclusive');
    if (minExcl || maxExcl || minIncl || maxIncl) {
      if (minExcl) parts.push(`> ${minExcl.getAttribute('value')}`);
      if (minIncl) parts.push(`>= ${minIncl.getAttribute('value')}`);
      if (maxExcl) parts.push(`< ${maxExcl.getAttribute('value')}`);
      if (maxIncl) parts.push(`<= ${maxIncl.getAttribute('value')}`);
      return { type: 'range', value: parts.join(' and '), description };
    }

    return { type: 'restriction', value: `Restriction (base: ${base})`, description };
  }

  return null;
}

/**
 * Map IFC data type string to IDM data type
 */
function mapDataType(ifcDataType) {
  if (!ifcDataType) return 'String';
  const lower = ifcDataType.toLowerCase().trim();
  return IFC_DATA_TYPE_MAP[lower] || 'String';
}

/**
 * Map IFC version string to IDM external element basis
 */
function mapIfcVersion(ifcVersion) {
  if (!ifcVersion) return 'IFC 4x3 ADD2';
  // IDS can have multiple versions like "IFC2X3 IFC4"
  const versions = ifcVersion.trim().split(/\s+/);
  // Use the latest/highest version
  for (const v of versions.reverse()) {
    if (IFC_VERSION_MAP[v]) return IFC_VERSION_MAP[v];
  }
  return 'IFC 4x3 ADD2';
}

/**
 * Convert IFC entity name to proper case: IFCWALL → IfcWall
 */
function normalizeEntityName(name) {
  if (!name) return '';
  // Handle regex patterns like "IFCWALL|IFCWALLSTANDARDCASE"
  if (name.includes('|') || name.includes('.*') || name.includes('[')) {
    return name; // Keep patterns as-is
  }
  if (name.startsWith('IFC') || name.startsWith('ifc')) {
    // IFCWALL → IfcWall, IFCDOOR → IfcDoor
    return 'Ifc' + name.substring(3).toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase())
      .replace(/standardcase/i, 'StandardCase')
      .replace(/elementassembly/i, 'ElementAssembly');
  }
  return name;
}

/**
 * Parse an IDS XML file and convert to IDM project data
 */
export function parseIdsXml(content) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid XML: ' + parseError.textContent);
  }

  const root = doc.documentElement;

  // Parse info section
  const infoEl = getChild(root, 'info');
  const title = getChildText(infoEl, 'title') || 'IDS Import';
  const description = getChildText(infoEl, 'description') || '';
  const copyright = getChildText(infoEl, 'copyright') || '';
  const date = getChildText(infoEl, 'date') || '';
  const milestone = getChildText(infoEl, 'milestone') || '';
  const author = getChildText(infoEl, 'author') || '';

  // Parse specifications
  const specificationsEl = getChild(root, 'specifications');
  const specifications = specificationsEl ? getChildren(specificationsEl, 'specification') : [];

  const rootInformationUnits = [];
  let totalIUs = 0;

  for (const specEl of specifications) {
    const specName = specEl.getAttribute('name') || 'Unnamed Specification';
    const specDesc = specEl.getAttribute('description') || specEl.getAttribute('instructions') || '';
    const ifcVersion = specEl.getAttribute('ifcVersion') || '';
    const basis = mapIfcVersion(ifcVersion);

    // Parse applicability to get entity type
    const applicabilityEl = getChild(specEl, 'applicability');
    let entityName = '';
    let entityDescription = '';
    const applicabilityDetails = [];

    if (applicabilityEl) {
      // Entity
      const entityEl = getChild(applicabilityEl, 'entity');
      if (entityEl) {
        const nameEl = getChild(entityEl, 'name');
        if (nameEl) {
          const simpleVal = getChildText(nameEl, 'simpleValue');
          if (simpleVal) {
            entityName = normalizeEntityName(simpleVal);
          } else {
            // May be a restriction (pattern)
            const restrictionEl = getChild(nameEl, 'restriction');
            if (restrictionEl) {
              const patternEl = getChild(restrictionEl, 'pattern');
              if (patternEl) {
                entityName = patternEl.getAttribute('value') || 'Multiple Entities';
              }
            }
          }
        }
        // Predefined type
        const predefinedTypeEl = getChild(entityEl, 'predefinedType');
        if (predefinedTypeEl) {
          const ptVal = getChildText(predefinedTypeEl, 'simpleValue');
          if (ptVal) {
            applicabilityDetails.push(`PredefinedType: ${ptVal}`);
          }
        }
      }

      // Material applicability
      const materialEls = getChildren(applicabilityEl, 'material');
      for (const matEl of materialEls) {
        const matValue = extractValue(getChild(matEl, 'value'));
        if (matValue) {
          applicabilityDetails.push(`Material: ${matValue.value}`);
        }
      }

      // Classification applicability
      const classEls = getChildren(applicabilityEl, 'classification');
      for (const classEl of classEls) {
        const classValue = extractValue(getChild(classEl, 'value'));
        const classSystem = getChildText(getChild(classEl, 'system'), 'simpleValue') || getChildText(classEl, 'system');
        if (classValue) {
          applicabilityDetails.push(`Classification (${classSystem || 'Unknown'}): ${classValue.value}`);
        }
      }

      // Property applicability
      const propApplicabilityEls = getChildren(applicabilityEl, 'property');
      for (const propEl of propApplicabilityEls) {
        const psetName = getChildText(getChild(propEl, 'propertySet'), 'simpleValue');
        const baseName = getChildText(getChild(propEl, 'baseName'), 'simpleValue');
        const propValue = extractValue(getChild(propEl, 'value'));
        if (psetName && baseName) {
          const detail = propValue ? `${psetName}.${baseName} = ${propValue.value}` : `${psetName}.${baseName}`;
          applicabilityDetails.push(`Applies when: ${detail}`);
        }
      }
    }

    // Build description for the parent IU
    const descParts = [];
    if (specDesc) descParts.push(specDesc);
    if (entityName) descParts.push(`Applies to: ${entityName}`);
    if (ifcVersion) descParts.push(`IFC Version: ${ifcVersion}`);
    if (applicabilityDetails.length > 0) {
      descParts.push('Applicability: ' + applicabilityDetails.join('; '));
    }

    // Parse requirements into sub-Information Units
    const requirementsEl = getChild(specEl, 'requirements');
    const subInformationUnits = [];

    if (requirementsEl) {
      // Property requirements → sub-IUs
      const propertyEls = getChildren(requirementsEl, 'property');
      for (const propEl of propertyEls) {
        const iu = parsePropertyRequirement(propEl, entityName, basis);
        if (iu) {
          subInformationUnits.push(iu);
          totalIUs++;
        }
      }

      // Attribute requirements → sub-IUs
      const attributeEls = getChildren(requirementsEl, 'attribute');
      for (const attrEl of attributeEls) {
        const iu = parseAttributeRequirement(attrEl, entityName, basis);
        if (iu) {
          subInformationUnits.push(iu);
          totalIUs++;
        }
      }

      // Classification requirements → sub-IUs
      const classificationEls = getChildren(requirementsEl, 'classification');
      for (const classEl of classificationEls) {
        const iu = parseClassificationRequirement(classEl, entityName, basis);
        if (iu) {
          subInformationUnits.push(iu);
          totalIUs++;
        }
      }

      // Material requirements → sub-IUs
      const materialEls = getChildren(requirementsEl, 'material');
      for (const matEl of materialEls) {
        const iu = parseMaterialRequirement(matEl, entityName, basis);
        if (iu) {
          subInformationUnits.push(iu);
          totalIUs++;
        }
      }

      // PartOf requirements → sub-IUs
      const partOfEls = getChildren(requirementsEl, 'partOf');
      for (const partOfEl of partOfEls) {
        const iu = parsePartOfRequirement(partOfEl, entityName, basis);
        if (iu) {
          subInformationUnits.push(iu);
          totalIUs++;
        }
      }
    }

    // Create a parent IU with dataType "Structured" for each IDS specification
    rootInformationUnits.push({
      id: generateUUID(),
      name: entityName || specName,
      dataType: 'Structured',
      isMandatory: true,
      definition: descParts.join('\n'),
      examples: '',
      constraints: '',
      correspondingExternalElements: entityName ? [{
        id: generateUUID(),
        basis,
        name: entityName,
        description: '',
      }] : [],
      subInformationUnits,
    });
  }

  // Build root ER
  const rootER = {
    id: generateUUID(),
    name: `er_${title}`,
    description: description || `Imported from IDS: ${title}`,
    informationUnits: rootInformationUnits,
    subERs: [],
  };

  // Build header data
  const headerData = {
    title: title || description || '',
    fullTitle: title || description || '',
    shortTitle: title || description || '',
    status: 'WD',
    version: '1.0',
    idmGuid: generateUUID(),
    ucGuid: generateUUID(),
    bcmGuid: generateUUID(),
    copyright: '',
    language: 'EN',
    aimAndScope: description || title || '',
    aimScope: description || title || '',
    use: '',
    summary: description || title || '',
    authors: [],
    actorsList: [],
  };

  // Add copyright holder as author (IDS <copyright> is typically an organization name)
  if (copyright) {
    headerData.authors.push({
      id: generateUUID(),
      type: 'organization',
      organizationName: copyright,
      organizationUri: '',
    });
  }

  // Add author if present
  if (author) {
    headerData.authors.push({
      id: generateUUID(),
      type: 'person',
      givenName: author,
      familyName: '',
      uri: '',
      affiliation: copyright || '',
    });
  }

  // Creation date
  if (date) {
    headerData.creationDate = date;
  }

  // Parse milestone into target phases
  if (milestone) {
    const phases = milestone.toLowerCase();
    const iso22263 = {};
    const phaseMap = {
      'inception': 'inception',
      'brief': 'brief',
      'design': 'design',
      'preliminary': 'design',
      'detailed design': 'design',
      'production': 'production',
      'construction': 'production',
      'handover': 'handover',
      'operation': 'operation',
      'maintenance': 'operation',
      'end-of-life': 'endOfLife',
      'demolition': 'endOfLife',
      'manufact': 'production',
    };
    for (const [keyword, phase] of Object.entries(phaseMap)) {
      if (phases.includes(keyword)) {
        iso22263[phase] = true;
      }
    }
    if (Object.keys(iso22263).length > 0) {
      headerData.targetPhases = { iso22263 };
    }
  }

  return {
    headerData,
    erHierarchy: [rootER],
    bpmnXml: null,
    totalSpecifications: rootInformationUnits.length,
    totalIUs,
  };
}

/**
 * Parse a <property> requirement into an Information Unit
 */
function parsePropertyRequirement(propEl, entityName, basis) {
  const psetEl = getChild(propEl, 'propertySet');
  const baseNameEl = getChild(propEl, 'baseName');
  const valueEl = getChild(propEl, 'value');
  const dataType = propEl.getAttribute('dataType') || '';
  const uri = propEl.getAttribute('uri') || '';

  const psetName = psetEl ? getChildText(psetEl, 'simpleValue') : '';
  const baseName = baseNameEl ? getChildText(baseNameEl, 'simpleValue') : '';

  if (!baseName && !psetName) return null;

  const iuName = baseName || psetName;
  const mappingName = psetName ? `${psetName}.${baseName}` : (entityName || baseName);

  // Build constraints from value restrictions
  let constraints = '';
  let examples = '';
  if (valueEl) {
    const valueInfo = extractValue(valueEl);
    if (valueInfo) {
      if (valueInfo.type === 'simple') {
        examples = valueInfo.value;
      } else if (valueInfo.type === 'enumeration') {
        constraints = `Allowed values: ${valueInfo.value}`;
      } else if (valueInfo.type === 'pattern') {
        constraints = valueInfo.value;
      } else if (valueInfo.type === 'range') {
        constraints = `Range: ${valueInfo.value}`;
      } else {
        constraints = valueInfo.value;
      }
      if (valueInfo.description) {
        constraints = constraints ? `${constraints}\n${valueInfo.description}` : valueInfo.description;
      }
    }
  }

  const mappings = [{
    id: generateUUID(),
    basis,
    name: mappingName,
    description: uri || '',
  }];

  return {
    id: generateUUID(),
    name: iuName,
    dataType: mapDataType(dataType),
    isMandatory: true,
    definition: dataType ? `IFC Data Type: ${dataType}` : '',
    examples,
    constraints,
    correspondingExternalElements: mappings,
    subInformationUnits: [],
  };
}

/**
 * Parse an <attribute> requirement into an Information Unit
 */
function parseAttributeRequirement(attrEl, entityName, basis) {
  const nameEl = getChild(attrEl, 'name');
  const valueEl = getChild(attrEl, 'value');

  const attrName = nameEl ? getChildText(nameEl, 'simpleValue') : '';
  if (!attrName) return null;

  let constraints = '';
  let examples = '';
  if (valueEl) {
    const valueInfo = extractValue(valueEl);
    if (valueInfo) {
      if (valueInfo.type === 'simple') {
        examples = valueInfo.value;
      } else if (valueInfo.type === 'enumeration') {
        constraints = `Allowed values: ${valueInfo.value}`;
      } else if (valueInfo.type === 'pattern') {
        constraints = valueInfo.value;
      } else if (valueInfo.type === 'range') {
        constraints = `Range: ${valueInfo.value}`;
      }
      if (valueInfo.description) {
        constraints = constraints ? `${constraints}\n${valueInfo.description}` : valueInfo.description;
      }
    }
  }

  const mappings = [{
    id: generateUUID(),
    basis,
    name: entityName ? `${entityName}.${attrName}` : attrName,
    description: `IFC Attribute`,
  }];

  return {
    id: generateUUID(),
    name: attrName,
    dataType: 'String',
    isMandatory: true,
    definition: `IFC attribute of ${entityName || 'entity'}`,
    examples,
    constraints,
    correspondingExternalElements: mappings,
    subInformationUnits: [],
  };
}

/**
 * Parse a <classification> requirement into an Information Unit
 */
function parseClassificationRequirement(classEl, entityName, basis) {
  const valueEl = getChild(classEl, 'value');
  const systemEl = getChild(classEl, 'system');

  const system = systemEl ? getChildText(systemEl, 'simpleValue') : 'Unknown';
  let constraints = '';
  let examples = '';

  if (valueEl) {
    const valueInfo = extractValue(valueEl);
    if (valueInfo) {
      if (valueInfo.type === 'simple') {
        examples = valueInfo.value;
      } else if (valueInfo.type === 'enumeration') {
        constraints = `Allowed values: ${valueInfo.value}`;
      } else if (valueInfo.type === 'pattern') {
        constraints = valueInfo.value;
      }
      if (valueInfo.description) {
        constraints = constraints ? `${constraints}\n${valueInfo.description}` : valueInfo.description;
      }
    }
  }

  return {
    id: generateUUID(),
    name: `Classification (${system})`,
    dataType: 'String',
    isMandatory: true,
    definition: `Classification reference in ${system} system`,
    examples,
    constraints,
    correspondingExternalElements: [{
      id: generateUUID(),
      basis: 'Other',
      name: system,
      description: `Classification system: ${system}`,
    }],
    subInformationUnits: [],
  };
}

/**
 * Parse a <material> requirement into an Information Unit
 */
function parseMaterialRequirement(matEl, entityName, basis) {
  const valueEl = getChild(matEl, 'value');
  let constraints = '';
  let examples = '';

  if (valueEl) {
    const valueInfo = extractValue(valueEl);
    if (valueInfo) {
      if (valueInfo.type === 'simple') {
        examples = valueInfo.value;
      } else if (valueInfo.type === 'pattern') {
        constraints = valueInfo.value;
      } else if (valueInfo.type === 'enumeration') {
        constraints = `Allowed values: ${valueInfo.value}`;
      }
      if (valueInfo.description) {
        constraints = constraints ? `${constraints}\n${valueInfo.description}` : valueInfo.description;
      }
    }
  }

  return {
    id: generateUUID(),
    name: 'Material',
    dataType: 'String',
    isMandatory: true,
    definition: `Material requirement for ${entityName || 'entity'}`,
    examples,
    constraints,
    correspondingExternalElements: [{
      id: generateUUID(),
      basis,
      name: entityName ? `${entityName}.Material` : 'Material',
      description: 'IFC Material association',
    }],
    subInformationUnits: [],
  };
}

/**
 * Parse a <partOf> requirement into an Information Unit
 */
function parsePartOfRequirement(partOfEl, entityName, basis) {
  const relation = partOfEl.getAttribute('relation') || '';
  const entityEl = getChild(partOfEl, 'entity');
  let parentEntityName = '';
  let parentPredefinedType = '';

  if (entityEl) {
    const nameEl = getChild(entityEl, 'name');
    parentEntityName = nameEl ? normalizeEntityName(getChildText(nameEl, 'simpleValue')) : '';
    const predefinedTypeEl = getChild(entityEl, 'predefinedType');
    parentPredefinedType = predefinedTypeEl ? getChildText(predefinedTypeEl, 'simpleValue') : '';
  }

  const defParts = [`Must be part of ${parentEntityName || 'parent entity'}`];
  if (relation) defParts.push(`Relation: ${normalizeEntityName(relation)}`);
  if (parentPredefinedType) defParts.push(`PredefinedType: ${parentPredefinedType}`);

  return {
    id: generateUUID(),
    name: `PartOf (${parentEntityName || relation})`,
    dataType: 'String',
    isMandatory: true,
    definition: defParts.join('\n'),
    examples: '',
    constraints: '',
    correspondingExternalElements: [{
      id: generateUUID(),
      basis,
      name: parentEntityName || relation,
      description: `IFC relationship: ${relation}`,
    }],
    subInformationUnits: [],
  };
}

/**
 * Detect if XML content is an IDS file
 */
export function isIdsXml(content) {
  return content.includes('<ids:') || content.includes('buildingsmart.org/IDS');
}
