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

import { normalizeRegionCode } from './idmXmlParser.js';

/**
 * Remove BOM and clean XML content
 */
const cleanXmlContent = (content) => {
  // Remove BOM (Byte Order Mark) if present
  let cleaned = content.replace(/^\uFEFF/, '');
  // Remove any other problematic characters at the start
  cleaned = cleaned.replace(/^[^\x00-\x7F]+/, '');
  // Ensure it starts with <?xml or <
  const xmlStart = cleaned.indexOf('<?xml');
  if (xmlStart > 0) {
    cleaned = cleaned.substring(xmlStart);
  } else {
    const tagStart = cleaned.indexOf('<');
    if (tagStart > 0) {
      cleaned = cleaned.substring(tagStart);
    }
  }
  return cleaned;
};

/**
 * Parse xPPM XML string and extract IDM data
 * @param {string} xppmContent - The xPPM XML content
 * @param {string} bpmnContent - Optional BPMN XML content (if loaded separately)
 * @returns {Object} Parsed IDM data in neo-Seoul format
 */
export const parseXppm = (xppmContent, bpmnContent = null) => {
  // Clean the content before parsing
  const cleanedContent = cleanXmlContent(xppmContent);

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanedContent, 'text/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    console.error('xPPM parse error:', parseError.textContent);
    throw new Error('Invalid xPPM XML: ' + parseError.textContent);
  }

  // Debug: Log the root element
  console.log('xPPM root element:', doc.documentElement?.tagName);

  const result = {
    headerData: parseHeaderData(doc),
    erDataMap: {},
    erLibrary: [],
    bpmnXml: bpmnContent,
    dataObjectErMap: {}, // Map of data object IDs to ER GUIDs
    bpmnFilePath: null
  };

  // Parse Use Case and merge into headerData
  const ucData = parseUseCase(doc);
  console.log('Parsed Use Case data:', ucData);
  result.headerData = {
    ...result.headerData,
    ...ucData
  };

  // Parse Business Context Map and get data object mappings
  const bcmData = parseBusinessContextMap(doc);
  result.dataObjectErMap = bcmData.dataObjectErMap;
  result.bpmnFilePath = bcmData.bpmnFilePath;
  console.log('BPMN file path:', result.bpmnFilePath);
  console.log('Data object mappings:', result.dataObjectErMap);

  // Parse Exchange Requirements
  const { erDataMap, erLibrary } = parseExchangeRequirements(doc);
  result.erDataMap = erDataMap;
  result.erLibrary = erLibrary;
  console.log('Parsed ERs:', Object.keys(erDataMap).length);

  return result;
};

/**
 * Parse header/specification data from xPPM
 */
const parseHeaderData = (doc) => {
  const specId = doc.querySelector('idm > specId');
  const authoring = doc.querySelector('idm > authoring');

  console.log('specId element found:', !!specId);
  console.log('authoring element found:', !!authoring);

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

  console.log('Parsed header:', headerData.fullTitle, headerData.shortTitle);

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

  console.log('Parsed authors:', authors.length);
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
 * Parse image elements and return array of image references
 */
const parseImageElements = (parentElement, sectionName = '') => {
  if (!parentElement) return [];

  const images = [];
  const imageElements = parentElement.querySelectorAll(':scope > image, :scope > description > image');

  imageElements.forEach((img, index) => {
    const filePath = img.getAttribute('filePath') || '';
    const caption = img.getAttribute('caption') || '';
    const fileName = filePath.split(/[/\\]/).pop() || `image_${index + 1}`;

    images.push({
      id: `fig-${sectionName}-${Date.now()}-${index}`,
      name: fileName,
      caption: caption,
      filePath: filePath, // Original file path for later loading
      data: null, // Will be populated when images are loaded
      type: getImageMimeType(fileName),
      needsLoading: true // Flag to indicate image needs to be loaded
    });
  });

  return images;
};

/**
 * Get MIME type from filename
 */
const getImageMimeType = (fileName) => {
  const ext = fileName.toLowerCase().split('.').pop();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'svg': 'image/svg+xml',
    'webp': 'image/webp'
  };
  return mimeTypes[ext] || 'image/png';
};

/**
 * Parse Use Case section
 */
const parseUseCase = (doc) => {
  const uc = doc.querySelector('uc');
  if (!uc) {
    console.log('No UC element found');
    return {};
  }

  console.log('UC element found');
  const ucData = {};

  // Summary - try multiple paths
  let summaryContent = uc.querySelector('summary > description > content');
  if (!summaryContent) {
    summaryContent = uc.querySelector('summary description content');
  }
  if (!summaryContent) {
    summaryContent = uc.querySelector('summary content');
  }
  if (summaryContent) {
    ucData.summary = summaryContent.textContent || '';
    console.log('Summary found:', ucData.summary.substring(0, 50) + '...');
  } else {
    console.log('No summary content found');
  }

  // Aim and Scope - try multiple paths
  let aimContent = uc.querySelector('aimAndScope > description > content');
  if (!aimContent) {
    aimContent = uc.querySelector('aimAndScope description content');
  }
  if (!aimContent) {
    aimContent = uc.querySelector('aimAndScope content');
  }
  if (aimContent) {
    ucData.aimAndScope = aimContent.textContent || '';
    console.log('Aim and Scope found:', ucData.aimAndScope.substring(0, 50) + '...');
  } else {
    console.log('No aimAndScope content found');
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
    console.log('Use found:', ucData.use);
  }

  // Actors
  const actors = uc.querySelectorAll('actor');
  ucData.actorsList = Array.from(actors).map(actor => ({
    id: actor.getAttribute('id') || generateUUID(),
    name: actor.getAttribute('name') || '',
    role: '',
    bpmnId: null
  }));
  console.log('Actors found:', ucData.actorsList.length);

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

  // Parse images from various sections
  const summarySection = uc.querySelector('summary');
  const aimSection = uc.querySelector('aimAndScope');
  const benefitsSection = uc.querySelector('benefits');
  const limitationsSection = uc.querySelector('limitations');

  ucData.summaryFigures = parseImageElements(summarySection, 'summary');
  ucData.aimAndScopeFigures = parseImageElements(aimSection, 'aim');
  ucData.benefitsFigures = parseImageElements(benefitsSection, 'benefits');
  ucData.limitationsFigures = parseImageElements(limitationsSection, 'limitations');

  // Log image counts
  const totalImages = (ucData.summaryFigures?.length || 0) +
    (ucData.aimAndScopeFigures?.length || 0) +
    (ucData.benefitsFigures?.length || 0) +
    (ucData.limitationsFigures?.length || 0);
  console.log('Total Use Case images found:', totalImages);

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

  if (!bcm) {
    console.log('No businessContextMap found');
    return result;
  }

  // Get BPMN diagram path
  const diagram = bcm.querySelector('pm > diagram');
  if (!diagram) {
    // Try alternate path
    const altDiagram = bcm.querySelector('diagram');
    if (altDiagram) {
      result.bpmnFilePath = altDiagram.getAttribute('filePath');
    }
  } else {
    result.bpmnFilePath = diagram.getAttribute('filePath');
  }
  console.log('Diagram path:', result.bpmnFilePath);

  // Get data object to ER mappings
  const mappings = bcm.querySelectorAll('pm > dataObjectAndEr');
  if (mappings.length === 0) {
    // Try alternate path
    const altMappings = bcm.querySelectorAll('dataObjectAndEr');
    altMappings.forEach(mapping => {
      const dataObjectId = mapping.querySelector('associatedDataObject')?.textContent;
      const erGuid = mapping.querySelector('associatedEr')?.textContent;
      if (dataObjectId && erGuid) {
        result.dataObjectErMap[dataObjectId] = erGuid;
      }
    });
  } else {
    mappings.forEach(mapping => {
      const dataObjectId = mapping.querySelector('associatedDataObject')?.textContent;
      const erGuid = mapping.querySelector('associatedEr')?.textContent;
      if (dataObjectId && erGuid) {
        result.dataObjectErMap[dataObjectId] = erGuid;
      }
    });
  }

  console.log('Data object mappings:', Object.keys(result.dataObjectErMap).length);

  return result;
};

/**
 * Parse Exchange Requirements recursively
 */
const parseExchangeRequirements = (doc) => {
  const erRoot = doc.querySelector('idm > er');
  const erDataMap = {};
  const erLibrary = [];

  if (!erRoot) {
    console.log('No ER root found');
    return { erDataMap, erLibrary };
  }

  // Parse top-level ER and all nested ERs
  const parseErElement = (erElement, parentId = null) => {
    // Find specId - it might be a direct child
    const specId = erElement.querySelector(':scope > specId');
    if (!specId) {
      console.log('No specId in ER element');
      return null;
    }

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

    // Parse description - try multiple paths
    let description = erElement.querySelector(':scope > description > content');
    if (!description) {
      description = erElement.querySelector(':scope > description');
      if (description) {
        const content = description.querySelector('content');
        if (content) {
          erData.definition = content.textContent || '';
        } else {
          erData.definition = description.textContent || '';
        }
      }
    } else {
      erData.definition = description.textContent || '';
    }

    // Parse information units
    const infoUnits = erElement.querySelectorAll(':scope > informationUnit');
    erData.informationUnits = Array.from(infoUnits).map(iu => parseInformationUnit(iu));
    console.log(`ER "${erData.name}" has ${erData.informationUnits.length} information units`);

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

    // Parse nested ERs (sub-ERs) - store full sub-ER data, not just reference
    const nestedErs = erElement.querySelectorAll(':scope > er');
    nestedErs.forEach(nestedEr => {
      const subErData = parseErElement(nestedEr, guid);
      if (subErData) {
        // Store the complete sub-ER data including all information units and nested sub-ERs
        erData.subErs.push({
          id: subErData.id,
          name: subErData.name,
          shortTitle: subErData.shortTitle,
          definition: subErData.definition,
          informationUnits: subErData.informationUnits || [],
          subErs: subErData.subErs || [],
          constraints: subErData.constraints || [],
          correspondingMvd: subErData.correspondingMvd || null
        });
      }
    });

    erDataMap[guid] = erData;
    return erData;
  };

  // Start parsing from the root ER element
  const rootEr = parseErElement(erRoot);
  console.log('Root ER parsed:', rootEr?.name);

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
    exampleImages: [],
    correspondingExternalElements: [],
    subInformationUnits: []
  };

  // Parse description/examples - try multiple paths
  let descriptionContent = iuElement.querySelector(':scope > description > content');
  if (!descriptionContent) {
    descriptionContent = iuElement.querySelector(':scope > description');
  }
  if (descriptionContent) {
    const content = descriptionContent.querySelector('content');
    if (content) {
      iu.examples = content.textContent || '';
    } else {
      iu.examples = descriptionContent.textContent || '';
    }
  }

  // Parse corresponding external elements (IFC, bSDD, etc.) - skip empty mappings
  const externalElements = iuElement.querySelectorAll(':scope > correspondingExternalElement');
  externalElements.forEach(elem => {
    const name = elem.getAttribute('name') || '';
    // Only add mapping if it has a non-empty name
    if (name.trim()) {
      iu.correspondingExternalElements.push({
        id: generateUUID(),
        basis: elem.getAttribute('basis') || 'IFC',
        name: name
      });
    }
  });

  // Parse nested information units (sub information units)
  const nestedUnits = iuElement.querySelectorAll(':scope > subInformationUnit > informationUnit');
  if (nestedUnits.length === 0) {
    // Try direct informationUnit children (some formats)
    const directNestedUnits = iuElement.querySelectorAll(':scope > informationUnit');
    directNestedUnits.forEach(nested => {
      iu.subInformationUnits.push(parseInformationUnit(nested));
    });
  } else {
    nestedUnits.forEach(nested => {
      iu.subInformationUnits.push(parseInformationUnit(nested));
    });
  }

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

  console.log('Converted ER data map has', Object.keys(newErDataMap).length, 'entries');

  // Convert 'use' string to 'uses' array with verb/noun format
  let usesArray = [];
  if (headerData.use) {
    // Parse "Verb Noun" format or just use as noun with default verb
    const useStr = headerData.use;
    const words = useStr.split(' ');
    if (words.length >= 2) {
      usesArray.push({ verb: words[0], noun: words.slice(1).join(' ') });
    } else {
      usesArray.push({ verb: 'Perform', noun: useStr });
    }
  }

  // Convert 'region' object to 'regions' array
  let regionsArray = [];
  if (headerData.region) {
    if (typeof headerData.region === 'object' && headerData.region.value) {
      regionsArray.push(normalizeRegionCode(headerData.region.value.toLowerCase().replace(/\s+/g, '-')));
    } else if (typeof headerData.region === 'string') {
      regionsArray.push(normalizeRegionCode(headerData.region));
    }
  }
  if (regionsArray.length === 0) {
    regionsArray = ['international'];
  }

  // Extract project stages
  const projectStagesIso = headerData.targetPhases?.iso22263 || [];
  const projectStagesAia = headerData.targetPhases?.aiaB101 || [];
  const projectStagesRiba = headerData.targetPhases?.ribaPow || [];

  return {
    headerData: {
      ...headerData,
      // Map title field for ContentPane compatibility
      title: headerData.fullTitle || 'Imported xPPM Project',
      fullTitle: headerData.fullTitle || 'Imported xPPM Project',
      shortTitle: headerData.shortTitle || 'xPPM Import',
      status: headerData.status || 'NP',
      version: headerData.version || '0.1',
      // Use 'authors' for ContentPane AuthorsList component
      authors: headerData.authorsList || [],
      // Keep actorsList for actor roles section
      actorsList: headerData.actorsList || [],
      summary: headerData.summary || '',
      aimAndScope: headerData.aimAndScope || '',
      // Convert use string to uses array
      uses: usesArray,
      language: headerData.language || 'EN',
      // Flatten project stages for ContentPane
      projectStagesIso: projectStagesIso,
      projectStagesAia: projectStagesAia,
      projectStagesRiba: projectStagesRiba,
      // Convert region to regions array
      regions: regionsArray,
      // Preserve parsed figure arrays (images from xPPM)
      summaryFigures: headerData.summaryFigures || [],
      aimAndScopeFigures: headerData.aimAndScopeFigures || [],
      benefitsFigures: headerData.benefitsFigures || [],
      limitationsFigures: headerData.limitationsFigures || [],
      // Other optional fields
      benefits: headerData.benefits || '',
      limitations: headerData.limitations || '',
      keywords: [],
      references: '',
      additionalDescription: '',
      creationDate: headerData.creationDate || new Date().toISOString().split('T')[0],
      revisionHistory: headerData.modificationHistory || []
    },
    erDataMap: newErDataMap,
    erLibrary: erLibrary,
    bpmnXml: bpmnXml,
    originalErDataMap: erDataMap, // Keep original for reference
    dataObjectErMap: dataObjectErMap,
    bpmnFilePath: parsedData.bpmnFilePath
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
  console.log('Starting xPPM import...');
  const parsed = parseXppm(xppmContent, bpmnContent);
  console.log('xPPM parsed, converting to neo-Seoul format...');
  const converted = convertToNeoSeoul(parsed);
  console.log('Conversion complete');

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
 * Get the BPMN file path from xPPM data
 */
export const getBpmnFilePath = (xppmData) => {
  return xppmData.bpmnFilePath;
};

export default {
  parseXppm,
  convertToNeoSeoul,
  importXppm,
  isXppmFile,
  getBpmnFilePath
};
