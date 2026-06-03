/**
 * mvdXML 1.2 Exporter
 * Generates proper ConceptTemplate → ConceptRoot → Concept structure
 * from IDM erHierarchy data, compliant with the buildingSMART mvdXML 1.2 schema.
 * Aligned with idmXSD 2.0 ↔ mvdXML 1.2 Mapping v5.
 *
 * Design:
 *  - One shared "Property Set Value" ConceptTemplate (TPL_PSET_UUID) for Pset_*.Property mappings.
 *    Rules: IsDefinedBy → IfcRelDefinesByProperties → IfcPropertySet → HasProperties
 *    → IfcPropertySingleValue (RuleIDs: PsetName, PropName, PropValue).
 *  - One shared "Element Quantity Value" ConceptTemplate (TPL_QTO_UUID) for Qto_*.Quantity mappings.
 *    Rules: IsDefinedBy → IfcRelDefinesByProperties → IfcElementQuantity → HasQuantities
 *    → IfcQuantityLength/Area/Volume/Count/Weight (same RuleIDs: PsetName, PropName, PropValue).
 *  - One ConceptTemplate per unique attribute name for Entity.Attribute mappings,
 *    each with an AttributeRule that hardcodes the attribute name.
 *  - Entity-only IU mappings become the ConceptRoot applicableRootEntity (no Concept needed).
 *  - ALL ERs appear in <ExchangeRequirements>, not only those with IU mappings.
 *  - subEr levels 2+ are flattened to their nearest level-1 ancestor's ExchangeRequirement UUID
 *    (v5 mapping: sub-ER hierarchy → flat ExchangeRequirement list, hierarchy loss is intentional).
 *  - TemplateRules use qualifier syntax: [Value]='…' for strings, [Exists]=TRUE for booleans.
 *  - Concept <Body> contains the IU definition followed by an optional "DataType: X" line
 *    so round-trips can reconstruct the data type.
 *
 * Namespace: https://standards.buildingsmart.org/MVD/RELEASE/mvdXML/v1-2/
 * Schema:    mvdXML 1.2 Draft9 (02.07.2021)
 *
 * Draft9 constraints applied:
 *  - TemplateRules/@operator no longer accepts "not"
 *  - TemplateRules requires ≥2 child rules; a lone rule is a bare <TemplateRule> under <Concept>
 *  - Concept sequence: Definitions?, Template+, Requirements?, (TemplateRules|TemplateRule)?
 */

const NS = 'https://standards.buildingsmart.org/MVD/RELEASE/mvdXML/v1-2/';

// Stable UUIDs for the two shared traversal templates.
const TPL_PSET_UUID = 'b1000001-c0de-4000-8000-000000000001'; // Pset_* → IfcPropertySingleValue
const TPL_QTO_UUID  = 'b1000002-c0de-4000-8000-000000000002'; // Qto_*  → IfcElementQuantity

// ─── utilities ───────────────────────────────────────────────────────────────

function escXml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function genUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function toUuid(id) {
  return id && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) ? id : genUuid();
}

function normalizeSchema(basis) {
  if (!basis) return 'IFC4';
  const b = String(basis).toLowerCase();
  if (b.includes('2x3')) return 'IFC2X3';
  if (b.includes('4x3') || b.includes('4.3')) return 'IFC4X3_ADD2';
  if (b.includes('4x2')) return 'IFC4X2';
  if (b.includes('4x1')) return 'IFC4X1';
  if (b.includes('ifc4') || b.includes('4.0')) return 'IFC4';
  return 'IFC4';
}

// "IFCWALL" / "ifcwall" → "IfcWall"; already-canonical passes through
function canonEntity(name) {
  if (!name) return '';
  const n = String(name).trim();
  if (n.startsWith('Ifc')) return n;
  if (/^ifc/i.test(n)) return 'Ifc' + n.slice(3, 4).toUpperCase() + n.slice(4).toLowerCase();
  return n;
}

function isIfcBasis(s) {
  return Boolean(s && /ifc/i.test(String(s)));
}

function mvdStatus(status) {
  // Maps IDM/ISO status codes to valid mvdXML 1.2 status values:
  // sample | proposal | draft | candidate | final | deprecated
  return { NP: 'sample', WD: 'draft', CD: 'candidate', DIS: 'candidate', IS: 'final' }[status] || 'draft';
}

// Extract @applicability value from "Applicability: X." note prepended during import.
function extractApplicability(description) {
  if (!description) return 'both';
  const m = (description || '').match(/^Applicability:\s*(import|export|both)\b/i);
  return m ? m[1].toLowerCase() : 'both';
}

// Strip the applicability note line before writing back to XML.
function stripApplicabilityNote(description) {
  if (!description) return '';
  return description.replace(/^Applicability:\s*(?:import|export|both)\.\s*\n?/i, '').trim();
}

function renderDefinitions(body, ind) {
  if (!body) return '';
  return `${ind}<Definitions>\n${ind}  <Definition>\n${ind}    <Body>${escXml(body)}</Body>\n${ind}  </Definition>\n${ind}</Definitions>\n`;
}

// ─── IFC mapping classification ───────────────────────────────────────────────

/**
 * Classify one external element mapping entry.
 * Returns null if not an IFC mapping.
 * Returns { kind:'pset'|'attr'|'entity', entity, pset, prop, attr }.
 */
function classifyMapping(m, inheritedEntity) {
  const basis = m.basis || m.schema || m.standard || '';
  if (!isIfcBasis(basis)) return null;
  const element = (m.element || m.name || '').trim();
  if (!element) return null;

  if (element.includes('.')) {
    const dot = element.indexOf('.');
    const left = element.slice(0, dot);
    const right = element.slice(dot + 1);
    if (!left || !right) return null;
    if (/^Pset_/i.test(left)) {
      return { kind: 'pset', entity: inheritedEntity || 'IfcObject', pset: left, prop: right, attr: null };
    }
    if (/^Qto_/i.test(left)) {
      return { kind: 'qto',  entity: inheritedEntity || 'IfcObject', pset: left, prop: right, attr: null };
    }
    return { kind: 'attr', entity: canonEntity(left) || inheritedEntity || 'IfcObject', attr: right, pset: null, prop: null };
  }

  if (/^Pset_/i.test(element)) {
    return { kind: 'pset', entity: inheritedEntity || 'IfcObject', pset: element, prop: null, attr: null };
  }
  if (/^Qto_/i.test(element)) {
    return { kind: 'qto',  entity: inheritedEntity || 'IfcObject', pset: element, prop: null, attr: null };
  }
  if (/^ifc/i.test(element)) {
    return { kind: 'entity', entity: canonEntity(element), pset: null, prop: null, attr: null };
  }
  return null;
}

// ─── ER / IU walking ──────────────────────────────────────────────────────────

function walkErs(erHierarchy, cb) {
  for (const er of erHierarchy || []) {
    cb(er);
    walkErs(er.subERs, cb);
  }
}

function walkIus(ius, inheritedEntity, cb) {
  for (const iu of ius || []) {
    let ownEntity = inheritedEntity;
    for (const m of iu.correspondingExternalElements || iu.correspondingExternalElement || []) {
      const d = classifyMapping(m, inheritedEntity);
      if (d && d.kind === 'entity') { ownEntity = d.entity; break; }
    }
    cb(iu, ownEntity);
    walkIus(iu.subInformationUnits, ownEntity, cb);
  }
}

// ─── template collection ──────────────────────────────────────────────────────

/** Returns Map<attrName, uuid> for every unique attribute referenced in IU mappings. */
function collectAttrTemplates(erHierarchy) {
  const map = new Map();
  walkErs(erHierarchy, (er) => {
    walkIus(er.informationUnits, null, (iu, inheritedEntity) => {
      for (const m of iu.correspondingExternalElements || iu.correspondingExternalElement || []) {
        const d = classifyMapping(m, inheritedEntity);
        if (d && d.kind === 'attr' && d.attr && !map.has(d.attr)) {
          map.set(d.attr, genUuid());
        }
      }
    });
  });
  return map;
}

/** Returns [{er, uuid}] for every ER in the hierarchy (all levels). */
function collectAllErs(erHierarchy) {
  const out = [];
  walkErs(erHierarchy, (er) => out.push({ er, uuid: toUuid(er.guid || er.id) }));
  return out;
}

// ─── ConceptTemplate renderers ────────────────────────────────────────────────

function renderPsetTemplate(schema) {
  return `  <ConceptTemplate uuid="${TPL_PSET_UUID}" name="Property Set Value" applicableSchema="${schema}" applicableEntity="IfcObject">
${renderDefinitions('Asserts that a named property exists within a named property set attached to the entity via IsDefinedBy → IfcRelDefinesByProperties → IfcPropertySet → HasProperties → IfcPropertySingleValue.', '    ')}    <Rules>
      <AttributeRule AttributeName="IsDefinedBy">
        <EntityRules>
          <EntityRule EntityName="IfcRelDefinesByProperties">
            <AttributeRules>
              <AttributeRule AttributeName="RelatingPropertyDefinition">
                <EntityRules>
                  <EntityRule EntityName="IfcPropertySet">
                    <AttributeRules>
                      <AttributeRule RuleID="PsetName" AttributeName="Name"/>
                      <AttributeRule AttributeName="HasProperties">
                        <EntityRules>
                          <EntityRule EntityName="IfcPropertySingleValue">
                            <AttributeRules>
                              <AttributeRule RuleID="PropName" AttributeName="Name"/>
                              <AttributeRule RuleID="PropValue" AttributeName="NominalValue"/>
                            </AttributeRules>
                          </EntityRule>
                        </EntityRules>
                      </AttributeRule>
                    </AttributeRules>
                  </EntityRule>
                </EntityRules>
              </AttributeRule>
            </AttributeRules>
          </EntityRule>
        </EntityRules>
      </AttributeRule>
    </Rules>
  </ConceptTemplate>
`;
}

function renderQtoTemplate(schema) {
  return `  <ConceptTemplate uuid="${TPL_QTO_UUID}" name="Element Quantity Value" applicableSchema="${schema}" applicableEntity="IfcObject">
${renderDefinitions('Asserts that a named quantity exists within a named quantity set attached to the entity via IsDefinedBy → IfcRelDefinesByProperties → IfcElementQuantity → HasQuantities → IfcQuantityLength/Area/Volume/Count/Weight.', '    ')}    <Rules>
      <AttributeRule AttributeName="IsDefinedBy">
        <EntityRules>
          <EntityRule EntityName="IfcRelDefinesByProperties">
            <AttributeRules>
              <AttributeRule AttributeName="RelatingPropertyDefinition">
                <EntityRules>
                  <EntityRule EntityName="IfcElementQuantity">
                    <AttributeRules>
                      <AttributeRule RuleID="PsetName" AttributeName="Name"/>
                      <AttributeRule AttributeName="HasQuantities">
                        <EntityRules>
                          <EntityRule EntityName="IfcQuantityLength">
                            <AttributeRules>
                              <AttributeRule RuleID="PropName" AttributeName="Name"/>
                              <AttributeRule RuleID="PropValue" AttributeName="LengthValue"/>
                            </AttributeRules>
                          </EntityRule>
                          <EntityRule EntityName="IfcQuantityArea">
                            <AttributeRules>
                              <AttributeRule RuleID="PropName" AttributeName="Name"/>
                              <AttributeRule RuleID="PropValue" AttributeName="AreaValue"/>
                            </AttributeRules>
                          </EntityRule>
                          <EntityRule EntityName="IfcQuantityVolume">
                            <AttributeRules>
                              <AttributeRule RuleID="PropName" AttributeName="Name"/>
                              <AttributeRule RuleID="PropValue" AttributeName="VolumeValue"/>
                            </AttributeRules>
                          </EntityRule>
                          <EntityRule EntityName="IfcQuantityCount">
                            <AttributeRules>
                              <AttributeRule RuleID="PropName" AttributeName="Name"/>
                              <AttributeRule RuleID="PropValue" AttributeName="CountValue"/>
                            </AttributeRules>
                          </EntityRule>
                          <EntityRule EntityName="IfcQuantityWeight">
                            <AttributeRules>
                              <AttributeRule RuleID="PropName" AttributeName="Name"/>
                              <AttributeRule RuleID="PropValue" AttributeName="WeightValue"/>
                            </AttributeRules>
                          </EntityRule>
                        </EntityRules>
                      </AttributeRule>
                    </AttributeRules>
                  </EntityRule>
                </EntityRules>
              </AttributeRule>
            </AttributeRules>
          </EntityRule>
        </EntityRules>
      </AttributeRule>
    </Rules>
  </ConceptTemplate>
`;
}

function renderAttrTemplate(uuid, attrName, schema) {
  return `  <ConceptTemplate uuid="${uuid}" name="${escXml(attrName)} Attribute" applicableSchema="${schema}" applicableEntity="IfcRoot">
${renderDefinitions(`Asserts the presence of the ${attrName} attribute on the applicable IFC entity.`, '    ')}    <Rules>
      <AttributeRule RuleID="AttrValue" AttributeName="${escXml(attrName)}"/>
    </Rules>
  </ConceptTemplate>
`;
}

// ─── Reconstructive renderers (mvdXML-imported projects) ─────────────────────

/**
 * Convert an IU to a TemplateRule Parameters string.
 * Uses _mvdParams stored during import; falls back to constructing from fields.
 */
function iuToParams(iu) {
  if (iu._mvdParams) return iu._mvdParams;
  const exts = iu.correspondingExternalElements || iu.correspondingExternalElement || [];
  const ifcExt = exts.find(m => isIfcBasis(m.basis || m.schema || m.standard));
  if (!ifcExt) return null;
  const d = classifyMapping(ifcExt, null);
  if (!d || (d.kind !== 'pset' && d.kind !== 'qto')) return null;
  const rules = [];
  if (d.pset) rules.push(`PsetName[Value]='${d.pset.replace(/'/g, "''")}'`);
  if (d.prop)  rules.push(`PropName[Value]='${d.prop.replace(/'/g, "''")}'`);
  if (iu.constraints) {
    const cm = iu.constraints.trim().match(/^([><=!]{1,2})\s*(.+)$/);
    if (cm) rules.push(`PropValue[Value] ${cm[1]} '${cm[2].trim().replace(/'/g, "''")}'`);
  }
  return rules.join(' and ') || null;
}

/**
 * Render an ER's flat IU list as rule element(s) — fallback for user-authored concepts.
 * Draft9: <TemplateRules> requires ≥2 children. A single rule is a bare <TemplateRule>.
 */
function renderTemplateRulesContent(er, operator, indent) {
  const seen = new Set();
  const params = [];
  for (const iu of er.informationUnits || []) {
    const p = iuToParams(iu);
    if (p && !seen.has(p)) { seen.add(p); params.push(p); }
  }
  if (params.length === 0) return '';
  if (params.length === 1) {
    return `${indent}<TemplateRule Parameters="${escXml(params[0])}"/>\n`;
  }
  let xml = `${indent}<TemplateRules operator="${escXml(operator)}">\n`;
  for (const p of params) xml += `${indent}  <TemplateRule Parameters="${escXml(p)}"/>\n`;
  xml += `${indent}</TemplateRules>\n`;
  return xml;
}

/**
 * Normalize verbatim TemplateRules XML for Draft9 compliance:
 * a <TemplateRules> with exactly one <TemplateRule> child collapses to a bare <TemplateRule>.
 */
function normalizeSingleChildTemplateRulesXml(raw) {
  if (!raw || !raw.trim().startsWith('<TemplateRules')) return raw;
  try {
    const doc = new DOMParser().parseFromString(`<root>${raw}</root>`, 'text/xml');
    const el = doc.documentElement.firstChild;
    if (!el || el.localName !== 'TemplateRules') return raw;
    const ruleChildren = [];
    const nodes = el.childNodes;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.nodeType === 1 && (n.localName === 'TemplateRule' || n.localName === 'TemplateRules')) {
        ruleChildren.push(n);
      }
    }
    if (ruleChildren.length === 1 && ruleChildren[0].localName === 'TemplateRule') {
      const params = ruleChildren[0].getAttribute('Parameters') || '';
      return `<TemplateRule Parameters="${escXml(params)}"/>`;
    }
  } catch (_) { /* fall through to raw */ }
  return raw;
}

/**
 * Render a Concept sub-ER (imported from mvdXML) as a <Concept> with TemplateRules
 * reconstructed from the IDM sub-ER hierarchy.
 */
function renderConceptFromSubEr(conceptEr, exchangeUuid) {
  const name   = escXml(conceptEr.name || 'Concept');
  const uuid   = toUuid(conceptEr.guid || conceptEr.id);
  const tplRef = conceptEr._mvdTemplateRef || TPL_PSET_UUID;
  const topOp  = conceptEr._mvdTopOperator || 'and';

  const rawDesc = conceptEr.description || '';
  const body    = rawDesc.startsWith('_mvd') ? '' : rawDesc;

  let xml = `          <Concept uuid="${uuid}" name="${name}">\n`;
  if (body) xml += `            <Definitions>\n              <Definition>\n                <Body>${escXml(body)}</Body>\n              </Definition>\n            </Definitions>\n`;
  xml += `            <Template ref="${tplRef}"/>\n`;

  // Draft9 sequence: Requirements BEFORE (TemplateRules | TemplateRule)
  const req = conceptEr.isMandatory !== false ? 'mandatory' : 'recommended';
  const applicability = conceptEr._mvdApplicability || 'both';
  xml += `            <Requirements>\n              <Requirement applicability="${applicability}" requirement="${req}" exchangeRequirement="${exchangeUuid}"/>\n            </Requirements>\n`;

  if (conceptEr._mvdTemplateRulesXml) {
    // Verbatim re-emission; normalize single-child wrapper to bare <TemplateRule> for Draft9
    const normalized = normalizeSingleChildTemplateRulesXml(conceptEr._mvdTemplateRulesXml);
    const base = '            ';
    xml += normalized.split('\n').map(l => base + l.trim()).filter(l => l.trim()).join('\n') + '\n';
  } else if ((conceptEr.informationUnits || []).length > 0) {
    xml += renderTemplateRulesContent(conceptEr, topOp, '            ');
  }

  xml += `          </Concept>\n`;
  return xml;
}

// ─── Concept renderer (synthetic mode) ───────────────────────────────────────

function renderConcept(c) {
  const name = escXml(c.iu.name || c.pset || c.entity || 'Concept');
  const uuid = toUuid(c.iu.id);

  const bodyParts = [];
  if (c.iu.definition) bodyParts.push(c.iu.definition);
  if (c.iu.dataType) bodyParts.push(`DataType: ${c.iu.dataType}`);
  const body = bodyParts.join('\n');

  let xml = `          <Concept uuid="${uuid}" name="${name}">\n`;
  if (body) {
    xml += `            <Definitions>\n              <Definition>\n                <Body>${escXml(body)}</Body>\n              </Definition>\n            </Definitions>\n`;
  }
  xml += `            <Template ref="${c.tplUuid}"/>\n`;

  // Draft9 strict sequence: Requirements BEFORE (TemplateRules | TemplateRule)
  const req = c.isMandatory ? 'mandatory' : 'recommended';
  xml += `            <Requirements>\n              <Requirement applicability="both" requirement="${req}" exchangeRequirement="${c.erUuid}"/>\n            </Requirements>\n`;

  if (c.kind === 'pset' || c.kind === 'qto') {
    // Both Pset and Qto use the same PsetName/PropName/PropValue RuleID convention;
    // the difference is which ConceptTemplate (TPL_PSET_UUID vs TPL_QTO_UUID) is referenced.
    const parts = [];
    if (c.pset) parts.push(`PsetName[Value]='${c.pset.replace(/'/g, "''")}'`);
    if (c.prop) parts.push(`PropName[Value]='${c.prop.replace(/'/g, "''")}'`);
    if (c.iu.constraints) {
      const cm = c.iu.constraints.trim().match(/^([><=!]{1,2})\s*(.+)$/);
      if (cm) parts.push(`PropValue[Value] ${cm[1]} '${cm[2].trim().replace(/'/g, "''")}'`);
    }
    if (parts.length > 0) {
      // All parts combine into one Parameters string → always a single rule.
      // Draft9: <TemplateRules> requires ≥2 children; bare <TemplateRule> goes directly under <Concept>.
      xml += `            <TemplateRule Parameters="${escXml(parts.join(' and '))}"/>\n`;
    }
  }
  // attr kind: attribute name is baked into the ConceptTemplate's AttributeRule; no rule needed.

  xml += `          </Concept>\n`;
  return xml;
}

// ─── main export ──────────────────────────────────────────────────────────────

/**
 * Generate mvdXML 1.2 XML from IDM project data.
 *
 * @param {{ headerData: object, erHierarchy: Array }} params
 * @returns {{ xml: string, erCount: number, conceptCount: number, rootCount: number }}
 */
export function generateMvdXml({ headerData = {}, erHierarchy = [] }) {
  // Pick the most common IFC schema version from all IU mappings
  const schema = (() => {
    const votes = {};
    walkErs(erHierarchy, (er) => {
      walkIus(er.informationUnits, null, (iu) => {
        for (const m of iu.correspondingExternalElements || iu.correspondingExternalElement || []) {
          if (isIfcBasis(m.basis || m.schema || m.standard)) {
            const s = normalizeSchema(m.basis || m.schema || m.standard);
            votes[s] = (votes[s] || 0) + 1;
          }
        }
      });
    });
    let best = 'IFC4', bestN = 0;
    for (const [s, n] of Object.entries(votes)) { if (n > bestN) { best = s; bestN = n; } }
    return best;
  })();

  const allErs = collectAllErs(erHierarchy);
  const erUuidMap = new Map(allErs.map(({ er, uuid }) => [er.id, uuid]));
  const attrTemplates = collectAttrTemplates(erHierarchy);

  const mvdUuid = toUuid(headerData.idmGuid);
  const viewUuid = toUuid(headerData.ucGuid || headerData.bcmGuid);
  const name = headerData.shortTitle || headerData.title || 'IDM mvdXML';
  const fullTitle = headerData.title || name;
  const status = mvdStatus(headerData.status);
  const version = headerData.version || '';  // no default: omit when original had none
  const copyright = headerData.copyright || '';

  // Reconstruct author string from first entry in headerData.authors
  const _fa = (headerData.authors || [])[0];
  const authorStr = _fa
    ? (_fa.type === 'person'
        ? [_fa.familyName, _fa.givenName].filter(Boolean).join(', ') +
          (_fa.affiliation ? ` (${_fa.affiliation})` : '')
        : (_fa.organizationName || ''))
    : (headerData.author || '');

  // ── root element ──
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<mvdXML xmlns="${NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`;
  xml += ` xsi:schemaLocation="${NS} https://standards.buildingsmart.org/MVD/RELEASE/mvdXML/v1-2/mvdXML_V1-2.xsd"`;
  xml += ` uuid="${mvdUuid}" name="${escXml(name)}"`;
  if (version) xml += ` version="${escXml(version)}"`;
  xml += ` status="${status}"`;
  if (copyright) xml += ` copyright="${escXml(copyright)}"`;
  if (authorStr) xml += ` author="${escXml(authorStr)}"`;
  xml += `>\n`;

  // ── Templates ──
  // Determine which template kinds are needed before rendering
  let needsPset = false, needsQto = false;
  walkErs(erHierarchy, (er) => {
    walkIus(er.informationUnits, null, (iu, inheritedEntity) => {
      for (const m of iu.correspondingExternalElements || iu.correspondingExternalElement || []) {
        const d = classifyMapping(m, inheritedEntity);
        if (d && d.kind === 'pset') needsPset = true;
        if (d && d.kind === 'qto')  needsQto  = true;
      }
    });
  });

  if (headerData._mvdTemplatesSection) {
    // Re-emit original ConceptTemplates verbatim for round-trip fidelity
    xml += headerData._mvdTemplatesSection.trim() + '\n';
  } else if (needsPset || needsQto || attrTemplates.size > 0) {
    xml += `  <Templates>\n`;
    if (needsPset) xml += renderPsetTemplate(schema);
    if (needsQto)  xml += renderQtoTemplate(schema);
    for (const [attrName, uuid] of attrTemplates) {
      xml += renderAttrTemplate(uuid, attrName, schema);
    }
    xml += `  </Templates>\n`;
  }

  const rootEr = erHierarchy[0];
  const hasNewFormat = (headerData._mvdExchangeRequirements || []).length > 0;

  // For old-format or synthetic mode: derive ExchangeRequirements from sub-ER hierarchy
  let erForExchange = [];
  const exchangeAncestorUuid = new Map();
  if (!hasNewFormat) {
    const exchangeSubErs = rootEr && (rootEr.subERs || []).length > 0 ? rootEr.subERs : erHierarchy;
    erForExchange = exchangeSubErs.map(er => ({ er, uuid: toUuid(er.guid || er.id) }));
    const exchangeIdSet = new Set(erForExchange.map(({ er }) => er.id));
    const buildAncestorUuids = (er, nearestUuid) => {
      const myUuid = exchangeIdSet.has(er.id) ? toUuid(er.guid || er.id) : nearestUuid;
      exchangeAncestorUuid.set(er.id, myUuid);
      for (const sub of er.subERs || []) buildAncestorUuids(sub, myUuid);
    };
    if (rootEr) {
      const fallback = erForExchange[0]?.uuid || toUuid(rootEr.guid || rootEr.id);
      exchangeAncestorUuid.set(rootEr.id, fallback);
      for (const sub of rootEr.subERs || []) {
        buildAncestorUuids(sub, exchangeIdSet.has(sub.id) ? toUuid(sub.guid || sub.id) : fallback);
      }
    } else {
      for (const { er, uuid } of erForExchange) buildAncestorUuids(er, uuid);
    }
  }

  // ── Views ──
  xml += `  <Views>\n`;
  xml += `    <ModelView uuid="${viewUuid}" name="${escXml(name)}" applicableSchema="${schema}" status="${status}">\n`;
  const viewBody = headerData.aimAndScope || headerData.aimScope || headerData.summary || fullTitle || '';
  if (viewBody) xml += renderDefinitions(viewBody, '      ');

  // ── ExchangeRequirements ──
  xml += `      <ExchangeRequirements>\n`;
  if (hasNewFormat) {
    for (const erMeta of headerData._mvdExchangeRequirements) {
      xml += `        <ExchangeRequirement uuid="${erMeta.uuid}" name="${escXml(erMeta.name)}" applicability="${escXml(erMeta.applicability)}">\n`;
      if (erMeta.body) xml += renderDefinitions(erMeta.body, '          ');
      xml += `        </ExchangeRequirement>\n`;
    }
  } else {
    for (const { er, uuid } of erForExchange) {
      const rawDesc       = er.description || er.definition || '';
      const applicability = extractApplicability(rawDesc);
      const erDesc        = stripApplicabilityNote(rawDesc);
      xml += `        <ExchangeRequirement uuid="${uuid}" name="${escXml(er.name || 'Exchange Requirement')}" applicability="${applicability}">\n`;
      if (erDesc) xml += renderDefinitions(erDesc, '          ');
      xml += `        </ExchangeRequirement>\n`;
    }
  }
  xml += `      </ExchangeRequirements>\n`;

  // ── ConceptRoots ──
  let conceptCount = 0;
  let rootCount = 0;

  if (headerData._mvdTemplatesSection && hasNewFormat) {
    // ── New reconstructive mode: ConceptRoot ERs identified by entity ext.elm ──
    const isConceptRoot = rootEr && (rootEr.correspondingExternalElements || [])
      .some(m => { const d = classifyMapping(m, null); return d && d.kind === 'entity'; });
    const conceptRootErs = isConceptRoot ? [rootEr]
      : (rootEr ? (rootEr.subERs || []).filter(er =>
          (er.correspondingExternalElements || [])
            .some(m => { const d = classifyMapping(m, null); return d && d.kind === 'entity'; })
        ) : []);
    const defaultErUuid = headerData._mvdExchangeRequirements[0]?.uuid || '';
    if (conceptRootErs.length > 0) {
      xml += `      <Roots>\n`;
      for (const conceptRootEr of conceptRootErs) {
        const entityExt = (conceptRootEr.correspondingExternalElements || [])
          .find(m => { const d = classifyMapping(m, null); return d && d.kind === 'entity'; });
        const d = classifyMapping(entityExt, null);
        const rUuid = toUuid(conceptRootEr.guid || conceptRootEr.id);
        const rName = (conceptRootEr.name || '').replace(/^er_/, '') || d.entity;
        xml += `        <ConceptRoot uuid="${rUuid}" name="${escXml(rName)}" applicableRootEntity="${escXml(d.entity)}">\n`;
        if (conceptRootEr.description) xml += renderDefinitions(conceptRootEr.description, '          ');
        xml += `          <Concepts>\n`;
        for (const conceptEr of conceptRootEr.subERs || []) {
          xml += renderConceptFromSubEr(conceptEr, conceptEr._mvdExchangeRequirementUuid || defaultErUuid);
          conceptCount++;
        }
        xml += `          </Concepts>\n`;
        xml += `        </ConceptRoot>\n`;
      }
      xml += `      </Roots>\n`;
      rootCount = conceptRootErs.length;
    }
  } else if (headerData._mvdTemplatesSection) {
    // ── Old reconstructive mode: ExchangeRequirement sub-ERs contain Concept sub-sub-ERs ──
    const rootGroups = new Map();
    for (const { er: exchangeEr, uuid: exchangeUuid } of erForExchange) {
      for (const conceptEr of exchangeEr.subERs || []) {
        const entityExt = (conceptEr.correspondingExternalElements || [])
          .find(m => { const d = classifyMapping(m, null); return d && d.kind === 'entity'; });
        if (!entityExt) continue;
        const d = classifyMapping(entityExt, null);
        const rootKey  = conceptEr._mvdConceptRootUuid || d.entity;
        const rootName = conceptEr._mvdConceptRootName || d.entity;
        const rootUuid = conceptEr._mvdConceptRootUuid ? toUuid(conceptEr._mvdConceptRootUuid) : genUuid();
        if (!rootGroups.has(rootKey)) {
          rootGroups.set(rootKey, { name: rootName, uuid: rootUuid, entity: d.entity, items: [] });
        }
        rootGroups.get(rootKey).items.push({ conceptEr, exchangeUuid });
        conceptCount++;
      }
    }
    if (rootGroups.size > 0) {
      xml += `      <Roots>\n`;
      for (const { name, uuid: rUuid, entity, items } of rootGroups.values()) {
        xml += `        <ConceptRoot uuid="${rUuid}" name="${escXml(name)}" applicableRootEntity="${escXml(entity)}">\n`;
        xml += `          <Concepts>\n`;
        for (const { conceptEr, exchangeUuid } of items) xml += renderConceptFromSubEr(conceptEr, exchangeUuid);
        xml += `          </Concepts>\n`;
        xml += `        </ConceptRoot>\n`;
      }
      xml += `      </Roots>\n`;
      rootCount = rootGroups.size;
    }
  } else {
    // ── Synthetic mode: group IU external elements by entity ──
    const byEntity = new Map();
    walkErs(erHierarchy, (er) => {
      const erUuid = exchangeAncestorUuid.get(er.id) || erUuidMap.get(er.id) || toUuid(er.id);
      walkIus(er.informationUnits, null, (iu, inheritedEntity) => {
        const hasChildren = (iu.subInformationUnits || []).length > 0;
        for (const m of iu.correspondingExternalElements || iu.correspondingExternalElement || []) {
          const d = classifyMapping(m, inheritedEntity);
          if (!d) continue;
          if (d.kind === 'entity' && hasChildren) continue;
          if (!d.entity) continue;
          let tplUuid = null;
          if (d.kind === 'pset')      tplUuid = TPL_PSET_UUID;
          else if (d.kind === 'qto')  tplUuid = TPL_QTO_UUID;
          else if (d.kind === 'attr') tplUuid = attrTemplates.get(d.attr);
          if (!tplUuid) continue;
          if (!byEntity.has(d.entity)) byEntity.set(d.entity, []);
          byEntity.get(d.entity).push({
            iu, erUuid, isMandatory: iu.isMandatory !== false,
            kind: d.kind, pset: d.pset, prop: d.prop, attr: d.attr, entity: d.entity, tplUuid,
          });
          conceptCount++;
        }
      });
    });
    rootCount = byEntity.size;
    if (rootCount > 0) {
      xml += `      <Roots>\n`;
      for (const [entity, concepts] of byEntity) {
        const rootUuid = genUuid();
        const firstEr  = allErs.find(({ uuid }) => uuid === concepts[0]?.erUuid);
        const rootDesc = firstEr ? (firstEr.er.description || firstEr.er.definition || '') : '';
        xml += `        <ConceptRoot uuid="${rootUuid}" name="${escXml(entity)}" applicableRootEntity="${escXml(entity)}">\n`;
        if (rootDesc) xml += renderDefinitions(rootDesc, '          ');
        xml += `          <Concepts>\n`;
        for (const c of concepts) xml += renderConcept(c);
        xml += `          </Concepts>\n`;
        xml += `        </ConceptRoot>\n`;
      }
      xml += `      </Roots>\n`;
    }
  }

  xml += `    </ModelView>\n  </Views>\n</mvdXML>\n`;

  // Count IUs with no IFC mappings (skipped)
  let totalIUs = 0;
  const iusWithConcepts = new Set();
  walkErs(erHierarchy, (er) => {
    walkIus(er.informationUnits, null, (iu, inheritedEntity) => {
      totalIUs++;
      for (const m of iu.correspondingExternalElements || iu.correspondingExternalElement || []) {
        const d = classifyMapping(m, inheritedEntity);
        if (d && (d.kind === 'pset' || d.kind === 'attr')) {
          iusWithConcepts.add(iu.id || iu.name);
          break;
        }
      }
    });
  });
  const skippedIUs = totalIUs - iusWithConcepts.size;

  return { xml, erCount: allErs.length, conceptCount, rootCount, skippedIUs, totalIUs };
}
