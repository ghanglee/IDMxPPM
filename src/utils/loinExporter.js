/**
 * LOIN (Level of Information Need) Exporter
 * Generates LOIN XML from IDM specification data
 * Schema: EN 17412 / ISO 7817-1
 * Reference: https://github.com/tumcms/CEN-17412-LOIN-XML-Schema
 */

// Map IDM data types to LOIN property data types
const DATA_TYPE_MAP = {
  'String': 'String',
  'Text': 'String',
  'Numeric': 'Real',
  'Boolean': 'Boolean',
  'Date': 'DateTime',
  'Date/Time': 'DateTime',
  'Integer': 'Integer',
  'Image': 'String',
  'Audio': 'String',
  'Video': 'String',
  'Document': 'String',
  '2D Vector Drawing': 'String',
  '3D Model': 'String',
  'Structured': 'String',
};

// Known IFC entity parent types for subTypeOf
const IFC_PARENT_MAP = {
  // Building elements
  'IfcWall': 'IfcBuildingElement',
  'IfcSlab': 'IfcBuildingElement',
  'IfcBeam': 'IfcBuildingElement',
  'IfcColumn': 'IfcBuildingElement',
  'IfcDoor': 'IfcBuildingElement',
  'IfcWindow': 'IfcBuildingElement',
  'IfcRoof': 'IfcBuildingElement',
  'IfcStair': 'IfcBuildingElement',
  'IfcRamp': 'IfcBuildingElement',
  'IfcCurtainWall': 'IfcBuildingElement',
  'IfcRailing': 'IfcBuildingElement',
  'IfcCovering': 'IfcBuildingElement',
  'IfcPlate': 'IfcBuildingElement',
  'IfcMember': 'IfcBuildingElement',
  'IfcFooting': 'IfcBuildingElement',
  'IfcPile': 'IfcBuildingElement',
  // Spatial elements
  'IfcSpace': 'IfcSpatialElement',
  'IfcBuildingStorey': 'IfcSpatialElement',
  'IfcBuilding': 'IfcSpatialElement',
  'IfcSite': 'IfcSpatialElement',
  // MEP elements
  'IfcFlowTerminal': 'IfcDistributionFlowElement',
  'IfcFlowSegment': 'IfcDistributionFlowElement',
  'IfcFlowFitting': 'IfcDistributionFlowElement',
  'IfcFlowController': 'IfcDistributionFlowElement',
  'IfcFlowMovingDevice': 'IfcDistributionFlowElement',
  'IfcFlowStorageDevice': 'IfcDistributionFlowElement',
  'IfcFlowTreatmentDevice': 'IfcDistributionFlowElement',
  'IfcEnergyConversionDevice': 'IfcDistributionFlowElement',
  // Furnishing
  'IfcFurnishingElement': 'IfcElement',
  'IfcFurniture': 'IfcFurnishingElement',
  // Infrastructure (IFC 4x3)
  'IfcAlignment': 'IfcPositioningElement',
  'IfcRoad': 'IfcFacility',
  'IfcRailway': 'IfcFacility',
  'IfcBridge': 'IfcFacility',
  'IfcMarineFacility': 'IfcFacility',
};

// Generate IFC reference URL
function getIfcRefUrl(entityName) {
  const name = entityName.toLowerCase();
  return `https://standards.buildingsmart.org/IFC/RELEASE/IFC4/ADD2_TC1/HTML/schema/ifcsharedbldgelements/lexical/${name}.htm`;
}

// Escape XML special characters
function escXml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Generate a UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/**
 * Collect all Information Units from the ER hierarchy recursively.
 * For structured parent IUs (dataType "Structured" with subInformationUnits),
 * they are returned as entity groups rather than flat IUs.
 * Each result item is either:
 *   { type: 'structured', parentIU, subIUs, erName } — a structured parent IU representing an entity group
 *   { type: 'regular', iu, erName } — a regular IU to be grouped by external mapping
 */
function collectAllIUItems(erHierarchy) {
  const items = [];

  function walkER(er) {
    if (!er) return;
    if (er.informationUnits && er.informationUnits.length > 0) {
      for (const iu of er.informationUnits) {
        if (iu.dataType === 'Structured' && iu.subInformationUnits && iu.subInformationUnits.length > 0) {
          // Structured parent IU: treat as an entity group
          items.push({ type: 'structured', parentIU: iu, subIUs: iu.subInformationUnits, erName: er.name || 'Unnamed ER' });
        } else {
          // Regular IU
          items.push({ type: 'regular', iu, erName: er.name || 'Unnamed ER' });
          // Also collect sub-IUs recursively as regular IUs
          if (iu.subInformationUnits) {
            collectSubIUs(iu.subInformationUnits, er.name);
          }
        }
      }
    }
    if (er.subERs) {
      for (const subER of er.subERs) {
        walkER(subER);
      }
    }
  }

  function collectSubIUs(subIUs, erName) {
    for (const siu of subIUs) {
      items.push({ type: 'regular', iu: siu, erName });
      if (siu.subInformationUnits) {
        collectSubIUs(siu.subInformationUnits, erName);
      }
    }
  }

  if (Array.isArray(erHierarchy)) {
    for (const er of erHierarchy) {
      walkER(er);
    }
  }
  return items;
}

/**
 * Parse an external element mapping to extract object type and property info.
 * LOIN is schema-agnostic — supports IFC, CityGML, UniFormat, OmniClass, bSDD, and any custom schema.
 * Returns { objectTypeName, psetName, propertyName, classificationRef, dataModelType, schema } or null
 */
function parseMapping(mapping) {
  if (!mapping) return null;

  // Actual data structure: { id, basis, name, description?, customBasis? }
  const schema = mapping.basis || mapping.schema || mapping.standard || '';
  const element = mapping.name || mapping.element || '';

  if (!element) return null;

  const classificationRef = mapping.description || mapping.uri || mapping.url || '';
  const isIfc = schema.includes('IFC') || schema.includes('ifc') || schema.includes('bSDD');

  // IFC Pset property: "Pset_WallCommon.FireRating"
  const psetMatch = element.match(/^(Pset_\w+|Qto_\w+)\.(\w+)$/);
  if (psetMatch) {
    return {
      objectTypeName: null,
      psetName: psetMatch[1],
      propertyName: psetMatch[2],
      classificationRef,
      dataModelType: null,
      schema
    };
  }

  // IFC Pset name alone: "Pset_WallCommon"
  const psetOnlyMatch = element.match(/^(Pset_\w+|Qto_\w+)$/);
  if (psetOnlyMatch) {
    return {
      objectTypeName: null,
      psetName: psetOnlyMatch[1],
      propertyName: null,
      classificationRef,
      dataModelType: null,
      schema
    };
  }

  // IFC entity: "IfcDoor", "IfcWall"
  if (isIfc) {
    const entityMatch = element.match(/^(Ifc\w+)$/);
    if (entityMatch) {
      return {
        objectTypeName: entityMatch[1],
        psetName: null,
        propertyName: null,
        classificationRef,
        dataModelType: entityMatch[1],
        schema
      };
    }
    // bSDD or other IFC property name
    return {
      objectTypeName: null,
      psetName: null,
      propertyName: element,
      classificationRef,
      dataModelType: null,
      schema
    };
  }

  // Non-IFC schemas (CityGML, UniFormat, OmniClass, MasterFormat, Other)
  // Treat the element name as an object type name
  return {
    objectTypeName: element,
    psetName: null,
    propertyName: null,
    classificationRef,
    dataModelType: null,
    schema
  };
}

// Known Pset-to-entity mapping
const PSET_ENTITY_MAP = {
  'Pset_WallCommon': 'IfcWall',
  'Pset_SlabCommon': 'IfcSlab',
  'Pset_BeamCommon': 'IfcBeam',
  'Pset_ColumnCommon': 'IfcColumn',
  'Pset_DoorCommon': 'IfcDoor',
  'Pset_WindowCommon': 'IfcWindow',
  'Pset_SpaceCommon': 'IfcSpace',
  'Pset_BuildingCommon': 'IfcBuilding',
  'Pset_SiteCommon': 'IfcSite',
  'Pset_RoofCommon': 'IfcRoof',
  'Pset_StairCommon': 'IfcStair',
  'Pset_RampCommon': 'IfcRamp',
  'Pset_CurtainWallCommon': 'IfcCurtainWall',
  'Pset_RailingCommon': 'IfcRailing',
  'Pset_CoveringCommon': 'IfcCovering',
  'Pset_PlateCommon': 'IfcPlate',
  'Pset_MemberCommon': 'IfcMember',
  'Pset_FootingCommon': 'IfcFooting',
  'Pset_PileCommon': 'IfcPile',
  'Pset_BuildingStoreyCommon': 'IfcBuildingStorey',
  'Qto_WallBaseQuantities': 'IfcWall',
  'Qto_SlabBaseQuantities': 'IfcSlab',
  'Qto_BeamBaseQuantities': 'IfcBeam',
  'Qto_ColumnBaseQuantities': 'IfcColumn',
  'Qto_DoorBaseQuantities': 'IfcDoor',
  'Qto_WindowBaseQuantities': 'IfcWindow',
  'Qto_SpaceBaseQuantities': 'IfcSpace',
};

/**
 * Generate LOIN XML from IDM project data
 *
 * @param {Object} params
 * @param {Object} params.headerData - IDM header (title, shortTitle, etc.)
 * @param {Object} params.useCaseData - Use case data (actors, phases, aimScope, summary)
 * @param {Array} params.erHierarchy - ER hierarchy tree
 * @returns {{ xml: string, specCount: number, skippedCount: number, totalIUs: number, mappedIUs: number }}
 */
export function generateLoinXml({ headerData, useCaseData, erHierarchy }) {
  const allItems = collectAllIUItems(erHierarchy);

  // Count total IUs (including sub-IUs of structured parents)
  let totalIUs = 0;
  for (const item of allItems) {
    if (item.type === 'structured') {
      totalIUs += item.subIUs.length;
    } else {
      totalIUs++;
    }
  }

  // Group IUs by object type (IFC entity, CityGML element, classification, etc.)
  // Structure: { objectTypeName: { schema, dataModelType, classificationRef, psets: { ... }, standaloneProps: [...] } }
  const entityGroups = {};
  let mappedIUs = 0;
  const unmappedIUs = [];

  /**
   * Process a regular IU into entityGroups based on its external element mappings.
   */
  function processRegularIU(iu, erName) {
    const mappings = iu.correspondingExternalElements || iu.correspondingExternalElement || [];
    if (!mappings || mappings.length === 0) {
      unmappedIUs.push({ name: iu.name, erName });
      return;
    }

    let iuMapped = false;
    for (const mapping of mappings) {
      const parsed = parseMapping(mapping);
      if (!parsed) continue;

      iuMapped = true;

      let objectTypeName = parsed.objectTypeName;
      if (!objectTypeName && parsed.psetName) {
        objectTypeName = PSET_ENTITY_MAP[parsed.psetName] || 'IfcElement';
      }
      if (!objectTypeName) {
        objectTypeName = 'Unspecified';
      }

      if (!entityGroups[objectTypeName]) {
        entityGroups[objectTypeName] = {
          schema: parsed.schema || '',
          dataModelType: parsed.dataModelType || '',
          classificationRef: parsed.classificationRef || '',
          psets: {},
          standaloneProps: []
        };
      }

      const prop = {
        name: parsed.propertyName || iu.name || 'Unnamed',
        dataType: DATA_TYPE_MAP[iu.dataType] || 'String',
        classificationRef: parsed.classificationRef || '',
        unit: iu.unit || '',
      };

      if (parsed.psetName) {
        if (!entityGroups[objectTypeName].psets[parsed.psetName]) {
          entityGroups[objectTypeName].psets[parsed.psetName] = [];
        }
        entityGroups[objectTypeName].psets[parsed.psetName].push(prop);
      } else {
        entityGroups[objectTypeName].standaloneProps.push(prop);
      }
    }

    if (iuMapped) {
      mappedIUs++;
    } else {
      unmappedIUs.push({ name: iu.name, erName });
    }
  }

  for (const item of allItems) {
    if (item.type === 'structured') {
      // Structured parent IU: parent IU name/mapping determines objectType, sub-IUs are properties
      const parentIU = item.parentIU;
      const parentMappings = parentIU.correspondingExternalElements || parentIU.correspondingExternalElement || [];

      // Determine object type name from parent IU
      let objectTypeName = parentIU.name || 'Unspecified';
      let schema = '';
      let dataModelType = '';
      let classificationRef = '';

      if (parentMappings && parentMappings.length > 0) {
        const firstMapping = parentMappings[0];
        const parsed = parseMapping(firstMapping);
        if (parsed) {
          objectTypeName = parsed.objectTypeName || parsed.dataModelType || parentIU.name || 'Unspecified';
          schema = parsed.schema || '';
          dataModelType = parsed.dataModelType || '';
          classificationRef = parsed.classificationRef || '';
        }
      }

      if (!entityGroups[objectTypeName]) {
        entityGroups[objectTypeName] = {
          schema,
          dataModelType,
          classificationRef,
          psets: {},
          standaloneProps: []
        };
      }

      // Process sub-IUs as properties of this entity group
      for (const subIU of item.subIUs) {
        const subMappings = subIU.correspondingExternalElements || subIU.correspondingExternalElement || [];
        let propName = subIU.name || 'Unnamed';
        let propClassificationRef = '';
        let psetName = null;

        if (subMappings && subMappings.length > 0) {
          const subParsed = parseMapping(subMappings[0]);
          if (subParsed) {
            propClassificationRef = subParsed.classificationRef || '';
            if (subParsed.psetName) {
              psetName = subParsed.psetName;
              propName = subParsed.propertyName || subIU.name || 'Unnamed';
            } else if (subParsed.propertyName) {
              propName = subParsed.propertyName;
            }
          }
        }

        const prop = {
          name: propName,
          dataType: DATA_TYPE_MAP[subIU.dataType] || 'String',
          classificationRef: propClassificationRef,
          unit: subIU.unit || '',
        };

        if (psetName) {
          if (!entityGroups[objectTypeName].psets[psetName]) {
            entityGroups[objectTypeName].psets[psetName] = [];
          }
          entityGroups[objectTypeName].psets[psetName].push(prop);
        } else {
          entityGroups[objectTypeName].standaloneProps.push(prop);
        }
        mappedIUs++;
      }
    } else {
      // Regular IU: process as before
      processRegularIU(item.iu, item.erName);
    }
  }

  const specCount = Object.keys(entityGroups).length;
  const skippedCount = unmappedIUs.length;

  // Extract context from use case data
  const actors = useCaseData?.actors || [];
  const sendingActor = actors.length > 0 ? (actors[0].name || '') : '';
  const receivingActor = actors.length > 1 ? (actors[1].name || '') : '';
  const purpose = useCaseData?.aimScope || useCaseData?.use || '';

  // Get project phases
  const phases = useCaseData?.targetPhases || useCaseData?.projectPhases || {};
  const selectedPhases = [];
  if (phases.iso22263) {
    for (const [phase, selected] of Object.entries(phases.iso22263)) {
      if (selected) selectedPhases.push(phase);
    }
  }
  const milestone = selectedPhases.join(', ') || '';

  // Build XML
  const loinGuid = headerData?.idmGuid || generateUUID();
  const loinName = headerData?.shortTitle || headerData?.fullTitle || 'IDM Specification';
  const description = headerData?.fullTitle || '';

  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  xml += `<LOINSpecification globalId="${escXml(loinGuid)}" name="${escXml(loinName)}">\n`;

  if (description) {
    xml += `    <description>${escXml(description)}</description>\n`;
  }

  // Context
  xml += `    <context`;
  if (purpose) xml += ` purpose="${escXml(purpose)}"`;
  if (milestone) xml += ` informationDeliveryMileStone="${escXml(milestone)}"`;
  if (sendingActor) xml += ` sendingActor="${escXml(sendingActor)}"`;
  if (receivingActor) xml += ` receivingActor="${escXml(receivingActor)}"`;
  xml += `/>\n`;

  // Generate specificationPerObjectType for each object type
  for (const [objectTypeName, group] of Object.entries(entityGroups)) {
    const specGuid = generateUUID();
    xml += `    <specificationPerObjectTypeList globalId="${specGuid}">\n`;

    // objectType — use IFC-specific metadata if available, otherwise generic
    const isIfcEntity = objectTypeName.startsWith('Ifc');
    const parentEntity = isIfcEntity ? IFC_PARENT_MAP[objectTypeName] : null;
    const refToDataModelType = group.dataModelType || (isIfcEntity ? objectTypeName : '');
    const refToClassification = group.classificationRef || (isIfcEntity ? getIfcRefUrl(objectTypeName) : '');

    xml += `        <objectType name="${escXml(objectTypeName)}"`;
    if (refToDataModelType) xml += ` refToDataModelType="${escXml(refToDataModelType)}"`;
    if (refToClassification) xml += ` refToClassification="${escXml(refToClassification)}"`;
    xml += `>\n`;
    if (parentEntity) {
      xml += `            <subTypeOf name="${escXml(parentEntity)}" refToDataModelType="${escXml(parentEntity)}"/>\n`;
    }
    xml += `        </objectType>\n`;

    // alphanumericInformationSpecification
    const hasPsets = Object.keys(group.psets).length > 0;
    const hasStandaloneProps = group.standaloneProps.length > 0;

    if (hasPsets || hasStandaloneProps) {
      xml += `        <alphanumericInformationSpecification>\n`;
      xml += `            <Description>Information requirements for ${escXml(objectTypeName)}</Description>\n`;

      // Property sets
      if (hasPsets) {
        xml += `            <propertySets>\n`;
        for (const [psetName, props] of Object.entries(group.psets)) {
          xml += `                <propertySet name="${escXml(psetName)}">\n`;
          xml += `                    <properties>\n`;
          for (const prop of props) {
            xml += `                        <property name="${escXml(prop.name)}"`;
            if (prop.classificationRef) xml += ` refToClassification="${escXml(prop.classificationRef)}"`;
            xml += `>\n`;
            if (prop.unit) xml += `                            <unit>${escXml(prop.unit)}</unit>\n`;
            xml += `                            <dataType>${escXml(prop.dataType)}</dataType>\n`;
            xml += `                        </property>\n`;
          }
          xml += `                    </properties>\n`;
          xml += `                </propertySet>\n`;
        }
        xml += `            </propertySets>\n`;
      }

      // Standalone properties
      if (hasStandaloneProps) {
        xml += `            <properties>\n`;
        for (const prop of group.standaloneProps) {
          xml += `                <property name="${escXml(prop.name)}"`;
          if (prop.classificationRef) xml += ` refToClassification="${escXml(prop.classificationRef)}"`;
          xml += `>\n`;
          if (prop.unit) xml += `                    <unit>${escXml(prop.unit)}</unit>\n`;
          xml += `                    <dataType>${escXml(prop.dataType)}</dataType>\n`;
          xml += `                </property>\n`;
        }
        xml += `            </properties>\n`;
      }

      xml += `        </alphanumericInformationSpecification>\n`;
    }

    xml += `    </specificationPerObjectTypeList>\n`;
  }

  xml += `</LOINSpecification>\n`;

  return {
    xml,
    specCount,
    skippedCount,
    totalIUs,
    mappedIUs,
  };
}
