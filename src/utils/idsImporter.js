/**
 * IDS v1.0 Importer
 * Parses IDS XML (buildingSMART) and converts to IDM project data.
 * Compliant with the IDS v1.0 schema (ids.xsd).
 *
 * Reference: https://github.com/buildingSMART/IDS
 * Schema:    http://standards.buildingsmart.org/IDS/1.0/ids.xsd
 *
 * Round-trip notes:
 *   <info>/<author> is an email address — stored in author.uri for faithful re-export.
 *   Structured IU applicability (_idsApplicability) preserves entity/predefinedType for export.
 *   _idsCardinality: null = not present in source (omit on export), string = explicit value.
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
  'ifclinearvelocitymeasure': 'Numeric',
  'ifctimemeasure': 'Numeric',
  'ifcaccelerationmeasure': 'Numeric',
  'ifcmassdensitymeasure': 'Numeric',
  'ifcpowermeasure': 'Numeric',
  'ifctemperaturemeasure': 'Numeric',
  'ifcthermodynamictemperaturemeasure': 'Numeric',
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

function getChild(parent, tagName) {
  if (!parent) return null;
  for (const child of parent.childNodes) {
    if (child.nodeType === 1 && child.localName === tagName) {
      return child;
    }
  }
  return null;
}

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

  const simpleVal = getChildText(valueEl, 'simpleValue');
  if (simpleVal) {
    return { type: 'simple', value: simpleVal, description: '' };
  }

  const restrictionEl = getChild(valueEl, 'restriction');
  if (restrictionEl) {
    const base = restrictionEl.getAttribute('base') || '';
    const parts = [];
    let description = '';

    const annotationEl = getChild(restrictionEl, 'annotation');
    if (annotationEl) {
      description = getChildText(annotationEl, 'documentation') || '';
    }

    const patternEl = getChild(restrictionEl, 'pattern');
    if (patternEl) {
      const patternValue = patternEl.getAttribute('value') || '';
      return { type: 'pattern', value: `Pattern: ${patternValue}`, description };
    }

    const enumerations = getChildren(restrictionEl, 'enumeration');
    if (enumerations.length > 0) {
      const values = enumerations.map(e => e.getAttribute('value') || '').filter(Boolean);
      return { type: 'enumeration', value: values.join(', '), description };
    }

    const minExcl = getChild(restrictionEl, 'minExclusive');
    const maxExcl = getChild(restrictionEl, 'maxExclusive');
    const minIncl = getChild(restrictionEl, 'minInclusive');
    const maxIncl = getChild(restrictionEl, 'maxInclusive');
    if (minExcl || maxExcl || minIncl || maxIncl) {
      if (minExcl) parts.push(`> ${minExcl.getAttribute('value')}`);
      if (minIncl) parts.push(`>= ${minIncl.getAttribute('value')}`);
      if (maxExcl) parts.push(`< ${maxExcl.getAttribute('value')}`);
      if (maxIncl) parts.push(`<= ${maxIncl.getAttribute('value')}`);
      return { type: 'range', value: parts.join(' and '), base, description };
    }

    return { type: 'restriction', value: `Restriction (base: ${base})`, description };
  }

  return null;
}

function mapDataType(ifcDataType) {
  if (!ifcDataType) return 'String';
  const lower = ifcDataType.toLowerCase().trim();
  return IFC_DATA_TYPE_MAP[lower] || 'String';
}

function mapIfcVersion(ifcVersion) {
  if (!ifcVersion) return 'IFC 4x3 ADD2';
  const versions = ifcVersion.trim().split(/\s+/);
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
  if (name.includes('|') || name.includes('.*') || name.includes('[')) {
    return name;
  }
  if (name.startsWith('IFC') || name.startsWith('ifc')) {
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

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid XML: ' + parseError.textContent);
  }

  const root = doc.documentElement;

  // Parse info section — including version (I-1) and copyright (I-2)
  const infoEl = getChild(root, 'info');
  const title = getChildText(infoEl, 'title') || 'IDS Import';
  const description = getChildText(infoEl, 'description') || '';
  const copyright = getChildText(infoEl, 'copyright') || '';
  const version = getChildText(infoEl, 'version') || '';
  const date = getChildText(infoEl, 'date') || '';
  const milestone = getChildText(infoEl, 'milestone') || '';
  const author = getChildText(infoEl, 'author') || '';

  const specificationsEl = getChild(root, 'specifications');
  const specifications = specificationsEl ? getChildren(specificationsEl, 'specification') : [];

  const rootInformationUnits = [];
  let totalIUs = 0;

  for (const specEl of specifications) {
    const specName = specEl.getAttribute('name') || 'Unnamed Specification';
    const specDesc = specEl.getAttribute('description') || specEl.getAttribute('instructions') || '';
    const ifcVersion = specEl.getAttribute('ifcVersion') || '';
    const basis = mapIfcVersion(ifcVersion);

    const applicabilityEl = getChild(specEl, 'applicability');
    let entityName = '';
    let entityNames = [];           // all entity names from multi-entity restriction (I-4)
    let applicabilityPredefinedType = ''; // stored structurally for faithful re-export (I-6)
    const applicabilityDetails = [];
    let minOccurs = 0;

    if (applicabilityEl) {
      minOccurs = parseInt(applicabilityEl.getAttribute('minOccurs') || '0', 10);

      const entityEl = getChild(applicabilityEl, 'entity');
      if (entityEl) {
        const nameEl = getChild(entityEl, 'name');
        if (nameEl) {
          const simpleVal = getChildText(nameEl, 'simpleValue');
          if (simpleVal) {
            entityName = normalizeEntityName(simpleVal);
            entityNames = [entityName];
          } else {
            // Handle restriction — pattern or multi-entity enumeration (I-4)
            const restrictionEl = getChild(nameEl, 'restriction');
            if (restrictionEl) {
              const patternEl = getChild(restrictionEl, 'pattern');
              if (patternEl) {
                entityName = patternEl.getAttribute('value') || 'Multiple Entities';
                entityNames = [entityName];
              } else {
                const enumEls = getChildren(restrictionEl, 'enumeration');
                if (enumEls.length > 0) {
                  entityNames = enumEls
                    .map(e => normalizeEntityName(e.getAttribute('value') || ''))
                    .filter(Boolean);
                  entityName = entityNames[0] || '';
                }
              }
            }
          }
        }

        // PredefinedType — store as structured string for round-trip (I-6)
        const predefinedTypeEl = getChild(entityEl, 'predefinedType');
        if (predefinedTypeEl) {
          const ptSimple = getChildText(predefinedTypeEl, 'simpleValue');
          if (ptSimple) {
            applicabilityPredefinedType = ptSimple;
            applicabilityDetails.push(`PredefinedType: ${ptSimple}`);
          } else {
            const ptRestr = getChild(predefinedTypeEl, 'restriction');
            if (ptRestr) {
              const ptEnums = getChildren(ptRestr, 'enumeration');
              if (ptEnums.length > 0) {
                const ptValues = ptEnums.map(e => e.getAttribute('value') || '').filter(Boolean);
                applicabilityPredefinedType = ptValues.join(',');
                applicabilityDetails.push(`PredefinedType: ${ptValues.join(', ')}`);
              }
            }
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

    // Build human-readable description
    const descParts = [];
    if (specDesc) descParts.push(specDesc);
    if (entityNames.length > 1) {
      descParts.push(`Applies to: ${entityNames.join(', ')}`);
    } else if (entityName) {
      descParts.push(`Applies to: ${entityName}`);
    }
    if (ifcVersion) descParts.push(`IFC Version: ${ifcVersion}`);
    if (applicabilityDetails.length > 0) {
      descParts.push('Applicability: ' + applicabilityDetails.join('; '));
    }

    // Parse requirements into sub-Information Units
    const requirementsEl = getChild(specEl, 'requirements');
    const subInformationUnits = [];

    if (requirementsEl) {
      const propertyEls = getChildren(requirementsEl, 'property');
      for (const propEl of propertyEls) {
        const iu = parsePropertyRequirement(propEl, entityName, basis);
        if (iu) { subInformationUnits.push(iu); totalIUs++; }
      }

      const attributeEls = getChildren(requirementsEl, 'attribute');
      for (const attrEl of attributeEls) {
        const iu = parseAttributeRequirement(attrEl, entityName, basis);
        if (iu) { subInformationUnits.push(iu); totalIUs++; }
      }

      const classificationEls = getChildren(requirementsEl, 'classification');
      for (const classEl of classificationEls) {
        const iu = parseClassificationRequirement(classEl, entityName, basis);
        if (iu) { subInformationUnits.push(iu); totalIUs++; }
      }

      const materialEls = getChildren(requirementsEl, 'material');
      for (const matEl of materialEls) {
        const iu = parseMaterialRequirement(matEl, entityName, basis);
        if (iu) { subInformationUnits.push(iu); totalIUs++; }
      }

      const partOfEls = getChildren(requirementsEl, 'partOf');
      for (const partOfEl of partOfEls) {
        const iu = parsePartOfRequirement(partOfEl, entityName, basis);
        if (iu) { subInformationUnits.push(iu); totalIUs++; }
      }
    }

    rootInformationUnits.push({
      id: generateUUID(),
      name: specName || entityName,
      dataType: 'Structured',
      isMandatory: minOccurs > 0,
      definition: descParts.join('\n'),
      examples: '',
      constraints: '',
      correspondingExternalElements: entityName ? [{
        id: generateUUID(),
        basis,
        name: entityName,
        description: '',
      }] : [],
      // Structured applicability data preserved for faithful IDS re-export
      _idsApplicability: {
        entities: entityNames,
        predefinedType: applicabilityPredefinedType,
        minOccurs,
      },
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

  // Build header data — preserve version (I-1) and copyright (I-2)
  const headerData = {
    title: title || description || '',
    fullTitle: title || description || '',
    shortTitle: title || description || '',
    status: 'WD',
    version: version || '1.0',
    idmGuid: generateUUID(),
    ucGuid: generateUUID(),
    bcmGuid: generateUUID(),
    copyright: copyright || '',
    idsDescription: description || '',
    language: 'EN',
    aimAndScope: description || title || '',
    aimScope: description || title || '',
    use: '',
    summary: description || title || '',
    authors: [],
    actorsList: [],
  };

  if (copyright) {
    headerData.authors.push({
      id: generateUUID(),
      type: 'organization',
      organizationName: copyright,
      organizationUri: '',
    });
  }

  if (author) {
    // IDS <author> is an email address. Store in uri so idsExporter can recover it.
    headerData.authors.push({
      id: generateUUID(),
      type: 'person',
      givenName: author.includes('@') ? '' : author,
      familyName: '',
      uri: author,
      affiliation: copyright || '',
    });
  }

  if (date) {
    headerData.creationDate = date;
  }

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
      if (phases.includes(keyword)) iso22263[phase] = true;
    }
    if (Object.keys(iso22263).length > 0) {
      headerData.targetPhases = { iso22263 };
    }
  }

  // Detect IDS schema version from xsi:schemaLocation (e.g. ".../IDS/1.0/ids.xsd")
  const versionMatch = content.match(/IDS\/(\d+\.\d+)\/ids\.xsd/i);
  const idsVersion = versionMatch ? versionMatch[1] : '1.0';

  return {
    headerData,
    erHierarchy: [rootER],
    bpmnXml: null,
    totalSpecifications: rootInformationUnits.length,
    totalIUs,
    idsVersion,
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
  // Preserve three states: null = not specified in source, 'required', 'optional'
  const cardinalityAttr = propEl.getAttribute('cardinality');
  const cardinality = cardinalityAttr || 'required';
  const instructions = propEl.getAttribute('instructions') || '';

  // Read pset — support both simpleValue and restriction/enumeration (multi-pset, I-5)
  // Store all pset names so the exporter can reconstruct <xs:restriction> for multi-pset
  let psetNames = [];
  let psetName = psetEl ? getChildText(psetEl, 'simpleValue') : '';
  if (psetName) {
    psetNames = [psetName];
  } else if (psetEl) {
    const psetRestrEl = getChild(psetEl, 'restriction');
    if (psetRestrEl) {
      const enumEls = getChildren(psetRestrEl, 'enumeration');
      psetNames = enumEls.map(e => e.getAttribute('value') || '').filter(Boolean);
      psetName = psetNames[0] || '';
    }
  }

  const baseName = baseNameEl ? getChildText(baseNameEl, 'simpleValue') : '';
  if (!baseName && !psetName) return null;

  const iuName = baseName || psetName;
  const mappingName = psetName ? `${psetName}.${baseName}` : (entityName || baseName);

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
        // Encode non-double base so buildValueXml can restore xs:integer etc.
        const baseTag = valueInfo.base && valueInfo.base !== 'xs:double' ? ` (${valueInfo.base})` : '';
        constraints = `Range${baseTag}: ${valueInfo.value}`;
      } else {
        constraints = valueInfo.value;
      }
      if (valueInfo.description) {
        constraints = constraints ? `${constraints}\n${valueInfo.description}` : valueInfo.description;
      }
    }
  }

  // Build definition: instructions text first, then IFC type metadata for round-trip recovery
  const defParts = [];
  if (instructions) defParts.push(instructions);
  if (dataType) defParts.push(`IFC Data Type: ${dataType}`);
  const definition = defParts.join('\n');

  return {
    id: generateUUID(),
    name: iuName,
    dataType: mapDataType(dataType),
    isMandatory: cardinality !== 'optional',   // I-3: respect cardinality
    definition,
    examples,
    constraints,
    correspondingExternalElements: [{
      id: generateUUID(),
      basis,
      name: mappingName,
      description: uri || '',
    }],
    _idsInstructions: instructions,           // original instructions text for faithful re-export
    _idsPropertySets: psetNames,              // all pset names (enables multi-pset xs:restriction)
    _idsCardinality: cardinalityAttr,         // null = not specified, 'required', or 'optional'
    subInformationUnits: [],
  };
}

/**
 * Parse an <attribute> requirement into an Information Unit
 */
function parseAttributeRequirement(attrEl, entityName, basis) {
  const nameEl = getChild(attrEl, 'name');
  const valueEl = getChild(attrEl, 'value');
  const cardinalityAttr = attrEl.getAttribute('cardinality');
  const cardinality = cardinalityAttr || 'required';
  const instructions = attrEl.getAttribute('instructions') || '';

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
        const baseTag = valueInfo.base && valueInfo.base !== 'xs:double' ? ` (${valueInfo.base})` : '';
        constraints = `Range${baseTag}: ${valueInfo.value}`;
      }
      if (valueInfo.description) {
        constraints = constraints ? `${constraints}\n${valueInfo.description}` : valueInfo.description;
      }
    }
  }

  return {
    id: generateUUID(),
    name: attrName,
    dataType: 'String',
    isMandatory: cardinality !== 'optional',   // I-3: respect cardinality
    definition: instructions || `IFC attribute of ${entityName || 'entity'}`,
    examples,
    constraints,
    correspondingExternalElements: [{
      id: generateUUID(),
      basis,
      // Include entity prefix in name so exporter can detect attribute vs property (E-2)
      name: entityName ? `${entityName}.${attrName}` : attrName,
      description: 'IFC Attribute',
    }],
    _idsInstructions: instructions,           // original instructions text for faithful re-export
    _idsCardinality: cardinalityAttr,         // null = not specified, 'required', or 'optional'
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
