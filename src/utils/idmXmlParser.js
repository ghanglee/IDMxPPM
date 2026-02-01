/**
 * idmXML Parser
 * Parses ISO 29481-3 (idmXML) files into the application's data format
 */

/**
 * Parse an idmXML document into application state
 * @param {string} xmlContent - The idmXML content as string
 * @returns {Object} Parsed project data with headerData, bpmnXml, erDataMap
 */
export const parseIdmXml = (xmlContent) => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Invalid XML: ' + parseError.textContent);
    }

    const result = {
      headerData: {},
      bpmnXml: null,
      erDataMap: {},
      erLibrary: []
    };

    // Get root element (should be <idm>)
    const idmRoot = xmlDoc.querySelector('idm');
    if (!idmRoot) {
      throw new Error('Not a valid idmXML file: missing <idm> root element');
    }

    // Parse specId (IDM metadata)
    const specId = idmRoot.querySelector(':scope > specId');
    if (specId) {
      result.headerData.title = specId.getAttribute('shortTitle') || specId.getAttribute('fullTitle') || '';
      result.headerData.version = specId.getAttribute('version') || '1.0';
      result.headerData.status = specId.getAttribute('documentStatus') || 'WD';
    }

    // Parse authoring
    const authoring = idmRoot.querySelector(':scope > authoring');
    if (authoring) {
      const authorStr = authoring.getAttribute('author') || '';
      // Split authors by comma if multiple
      result.headerData.authors = authorStr.split(',').map(a => a.trim()).filter(Boolean);
      result.headerData.creationDate = authoring.getAttribute('creationDate') || '';
    }

    // Parse revision history if present
    const revisionHistory = idmRoot.querySelectorAll('revisionHistory revision');
    if (revisionHistory.length > 0) {
      result.headerData.revisionHistory = [];
      revisionHistory.forEach(rev => {
        result.headerData.revisionHistory.push({
          date: rev.getAttribute('date') || '',
          description: rev.getAttribute('description') || ''
        });
      });
    }

    // Parse Use Case (uc)
    const uc = idmRoot.querySelector('uc');
    if (uc) {
      // Summary
      const summary = uc.querySelector('summary description');
      if (summary) {
        result.headerData.summary = summary.textContent || '';
      }

      // Aim and Scope (objectives)
      const aimAndScope = uc.querySelector('aimAndScope description');
      if (aimAndScope) {
        result.headerData.objectives = aimAndScope.textContent || '';
      }

      // Language
      const language = uc.querySelector('language');
      if (language) {
        result.headerData.language = language.textContent || 'EN';
      }

      // Benefits
      const benefits = uc.querySelector('benefits description');
      if (benefits) {
        result.headerData.benefits = benefits.textContent || '';
      }

      // Limitations
      const limitations = uc.querySelector('limitations description');
      if (limitations) {
        result.headerData.limitations = limitations.textContent || '';
      }

      // Actors
      const actors = uc.querySelector('actors description');
      if (actors) {
        result.headerData.actors = actors.textContent || '';
      }

      // Preconditions
      const preconditions = uc.querySelector('preconditions description');
      if (preconditions) {
        result.headerData.preconditions = preconditions.textContent || '';
      }

      // Postconditions
      const postconditions = uc.querySelector('postconditions description');
      if (postconditions) {
        result.headerData.postconditions = postconditions.textContent || '';
      }

      // Triggering Events
      const triggeringEvents = uc.querySelector('triggeringEvents description');
      if (triggeringEvents) {
        result.headerData.triggeringEvents = triggeringEvents.textContent || '';
      }

      // Required Capabilities
      const requiredCapabilities = uc.querySelector('requiredCapabilities description');
      if (requiredCapabilities) {
        result.headerData.requiredCapabilities = requiredCapabilities.textContent || '';
      }

      // Compliance Criteria
      const complianceCriteria = uc.querySelector('complianceCriteria description');
      if (complianceCriteria) {
        result.headerData.complianceCriteria = complianceCriteria.textContent || '';
      }

      // Region
      const region = uc.querySelector('region');
      if (region) {
        result.headerData.region = region.getAttribute('value') || 'international';
      }

      // Project Stages (can have multiple)
      const projectStages = uc.querySelectorAll('standardProjectStage name');
      if (projectStages.length > 0) {
        result.headerData.projectStages = [];
        projectStages.forEach(stage => {
          const stageValue = stage.textContent?.trim();
          if (stageValue) {
            result.headerData.projectStages.push(stageValue);
          }
        });
      }

      // Use Categories (can have multiple)
      const useElements = uc.querySelectorAll('use');
      if (useElements.length > 0) {
        result.headerData.useCategories = [];
        useElements.forEach(use => {
          const useName = use.getAttribute('name')?.trim();
          if (useName) {
            result.headerData.useCategories.push(useName);
          }
        });
      }
    }

    // Parse Business Context Map (bcm) -> Process Map (pm)
    const pm = idmRoot.querySelector('businessContextMap pm');
    if (pm) {
      const diagram = pm.querySelector('diagram');
      if (diagram) {
        const diagramFilePath = diagram.getAttribute('diagramFilePath');
        if (diagramFilePath) {
          result.bpmnFilePath = diagramFilePath;
        }

        // Extract embedded BPMN content from diagramContent element
        const diagramContent = diagram.querySelector('diagramContent');
        if (diagramContent) {
          // Get the text content which should contain the BPMN XML (from CDATA)
          const bpmnContent = diagramContent.textContent;
          if (bpmnContent && bpmnContent.trim()) {
            result.bpmnXml = bpmnContent.trim();
          }
        }
      }

      // Parse dataObjectAndEr links
      const doErLinks = pm.querySelectorAll('dataObjectAndEr');
      doErLinks.forEach(link => {
        const doId = link.querySelector('associatedDataObject')?.textContent;
        const erId = link.querySelector('associatedEr')?.textContent;
        if (doId && erId) {
          result.dataObjectErLinks = result.dataObjectErLinks || {};
          result.dataObjectErLinks[doId] = erId;
        }
      });
    }

    // Parse Exchange Requirements (er)
    // First, collect all ERs by their ID
    const ersById = {};
    const erElements = idmRoot.querySelectorAll(':scope > er');
    erElements.forEach((erElement) => {
      const er = parseErElement(erElement);
      ersById[er.id] = er;
    });

    // Now map ERs to data object IDs using the dataObjectErLinks
    // This ensures ERs are keyed by the correct data object ID from the BPMN
    if (result.dataObjectErLinks && Object.keys(result.dataObjectErLinks).length > 0) {
      // Use the links from the PM to map data objects to ERs
      Object.entries(result.dataObjectErLinks).forEach(([dataObjectId, erId]) => {
        if (ersById[erId]) {
          result.erDataMap[dataObjectId] = ersById[erId];
        }
      });
    } else {
      // Fallback: assign ERs to generated data object IDs
      erElements.forEach((erElement, index) => {
        const er = parseErElement(erElement);
        const dataObjectId = `DataObject_${index + 1}`;
        result.erDataMap[dataObjectId] = er;
      });
    }

    // Set default values for missing required fields
    result.headerData = {
      title: '',
      authors: [],
      organization: '',
      version: '1.0',
      creationDate: new Date().toISOString().split('T')[0],
      status: 'WD',
      language: 'EN',
      projectStages: [],
      useCategories: [],
      region: 'international',
      summary: '',
      revisionHistory: [],
      contributors: [],
      copyright: '',
      keywords: [],
      relatedStandards: [],
      externalReferences: [],
      objectives: '',
      benefits: '',
      limitations: '',
      actors: '',
      preconditions: '',
      postconditions: '',
      triggeringEvents: '',
      requiredCapabilities: '',
      complianceCriteria: '',
      ...result.headerData // Override with parsed values
    };

    return result;
  } catch (error) {
    console.error('Error parsing idmXML:', error);
    throw error;
  }
};

/**
 * Parse an ER element from XML
 */
const parseErElement = (erElement) => {
  const er = {
    id: '',
    name: '',
    description: '',
    informationUnits: [],
    subERs: []
  };

  // Parse specId
  const specId = erElement.querySelector('specId');
  if (specId) {
    // The idmCode contains the original ER id (used in dataObjectAndEr links)
    // Format is "ER-{originalId}" so we extract just the id part
    const idmCode = specId.getAttribute('idmCode') || '';
    const idFromCode = idmCode.startsWith('ER-') ? idmCode.substring(3) : idmCode;
    er.id = idFromCode || specId.getAttribute('guid') || `ER-${Date.now()}`;
    er.name = specId.getAttribute('shortTitle') || specId.getAttribute('fullTitle') || '';
  }

  // Parse description
  const description = erElement.querySelector('description');
  if (description) {
    er.description = description.textContent || '';
  }

  // Parse information units
  const infoUnits = erElement.querySelectorAll(':scope > informationUnit');
  infoUnits.forEach(iu => {
    er.informationUnits.push(parseInformationUnit(iu));
  });

  return er;
};

/**
 * Parse an Information Unit element from XML
 */
const parseInformationUnit = (iuElement) => {
  const unit = {
    id: iuElement.getAttribute('id') || `IU-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: iuElement.getAttribute('name') || '',
    dataType: iuElement.getAttribute('dataType') || 'String',
    isMandatory: iuElement.getAttribute('isMandatory') === 'true',
    definition: iuElement.getAttribute('definition') || '',
    examples: '',
    exampleImages: [],
    correspondingExternalElements: [],
    subInformationUnits: []
  };

  // Parse examples
  const examples = iuElement.querySelector('examples description');
  if (examples) {
    unit.examples = examples.textContent || '';
  }

  // Parse corresponding external elements
  const mappings = iuElement.querySelectorAll('correspondingExternalElement');
  mappings.forEach(m => {
    unit.correspondingExternalElements.push({
      id: `CEE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      basis: m.getAttribute('basis') || 'IFC',
      name: m.getAttribute('name') || ''
    });
  });

  // Parse sub information units (recursive)
  const subUnits = iuElement.querySelectorAll(':scope > subInformationUnit > informationUnit');
  subUnits.forEach(su => {
    unit.subInformationUnits.push(parseInformationUnit(su));
  });

  return unit;
};

/**
 * Check if content is likely an idmXML file
 */
export const isIdmXml = (content) => {
  if (!content || typeof content !== 'string') return false;

  // Check for idmXML indicators
  const hasIdmNamespace = content.includes('idmXML') || content.includes('standards.buildingsmart.org/IDM');
  const hasIdmRoot = content.includes('<idm') || content.includes('<IDM');
  const hasUseCase = content.includes('<uc>') || content.includes('<uc ');
  const hasEr = content.includes('<er>') || content.includes('<er ');

  return hasIdmNamespace || hasIdmRoot || (hasUseCase && hasEr);
};

export default {
  parseIdmXml,
  isIdmXml
};
