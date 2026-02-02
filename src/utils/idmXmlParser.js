/**
 * idmXML Parser
 * Parses ISO 29481-3 (idmXML) files into the application's data format
 */

/**
 * Parse figures from a section element
 * @param {Element} sectionElement - The parent section element (e.g., summary, aimAndScope)
 * @returns {Array} Array of figure objects
 */
const parseFigures = (sectionElement) => {
  const figures = [];
  if (!sectionElement) return figures;

  const figureElements = sectionElement.querySelectorAll(':scope > figure');
  figureElements.forEach((fig, index) => {
    const caption = fig.getAttribute('caption') || `Figure ${index + 1}`;
    const mimeType = fig.getAttribute('mimeType') || 'image/png';
    const encoding = fig.getAttribute('encoding');
    const filePath = fig.getAttribute('filePath');

    if (encoding === 'base64') {
      const base64Data = fig.textContent?.trim() || '';
      if (base64Data) {
        figures.push({
          id: `fig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: caption,
          caption: caption,
          type: mimeType,
          data: `data:${mimeType};base64,${base64Data}`
        });
      }
    } else if (filePath) {
      figures.push({
        id: `fig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: filePath,
        caption: caption,
        type: mimeType,
        filePath: filePath
      });
    }
  });

  return figures;
};

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

    // Parse specId (IDM metadata) - including GUIDs for persistence
    const specId = idmRoot.querySelector(':scope > specId');
    if (specId) {
      result.headerData.idmGuid = specId.getAttribute('guid') || '';
      result.headerData.shortTitle = specId.getAttribute('shortTitle') || '';
      result.headerData.title = specId.getAttribute('fullTitle') || specId.getAttribute('shortTitle') || '';
      result.headerData.idmCode = specId.getAttribute('idmCode') || '';
      result.headerData.version = specId.getAttribute('version') || '1.0';
      result.headerData.status = specId.getAttribute('documentStatus') || 'WD';
    }

    // Parse authoring
    const authoring = idmRoot.querySelector(':scope > authoring');
    if (authoring) {
      result.headerData.creationDate = authoring.getAttribute('creationDate') || '';

      // Parse structured author information (person, organization)
      const personElements = authoring.querySelectorAll('person');
      const orgElements = authoring.querySelectorAll('organization');

      if (personElements.length > 0 || orgElements.length > 0) {
        result.headerData.authors = [];

        personElements.forEach(person => {
          result.headerData.authors.push({
            type: 'person',
            givenName: person.getAttribute('givenName') || '',
            familyName: person.getAttribute('familyName') || '',
            uri: person.getAttribute('uri') || '',
            affiliation: person.querySelector('affiliation')?.textContent || ''
          });
        });

        orgElements.forEach(org => {
          result.headerData.authors.push({
            type: 'organization',
            name: org.getAttribute('name') || '',
            uri: org.getAttribute('uri') || ''
          });
        });
      } else {
        // Fallback to legacy author string
        const authorStr = authoring.getAttribute('author') || '';
        // Split authors by comma if multiple
        result.headerData.authors = authorStr.split(',').map(a => a.trim()).filter(Boolean);
      }
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
      // Parse UC specId for GUID
      const ucSpecId = uc.querySelector('specId');
      if (ucSpecId) {
        result.headerData.ucGuid = ucSpecId.getAttribute('guid') || '';
      }

      // Summary - with optional figures
      const summarySection = uc.querySelector('summary');
      if (summarySection) {
        const summaryDesc = summarySection.querySelector('description');
        result.headerData.summary = summaryDesc?.textContent || '';
        const summaryFigs = parseFigures(summarySection);
        if (summaryFigs.length > 0) {
          result.headerData.summaryFigures = summaryFigs;
        }
      }

      // Aim and Scope - with optional figures
      const aimAndScopeSection = uc.querySelector('aimAndScope');
      if (aimAndScopeSection) {
        const aimAndScopeDesc = aimAndScopeSection.querySelector('description');
        const aimAndScopeContent = aimAndScopeDesc?.textContent || '';
        result.headerData.aimAndScope = aimAndScopeContent;
        result.headerData.objectives = aimAndScopeContent; // Legacy field
        const aimAndScopeFigs = parseFigures(aimAndScopeSection);
        if (aimAndScopeFigs.length > 0) {
          result.headerData.aimAndScopeFigures = aimAndScopeFigs;
        }
      }

      // Language
      const language = uc.querySelector('language');
      if (language) {
        result.headerData.language = language.textContent || 'EN';
      }

      // Benefits - with optional figures
      const benefitsSection = uc.querySelector('benefits');
      if (benefitsSection) {
        const benefitsDesc = benefitsSection.querySelector('description');
        result.headerData.benefits = benefitsDesc?.textContent || '';
        const benefitsFigs = parseFigures(benefitsSection);
        if (benefitsFigs.length > 0) {
          result.headerData.benefitsFigures = benefitsFigs;
        }
      }

      // Limitations - with optional figures
      const limitationsSection = uc.querySelector('limitations');
      if (limitationsSection) {
        const limitationsDesc = limitationsSection.querySelector('description');
        result.headerData.limitations = limitationsDesc?.textContent || '';
        const limitationsFigs = parseFigures(limitationsSection);
        if (limitationsFigs.length > 0) {
          result.headerData.limitationsFigures = limitationsFigs;
        }
      }

      // Actors - support both structured (ISO 29481-3) and legacy text format
      const actorElements = uc.querySelectorAll('actor');
      if (actorElements.length > 0) {
        result.headerData.actorsList = [];
        actorElements.forEach(actor => {
          const actorId = actor.getAttribute('id') || `actor-${Date.now()}`;
          const actorName = actor.getAttribute('name') || '';
          const classification = actor.querySelector('classification');
          const role = classification ? classification.getAttribute('name') : '';
          result.headerData.actorsList.push({ id: actorId, name: actorName, role });
        });
      }

      // Also check for legacy text-based actors description
      const actorsDesc = uc.querySelector('actors description');
      if (actorsDesc) {
        result.headerData.actors = actorsDesc.textContent || '';
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

      // Regions (can have multiple per idmXSD)
      const regionElements = uc.querySelectorAll('region');
      if (regionElements.length > 0) {
        result.headerData.regions = [];
        regionElements.forEach(region => {
          const value = region.getAttribute('value');
          if (value) {
            result.headerData.regions.push(value);
          }
        });
        // Keep single region for backward compat
        result.headerData.region = result.headerData.regions[0] || 'international';
      } else {
        result.headerData.region = 'international';
        result.headerData.regions = ['international'];
      }

      // Project Stages (can have multiple) - store in both projectStagesIso and legacy projectStages
      const projectStages = uc.querySelectorAll('standardProjectStage name');
      if (projectStages.length > 0) {
        result.headerData.projectStagesIso = [];
        result.headerData.projectStages = []; // Legacy
        projectStages.forEach(stage => {
          const stageValue = stage.textContent?.trim();
          if (stageValue) {
            result.headerData.projectStagesIso.push(stageValue);
            result.headerData.projectStages.push(stageValue);
          }
        });
      }

      // User-defined Project Stages (AIA B101, RIBA Plan of Work, etc.)
      const userDefinedStages = uc.querySelectorAll('userDefinedProjectStage');
      if (userDefinedStages.length > 0) {
        result.headerData.projectStagesAia = [];
        result.headerData.projectStagesRiba = [];

        userDefinedStages.forEach(stage => {
          const stageName = stage.querySelector('name')?.textContent?.trim();
          const classification = stage.querySelector('classification');
          const system = classification?.getAttribute('system') || '';

          if (stageName) {
            if (system.includes('AIA')) {
              result.headerData.projectStagesAia.push(stageName);
            } else if (system.includes('RIBA')) {
              result.headerData.projectStagesRiba.push(stageName);
            }
          }
        });
      }

      // Use elements (can have multiple) - parse as structured objects and legacy array
      const useElements = uc.querySelectorAll('use');
      if (useElements.length > 0) {
        result.headerData.uses = [];
        result.headerData.useCategories = []; // Legacy
        useElements.forEach(use => {
          const useName = use.getAttribute('name')?.trim();
          if (useName) {
            // Try to parse "Verb Noun" format into structured object
            const parts = useName.split(' ');
            if (parts.length >= 2) {
              result.headerData.uses.push({
                verb: parts[0],
                noun: parts.slice(1).join(' ')
              });
            } else {
              result.headerData.uses.push({ verb: useName, noun: '' });
            }
            result.headerData.useCategories.push(useName);
          }
        });
      }
    }

    // Parse Business Context Map (bcm) -> Process Map (pm)
    const bcm = idmRoot.querySelector('businessContextMap');
    if (bcm) {
      // Parse BCM specId for GUID
      const bcmSpecId = bcm.querySelector(':scope > specId');
      if (bcmSpecId) {
        result.headerData.bcmGuid = bcmSpecId.getAttribute('guid') || '';
      }
    }

    const pm = idmRoot.querySelector('businessContextMap pm');
    if (pm) {
      const diagram = pm.querySelector('diagram');
      if (diagram) {
        result.headerData.pmId = diagram.getAttribute('id') || '';
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
      shortTitle: '',
      authors: [],
      organization: '',
      version: '1.0',
      creationDate: new Date().toISOString().split('T')[0],
      status: 'WD',
      language: 'EN',
      projectStages: [],
      projectStagesIso: [],
      projectStagesAia: [],      // AIA B101 stages (US)
      projectStagesRiba: [],     // RIBA Plan of Work stages (UK)
      useCategories: [],
      uses: [],
      region: 'international',
      regions: [],
      summary: '',
      revisionHistory: [],
      contributors: [],
      copyright: '',
      keywords: [],
      relatedStandards: [],
      externalReferences: [],
      objectives: '',
      aimAndScope: '',
      benefits: '',
      limitations: '',
      actors: '',
      // Figure arrays for section images
      summaryFigures: [],
      aimAndScopeFigures: [],
      benefitsFigures: [],
      limitationsFigures: [],
      actorsList: [],
      preconditions: '',
      postconditions: '',
      triggeringEvents: '',
      requiredCapabilities: '',
      complianceCriteria: '',
      // Persistent GUIDs for idmXSD compliance
      idmGuid: '',
      ucGuid: '',
      bcmGuid: '',
      pmId: '',
      idmCode: '',
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

  // Parse sub-ERs (recursive per ISO 29481-3)
  const subErElements = erElement.querySelectorAll(':scope > subEr');
  subErElements.forEach(subErElement => {
    const subEr = {
      id: '',
      name: '',
      description: '',
      informationUnits: []
    };

    // Parse sub-ER specId
    const subSpecId = subErElement.querySelector('specId');
    if (subSpecId) {
      const idmCode = subSpecId.getAttribute('idmCode') || '';
      const idFromCode = idmCode.startsWith('ER-') ? idmCode.substring(3) : idmCode;
      subEr.id = idFromCode || subSpecId.getAttribute('guid') || `SubER-${Date.now()}`;
      subEr.name = subSpecId.getAttribute('shortTitle') || subSpecId.getAttribute('fullTitle') || '';
    }

    // Parse sub-ER description
    const subDesc = subErElement.querySelector('description');
    if (subDesc) {
      subEr.description = subDesc.textContent || '';
    }

    // Parse sub-ER information units
    const subInfoUnits = subErElement.querySelectorAll(':scope > informationUnit');
    subInfoUnits.forEach(iu => {
      subEr.informationUnits.push(parseInformationUnit(iu));
    });

    er.subERs.push(subEr);
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

  // Parse example images (both embedded base64 and file references)
  const images = iuElement.querySelectorAll('examples image');
  images.forEach((img, index) => {
    const caption = img.getAttribute('caption') || `Image ${index + 1}`;
    const mimeType = img.getAttribute('mimeType') || 'image/png';
    const encoding = img.getAttribute('encoding');
    const filePath = img.getAttribute('filePath');

    if (encoding === 'base64') {
      // Embedded base64 image - extract from CDATA or text content
      const base64Data = img.textContent?.trim() || '';
      if (base64Data) {
        unit.exampleImages.push({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: caption,
          caption: caption,
          type: mimeType,
          data: `data:${mimeType};base64,${base64Data}`
        });
      }
    } else if (filePath) {
      // File reference - store path for potential loading
      unit.exampleImages.push({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: filePath,
        caption: caption,
        type: mimeType,
        filePath: filePath
      });
    }
  });

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
