/**
 * IDS v1.0 Exporter
 * Generates IDS XML from IDM Exchange Requirements, compliant with the
 * buildingSMART IDS v1.0 schema.
 *
 * Schema: http://standards.buildingsmart.org/IDS/1.0/ids.xsd
 *
 * Round-trip notes:
 *   author email recovered from author.uri; author.givenName checked as fallback
 *   for hand-authored projects and files imported before the uri-storage fix.
 *   IFC entity names are uppercased (IFCWALL) per IDS XSD requirement.
 *   Per-spec ifcVersion recovered from _idsApplicability.ifcVersion (set by importer).
 *   _idsDataType: '' means the source had no dataType attribute — suppress on re-export.
 *   _idsMaterial / _idsClassification / _idsPartOf: generate correct facet types.
 */

// Fallback map: IDM generic data types → IFC defined types
// Used only when the original IFC type cannot be recovered from iu.definition
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

// Map standard Pset/Qto names to their associated IFC entity (UPPERCASE)
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
  'Pset_SpaceOccupancyRequirements': 'IFCSPACE',
  'Pset_SpaceFireSafetyRequirements': 'IFCSPACE',
  'Pset_StairFlightCommon': 'IFCSTAIRFLIGHT',
  'Pset_RampFlightCommon': 'IFCRAMPFLIGHT',
  'Qto_WallBaseQuantities': 'IFCWALL',
  'Qto_SlabBaseQuantities': 'IFCSLAB',
  'Qto_BeamBaseQuantities': 'IFCBEAM',
  'Qto_ColumnBaseQuantities': 'IFCCOLUMN',
  'Qto_DoorBaseQuantities': 'IFCDOOR',
  'Qto_WindowBaseQuantities': 'IFCWINDOW',
  'Qto_SpaceBaseQuantities': 'IFCSPACE',
};

function toIdsEntityName(ifcName) {
  if (!ifcName) return null;
  if (ifcName === ifcName.toUpperCase()) return ifcName;
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
 * Extract a constraint description string from an IU's constraints field.
 * Handles both the new array format [{id, description, businessRule}] and the
 * legacy plain string format stored by older versions / mvdXML imports.
 * For IDS export only the first constraint maps to <ids:value> (IDS supports one value per facet).
 */
function constraintStr(constraints) {
  if (Array.isArray(constraints)) return (constraints[0]?.description) || '';
  return constraints || '';
}

/**
 * Extract the instructions text for a facet.
 * Priority:
 *  1. _idsInstructions — faithful roundtrip of the original IDS instructions attribute.
 *  2. businessRule on the first constraint — user-assigned IDM business rule reference.
 *  3. Definition-based extraction for hand-authored IUs (strips metadata lines).
 */
function extractInstructions(iu) {
  if (iu._idsInstructions != null) return iu._idsInstructions;
  // Business rule from the constraint array maps to the IDS instructions attribute
  if (Array.isArray(iu.constraints) && iu.constraints.length > 0) {
    const br = iu.constraints[0].businessRule;
    if (br) return br;
  }
  return (iu.definition || '').split('\n')
    .filter(l => !l.match(/^(IFC Data Type:|Applies to:|IFC Version:|Applicability:|IFC attribute of|Must be part of|Relation:|PredefinedType:)/))
    .join('\n').trim();
}

/**
 * Extract the original IFC data type from an IU's definition field.
 * The importer stores it as "IFC Data Type: IFCLENGTHMEASURE".
 * Falls back to the generic DATA_TYPE_MAP when not present.
 */
function extractIfcDataType(iu) {
  const defMatch = (iu.definition || '').match(/IFC Data Type:\s*(\S+)/i);
  if (defMatch) return defMatch[1].toUpperCase();
  return DATA_TYPE_MAP[iu.dataType] || 'IFCLABEL';
}

/**
 * Build an <ids:value> XML block from constraints and/or a simple value (examples).
 *
 * constraints formats written by the importer:
 *   "Allowed values: A, B, C"     → xs:enumeration (single value collapses to simpleValue)
 *   "Pattern: [\S\s]+[\S]+"       → xs:pattern
 *   "Range: > 0"                  → xs:minExclusive / xs:maxExclusive etc.
 *   Any of the above may have a second line: "\nAnnotation text" → xs:annotation/documentation
 *
 * examples: used when the source had <ids:simpleValue> (no restriction).
 */
function buildValueXml(constraints, examples, indent) {
  // SimpleValue: only when no restriction constraints
  if (!constraints && examples) {
    return `${indent}<ids:value>\n${indent}  <ids:simpleValue>${escapeXml(examples)}</ids:simpleValue>\n${indent}</ids:value>\n`;
  }

  if (!constraints) return '';

  // Split off annotation: first line is the constraint spec, subsequent lines are annotation text
  const newlineIdx = constraints.indexOf('\n');
  const mainConstraint = newlineIdx >= 0 ? constraints.substring(0, newlineIdx).trim() : constraints.trim();
  const annotation = newlineIdx >= 0 ? constraints.substring(newlineIdx + 1).trim() : '';

  function annotationXml(ind) {
    if (!annotation) return '';
    return `${ind}  <xs:annotation>\n${ind}    <xs:documentation>${escapeXml(annotation)}</xs:documentation>\n${ind}  </xs:annotation>\n`;
  }

  // Enumeration: "Allowed values: A, B, C"
  const allowedMatch = mainConstraint.match(/^Allowed values:\s*(.+)/i);
  if (allowedMatch) {
    const values = allowedMatch[1].split(',').map(v => v.trim()).filter(Boolean);
    if (values.length === 1) {
      return `${indent}<ids:value>\n${indent}  <ids:simpleValue>${escapeXml(values[0])}</ids:simpleValue>\n${indent}</ids:value>\n`;
    }
    let xml = `${indent}<ids:value>\n${indent}  <xs:restriction base="xs:string">\n`;
    xml += annotationXml(indent + '  ');
    for (const v of values) {
      xml += `${indent}    <xs:enumeration value="${escapeXml(v)}"/>\n`;
    }
    xml += `${indent}  </xs:restriction>\n${indent}</ids:value>\n`;
    return xml;
  }

  // Pattern: "Pattern: [\S\s]+[\S]+"
  const patternMatch = mainConstraint.match(/^Pattern:\s*(.+)/i);
  if (patternMatch) {
    const pattern = patternMatch[1];
    let xml = `${indent}<ids:value>\n${indent}  <xs:restriction base="xs:string">\n`;
    xml += annotationXml(indent + '  ');
    xml += `${indent}    <xs:pattern value="${escapeXml(pattern)}"/>\n`;
    xml += `${indent}  </xs:restriction>\n${indent}</ids:value>\n`;
    return xml;
  }

  // Range: "Range: > 0", "Range (xs:integer): > 0", "Range: > 0 and < 100"
  const rangeMatch = mainConstraint.match(/^Range(?:\s*\(([^)]+)\))?\s*:\s*(.+)/i);
  if (rangeMatch) {
    const rangeBase = rangeMatch[1] || 'xs:double';
    const rangeParts = rangeMatch[2].split(/\s+and\s+/i);
    let xml = `${indent}<ids:value>\n${indent}  <xs:restriction base="${rangeBase}">\n`;
    xml += annotationXml(indent + '  ');
    for (const part of rangeParts) {
      const p = part.trim();
      if (p.startsWith('>= ')) {
        xml += `${indent}    <xs:minInclusive value="${escapeXml(p.substring(3))}"/>\n`;
      } else if (p.startsWith('> ')) {
        xml += `${indent}    <xs:minExclusive value="${escapeXml(p.substring(2))}"/>\n`;
      } else if (p.startsWith('<= ')) {
        xml += `${indent}    <xs:maxInclusive value="${escapeXml(p.substring(3))}"/>\n`;
      } else if (p.startsWith('< ')) {
        xml += `${indent}    <xs:maxExclusive value="${escapeXml(p.substring(2))}"/>\n`;
      }
    }
    xml += `${indent}  </xs:restriction>\n${indent}</ids:value>\n`;
    return xml;
  }

  return '';
}

/**
 * Process a single IU's external element mappings to extract entity candidates and facets.
 *
 * Key logic:
 * - _idsPartOf  marker  → <ids:partOf> facet (short-circuits other processing)
 * - _idsMaterial marker → <ids:material> facet
 * - _idsClassification  → <ids:classification> facet
 * - "ClassName.AttrName" with description="IFC Attribute" → <ids:attribute> facet (E-2)
 * - "PsetName.PropName" without that description         → <ids:property> facet
 * - Bare attribute name (no dot) with description="IFC Attribute" → <ids:attribute> (E-3)
 * - Bare Pset/Qto/Ifc name (no dot)                     → entity candidate only
 */
function resolveCardinality(iu) {
  // _idsCardinality: null = not specified in source (omit attribute), string = explicit value
  if ('_idsCardinality' in iu) return iu._idsCardinality;          // null | 'required' | 'optional'
  return iu.isMandatory ? 'required' : 'optional';                 // fallback for hand-authored IUs
}

function processIUMappings(iu, entityCandidates, facets) {
  if (!iu) return;

  // --- Special facet types set by the importer --- //

  if (iu._idsPartOf) {
    const p = iu._idsPartOf;
    facets.push({
      type: 'partOf',
      relation: p.relation,
      parentEntity: p.parentEntity,            // UPPERCASE (IFCELEMENTASSEMBLY)
      parentPredefinedType: p.parentPredefinedType || '',
      cardinality: p.cardinality,              // null = not specified in source
      instructions: p.instructions || null,
    });
    return;
  }

  if (iu._idsMaterial) {
    const matMeta = typeof iu._idsMaterial === 'object' ? iu._idsMaterial : {};
    facets.push({
      type: 'material',
      constraints: constraintStr(iu.constraints),
      examples: iu.examples || '',
      cardinality: resolveCardinality(iu),
      uri: matMeta.uri || null,
      instructions: matMeta.instructions || null,
    });
    return;
  }

  if (iu._idsClassification) {
    facets.push({
      type: 'classification',
      system: iu._idsClassification.system,
      uri: iu._idsClassification.uri || null,
      instructions: iu._idsClassification.instructions || null,
      constraints: constraintStr(iu.constraints),
      examples: iu.examples || '',
      cardinality: resolveCardinality(iu),
    });
    return;
  }

  // --- Standard mapping-based facet detection --- //

  const mappings = iu.correspondingExternalElements || iu.correspondingExternalElement || iu.externalElements || [];

  for (const mapping of mappings) {
    const schema = mapping.basis || mapping.schema || mapping.standard || '';
    const element = mapping.element || mapping.name || '';
    const isIfcAttribute = mapping.description === 'IFC Attribute';

    if (schema.includes('IFC') || schema.includes('ifc')) {
      if (element.includes('.')) {
        const dotIdx = element.indexOf('.');
        const left = element.substring(0, dotIdx);
        const right = element.substring(dotIdx + 1);

        // Treat as IFC attribute when explicitly flagged OR when left is an IFC entity class
        // (Ifc-prefixed names are entity classes; Pset_/Qto_-prefixed names are property sets)
        if (isIfcAttribute || left.startsWith('Ifc') || left.startsWith('IFC')) {
          // "IfcWindowPanelProperties.PanelOperation" — left is IFC class, right is attribute name
          entityCandidates.add(toIdsEntityName(left));

          // Determine the effective dataType for this attribute IU ('' = no dataType in source)
          const dataTypeRaw = '_idsDataType' in iu ? iu._idsDataType : null;
          facets.push({
            type: 'attribute',
            name: right,
            cardinality: resolveCardinality(iu),
            instructions: extractInstructions(iu),
            constraints: constraintStr(iu.constraints),
            examples: iu.examples || '',
            dataTypeRaw,
          });
        } else {
          // "Pset_DoorCommon.FireExit" — left is property set
          const entity = PSET_ENTITY_MAP[left];
          if (entity) entityCandidates.add(entity);
          // Recover original URI from description when it starts with http
          const uri = (mapping.description && mapping.description.startsWith('http'))
            ? mapping.description
            : (mapping.uri || '');
          // Use all stored pset names when available (preserves multi-pset xs:restriction)
          const propertySets = (iu._idsPropertySets && iu._idsPropertySets.length > 0)
            ? iu._idsPropertySets
            : [left];

          // Determine the effective dataType: '' = absent in source, null = hand-authored fallback
          const dataTypeRaw = '_idsDataType' in iu ? iu._idsDataType : null;
          facets.push({
            type: 'property',
            propertySet: left,
            propertySets,
            baseName: right,
            dataType: extractIfcDataType(iu),
            dataTypeRaw,                       // '' = omit on re-export; null = use computed dataType
            cardinality: resolveCardinality(iu),
            instructions: extractInstructions(iu),
            uri,
            constraints: constraintStr(iu.constraints),
            examples: iu.examples || '',
          });
        }
      } else if (isIfcAttribute) {
        // Bare attribute name — no class prefix available (older .idm or unresolved entity)
        const dataTypeRaw = '_idsDataType' in iu ? iu._idsDataType : null;
        facets.push({
          type: 'attribute',
          name: element,
          cardinality: resolveCardinality(iu),
          instructions: extractInstructions(iu),
          constraints: iu.constraints || '',
          examples: iu.examples || '',
          dataTypeRaw,
        });
      } else if (element.startsWith('Pset_') || element.startsWith('Qto_')) {
        const entity = PSET_ENTITY_MAP[element];
        if (entity) entityCandidates.add(entity);
      } else if (element.startsWith('Ifc') || element.startsWith('IFC')) {
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
      if (er.informationUnits && er.informationUnits.length > 0) allERs.push(er);
      if (er.subERs && er.subERs.length > 0) walk(er.subERs);
    }
  };
  walk(erHierarchy);
  return allERs;
}

/**
 * Analyze an ER's IUs and generate IDS specification objects.
 * Structured parent IUs (dataType "Structured") each become one specification.
 * Regular IUs are pooled into a single specification (legacy behaviour).
 */
function analyzeERForSpecs(er) {
  const specs = [];
  const ius = er.informationUnits || [];
  const regularIUs = [];

  for (const iu of ius) {
    if (iu.dataType === 'Structured' && iu.subInformationUnits && iu.subInformationUnits.length > 0) {
      const entityCandidates = new Set();
      const facets = [];

      // Prefer _idsApplicability (set by importer) for faithful entity/predefinedType reconstruction
      const idsAppl = iu._idsApplicability || {};
      const applEntities = Array.isArray(idsAppl.entities) ? idsAppl.entities : [];
      const applPredefinedType = idsAppl.predefinedType || '';
      const minOccurs = (idsAppl.minOccurs != null) ? idsAppl.minOccurs : (iu.isMandatory ? 1 : 0);
      const maxOccurs = idsAppl.maxOccurs || 'unbounded';
      const specIfcVersion = idsAppl.ifcVersion || null;   // null = use global ifcVersion param
      const materialApplicability = Array.isArray(idsAppl.materialApplicability)
        ? idsAppl.materialApplicability : [];
      const classificationApplicability = Array.isArray(idsAppl.classificationApplicability)
        ? idsAppl.classificationApplicability : [];
      const propertyApplicability = Array.isArray(idsAppl.propertyApplicability)
        ? idsAppl.propertyApplicability : [];
      const attributeApplicability = Array.isArray(idsAppl.attributeApplicability)
        ? idsAppl.attributeApplicability : [];
      const partOfApplicability = Array.isArray(idsAppl.partOfApplicability)
        ? idsAppl.partOfApplicability : [];

      // Seed entity candidates from _idsApplicability
      for (const en of applEntities) {
        const upper = toIdsEntityName(en);
        if (upper) entityCandidates.add(upper);
      }

      // Also scan parent IU's own correspondingExternalElements
      for (const mapping of (iu.correspondingExternalElements || [])) {
        const element = mapping.element || mapping.name || '';
        if (element.startsWith('Ifc') || element.startsWith('IFC')) {
          entityCandidates.add(toIdsEntityName(element));
        }
      }

      // Process sub-IUs as facets (also contributes to entityCandidates via pset lookup)
      for (const subIU of iu.subInformationUnits) {
        processIUMappings(subIU, entityCandidates, facets);
      }

      // Emit spec when there is something meaningful to write (E-1: no longer suppressed on 0 facets)
      if (facets.length > 0 || entityCandidates.size > 0) {
        const entityArr = Array.from(entityCandidates);
        // Use _idsApplicability entity list when available (preserves multi-entity order)
        const exportEntities = applEntities.length > 0
          ? applEntities.map(e => toIdsEntityName(e)).filter(Boolean)
          : entityArr;

        specs.push({
          entities: exportEntities,
          predefinedType: applPredefinedType,
          minOccurs,
          maxOccurs,
          specIfcVersion,
          materialApplicability,
          classificationApplicability,
          propertyApplicability,
          attributeApplicability,
          partOfApplicability,
          facets,
          name: iu.name || er.name || 'Unnamed',
          // Use preserved original values; null = absent in source (omit on re-export)
          specDescription: '_idsSpecDescription' in iu ? iu._idsSpecDescription
            : (iu.definition || '').split('\n')[0],
          specIdentifier: '_idsSpecIdentifier' in iu ? iu._idsSpecIdentifier : (iu.id || null),
          specInstructions: '_idsSpecInstructions' in iu ? iu._idsSpecInstructions : null,
          requirementsDescription: '_idsRequirementsDescription' in iu ? iu._idsRequirementsDescription : null,
          entityRequirementsInstructions: '_idsEntityRequirementsInstructions' in iu ? iu._idsEntityRequirementsInstructions : null,
        });
      }
    } else {
      regularIUs.push(iu);
    }
  }

  // Legacy: pool remaining regular IUs into one spec
  if (regularIUs.length > 0) {
    const entityCandidates = new Set();
    const facets = [];
    for (const iu of regularIUs) {
      processIUMappings(iu, entityCandidates, facets);
    }
    if (facets.length > 0) {
      const entityArr = Array.from(entityCandidates);
      specs.push({
        entities: entityArr,
        predefinedType: '',
        minOccurs: 0,
        specIfcVersion: null,
        materialApplicability: [],
        facets,
        name: er.name || 'Unnamed',
        description: ((er.description || er.definition || '')).split('\n')[0],
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
 * @param {Array}  params.erHierarchy - ER hierarchy (source of truth)
 * @param {string} params.ifcVersion  - Target IFC version: 'IFC2X3', 'IFC4', 'IFC4X3_ADD2'
 *                                      Used only when a spec has no per-spec ifcVersion.
 * @returns {{ xml: string, specCount: number, skippedCount: number }}
 */
export function generateIdsXml({ headerData, erHierarchy, ifcVersion = 'IFC4X3_ADD2' }) {
  const allERs = collectAllERs(erHierarchy || []);

  const authorEmail = (() => {
    for (const a of headerData.authors || []) {
      if (a.uri && a.uri.includes('@')) return a.uri;
      // Fallback: older imports stored email in givenName before the uri-storage fix
      if (a.givenName && a.givenName.includes('@')) return a.givenName;
    }
    return '';
  })();

  const today = new Date().toISOString().split('T')[0];
  // Preserve original date when available; fall back to today for new documents
  const exportDate = headerData.creationDate || today;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<ids:ids xmlns:ids="http://standards.buildingsmart.org/IDS" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://standards.buildingsmart.org/IDS http://standards.buildingsmart.org/IDS/1.0/ids.xsd">\n`;
  xml += `  <ids:info>\n`;
  xml += `    <ids:title>${escapeXml(headerData.title || headerData.shortTitle || 'IDM Specification')}</ids:title>\n`;
  if (headerData.copyright) {
    xml += `    <ids:copyright>${escapeXml(headerData.copyright)}</ids:copyright>\n`;
  }
  // Only emit <ids:version> when the source had one ('' = absent in source)
  if (headerData.version) {
    xml += `    <ids:version>${escapeXml(headerData.version)}</ids:version>\n`;
  }
  const idsDesc = headerData.idsDescription || headerData.title || '';
  if (idsDesc) {
    xml += `    <ids:description>${escapeXml(idsDesc)}</ids:description>\n`;
  }
  if (authorEmail) {
    xml += `    <ids:author>${escapeXml(authorEmail)}</ids:author>\n`;
  }
  xml += `    <ids:date>${exportDate}</ids:date>\n`;
  if (headerData.idsPurpose) {
    xml += `    <ids:purpose>${escapeXml(headerData.idsPurpose)}</ids:purpose>\n`;
  }
  if (headerData.idsMilestone) {
    xml += `    <ids:milestone>${escapeXml(headerData.idsMilestone)}</ids:milestone>\n`;
  }
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

      // Per-spec IFC version from _idsApplicability takes priority over the global param
      const specVersion = spec.specIfcVersion || ifcVersion;

      const specName = escapeXml(spec.name || `Spec_${specCount}`);
      const specDesc = spec.specDescription != null ? spec.specDescription : (spec.description || '');
      const specId = spec.specIdentifier != null ? spec.specIdentifier : (spec.id || '');

      xml += `    <ids:specification name="${specName}" ifcVersion="${specVersion}"`;
      if (specId) xml += ` identifier="${escapeXml(specId)}"`;
      if (specDesc) xml += ` description="${escapeXml(specDesc)}"`;
      if (spec.specInstructions) xml += ` instructions="${escapeXml(spec.specInstructions)}"`;
      xml += `>\n`;

      // Applicability — use preserved minOccurs/maxOccurs
      xml += `      <ids:applicability minOccurs="${spec.minOccurs}" maxOccurs="${escapeXml(spec.maxOccurs || 'unbounded')}">\n`;

      if (spec.entities && spec.entities.length > 0) {
        xml += `        <ids:entity>\n`;
        xml += `          <ids:name>\n`;
        if (spec.entities.length > 1) {
          // Multi-entity restriction (e.g. IFCSTAIR + IFCSTAIRFLIGHT)
          xml += `            <xs:restriction base="xs:string">\n`;
          for (const ent of spec.entities) {
            xml += `              <xs:enumeration value="${ent}"/>\n`;
          }
          xml += `            </xs:restriction>\n`;
        } else {
          xml += `            <ids:simpleValue>${spec.entities[0]}</ids:simpleValue>\n`;
        }
        xml += `          </ids:name>\n`;

        if (spec.predefinedType) {
          const ptValues = spec.predefinedType.split(',').map(v => v.trim()).filter(Boolean);
          xml += `          <ids:predefinedType>\n`;
          if (ptValues.length === 1) {
            xml += `            <ids:simpleValue>${escapeXml(ptValues[0])}</ids:simpleValue>\n`;
          } else {
            xml += `            <xs:restriction base="xs:string">\n`;
            for (const ptv of ptValues) {
              xml += `              <xs:enumeration value="${escapeXml(ptv)}"/>\n`;
            }
            xml += `            </xs:restriction>\n`;
          }
          xml += `          </ids:predefinedType>\n`;
        }

        xml += `        </ids:entity>\n`;
      }

      // PartOf facets in applicability (schema order: entity → partOf → classification → attribute → property → material)
      for (const po of (spec.partOfApplicability || [])) {
        xml += `        <ids:partOf`;
        if (po.relation) xml += ` relation="${escapeXml(po.relation)}"`;
        xml += `>\n`;
        xml += `          <ids:entity>\n`;
        xml += `            <ids:name>\n`;
        xml += `              <ids:simpleValue>${escapeXml(po.parentEntity)}</ids:simpleValue>\n`;
        xml += `            </ids:name>\n`;
        if (po.parentPredefinedType) {
          xml += `            <ids:predefinedType>\n`;
          xml += `              <ids:simpleValue>${escapeXml(po.parentPredefinedType)}</ids:simpleValue>\n`;
          xml += `            </ids:predefinedType>\n`;
        }
        xml += `          </ids:entity>\n`;
        xml += `        </ids:partOf>\n`;
      }

      // Classification facets in applicability
      for (const cls of (spec.classificationApplicability || [])) {
        const clsValue = buildValueXml(constraintStr(cls.constraints), cls.examples || '', '          ');
        xml += `        <ids:classification>\n`;
        if (clsValue) xml += clsValue;
        xml += `          <ids:system>\n`;
        xml += `            <ids:simpleValue>${escapeXml(cls.system)}</ids:simpleValue>\n`;
        xml += `          </ids:system>\n`;
        xml += `        </ids:classification>\n`;
      }

      // Attribute facets in applicability
      for (const attr of (spec.attributeApplicability || [])) {
        xml += `        <ids:attribute>\n`;
        xml += `          <ids:name>\n`;
        xml += `            <ids:simpleValue>${escapeXml(attr.name)}</ids:simpleValue>\n`;
        xml += `          </ids:name>\n`;
        xml += buildValueXml(constraintStr(attr.constraints), attr.examples || '', '          ');
        xml += `        </ids:attribute>\n`;
      }

      // Property facets in applicability
      for (const prop of (spec.propertyApplicability || [])) {
        xml += `        <ids:property`;
        if (prop.dataType) xml += ` dataType="${escapeXml(prop.dataType)}"`;
        xml += `>\n`;
        xml += `          <ids:propertySet>\n`;
        xml += `            <ids:simpleValue>${escapeXml(prop.propertySet)}</ids:simpleValue>\n`;
        xml += `          </ids:propertySet>\n`;
        xml += `          <ids:baseName>\n`;
        xml += `            <ids:simpleValue>${escapeXml(prop.baseName)}</ids:simpleValue>\n`;
        xml += `          </ids:baseName>\n`;
        xml += buildValueXml(constraintStr(prop.constraints), prop.examples || '', '          ');
        xml += `        </ids:property>\n`;
      }

      // Material facets in applicability
      for (const mat of (spec.materialApplicability || [])) {
        const matValue = buildValueXml(constraintStr(mat.constraints), mat.examples || '', '          ');
        if (matValue) {
          xml += `        <ids:material>\n`;
          xml += matValue;
          xml += `        </ids:material>\n`;
        } else {
          xml += `        <ids:material />\n`;
        }
      }

      xml += `      </ids:applicability>\n`;

      // Requirements
      if (spec.facets.length > 0 || spec.entityRequirementsInstructions) {
        const reqDesc = spec.requirementsDescription;
        xml += `      <ids:requirements`;
        if (reqDesc) xml += ` description="${escapeXml(reqDesc)}"`;
        xml += `>\n`;

        // Entity in requirements (carries instructions for IFC authors; entity name mirrors applicability)
        if (spec.entityRequirementsInstructions && spec.entities && spec.entities.length > 0) {
          xml += `        <ids:entity instructions="${escapeXml(spec.entityRequirementsInstructions)}">\n`;
          xml += `          <ids:name>\n`;
          if (spec.entities.length === 1) {
            xml += `            <ids:simpleValue>${spec.entities[0]}</ids:simpleValue>\n`;
          } else {
            xml += `            <xs:restriction base="xs:string">\n`;
            for (const ent of spec.entities) {
              xml += `              <xs:enumeration value="${ent}"/>\n`;
            }
            xml += `            </xs:restriction>\n`;
          }
          xml += `          </ids:name>\n`;
          xml += `        </ids:entity>\n`;
        }

        for (const facet of spec.facets) {
          if (facet.type === 'property') {
            // Determine whether to emit dataType:
            //   dataTypeRaw === ''   → absent in source, omit
            //   dataTypeRaw === null → hand-authored, use computed dataType
            //   dataTypeRaw is a non-empty string → explicit source value, emit it
            const emitDataType = facet.dataTypeRaw === null
              ? facet.dataType          // hand-authored: use computed
              : facet.dataTypeRaw;      // IDS-imported: use raw (possibly '')

            xml += `        <ids:property`;
            if (facet.cardinality != null) xml += ` cardinality="${facet.cardinality}"`;
            if (emitDataType) xml += ` dataType="${emitDataType}"`;
            if (facet.instructions) xml += ` instructions="${escapeXml(facet.instructions)}"`;
            if (facet.uri) xml += ` uri="${escapeXml(facet.uri)}"`;
            xml += `>\n`;
            xml += `          <ids:propertySet>\n`;
            const psets = facet.propertySets && facet.propertySets.length > 1
              ? facet.propertySets
              : null;
            if (psets) {
              xml += `            <xs:restriction base="xs:string">\n`;
              for (const ps of psets) {
                xml += `              <xs:enumeration value="${escapeXml(ps)}"/>\n`;
              }
              xml += `            </xs:restriction>\n`;
            } else {
              xml += `            <ids:simpleValue>${escapeXml(facet.propertySet)}</ids:simpleValue>\n`;
            }
            xml += `          </ids:propertySet>\n`;
            xml += `          <ids:baseName>\n`;
            xml += `            <ids:simpleValue>${escapeXml(facet.baseName)}</ids:simpleValue>\n`;
            xml += `          </ids:baseName>\n`;
            xml += buildValueXml(facet.constraints, facet.examples, '          ');
            xml += `        </ids:property>\n`;

          } else if (facet.type === 'attribute') {
            xml += `        <ids:attribute`;
            if (facet.cardinality != null) xml += ` cardinality="${facet.cardinality}"`;
            if (facet.instructions) xml += ` instructions="${escapeXml(facet.instructions)}"`;
            xml += `>\n`;
            xml += `          <ids:name>\n`;
            xml += `            <ids:simpleValue>${escapeXml(facet.name)}</ids:simpleValue>\n`;
            xml += `          </ids:name>\n`;
            xml += buildValueXml(facet.constraints, facet.examples, '          ');
            xml += `        </ids:attribute>\n`;

          } else if (facet.type === 'classification') {
            xml += `        <ids:classification`;
            if (facet.cardinality != null) xml += ` cardinality="${facet.cardinality}"`;
            if (facet.uri) xml += ` uri="${escapeXml(facet.uri)}"`;
            if (facet.instructions) xml += ` instructions="${escapeXml(facet.instructions)}"`;
            xml += `>\n`;
            const classValue = buildValueXml(facet.constraints, facet.examples, '          ');
            if (classValue) xml += classValue;
            xml += `          <ids:system>\n`;
            xml += `            <ids:simpleValue>${escapeXml(facet.system)}</ids:simpleValue>\n`;
            xml += `          </ids:system>\n`;
            xml += `        </ids:classification>\n`;

          } else if (facet.type === 'material') {
            const matValue = buildValueXml(facet.constraints, facet.examples, '          ');
            const matAttrs = [
              facet.cardinality != null ? ` cardinality="${facet.cardinality}"` : '',
              facet.uri ? ` uri="${escapeXml(facet.uri)}"` : '',
              facet.instructions ? ` instructions="${escapeXml(facet.instructions)}"` : '',
            ].join('');
            if (matValue) {
              xml += `        <ids:material${matAttrs}>\n`;
              xml += matValue;
              xml += `        </ids:material>\n`;
            } else {
              xml += `        <ids:material${matAttrs} />\n`;
            }

          } else if (facet.type === 'partOf') {
            xml += `        <ids:partOf`;
            if (facet.relation) xml += ` relation="${escapeXml(facet.relation)}"`;
            if (facet.cardinality != null) xml += ` cardinality="${facet.cardinality}"`;
            if (facet.instructions) xml += ` instructions="${escapeXml(facet.instructions)}"`;
            xml += `>\n`;
            xml += `          <ids:entity>\n`;
            xml += `            <ids:name>\n`;
            xml += `              <ids:simpleValue>${escapeXml(facet.parentEntity)}</ids:simpleValue>\n`;
            xml += `            </ids:name>\n`;
            if (facet.parentPredefinedType) {
              const ptValues = facet.parentPredefinedType.split(',').map(v => v.trim()).filter(Boolean);
              xml += `            <ids:predefinedType>\n`;
              if (ptValues.length === 1) {
                xml += `              <ids:simpleValue>${escapeXml(ptValues[0])}</ids:simpleValue>\n`;
              } else {
                xml += `              <xs:restriction base="xs:string">\n`;
                for (const ptv of ptValues) {
                  xml += `                <xs:enumeration value="${escapeXml(ptv)}"/>\n`;
                }
                xml += `              </xs:restriction>\n`;
              }
              xml += `            </ids:predefinedType>\n`;
            }
            xml += `          </ids:entity>\n`;
            xml += `        </ids:partOf>\n`;
          }
        }

        xml += `      </ids:requirements>\n`;
      }

      xml += `    </ids:specification>\n`;
    }
  }

  if (specCount === 0) {
    xml += `    <!-- No IFC-mappable Exchange Requirements found -->\n`;
  }

  xml += `  </ids:specifications>\n`;
  xml += `</ids:ids>\n`;

  return { xml, specCount, skippedCount };
}
