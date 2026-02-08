/**
 * idmXML Parser
 * Parses ISO 29481-3 (idmXML) files into the application's data format
 */

/**
 * ISO 3166-1 alpha-3 to alpha-2 mapping for region code normalization.
 * When idmXML files store regions as 3-letter codes (e.g., "CHE"),
 * this converts them to the 2-letter codes used internally (e.g., "CH").
 */
const ALPHA3_TO_ALPHA2 = {
  AFG: 'AF', ALB: 'AL', DZA: 'DZ', ARG: 'AR', AUS: 'AU', AUT: 'AT',
  BEL: 'BE', BRA: 'BR', BGR: 'BG', CAN: 'CA', CHL: 'CL', CHN: 'CN',
  COL: 'CO', HRV: 'HR', CZE: 'CZ', DNK: 'DK', EGY: 'EG', EST: 'EE',
  FIN: 'FI', FRA: 'FR', DEU: 'DE', GRC: 'GR', HKG: 'HK', HUN: 'HU',
  ISL: 'IS', IND: 'IN', IDN: 'ID', IRL: 'IE', ISR: 'IL', ITA: 'IT',
  JPN: 'JP', KAZ: 'KZ', KOR: 'KR', KWT: 'KW', LVA: 'LV', LTU: 'LT',
  LUX: 'LU', MYS: 'MY', MEX: 'MX', NLD: 'NL', NZL: 'NZ', NOR: 'NO',
  PAK: 'PK', PER: 'PE', PHL: 'PH', POL: 'PL', PRT: 'PT', QAT: 'QA',
  ROU: 'RO', RUS: 'RU', SAU: 'SA', SRB: 'RS', SGP: 'SG', SVK: 'SK',
  SVN: 'SI', ZAF: 'ZA', ESP: 'ES', SWE: 'SE', CHE: 'CH', TWN: 'TW',
  THA: 'TH', TUR: 'TR', UKR: 'UA', ARE: 'AE', GBR: 'GB', USA: 'US',
  VNM: 'VN'
};

/**
 * Normalize a region code: convert ISO 3166-1 alpha-3 to alpha-2 if applicable.
 * Returns the code as-is if it's already alpha-2 or not recognized.
 */
export const normalizeRegionCode = (code) => {
  if (!code || typeof code !== 'string') return code;
  const upper = code.toUpperCase();
  return ALPHA3_TO_ALPHA2[upper] || code;
};

/** ISO 3166-1 alpha-2 code to full country name */
const ALPHA2_TO_NAME = {
  AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AR: 'Argentina',
  AU: 'Australia', AT: 'Austria', BE: 'Belgium', BR: 'Brazil',
  BG: 'Bulgaria', CA: 'Canada', CL: 'Chile', CN: 'China',
  CO: 'Colombia', HR: 'Croatia', CZ: 'Czech Republic', DK: 'Denmark',
  EG: 'Egypt', EE: 'Estonia', FI: 'Finland', FR: 'France',
  DE: 'Germany', GR: 'Greece', HK: 'Hong Kong', HU: 'Hungary',
  IS: 'Iceland', IN: 'India', ID: 'Indonesia', IE: 'Ireland',
  IL: 'Israel', IT: 'Italy', JP: 'Japan', KZ: 'Kazakhstan',
  KR: 'Korea, Republic of', KW: 'Kuwait', LV: 'Latvia', LT: 'Lithuania',
  LU: 'Luxembourg', MY: 'Malaysia', MX: 'Mexico', NL: 'Netherlands',
  NZ: 'New Zealand', NO: 'Norway', PK: 'Pakistan', PE: 'Peru',
  PH: 'Philippines', PL: 'Poland', PT: 'Portugal', QA: 'Qatar',
  RO: 'Romania', RU: 'Russian Federation', SA: 'Saudi Arabia', RS: 'Serbia',
  SG: 'Singapore', SK: 'Slovakia', SI: 'Slovenia', ZA: 'South Africa',
  ES: 'Spain', SE: 'Sweden', CH: 'Switzerland', TW: 'Taiwan',
  TH: 'Thailand', TR: 'Turkey', UA: 'Ukraine', AE: 'United Arab Emirates',
  GB: 'United Kingdom', US: 'United States', VN: 'Vietnam'
};

/**
 * Get full region name from any region code (alpha-2, alpha-3, or custom).
 * Returns the full name if found, otherwise the original code.
 */
export const getRegionName = (code) => {
  if (!code || typeof code !== 'string') return code;
  if (code === 'international') return 'International (All regions)';
  if (code === 'EU') return 'European Union';
  if (code === 'NA') return 'North America';
  if (code === 'APAC') return 'Asia-Pacific';
  const normalized = normalizeRegionCode(code);
  return ALPHA2_TO_NAME[normalized.toUpperCase()] || code;
};

/**
 * Parse figures from a section element
 * @param {Element} sectionElement - The parent section element (e.g., summary, aimAndScope)
 * @returns {Array} Array of figure objects
 */
const parseFigures = (sectionElement) => {
  const figures = [];
  if (!sectionElement) return figures;

  const figureElements = getDirectChildren(sectionElement, 'figure');
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
 * Helper: get direct child elements by tag name (namespace-safe).
 * querySelectorAll can be unreliable in namespaced XML documents,
 * so we manually filter childNodes by localName.
 */
const getDirectChildren = (parent, tagName) => {
  const results = [];
  if (!parent) return results;
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i];
    if (child.nodeType === 1 && child.localName === tagName) {
      results.push(child);
    }
  }
  return results;
};

/**
 * Helper: get first direct child element by tag name (namespace-safe).
 */
const getFirstChild = (parent, tagName) => {
  if (!parent) return null;
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i];
    if (child.nodeType === 1 && child.localName === tagName) {
      return child;
    }
  }
  return null;
};

/**
 * Helper: find first descendant element by tag name (namespace-safe).
 * Searches all levels, not just direct children.
 */
const findDescendant = (parent, tagName) => {
  if (!parent) return null;
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i];
    if (child.nodeType === 1) {
      if (child.localName === tagName) return child;
      const found = findDescendant(child, tagName);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Helper: find all descendant elements by tag name (namespace-safe).
 */
const findAllDescendants = (parent, tagName) => {
  const results = [];
  if (!parent) return results;
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i];
    if (child.nodeType === 1) {
      if (child.localName === tagName) results.push(child);
      results.push(...findAllDescendants(child, tagName));
    }
  }
  return results;
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

    // Get root element (should be <idm>) - use documentElement for namespace safety
    const idmRoot = xmlDoc.documentElement;
    if (!idmRoot || (idmRoot.localName !== 'idm' && idmRoot.tagName !== 'idm')) {
      throw new Error('Not a valid idmXML file: missing <idm> root element');
    }

    // Parse specId (IDM metadata) - including GUIDs for persistence
    const specId = getFirstChild(idmRoot, 'specId');
    if (specId) {
      result.headerData.idmGuid = specId.getAttribute('guid') || '';
      result.headerData.shortTitle = specId.getAttribute('shortTitle') || '';
      result.headerData.title = specId.getAttribute('fullTitle') || specId.getAttribute('shortTitle') || '';
      result.headerData.subTitle = specId.getAttribute('subTitle') || '';
      result.headerData.idmCode = specId.getAttribute('idmCode') || '';
      result.headerData.localCode = specId.getAttribute('localCode') || '';
      result.headerData.version = specId.getAttribute('version') || '1.0';
      result.headerData.status = specId.getAttribute('documentStatus') || 'WD';
      result.headerData.localDocumentStatus = specId.getAttribute('localDocumentStatus') || '';
    }

    // Parse authoring section (use getFirstChild for namespace safety)
    const authoring = getFirstChild(idmRoot, 'authoring');
    if (authoring) {
      result.headerData.creationDate = authoring.getAttribute('creationDate') || '';
      result.headerData.copyright = authoring.getAttribute('copyright') || '';

      // Parse change logs using namespace-safe child traversal
      const changeLogs = getDirectChildren(authoring, 'changeLog');
      if (changeLogs.length > 0) {
        result.headerData.changeLogs = [];
        result.headerData.revisionHistory = [];
        changeLogs.forEach(log => {
          const changeEntries = [];
          getDirectChildren(log, 'change').forEach(ch => {
            changeEntries.push({
              changedElement: ch.getAttribute('changedElement') || '',
              changedFrom: ch.getAttribute('changedFrom') || ''
            });
          });
          const changeLogEntry = {
            id: log.getAttribute('id') || '',
            changeDateTime: log.getAttribute('changeDateTime') || '',
            changeSummary: log.getAttribute('changeSummary') || '',
            changedBy: log.getAttribute('changedBy') || '',
            changes: changeEntries
          };
          result.headerData.changeLogs.push(changeLogEntry);

          // Also add to revisionHistory for ContentPane compatibility
          const dateTime = log.getAttribute('changeDateTime') || '';
          const date = dateTime.split('T')[0] || dateTime.split(' ')[0] || dateTime;
          const changedElements = changeEntries.map(c => c.changedElement).filter(Boolean);
          const summary = log.getAttribute('changeSummary')?.trim() ||
            (changedElements.length > 0 ? `Modified: ${changedElements.join(', ')}` : 'Modified');

          result.headerData.revisionHistory.push({
            date: date,
            description: summary
          });
        });
      }

      // Parse authors using namespace-safe child traversal
      const authorElements = getDirectChildren(authoring, 'author');

      result.headerData.authors = [];

      if (authorElements.length > 0) {
        authorElements.forEach(author => {
          const authorId = author.getAttribute('id') || '';

          // v2.0 format: <author id="..."><person .../></author> or <author id="..."><organization .../></author>
          const personChild = getFirstChild(author, 'person');
          const orgChild = getFirstChild(author, 'organization');

          if (personChild) {
            const firstName = personChild.getAttribute('firstName') || personChild.getAttribute('givenName') || '';
            const lastName = personChild.getAttribute('lastName') || personChild.getAttribute('familyName') || '';
            const middleName = personChild.getAttribute('middleName') || personChild.getAttribute('middleInitial') || '';
            const affiliation = personChild.getAttribute('affiliation') || '';
            const email = personChild.getAttribute('emailAddress') || personChild.getAttribute('uri') || '';
            const prefix = personChild.getAttribute('prefix') || '';
            const suffix = personChild.getAttribute('suffix') || '';
            const postnominal = personChild.getAttribute('postnominalDesignation') || '';

            result.headerData.authors.push({
              type: 'person',
              id: authorId,
              givenName: firstName,
              familyName: lastName,
              middleInitial: middleName,
              affiliation: affiliation,
              uri: email,
              prefix,
              suffix,
              postnominalDesignation: postnominal
            });
          } else if (orgChild) {
            result.headerData.authors.push({
              type: 'organization',
              id: authorId,
              name: orgChild.getAttribute('name') || '',
              uri: orgChild.getAttribute('uri') || ''
            });
          } else {
            // Legacy format: attributes directly on <author> element
            const firstName = author.getAttribute('firstName') || author.getAttribute('givenName') || '';
            const lastName = author.getAttribute('lastName') || author.getAttribute('familyName') || '';
            const middleName = author.getAttribute('middleName') || author.getAttribute('middleInitial') || '';
            const affiliation = author.getAttribute('affiliation') || '';
            const digitalSignature = author.getAttribute('digitalSignature') || '';

            if (firstName || lastName) {
              result.headerData.authors.push({
                type: 'person',
                id: authorId,
                givenName: firstName,
                familyName: lastName,
                middleInitial: middleName,
                affiliation: affiliation,
                uri: digitalSignature
              });
            }
          }
        });
      }

      // Fallback: standalone <person>/<organization> elements not inside <author> (rare)
      if (result.headerData.authors.length === 0) {
        getDirectChildren(authoring, 'person').forEach(person => {
          const firstName = person.getAttribute('firstName') || person.getAttribute('givenName') || '';
          const lastName = person.getAttribute('lastName') || person.getAttribute('familyName') || '';
          result.headerData.authors.push({
            type: 'person',
            givenName: firstName,
            familyName: lastName,
            uri: person.getAttribute('uri') || person.getAttribute('emailAddress') || '',
            affiliation: person.getAttribute('affiliation') || ''
          });
        });

        getDirectChildren(authoring, 'organization').forEach(org => {
          result.headerData.authors.push({
            type: 'organization',
            name: org.getAttribute('name') || '',
            uri: org.getAttribute('uri') || ''
          });
        });
      }

      // Fallback to legacy author string attribute
      if (result.headerData.authors.length === 0) {
        const authorStr = authoring.getAttribute('author') || '';
        if (authorStr) {
          authorStr.split(',').map(a => a.trim()).filter(Boolean).forEach(name => {
            result.headerData.authors.push({
              type: 'person',
              givenName: name,
              familyName: ''
            });
          });
        }
      }

      // Parse committee (legacy format)
      const committee = getFirstChild(authoring, 'committee');
      if (committee) {
        const members = [];
        getDirectChildren(committee, 'member').forEach(m => members.push(m.textContent));
        const leader = getFirstChild(committee, 'leader');
        result.headerData.committee = {
          name: committee.getAttribute('name') || '',
          members,
          leader: leader?.textContent || ''
        };
      }

      // Parse publisher (legacy format)
      const publisher = getFirstChild(authoring, 'publisher');
      if (publisher) {
        result.headerData.publisher = {
          name: publisher.getAttribute('name') || '',
          location: publisher.getAttribute('location') || ''
        };
      }
    }

    // Parse revision history if present
    const revHistoryEl = getFirstChild(idmRoot, 'revisionHistory');
    const revisionHistory = revHistoryEl ? getDirectChildren(revHistoryEl, 'revision') : [];
    if (revisionHistory.length > 0) {
      result.headerData.revisionHistory = [];
      revisionHistory.forEach(rev => {
        result.headerData.revisionHistory.push({
          date: rev.getAttribute('date') || '',
          description: rev.getAttribute('description') || ''
        });
      });
    }

    // Parse Use Case (uc) - all namespace-safe
    const uc = getFirstChild(idmRoot, 'uc');
    if (uc) {
      // Parse UC specId for GUID
      const ucSpecId = getFirstChild(uc, 'specId');
      if (ucSpecId) {
        result.headerData.ucGuid = ucSpecId.getAttribute('guid') || '';
      }

      // Summary - with optional figures
      const summarySection = getFirstChild(uc, 'summary');
      if (summarySection) {
        const summaryDesc = getFirstChild(summarySection, 'description');
        result.headerData.summary = summaryDesc?.getAttribute('title') || summaryDesc?.textContent || '';
        const summaryFigs = parseFigures(summarySection);
        if (summaryFigs.length > 0) {
          result.headerData.summaryFigures = summaryFigs;
        }
      }

      // Aim and Scope - with optional figures
      const aimAndScopeSection = getFirstChild(uc, 'aimAndScope');
      if (aimAndScopeSection) {
        const aimAndScopeDesc = getFirstChild(aimAndScopeSection, 'description');
        const aimAndScopeContent = aimAndScopeDesc?.getAttribute('title') || aimAndScopeDesc?.textContent || '';
        result.headerData.aimAndScope = aimAndScopeContent;
        result.headerData.objectives = aimAndScopeContent;
        const aimAndScopeFigs = parseFigures(aimAndScopeSection);
        if (aimAndScopeFigs.length > 0) {
          result.headerData.aimAndScopeFigures = aimAndScopeFigs;
        }
      }

      // Language
      const language = getFirstChild(uc, 'language');
      if (language) {
        result.headerData.language = language.textContent || 'EN';
      }

      // Benefits - with optional figures
      const benefitsSection = getFirstChild(uc, 'benefits');
      if (benefitsSection) {
        const benefitsDesc = getFirstChild(benefitsSection, 'description');
        result.headerData.benefits = benefitsDesc?.getAttribute('title') || benefitsDesc?.textContent || '';
        const benefitsFigs = parseFigures(benefitsSection);
        if (benefitsFigs.length > 0) {
          result.headerData.benefitsFigures = benefitsFigs;
        }
      }

      // Limitations - with optional figures
      const limitationsSection = getFirstChild(uc, 'limitations');
      if (limitationsSection) {
        const limitationsDesc = getFirstChild(limitationsSection, 'description');
        result.headerData.limitations = limitationsDesc?.getAttribute('title') || limitationsDesc?.textContent || '';
        const limitationsFigs = parseFigures(limitationsSection);
        if (limitationsFigs.length > 0) {
          result.headerData.limitationsFigures = limitationsFigs;
        }
      }

      // Actors - support IDM 2.0 structure with actorType, bpmnShapeName, and subActors
      const actorElements = getDirectChildren(uc, 'actor');
      if (actorElements.length > 0) {
        result.headerData.actorsList = [];

        const parseActor = (actorEl) => {
          const actorId = actorEl.getAttribute('id') || `actor-${Date.now()}`;
          const actorName = actorEl.getAttribute('name') || '';
          const actorType = actorEl.getAttribute('actorType') || 'group';

          const bpmnShapeEl = getFirstChild(actorEl, 'bpmnShapeName');
          const bpmnShapeName = bpmnShapeEl ? bpmnShapeEl.textContent.trim() : '';

          const classification = getFirstChild(actorEl, 'classification');
          const role = classification ? classification.getAttribute('name') : '';

          // Get subActor elements (per IDM 2.0)
          const subActorContainers = getDirectChildren(actorEl, 'subActor');
          const subActors = [];
          subActorContainers.forEach(container => {
            const subActorEl = getFirstChild(container, 'actor');
            if (subActorEl) {
              const subActorId = subActorEl.getAttribute('id') || `subactor-${Date.now()}`;
              const subActorName = subActorEl.getAttribute('name') || '';
              const subBpmnShapeEl = getFirstChild(subActorEl, 'bpmnShapeName');
              const subBpmnShapeName = subBpmnShapeEl ? subBpmnShapeEl.textContent.trim() : '';
              subActors.push({
                id: subActorId,
                name: subActorName,
                bpmnShapeName: subBpmnShapeName
              });
            }
          });

          return {
            id: actorId,
            name: actorName,
            actorType,
            bpmnShapeName,
            role,
            subActors
          };
        };

        actorElements.forEach(actorEl => {
          result.headerData.actorsList.push(parseActor(actorEl));
        });
      }

      // Legacy text-based actors description
      const actorsEl = getFirstChild(uc, 'actors');
      const actorsDesc = actorsEl ? getFirstChild(actorsEl, 'description') : null;
      if (actorsDesc) {
        result.headerData.actors = actorsDesc.getAttribute('title') || actorsDesc.textContent || '';
      }

      // Preconditions
      const preconditionsEl = getFirstChild(uc, 'preconditions');
      const preconditions = preconditionsEl ? getFirstChild(preconditionsEl, 'description') : null;
      if (preconditions) {
        result.headerData.preconditions = preconditions.getAttribute('title') || preconditions.textContent || '';
      }

      // Postconditions
      const postconditionsEl = getFirstChild(uc, 'postconditions');
      const postconditions = postconditionsEl ? getFirstChild(postconditionsEl, 'description') : null;
      if (postconditions) {
        result.headerData.postconditions = postconditions.getAttribute('title') || postconditions.textContent || '';
      }

      // Triggering Events
      const triggeringEventsEl = getFirstChild(uc, 'triggeringEvents');
      const triggeringEvents = triggeringEventsEl ? getFirstChild(triggeringEventsEl, 'description') : null;
      if (triggeringEvents) {
        result.headerData.triggeringEvents = triggeringEvents.getAttribute('title') || triggeringEvents.textContent || '';
      }

      // Required Capabilities
      const requiredCapabilitiesEl = getFirstChild(uc, 'requiredCapabilities');
      const requiredCapabilities = requiredCapabilitiesEl ? getFirstChild(requiredCapabilitiesEl, 'description') : null;
      if (requiredCapabilities) {
        result.headerData.requiredCapabilities = requiredCapabilities.getAttribute('title') || requiredCapabilities.textContent || '';
      }

      // Compliance Criteria
      const complianceCriteriaEl = getFirstChild(uc, 'complianceCriteria');
      const complianceCriteria = complianceCriteriaEl ? getFirstChild(complianceCriteriaEl, 'description') : null;
      if (complianceCriteria) {
        result.headerData.complianceCriteria = complianceCriteria.getAttribute('title') || complianceCriteria.textContent || '';
      }

      // Regions (can have multiple per idmXSD)
      const regionElements = getDirectChildren(uc, 'region');
      if (regionElements.length > 0) {
        result.headerData.regions = [];
        regionElements.forEach(region => {
          const value = region.getAttribute('value');
          if (value) {
            result.headerData.regions.push(normalizeRegionCode(value));
          }
        });
        result.headerData.region = result.headerData.regions[0] || 'international';
      } else {
        result.headerData.region = 'international';
        result.headerData.regions = ['international'];
      }

      // Project Stages - support both legacy (standardProjectPhase) and new (standardProjectStage) formats
      result.headerData.projectStagesIso = [];
      result.headerData.projectStages = [];

      // New format: standardProjectStage
      const projectStages = getDirectChildren(uc, 'standardProjectStage');
      projectStages.forEach(stage => {
        const nameEl = getFirstChild(stage, 'name');
        const stageValue = nameEl?.textContent?.trim();
        if (stageValue) {
          result.headerData.projectStagesIso.push(stageValue.toLowerCase());
          result.headerData.projectStages.push(stageValue.toLowerCase());
        }
      });

      // Legacy format: standardProjectPhase (xPPM uses this)
      const legacyProjectPhases = getDirectChildren(uc, 'standardProjectPhase');
      legacyProjectPhases.forEach(phase => {
        const nameEl = getFirstChild(phase, 'name');
        const stageValue = nameEl?.textContent?.trim();
        if (stageValue) {
          const normalizedStage = stageValue.toLowerCase().replace(/\s+/g, '');
          const stageMap = {
            'design': 'design',
            'production': 'production',
            'construction': 'production',
            'handover': 'handover',
            'operation': 'operation',
            'inception': 'inception',
            'brief': 'brief',
            'end-of-life': 'end-of-life'
          };
          const mappedStage = stageMap[normalizedStage] || stageValue.toLowerCase();
          if (!result.headerData.projectStagesIso.includes(mappedStage)) {
            result.headerData.projectStagesIso.push(mappedStage);
            result.headerData.projectStages.push(mappedStage);
          }
        }
      });

      // Also check for localProjectPhase (legacy xPPM)
      const localProjectPhases = getDirectChildren(uc, 'localProjectPhase');
      localProjectPhases.forEach(phase => {
        const nameEl = getFirstChild(phase, 'name');
        const stageValue = nameEl?.textContent?.trim();
        if (stageValue && !result.headerData.projectStages.includes(stageValue)) {
          result.headerData.projectStages.push(stageValue);
        }
      });

      // Local project stages (v2.0)
      const localStages = getDirectChildren(uc, 'localProjectStage');
      localStages.forEach(stage => {
        const nameEl = getFirstChild(stage, 'name');
        const stageName = nameEl?.textContent?.trim();
        const classification = getFirstChild(stage, 'classification');
        const classSystem = classification?.getAttribute('name') || '';

        if (stageName) {
          if (classSystem.includes('AIA')) {
            if (!result.headerData.projectStagesAia) result.headerData.projectStagesAia = [];
            result.headerData.projectStagesAia.push(stageName);
          } else if (classSystem.includes('RIBA')) {
            if (!result.headerData.projectStagesRiba) result.headerData.projectStagesRiba = [];
            result.headerData.projectStagesRiba.push(stageName);
          }
        }
      });

      // User-defined Project Stages (AIA B101, RIBA Plan of Work, etc.) - legacy
      result.headerData.projectStagesAia = result.headerData.projectStagesAia || [];
      result.headerData.projectStagesRiba = result.headerData.projectStagesRiba || [];

      const userDefinedStages = getDirectChildren(uc, 'userDefinedProjectStage');
      userDefinedStages.forEach(stage => {
        const stageName = getFirstChild(stage, 'name')?.textContent?.trim();
        const classification = getFirstChild(stage, 'classification');
        const system = classification?.getAttribute('system') || '';

        if (stageName) {
          if (system.includes('AIA')) {
            result.headerData.projectStagesAia.push(stageName);
          } else if (system.includes('RIBA')) {
            result.headerData.projectStagesRiba.push(stageName);
          }
        }
      });

      // Use elements (can have multiple) - parse as structured objects with classification
      const useElements = getDirectChildren(uc, 'use');
      if (useElements.length > 0) {
        result.headerData.uses = [];
        result.headerData.useCategories = [];
        result.headerData.useClassification = null;
        useElements.forEach(use => {
          const useName = use.getAttribute('name')?.trim();

          const classification = getFirstChild(use, 'classification');
          if (classification && !result.headerData.useClassification) {
            result.headerData.useClassification = {
              name: classification.getAttribute('name') || '',
              version: classification.getAttribute('version') || '',
              publicationYear: classification.getAttribute('publicationYear') || ''
            };
          }

          if (useName) {
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

    // Parse Business Context Map (bcm) -> Process Map (pm) - namespace-safe
    const bcm = getFirstChild(idmRoot, 'businessContextMap');
    if (bcm) {
      const bcmSpecId = getFirstChild(bcm, 'specId');
      if (bcmSpecId) {
        result.headerData.bcmGuid = bcmSpecId.getAttribute('guid') || '';
      }
    }

    const pm = bcm ? getFirstChild(bcm, 'pm') : null;
    if (pm) {
      const diagram = getFirstChild(pm, 'diagram');
      if (diagram) {
        result.headerData.pmId = diagram.getAttribute('id') || '';
        const diagramFilePath = diagram.getAttribute('diagramFilePath');
        if (diagramFilePath) {
          result.bpmnFilePath = diagramFilePath;
        }

        // Extract embedded BPMN content from diagramContent element
        const diagramContent = getFirstChild(diagram, 'diagramContent');
        if (diagramContent) {
          const bpmnContent = diagramContent.textContent;
          if (bpmnContent && bpmnContent.trim()) {
            result.bpmnXml = bpmnContent.trim();
          }
        }
      }

      // Parse dataObjectAndEr links
      const doErLinks = getDirectChildren(pm, 'dataObjectAndEr');
      doErLinks.forEach(link => {
        const doId = getFirstChild(link, 'associatedDataObject')?.textContent;
        const erId = getFirstChild(link, 'associatedEr')?.textContent;
        if (doId && erId) {
          result.dataObjectErLinks = result.dataObjectErLinks || {};
          result.dataObjectErLinks[doId] = erId;
        }
      });
    }

    // Parse Exchange Requirements (er)
    // Collect all ERs (including nested ones) by their GUID for linking
    const ersById = {}; // Keyed by GUID - flat map of all ERs
    const ersByShortTitle = {}; // Also index by shortTitle for name-based matching
    const topLevelERs = []; // Track top-level ERs for hierarchy (with nested subERs)

    // Helper function to recursively add an ER and all its sub-ERs to the flat map
    const addErToMap = (er, depth = 0) => {
      // Store by GUID (primary key used in dataObjectErLinks)
      if (er.guid) {
        ersById[er.guid] = er;
      }

      // Also store by id (which might be from idmCode)
      if (er.id && er.id !== er.guid) {
        ersById[er.id] = er;
      }

      // Store by shortTitle for name-based matching
      if (er.shortTitle) {
        ersByShortTitle[er.shortTitle] = er;
      }

      // Recursively add all sub-ERs to the flat map
      if (er.subERs && er.subERs.length > 0) {
        er.subERs.forEach(subEr => {
          addErToMap(subEr, depth + 1);
        });
      }
    };

    // Parse top-level ERs from root (parseErElement is recursive and includes all sub-ERs)
    const topLevelErElements = getDirectChildren(idmRoot, 'er');
    topLevelErElements.forEach(erElement => {
      const er = parseErElement(erElement);
      topLevelERs.push(er);
      addErToMap(er, 0);
    });

    // Store the top-level (root) ER name for display
    if (topLevelERs.length > 0) {
      const rootER = topLevelERs[0];
      result.headerData.rootERName = rootER.name || rootER.shortTitle || '';
      result.headerData.rootERId = rootER.guid || rootER.id || '';
    }

    // Now map ERs to data object IDs using the dataObjectErLinks
    // Note: Multiple Data Objects can reference the same ER (many-to-one relationship)
    const linkedErGuids = new Set(); // Track which ERs are linked to Data Objects
    if (result.dataObjectErLinks && Object.keys(result.dataObjectErLinks).length > 0) {
      // Use the links from the PM to map data objects to ERs
      Object.entries(result.dataObjectErLinks).forEach(([dataObjectId, erId]) => {
        // Try to find ER by GUID first, then by id
        const er = ersById[erId];
        if (er) {
          result.erDataMap[dataObjectId] = er;
          linkedErGuids.add(er.guid);
          linkedErGuids.add(er.id);
        } else {
          console.warn(`ER not found for link: dataObject=${dataObjectId}, erId=${erId}`);
        }
      });
    }

    // Store the top-level ER hierarchy (with full nesting) for display
    // Sub-ERs are accessed through their parent's subERs array, not as separate entries
    result.erHierarchy = topLevelERs;

    // Store all ERs in library for reference (flattened for lookups)
    result.erLibrary = Object.values(ersById);

    // Log parsing statistics
    console.log(`Parsed ${topLevelERs.length} top-level ER(s) with total ${Object.keys(ersById).length} ERs at all levels`);
    console.log(`Linked ${linkedErGuids.size} unique ER(s) to ${Object.keys(result.erDataMap).length} Data Object(s)`);

    // Set default values for missing required fields
    result.headerData = {
      title: '',
      shortTitle: '',
      subTitle: '',
      authors: [],
      organization: '',
      version: '1.0',
      creationDate: new Date().toISOString().split('T')[0],
      status: 'WD',
      localDocumentStatus: '',
      localCode: '',
      language: 'EN',
      projectStages: [],
      projectStagesIso: [],
      projectStagesAia: [],      // AIA B101 stages (US)
      projectStagesRiba: [],     // RIBA Plan of Work stages (UK)
      useCategories: [],
      uses: [],
      useClassification: null,   // Classification metadata for uses
      region: 'international',
      regions: [],
      summary: '',
      revisionHistory: [],
      changeLogs: [],            // Raw change logs from legacy xPPM
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
      // Root ER info (for hierarchy display)
      rootERName: '',
      rootERId: '',
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
    guid: '',           // GUID for linking (primary key in dataObjectErLinks)
    shortTitle: '',     // Short title for name-based matching
    name: '',
    description: '',
    informationUnits: [],
    subERs: []
  };

  // Parse specId - namespace-safe
  const specId = getFirstChild(erElement, 'specId');
  if (specId) {
    er.guid = specId.getAttribute('guid') || '';
    er.shortTitle = specId.getAttribute('shortTitle') || '';

    const idmCode = specId.getAttribute('idmCode') || '';
    const idFromCode = idmCode.startsWith('ER-') ? idmCode.substring(3) : idmCode;
    er.id = idFromCode || er.guid || `ER-${Date.now()}`;
    er.name = er.shortTitle || specId.getAttribute('fullTitle') || '';
  }

  // Parse description - namespace-safe (with optional image children)
  const description = getFirstChild(erElement, 'description');
  if (description) {
    er.description = description.getAttribute('title') || description.textContent || '';
    // Parse figures from description's image children
    const descImages = getDirectChildren(description, 'image');
    if (descImages.length > 0) {
      er.descriptionFigures = [];
      descImages.forEach((img, index) => {
        const caption = img.getAttribute('caption') || `Figure ${index + 1}`;
        const mimeType = img.getAttribute('mimeType') || 'image/png';
        const encoding = img.getAttribute('encoding');
        const filePath = img.getAttribute('filePath');
        if (encoding === 'base64') {
          const base64Data = img.textContent?.trim() || '';
          if (base64Data) {
            er.descriptionFigures.push({
              id: `fig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              name: caption, caption, type: mimeType,
              data: `data:${mimeType};base64,${base64Data}`
            });
          }
        } else if (filePath) {
          er.descriptionFigures.push({
            id: `fig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: filePath, caption, type: mimeType, filePath
          });
        }
      });
    }
  }

  // Parse information units - namespace-safe
  const infoUnits = getDirectChildren(erElement, 'informationUnit');
  infoUnits.forEach(iu => {
    er.informationUnits.push(parseInformationUnit(iu));
  });

  // Parse sub-ERs recursively (handles unlimited nesting depth per ISO 29481-3)
  const subErContainers = getDirectChildren(erElement, 'subEr');
  subErContainers.forEach(subErContainer => {
    const nestedErElement = getFirstChild(subErContainer, 'er');
    if (nestedErElement) {
      const subEr = parseErElement(nestedErElement);
      er.subERs.push(subEr);
    }
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
    definitionFigures: [],
    examples: '',
    exampleImages: [],
    correspondingExternalElements: [],
    subInformationUnits: []
  };

  // Check for definition figures in <description> child elements (with image children)
  const defDesc = getFirstChild(iuElement, 'description');
  if (defDesc) {
    // If there's a description child, its title overrides the attribute (or supplements it)
    const descTitle = defDesc.getAttribute('title') || '';
    if (descTitle) {
      unit.definition = descTitle;
    }
    const defImages = getDirectChildren(defDesc, 'image');
    defImages.forEach((img, index) => {
      const caption = img.getAttribute('caption') || `Figure ${index + 1}`;
      const mimeType = img.getAttribute('mimeType') || 'image/png';
      const encoding = img.getAttribute('encoding');
      const filePath = img.getAttribute('filePath');
      if (encoding === 'base64') {
        const base64Data = img.textContent?.trim() || '';
        if (base64Data) {
          unit.definitionFigures.push({
            id: `fig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: caption, caption, type: mimeType,
            data: `data:${mimeType};base64,${base64Data}`
          });
        }
      } else if (filePath) {
        unit.definitionFigures.push({
          id: `fig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: filePath, caption, type: mimeType, filePath
        });
      }
    });
  }

  // Parse examples - namespace-safe
  const examplesEl = getFirstChild(iuElement, 'examples');
  const examplesDesc = examplesEl ? getFirstChild(examplesEl, 'description') : null;
  if (examplesDesc) {
    unit.examples = examplesDesc.getAttribute('title') || examplesDesc.textContent || '';
  }

  // Parse example images (both embedded base64 and file references)
  const images = examplesEl ? getDirectChildren(examplesEl, 'image') : [];
  // Also check for images inside description element
  const descImages = examplesDesc ? getDirectChildren(examplesDesc, 'image') : [];
  [...images, ...descImages].forEach((img, index) => {
    const caption = img.getAttribute('caption') || `Image ${index + 1}`;
    const mimeType = img.getAttribute('mimeType') || 'image/png';
    const encoding = img.getAttribute('encoding');
    const filePath = img.getAttribute('filePath');

    if (encoding === 'base64') {
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
      unit.exampleImages.push({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: filePath,
        caption: caption,
        type: mimeType,
        filePath: filePath
      });
    }
  });

  // Parse corresponding external elements (skip empty mappings) - namespace-safe
  const mappings = getDirectChildren(iuElement, 'correspondingExternalElement');
  mappings.forEach(m => {
    const name = m.getAttribute('name') || '';
    if (name.trim()) {
      unit.correspondingExternalElements.push({
        id: `CEE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        basis: m.getAttribute('basis') || 'IFC',
        name: name
      });
    }
  });

  // Parse sub information units (recursive) - namespace-safe
  const subIuContainers = getDirectChildren(iuElement, 'subInformationUnit');
  subIuContainers.forEach(container => {
    getDirectChildren(container, 'informationUnit').forEach(su => {
      unit.subInformationUnits.push(parseInformationUnit(su));
    });
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

/**
 * Detect idmXML schema version (v1.0 or v2.0)
 * Based on ISO 29481-3 idmXSD schema differences
 *
 * @param {string} content - The idmXML content as string
 * @returns {Object} Version info: { version: '1.0'|'2.0'|'unknown', confidence: 'high'|'medium'|'low', details: string }
 */
export const detectIdmXmlVersion = (content) => {
  if (!content || typeof content !== 'string') {
    return { version: 'unknown', confidence: 'low', details: 'No content provided' };
  }

  const result = {
    version: 'unknown',
    confidence: 'low',
    details: '',
    indicators: []
  };

  // Check for namespace indicators (most reliable)
  // v1.0: xmlns:idm="https://standards.buildingsmart.org/IDM/idmXML/0.2" version="1.0"
  // v2.0: xmlns:idm="https://standards.buildingsmart.org/IDM/idmXML/2.0"
  const hasV1Namespace = content.includes('idmXML/0.2') || content.includes('idmXML/1.0');
  const hasV2Namespace = content.includes('idmXML/2.0');

  // Check for version attribute in schema declaration
  const hasV1VersionAttr = /version\s*=\s*["']1\.0["']/.test(content);
  const hasV2VersionAttr = /version\s*=\s*["']2\.0["']/.test(content);

  // Check for element naming differences
  // v1.0 uses "standardProjectPhase", v2.0 uses "standardProjectStage"
  const hasProjectPhase = content.includes('<standardProjectPhase') || content.includes('standardProjectPhase>');
  const hasProjectStage = content.includes('<standardProjectStage') || content.includes('standardProjectStage>');

  // v1.0 uses "localProjectPhase", v2.0 uses "localProjectStage"
  const hasLocalPhase = content.includes('<localProjectPhase') || content.includes('localProjectPhase>');
  const hasLocalStage = content.includes('<localProjectStage') || content.includes('localProjectStage>');

  // Build indicators list
  if (hasV1Namespace) result.indicators.push('v1.0 namespace (idmXML/0.2)');
  if (hasV2Namespace) result.indicators.push('v2.0 namespace (idmXML/2.0)');
  if (hasV1VersionAttr) result.indicators.push('version="1.0" attribute');
  if (hasV2VersionAttr) result.indicators.push('version="2.0" attribute');
  if (hasProjectPhase) result.indicators.push('standardProjectPhase element (v1.0)');
  if (hasProjectStage) result.indicators.push('standardProjectStage element (v2.0)');
  if (hasLocalPhase) result.indicators.push('localProjectPhase element (v1.0)');
  if (hasLocalStage) result.indicators.push('localProjectStage element (v2.0)');

  // Determine version based on indicators
  const v1Score = (hasV1Namespace ? 3 : 0) + (hasV1VersionAttr ? 2 : 0) + (hasProjectPhase ? 1 : 0) + (hasLocalPhase ? 1 : 0);
  const v2Score = (hasV2Namespace ? 3 : 0) + (hasV2VersionAttr ? 2 : 0) + (hasProjectStage ? 1 : 0) + (hasLocalStage ? 1 : 0);

  if (v1Score > v2Score && v1Score > 0) {
    result.version = '1.0';
    result.confidence = v1Score >= 3 ? 'high' : 'medium';
    result.details = `Detected idmXSD v1.0 (score: ${v1Score})`;
  } else if (v2Score > v1Score && v2Score > 0) {
    result.version = '2.0';
    result.confidence = v2Score >= 3 ? 'high' : 'medium';
    result.details = `Detected idmXSD v2.0 (score: ${v2Score})`;
  } else if (v1Score === v2Score && v1Score > 0) {
    // Tie - likely mixed or transitional
    result.version = '2.0'; // Default to newer
    result.confidence = 'low';
    result.details = 'Mixed indicators - defaulting to v2.0';
  } else {
    // No clear indicators - check for basic idmXML structure
    if (isIdmXml(content)) {
      result.version = '2.0'; // Default to newer version for new files
      result.confidence = 'low';
      result.details = 'No version indicators found - assuming v2.0';
    } else {
      result.details = 'Not a valid idmXML file';
    }
  }

  return result;
};

export default {
  parseIdmXml,
  isIdmXml,
  detectIdmXmlVersion
};
