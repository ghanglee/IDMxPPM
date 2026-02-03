/**
 * xPPM Importer - Import legacy xPPM files into IDMxPPM neo-Seoul
 *
 * xPPM is a previous version of the IDM authoring tool.
 * This importer converts xPPM format (.xppm) to the neo-Seoul format.
 *
 * xPPM Structure:
 * - Root <idm> element
 * - <specId> - IDM metadata
 * - <authoring> - Authors, changeLogs, committee
 * - <uc> - Use Case section
 * - <businessContextMap> - Contains process map with BPMN reference
 * - <er> - Exchange Requirements (can be nested)
 */

/**
 * Parse xPPM XML string and extract IDM data
 * @param {string} xppmContent - The xPPM XML content
 * @param {string} bpmnContent - Optional BPMN XML content (if loaded separately)
 * @returns {Object} Parsed IDM data in neo-Seoul format
 */
export const parseXppm = (xppmContent, bpmnContent = null) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xppmContent, 'text/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid xPPM XML: ' + parseError.textContent);
  }

  const result = {
    headerData: parseHeaderData(doc),
    erDataMap: {},
    erLibrary: [],
    bpmnXml: bpmnContent,
    dataObjectErMap: {}, // Map of data object IDs to ER GUIDs
    images: [] // Image references
  };

  // Parse Use Case
  result.headerData = {
    ...result.headerData,
    ...parseUseCase(doc)
  };

  // Parse Business Context Map and get data object mappings
  const bcmData = parseBusinessContextMap(doc);
  result.dataObjectErMap = bcmData.dataObjectErMap;
  result.bpmnFilePath = bcmData.bpmnFilePath;

  // Parse Exchange Requirements
  const { erDataMap, erLibrary } = parseExchangeRequirements(doc);
  result.erDataMap = erDataMap;
  result.erLibrary = erLibrary;

  return result;
};

/**
 * Parse header/specification data from xPPM
 */
const parseHeaderData = (doc) => {
  const specId = doc.querySelector('idm > specId');
  const authoring = doc.querySelector('idm > authoring');

  const headerData = {
    fullTitle: specId?.getAttribute('fullTitle') || '',
    shortTitle: specId?.getAttribute('shortTitle') || '',
    subTitle: specId?.getAttribute('subTitle') || '',
    idmCode: specId?.getAttribute('idmCode') || '',
    localCode: specId?.getAttribute('localCode') || '',
    status: specId?.getAttribute('documentStatus') || 'NP',
    version: specId?.getAttribute('version') || '0.1',
    guid: specId?.getAttribute('guid') || generateUUID(),
    copyright: authoring?.getAttribute('copyright') || '',

    // Authors
    authorsList: parseAuthors(authoring),

    // Revision history
    creationDate: parseCreationDate(authoring),
    modificationHistory: parseModificationHistory(authoring)
  };

  return headerData;
};

/**
 * Parse authors from authoring section
 */
const parseAuthors = (authoring) => {
  if (!authoring) return [];

  const authors = [];
  const authorElements = authoring.querySelectorAll('author');

  authorElements.forEach(author => {
    const firstName = author.getAttribute('firstName') || '';
    const lastName = author.getAttribute('lastName') || '';
    const affiliation = author.getAttribute('affiliation') || '';
    const email = author.getAttribute('digitalSignature') || '';

    if (firstName || lastName) {
      authors.push({
        type: 'person',
        givenName: firstName,
        familyName: lastName,
        uri: email,
        affiliation: affiliation
      });
    }
  });

  return authors;
};

/**
 * Parse creation date from change logs
 */
const parseCreationDate = (authoring) => {
  if (!authoring) return '';

  const changeLogs = authoring.querySelectorAll('changeLog');
  if (changeLogs.length > 0) {
    // Get the earliest date
    let earliestDate = null;
    changeLogs.forEach(log => {
      const dateStr = log.getAttribute('changeDateTime');
      if (dateStr) {
        const date = new Date(dateStr);
        if (!earliestDate || date < earliestDate) {
          earliestDate = date;
        }
      }
    });
    if (earliestDate) {
      return earliestDate.toISOString().split('T')[0];
    }
  }
  return '';
};

/**
 * Parse modification history from change logs
 */
const parseModificationHistory = (authoring) => {
  if (!authoring) return [];

  const history = [];
  const changeLogs = authoring.querySelectorAll('changeLog');

  // Get only the last few significant changes
  const recentLogs = Array.from(changeLogs).slice(-5);

  recentLogs.forEach(log => {
    const dateStr = log.getAttribute('changeDateTime');
    const summary = log.getAttribute('changeSummary') || '';

    if (dateStr) {
      const date = dateStr.split(' ')[0]; // Extract just the date part
      const changes = log.querySelectorAll('change');
      const changeElements = Array.from(changes).map(c => c.getAttribute('changedElement')).filter(Boolean);

      history.push({
        date: date,
        description: summary || `Updated: ${changeElements.join(', ')}`
      });
    }
  });

  return history;
};

/**
 * Parse Use Case section
 */
const parseUseCase = (doc) => {
  const uc = doc.querySelector('uc');
  if (!uc) return {};

  const ucData = {};

  // Summary
  const summaryContent = uc.querySelector('summary > description > content');
  if (summaryContent) {
    ucData.summary = summaryContent.textContent || '';
  }

  // Aim and Scope
  const aimContent = uc.querySelector('aimAndScope > description > content');
  if (aimContent) {
    ucData.aimAndScope = aimContent.textContent || '';
  }

  // Language
  const language = uc.querySelector('language');
  if (language) {
    ucData.language = language.textContent || 'EN';
  }

  // Use (BIM Use)
  const use = uc.querySelector('use');
  if (use) {
    ucData.use = use.getAttribute('name') || '';
  }

  // Actors
  const actors = uc.querySelectorAll('actor');
  ucData.actorsList = Array.from(actors).map(actor => ({
    id: actor.getAttribute('id') || generateUUID(),
    name: actor.getAttribute('name') || '',
    role: '',
    bpmnId: null
  }));

  // Project Phases
  const standardPhase = uc.querySelector('standardProjectPhase > name');
  const localPhase = uc.querySelector('localProjectPhase > name');

  ucData.targetPhases = {
    iso22263: standardPhase ? [standardPhase.textContent.trim()] : [],
    aiaB101: [],
    ribaPow: []
  };

  // Region
  const region = uc.querySelector('region');
  if (region) {
    ucData.region = {
      type: region.getAttribute('type') || 'Country',
      value: region.getAttribute('value') || ''
    };
  }

  return ucData;
};

/**
 * Parse Business Context Map to get BPMN file path and data object mappings
 */
const parseBusinessContextMap = (doc) => {
  const bcm = doc.querySelector('businessContextMap');
  const result = {
    bpmnFilePath: null,
    dataObjectErMap: {}
  };

  if (!bcm) return result;

  // Get BPMN diagram path
  const diagram = bcm.querySelector('pm > diagram');
  if (diagram) {
    result.bpmnFilePath = diagram.getAttribute('filePath');
  }

  // Get data object to ER mappings
  const mappings = bcm.querySelectorAll('pm > dataObjectAndEr');
  mappings.forEach(mapping => {
    const dataObjectId = mapping.querySelector('associatedDataObject')?.textContent;
    const erGuid = mapping.querySelector('associatedEr')?.textContent;

    if (dataObjectId && erGuid) {
      result.dataObjectErMap[dataObjectId] = erGuid;
    }
  });

  return result;
};

/**
 * Parse Exchange Requirements recursively
 */
const parseExchangeRequirements = (doc) => {
  const erRoot = doc.querySelector('idm > er');
  const erDataMap = {};
  const erLibrary = [];

  if (!erRoot) return { erDataMap, erLibrary };

  // Parse top-level ER and all nested ERs
  const parseErElement = (erElement, parentId = null) => {
    const specId = erElement.querySelector(':scope > specId');
    if (!specId) return null;

    const guid = specId.getAttribute('guid');
    const erData = {
      id: guid,
      name: specId.getAttribute('fullTitle') || specId.getAttribute('shortTitle') || '',
      shortTitle: specId.getAttribute('shortTitle') || '',
      idmCode: specId.getAttribute('idmCode') || '',
      localCode: specId.getAttribute('localCode') || '',
      status: specId.getAttribute('documentStatus') || 'NP',
      version: specId.getAttribute('version') || '',
      definition: '',
      informationUnits: [],
      constraints: [],
      subErs: [],
      correspondingMvd: null,
      parentId: parentId
    };

    // Parse description
    const description = erElement.querySelector(':scope > description > content');
    if (description) {
      erData.definition = description.textContent || '';
    }

    // Parse information units
    const infoUnits = erElement.querySelectorAll(':scope > informationUnit');
    erData.informationUnits = Array.from(infoUnits).map(iu => parseInformationUnit(iu));

    // Parse correspondingMvd
    const mvd = erElement.querySelector(':scope > correspondingMvd');
    if (mvd) {
      const mvdName = mvd.getAttribute('name');
      const mvdBasis = mvd.getAttribute('basis');
      if (mvdName || mvdBasis) {
        erData.correspondingMvd = {
          name: mvdName || '',
          basis: mvdBasis || ''
        };
      }
    }

    // Add to library
    erLibrary.push({
      id: guid,
      name: erData.name,
      shortTitle: erData.shortTitle,
      definition: erData.definition
    });

    // Parse nested ERs (sub-ERs)
    const nestedErs = erElement.querySelectorAll(':scope > er');
    nestedErs.forEach(nestedEr => {
      const subErData = parseErElement(nestedEr, guid);
      if (subErData) {
        erData.subErs.push({ id: subErData.id, name: subErData.name });
      }
    });

    erDataMap[guid] = erData;
    return erData;
  };

  // Start parsing from the root ER element
  parseErElement(erRoot);

  // Also parse any sibling ER elements at the same level
  const siblingErs = doc.querySelectorAll('idm > er > er');
  siblingErs.forEach(er => {
    parseErElement(er);
  });

  return { erDataMap, erLibrary };
};

/**
 * Parse an information unit element
 */
const parseInformationUnit = (iuElement) => {
  const iu = {
    id: iuElement.getAttribute('id') || generateUUID(),
    name: iuElement.getAttribute('name') || '',
    dataType: mapDataType(iuElement.getAttribute('dataType')),
    isMandatory: iuElement.getAttribute('isMandatory') === 'true',
    definition: iuElement.getAttribute('definition') || '',
    examples: '',
    externalMappings: [],
    subUnits: []
  };

  // Parse description/examples
  const descriptionContent = iuElement.querySelector(':scope > description > content');
  if (descriptionContent) {
    iu.examples = descriptionContent.textContent || '';
  }

  // Parse nested information units
  const nestedUnits = iuElement.querySelectorAll(':scope > informationUnit');
  iu.subUnits = Array.from(nestedUnits).map(nested => parseInformationUnit(nested));

  return iu;
};

/**
 * Map xPPM data types to neo-Seoul data types
 */
const mapDataType = (xppmType) => {
  const typeMap = {
    'String': 'String / Text',
    'Text': 'String / Text',
    'Number': 'Numeric',
    'Numeric': 'Numeric',
    'Integer': 'Numeric',
    'Float': 'Numeric',
    'Boolean': 'Boolean',
    'Date': 'Date / Time',
    'DateTime': 'Date / Time',
    'Time': 'Date / Time',
    'Image': 'Image',
    'Document': 'Document',
    'File': 'Document',
    'Binary': 'Document',
    'Model': '3D Model',
    '3DModel': '3D Model',
    'Drawing': '2D Vector Drawing',
    '2DDrawing': '2D Vector Drawing',
    'List': 'Structured (list)',
    'Array': 'Structured (list)',
    'Object': 'Structured (JSON)',
    'JSON': 'Structured (JSON)'
  };

  return typeMap[xppmType] || xppmType || 'String / Text';
};

/**
 * Generate a UUID
 */
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Convert parsed xPPM data to neo-Seoul project format
 * This creates the erDataMap keyed by BPMN data object IDs
 */
export const convertToNeoSeoul = (parsedData) => {
  const { headerData, erDataMap, erLibrary, bpmnXml, dataObjectErMap } = parsedData;

  // Create a new erDataMap keyed by data object IDs for bpmn-js compatibility
  const newErDataMap = {};

  // For each data object -> ER mapping, create an entry
  Object.entries(dataObjectErMap).forEach(([dataObjectId, erGuid]) => {
    if (erDataMap[erGuid]) {
      newErDataMap[dataObjectId] = {
        ...erDataMap[erGuid],
        dataObjectId: dataObjectId
      };
    }
  });

  // Also include ERs that might not be linked to data objects yet
  Object.entries(erDataMap).forEach(([erGuid, erData]) => {
    // Check if this ER is already linked
    const isLinked = Object.values(dataObjectErMap).includes(erGuid);
    if (!isLinked) {
      // Add to library for later linking
      newErDataMap[`unlinked_${erGuid}`] = {
        ...erData,
        dataObjectId: null
      };
    }
  });

  return {
    headerData: {
      ...headerData,
      // Ensure all required fields have defaults
      fullTitle: headerData.fullTitle || 'Imported xPPM Project',
      shortTitle: headerData.shortTitle || 'xPPM Import',
      status: headerData.status || 'NP',
      version: headerData.version || '0.1',
      authorsList: headerData.authorsList || [],
      actorsList: headerData.actorsList || [],
      summary: headerData.summary || '',
      aimAndScope: headerData.aimAndScope || '',
      use: headerData.use || '',
      language: headerData.language || 'EN',
      targetPhases: headerData.targetPhases || { iso22263: [], aiaB101: [], ribaPow: [] },
      benefits: '',
      limitations: '',
      keywords: [],
      references: [],
      additionalDescription: ''
    },
    erDataMap: newErDataMap,
    erLibrary: erLibrary,
    bpmnXml: bpmnXml,
    originalErDataMap: erDataMap, // Keep original for reference
    dataObjectErMap: dataObjectErMap
  };
};

/**
 * Import xPPM from file content
 * @param {string} xppmContent - The xPPM XML content
 * @param {string} bpmnContent - The BPMN XML content (optional, can be loaded from file)
 * @param {Object} images - Map of image filenames to base64 data (optional)
 * @returns {Object} Project data ready for neo-Seoul
 */
export const importXppm = (xppmContent, bpmnContent = null, images = {}) => {
  const parsed = parseXppm(xppmContent, bpmnContent);
  const converted = convertToNeoSeoul(parsed);

  return {
    ...converted,
    images: images,
    importedFrom: 'xppm'
  };
};

/**
 * Check if a file is an xPPM file
 */
export const isXppmFile = (filename) => {
  return filename.toLowerCase().endsWith('.xppm');
};

/**
 * Load xPPM bundle from folder structure
 * This is used when loading from a folder with .xppm, Diagram/, and Image/ subfolders
 */
export const loadXppmBundle = async (files) => {
  let xppmContent = null;
  let bpmnContent = null;
  const images = {};

  for (const file of files) {
    const path = file.webkitRelativePath || file.name;

    if (path.endsWith('.xppm')) {
      xppmContent = await readFileAsText(file);
    } else if (path.includes('Diagram/') && path.endsWith('.bpmn')) {
      bpmnContent = await readFileAsText(file);
    } else if (path.includes('Image/') && isImageFile(path)) {
      const imageData = await readFileAsBase64(file);
      const filename = path.split('/').pop();
      images[filename] = imageData;
    }
  }

  if (!xppmContent) {
    throw new Error('No .xppm file found in the selected folder');
  }

  return importXppm(xppmContent, bpmnContent, images);
};

/**
 * Read file as text
 */
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

/**
 * Read file as base64
 */
const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
};

/**
 * Check if file is an image
 */
const isImageFile = (filename) => {
  const ext = filename.toLowerCase().split('.').pop();
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext);
};

export default {
  parseXppm,
  convertToNeoSeoul,
  importXppm,
  isXppmFile,
  loadXppmBundle
};
