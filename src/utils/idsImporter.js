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
 *   Structured IU applicability (_idsApplicability) preserves entity/predefinedType/ifcVersion for export.
 *   _idsCardinality: null = not present in source (omit on export), string = explicit value.
 *   _idsDataType: raw dataType attribute string ('' = absent in source, 'IFCTEXT' = explicit).
 *   _idsMaterial: true marks a <material> requirement for correct re-export.
 *   _idsClassification: { system } marks a <classification> requirement.
 *   _idsPartOf: { relation, parentEntity, parentPredefinedType } for <partOf> requirements.
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
 * Build constraint objects and examples from a valueInfo object.
 *
 * Returns { constraints: [{id, description, businessRule}], examples: string }
 * - constraints[].description uses the canonical format that buildValueXml recognises:
 *     "Pattern: RAL.*"  |  "Allowed values: A, B"  |  "Range: > 0"
 *   Annotation text (from xs:documentation) is appended after \n.
 * - examples holds a bare <ids:simpleValue> string (no restriction element).
 * - businessRule is always '' on import — the IDS `instructions` attribute is
 *   preserved separately in _idsInstructions for faithful roundtrip.
 */
function buildConstraintsFromValue(valueInfo) {
  let description = '', examples = '';
  if (!valueInfo) return { constraints: [], examples };

  if (valueInfo.type === 'simple') {
    examples = valueInfo.value;
  } else if (valueInfo.type === 'enumeration') {
    description = `Allowed values: ${valueInfo.value}`;
  } else if (valueInfo.type === 'pattern') {
    description = valueInfo.value;
  } else if (valueInfo.type === 'range') {
    const baseTag = valueInfo.base && valueInfo.base !== 'xs:double' ? ` (${valueInfo.base})` : '';
    description = `Range${baseTag}: ${valueInfo.value}`;
  } else {
    description = valueInfo.value;
  }
  if (valueInfo.description) {
    // Append annotation after \n so buildValueXml can recover it for xs:documentation
    description = description ? `${description}\n${valueInfo.description}` : valueInfo.description;
  }

  const constraints = description ? [{ id: generateUUID(), description, businessRule: '' }] : [];
  return { constraints, examples };
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
  const version = getChildText(infoEl, 'version') || '';   // '' = absent in source (do not default)
  const date = getChildText(infoEl, 'date') || '';
  const purpose = getChildText(infoEl, 'purpose') || '';
  const milestone = getChildText(infoEl, 'milestone') || '';
  const author = getChildText(infoEl, 'author') || '';

  const specificationsEl = getChild(root, 'specifications');
  const specifications = specificationsEl ? getChildren(specificationsEl, 'specification') : [];

  const rootInformationUnits = [];
  let totalIUs = 0;

  for (const specEl of specifications) {
    const specName = specEl.getAttribute('name') || 'Unnamed Specification';
    const specDesc = specEl.getAttribute('description') || '';
    const specInstructions = specEl.getAttribute('instructions') || null;
    const ifcVersion = specEl.getAttribute('ifcVersion') || '';
    const basis = mapIfcVersion(ifcVersion);

    const applicabilityEl = getChild(specEl, 'applicability');
    let entityName = '';
    let entityNames = [];           // all entity names from multi-entity restriction (I-4)
    let applicabilityPredefinedType = ''; // stored structurally for faithful re-export (I-6)
    const applicabilityDetails = [];
    let minOccurs = 0;
    let maxOccursRaw = 'unbounded';
    const materialApplicability = [];
    const classificationApplicability = [];
    const propertyApplicability = [];
    const attributeApplicability = [];
    const partOfApplicability = [];

    if (applicabilityEl) {
      minOccurs = parseInt(applicabilityEl.getAttribute('minOccurs') || '0', 10);
      maxOccursRaw = applicabilityEl.getAttribute('maxOccurs') || 'unbounded';

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

      // Material applicability — store both display string and structured data for re-export
      const materialApplicabilityEls = getChildren(applicabilityEl, 'material');
      for (const matEl of materialApplicabilityEls) {
        const matValue = extractValue(getChild(matEl, 'value'));
        if (matValue) {
          applicabilityDetails.push(`Material: ${matValue.value}`);
          const { constraints: mc, examples: me } = buildConstraintsFromValue(matValue);
          materialApplicability.push({ constraints: mc, examples: me });
        } else {
          // Bare <material/> in applicability — no value constraint
          materialApplicability.push({ constraints: '', examples: '' });
        }
      }

      // PartOf applicability — store structured for re-export
      const partOfApplicabilityEls = getChildren(applicabilityEl, 'partOf');
      for (const poEl of partOfApplicabilityEls) {
        const relation = poEl.getAttribute('relation') || '';
        const poEntityEl = getChild(poEl, 'entity');
        let poParentEntity = '', poParentPredefinedType = '';
        if (poEntityEl) {
          const poNameEl = getChild(poEntityEl, 'name');
          poParentEntity = poNameEl ? getChildText(poNameEl, 'simpleValue') : '';
          const poPtEl = getChild(poEntityEl, 'predefinedType');
          poParentPredefinedType = poPtEl ? getChildText(poPtEl, 'simpleValue') : '';
        }
        const poDisplayName = normalizeEntityName(poParentEntity);
        applicabilityDetails.push(`Part of ${poDisplayName || 'entity'}${relation ? ` (${relation})` : ''}`);
        partOfApplicability.push({ relation, parentEntity: poParentEntity, parentPredefinedType: poParentPredefinedType });
      }

      // Classification applicability — store structured for re-export
      const classEls = getChildren(applicabilityEl, 'classification');
      for (const classEl of classEls) {
        const classValue = extractValue(getChild(classEl, 'value'));
        const classSystem = getChildText(getChild(classEl, 'system'), 'simpleValue') || '';
        if (classValue) {
          applicabilityDetails.push(`Classification (${classSystem || 'Unknown'}): ${classValue.value}`);
        }
        const { constraints: cc, examples: ce } = classValue ? buildConstraintsFromValue(classValue) : { constraints: [], examples: '' };
        classificationApplicability.push({ constraints: cc, examples: ce, system: classSystem });
      }

      // Attribute applicability — store structured for re-export
      const attrApplicabilityEls = getChildren(applicabilityEl, 'attribute');
      for (const attrEl of attrApplicabilityEls) {
        const attrName = getChildText(getChild(attrEl, 'name'), 'simpleValue');
        const attrValue = extractValue(getChild(attrEl, 'value'));
        if (attrName) {
          applicabilityDetails.push(`Attribute: ${attrName}${attrValue ? ` = ${attrValue.value}` : ''}`);
          const { constraints: ac, examples: ae } = attrValue ? buildConstraintsFromValue(attrValue) : { constraints: [], examples: '' };
          attributeApplicability.push({ name: attrName, constraints: ac, examples: ae });
        }
      }

      // Property applicability — store structured for re-export
      const propApplicabilityEls = getChildren(applicabilityEl, 'property');
      for (const propEl of propApplicabilityEls) {
        const psetName = getChildText(getChild(propEl, 'propertySet'), 'simpleValue');
        const baseName = getChildText(getChild(propEl, 'baseName'), 'simpleValue');
        const dataType = propEl.getAttribute('dataType') || '';
        const propValue = extractValue(getChild(propEl, 'value'));
        if (psetName && baseName) {
          const detail = propValue ? `${psetName}.${baseName} = ${propValue.value}` : `${psetName}.${baseName}`;
          applicabilityDetails.push(`Applies when: ${detail}`);
          const { constraints: pc, examples: pe } = propValue ? buildConstraintsFromValue(propValue) : { constraints: [], examples: '' };
          propertyApplicability.push({ propertySet: psetName, baseName, dataType, constraints: pc, examples: pe });
        }
      }
    }

    // Build human-readable description
    const descParts = [];
    if (specDesc) descParts.push(specDesc);
    if (specInstructions) descParts.push(specInstructions);   // spec-level author instructions
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
    const requirementsDescription = requirementsEl ? requirementsEl.getAttribute('description') || null : null;
    const subInformationUnits = [];
    let entityRequirementsInstructions = null;

    if (requirementsEl) {
      // Iterate in document order to preserve requirement sequence (e.g. partOf first)
      for (const reqEl of requirementsEl.childNodes) {
        if (reqEl.nodeType !== 1) continue;
        let iu = null;
        switch (reqEl.localName) {
          case 'entity': {
            // Entity in requirements carries optional instructions for the IFC author
            const instr = reqEl.getAttribute('instructions') || null;
            if (instr) entityRequirementsInstructions = instr;
            break;
          }
          case 'property':        iu = parsePropertyRequirement(reqEl, entityName, basis); break;
          case 'attribute':       iu = parseAttributeRequirement(reqEl, entityName, basis); break;
          case 'classification':  iu = parseClassificationRequirement(reqEl, entityName, basis); break;
          case 'material':        iu = parseMaterialRequirement(reqEl, entityName, basis); break;
          case 'partOf':          iu = parsePartOfRequirement(reqEl, entityName, basis); break;
        }
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
        maxOccurs: maxOccursRaw,
        ifcVersion,
        materialApplicability,
        classificationApplicability,
        propertyApplicability,
        attributeApplicability,
        partOfApplicability,
      },
      // Preserve original <ids:specification> attributes — null = absent in source (do not emit)
      _idsSpecIdentifier: specEl.getAttribute('identifier') || null,
      _idsSpecDescription: specEl.getAttribute('description') || null,
      _idsSpecInstructions: specInstructions,
      _idsRequirementsDescription: requirementsDescription,
      _idsEntityRequirementsInstructions: entityRequirementsInstructions,
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
    version: version,   // preserve raw value — '' means absent in source (do not add <ids:version>)
    idmGuid: generateUUID(),
    ucGuid: generateUUID(),
    bcmGuid: generateUUID(),
    copyright: copyright || '',
    idsDescription: description || '',
    idsMilestone: milestone || '',   // preserve for <ids:milestone> re-export
    idsPurpose: purpose || '',       // preserve for <ids:purpose> re-export
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
  const dataType = propEl.getAttribute('dataType') || '';  // '' = absent in source
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

  const { constraints, examples } = buildConstraintsFromValue(valueEl ? extractValue(valueEl) : null);

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
    _idsDataType: dataType,                   // raw dataType attr value — '' means absent in source
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

  const { constraints, examples } = buildConstraintsFromValue(valueEl ? extractValue(valueEl) : null);

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
  const cardinalityAttr = classEl.getAttribute('cardinality');
  const uri = classEl.getAttribute('uri') || null;
  const instructions = classEl.getAttribute('instructions') || null;

  const system = systemEl ? getChildText(systemEl, 'simpleValue') : 'Unknown';
  const { constraints, examples } = buildConstraintsFromValue(valueEl ? extractValue(valueEl) : null);

  const defParts = [];
  if (instructions) defParts.push(instructions);
  defParts.push(`Classification reference in ${system} system`);

  return {
    id: generateUUID(),
    name: `Classification (${system})`,
    dataType: 'String',
    isMandatory: cardinalityAttr !== 'optional',
    definition: defParts.join('\n'),
    examples,
    constraints,
    correspondingExternalElements: [{
      id: generateUUID(),
      basis: 'Other',
      name: system,
      description: `Classification system: ${system}`,
    }],
    _idsClassification: { system, uri, instructions },
    _idsCardinality: cardinalityAttr,
    subInformationUnits: [],
  };
}

/**
 * Parse a <material> requirement into an Information Unit
 */
function parseMaterialRequirement(matEl, entityName, basis) {
  const valueEl = getChild(matEl, 'value');
  const cardinalityAttr = matEl.getAttribute('cardinality');
  const uri = matEl.getAttribute('uri') || null;
  const instructions = matEl.getAttribute('instructions') || null;
  const { constraints, examples } = buildConstraintsFromValue(valueEl ? extractValue(valueEl) : null);

  const matDefParts = [];
  if (instructions) matDefParts.push(instructions);
  matDefParts.push(`Material requirement for ${entityName || 'entity'}`);

  return {
    id: generateUUID(),
    name: 'Material',
    dataType: 'String',
    isMandatory: cardinalityAttr !== 'optional',
    definition: matDefParts.join('\n'),
    examples,
    constraints,
    correspondingExternalElements: [{
      id: generateUUID(),
      basis,
      name: entityName || 'Material',
      description: 'IFC Material association',
    }],
    _idsMaterial: { uri, instructions },      // marker + metadata for re-export as <ids:material>
    _idsCardinality: cardinalityAttr,
    subInformationUnits: [],
  };
}

/**
 * Parse a <partOf> requirement into an Information Unit
 */
function parsePartOfRequirement(partOfEl, entityName, basis) {
  const relation = partOfEl.getAttribute('relation') || '';
  const cardinalityAttr = partOfEl.getAttribute('cardinality');
  const instructions = partOfEl.getAttribute('instructions') || null;
  const entityEl = getChild(partOfEl, 'entity');
  let rawParentEntity = '';      // UPPERCASE as in source (IFCELEMENTASSEMBLY) — for re-export
  let parentPredefinedType = '';

  if (entityEl) {
    const nameEl = getChild(entityEl, 'name');
    rawParentEntity = nameEl ? getChildText(nameEl, 'simpleValue') : '';
    const predefinedTypeEl = getChild(entityEl, 'predefinedType');
    parentPredefinedType = predefinedTypeEl ? getChildText(predefinedTypeEl, 'simpleValue') : '';
  }

  const displayName = normalizeEntityName(rawParentEntity);
  const defParts = [];
  if (instructions) defParts.push(instructions);
  defParts.push(`Must be part of ${displayName || 'parent entity'}`);
  if (relation) defParts.push(`Relation: ${normalizeEntityName(relation)}`);
  if (parentPredefinedType) defParts.push(`PredefinedType: ${parentPredefinedType}`);

  return {
    id: generateUUID(),
    name: `PartOf (${displayName || relation})`,
    dataType: 'String',
    isMandatory: cardinalityAttr !== 'prohibited',
    definition: defParts.join('\n'),
    examples: '',
    constraints: '',
    correspondingExternalElements: [{
      id: generateUUID(),
      basis,
      name: displayName || relation,
      description: `IFC relationship: ${relation}`,
    }],
    _idsPartOf: {
      relation,
      parentEntity: rawParentEntity,          // UPPERCASE for faithful re-export
      parentPredefinedType,
      cardinality: cardinalityAttr,           // null = not specified in source
      instructions,
    },
    subInformationUnits: [],
  };
}

/**
 * Detect if XML content is an IDS file
 */
export function isIdsXml(content) {
  return content.includes('<ids:') || content.includes('buildingsmart.org/IDS');
}
