/**
 * Mapping schemas for information unit mappings (correspondingExternalElement/@basis).
 *
 * Built-in schemas are fixed. Users can add their own ("custom") schemas, e.g. BCF 3.0 or COBie:
 *  - project schemas are stored in headerData.mappingSchemas and saved in the .idm project file;
 *  - library schemas are stored in the browser/Electron localStorage and offered in every project;
 *  - detected schemas are derived from the basis values already used by mappings (e.g. after an
 *    idmXML import); they need no storage because the basis string is in the data.
 * The basis string written to idmXML is the schema name (value) in every case.
 */

export const OTHER_SCHEMA = 'Other';

export const BUILTIN_SCHEMAS = [
  { value: 'bSDD', label: 'bSDD', searchable: true, apiEnabled: true, source: 'builtin' },
  { value: 'IFC 2x3', label: 'IFC 2x3', searchable: true, source: 'builtin' },
  { value: 'IFC 4x3 ADD2', label: 'IFC 4x3 ADD2', searchable: true, source: 'builtin' },
  { value: 'CityGML', label: 'CityGML', searchable: true, source: 'builtin' },
  { value: 'UniFormat', label: 'UniFormat', searchable: true, source: 'builtin' },
  { value: 'OmniClass', label: 'OmniClass', searchable: true, source: 'builtin' },
  { value: 'MasterFormat', label: 'MasterFormat', searchable: true, source: 'builtin' },
  { value: OTHER_SCHEMA, label: 'Other', searchable: false, source: 'builtin' }
];

/** Ready-made custom schemas offered in the "Add mapping schema" dialog. */
export const SCHEMA_PRESETS = [
  {
    value: 'BCF 3.0',
    version: '3.0',
    uri: 'https://github.com/buildingSMART/BCF-XML/tree/release_3_0',
    description: 'buildingSMART BIM Collaboration Format, BCF-XML 3.0 (markup.bcf, viewpoint .bcfv, extensions.xml)',
    placeholder: 'e.g. Markup/Topic/Title',
    elements: [
    {"name": "Markup"},
    {"name": "Markup/Header"},
    {"name": "Markup/Header/Files"},
    {"name": "Markup/Header/Files/File", "description": "Model file the topic refers to"},
    {"name": "Markup/Header/Files/File/@IfcProject"},
    {"name": "Markup/Header/Files/File/@IfcSpatialStructureElement"},
    {"name": "Markup/Header/Files/File/@IsExternal"},
    {"name": "Markup/Header/Files/File/Filename"},
    {"name": "Markup/Header/Files/File/Date"},
    {"name": "Markup/Header/Files/File/Reference"},
    {"name": "Markup/Topic", "description": "One topic (issue) per markup.bcf"},
    {"name": "Markup/Topic/@Guid", "description": "Unique identifier of the topic"},
    {"name": "Markup/Topic/@ServerAssignedId", "description": "Identifier assigned by the BCF server, e.g. a sequential number"},
    {"name": "Markup/Topic/@TopicType", "description": "Type of the topic (value from extensions.xml)"},
    {"name": "Markup/Topic/@TopicStatus", "description": "Status of the topic (value from extensions.xml)"},
    {"name": "Markup/Topic/ReferenceLinks"},
    {"name": "Markup/Topic/ReferenceLinks/ReferenceLink"},
    {"name": "Markup/Topic/Title", "description": "Title of the topic"},
    {"name": "Markup/Topic/Priority", "description": "Priority (value from extensions.xml)"},
    {"name": "Markup/Topic/Index"},
    {"name": "Markup/Topic/Labels"},
    {"name": "Markup/Topic/Labels/Label", "description": "Label (value from extensions.xml)"},
    {"name": "Markup/Topic/CreationDate", "description": "Date and time of creation"},
    {"name": "Markup/Topic/CreationAuthor", "description": "User who created the topic"},
    {"name": "Markup/Topic/ModifiedDate", "description": "Date and time of the last change"},
    {"name": "Markup/Topic/ModifiedAuthor", "description": "User who made the last change"},
    {"name": "Markup/Topic/DueDate", "description": "Date and time by which the topic shall be resolved"},
    {"name": "Markup/Topic/AssignedTo", "description": "User the topic is assigned to"},
    {"name": "Markup/Topic/Stage", "description": "Project stage (value from extensions.xml)"},
    {"name": "Markup/Topic/Description", "description": "Description of the topic"},
    {"name": "Markup/Topic/BimSnippet"},
    {"name": "Markup/Topic/BimSnippet/@SnippetType"},
    {"name": "Markup/Topic/BimSnippet/@IsExternal"},
    {"name": "Markup/Topic/BimSnippet/Reference"},
    {"name": "Markup/Topic/BimSnippet/ReferenceSchema"},
    {"name": "Markup/Topic/DocumentReferences"},
    {"name": "Markup/Topic/DocumentReferences/DocumentReference", "description": "Reference to a document in the BCF file or a URL"},
    {"name": "Markup/Topic/DocumentReferences/DocumentReference/@Guid"},
    {"name": "Markup/Topic/DocumentReferences/DocumentReference/DocumentGuid"},
    {"name": "Markup/Topic/DocumentReferences/DocumentReference/Url"},
    {"name": "Markup/Topic/DocumentReferences/DocumentReference/Description"},
    {"name": "Markup/Topic/RelatedTopics"},
    {"name": "Markup/Topic/RelatedTopics/RelatedTopic"},
    {"name": "Markup/Topic/RelatedTopics/RelatedTopic/@Guid", "description": "GUID of a related topic"},
    {"name": "Markup/Topic/Comments"},
    {"name": "Markup/Topic/Comments/Comment", "description": "Comment on the topic"},
    {"name": "Markup/Topic/Comments/Comment/@Guid"},
    {"name": "Markup/Topic/Comments/Comment/Date"},
    {"name": "Markup/Topic/Comments/Comment/Author"},
    {"name": "Markup/Topic/Comments/Comment/Comment"},
    {"name": "Markup/Topic/Comments/Comment/Viewpoint"},
    {"name": "Markup/Topic/Comments/Comment/Viewpoint/@Guid"},
    {"name": "Markup/Topic/Comments/Comment/ModifiedDate"},
    {"name": "Markup/Topic/Comments/Comment/ModifiedAuthor"},
    {"name": "Markup/Topic/Viewpoints"},
    {"name": "Markup/Topic/Viewpoints/ViewPoint", "description": "Viewpoint of the topic"},
    {"name": "Markup/Topic/Viewpoints/ViewPoint/@Guid"},
    {"name": "Markup/Topic/Viewpoints/ViewPoint/Viewpoint"},
    {"name": "Markup/Topic/Viewpoints/ViewPoint/Snapshot", "description": "Snapshot image (PNG or JPEG) of the viewpoint"},
    {"name": "Markup/Topic/Viewpoints/ViewPoint/Index"},
    {"name": "VisualizationInfo", "description": "Viewpoint file (.bcfv)"},
    {"name": "VisualizationInfo/@Guid"},
    {"name": "VisualizationInfo/Components"},
    {"name": "VisualizationInfo/Components/Selection"},
    {"name": "VisualizationInfo/Components/Selection/Component"},
    {"name": "VisualizationInfo/Components/Selection/Component/@IfcGuid", "description": "IFC GlobalId of a selected component"},
    {"name": "VisualizationInfo/Components/Selection/Component/OriginatingSystem"},
    {"name": "VisualizationInfo/Components/Selection/Component/AuthoringToolId"},
    {"name": "VisualizationInfo/Components/Visibility"},
    {"name": "VisualizationInfo/Components/Visibility/@DefaultVisibility"},
    {"name": "VisualizationInfo/Components/Visibility/ViewSetupHints"},
    {"name": "VisualizationInfo/Components/Visibility/ViewSetupHints/@SpacesVisible"},
    {"name": "VisualizationInfo/Components/Visibility/ViewSetupHints/@SpaceBoundariesVisible"},
    {"name": "VisualizationInfo/Components/Visibility/ViewSetupHints/@OpeningsVisible"},
    {"name": "VisualizationInfo/Components/Visibility/Exceptions"},
    {"name": "VisualizationInfo/Components/Visibility/Exceptions/Component"},
    {"name": "VisualizationInfo/Components/Visibility/Exceptions/Component/@IfcGuid"},
    {"name": "VisualizationInfo/Components/Visibility/Exceptions/Component/OriginatingSystem"},
    {"name": "VisualizationInfo/Components/Visibility/Exceptions/Component/AuthoringToolId"},
    {"name": "VisualizationInfo/Components/Coloring"},
    {"name": "VisualizationInfo/Components/Coloring/Color"},
    {"name": "VisualizationInfo/Components/Coloring/Color/@Color"},
    {"name": "VisualizationInfo/Components/Coloring/Color/Components"},
    {"name": "VisualizationInfo/Components/Coloring/Color/Components/Component"},
    {"name": "VisualizationInfo/Components/Coloring/Color/Components/Component/@IfcGuid"},
    {"name": "VisualizationInfo/Components/Coloring/Color/Components/Component/OriginatingSystem"},
    {"name": "VisualizationInfo/Components/Coloring/Color/Components/Component/AuthoringToolId"},
    {"name": "VisualizationInfo/OrthogonalCamera", "description": "Orthogonal camera of the viewpoint"},
    {"name": "VisualizationInfo/OrthogonalCamera/CameraViewPoint"},
    {"name": "VisualizationInfo/OrthogonalCamera/CameraDirection"},
    {"name": "VisualizationInfo/OrthogonalCamera/CameraUpVector"},
    {"name": "VisualizationInfo/OrthogonalCamera/ViewToWorldScale"},
    {"name": "VisualizationInfo/OrthogonalCamera/AspectRatio"},
    {"name": "VisualizationInfo/PerspectiveCamera", "description": "Perspective camera of the viewpoint"},
    {"name": "VisualizationInfo/PerspectiveCamera/CameraViewPoint"},
    {"name": "VisualizationInfo/PerspectiveCamera/CameraDirection"},
    {"name": "VisualizationInfo/PerspectiveCamera/CameraUpVector"},
    {"name": "VisualizationInfo/PerspectiveCamera/FieldOfView"},
    {"name": "VisualizationInfo/PerspectiveCamera/AspectRatio"},
    {"name": "VisualizationInfo/Lines"},
    {"name": "VisualizationInfo/Lines/Line"},
    {"name": "VisualizationInfo/ClippingPlanes"},
    {"name": "VisualizationInfo/ClippingPlanes/ClippingPlane"},
    {"name": "VisualizationInfo/Bitmaps"},
    {"name": "VisualizationInfo/Bitmaps/Bitmap"},
    {"name": "Extensions", "description": "Project vocabulary file (extensions.xml)"},
    {"name": "Extensions/TopicTypes"},
    {"name": "Extensions/TopicTypes/TopicType"},
    {"name": "Extensions/TopicStatuses"},
    {"name": "Extensions/TopicStatuses/TopicStatus"},
    {"name": "Extensions/Priorities"},
    {"name": "Extensions/Priorities/Priority"},
    {"name": "Extensions/TopicLabels"},
    {"name": "Extensions/TopicLabels/TopicLabel"},
    {"name": "Extensions/Users"},
    {"name": "Extensions/Users/User"},
    {"name": "Extensions/SnippetTypes"},
    {"name": "Extensions/SnippetTypes/SnippetType"},
    {"name": "Extensions/Stages"},
    {"name": "Extensions/Stages/Stage"}
    ]
  }
];

const LIBRARY_KEY = 'xppm-neo-seoul.mappingSchemaLibrary.v1';

/** Comparison key: case- and whitespace-insensitive. */
export const schemaKey = (name) => String(name || '').replace(/\s+/g, '').toLowerCase();

export const normalizeSchemaName = (name) => String(name || '').replace(/\s+/g, ' ').trim();

export const isBuiltinSchema = (name) => BUILTIN_SCHEMAS.some(s => schemaKey(s.value) === schemaKey(name));

/**
 * Parse an element list, one element per line: "path", "path | description" or "path<TAB>description".
 * Blank lines and lines starting with # are ignored; duplicates are removed.
 */
export const parseElementList = (text) => {
  const seen = new Set();
  const out = [];
  String(text || '').split(/\r?\n/).forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const m = t.split(/\s*\|\s*|\t+/);
    const name = m[0].trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    const description = m.slice(1).join(' ').trim();
    out.push(description ? { name, description } : { name });
  });
  return out;
};

export const formatElementList = (elements) =>
  (elements || []).map(e => (e.description ? `${e.name} | ${e.description}` : e.name)).join('\n');

/** Returns an error message, or null if the name can be used for a new schema. */
export const validateSchemaName = (name, existing = []) => {
  const n = normalizeSchemaName(name);
  if (!n) return 'Enter a schema name.';
  if (n.length > 80) return 'The name is too long (max. 80 characters).';
  if (isBuiltinSchema(n)) return `"${n}" is a built-in schema.`;
  if (existing.some(s => schemaKey(s.value) === schemaKey(n) && s.source !== 'detected')) return `A schema named "${n}" already exists.`;
  return null;
};

/** Create a clean custom schema object (what is stored in the project and in the library). */
export const makeCustomSchema = ({ value, version = '', uri = '', description = '', placeholder = '', elements = [] }) => {
  const s = { value: normalizeSchemaName(value), label: normalizeSchemaName(value) };
  if (version.trim()) s.version = version.trim();
  if (uri.trim()) s.uri = uri.trim();
  if (description.trim()) s.description = description.trim();
  if (placeholder.trim()) s.placeholder = placeholder.trim();
  if (elements.length) s.elements = elements;
  return s;
};

const decorate = (s, source) => ({
  ...s,
  label: s.label || s.value,
  source,
  custom: true,
  searchable: Array.isArray(s.elements) && s.elements.length > 0
});

/** Distinct basis values in the ER hierarchy that are not built-in schemas (incl. Other + customBasis). */
export const detectCustomBases = (erHierarchy) => {
  const found = new Map();
  const visitIu = (iu) => {
    (iu.correspondingExternalElements || []).forEach(m => {
      const b = m.basis === OTHER_SCHEMA ? m.customBasis : m.basis;
      const n = normalizeSchemaName(b);
      if (n && !isBuiltinSchema(n) && !found.has(schemaKey(n))) found.set(schemaKey(n), n);
    });
    (iu.subInformationUnits || []).forEach(visitIu);
  };
  const visitEr = (er) => {
    (er.informationUnits || []).forEach(visitIu);
    (er.subERs || er.subErs || []).forEach(visitEr);
  };
  (erHierarchy || []).forEach(visitEr);
  return [...found.values()];
};

/** Count the mappings in the hierarchy that use a basis. */
export const countSchemaUsage = (erHierarchy, name) => {
  let n = 0;
  const k = schemaKey(name);
  const visitIu = (iu) => {
    (iu.correspondingExternalElements || []).forEach(m => {
      if (schemaKey(m.basis === OTHER_SCHEMA ? m.customBasis : m.basis) === k) n++;
    });
    (iu.subInformationUnits || []).forEach(visitIu);
  };
  const visitEr = (er) => { (er.informationUnits || []).forEach(visitIu); (er.subERs || er.subErs || []).forEach(visitEr); };
  (erHierarchy || []).forEach(visitEr);
  return n;
};

/**
 * Options for the basis selectors: built-in schemas, then project, library and detected schemas
 * (de-duplicated by name, project first), then Other last.
 */
export const mergeSchemaOptions = (projectSchemas = [], librarySchemas = [], detectedNames = []) => {
  const out = BUILTIN_SCHEMAS.filter(s => s.value !== OTHER_SCHEMA);
  const seen = new Set(out.map(s => schemaKey(s.value)));
  const add = (s, source) => {
    const k = schemaKey(s.value);
    if (!k || seen.has(k)) return;
    seen.add(k);
    out.push(decorate(s, source));
  };
  (projectSchemas || []).forEach(s => add(s, 'project'));
  (librarySchemas || []).forEach(s => add(s, 'library'));
  (detectedNames || []).forEach(n => add({ value: n }, 'detected'));
  out.push(BUILTIN_SCHEMAS.find(s => s.value === OTHER_SCHEMA));
  return out;
};

/**
 * Mappings stored as basis "Other" + customBasis "X" where X is a known schema are shown and edited as
 * basis "X" (the idmXML export writes the same basis string either way).
 */
export const resolveMappingBasis = (mapping, options) => {
  if (mapping?.basis === OTHER_SCHEMA && mapping.customBasis) {
    const hit = options.find(o => o.custom && schemaKey(o.value) === schemaKey(mapping.customBasis));
    if (hit) return hit.value;
  }
  return mapping?.basis;
};

/** Local search in the element list of a custom schema (same result shape as the built-in search). */
export const searchCustomSchema = (schema, query, matchType = 'exact', limit = 60) => {
  const q = String(query || '').trim().toLowerCase();
  const els = schema?.elements || [];
  const tokens = q.split(/[\s/.@]+/).filter(Boolean);
  const scored = [];
  els.forEach(e => {
    const name = e.name.toLowerCase();
    const leaf = name.split('/').pop().replace(/^@/, '');
    const desc = (e.description || '').toLowerCase();
    let score = 0;
    if (!q) score = 0.1;
    else if (leaf === q || name === q) score = 1;
    else if (leaf.startsWith(q)) score = 0.9;
    else if (name.includes(q)) score = 0.75;
    else if (matchType !== 'exact' && tokens.length && tokens.every(t => name.includes(t) || desc.includes(t))) score = 0.6;
    else if (matchType !== 'exact' && desc.includes(q)) score = 0.5;
    if (score > 0) scored.push({ e, score });
  });
  scored.sort((a, b) => b.score - a.score || a.e.name.length - b.e.name.length);
  return scored.slice(0, limit).map(({ e, score }) => ({
    name: e.name, code: e.name, description: e.description || '', category: schema.value, uri: schema.uri || '', score, matchType: score >= 1 ? 'exact' : 'partial'
  }));
};

/**
 * Element (and attribute) paths from one or more XSD documents, starting at the global elements
 * (or at rootNames if given). Handles named and anonymous complex types, sequence/choice/all,
 * complexContent/simpleContent extensions, attribute refs and attribute groups. Recursion stops at
 * repeated types and at maxDepth.
 */
export const elementsFromXsd = (xsdTexts, { rootNames = null, maxDepth = 8 } = {}) => {
  const XS = 'http://www.w3.org/2001/XMLSchema';
  const docs = (Array.isArray(xsdTexts) ? xsdTexts : [xsdTexts]).map(t => new DOMParser().parseFromString(t, 'application/xml'));
  const local = (n) => (n || '').replace(/^.*:/, '');
  const kids = (n) => Array.from(n.childNodes).filter(c => c.nodeType === 1 && c.namespaceURI === XS);
  const types = {}, groups = {}, globals = [];
  docs.forEach(d => {
    const root = d.documentElement;
    if (!root || root.localName !== 'schema') return;
    kids(root).forEach(c => {
      if (c.localName === 'complexType' && c.getAttribute('name')) types[c.getAttribute('name')] = c;
      else if (c.localName === 'attributeGroup' && c.getAttribute('name')) groups[c.getAttribute('name')] = c;
      else if (c.localName === 'element' && c.getAttribute('name')) globals.push(c);
    });
  });
  if (!globals.length) throw new Error('No global xs:element found. Is this an XML Schema (XSD) file?');
  const out = [];
  const seen = new Set();
  const parts = (ct, els, atts, visitedTypes) => {
    kids(ct).forEach(c => {
      const ln = c.localName;
      if (ln === 'element') els.push(c);
      else if (ln === 'attribute') atts.push(c.getAttribute('name') || local(c.getAttribute('ref')));
      else if (ln === 'attributeGroup') { const g = groups[local(c.getAttribute('ref'))]; if (g) parts(g, els, atts, visitedTypes); }
      else if (ln === 'extension') {
        const base = types[local(c.getAttribute('base'))];
        if (base && !visitedTypes.has(base)) { visitedTypes.add(base); parts(base, els, atts, visitedTypes); }
        parts(c, els, atts, visitedTypes);
      } else if (['sequence', 'choice', 'all', 'complexContent', 'simpleContent', 'restriction', 'group'].includes(ln)) parts(c, els, atts, visitedTypes);
    });
  };
  const walk = (el, path, depth, typeStack) => {
    const name = el.getAttribute('name') || local(el.getAttribute('ref'));
    if (!name) return;
    const p = path ? `${path}/${name}` : name;
    if (!seen.has(p)) { seen.add(p); out.push({ name: p }); }
    if (depth >= maxDepth) return;
    let ct = kids(el).find(c => c.localName === 'complexType');
    const typeName = local(el.getAttribute('type'));
    if (!ct && typeName) ct = types[typeName];
    if (!ct && el.getAttribute('ref')) { const g = globals.find(g => g.getAttribute('name') === name); if (g && g !== el) return walk(g, path, depth, typeStack); }
    if (!ct || typeStack.has(ct)) return;
    const els = [], atts = [];
    parts(ct, els, atts, new Set());
    atts.filter(Boolean).forEach(a => { const ap = `${p}/@${a}`; if (!seen.has(ap)) { seen.add(ap); out.push({ name: ap }); } });
    const next = new Set(typeStack); next.add(ct);
    els.forEach(e => walk(e, p, depth + 1, next));
  };
  const roots = rootNames && rootNames.length ? globals.filter(g => rootNames.includes(g.getAttribute('name'))) : globals;
  roots.forEach(g => walk(g, '', 0, new Set()));
  return out;
};

/** User schema library (localStorage). Never throws. */
export const loadSchemaLibrary = () => {
  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(s => s && s.value) : [];
  } catch { return []; }
};

export const saveSchemaLibrary = (list) => {
  try { window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(list || [])); return true; } catch { return false; }
};
