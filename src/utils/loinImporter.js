/**
 * LOIN (Level of Information Need) Importer
 * Parses LOIN XML and converts to IDM project data
 * Supports three schema variants:
 *   1. tumcms/CEN 17412: <LOINSpecification> with inline properties
 *   2. EN 17412-3: <LevelOfInformationNeed> with <Specification> and dt: namespace
 *   3. ISO 7817-3: Same root as EN 17412-3 with external ObjectTypes/Properties resolved by nodeID
 */

// Reverse map LOIN data types to IDM data types
const REVERSE_DATA_TYPE_MAP = {
  'string': 'String',
  'text': 'String',
  'real': 'Numeric',
  'double': 'Numeric',
  'float': 'Numeric',
  'integer': 'Numeric',
  'int': 'Numeric',
  'boolean': 'Boolean',
  'logical': 'Boolean',
  'datetime': 'Date/Time',
  'date': 'Date/Time',
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
 * Get all element children (any tag)
 */
function getAllElementChildren(parent) {
  if (!parent) return [];
  const result = [];
  for (const child of parent.childNodes) {
    if (child.nodeType === 1) {
      result.push(child);
    }
  }
  return result;
}

/**
 * Map a LOIN dataType string to IDM dataType
 */
function mapDataType(loinType) {
  if (!loinType) return 'String';
  const lower = loinType.toLowerCase().trim();
  return REVERSE_DATA_TYPE_MAP[lower] || 'String';
}

/**
 * Determine the external element mapping basis from LOIN objectType info
 */
function determineBasis(refToDataModelType, refToClassification) {
  if (refToDataModelType && refToDataModelType.startsWith('Ifc')) {
    // Check if it's IFC 2x3 or 4x3 based on URL
    if (refToClassification && refToClassification.includes('IFC2x3')) {
      return 'IFC 2x3';
    }
    return 'IFC 4x3 ADD2';
  }
  if (refToClassification) {
    if (refToClassification.includes('citygml')) return 'CityGML';
    if (refToClassification.includes('uniclass')) return 'Other';
    if (refToClassification.includes('bsdd') || refToClassification.includes('buildingsmart.org')) return 'bSDD';
  }
  return 'Other';
}

// ─────────────────────────────────────────────────────────────
// Format 1: tumcms/CEN 17412 — <LOINSpecification>
// ─────────────────────────────────────────────────────────────

function parseTumcmsFormat(doc) {
  const root = doc.documentElement;
  const specName = normalizeWS(root.getAttribute('name')) || 'LOIN Import';
  const specGuid = root.getAttribute('globalId') || generateUUID();
  const description = getChildText(root, 'description') || '';

  // Context
  const contextEl = getChild(root, 'context');
  const purpose = normalizeWS(contextEl?.getAttribute('purpose') || '');
  const milestone = normalizeWS(contextEl?.getAttribute('informationDeliveryMileStone') || '');
  const sendingActor = normalizeWS(contextEl?.getAttribute('sendingActor') || '');
  const receivingActor = normalizeWS(contextEl?.getAttribute('receivingActor') || '');

  // Parse specificationPerObjectTypeList entries
  const specEntries = getChildren(root, 'specificationPerObjectTypeList');
  const rootInformationUnits = [];

  for (const entry of specEntries) {
    const objectTypeEl = getChild(entry, 'objectType');
    const objectTypeName = objectTypeEl?.getAttribute('name') || 'Unknown';
    const refToDataModelType = objectTypeEl?.getAttribute('refToDataModelType') || '';
    const refToClassification = objectTypeEl?.getAttribute('refToClassification') || '';
    const basis = determineBasis(refToDataModelType, refToClassification);

    const alphaEl = getChild(entry, 'alphanumericInformationSpecification');
    const alphaDesc = alphaEl ? getChildText(alphaEl, 'Description') : '';
    const subInformationUnits = [];

    if (alphaEl) {
      // Parse propertySets
      const propertySetsEl = getChild(alphaEl, 'propertySets');
      if (propertySetsEl) {
        const psets = getChildren(propertySetsEl, 'propertySet');
        for (const pset of psets) {
          const psetName = pset.getAttribute('name') || '';
          const propsEl = getChild(pset, 'properties');
          if (propsEl) {
            const props = getChildren(propsEl, 'property');
            for (const prop of props) {
              subInformationUnits.push(createIUFromProperty(prop, psetName, basis, refToDataModelType, refToClassification));
            }
          }
        }
      }

      // Parse standalone properties
      const standalonePropsEl = getChild(alphaEl, 'properties');
      if (standalonePropsEl) {
        const props = getChildren(standalonePropsEl, 'property');
        for (const prop of props) {
          subInformationUnits.push(createIUFromProperty(prop, '', basis, refToDataModelType, refToClassification));
        }
      }
    }

    // Store geometric info in description if present
    const geoEl = getChild(entry, 'geometricSpecification');
    let geoDesc = '';
    if (geoEl) {
      const parts = [];
      const detail = getChildText(geoEl, 'detail');
      const dim = getChildText(geoEl, 'dimensionality');
      const loc = getChildText(geoEl, 'location');
      const app = getChildText(geoEl, 'appearance');
      const param = getChildText(geoEl, 'parametricBehaviour');
      if (detail) parts.push(`Detail: ${detail}`);
      if (dim) parts.push(`Dimensionality: ${dim}`);
      if (loc) parts.push(`Location: ${loc}`);
      if (app) parts.push(`Appearance: ${app}`);
      if (param) parts.push(`Parametric: ${param}`);
      if (parts.length > 0) geoDesc = '\n\nGeometric Information: ' + parts.join(', ');
    }

    // Create a parent IU with dataType "Structured" for each object type
    rootInformationUnits.push({
      id: entry.getAttribute('globalId') || generateUUID(),
      name: objectTypeName,
      dataType: 'Structured',
      isMandatory: true,
      definition: (alphaDesc + geoDesc).trim(),
      examples: '',
      correspondingExternalElements: [{
        id: generateUUID(),
        basis,
        name: refToDataModelType || objectTypeName,
        description: refToClassification,
      }],
      subInformationUnits,
    });
  }

  return buildResult(specName, specGuid, description, purpose, milestone, sendingActor, receivingActor, rootInformationUnits);
}

/**
 * Create an IU object from a LOIN <property> element (tumcms format)
 */
function createIUFromProperty(propEl, psetName, basis, refToDataModelType, refToClassification) {
  const propName = propEl.getAttribute('name') || 'Unnamed';
  const propRef = propEl.getAttribute('refToClassification') || '';
  const unit = getChildText(propEl, 'unit');
  const dataType = getChildText(propEl, 'dataType');

  // Build external element mapping name
  const mappingName = psetName ? `${psetName}.${propName}` : (refToDataModelType || propName);

  const mappings = [{
    id: generateUUID(),
    basis,
    name: mappingName,
    description: propRef || refToClassification || '',
  }];

  const definition = unit && unit !== 'NONE' ? `Unit: ${unit}` : '';

  return {
    id: generateUUID(),
    name: propName,
    dataType: mapDataType(dataType),
    isMandatory: true,
    definition,
    examples: '',
    correspondingExternalElements: mappings,
    subInformationUnits: [],
  };
}

// ─────────────────────────────────────────────────────────────
// Format 2 & 3: EN 17412-3 / ISO 7817-3 — <LevelOfInformationNeed>
// ─────────────────────────────────────────────────────────────

function parseENFormat(doc) {
  const root = doc.documentElement;

  // Find the first <Specification> element
  const specEl = getChild(root, 'Specification');
  if (!specEl) {
    throw new Error('No <Specification> element found in LOIN XML');
  }

  const specName = specEl.getAttribute('name') || 'LOIN Import';
  const specGuid = specEl.getAttribute('UUID') || specEl.getAttribute('nodeID') || generateUUID();
  const description = getChildText(specEl, 'Description') || '';

  // Context / Prerequisites
  const prereqEl = getChild(specEl, 'Prerequisites');
  const purpose = prereqEl?.getAttribute('purpose') || '';
  const milestone = prereqEl?.getAttribute('informationDeliveryMilestone') || prereqEl?.getAttribute('informationDeliveryMileStone') || '';
  const sendingActor = prereqEl?.getAttribute('sendingActor') || '';
  const receivingActor = prereqEl?.getAttribute('receivingActor') || '';

  // Build lookup maps for external definitions (ISO 7817-3 format)
  const objectTypesMap = buildNodeIdMap(root, 'ObjectTypes', 'ObjectType');
  const propertiesMap = buildPropertyMap(root);
  const setsOfPropertiesMap = buildSetOfPropertiesMap(root);

  // Parse SpecificationPerObjectType entries
  const specEntries = getChildren(specEl, 'SpecificationPerObjectType');
  const rootInformationUnits = [];

  for (const entry of specEntries) {
    // Try inline ObjectType first, then resolve via dt:Object nodeID reference
    let objectTypeName = '';
    let objectTypeDef = '';
    let refToClassification = '';

    const objectTypeEl = getChild(entry, 'ObjectType');
    if (objectTypeEl) {
      objectTypeName = getNameFromDtElement(objectTypeEl);
      objectTypeDef = getDefinitionFromDtElement(objectTypeEl);
      // Get reference doc
      const refDocEl = getChild(objectTypeEl, 'ReferenceDocument');
      refToClassification = refDocEl?.getAttribute('resource') || '';
    } else {
      // Try dt:Object nodeID reference
      const dtObjectEl = getChild(entry, 'Object');
      if (dtObjectEl) {
        const nodeID = dtObjectEl.getAttribute('nodeID');
        if (nodeID && objectTypesMap[nodeID]) {
          objectTypeName = objectTypesMap[nodeID].name;
          objectTypeDef = objectTypesMap[nodeID].definition;
        }
      }
    }

    // Try entry-level name/definition (ISO 7817-3)
    if (!objectTypeName) {
      objectTypeName = getNameFromDtElement(entry) || 'Unknown';
      objectTypeDef = objectTypeDef || getDefinitionFromDtElement(entry);
    }

    // Get reference document from entry level too
    if (!refToClassification) {
      const refDocEl = getChild(entry, 'ReferenceDocument');
      refToClassification = refDocEl?.getAttribute('resource') || '';
    }

    const subInformationUnits = [];

    // Parse inline AlphanumericalInformation
    const alphaEl = getChild(entry, 'AlphanumericalInformation') || getChild(entry, 'AlphanumericInformation');
    if (alphaEl) {
      parseAlphaInfo(alphaEl, subInformationUnits, objectTypeName, refToClassification, propertiesMap);
    }

    // Parse dt:SetOfProperties references
    const setOfPropsRefs = getChildren(entry, 'SetOfProperties');
    for (const ref of setOfPropsRefs) {
      const nodeID = ref.getAttribute('nodeID');
      if (nodeID && setsOfPropertiesMap[nodeID]) {
        const setInfo = setsOfPropertiesMap[nodeID];
        for (const propInfo of setInfo.properties) {
          subInformationUnits.push(createIUFromParsedProperty(propInfo, setInfo.name, objectTypeName, refToClassification));
        }
      }
    }

    // Parse geometric info for description
    const geoEl = getChild(entry, 'GeometricalInformation') || getChild(entry, 'GeometricInformation');
    let geoDesc = '';
    if (geoEl) {
      const parts = [];
      const detail = getChildText(geoEl, 'Detail');
      const dim = getChildText(geoEl, 'Dimensionality');
      const loc = getChildText(geoEl, 'Location');
      const app = getChildText(geoEl, 'Appearance');
      const param = getChildText(geoEl, 'ParametricBehaviour');
      if (detail) parts.push(`Detail: ${detail}`);
      if (dim) parts.push(`Dimensionality: ${dim}`);
      if (loc) parts.push(`Location: ${loc}`);
      if (app) parts.push(`Appearance: ${app}`);
      if (param) parts.push(`Parametric: ${param}`);
      if (parts.length > 0) geoDesc = '\n\nGeometric Information: ' + parts.join(', ');
    }

    // Parse documentation
    const docEl = getChild(entry, 'Documentation');
    let docDesc = '';
    if (docEl) {
      const reqDocs = getChildren(docEl, 'RequiredDocument');
      if (reqDocs.length > 0) {
        const parts = reqDocs.map(rd => {
          const type = rd.getAttribute('type') || '';
          const purp = rd.getAttribute('purpose') || '';
          const cont = rd.getAttribute('content') || '';
          return [type, purp, cont].filter(Boolean).join(' — ');
        });
        docDesc = '\n\nRequired Documents: ' + parts.join('; ');
      }
    }

    const basis = determineBasis(objectTypeName, refToClassification);

    // Create a parent IU with dataType "Structured" for each object type
    rootInformationUnits.push({
      id: entry.getAttribute('UUID') || entry.getAttribute('nodeID') || generateUUID(),
      name: objectTypeName,
      dataType: 'Structured',
      isMandatory: true,
      definition: (objectTypeDef + geoDesc + docDesc).trim(),
      examples: '',
      correspondingExternalElements: [{
        id: generateUUID(),
        basis,
        name: objectTypeName,
        description: refToClassification,
      }],
      subInformationUnits,
    });
  }

  return buildResult(specName, specGuid, description, purpose, milestone, sendingActor, receivingActor, rootInformationUnits);
}

/**
 * Get dt:Name text from an element (EN/ISO format)
 */
function getNameFromDtElement(el) {
  const nameEls = getChildren(el, 'Name');
  for (const n of nameEls) {
    const text = n.textContent?.trim();
    if (text) return text;
  }
  return '';
}

/**
 * Get dt:Definition text from an element (EN/ISO format)
 */
function getDefinitionFromDtElement(el) {
  const defEls = getChildren(el, 'Definition');
  for (const d of defEls) {
    const text = d.textContent?.trim();
    if (text) return text;
  }
  return '';
}

/**
 * Build a nodeID→{name, definition} map from external ObjectTypes section
 */
function buildNodeIdMap(root, containerTag, itemTag) {
  const map = {};
  const container = getChild(root, containerTag);
  if (!container) return map;
  const items = getChildren(container, itemTag);
  for (const item of items) {
    const nodeID = item.getAttribute('nodeID');
    if (nodeID) {
      map[nodeID] = {
        name: getNameFromDtElement(item),
        definition: getDefinitionFromDtElement(item),
      };
    }
  }
  return map;
}

/**
 * Build a nodeID→property info map from external AlphanumericalInformation section (ISO 7817-3)
 */
function buildPropertyMap(root) {
  const map = {};
  // Look for top-level AlphanumericalInformation
  const alphaEls = getChildren(root, 'AlphanumericalInformation');
  for (const alpha of alphaEls) {
    const props = getChildren(alpha, 'Property');
    for (const prop of props) {
      const nodeID = prop.getAttribute('nodeID');
      if (nodeID) {
        const dataTypeEl = getChild(prop, 'DataType');
        const unitEl = getChild(prop, 'Unit');
        map[nodeID] = {
          name: getNameFromDtElement(prop),
          definition: getDefinitionFromDtElement(prop),
          dataType: dataTypeEl?.getAttribute('name') || dataTypeEl?.textContent?.trim() || 'String',
          unit: unitEl?.getAttribute('resource') || getChildText(unitEl, 'Symbol') || '',
          refToClassification: prop.getAttribute('about') || '',
        };
      }
    }
  }
  return map;
}

/**
 * Build a nodeID→{name, properties[]} map from external SetOfProperties (ISO 7817-3)
 */
function buildSetOfPropertiesMap(root) {
  const map = {};
  const propMap = buildPropertyMap(root);

  const alphaEls = getChildren(root, 'AlphanumericalInformation');
  for (const alpha of alphaEls) {
    const sets = getChildren(alpha, 'SetOfProperties');
    for (const setEl of sets) {
      const nodeID = setEl.getAttribute('nodeID');
      if (nodeID) {
        const name = getNameFromDtElement(setEl);
        const properties = [];
        // Resolve dt:Property references
        const propRefs = getChildren(setEl, 'Property');
        for (const ref of propRefs) {
          const refNodeID = ref.getAttribute('nodeID');
          if (refNodeID && propMap[refNodeID]) {
            properties.push(propMap[refNodeID]);
          }
        }
        map[nodeID] = { name, properties };
      }
    }
  }
  return map;
}

/**
 * Parse inline AlphanumericalInformation (EN 17412-3 format)
 */
function parseAlphaInfo(alphaEl, informationUnits, objectTypeName, refToClassification, propertiesMap) {
  // Look for inline Property elements
  const props = getChildren(alphaEl, 'Property');
  for (const prop of props) {
    const nodeID = prop.getAttribute('nodeID');
    // Try to resolve from external property map
    if (nodeID && propertiesMap[nodeID]) {
      const propInfo = propertiesMap[nodeID];
      informationUnits.push(createIUFromParsedProperty(propInfo, '', objectTypeName, refToClassification));
    }
  }

  // Look for inline SetOfProperties references
  const setRefs = getChildren(alphaEl, 'SetOfProperties');
  for (const ref of setRefs) {
    // These are typically nodeID references handled at the entry level
  }
}

/**
 * Create IU from a parsed property info object
 */
function createIUFromParsedProperty(propInfo, psetName, objectTypeName, objectRefToClassification) {
  const mappingName = psetName
    ? `${psetName}.${propInfo.name}`
    : (objectTypeName || propInfo.name);

  const basis = determineBasis(objectTypeName, objectRefToClassification);

  const mappings = [{
    id: generateUUID(),
    basis,
    name: mappingName,
    description: propInfo.refToClassification || objectRefToClassification || '',
  }];

  const defParts = [];
  if (propInfo.definition) defParts.push(propInfo.definition);
  if (propInfo.unit) defParts.push(`Unit: ${propInfo.unit}`);

  return {
    id: generateUUID(),
    name: propInfo.name,
    dataType: mapDataType(propInfo.dataType),
    isMandatory: true,
    definition: defParts.join('\n'),
    examples: '',
    correspondingExternalElements: mappings,
    subInformationUnits: [],
  };
}

// ─────────────────────────────────────────────────────────────
// Shared: Build final result
// ─────────────────────────────────────────────────────────────

function buildResult(specName, specGuid, description, purpose, milestone, sendingActor, receivingActor, informationUnits) {
  // Build root ER
  const rootER = {
    id: generateUUID(),
    name: `er_${specName}`,
    description: description || `Imported from LOIN: ${specName}`,
    informationUnits,
    subERs: [],
  };

  // Build header data
  const headerData = {
    title: description || specName || '',
    fullTitle: description || specName || '',
    shortTitle: specName || description || '',
    status: 'WD',
    version: '1.0',
    idmGuid: specGuid,
    ucGuid: generateUUID(),
    bcmGuid: generateUUID(),
    language: 'EN',
    aimAndScope: purpose || description || '',
    aimScope: purpose || description || '',
    use: '',
    summary: description || purpose || '',
    actorsList: [],
  };

  // Add actors
  if (sendingActor) {
    headerData.actorsList.push({
      id: generateUUID(),
      name: sendingActor,
      role: 'Sending Actor',
      subActors: [],
    });
  }
  if (receivingActor) {
    headerData.actorsList.push({
      id: generateUUID(),
      name: receivingActor,
      role: 'Receiving Actor',
      subActors: [],
    });
  }

  // Parse milestone into target phases
  if (milestone) {
    const phases = milestone.split(',').map(s => s.trim().toLowerCase());
    const iso22263 = {};
    const phaseMap = {
      'inception': 'inception',
      'brief': 'brief',
      'design': 'design',
      'preliminary design': 'design',
      'detailed design': 'design',
      'production': 'production',
      'construction': 'production',
      'handover': 'handover',
      'operation': 'operation',
      'operation and maintenance': 'operation',
      'end-of-life': 'endOfLife',
      'demolition': 'endOfLife',
    };
    for (const p of phases) {
      const mapped = phaseMap[p];
      if (mapped) iso22263[mapped] = true;
    }
    if (Object.keys(iso22263).length > 0) {
      headerData.targetPhases = { iso22263 };
    }
  }

  const erHierarchy = [rootER];
  const totalIUs = informationUnits.reduce((sum, iu) => (iu.subInformationUnits ? sum + iu.subInformationUnits.length : sum), 0);

  return {
    headerData,
    erHierarchy,
    bpmnXml: null, // No BPMN in LOIN
    totalObjectTypes: informationUnits.length,
    totalIUs,
  };
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Detect if XML content is a LOIN file
 */
export function isLoinXml(content) {
  return content.includes('<LOINSpecification') ||
         content.includes('<LevelOfInformationNeed') ||
         content.includes('LevelOfInformationNeed');
}

/**
 * Parse LOIN XML content and return IDM project data
 * Auto-detects schema variant (tumcms, EN 17412-3, ISO 7817-3)
 */
export function parseLoinXml(content) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid XML: ' + parseError.textContent);
  }

  const rootName = doc.documentElement.localName;

  if (rootName === 'LOINSpecification') {
    // tumcms/CEN 17412 format
    return parseTumcmsFormat(doc);
  } else if (rootName === 'LevelOfInformationNeed') {
    // EN 17412-3 or ISO 7817-3 format
    return parseENFormat(doc);
  } else {
    throw new Error(`Unrecognized LOIN root element: <${rootName}>. Expected <LOINSpecification> or <LevelOfInformationNeed>.`);
  }
}
