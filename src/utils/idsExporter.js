/**
 * IDS (Information Delivery Specification) Exporter
 * Generates IDS v1.0 XML from IDM Exchange Requirements
 * Schema: http://standards.buildingsmart.org/IDS/1.0/ids.xsd
 */

// Map IDM data types to IFC defined types
const DATA_TYPE_MAP = {
  'String': 'IFCLABEL',
  'Text': 'IFCTEXT',
  'Numeric': 'IFCREAL',
  'Boolean': 'IFCBOOLEAN',
  'Date': 'IFCDATE',
  'Date/Time': 'IFCDATE',
  'Integer': 'IFCINTEGER',
  'Image': 'IFCLABEL',
  'Document': 'IFCLABEL',
  '2D Vector Drawing': 'IFCLABEL',
  '3D Model': 'IFCLABEL',
};

// Map Pset names to their associated IFC entity (UPPERCASE)
const PSET_ENTITY_MAP = {
  'Pset_WallCommon': 'IFCWALL',
  'Pset_SlabCommon': 'IFCSLAB',
  'Pset_BeamCommon': 'IFCBEAM',
  'Pset_ColumnCommon': 'IFCCOLUMN',
  'Pset_DoorCommon': 'IFCDOOR',
  'Pset_WindowCommon': 'IFCWINDOW',
  'Pset_SpaceCommon': 'IFCSPACE',
  'Pset_BuildingCommon': 'IFCBUILDING',
  'Pset_SiteCommon': 'IFCSITE',
  'Pset_RoofCommon': 'IFCROOF',
  'Pset_StairCommon': 'IFCSTAIR',
  'Pset_RampCommon': 'IFCRAMP',
  'Pset_CurtainWallCommon': 'IFCCURTAINWALL',
  'Pset_RailingCommon': 'IFCRAILING',
  'Pset_CoveringCommon': 'IFCCOVERING',
  'Pset_PlateCommon': 'IFCPLATE',
  'Pset_MemberCommon': 'IFCMEMBER',
  'Pset_FootingCommon': 'IFCFOOTING',
  'Pset_PileCommon': 'IFCPILE',
  'Pset_BuildingStoreyCommon': 'IFCBUILDINGSTOREY',
  'Qto_WallBaseQuantities': 'IFCWALL',
  'Qto_SlabBaseQuantities': 'IFCSLAB',
  'Qto_BeamBaseQuantities': 'IFCBEAM',
  'Qto_ColumnBaseQuantities': 'IFCCOLUMN',
  'Qto_DoorBaseQuantities': 'IFCDOOR',
  'Qto_WindowBaseQuantities': 'IFCWINDOW',
  'Qto_SpaceBaseQuantities': 'IFCSPACE',
};

// Map IFC entity names to uppercase IDS names
function toIdsEntityName(ifcName) {
  if (!ifcName) return null;
  // Already uppercase
  if (ifcName === ifcName.toUpperCase()) return ifcName;
  // Convert IfcWall -> IFCWALL
  return ifcName.toUpperCase();
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Process a single IU's external element mappings to extract entity candidates and facets.
 * Used for regular (non-structured) IUs.
 */
function processIUMappings(iu, entityCandidates, facets) {
  if (!iu) return;

  const mappings = iu.correspondingExternalElements || iu.correspondingExternalElement || iu.externalElements || [];
  for (const mapping of mappings) {
    const schema = mapping.basis || mapping.schema || mapping.standard || '';
    const element = mapping.element || mapping.name || '';

    if (schema.includes('IFC') || schema.includes('ifc')) {
      // Check if it's a Pset reference (contains a dot: Pset_WallCommon.FireRating)
      if (element.includes('.')) {
        const [psetName, propName] = element.split('.');
        const entity = PSET_ENTITY_MAP[psetName];
        if (entity) entityCandidates.add(entity);
        facets.push({
          type: 'property',
          propertySet: psetName,
          baseName: propName,
          dataType: DATA_TYPE_MAP[iu.dataType] || 'IFCLABEL',
          cardinality: iu.isMandatory ? 'required' : 'optional',
          instructions: iu.definition || '',
          uri: mapping.uri || '',
        });
      } else if (element.startsWith('Pset_') || element.startsWith('Qto_')) {
        // Just a Pset name without property — treat as property set reference
        const entity = PSET_ENTITY_MAP[element];
        if (entity) entityCandidates.add(entity);
      } else if (element.startsWith('Ifc') || element.startsWith('IFC')) {
        // Direct IFC entity reference
        entityCandidates.add(toIdsEntityName(element));
      }
    }
    // Non-IFC schemas are skipped — IDS is strictly IFC-bound.
  }

  // Process sub-IUs recursively (for non-structured IUs that happen to have children)
  const subIUs = iu.subInformationUnits || iu.children || [];
  for (const subIU of subIUs) {
    processIUMappings(subIU, entityCandidates, facets);
  }
}

/**
 * Collect all ERs (with IUs) from the hierarchy, flattened
 */
function collectAllERs(erHierarchy) {
  const allERs = [];

  const walk = (ers) => {
    for (const er of ers) {
      const hasIUs = er.informationUnits && er.informationUnits.length > 0;

      if (hasIUs) {
        allERs.push(er);
      }
      if (er.subERs && er.subERs.length > 0) {
        walk(er.subERs);
      }
    }
  };

  walk(erHierarchy);
  return allERs;
}

/**
 * Analyze an ER's IUs and generate IDS specifications.
 * - Structured parent IUs (dataType "Structured" with subInformationUnits):
 *   The parent IU's entity mapping gives the applicability, sub-IUs give the facets.
 * - Regular IUs: processed as before by scanning their own mappings.
 * Returns an array of { entity, facets, name, description, id } specification objects.
 */
function analyzeERForSpecs(er) {
  const specs = [];
  const ius = er.informationUnits || [];

  // Collect regular (non-structured) IUs
  const regularIUs = [];

  for (const iu of ius) {
    if (iu.dataType === 'Structured' && iu.subInformationUnits && iu.subInformationUnits.length > 0) {
      // Structured parent IU: treat as its own specification
      const entityCandidates = new Set();
      const facets = [];

      // Get entity from the parent IU's own mappings
      const parentMappings = iu.correspondingExternalElements || iu.correspondingExternalElement || [];
      for (const mapping of parentMappings) {
        const element = mapping.element || mapping.name || '';
        if (element.startsWith('Ifc') || element.startsWith('IFC')) {
          entityCandidates.add(toIdsEntityName(element));
        }
      }

      // Process sub-IUs as facets
      for (const subIU of iu.subInformationUnits) {
        processIUMappings(subIU, entityCandidates, facets);
      }

      if (facets.length > 0) {
        specs.push({
          entity: entityCandidates.size > 0 ? Array.from(entityCandidates)[0] : null,
          facets,
          name: iu.name || er.name || 'Unnamed',
          description: iu.definition || '',
          id: iu.id || '',
        });
      }
    } else {
      regularIUs.push(iu);
    }
  }

  // Process remaining regular IUs as a single specification (legacy behavior)
  if (regularIUs.length > 0) {
    const entityCandidates = new Set();
    const facets = [];
    for (const iu of regularIUs) {
      processIUMappings(iu, entityCandidates, facets);
    }
    if (facets.length > 0) {
      specs.push({
        entity: entityCandidates.size > 0 ? Array.from(entityCandidates)[0] : null,
        facets,
        name: er.name || 'Unnamed',
        description: er.description || er.definition || '',
        id: er.guid || er.id || '',
      });
    }
  }

  return specs;
}

/**
 * Generate IDS v1.0 XML from IDM project data
 *
 * @param {Object} params
 * @param {Object} params.headerData - IDM header (title, shortTitle, authors, version, copyright)
 * @param {Array} params.erHierarchy - ER hierarchy (source of truth)
 * @param {string} params.ifcVersion - Target IFC version: 'IFC2X3', 'IFC4', 'IFC4X3_ADD2'
 * @returns {{ xml: string, specCount: number, skippedCount: number }}
 */
export function generateIdsXml({ headerData, erHierarchy, ifcVersion = 'IFC4X3_ADD2' }) {
  const allERs = collectAllERs(erHierarchy || []);

  // Extract author email from headerData
  const authorEmail = (() => {
    if (headerData.authors && headerData.authors.length > 0) {
      const first = headerData.authors[0];
      if (first.uri && first.uri.includes('@')) return first.uri;
    }
    return '';
  })();

  const today = new Date().toISOString().split('T')[0];

  // Build info section
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<ids:ids xmlns:ids="http://standards.buildingsmart.org/IDS" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://standards.buildingsmart.org/IDS http://standards.buildingsmart.org/IDS/1.0/ids.xsd">\n`;
  xml += `  <ids:info>\n`;
  xml += `    <ids:title>${escapeXml(headerData.title || headerData.shortTitle || 'IDM Specification')}</ids:title>\n`;
  if (headerData.copyright) {
    xml += `    <ids:copyright>${escapeXml(headerData.copyright)}</ids:copyright>\n`;
  }
  if (headerData.version) {
    xml += `    <ids:version>${escapeXml(headerData.version)}</ids:version>\n`;
  }
  if (headerData.title) {
    xml += `    <ids:description>${escapeXml(headerData.title)}</ids:description>\n`;
  }
  if (authorEmail) {
    xml += `    <ids:author>${escapeXml(authorEmail)}</ids:author>\n`;
  }
  xml += `    <ids:date>${today}</ids:date>\n`;
  xml += `  </ids:info>\n`;
  xml += `  <ids:specifications>\n`;

  let specCount = 0;
  let skippedCount = 0;

  for (const er of allERs) {
    const specs = analyzeERForSpecs(er);

    if (specs.length === 0) {
      skippedCount++;
      continue;
    }

    for (const spec of specs) {
      specCount++;

      const specName = escapeXml(spec.name || `Spec_${specCount}`);
      const specDesc = spec.description || '';
      const specId = spec.id || '';

      xml += `    <ids:specification name="${specName}" ifcVersion="${ifcVersion}"`;
      if (specId) xml += ` identifier="${escapeXml(specId)}"`;
      if (specDesc) xml += ` description="${escapeXml(specDesc)}"`;
      xml += `>\n`;

      // Applicability
      xml += `      <ids:applicability minOccurs="0" maxOccurs="unbounded">\n`;
      if (spec.entity) {
        xml += `        <ids:entity>\n`;
        xml += `          <ids:name>\n`;
        xml += `            <ids:simpleValue>${spec.entity}</ids:simpleValue>\n`;
        xml += `          </ids:name>\n`;
        xml += `        </ids:entity>\n`;
      }
      xml += `      </ids:applicability>\n`;

      // Requirements
      if (spec.facets.length > 0) {
        xml += `      <ids:requirements>\n`;

        for (const facet of spec.facets) {
          if (facet.type === 'property') {
            xml += `        <ids:property cardinality="${facet.cardinality}"`;
            if (facet.dataType) xml += ` dataType="${facet.dataType}"`;
            if (facet.instructions) xml += ` instructions="${escapeXml(facet.instructions)}"`;
            if (facet.uri) xml += ` uri="${escapeXml(facet.uri)}"`;
            xml += `>\n`;
            xml += `          <ids:propertySet>\n`;
            xml += `            <ids:simpleValue>${escapeXml(facet.propertySet)}</ids:simpleValue>\n`;
            xml += `          </ids:propertySet>\n`;
            xml += `          <ids:baseName>\n`;
            xml += `            <ids:simpleValue>${escapeXml(facet.baseName)}</ids:simpleValue>\n`;
            xml += `          </ids:baseName>\n`;
            xml += `        </ids:property>\n`;
          } else if (facet.type === 'classification') {
            xml += `        <ids:classification cardinality="${facet.cardinality}"`;
            if (facet.instructions) xml += ` instructions="${escapeXml(facet.instructions)}"`;
            xml += `>\n`;
            xml += `          <ids:value>\n`;
            xml += `            <ids:simpleValue>${escapeXml(facet.value)}</ids:simpleValue>\n`;
            xml += `          </ids:value>\n`;
            xml += `          <ids:system>\n`;
            xml += `            <ids:simpleValue>${escapeXml(facet.system)}</ids:simpleValue>\n`;
            xml += `          </ids:system>\n`;
            xml += `        </ids:classification>\n`;
          }
        }

        xml += `      </ids:requirements>\n`;
      }

      xml += `    </ids:specification>\n`;
    }
  }

  // If no specs were generated, add an empty placeholder comment
  if (specCount === 0) {
    xml += `    <!-- No IFC-mappable Exchange Requirements found -->\n`;
  }

  xml += `  </ids:specifications>\n`;
  xml += `</ids:ids>\n`;

  return { xml, specCount, skippedCount };
}
