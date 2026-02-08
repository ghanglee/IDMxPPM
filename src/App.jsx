import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import BPMNEditor from './components/BPMNEditor/BPMNEditor';
import ERPanel from './components/ERPanel/ERPanel';
import ValidationPanel from './components/ValidationPanel/ValidationPanel';
import SpecNameBar from './components/SpecNameBar/SpecNameBar';
import VerticalMenuBar from './components/VerticalMenuBar/VerticalMenuBar';
import ContentPane from './components/ContentPane/ContentPane';
import StartupScreen from './components/StartupScreen/StartupScreen';
import FilePickerModal from './components/FilePickerModal/FilePickerModal';
import DataObjectERSelectModal from './components/DataObjectERSelectModal/DataObjectERSelectModal';
import RootERSelectionModal from './components/RootERSelectionModal/RootERSelectionModal';
import RootSwitchModal from './components/RootSwitchModal/RootSwitchModal';
import ServerConnectionModal from './components/ServerConnectionModal/ServerConnectionModal';
import ServerBrowser from './components/ServerBrowser/ServerBrowser';
import { ThemeProvider } from './hooks/useTheme';
import { useServerConnection } from './hooks/useServerConnection';
import { api } from './utils/apiClient';
import { generateIdmXml } from './utils/idmXmlGenerator';
import { downloadIdmBundle } from './utils/idmBundleExporter';
import { importIdmBundle, isZipBundle } from './utils/idmBundleImporter';
import { validateProject, getValidationStatusLabel } from './utils/validation';
import { parseIdmXml, isIdmXml, detectIdmXmlVersion } from './utils/idmXmlParser';
import { readFileAsText } from './utils/pdfExporter';
import { defaultIdmXslt } from './utils/defaultIdmXslt';
import { generateStandaloneHtml } from './utils/htmlExporter';
import {
  SAMPLE_BPMN_XML,
  SAMPLE_HEADER_DATA,
  SAMPLE_ER_DATA_MAP,
  SAMPLE_ER_HIERARCHY,
  SAMPLE_DATA_OBJECT_ER_MAP,
  SAMPLE_ER_LIBRARY
} from './data/sampleProjectData';

/**
 * Main Application Component
 *
 * IDMxPPM - Neo Seoul
 * Information Delivery Manual authoring tool based on the
 * eXtended Process to Product Modeling method
 */
const App = () => {
  // State
  const [bpmnXml, setBpmnXml] = useState(null);
  const [selectedDataObject, setSelectedDataObject] = useState(null);
  const [showERPanel, setShowERPanel] = useState(false);
  const [showBPMNEditor, setShowBPMNEditor] = useState(true); // BPMN editor visibility toggle
  const [erPanelMode, setErPanelMode] = useState('list');
  const [erDataMap, setErDataMap] = useState({});
  const [erLibrary, setErLibrary] = useState([]);

  // ER-first architecture state (new)
  const [erHierarchy, setErHierarchy] = useState([]);  // Ordered hierarchical array of ERs (source of truth)
  const [dataObjectErMap, setDataObjectErMap] = useState({});  // Maps data object IDs to ER IDs
  const [selectedErId, setSelectedErId] = useState(null);  // Currently selected ER in hierarchy
  const [newlyAddedErId, setNewlyAddedErId] = useState(null);  // Track newly added ER for scrolling
  const [showDataObjectERModal, setShowDataObjectERModal] = useState(false);  // Modal for new data object ER selection
  const [newDataObjectPending, setNewDataObjectPending] = useState(null);  // Pending data object awaiting ER assignment
  const [unassociatedDataObjectsQueue, setUnassociatedDataObjectsQueue] = useState([]);  // Queue of unassociated data objects from BPMN import

  const [currentFilePath, setCurrentFilePath] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [bpmnDataObjects, setBpmnDataObjects] = useState([]); // Track all data objects from BPMN

  // Explicit project state - true only when user creates/opens a project
  const [hasActiveProject, setHasActiveProject] = useState(false);

  // Header Data State (Basic Information per ISO 29481-1 and ISO 29481-3)
  const [headerData, setHeaderData] = useState({
    // Required fields
    title: '',               // fullTitle
    shortTitle: '',          // Separate from fullTitle per idmXSD
    authors: [],             // Array of authors (individuals or organizations)
    organization: '',
    version: '1.0',
    creationDate: new Date().toISOString().split('T')[0],
    status: 'NP',
    language: 'EN',
    regions: [],             // Array of region codes (ISO 3166-1)
    region: 'international', // Legacy single region field (for backward compatibility)

    // Legacy xPPM fields (per old idmXSD)
    subTitle: '',            // Optional sub-title
    localCode: '',           // Local code identifier
    localDocumentStatus: '', // Local document status
    changeLogs: [],          // Array of {id, changeDateTime, changeSummary, changedBy, changes: [{changedElement, changedFrom}]}
    committee: null,         // {name, members: [], leader: id}
    publisher: null,         // {name, location}

    // Use Case specific fields
    projectStages: [],       // Array of selected project stages
    projectStagesIso: [],    // ISO 22263 project stages
    projectStagesAia: [],    // AIA B101 project stages
    projectStagesRiba: [],   // RIBA Plan of Work stages
    useCategories: [],       // Array of selected use categories
    uses: [],                // Array of {verb, noun} for BIM uses

    // Optional fields
    summary: '',
    aimAndScope: '',         // Separate from summary per idmXSD
    revisionHistory: [],     // Array of {date, description} for revision tracking
    contributors: [],        // Array of contributor names
    copyright: '',
    license: '',             // License information
    keywords: [],            // Array of keywords/tags
    relatedStandards: [],    // Array of related standard references
    externalReferences: [],  // Array of external URLs/references
    references: '',          // Reference text
    additionalDescription: '',

    // Section figures (images)
    summaryFigures: [],
    aimAndScopeFigures: [],
    benefitsFigures: [],
    limitationsFigures: [],

    // Use Case fields (per ISO 29481-1)
    objectives: '',
    benefits: '',
    limitations: '',
    actors: '',              // Process actors text (legacy)
    actorsList: [],          // Array of {id, name, role, bpmnId}
    preconditions: '',       // Conditions before process starts
    postconditions: '',      // Expected outcomes after completion
    triggeringEvents: '',    // Events that trigger the process
    requiredCapabilities: '',// Required software/process capabilities
    complianceCriteria: '',  // Criteria for compliance verification

    // Persistent GUIDs for idmXSD compliance (ISO 29481-3)
    idmGuid: '',             // IDM specification GUID
    ucGuid: '',              // Use Case GUID
    bcmGuid: '',             // Business Context Map GUID
    pmId: '',                // Process Map ID
    idmCode: ''              // IDM Code (auto-generated if empty)
  });

  // Validation State
  const [validationResults, setValidationResults] = useState(null);
  const [showValidationPanel, setShowValidationPanel] = useState(false);

  // Close Project Confirmation Dialog State
  const [showCloseConfirmDialog, setShowCloseConfirmDialog] = useState(false);

  // New Project Dialog State
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

  // Save & Export Dialog State
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState('idm');
  const [exportFilename, setExportFilename] = useState(''); // User-editable filename
  const [exportSavePath, setExportSavePath] = useState(''); // Full path from browse dialog
  const [exportOptions, setExportOptions] = useState({
    includeBpmn: true,
    includeImages: true,
    idmXsdVersion: '2.0' // '1.0' or '2.0'
  });
  const [customXslt, setCustomXslt] = useState(null); // Custom XSLT file for PDF export

  // About Dialog State
  const [showAboutDialog, setShowAboutDialog] = useState(false);

  // Server Connection State
  const serverConnection = useServerConnection();
  const [showServerModal, setShowServerModal] = useState(false);
  const [showServerBrowser, setShowServerBrowser] = useState(false);
  const [serverSpecId, setServerSpecId] = useState(null); // MongoDB _id of currently loaded spec

  // File Picker Modal State (for browser mode)
  const [showFilePickerModal, setShowFilePickerModal] = useState(false);

  // Root ER Selection Modal State (for multiple top-level ERs on import)
  const [showRootERSelectionModal, setShowRootERSelectionModal] = useState(false);
  const [pendingErHierarchy, setPendingErHierarchy] = useState(null); // Hierarchy waiting for root selection
  const [pendingImportData, setPendingImportData] = useState(null); // Full import context waiting for root selection

  // Root Switch Modal State (for outdent-to-root scenarios)
  const [showRootSwitchModal, setShowRootSwitchModal] = useState(false);
  const [pendingOutdentER, setPendingOutdentER] = useState(null); // ER being outdented to root

  // Active content pane state
  const [activePane, setActivePane] = useState(null); // 'specification' | 'useCase' | 'exchangeReq' | null

  const modelerRef = useRef(null);
  const isLoadingProjectRef = useRef(false); // Track when loading a project to skip marking dirty
  const extractDataObjectsTimeoutRef = useRef(null); // Track timeout for cancellation
  const isProgrammaticDataObjectRef = useRef(false); // Track when creating data object programmatically (to skip modal)

  // Check if ER hierarchy needs root selection (multiple top-level ERs)
  const needsRootSelection = useCallback((hierarchy) => {
    return hierarchy && Array.isArray(hierarchy) && hierarchy.length > 1;
  }, []);

  // Consolidate hierarchy by selecting an existing ER as root (others become its sub-ERs)
  const consolidateWithSelectedRoot = useCallback((hierarchy, selectedRootId) => {
    if (!hierarchy || hierarchy.length <= 1) return hierarchy;

    const selectedIndex = hierarchy.findIndex(er => er.id === selectedRootId || er.guid === selectedRootId);
    if (selectedIndex === -1) return hierarchy;

    const selectedRoot = hierarchy[selectedIndex];
    const otherERs = hierarchy.filter((_, i) => i !== selectedIndex);

    return [{
      ...selectedRoot,
      subERs: [...(selectedRoot.subERs || []), ...otherERs]
    }];
  }, []);

  // Consolidate hierarchy by creating a new root (all existing become sub-ERs)
  const consolidateWithNewRoot = useCallback((hierarchy, newRootName) => {
    if (!hierarchy || hierarchy.length === 0) return hierarchy;

    const newRootId = crypto.randomUUID ? crypto.randomUUID() : `er_${Date.now()}`;
    return [{
      id: newRootId,
      guid: newRootId,
      name: newRootName,
      description: '',
      informationUnits: [],
      subERs: [...hierarchy]
    }];
  }, []);

  // Auto-consolidate ER hierarchy: if only one top-level ER, return as-is
  // If multiple, make the first one the root and others become sub-ERs
  // This is a fallback for cases where the modal wasn't shown
  const autoConsolidateErHierarchy = useCallback((hierarchy) => {
    if (!hierarchy || hierarchy.length === 0) return [];
    if (hierarchy.length === 1) return hierarchy;

    // Multiple top-level ERs: make first one the root
    const [root, ...rest] = hierarchy;
    return [{
      ...root,
      subERs: [...(root.subERs || []), ...rest]
    }];
  }, []);

  // Helper to handle import with potential multi-root ER situation
  // Returns true if modal was shown (async), false if import can proceed directly
  const handleErHierarchyImport = useCallback((hierarchy, importData) => {
    if (!hierarchy || hierarchy.length === 0) {
      return false; // No ERs to handle
    }

    if (hierarchy.length > 1) {
      // Multiple top-level ERs - show modal and defer import
      setPendingErHierarchy(hierarchy);
      setPendingImportData(importData);
      setShowRootERSelectionModal(true);
      return true; // Import is deferred, waiting for modal
    }

    // Single or no top-level ER - can proceed directly
    // Single or no top-level ER - can proceed directly
    return false;
  }, []);

  // Helper function to extract data objects after project load
  // Called after loading a project since importXML doesn't trigger commandStack.changed
  const extractDataObjectsAfterLoad = useCallback(() => {
    // Cancel any pending timeout to prevent stale closure issues
    if (extractDataObjectsTimeoutRef.current) {
      clearTimeout(extractDataObjectsTimeoutRef.current);
    }

    extractDataObjectsTimeoutRef.current = setTimeout(() => {
      if (!modelerRef.current) return;
      try {
        const elementRegistry = modelerRef.current.get('elementRegistry');
        if (!elementRegistry) return;

        const dataObjects = [];
        elementRegistry.forEach(element => {
          if (element.type === 'bpmn:DataObjectReference' ||
              element.type === 'bpmn:DataObject' ||
              element.type === 'bpmn:DataStoreReference') {
            const businessObject = element.businessObject;
            dataObjects.push({
              id: element.id,
              name: businessObject?.name || element.id,
              type: element.type
            });
          }
        });

        setBpmnDataObjects(dataObjects);

        // Check for unassociated data objects (for standalone BPMN import)
        // Only check if not loading a project (project import handles ER data separately)
        if (!isLoadingProjectRef.current && dataObjects.length > 0) {
          // Find data objects not yet associated with ERs
          const unassociated = dataObjects.filter(dataObj => {
            // Check ER-first mode: dataObjectErMap
            const hasErFirstMapping = dataObjectErMap[dataObj.id];
            // Check legacy mode: erDataMap
            const hasLegacyMapping = erDataMap[dataObj.id];
            return !hasErFirstMapping && !hasLegacyMapping;
          });

          if (unassociated.length > 0) {
            // Queue the unassociated data objects for modal processing
            setUnassociatedDataObjectsQueue(unassociated);
            // Start with the first one
            setNewDataObjectPending(unassociated[0]);
            setShowDataObjectERModal(true);
          }
        }
      } catch (error) {
        console.error('Error extracting data objects after load:', error);
      }
    }, 300); // Wait for modeler to finish importing
  }, [dataObjectErMap, erDataMap]);

  // Helper function to sync actors with BPMN Pools and Lanes
  // - Pool names sync to group-level actor names
  // - Lane names sync to individual-level subActor names
  // - A single unnamed Lane = no swimlanes
  const linkActorsToSwimlanesByName = useCallback(() => {
    setTimeout(() => {
      if (!modelerRef.current) return;

      try {
        const elementRegistry = modelerRef.current.get('elementRegistry');
        if (!elementRegistry) return;

        // Extract Pools and Lanes from BPMN
        const pools = [];
        const poolLanesMap = {}; // Map pool ID to its lanes

        elementRegistry.forEach(element => {
          if (element.type === 'bpmn:Participant') {
            pools.push(element);
            poolLanesMap[element.id] = [];
          } else if (element.type === 'bpmn:Lane') {
            // Find parent pool
            let parent = element.parent;
            while (parent) {
              if (parent.type === 'bpmn:Participant') {
                if (poolLanesMap[parent.id]) {
                  poolLanesMap[parent.id].push(element);
                }
                break;
              }
              // Check process reference
              pools.forEach(pool => {
                const processRef = pool.businessObject?.processRef;
                if (processRef && parent.businessObject === processRef) {
                  if (poolLanesMap[pool.id]) {
                    poolLanesMap[pool.id].push(element);
                  }
                }
              });
              parent = parent.parent;
            }
          }
        });

        if (pools.length === 0) return;

        // Build BPMN actors list from Pools
        // Pool = group actor, Lane = individual subActor
        const bpmnActors = pools.map(pool => {
          const poolName = pool.businessObject?.name || '';
          const poolLanes = poolLanesMap[pool.id] || [];

          // A single unnamed lane = no swimlanes (Pool represents the actor directly)
          const hasSingleUnnamedLane = poolLanes.length === 1 && !poolLanes[0].businessObject?.name;
          const effectiveLanes = hasSingleUnnamedLane ? [] : poolLanes;

          return {
            id: pool.id,
            name: poolName,
            type: 'pool',
            subActors: effectiveLanes.map(lane => ({
              id: lane.id,
              name: lane.businessObject?.name || ''
            }))
          };
        });

        // Update headerData: sync actor names with Pool names, subActor names with Lane names
        setHeaderData(prevHeaderData => {
          const currentActors = prevHeaderData.actorsList || [];
          let updatedActors = [...currentActors];
          let hasChanges = false;

          // Build lookup maps for existing actors
          const actorsByBpmnId = {};
          const actorsByName = {};
          currentActors.forEach((actor, index) => {
            if (actor.bpmnId) {
              actorsByBpmnId[actor.bpmnId] = { actor, index };
            }
            if (actor.name) {
              actorsByName[actor.name.toLowerCase().trim()] = { actor, index };
            }
          });

          // Track which BPMN pools we've processed
          const processedPoolIds = new Set();

          // Process each BPMN Pool
          bpmnActors.forEach(bpmnActor => {
            processedPoolIds.add(bpmnActor.id);

            // Try to find existing actor by bpmnId first, then by name
            let existingEntry = actorsByBpmnId[bpmnActor.id];
            let matchedByName = false;

            if (!existingEntry && bpmnActor.name) {
              existingEntry = actorsByName[bpmnActor.name.toLowerCase().trim()];
              matchedByName = !!existingEntry;
            }

            if (existingEntry) {
              // Update existing actor
              const { index } = existingEntry;
              const updatedActor = { ...updatedActors[index] };
              let needsUpdate = false;

              // Link by bpmnId if matched by name (first time linking)
              if (matchedByName && !updatedActor.bpmnId) {
                updatedActor.bpmnId = bpmnActor.id;
                updatedActor.actorType = 'group';
                needsUpdate = true;
                console.info(`Linked actor "${updatedActor.name}" to Pool "${bpmnActor.name}"`);
              }

              // Sync actor name with Pool name (Pool name is source of truth when linked)
              if (updatedActor.bpmnId === bpmnActor.id && updatedActor.name !== bpmnActor.name) {
                updatedActor.name = bpmnActor.name;
                updatedActor.bpmnShapeName = bpmnActor.name;
                needsUpdate = true;
              }

              // Sync subActors with Lanes
              const currentSubActors = updatedActor.subActors || [];
              const bpmnLanes = bpmnActor.subActors || [];
              const bpmnLaneIds = new Set(bpmnLanes.map(l => l.id));

              // Build map of current subActors by bpmnShapeName
              const subActorsByBpmnId = {};
              currentSubActors.forEach((sub, subIdx) => {
                if (sub.bpmnShapeName) {
                  subActorsByBpmnId[sub.bpmnShapeName] = { sub, subIdx };
                }
              });

              let updatedSubActors = [...currentSubActors];

              // Update or add subActors from Lanes
              bpmnLanes.forEach(lane => {
                const existingSubEntry = subActorsByBpmnId[lane.id];
                if (existingSubEntry) {
                  // Sync subActor name with Lane name
                  if (existingSubEntry.sub.name !== lane.name) {
                    updatedSubActors = updatedSubActors.map(s =>
                      s.bpmnShapeName === lane.id ? { ...s, name: lane.name } : s
                    );
                    needsUpdate = true;
                  }
                } else {
                  // Create new subActor from Lane
                  updatedSubActors.push({
                    id: `subactor-${lane.id}-${Date.now()}`,
                    name: lane.name,
                    role: '',
                    bpmnShapeName: lane.id
                  });
                  needsUpdate = true;
                }
              });

              // Remove subActors whose Lanes were deleted
              const removedSubs = updatedSubActors.filter(s => s.bpmnShapeName && !bpmnLaneIds.has(s.bpmnShapeName));
              if (removedSubs.length > 0) {
                updatedSubActors = updatedSubActors.filter(s => !s.bpmnShapeName || bpmnLaneIds.has(s.bpmnShapeName));
                needsUpdate = true;
              }

              if (needsUpdate) {
                updatedActor.subActors = updatedSubActors;
                updatedActors[index] = updatedActor;
                hasChanges = true;
              }
            } else {
              // Create new actor from BPMN Pool (only if Pool has a name)
              if (bpmnActor.name) {
                const newActor = {
                  id: `actor-${bpmnActor.id}-${Date.now()}`,
                  name: bpmnActor.name,
                  role: '',
                  actorType: 'group',
                  bpmnId: bpmnActor.id,
                  bpmnShapeName: bpmnActor.name,
                  subActors: bpmnActor.subActors.map(lane => ({
                    id: `subactor-${lane.id}-${Date.now()}`,
                    name: lane.name,
                    role: '',
                    bpmnShapeName: lane.id
                  }))
                };
                updatedActors.push(newActor);
                hasChanges = true;
                console.info(`Created actor "${bpmnActor.name}" from BPMN Pool`);
              }
            }
          });

          // Remove actors whose linked Pools no longer exist
          const actorsToRemove = updatedActors.filter(a => a.bpmnId && !processedPoolIds.has(a.bpmnId));
          if (actorsToRemove.length > 0) {
            updatedActors = updatedActors.filter(a => !a.bpmnId || processedPoolIds.has(a.bpmnId));
            hasChanges = true;
            console.info(`Removed actors: ${actorsToRemove.map(a => a.name).join(', ')}`);
          }

          if (hasChanges) {
            console.info('Synced actors with BPMN:', updatedActors.filter(a => a.bpmnId).map(a => a.name).join(', '));
            return { ...prevHeaderData, actorsList: updatedActors };
          }
          return prevHeaderData;
        });
      } catch (error) {
        console.error('Error syncing actors with BPMN:', error);
      }
    }, 500); // Wait for modeler to finish importing
  }, []);

  // Complete import after root ER selection
  const completeImportAfterRootSelection = useCallback((consolidatedHierarchy) => {
    if (!pendingImportData) return;

    const {
      bpmnXml: importBpmnXml,
      headerData: importHeaderData,
      dataObjectErMap: importDataObjectErMap,
      erDataMap: importErDataMap,
      erLibrary: importErLibrary,
      filePath,
      isDirtyAfterImport,
      source // 'project', 'idmXml', 'xppm', etc.
    } = pendingImportData;

    // Set the consolidated hierarchy
    setErHierarchy(consolidatedHierarchy);

    // Set other import data
    if (importBpmnXml) setBpmnXml(importBpmnXml);
    if (importHeaderData) setHeaderData(importHeaderData);
    if (importDataObjectErMap) setDataObjectErMap(importDataObjectErMap);
    if (importErDataMap) setErDataMap(importErDataMap);
    if (importErLibrary) setErLibrary(importErLibrary);
    if (filePath) setCurrentFilePath(filePath);
    setIsDirty(isDirtyAfterImport ?? false);
    setValidationResults(null);
    setHasActiveProject(true);
    setActivePane('specification');

    setTimeout(() => { isLoadingProjectRef.current = false; }, 500);
    extractDataObjectsAfterLoad();
    linkActorsToSwimlanesByName();

    // Clean up modal state
    setShowRootERSelectionModal(false);
    setPendingErHierarchy(null);
    setPendingImportData(null);
  }, [pendingImportData, extractDataObjectsAfterLoad, linkActorsToSwimlanesByName]);

  // Handle root selection from modal - select existing ER as root
  const handleRootERSelected = useCallback((selectedErId) => {
    if (!pendingErHierarchy) return;
    const consolidated = consolidateWithSelectedRoot(pendingErHierarchy, selectedErId);
    completeImportAfterRootSelection(consolidated);
  }, [pendingErHierarchy, consolidateWithSelectedRoot, completeImportAfterRootSelection]);

  // Handle root selection from modal - create new root ER
  const handleCreateNewRootER = useCallback((newRootName) => {
    if (!pendingErHierarchy) return;
    const consolidated = consolidateWithNewRoot(pendingErHierarchy, newRootName);
    completeImportAfterRootSelection(consolidated);
  }, [pendingErHierarchy, consolidateWithNewRoot, completeImportAfterRootSelection]);

  // Handle cancel from root selection modal
  const handleRootERSelectionCancel = useCallback(() => {
    setShowRootERSelectionModal(false);
    setPendingErHierarchy(null);
    setPendingImportData(null);
    isLoadingProjectRef.current = false;
    // Note: Import is cancelled - no changes made
  }, []);

  // Compute whether project is open - uses explicit hasActiveProject flag
  const isProjectOpen = hasActiveProject;

  // Handle modeler ready
  const handleModelerReady = useCallback((modeler) => {
    modelerRef.current = modeler;

    // Extract data objects after modeler is ready
    setTimeout(() => {
      if (modelerRef.current) {
        try {
          const elementRegistry = modelerRef.current.get('elementRegistry');
          if (!elementRegistry) return;

          const dataObjects = [];
          elementRegistry.forEach(element => {
            if (element.type === 'bpmn:DataObjectReference' ||
                element.type === 'bpmn:DataObject' ||
                element.type === 'bpmn:DataStoreReference') {
              const businessObject = element.businessObject;
              dataObjects.push({
                id: element.id,
                name: businessObject?.name || element.id,
                type: element.type
              });
            }
          });

          setBpmnDataObjects(dataObjects);
        } catch (error) {
          console.error('Error extracting data objects on ready:', error);
        }
      }
    }, 200);
  }, []);

  // Helper: Find ER by ID in hierarchy (recursive) - defined early for use in handleDataObjectSelect
  const findErById = useCallback((hierarchy, targetId) => {
    for (const er of hierarchy) {
      if (er.id === targetId || er.guid === targetId) return er;
      if (er.subERs?.length > 0) {
        const found = findErById(er.subERs, targetId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Handle Data Object selection from BPMN editor
  const handleDataObjectSelect = useCallback((dataObject) => {
    setSelectedDataObject(dataObject);

    // Check if data object has an ER mapping (ER-first architecture)
    const existingErId = dataObjectErMap[dataObject.id];
    const existingEr = existingErId ? findErById(erHierarchy, existingErId) : null;

    if (existingEr) {
      // ER already exists in erHierarchy - always sync to erDataMap for legacy panel
      // This ensures the detail panel shows the current data from erHierarchy
      setErDataMap(prev => ({
        ...prev,
        [dataObject.id]: existingEr
      }));
      // Also select this ER in ER-first mode so the detail panel shows it
      setSelectedErId(existingErId);
    } else if (erDataMap[dataObject.id]) {
      // Legacy erDataMap has data but no ER-first mapping - migrate it
      const legacyEr = erDataMap[dataObject.id];
      const erId = legacyEr.id || legacyEr.guid || `er-${Date.now()}`;

      // Check if this ER is already in erHierarchy
      const erInHierarchy = findErById(erHierarchy, erId);
      if (!erInHierarchy) {
        // Add to erHierarchy
        setErHierarchy(prev => [...prev, { ...legacyEr, id: erId }]);
      }
      // Create the mapping
      setDataObjectErMap(prev => ({
        ...prev,
        [dataObject.id]: erId
      }));
      // Select this ER in ER-first mode
      setSelectedErId(erId);
    } else {
      // No ER exists - show modal to let user select existing ER or create new one
      // This gives users control over the ER association instead of auto-creating
      setNewDataObjectPending(dataObject);
      setShowDataObjectERModal(true);
      // Don't open ER panel yet - wait for user to complete the modal
      return;
    }

    if (dataObject.forceOpen || !showERPanel) {
      setShowERPanel(true);
      setErPanelMode('detail');
      setActivePane(null); // Close content pane when opening ER panel
    }
  }, [erDataMap, dataObjectErMap, erHierarchy, showERPanel, findErById]);

  // Handle ER data change
  // Uses functional update to merge with current state, preventing race conditions
  // when multiple fields are updated before React re-renders
  const handleERChange = useCallback((newErData) => {
    if (selectedDataObject) {
      // Update legacy erDataMap
      setErDataMap(prev => {
        const currentData = prev[selectedDataObject.id] || {};
        return {
          ...prev,
          [selectedDataObject.id]: {
            ...currentData,  // Preserve existing data
            ...newErData     // Apply updates (may include all fields or just changed ones)
          }
        };
      });

      // Also update erHierarchy if mapping exists (ER-first architecture)
      const erId = dataObjectErMap[selectedDataObject.id];
      if (erId) {
        setErHierarchy(prev => {
          const updateErRecursive = (ers) => {
            return ers.map(er => {
              if (er.id === erId || er.guid === erId) {
                return { ...er, ...newErData };
              }
              if (er.subERs && er.subERs.length > 0) {
                return { ...er, subERs: updateErRecursive(er.subERs) };
              }
              return er;
            });
          };
          return updateErRecursive(prev);
        });
      }

      setIsDirty(true);
    }
  }, [selectedDataObject, dataObjectErMap]);

  // Save ER and update Data Object name in BPMN
  const handleERSave = useCallback((erData) => {
    if (!selectedDataObject || !modelerRef.current) return;

    // Merge with current state to preserve any concurrent updates
    setErDataMap(prev => {
      const currentData = prev[selectedDataObject.id] || {};
      return {
        ...prev,
        [selectedDataObject.id]: {
          ...currentData,
          ...erData
        }
      };
    });

    // Also update erHierarchy if mapping exists (ER-first architecture)
    const erId = dataObjectErMap[selectedDataObject.id];
    if (erId) {
      setErHierarchy(prev => {
        const updateErRecursive = (ers) => {
          return ers.map(er => {
            if (er.id === erId || er.guid === erId) {
              return { ...er, ...erData };
            }
            if (er.subERs && er.subERs.length > 0) {
              return { ...er, subERs: updateErRecursive(er.subERs) };
            }
            return er;
          });
        };
        return updateErRecursive(prev);
      });
    }

    if (erData.name && erData.name !== selectedDataObject.name) {
      try {
        const modeling = modelerRef.current.get('modeling');
        const elementRegistry = modelerRef.current.get('elementRegistry');
        const element = elementRegistry.get(selectedDataObject.id);

        if (element) {
          modeling.updateProperties(element, { name: erData.name });
        }
      } catch (err) {
        console.error('Failed to update Data Object name:', err);
      }
    }

    setErLibrary(prev => {
      const exists = prev.find(er => er.id === erData.id);
      if (exists) {
        return prev.map(er => er.id === erData.id ? erData : er);
      } else {
        return [...prev, { ...erData }];
      }
    });

    setIsDirty(true);
  }, [selectedDataObject, dataObjectErMap]);

  // Save ER As (new copy)
  const handleERSaveAs = useCallback(async (erData, newName) => {
    const newER = {
      ...erData,
      id: `ER-${Date.now()}`,
      name: newName
    };

    setErLibrary(prev => [...prev, newER]);

    if (window.electronAPI) {
      const content = JSON.stringify(newER, null, 2);
      await window.electronAPI.exportER({
        content,
        defaultName: `${newName.replace(/[^a-zA-Z0-9]/g, '_')}.erxml`,
        format: 'json'
      });
    }

    return newER;
  }, []);

  // Load ER from library
  const handleLoadERFromLibrary = useCallback((libraryER) => {
    if (!selectedDataObject) return;

    const copiedER = {
      ...libraryER,
      id: `ER-${Date.now()}`
    };

    setErDataMap(prev => ({
      ...prev,
      [selectedDataObject.id]: copiedER
    }));

    setIsDirty(true);
  }, [selectedDataObject]);

  // Import ER from file
  const handleImportER = useCallback((importedER) => {
    setErLibrary(prev => {
      const exists = prev.find(er => er.id === importedER.id);
      if (!exists) {
        return [...prev, importedER];
      }
      return prev;
    });
  }, []);

  // Add Sub-ER to current ER
  const handleAddSubER = useCallback((parentUnitId, subER) => {
    if (!selectedDataObject) return;

    const currentER = erDataMap[selectedDataObject.id];
    if (!currentER) return;

    const addSubUnits = (units) => units.map(u => {
      if (u.id === parentUnitId) {
        return {
          ...u,
          subInformationUnits: [
            ...(u.subInformationUnits || []),
            ...subER.informationUnits.map(su => ({
              ...su,
              id: `${su.id}-${Date.now()}`
            }))
          ]
        };
      }
      return {
        ...u,
        subInformationUnits: addSubUnits(u.subInformationUnits || [])
      };
    });

    const updatedER = {
      ...currentER,
      informationUnits: addSubUnits(currentER.informationUnits)
    };

    setErDataMap(prev => ({
      ...prev,
      [selectedDataObject.id]: updatedER
    }));

    setIsDirty(true);
  }, [selectedDataObject, erDataMap]);

  // ===========================================
  // ER-First Hierarchy Manipulation Functions
  // ===========================================

  // Helper: Find ER location (parent, index, siblings) in hierarchy
  const findErLocation = useCallback((hierarchy, targetId, parent = null) => {
    for (let i = 0; i < hierarchy.length; i++) {
      if (hierarchy[i].id === targetId || hierarchy[i].guid === targetId) {
        return { parent, index: i, siblings: hierarchy, er: hierarchy[i] };
      }
      if (hierarchy[i].subERs?.length > 0) {
        const found = findErLocation(hierarchy[i].subERs, targetId, hierarchy[i]);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Helper: Update ER in hierarchy by ID
  const updateErInHierarchy = useCallback((hierarchy, targetId, updates) => {
    return hierarchy.map(er => {
      if (er.id === targetId || er.guid === targetId) {
        return { ...er, ...updates };
      }
      if (er.subERs?.length > 0) {
        return { ...er, subERs: updateErInHierarchy(er.subERs, targetId, updates) };
      }
      return er;
    });
  }, []);

  // Helper: Remove ER from hierarchy by ID
  const removeErFromHierarchy = useCallback((hierarchy, targetId) => {
    return hierarchy
      .filter(er => er.id !== targetId && er.guid !== targetId)
      .map(er => {
        if (er.subERs?.length > 0) {
          return { ...er, subERs: removeErFromHierarchy(er.subERs, targetId) };
        }
        return er;
      });
  }, []);

  // Add new ER to hierarchy (at root level)
  const handleAddErToHierarchy = useCallback(() => {
    const newER = {
      id: `er-${Date.now()}`,
      guid: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      description: '',
      informationUnits: [],
      subERs: [],
      constraints: []
    };
    setErHierarchy(prev => [...prev, newER]);
    setSelectedErId(newER.id);
    setIsDirty(true);
  }, []);

  // Delete ER from hierarchy
  const handleDeleteErFromHierarchy = useCallback((erId) => {
    if (!erId) return;

    // Check if any data objects reference this ER
    const linkedDataObjects = Object.entries(dataObjectErMap)
      .filter(([, erRef]) => erRef === erId)
      .map(([doId]) => doId);

    if (linkedDataObjects.length > 0) {
      const proceed = window.confirm(
        `This ER is linked to ${linkedDataObjects.length} Data Object(s). Delete anyway?`
      );
      if (!proceed) return;

      // Remove mappings for linked data objects
      setDataObjectErMap(prev => {
        const updated = { ...prev };
        linkedDataObjects.forEach(doId => delete updated[doId]);
        return updated;
      });
    }

    // Remove ER from hierarchy
    setErHierarchy(prev => removeErFromHierarchy(prev, erId));

    // Clear selection if deleted ER was selected
    if (selectedErId === erId) {
      setSelectedErId(null);
    }

    setIsDirty(true);
  }, [dataObjectErMap, selectedErId, removeErFromHierarchy]);

  // Update ER data in hierarchy
  const handleUpdateErInHierarchy = useCallback((erId, updates) => {
    setErHierarchy(prev => updateErInHierarchy(prev, erId, updates));
    setIsDirty(true);
  }, [updateErInHierarchy]);

  // Move ER up among siblings
  const handleMoveErUp = useCallback((erId) => {
    setErHierarchy(prev => {
      const location = findErLocation(prev, erId);
      if (!location || location.index <= 0) return prev; // Already first or not found

      const { parent, index, siblings } = location;
      const newSiblings = [...siblings];
      [newSiblings[index - 1], newSiblings[index]] = [newSiblings[index], newSiblings[index - 1]];

      if (parent) {
        return updateErInHierarchy(prev, parent.id, { subERs: newSiblings });
      }
      return newSiblings;
    });
    setIsDirty(true);
  }, [findErLocation, updateErInHierarchy]);

  // Move ER down among siblings
  const handleMoveErDown = useCallback((erId) => {
    setErHierarchy(prev => {
      const location = findErLocation(prev, erId);
      if (!location || location.index >= location.siblings.length - 1) return prev; // Already last

      const { parent, index, siblings } = location;
      const newSiblings = [...siblings];
      [newSiblings[index], newSiblings[index + 1]] = [newSiblings[index + 1], newSiblings[index]];

      if (parent) {
        return updateErInHierarchy(prev, parent.id, { subERs: newSiblings });
      }
      return newSiblings;
    });
    setIsDirty(true);
  }, [findErLocation, updateErInHierarchy]);

  // Indent ER (make it a sub-ER of the sibling above it)
  const handleIndentEr = useCallback((erId) => {
    setErHierarchy(prev => {
      const location = findErLocation(prev, erId);
      if (!location || location.index <= 0) return prev; // Can't indent first item

      const { parent, index, siblings, er } = location;
      const newParentEr = siblings[index - 1];

      // Remove from current position
      const newSiblings = siblings.filter((_, i) => i !== index);

      // Add to new parent's subERs
      const updatedNewParent = {
        ...newParentEr,
        subERs: [...(newParentEr.subERs || []), er]
      };

      // Replace old parent with updated one
      const updatedSiblings = newSiblings.map(s =>
        s.id === newParentEr.id ? updatedNewParent : s
      );

      if (parent) {
        return updateErInHierarchy(prev, parent.id, { subERs: updatedSiblings });
      }
      return updatedSiblings;
    });
    setIsDirty(true);
  }, [findErLocation, updateErInHierarchy]);

  // Move an ER to become a sub-ER of another ER (used by Sub-ER modal)
  // This is a MOVE operation - the ER is removed from its original location
  const handleMoveErAsSubER = useCallback((sourceErId, targetErId) => {
    if (!sourceErId || !targetErId || sourceErId === targetErId) return;

    setErHierarchy(prev => {
      // Find the source ER
      const sourceLocation = findErLocation(prev, sourceErId);
      if (!sourceLocation) return prev;

      const { er: sourceER } = sourceLocation;

      // Check if target is a descendant of source (would create circular reference)
      const isDescendant = (parent, childId) => {
        if (!parent.subERs) return false;
        for (const sub of parent.subERs) {
          if (sub.id === childId || sub.guid === childId) return true;
          if (isDescendant(sub, childId)) return true;
        }
        return false;
      };

      if (isDescendant(sourceER, targetErId)) {
        console.warn('Cannot move ER: target is a descendant of source');
        return prev;
      }

      // Step 1: Remove source ER from its current location
      const hierarchyWithoutSource = removeErFromHierarchy(prev, sourceErId);

      // Step 2: Add source ER as sub-ER of target
      const addAsSubER = (ers) => {
        return ers.map(er => {
          if (er.id === targetErId || er.guid === targetErId) {
            return {
              ...er,
              subERs: [...(er.subERs || []), sourceER]
            };
          }
          if (er.subERs?.length > 0) {
            return { ...er, subERs: addAsSubER(er.subERs) };
          }
          return er;
        });
      };

      return addAsSubER(hierarchyWithoutSource);
    });

    setIsDirty(true);
    return true; // Indicate success
  }, [findErLocation, removeErFromHierarchy]);

  // Outdent ER (promote it to the parent's level)
  // Rule 2: Only ONE top-level ER allowed
  // If outdenting a level-2 ER to root, show Root Switch modal
  const handleOutdentEr = useCallback((erId) => {
    // First, check if this is a level-2 ER trying to become root
    const location = findErLocation(erHierarchy, erId);
    if (!location || !location.parent) return; // Already at root level

    const { parent, er } = location;
    const parentLocation = findErLocation(erHierarchy, parent.id);
    if (!parentLocation) return;

    // Check if parent is at root level (level-2 ER trying to become root)
    if (!parentLocation.parent && erHierarchy.length >= 1) {
      // This is a level-2 ER - show Root Switch modal instead of blocking
      setPendingOutdentER({
        newRoot: er,
        currentRoot: erHierarchy[0]
      });
      setShowRootSwitchModal(true);
      return;
    }

    // Normal outdent (not to root level)
    setErHierarchy(prev => {
      const loc = findErLocation(prev, erId);
      if (!loc || !loc.parent) return prev;

      const { parent: parentEr, index, er: erToOutdent } = loc;
      const parentLoc = findErLocation(prev, parentEr.id);
      if (!parentLoc) return prev;

      // Remove ER from current parent's subERs
      const updatedParent = {
        ...parentEr,
        subERs: parentEr.subERs.filter((_, i) => i !== index)
      };

      // Insert ER after parent at grandparent level
      const grandparentSiblings = parentLoc.siblings;
      const parentIndex = parentLoc.index;

      const newGrandparentSiblings = [
        ...grandparentSiblings.slice(0, parentIndex + 1),
        erToOutdent,
        ...grandparentSiblings.slice(parentIndex + 1)
      ].map(s => s.id === parentEr.id ? updatedParent : s);

      if (parentLoc.parent) {
        return updateErInHierarchy(prev, parentLoc.parent.id, { subERs: newGrandparentSiblings });
      }
      return newGrandparentSiblings;
    });
    setIsDirty(true);
  }, [erHierarchy, findErLocation, updateErInHierarchy]);

  // Handle Root Switch - Option A: Dissolve old root
  // New root becomes the root, old root's children (excluding new root) are moved to new root
  const handleRootSwitchDissolveOld = useCallback(() => {
    if (!pendingOutdentER) return;

    const { newRoot, currentRoot } = pendingOutdentER;

    setErHierarchy(() => {
      // Get old root's other children (excluding the new root)
      const otherChildren = (currentRoot.subERs || []).filter(
        sub => sub.id !== newRoot.id && sub.guid !== newRoot.id
      );

      // New root becomes the root, with old root's other children merged
      return [{
        ...newRoot,
        subERs: [...(newRoot.subERs || []), ...otherChildren]
      }];
    });

    setShowRootSwitchModal(false);
    setPendingOutdentER(null);
    setIsDirty(true);
  }, [pendingOutdentER]);

  // Handle Root Switch - Option B: Keep old root as sub-ER
  // New root becomes the root, old root becomes a sub-ER of new root
  const handleRootSwitchKeepOldAsSub = useCallback(() => {
    if (!pendingOutdentER) return;

    const { newRoot, currentRoot } = pendingOutdentER;

    setErHierarchy(() => {
      // Remove new root from old root's subERs
      const oldRootWithoutNewRoot = {
        ...currentRoot,
        subERs: (currentRoot.subERs || []).filter(
          sub => sub.id !== newRoot.id && sub.guid !== newRoot.id
        )
      };

      // New root becomes the root, old root becomes its sub-ER
      return [{
        ...newRoot,
        subERs: [...(newRoot.subERs || []), oldRootWithoutNewRoot]
      }];
    });

    setShowRootSwitchModal(false);
    setPendingOutdentER(null);
    setIsDirty(true);
  }, [pendingOutdentER]);

  // Handle Root Switch cancel
  const handleRootSwitchCancel = useCallback(() => {
    setShowRootSwitchModal(false);
    setPendingOutdentER(null);
  }, []);

  // Get ER for a data object (via dataObjectErMap)
  const getErForDataObject = useCallback((dataObjectId) => {
    const erId = dataObjectErMap[dataObjectId];
    return erId ? findErById(erHierarchy, erId) : null;
  }, [erHierarchy, dataObjectErMap, findErById]);

  // Handle new data object created in BPMN
  // Don't show modal automatically - let user double-click to associate with ER
  // This gives users control over when to define the ER association
  const handleNewDataObject = useCallback((_dataObject) => {
    // Check if this data object was created programmatically (via +ER button)
    if (isProgrammaticDataObjectRef.current) {
      // Created programmatically - already associated with ER
      return;
    }
    // Data object exists in BPMN but is not yet associated with an ER
    // User can double-click to open the association modal when ready
    // No automatic modal - this allows users to place multiple data objects
    // before deciding on ER associations
  }, []);

  // Process next unassociated data object from queue
  const processNextUnassociatedDataObject = useCallback(() => {
    setUnassociatedDataObjectsQueue(prev => {
      const remaining = prev.slice(1);
      if (remaining.length > 0) {
        // More data objects to process - show modal for next one
        setNewDataObjectPending(remaining[0]);
        setShowDataObjectERModal(true);
      } else {
        // No more data objects - close modal
        setNewDataObjectPending(null);
        setShowDataObjectERModal(false);
      }
      return remaining;
    });
  }, []);

  // Handle ER selection from modal for new data object
  const handleDataObjectERSelected = useCallback((er) => {
    if (!newDataObjectPending) return;

    // Map data object to ER
    setDataObjectErMap(prev => ({
      ...prev,
      [newDataObjectPending.id]: er.id
    }));

    // Also sync to legacy erDataMap for the detail panel
    setErDataMap(prev => ({
      ...prev,
      [newDataObjectPending.id]: er
    }));

    // Update data object name in BPMN to match ER name
    if (modelerRef.current && er.name) {
      try {
        const modeling = modelerRef.current.get('modeling');
        const elementRegistry = modelerRef.current.get('elementRegistry');
        const element = elementRegistry.get(newDataObjectPending.id);
        if (element) {
          modeling.updateProperties(element, { name: er.name });
        }
      } catch (err) {
        console.error('Failed to update Data Object name:', err);
      }
    }

    // Select this ER and open the ER panel
    setSelectedErId(er.id);
    setSelectedDataObject(newDataObjectPending);
    setShowERPanel(true);
    setErPanelMode('detail');
    setActivePane(null); // Close content pane when opening ER panel

    setIsDirty(true);
    // Process next unassociated data object if any
    processNextUnassociatedDataObject();
  }, [newDataObjectPending, processNextUnassociatedDataObject]);

  // Handle new ER creation from modal for new data object
  // If no ERs exist, create as top-level ER
  // If top-level ER exists, add as sub-ER of the first top-level ER
  const handleDataObjectNewER = useCallback((erName) => {
    const newER = {
      id: `er-${Date.now()}`,
      guid: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: erName,
      description: '',
      informationUnits: [],
      subERs: []
    };

    setErHierarchy(prev => {
      if (prev.length === 0) {
        // No ERs exist - create as top-level
        return [newER];
      } else {
        // Top-level ER exists - add as sub-ER of the first top-level ER
        const updated = [...prev];
        updated[0] = {
          ...updated[0],
          subERs: [...(updated[0].subERs || []), newER]
        };
        return updated;
      }
    });

    if (newDataObjectPending) {
      setDataObjectErMap(prev => ({
        ...prev,
        [newDataObjectPending.id]: newER.id
      }));

      // Also sync to legacy erDataMap for the detail panel
      setErDataMap(prev => ({
        ...prev,
        [newDataObjectPending.id]: newER
      }));

      // Update data object name in BPMN
      if (modelerRef.current) {
        try {
          const modeling = modelerRef.current.get('modeling');
          const elementRegistry = modelerRef.current.get('elementRegistry');
          const element = elementRegistry.get(newDataObjectPending.id);
          if (element) {
            modeling.updateProperties(element, { name: erName });
          }
        } catch (err) {
          console.error('Failed to update Data Object name:', err);
        }
      }

      // Select this ER and open the ER panel
      setSelectedErId(newER.id);
      setSelectedDataObject(newDataObjectPending);
      setShowERPanel(true);
      setErPanelMode('detail');
      setActivePane(null); // Close content pane when opening ER panel
    }

    setIsDirty(true);
    // Process next unassociated data object if any
    processNextUnassociatedDataObject();
  }, [newDataObjectPending, processNextUnassociatedDataObject]);

  // Cancel data object ER selection - skip this data object and move to next
  const handleDataObjectERModalClose = useCallback(() => {
    // Process next unassociated data object if any, or close modal
    processNextUnassociatedDataObject();
  }, [processNextUnassociatedDataObject]);

  // Migrate legacy erDataMap to new erHierarchy + dataObjectErMap structure
  const migrateErDataMap = useCallback((legacyErDataMap) => {
    const newErHierarchy = [];
    const newDataObjectErMap = {};
    const seenGuids = new Set();

    Object.entries(legacyErDataMap || {}).forEach(([dataObjectId, er]) => {
      if (!er) return;

      const erGuid = er.guid || er.id || `er-${dataObjectId}`;

      // Check if we already have this ER (by guid) - deduplicate
      if (!seenGuids.has(erGuid)) {
        newErHierarchy.push({
          ...er,
          id: erGuid,
          guid: erGuid
        });
        seenGuids.add(erGuid);
      }

      // Map this data object to the ER
      newDataObjectErMap[dataObjectId] = erGuid;
    });

    return { erHierarchy: newErHierarchy, dataObjectErMap: newDataObjectErMap };
  }, []);

  // ===========================================
  // End ER-First Hierarchy Functions
  // ===========================================

  // Extract data objects from the modeler
  const extractDataObjectsFromModeler = useCallback(() => {
    if (!modelerRef.current) return [];

    try {
      const elementRegistry = modelerRef.current.get('elementRegistry');
      if (!elementRegistry) return [];

      const dataObjects = [];
      elementRegistry.forEach(element => {
        if (element.type === 'bpmn:DataObjectReference' ||
            element.type === 'bpmn:DataObject' ||
            element.type === 'bpmn:DataStoreReference') {
          const businessObject = element.businessObject;
          dataObjects.push({
            id: element.id,
            name: businessObject?.name || element.id,
            type: element.type
          });
        }
      });

      return dataObjects;
    } catch (error) {
      console.error('Error extracting data objects:', error);
      return [];
    }
  }, []);

  // Extract actors from BPMN swimlanes (Pools and Lanes) per IDM 2.0 schema
  // Structure:
  // - Pools = groups (for external exchanges between organizations)
  // - Lanes within Pools = individuals/subActors (for internal exchanges within organizations)
  const extractSwimlanesFromModeler = useCallback(() => {
    if (!modelerRef.current) return [];

    try {
      const elementRegistry = modelerRef.current.get('elementRegistry');
      if (!elementRegistry) return [];

      // Collect all Pools and Lanes
      const pools = [];
      const lanes = [];
      const poolLanesMap = {}; // Map pool ID to its lanes

      elementRegistry.forEach(element => {
        if (element.type === 'bpmn:Participant') {
          pools.push(element);
          poolLanesMap[element.id] = [];
        } else if (element.type === 'bpmn:Lane') {
          lanes.push(element);
        }
      });

      // Associate lanes with their parent pools
      lanes.forEach(lane => {
        let parent = lane.parent;
        let foundPoolId = null;

        while (parent) {
          // Check if any pool references this process
          pools.forEach(pool => {
            const processRef = pool.businessObject?.processRef;
            if (processRef && parent.businessObject === processRef) {
              foundPoolId = pool.id;
            }
          });
          // Also check direct parent relationship in visual hierarchy
          if (parent.type === 'bpmn:Participant') {
            foundPoolId = parent.id;
            break;
          }
          parent = parent.parent;
        }

        if (foundPoolId && poolLanesMap[foundPoolId]) {
          poolLanesMap[foundPoolId].push(lane);
        }
      });

      // Build hierarchical structure: Pools as groups with Lanes as subActors
      // Special case: A Pool with a single unnamed Lane is treated as having no Lanes
      // (the Pool itself represents the actor directly)
      const actors = [];

      pools.forEach(pool => {
        const businessObject = pool.businessObject;
        const poolName = businessObject?.name || '';
        const poolLanes = poolLanesMap[pool.id] || [];

        // Filter out lanes: only include named lanes, or multiple lanes
        // A single unnamed lane is equivalent to no lanes (Pool = actor)
        const hasSingleUnnamedLane = poolLanes.length === 1 && !poolLanes[0].businessObject?.name;
        const effectiveLanes = hasSingleUnnamedLane ? [] : poolLanes.filter(lane => {
          // Include lanes that have names OR if there are multiple lanes (even unnamed)
          return lane.businessObject?.name || poolLanes.length > 1;
        });

        const actor = {
          id: pool.id,
          name: poolName,
          type: 'pool',
          actorType: 'group', // Pools are groups (external exchanges)
          subActors: effectiveLanes.map(lane => ({
            id: lane.id,
            name: lane.businessObject?.name || '',
            type: 'lane',
            actorType: 'individual' // Lanes are individuals (internal exchanges)
          }))
        };

        actors.push(actor);
      });

      return actors;
    } catch (error) {
      console.error('Error extracting swimlanes:', error);
      return [];
    }
  }, []);

  // Handle BPMN diagram change
  const handleBpmnChange = useCallback((xml) => {
    setBpmnXml(xml);
    // Only mark dirty if not loading a project (loading sets its own dirty state)
    if (!isLoadingProjectRef.current) {
      setIsDirty(true);
    }

    // Extract data objects and swimlanes after a short delay to ensure modeler is updated
    setTimeout(() => {
      const dataObjects = extractDataObjectsFromModeler();
      setBpmnDataObjects(dataObjects);

      // Clean up erDataMap: remove ERs for data objects that no longer exist in the diagram
      // Safety: Only clean up if we successfully extracted some data objects
      // (prevents clearing all ERs due to extraction failure)
      if (dataObjects.length > 0) {
        const currentDataObjectIds = new Set(dataObjects.map(d => d.id));
        setErDataMap(prevErDataMap => {
          const newErDataMap = {};
          Object.keys(prevErDataMap).forEach(key => {
            // Keep ER data only if the data object still exists in the diagram
            if (currentDataObjectIds.has(key)) {
              newErDataMap[key] = prevErDataMap[key];
            }
          });
          return newErDataMap;
        });
      }

      // Sync swimlanes (Pools/Lanes) with Actor Roles per IDM 2.0 schema
      // Pools = groups (external exchanges), Lanes = individuals/subActors (internal exchanges)
      const bpmnActors = extractSwimlanesFromModeler();
      setHeaderData(prevHeaderData => {
        const currentActors = prevHeaderData.actorsList || [];
        const bpmnPoolIds = new Set(bpmnActors.map(a => a.id));

        // Build maps for quick lookup:
        // 1. By bpmnId (for already linked actors)
        // 2. By name (for matching manually-added actors to BPMN pools)
        const actorsByBpmnId = {};
        const actorsByName = {};
        currentActors.forEach(actor => {
          if (actor.bpmnId || actor.bpmnShapeName) {
            actorsByBpmnId[actor.bpmnId || actor.bpmnShapeName] = actor;
          }
          if (actor.name) {
            actorsByName[actor.name.toLowerCase().trim()] = actor;
          }
        });

        // Process BPMN pools: update existing actors or add new ones
        let updatedActors = [...currentActors];
        let hasChanges = false;

        bpmnActors.forEach(bpmnActor => {
          // First try to find by bpmnId, then by name (case-insensitive)
          let existingActor = actorsByBpmnId[bpmnActor.id];
          let matchedByName = false;

          if (!existingActor && bpmnActor.name) {
            existingActor = actorsByName[bpmnActor.name.toLowerCase().trim()];
            matchedByName = !!existingActor;
          }

          if (existingActor) {
            // Actor exists - find its index
            const existingIndex = matchedByName
              ? updatedActors.findIndex(a => a.name?.toLowerCase().trim() === bpmnActor.name?.toLowerCase().trim())
              : updatedActors.findIndex(a => (a.bpmnId || a.bpmnShapeName) === bpmnActor.id);
            if (existingIndex !== -1) {
              let needsUpdate = false;
              const updatedActor = { ...updatedActors[existingIndex] };

              // If matched by name (not bpmnId), link the actor to the BPMN Pool
              if (matchedByName && !updatedActor.bpmnId) {
                updatedActor.bpmnId = bpmnActor.id;
                updatedActor.bpmnShapeName = bpmnActor.name;
                updatedActor.actorType = 'group'; // Pool = group
                needsUpdate = true;
                console.info(`Linked actor "${updatedActor.name}" to BPMN Pool by name match`);
              }

              // Update Pool name if changed (only if already linked by bpmnId)
              if (!matchedByName && updatedActor.name !== bpmnActor.name) {
                updatedActor.name = bpmnActor.name;
                needsUpdate = true;
              }

              // Sync subActors (Lanes)
              const currentSubActors = updatedActor.subActors || [];
              const bpmnLanes = bpmnActor.subActors || [];
              const bpmnLaneIds = new Set(bpmnLanes.map(l => l.id));

              // Build map of current subActors by bpmnShapeName
              const subActorsByBpmnId = {};
              currentSubActors.forEach(sub => {
                if (sub.bpmnShapeName) {
                  subActorsByBpmnId[sub.bpmnShapeName] = sub;
                }
              });

              // Update or add subActors (Lanes)
              let updatedSubActors = [...currentSubActors];
              bpmnLanes.forEach(lane => {
                const existingSub = subActorsByBpmnId[lane.id];
                if (existingSub) {
                  // Update Lane name if changed
                  if (existingSub.name !== lane.name) {
                    updatedSubActors = updatedSubActors.map(s =>
                      s.bpmnShapeName === lane.id ? { ...s, name: lane.name } : s
                    );
                    needsUpdate = true;
                  }
                } else {
                  // New Lane - create subActor
                  updatedSubActors.push({
                    id: `subactor-${lane.id}-${Date.now()}`,
                    name: lane.name,
                    role: '',
                    bpmnShapeName: lane.id
                  });
                  needsUpdate = true;
                }
              });

              // Remove subActors whose Lanes were deleted
              const removedSubActors = updatedSubActors.filter(s => s.bpmnShapeName && !bpmnLaneIds.has(s.bpmnShapeName));
              if (removedSubActors.length > 0) {
                updatedSubActors = updatedSubActors.filter(s => !s.bpmnShapeName || bpmnLaneIds.has(s.bpmnShapeName));
                needsUpdate = true;
              }

              if (needsUpdate) {
                updatedActor.subActors = updatedSubActors;
                updatedActors[existingIndex] = updatedActor;
                hasChanges = true;
              }
            }
          } else {
            // New Pool - create actor with subActors (Lanes)
            const newActor = {
              id: `actor-${bpmnActor.id}-${Date.now()}`,
              name: bpmnActor.name,
              role: '',
              actorType: 'group',
              bpmnId: bpmnActor.id,
              bpmnShapeName: bpmnActor.name,
              subActors: (bpmnActor.subActors || []).map(lane => ({
                id: `subactor-${lane.id}-${Date.now()}`,
                name: lane.name,
                role: '',
                bpmnShapeName: lane.id
              }))
            };
            updatedActors.push(newActor);
            hasChanges = true;
          }
        });

        // Remove actors whose linked Pools no longer exist (deleted in BPMN)
        const actorsToRemove = updatedActors.filter(a => (a.bpmnId || a.bpmnShapeName) && !bpmnPoolIds.has(a.bpmnId || a.bpmnShapeName));
        // Only remove actors that are linked to BPMN (not manually added)
        const linkedActorsToRemove = actorsToRemove.filter(a => a.bpmnId);
        if (linkedActorsToRemove.length > 0) {
          updatedActors = updatedActors.filter(a => !a.bpmnId || bpmnPoolIds.has(a.bpmnId));
          hasChanges = true;

          // Notify user about auto-removed actors
          const removedNames = linkedActorsToRemove.map(a => a.name || 'Unnamed').join(', ');
          setTimeout(() => {
            console.info(`Actors removed due to Pool deletion: ${removedNames}`);
            if (linkedActorsToRemove.some(a => a.name)) {
              alert(`The following actors were automatically removed because their linked Pools were deleted:\n\n${removedNames}`);
            }
          }, 100);
        }

        if (hasChanges) {
          return { ...prevHeaderData, actorsList: updatedActors };
        }
        return prevHeaderData;
      });
    }, 100);
  }, [extractDataObjectsFromModeler, extractSwimlanesFromModeler]);

  // Close ER panel
  const handleCloseERPanel = useCallback(() => {
    setShowERPanel(false);
    setSelectedDataObject(null);
  }, []);

  // Create a swimlane (Pool) in BPMN for a given actor
  const createSwimlanForActor = useCallback((actorName) => {
    if (!modelerRef.current) return null;

    try {
      const modeling = modelerRef.current.get('modeling');
      const elementFactory = modelerRef.current.get('elementFactory');
      const canvas = modelerRef.current.get('canvas');
      const elementRegistry = modelerRef.current.get('elementRegistry');

      if (!modeling || !elementFactory || !canvas) return null;

      // Get canvas dimensions and find good position for new pool
      const viewbox = canvas.viewbox();
      let yPosition = 100;

      // Find the lowest existing pool to position new one below it
      elementRegistry.forEach(element => {
        if (element.type === 'bpmn:Participant') {
          const bottom = (element.y || 0) + (element.height || 150);
          if (bottom > yPosition) {
            yPosition = bottom + 50; // Add some margin
          }
        }
      });

      // Create the participant (pool)
      const participantShape = elementFactory.createParticipantShape({
        type: 'bpmn:Participant'
      });

      // Add to canvas
      const newShape = modeling.createShape(
        participantShape,
        { x: viewbox.x + 200, y: yPosition },
        canvas.getRootElement()
      );

      // Set the name if provided
      if (actorName && newShape) {
        modeling.updateProperties(newShape, { name: actorName });
      }

      return newShape?.id || null;
    } catch (error) {
      console.error('Error creating swimlane for actor:', error);
      return null;
    }
  }, []);

  // Remove a swimlane from BPMN by its ID
  const removeSwimlanFromBpmn = useCallback((bpmnId) => {
    if (!modelerRef.current || !bpmnId) return false;

    try {
      const modeling = modelerRef.current.get('modeling');
      const elementRegistry = modelerRef.current.get('elementRegistry');

      const element = elementRegistry.get(bpmnId);
      if (element && (element.type === 'bpmn:Participant' || element.type === 'bpmn:Lane')) {
        modeling.removeShape(element);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing swimlane:', error);
      return false;
    }
  }, []);

  // Create a Data Object in BPMN for a new ER
  const createDataObjectInBpmn = useCallback((erId, erName) => {
    if (!modelerRef.current) return null;

    try {
      const modeling = modelerRef.current.get('modeling');
      const elementFactory = modelerRef.current.get('elementFactory');
      const canvas = modelerRef.current.get('canvas');
      const elementRegistry = modelerRef.current.get('elementRegistry');

      if (!modeling || !elementFactory || !canvas) return null;

      // Get canvas dimensions and find good position for new data object
      const viewbox = canvas.viewbox();

      // Find existing data objects to position the new one
      const existingDataObjects = [];
      elementRegistry.forEach(element => {
        if (element.type === 'bpmn:DataObjectReference' ||
            element.type === 'bpmn:DataObject' ||
            element.type === 'bpmn:DataStoreReference') {
          existingDataObjects.push(element);
        }
      });

      // Position new data object to the right of existing ones, or at default position
      const baseX = viewbox.x + 100;
      const baseY = viewbox.y + 100;
      const offsetX = existingDataObjects.length * 80;

      // Create the data object shape
      const dataObjectShape = elementFactory.createShape({
        type: 'bpmn:DataObjectReference',
        id: erId // Use the ER id as the BPMN element id
      });

      // Add the shape to the canvas
      const rootElement = canvas.getRootElement();
      modeling.createShape(dataObjectShape, { x: baseX + offsetX, y: baseY }, rootElement);

      // Set the name
      if (erName) {
        modeling.updateProperties(dataObjectShape, { name: erName });
      }

      return dataObjectShape?.id || erId;
    } catch (error) {
      console.error('Error creating data object for ER:', error);
      return null;
    }
  }, []);

  // Update swimlane name in BPMN
  const updateSwimlaneName = useCallback((bpmnId, newName) => {
    if (!modelerRef.current || !bpmnId) return false;

    try {
      const modeling = modelerRef.current.get('modeling');
      const elementRegistry = modelerRef.current.get('elementRegistry');

      const element = elementRegistry.get(bpmnId);
      if (element && (element.type === 'bpmn:Participant' || element.type === 'bpmn:Lane')) {
        modeling.updateProperties(element, { name: newName || '' });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating swimlane name:', error);
      return false;
    }
  }, []);

  // Handle Header Data change with actor-to-swimlane sync
  // Uses functional update to avoid race conditions with concurrent state updates
  const handleHeaderChange = useCallback((newHeaderData) => {
    // Use functional update to ensure we work with the latest state
    setHeaderData(prevHeaderData => {
      // Detect actor changes and sync to BPMN
      const oldActors = prevHeaderData.actorsList || [];
      const newActors = newHeaderData.actorsList || [];

      // Build a map of old actors by id for comparison
      const oldActorsById = {};
      oldActors.forEach(a => {
        oldActorsById[a.id] = a;
      });

      // Find newly added actors (actors without bpmnId that weren't in old list)
      const oldActorIds = new Set(oldActors.map(a => a.id));
      const newlyAddedActors = newActors.filter(a => !a.bpmnId && !oldActorIds.has(a.id));

      // Find actors that were renamed (have bpmnId and name changed)
      const renamedActors = newActors.filter(a => {
        if (!a.bpmnId) return false;
        const oldActor = oldActorsById[a.id];
        return oldActor && oldActor.name !== a.name;
      });

      // Update swimlane names for renamed actors (side effect, but safe)
      renamedActors.forEach(actor => {
        updateSwimlaneName(actor.bpmnId, actor.name);
      });

      // Find actors that were removed (with bpmnId)
      const newActorBpmnIds = new Set(newActors.filter(a => a.bpmnId).map(a => a.bpmnId));
      const removedActors = oldActors.filter(a => a.bpmnId && !newActorBpmnIds.has(a.bpmnId));

      // Remove corresponding swimlanes for deleted actors (side effect, but safe)
      removedActors.forEach(actor => {
        if (actor.bpmnId) {
          removeSwimlanFromBpmn(actor.bpmnId);
        }
      });

      // Create swimlanes for newly added actors
      if (newlyAddedActors.length > 0 && modelerRef.current) {
        const updatedActors = newActors.map(actor => {
          if (newlyAddedActors.includes(actor)) {
            const bpmnId = createSwimlanForActor(actor.name);
            if (bpmnId) {
              return { ...actor, bpmnId };
            }
          }
          return actor;
        });

        // Merge newHeaderData with updated actors, preserving all other fields
        return { ...newHeaderData, actorsList: updatedActors };
      }

      // Return newHeaderData directly (this includes regions, uses, etc.)
      return newHeaderData;
    });

    setIsDirty(true);
  }, [createSwimlanForActor, removeSwimlanFromBpmn, updateSwimlaneName]);

  // Handle menu item click
  const handleMenuItemClick = useCallback((pane) => {
    if (activePane === pane) {
      setActivePane(null);
      // If closing exchangeReq pane, also close ER panel
      if (pane === 'exchangeReq') {
        setShowERPanel(false);
      }
    } else {
      setActivePane(pane);
      // Close ER panel if opening a non-ER content pane
      if (pane !== 'exchangeReq') {
        setShowERPanel(false);
        setSelectedDataObject(null);
      }
    }
  }, [activePane]);

  // Handle ER selection from list or content pane
  const handleSelectER = useCallback((erId) => {
    // Set the selected ER ID for ER-first mode
    setSelectedErId(erId);
    // Also set selectedDataObject for legacy mode compatibility
    setSelectedDataObject({ id: erId, name: erId });
    setErPanelMode('detail');
    setShowERPanel(true);
    // Keep the ER list open on the left when selecting an individual ER
  }, []);

  // Add new ER to the hierarchy
  // If an ER is selected, add as sub-ER of the selected ER
  // If no ER is selected but ERs exist, add as sub-ER of the first top-level ER
  // If no ERs exist, create as top-level ER
  // Users can then move ERs around using move up/down and indent/outdent
  const handleAddNewER = useCallback(() => {
    const newER = {
      id: `er-${Date.now()}`,
      guid: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: 'New ER',
      description: '',
      informationUnits: [],
      subERs: []
    };

    setErHierarchy(prev => {
      if (prev.length === 0) {
        // No ERs exist - create as top-level
        return [newER];
      }

      // Helper to add new ER under a specific parent (immutable update)
      // Returns { modified: boolean, result: array }
      const addUnderParent = (hierarchy, parentId) => {
        let modified = false;
        const result = hierarchy.map(er => {
          // Check if this ER is the parent
          if (er.id === parentId || er.guid === parentId) {
            modified = true;
            // Found the parent - add new ER directly to its subERs
            return {
              ...er,
              subERs: [...(er.subERs || []), newER]
            };
          }
          // Not the parent - check sub-ERs recursively (only if not yet modified)
          if (!modified && er.subERs && er.subERs.length > 0) {
            const subResult = addUnderParent(er.subERs, parentId);
            if (subResult.modified) {
              modified = true;
              return { ...er, subERs: subResult.result };
            }
          }
          return er;
        });
        return { modified, result };
      };

      // If an ER is selected, add under that ER
      if (selectedErId) {
        const { modified, result } = addUnderParent(prev, selectedErId);
        if (modified) {
          return result;
        }
        // Parent not found - fall through to default behavior
      }

      // No ER selected or parent not found - add under the first top-level ER
      return [{
        ...prev[0],
        subERs: [...(prev[0].subERs || []), newER]
      }, ...prev.slice(1)];
    });

    // Do NOT create BPMN data object when adding ER from Individual ER panel
    // Data objects should only be created when user adds them directly to BPMN diagram
    // The new ER will appear as a sub-ER in the tree view
    // Do NOT change selectedErId - keep displaying the current ER in Individual ER panel

    // Set newly added ER ID to trigger scroll in ERPanel
    setNewlyAddedErId(newER.id);
    setShowERPanel(true);
    setIsDirty(true);
  }, [selectedErId]);

  // Handle validation error navigation
  const handleValidationNavigate = useCallback((path) => {
    // Close validation panel
    setShowValidationPanel(false);

    // Parse the path to determine navigation target
    // Paths look like: 'header.title', 'er.DataObject_123.name', 'diagram', etc.
    const parts = path.split('.');

    if (parts[0] === 'header') {
      // Navigate to IDM Header (specification)
      setActivePane('specification');
    } else if (parts[0] === 'er' || parts[0] === 'informationUnit') {
      // Navigate to Exchange Requirements
      setActivePane('exchangeReq');

      // If there's a specific data object ID, select it
      if (parts.length > 1 && parts[0] === 'er') {
        const dataObjectId = parts[1];
        if (dataObjectId && dataObjectId !== 'erDataMap') {
          // Open the specific ER
          setTimeout(() => {
            handleSelectER(dataObjectId);
          }, 100);
        }
      }
    } else if (parts[0] === 'diagram') {
      // Diagram errors - focus on BPMN editor
      // Close any open panes to focus on diagram
      setActivePane(null);
    } else {
      // Default to specification
      setActivePane('specification');
    }
  }, [handleSelectER]);

  // Handle ER Panel mode change
  const handleERPanelModeChange = useCallback((mode) => {
    setErPanelMode(mode);
    if (mode === 'list') {
      setSelectedDataObject(null);
    }
  }, []);

  // Process file from file picker (shared between modal and direct input)
  const processFileFromPicker = useCallback(async (file) => {
    if (!file) return;

    try {
      const fileName = file.name.toLowerCase();

      // Handle ZIP bundles (.zip or .idmx)
      if (isZipBundle(file)) {
        try {
          isLoadingProjectRef.current = true;
          const bundleData = await importIdmBundle(file);

          if (bundleData.headerData) {
            setHeaderData(bundleData.headerData);
          }
          if (bundleData.erDataMap) {
            setErDataMap(bundleData.erDataMap);
          }
          if (bundleData.erLibrary) {
            setErLibrary(bundleData.erLibrary);
          }
          if (bundleData.bpmnXml) {
            setBpmnXml(bundleData.bpmnXml);
            setIsDirty(false);
          } else {
            setBpmnXml('DEFAULT');
            setIsDirty(true);
            alert('Bundle imported successfully. Note: No BPMN diagram found in the bundle. The process map needs to be recreated manually.');
          }

          setCurrentFilePath(file.name);
          setValidationResults(null);
          setHasActiveProject(true);
          setActivePane('specification');
          setTimeout(() => { isLoadingProjectRef.current = false; }, 500);
          extractDataObjectsAfterLoad();
          linkActorsToSwimlanesByName(); // Sync actors with BPMN Pools
        } catch (zipErr) {
          console.error('Failed to import ZIP bundle:', zipErr);
          alert('Failed to import ZIP bundle: ' + zipErr.message);
          isLoadingProjectRef.current = false;
        }
        return;
      }

      const content = await file.text();

      if (fileName.endsWith('.json') || fileName.endsWith('.idm')) {
        // Parse as project file (.json or .idm)
        isLoadingProjectRef.current = true;
        const projectData = JSON.parse(content);

        // Determine ER hierarchy (new format or migrated from legacy)
        let erHierarchyToImport = [];
        let dataObjectErMapToImport = {};
        let erDataMapToImport = null;

        if (projectData.erHierarchy && projectData.erHierarchy.length > 0) {
          erHierarchyToImport = projectData.erHierarchy;
          dataObjectErMapToImport = projectData.dataObjectErMap || {};
          erDataMapToImport = projectData.erDataMap || null;
        } else if (projectData.erDataMap) {
          const migrated = migrateErDataMap(projectData.erDataMap);
          erHierarchyToImport = migrated.erHierarchy;
          dataObjectErMapToImport = migrated.dataObjectErMap;
          erDataMapToImport = projectData.erDataMap;
        }

        // Check if we need to show root selection modal
        if (handleErHierarchyImport(erHierarchyToImport, {
          bpmnXml: projectData.bpmnXml,
          headerData: projectData.headerData,
          dataObjectErMap: dataObjectErMapToImport,
          erDataMap: erDataMapToImport,
          erLibrary: projectData.erLibrary,
          filePath: file.name,
          isDirtyAfterImport: false,
          source: 'project'
        })) {
          // Modal shown, import will be completed by modal handler
          return;
        }

        // No modal needed - proceed with direct import
        if (projectData.bpmnXml) setBpmnXml(projectData.bpmnXml);
        if (projectData.headerData) setHeaderData(projectData.headerData);
        setErHierarchy(erHierarchyToImport);
        setDataObjectErMap(dataObjectErMapToImport);
        if (erDataMapToImport) setErDataMap(erDataMapToImport);
        if (projectData.erLibrary) setErLibrary(projectData.erLibrary);
        setCurrentFilePath(file.name);
        setIsDirty(false);
        setValidationResults(null);
        setHasActiveProject(true);
        setActivePane('specification');
        setTimeout(() => { isLoadingProjectRef.current = false; }, 500);
        extractDataObjectsAfterLoad();
        linkActorsToSwimlanesByName();
      } else if (fileName.endsWith('.xml')) {
        // Check if it's an idmXML file
        if (isIdmXml(content)) {
          try {
            isLoadingProjectRef.current = true;

            // Detect idmXML schema version (v1.0 vs v2.0)
            const versionInfo = detectIdmXmlVersion(content);
            console.log(`idmXML version detected: ${versionInfo.version} (${versionInfo.confidence} confidence)`);
            console.log('Version indicators:', versionInfo.indicators);

            const idmData = parseIdmXml(content);
            // Store detected version in header data for reference
            idmData.headerData = idmData.headerData || {};
            idmData.headerData.idmXsdVersion = versionInfo.version;
            idmData.headerData.idmXsdVersionConfidence = versionInfo.confidence;

            // Build dataObjectErMap from dataObjectErLinks
            const newDataObjectErMap = {};
            if (idmData.dataObjectErLinks) {
              Object.entries(idmData.dataObjectErLinks).forEach(([doId, erId]) => {
                newDataObjectErMap[doId] = erId;
              });
            }

            // Determine BPMN and dirty state
            const hasBpmn = !!idmData.bpmnXml;
            const bpmnToImport = hasBpmn ? idmData.bpmnXml : 'EMPTY';
            const isDirtyAfterImport = !hasBpmn;

            // Check if we need to show root selection modal
            if (idmData.erHierarchy && handleErHierarchyImport(idmData.erHierarchy, {
              bpmnXml: bpmnToImport,
              headerData: idmData.headerData,
              dataObjectErMap: newDataObjectErMap,
              erDataMap: idmData.erDataMap,
              erLibrary: null,
              filePath: file.name,
              isDirtyAfterImport,
              source: 'idmXml'
            })) {
              // Modal shown, import will be completed by modal handler
              if (!hasBpmn) {
                alert('idmXML imported. Note: No embedded BPMN diagram found. The process map canvas will be blank.');
              }
              return;
            }

            // No modal needed - proceed with direct import
            if (idmData.headerData) setHeaderData(idmData.headerData);
            if (idmData.erHierarchy) setErHierarchy(idmData.erHierarchy);
            setDataObjectErMap(newDataObjectErMap);
            if (idmData.erDataMap) setErDataMap(idmData.erDataMap);
            setBpmnXml(bpmnToImport);
            if (!hasBpmn) {
              alert('idmXML imported successfully. Note: No embedded BPMN diagram found. The process map canvas is blank and needs to be created manually.');
            }
            setCurrentFilePath(file.name);
            setIsDirty(isDirtyAfterImport);
            setValidationResults(null);
            setHasActiveProject(true);
            setActivePane('specification');
            setTimeout(() => { isLoadingProjectRef.current = false; }, 500);
            extractDataObjectsAfterLoad();
            linkActorsToSwimlanesByName();
          } catch (idmErr) {
            console.error('Failed to parse idmXML:', idmErr);
            alert('Failed to parse idmXML file: ' + idmErr.message);
            isLoadingProjectRef.current = false;
          }
        } else {
          // Treat as BPMN XML
          setBpmnXml(content);
          setErDataMap({});
          setErHierarchy([]);
          setDataObjectErMap({});
          setCurrentFilePath(null);
          setIsDirty(true);
          setHasActiveProject(true);
        }
      } else if (fileName.endsWith('.bpmn')) {
        // Parse as BPMN file
        setBpmnXml(content);
        setErDataMap({});
        setErHierarchy([]);
        setDataObjectErMap({});
        setCurrentFilePath(null);
        setIsDirty(true);
        setHasActiveProject(true);
        extractDataObjectsAfterLoad(); // Extract data objects from loaded BPMN
        linkActorsToSwimlanesByName(); // Sync actors with BPMN Pools
      }
    } catch (err) {
      console.error('Failed to parse file:', err);
      alert('Failed to open file. Please ensure it is a valid project, idmXML, or BPMN file.');
    }
  }, [extractDataObjectsAfterLoad, linkActorsToSwimlanesByName]);

  // Open project
  const handleOpenProject = useCallback(async () => {
    if (window.electronAPI) {
      await window.electronAPI.openProject();
    } else {
      // Browser mode: show file picker modal with individual format options
      setShowFilePickerModal(true);
    }
  }, []);

  // Handle file selection from FilePickerModal
  const handleFileFromPicker = useCallback((file, format) => {
    processFileFromPicker(file);
  }, [processFileFromPicker]);

  // New project - Show dialog to choose blank or sample project
  const handleNewProject = useCallback(() => {
    // Check if there are unsaved changes
    if (isDirty && hasActiveProject) {
      const confirmNew = window.confirm(
        'You have unsaved changes. Are you sure you want to create a new project?'
      );
      if (!confirmNew) return;
    }

    // Show new project dialog
    setShowNewProjectDialog(true);
  }, [isDirty, hasActiveProject]);

  // Create new project based on user selection
  const createNewProject = useCallback(async (projectType) => {
    setShowNewProjectDialog(false);

    // Reset to initial state
    setBpmnDataObjects([]);
    setSelectedDataObject(null);
    setShowERPanel(false);
    setActivePane('specification'); // Open IDM Header pane for new project
    setCurrentFilePath(null);
    setIsDirty(false);
    setValidationResults(null);
    setHasActiveProject(true);

    if (projectType === 'sample') {
      // Load GDE-IDM sample project from file
      try {
        isLoadingProjectRef.current = true;
        const response = await fetch('/samples/GDE-IDM.idm');
        if (!response.ok) {
          throw new Error(`Failed to fetch sample: ${response.status}`);
        }
        const content = await response.text();
        const projectData = JSON.parse(content);

        if (projectData.bpmnXml) {
          setBpmnXml(projectData.bpmnXml);
        }
        if (projectData.headerData) {
          setHeaderData(projectData.headerData);
        }
        // Handle ER-first format (v2.0+) or migrate from legacy erDataMap
        // Consolidate to single top-level ER if needed (Rule 2 enforcement)
        if (projectData.erHierarchy && projectData.erHierarchy.length > 0) {
          setErHierarchy(autoConsolidateErHierarchy(projectData.erHierarchy));
          setDataObjectErMap(projectData.dataObjectErMap || {});
          if (projectData.erDataMap) {
            setErDataMap(projectData.erDataMap);
          }
        } else if (projectData.erDataMap) {
          setErDataMap(projectData.erDataMap);
          const migrated = migrateErDataMap(projectData.erDataMap);
          setErHierarchy(autoConsolidateErHierarchy(migrated.erHierarchy));
          setDataObjectErMap(migrated.dataObjectErMap);
        }
        if (projectData.erLibrary) {
          setErLibrary(projectData.erLibrary);
        }
        setTimeout(() => { isLoadingProjectRef.current = false; }, 500);
      } catch (err) {
        console.error('Failed to load sample project:', err);
        // Fallback to embedded sample data (v2.0 format)
        setHeaderData({ ...SAMPLE_HEADER_DATA });
        setErDataMap({ ...SAMPLE_ER_DATA_MAP });
        setErHierarchy(autoConsolidateErHierarchy(SAMPLE_ER_HIERARCHY));
        setDataObjectErMap({ ...SAMPLE_DATA_OBJECT_ER_MAP });
        setErLibrary([...SAMPLE_ER_LIBRARY]);
        setBpmnXml(SAMPLE_BPMN_XML);
        isLoadingProjectRef.current = false;
      }
    } else {
      // Blank project
      setHeaderData({
        title: '',
        authors: [],
        organization: '',
        version: '1.0',
        creationDate: new Date().toISOString().split('T')[0],
        status: 'NP',
        language: 'EN',
        region: 'international',
        projectStages: [],
        useCategories: [],
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
        complianceCriteria: ''
      });
      setErDataMap({});
      setErHierarchy([]);
      setDataObjectErMap({});
      setErLibrary([]);
      setBpmnXml('BLANK'); // Signal for empty canvas with just a start event
    }
    extractDataObjectsAfterLoad(); // Extract data objects from loaded BPMN
    linkActorsToSwimlanesByName(); // Sync actors with BPMN Pools
  }, [extractDataObjectsAfterLoad, linkActorsToSwimlanesByName]);

  // Reset project state (called by close confirmation dialog)
  const resetProjectState = useCallback(() => {
    setBpmnXml('EMPTY'); // Signal to show empty canvas
    setBpmnDataObjects([]);
    setHeaderData({
      title: '',
      authors: [],
      organization: '',
      version: '1.0',
      creationDate: new Date().toISOString().split('T')[0],
      status: 'NP',
      language: 'EN',
      region: 'international',
      projectStages: [],
      useCategories: [],
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
      complianceCriteria: ''
    });
    setErDataMap({});
    setErHierarchy([]);
    setDataObjectErMap({});
    setSelectedDataObject(null);
    setShowERPanel(false);
    setActivePane(null);
    setCurrentFilePath(null);
    setIsDirty(false);
    setValidationResults(null);
    setErLibrary([]);
    setHasActiveProject(false); // Mark project as closed
  }, []);

  // Close project - Show confirmation if dirty
  const handleCloseProject = useCallback(() => {
    if (isDirty) {
      // Show Yes/No/Cancel dialog
      setShowCloseConfirmDialog(true);
    } else {
      // No unsaved changes, close directly
      resetProjectState();
    }
  }, [isDirty, resetProjectState]);

  // Handle close confirmation dialog response
  const handleCloseConfirmResponse = useCallback(async (response) => {
    setShowCloseConfirmDialog(false);

    if (response === 'cancel') {
      // User cancelled, do nothing
      return;
    }

    if (response === 'save') {
      // Save first, then close
      try {
        // Get current BPMN XML
        let currentBpmnXml = bpmnXml;
        if (modelerRef.current) {
          try {
            const { xml } = await modelerRef.current.saveXML({ format: true });
            currentBpmnXml = xml;
          } catch (e) {
            console.error('Failed to get current BPMN XML:', e);
          }
        }

        // Generate idmXML
        const dataObjects = Object.keys(erDataMap).map(id => ({ id, name: id }));
        const result = generateIdmXml({
          headerData,
          bpmnXml: currentBpmnXml,
          erDataMap,
          erHierarchy,
          dataObjects
        });

        // Download the file - use shortTitle as default filename
        const blob = new Blob([result.xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = (headerData.shortTitle || headerData.title)
          ? `${(headerData.shortTitle || headerData.title).replace(/[/\\?%*:|"<>]/g, '_').trim()}.xml`
          : 'idm_specification.xml';
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Now close
        resetProjectState();
      } catch (error) {
        console.error('Failed to save before closing:', error);
        alert('Failed to save. Project not closed.');
      }
    } else if (response === 'discard') {
      // Discard changes and close
      resetProjectState();
    }
  }, [bpmnXml, erDataMap, headerData, resetProjectState]);

  // Open User Manual / Help
  const handleHelp = useCallback(() => {
    // Open the user manual in a new browser tab/window
    // In Electron, this will use the shell.openExternal
    // In browser, this will open the markdown file or a hosted version
    const manualUrl = 'https://htmlpreview.github.io/?https://github.com/ghanglee/IDMxPPM/blob/main/user_manuals/V1.2.0/IDMxPPM-Tutorials.html';

    if (window.electronAPI && window.electronAPI.openExternal) {
      window.electronAPI.openExternal(manualUrl);
    } else {
      // Browser fallback - open in new tab
      window.open(manualUrl, '_blank', 'noopener,noreferrer');
    }
  }, []);

  // Run Validation
  const handleValidate = useCallback(async () => {
    // Get current BPMN XML from modeler (most up-to-date)
    let currentBpmnXml = bpmnXml;
    if (modelerRef.current) {
      try {
        const { xml } = await modelerRef.current.saveXML({ format: true });
        currentBpmnXml = xml;
      } catch (err) {
        console.error('Failed to get current BPMN XML:', err);
      }
    }

    const results = validateProject({
      headerData,
      bpmnXml: currentBpmnXml,
      erDataMap
    });
    setValidationResults(results);
    setShowValidationPanel(true);
  }, [headerData, bpmnXml, erDataMap]);

  // Export idmXML / Save & Export
  const handleSaveExport = useCallback(async () => {
    // Get current BPMN XML from modeler (most up-to-date)
    let currentBpmnXml = bpmnXml;
    if (modelerRef.current) {
      try {
        const { xml } = await modelerRef.current.saveXML({ format: true });
        currentBpmnXml = xml;
      } catch (err) {
        console.error('Failed to get current BPMN XML:', err);
      }
    }

    // Run validation but don't block - allow saving incomplete specifications
    const results = validateProject({
      headerData,
      bpmnXml: currentBpmnXml,
      erDataMap
    });
    setValidationResults(results);

    // Set default filename from shortTitle, fallback to title, then default
    const defaultName = (headerData.shortTitle || headerData.title || 'idm-specification')
      .replace(/[^a-zA-Z0-9가-힣\s.-]/g, '') // Allow Korean characters, spaces, dots, hyphens
      .trim();
    setExportFilename(defaultName);
    setExportSavePath(''); // Clear any previously selected save path

    // Show export dialog regardless of validation result
    // Users may want to save incomplete work to continue later
    setShowExportDialog(true);
  }, [headerData, bpmnXml, erDataMap]);

  // Browse for save location (Electron only)
  const handleBrowseSaveLocation = useCallback(async () => {
    if (!window.electronAPI?.showSaveLocation) return;

    const extensions = {
      'idm': '.idm',
      'idmxml-v2': '.xml',
      'idmxml-v1': '.xml',
      'html': '.html',
      'zip': '.zip',
      'bpmn': '.bpmn'
    };

    const defaultName = (exportFilename || 'idm-specification') + (extensions[exportFormat] || '');

    const result = await window.electronAPI.showSaveLocation({
      defaultName,
      format: exportFormat
    });

    if (result.success && result.filePath) {
      setExportSavePath(result.filePath);
      // Extract just the filename (without extension) from the path
      const pathParts = result.filePath.split(/[/\\]/);
      const fullName = pathParts[pathParts.length - 1];
      const nameWithoutExt = fullName.replace(/\.[^.]+$/, '');
      setExportFilename(nameWithoutExt);
    }
  }, [exportFilename, exportFormat]);

  // Save the current project to the server
  const handleSaveToServer = useCallback(async () => {
    let currentBpmnXml = bpmnXml;
    if (modelerRef.current) {
      try {
        const { xml } = await modelerRef.current.saveXML({ format: true });
        currentBpmnXml = xml;
      } catch (err) {
        console.error('Failed to get BPMN XML:', err);
      }
    }

    const projectData = {
      version: '2.0.0',
      appName: 'IDMxPPM - Neo Seoul',
      bpmnXml: currentBpmnXml,
      headerData,
      erHierarchy,
      dataObjectErMap,
      erDataMap,
      erLibrary,
      savedAt: new Date().toISOString()
    };

    try {
      if (serverSpecId) {
        await api.updateSpec(serverSpecId, projectData);
      } else {
        const result = await api.createSpec(projectData);
        if (result.spec?._id) {
          setServerSpecId(result.spec._id);
        }
      }
      setIsDirty(false);
      alert('Saved to server successfully.');
    } catch (err) {
      alert(`Failed to save to server: ${err.message}`);
    }
  }, [bpmnXml, headerData, erHierarchy, dataObjectErMap, erDataMap, erLibrary, serverSpecId]);

  // Execute export based on selected format
  const executeExport = useCallback(async () => {
    let currentBpmnXml = bpmnXml;
    if (modelerRef.current) {
      try {
        const { xml } = await modelerRef.current.saveXML({ format: true });
        currentBpmnXml = xml;
      } catch (err) {
        console.error('Failed to get current BPMN XML:', err);
      }
    }

    const dataObjects = Object.keys(erDataMap).map(id => ({ id, name: id }));
    // Use user-provided filename, sanitize for filesystem
    const fileName = (exportFilename || 'idm-specification')
      .replace(/[/\\?%*:|"<>]/g, '_') // Remove filesystem-invalid characters only
      .trim();

    // Save file - uses Electron's save API if a path is set, otherwise downloads in browser
    const saveFile = async (content, filename, mimeType) => {
      // If a save path was selected via browse, save directly to that path
      if (exportSavePath && window.electronAPI?.saveToPath) {
        const result = await window.electronAPI.saveToPath({
          content,
          filePath: exportSavePath,
          isBinary: false
        });
        if (result.success) {
          setShowExportDialog(false);
          return;
        }
      }

      // Otherwise download in browser
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    try {
      switch (exportFormat) {
        case 'idmxml-v2':
        case 'idmxml-v1': {
          // ISO 29481-3 compliant idmXML
          const idmXsdVersion = exportFormat === 'idmxml-v1' ? '1.0' : '2.0';

          // Build erDataMap from ER-first architecture (erHierarchy + dataObjectErMap)
          // This maps data object IDs to their associated ER data
          const exportErDataMap = {};
          Object.entries(dataObjectErMap).forEach(([dataObjectId, erId]) => {
            // Find the ER in the hierarchy
            const findEr = (items) => {
              for (const item of items) {
                if (item.id === erId || item.guid === erId) return item;
                if (item.subERs && item.subERs.length > 0) {
                  const found = findEr(item.subERs);
                  if (found) return found;
                }
              }
              return null;
            };
            const er = findEr(erHierarchy);
            if (er) {
              exportErDataMap[dataObjectId] = er;
            }
          });

          // Also include any legacy erDataMap entries not in ER-first
          Object.entries(erDataMap).forEach(([dataObjectId, er]) => {
            if (!exportErDataMap[dataObjectId]) {
              exportErDataMap[dataObjectId] = er;
            }
          });

          const result = generateIdmXml({
            headerData,
            bpmnXml: exportOptions.includeBpmn ? currentBpmnXml : null,
            erDataMap: exportErDataMap,
            erHierarchy,
            dataObjects,
            idmXsdVersion
          });

          // Persist GUIDs if this is the first generation
          if (!headerData.idmGuid && result.guids) {
            setHeaderData(prev => ({ ...prev, ...result.guids }));
          }

          await saveFile(result.xml, `${fileName}.xml`, 'application/xml');
          break;
        }

        case 'idm': {
          // Compressed JSON project file (.idm)
          const projectData = {
            version: '2.0.0',
            format: 'idm-binary',
            appName: 'IDMxPPM - Neo Seoul',
            bpmnXml: currentBpmnXml,
            headerData,
            erHierarchy,          // ER-first: ordered hierarchical array of ERs
            dataObjectErMap,      // ER-first: maps data object IDs to ER IDs
            erDataMap,            // Legacy: kept for backward compatibility
            erLibrary,
            exportedAt: new Date().toISOString()
          };
          const jsonContent = JSON.stringify(projectData);
          // Use compression if available, otherwise plain JSON
          await saveFile(jsonContent, `${fileName}.idm`, 'application/json');
          break;
        }

        case 'zip': {
          // ZIP archive with multiple files including images
          // Uses JSZip for proper ZIP bundle export

          // Build erDataMap from ER-first architecture for bundle export
          const bundleErDataMap = {};
          Object.entries(dataObjectErMap).forEach(([dataObjectId, erId]) => {
            const findEr = (items) => {
              for (const item of items) {
                if (item.id === erId || item.guid === erId) return item;
                if (item.subERs && item.subERs.length > 0) {
                  const found = findEr(item.subERs);
                  if (found) return found;
                }
              }
              return null;
            };
            const er = findEr(erHierarchy);
            if (er) bundleErDataMap[dataObjectId] = er;
          });
          // Include legacy erDataMap entries
          Object.entries(erDataMap).forEach(([dataObjectId, er]) => {
            if (!bundleErDataMap[dataObjectId]) bundleErDataMap[dataObjectId] = er;
          });

          await downloadIdmBundle({
            headerData,
            bpmnXml: currentBpmnXml,
            erDataMap: bundleErDataMap,
            erHierarchy,
            dataObjects,
            erLibrary
          }, `${fileName}.zip`);
          break;
        }

        case 'bpmn': {
          // BPMN file only
          await saveFile(currentBpmnXml, `${fileName}.bpmn`, 'application/xml');
          break;
        }

        case 'html': {
          // HTML export with embedded images and BPMN diagram

          // Get BPMN as SVG if modeler is available
          let bpmnSvg = null;
          if (modelerRef.current) {
            try {
              const { svg } = await modelerRef.current.saveSVG();
              bpmnSvg = svg;
            } catch (err) {
              console.error('Failed to export BPMN as SVG:', err);
              // Continue without BPMN diagram
            }
          }

          // Read custom XSLT if provided
          let customXsltContent = null;
          if (customXslt) {
            try {
              customXsltContent = await readFileAsText(customXslt);
            } catch (err) {
              console.error('Failed to read custom XSLT:', err);
            }
          }

          // Build erDataMap from ER-first architecture for HTML export
          const htmlErDataMap = {};
          Object.entries(dataObjectErMap).forEach(([dataObjectId, erId]) => {
            const findEr = (items) => {
              for (const item of items) {
                if (item.id === erId || item.guid === erId) return item;
                if (item.subERs && item.subERs.length > 0) {
                  const found = findEr(item.subERs);
                  if (found) return found;
                }
              }
              return null;
            };
            const er = findEr(erHierarchy);
            if (er) htmlErDataMap[dataObjectId] = er;
          });
          // Include legacy erDataMap entries
          Object.entries(erDataMap).forEach(([dataObjectId, er]) => {
            if (!htmlErDataMap[dataObjectId]) htmlErDataMap[dataObjectId] = er;
          });

          // Generate standalone HTML
          const htmlContent = generateStandaloneHtml({
            headerData,
            erDataMap: htmlErDataMap,
            bpmnSvg,
            customXsltContent
          });

          await saveFile(htmlContent, `${fileName}.html`, 'text/html');
          break;
        }

        case 'server': {
          await handleSaveToServer();
          break;
        }

        default:
          console.warn('Unknown export format:', exportFormat);
      }

      setShowExportDialog(false);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + err.message);
    }
  }, [bpmnXml, headerData, erDataMap, erLibrary, exportFormat, exportFilename, exportSavePath, exportOptions, customXslt, handleSaveToServer]);

  // Save project
  const saveProject = async (saveAs = false) => {
    if (!window.electronAPI) return;

    let currentBpmnXml = bpmnXml;
    if (modelerRef.current) {
      try {
        const { xml } = await modelerRef.current.saveXML({ format: true });
        currentBpmnXml = xml;
      } catch (err) {
        console.error('Failed to get BPMN XML:', err);
      }
    }

    const projectData = {
      version: '2.0.0',
      appName: 'IDMxPPM - Neo Seoul',
      bpmnXml: currentBpmnXml,
      headerData,
      erHierarchy,          // ER-first: ordered hierarchical array of ERs
      dataObjectErMap,      // ER-first: maps data object IDs to ER IDs
      erDataMap,            // Legacy: kept for backward compatibility
      erLibrary,
      savedAt: new Date().toISOString()
    };

    const content = JSON.stringify(projectData, null, 2);

    // Use shortTitle as default filename, fallback to title
    const defaultFileName = (headerData.shortTitle || headerData.title || 'idm-project')
      .replace(/[/\\?%*:|"<>]/g, '_')
      .trim() + '.json';

    if (currentFilePath && !saveAs) {
      const result = await window.electronAPI.saveFile({ content, filePath: currentFilePath });
      if (result.success) {
        setIsDirty(false);
      }
    } else {
      const result = await window.electronAPI.saveProject({
        content,
        defaultName: defaultFileName
      });
      if (result.success) {
        setCurrentFilePath(result.filePath);
        setIsDirty(false);
      }
    }
  };

  // --- Server Integration Handlers ---

  // Open a specification from the server
  const handleOpenFromServer = useCallback(async (specId, projectData) => {
    try {
      isLoadingProjectRef.current = true;

      // Determine ER hierarchy
      let erHierarchyToImport = [];
      let dataObjectErMapToImport = {};
      let erDataMapToImport = null;

      if (projectData.erHierarchy && projectData.erHierarchy.length > 0) {
        erHierarchyToImport = projectData.erHierarchy;
        dataObjectErMapToImport = projectData.dataObjectErMap || {};
        erDataMapToImport = projectData.erDataMap || null;
      } else if (projectData.erDataMap) {
        const migrated = migrateErDataMap(projectData.erDataMap);
        erHierarchyToImport = migrated.erHierarchy;
        dataObjectErMapToImport = migrated.dataObjectErMap;
        erDataMapToImport = projectData.erDataMap;
      }

      if (projectData.bpmnXml) setBpmnXml(projectData.bpmnXml);
      if (projectData.headerData) setHeaderData(projectData.headerData);
      setErHierarchy(autoConsolidateErHierarchy(erHierarchyToImport));
      setDataObjectErMap(dataObjectErMapToImport);
      if (erDataMapToImport) setErDataMap(erDataMapToImport);
      if (projectData.erLibrary) setErLibrary(projectData.erLibrary);
      setCurrentFilePath(null);
      setServerSpecId(specId);
      setIsDirty(false);
      setValidationResults(null);
      setHasActiveProject(true);
      setActivePane('specification');
      extractDataObjectsAfterLoad();

      setTimeout(() => { isLoadingProjectRef.current = false; }, 300);
    } catch (err) {
      console.error('Failed to load spec from server:', err);
      isLoadingProjectRef.current = false;
    }
  }, [autoConsolidateErHierarchy, migrateErDataMap, extractDataObjectsAfterLoad]);

  // Global Enter key handler for single-line text inputs
  // Pressing Enter in a single-line input blurs it (confirms the value).
  // Does not apply to textareas (multiline).
  useEffect(() => {
    const handleEnterKey = (e) => {
      if (e.key !== 'Enter') return;
      const el = e.target;
      if (el.tagName !== 'INPUT') return;
      const type = (el.type || 'text').toLowerCase();
      if (type !== 'text' && type !== 'search' && type !== 'url' && type !== 'email') return;
      // Don't interfere if the input already has a specific onKeyDown that called preventDefault
      if (e.defaultPrevented) return;
      el.blur();
    };
    document.addEventListener('keydown', handleEnterKey);
    return () => document.removeEventListener('keydown', handleEnterKey);
  }, []);

  // Electron IPC event handlers
  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onFileOpened((data) => {
      if (data.type === 'project') {
        try {
          // Set loading flag to prevent marking dirty during load
          isLoadingProjectRef.current = true;

          const projectData = JSON.parse(data.content);

          // Determine ER hierarchy (new format or migrated from legacy)
          let erHierarchyToImport = [];
          let dataObjectErMapToImport = {};
          let erDataMapToImport = null;

          if (projectData.erHierarchy && projectData.erHierarchy.length > 0) {
            erHierarchyToImport = projectData.erHierarchy;
            dataObjectErMapToImport = projectData.dataObjectErMap || {};
            erDataMapToImport = projectData.erDataMap || null;
          } else if (projectData.erDataMap) {
            const migrated = migrateErDataMap(projectData.erDataMap);
            erHierarchyToImport = migrated.erHierarchy;
            dataObjectErMapToImport = migrated.dataObjectErMap;
            erDataMapToImport = projectData.erDataMap;
          }

          // Check if we need to show root selection modal
          if (handleErHierarchyImport(erHierarchyToImport, {
            bpmnXml: projectData.bpmnXml,
            headerData: projectData.headerData,
            dataObjectErMap: dataObjectErMapToImport,
            erDataMap: erDataMapToImport,
            erLibrary: projectData.erLibrary,
            filePath: data.filePath,
            isDirtyAfterImport: false,
            source: 'electronProject'
          })) {
            // Modal shown, import will be completed by modal handler
            return;
          }

          // No modal needed - proceed with direct import
          if (projectData.bpmnXml) setBpmnXml(projectData.bpmnXml);
          if (projectData.headerData) setHeaderData(projectData.headerData);
          setErHierarchy(erHierarchyToImport);
          setDataObjectErMap(dataObjectErMapToImport);
          if (erDataMapToImport) setErDataMap(erDataMapToImport);
          if (projectData.erLibrary) setErLibrary(projectData.erLibrary);
          setCurrentFilePath(data.filePath);
          setIsDirty(false);
          setValidationResults(null);
          setHasActiveProject(true);
          extractDataObjectsAfterLoad();
          linkActorsToSwimlanesByName();

          // Clear loading flag after a delay
          setTimeout(() => {
            isLoadingProjectRef.current = false;
          }, 300);
        } catch (err) {
          console.error('Failed to parse project file:', err);
          isLoadingProjectRef.current = false;
        }
      } else if (data.type === 'idmxml') {
        // Parse idmXML file
        try {
          // Set loading flag to prevent marking dirty during load
          isLoadingProjectRef.current = true;

          // Detect idmXML schema version (v1.0 vs v2.0)
          const versionInfo = detectIdmXmlVersion(data.content);
          console.log(`idmXML version detected: ${versionInfo.version} (${versionInfo.confidence} confidence)`);
          console.log('Version indicators:', versionInfo.indicators);

          const idmData = parseIdmXml(data.content);
          // Store detected version in header data for reference
          idmData.headerData = idmData.headerData || {};
          idmData.headerData.idmXsdVersion = versionInfo.version;
          idmData.headerData.idmXsdVersionConfidence = versionInfo.confidence;

          // Build dataObjectErMap from dataObjectErLinks
          const newDataObjectErMap = {};
          if (idmData.dataObjectErLinks) {
            Object.entries(idmData.dataObjectErLinks).forEach(([doId, erId]) => {
              newDataObjectErMap[doId] = erId;
            });
          }

          // Determine BPMN and dirty state
          const hasBpmn = !!idmData.bpmnXml;
          const bpmnToImport = hasBpmn ? idmData.bpmnXml : 'EMPTY';
          const isDirtyAfterImport = !hasBpmn;

          // Check if we need to show root selection modal
          if (idmData.erHierarchy && handleErHierarchyImport(idmData.erHierarchy, {
            bpmnXml: bpmnToImport,
            headerData: idmData.headerData,
            dataObjectErMap: newDataObjectErMap,
            erDataMap: idmData.erDataMap,
            erLibrary: null,
            filePath: data.filePath,
            isDirtyAfterImport,
            source: 'electronIdmXml'
          })) {
            // Modal shown, import will be completed by modal handler
            if (!hasBpmn) {
              alert('idmXML imported. Note: No embedded BPMN diagram found. The process map canvas will be blank.');
            }
            return;
          }

          // No modal needed - proceed with direct import
          if (idmData.headerData) setHeaderData(idmData.headerData);
          if (idmData.erHierarchy) setErHierarchy(idmData.erHierarchy);
          setDataObjectErMap(newDataObjectErMap);
          if (idmData.erDataMap) setErDataMap(idmData.erDataMap);
          setBpmnXml(bpmnToImport);
          if (!hasBpmn) {
            alert('idmXML imported successfully. Note: No embedded BPMN diagram found. The process map canvas is blank and needs to be created manually.');
          }
          setCurrentFilePath(data.filePath);
          setIsDirty(isDirtyAfterImport);
          setValidationResults(null);
          setHasActiveProject(true);
          setActivePane('specification');
          extractDataObjectsAfterLoad();
          linkActorsToSwimlanesByName();

          // Clear loading flag after a delay
          setTimeout(() => {
            isLoadingProjectRef.current = false;
          }, 300);
        } catch (err) {
          console.error('Failed to parse idmXML file:', err);
          alert('Failed to parse idmXML file: ' + err.message);
          isLoadingProjectRef.current = false;
        }
      } else if (data.type === 'bpmn') {
        setBpmnXml(data.content);
        // Clear data object-to-ER mappings since old BPMN data object IDs are no longer valid
        // But KEEP the ER hierarchy intact - ERs are the source of truth in ER-first architecture
        setDataObjectErMap({});
        setCurrentFilePath(null);
        setIsDirty(true);
        setHasActiveProject(true);
        extractDataObjectsAfterLoad(); // Extract data objects from loaded BPMN
        linkActorsToSwimlanesByName(); // Sync actors with BPMN Pools
      } else if (data.type === 'zip') {
        // Handle ZIP bundle - note: Electron sends file content as string, need binary handling
        alert('ZIP import via Electron menu is not yet supported. Please use the browser file picker via Open Project button.');
      }
    });

    window.electronAPI.onERImported((data) => {
      try {
        const importedER = JSON.parse(data.content);
        handleImportER(importedER);
      } catch (err) {
        console.error('Failed to parse ER file:', err);
      }
    });

    window.electronAPI.onMenuNew(() => {
      setBpmnXml('DEFAULT'); // Signal to load DEFAULT_DIAGRAM
      setBpmnDataObjects([]); // Clear data objects
      setHeaderData({
        title: '',
        authors: [],
        organization: '',
        version: '1.0',
        creationDate: new Date().toISOString().split('T')[0],
        status: 'NP',
        language: 'EN',
        region: 'international',
        projectStages: [],
        useCategories: [],
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
        complianceCriteria: ''
      });
      setErDataMap({});
      setErHierarchy([]);
      setDataObjectErMap({});
      setErLibrary([]); // Clear library
      setSelectedDataObject(null);
      setShowERPanel(false);
      setActivePane('specification');
      setCurrentFilePath(null);
      setIsDirty(false); // New blank project starts clean
      setValidationResults(null);
      setHasActiveProject(true); // Mark project as active
      extractDataObjectsAfterLoad(); // Extract data objects from loaded BPMN
      linkActorsToSwimlanesByName(); // Sync actors with BPMN Pools
    });

    window.electronAPI.onMenuSave(() => saveProject(false));
    window.electronAPI.onMenuSaveAs(() => saveProject(true));
    window.electronAPI.onMenuServerConnect(() => setShowServerModal(true));

    return () => {
      window.electronAPI.removeAllListeners('file-opened');
      window.electronAPI.removeAllListeners('er-imported');
      window.electronAPI.removeAllListeners('menu-new');
      window.electronAPI.removeAllListeners('menu-save');
      window.electronAPI.removeAllListeners('menu-save-as');
      window.electronAPI.removeAllListeners('menu-server-connect');
    };
  }, [isDirty, handleImportER, extractDataObjectsAfterLoad, linkActorsToSwimlanesByName]);

  const erCount = Object.keys(erDataMap).length;

  return (
    <ThemeProvider>
      <div className="app">
        {/* Spec Name Bar (Top) */}
        <SpecNameBar specName={isProjectOpen ? (headerData.title || 'Untitled Project') : 'Welcome'} />

        {/* Main area */}
        <div className="app-main">
          {/* Vertical Menu Bar (Left) */}
          <VerticalMenuBar
            isProjectOpen={isProjectOpen}
            activePane={activePane}
            onMenuItemClick={handleMenuItemClick}
            onNewProject={handleNewProject}
            onOpenProject={handleOpenProject}
            onValidate={handleValidate}
            onSaveExport={handleSaveExport}
            onCloseProject={handleCloseProject}
            onHelp={handleHelp}
            onAbout={() => setShowAboutDialog(true)}
            onServerConnect={() => setShowServerModal(true)}
            isServerConnected={serverConnection.isConnected && serverConnection.isAuthenticated}
          />

          {/* Content Area */}
          <div className="app-content">
            {!isProjectOpen ? (
              /* Startup Screen - shown when no project is active */
              <StartupScreen
                onNewBlank={() => createNewProject('blank')}
                onNewSample={() => createNewProject('sample')}
                onOpen={handleOpenProject}
                onOpenFromServer={() => setShowServerBrowser(true)}
                isServerConnected={serverConnection.isConnected && serverConnection.isAuthenticated}
              />
            ) : (
              <>
                {/* Content Pane (Specification/Use Case/Exchange Requirements List) */}
                {activePane && (
                  <ContentPane
                    type={activePane}
                    headerData={headerData}
                    erDataMap={erDataMap}
                    erHierarchy={erHierarchy}
                    dataObjects={bpmnDataObjects}
                    onHeaderChange={handleHeaderChange}
                    onSelectER={handleSelectER}
                    newlyAddedErId={newlyAddedErId}
                    onClearNewlyAddedErId={() => setNewlyAddedErId(null)}
                    // ER hierarchy manipulation handlers
                    selectedErId={selectedErId}
                    onAddER={handleAddNewER}
                    onDeleteER={handleDeleteErFromHierarchy}
                    onMoveUp={handleMoveErUp}
                    onMoveDown={handleMoveErDown}
                    onIndent={handleIndentEr}
                    onOutdent={handleOutdentEr}
                    onClose={() => {
                      setActivePane(null);
                      if (activePane === 'exchangeReq') {
                        setShowERPanel(false);
                        setSelectedDataObject(null);
                      }
                    }}
                  />
                )}

                {/* BPMN Editor (shown when project is open and not hidden) */}
                {showBPMNEditor ? (
                  <div className="bpmn-editor-container">
                    <BPMNEditor
                      xml={bpmnXml}
                      onDataObjectSelect={handleDataObjectSelect}
                      onNewDataObject={handleNewDataObject}
                      onChange={handleBpmnChange}
                      onReady={handleModelerReady}
                      onImportBpmn={(newBpmnXml) => {
                        setBpmnXml(newBpmnXml);
                        // Clear data object-to-ER mappings since old BPMN data object IDs are no longer valid
                        // But KEEP the ER hierarchy intact - ERs are the source of truth in ER-first architecture
                        // A BPMN diagram may not show all ERs in the IDM specification
                        setDataObjectErMap({});
                        setIsDirty(true);
                        // Extract data objects after import - this will trigger the unassociated data objects dialog
                        // Users can then map new data objects to existing ERs or create new ERs
                        setTimeout(() => {
                          extractDataObjectsAfterLoad();
                          linkActorsToSwimlanesByName(); // Sync actors with BPMN Pools
                        }, 500);
                      }}
                      canCollapse={showERPanel && selectedDataObject}
                      onToggleCollapse={() => setShowBPMNEditor(false)}
                    />
                  </div>
                ) : (
                  /* Show BPMN button when editor is hidden */
                  <div className="bpmn-collapsed-placeholder">
                    <button
                      className="bpmn-show-btn"
                      onClick={() => setShowBPMNEditor(true)}
                      title="Show BPMN Editor"
                    >
                      <span className="bpmn-show-icon">▶</span>
                      <span className="bpmn-show-text">BPMN</span>
                    </button>
                  </div>
                )}

                {/* Individual ER Panel (Right side) - Shows when a specific ER is selected */}
                {showERPanel && (selectedDataObject || selectedErId) && (
                  <ERPanel
                    mode="detail"
                    dataObject={selectedDataObject}
                    erData={erDataMap[selectedDataObject?.id] || null}
                    erDataMap={erDataMap}
                    erLibrary={erLibrary}
                    onChange={handleERChange}
                    onSave={handleERSave}
                    onSaveAs={handleERSaveAs}
                    onLoadFromLibrary={handleLoadERFromLibrary}
                    onAddSubER={handleAddSubER}
                    onSelectER={handleSelectER}
                    onModeChange={handleERPanelModeChange}
                    onClose={handleCloseERPanel}
                    showBpmnEditor={showBPMNEditor}
                    onToggleBpmn={() => setShowBPMNEditor(prev => !prev)}
                    // ER-first architecture props
                    erHierarchy={erHierarchy}
                    selectedErId={selectedErId}
                    onUpdateER={handleUpdateErInHierarchy}
                    onAddER={handleAddNewER}
                    onDeleteER={handleDeleteErFromHierarchy}
                    onMoveUp={handleMoveErUp}
                    onMoveDown={handleMoveErDown}
                    onIndent={handleIndentEr}
                    onOutdent={handleOutdentEr}
                    onMoveERAsSubER={handleMoveErAsSubER}
                    newlyAddedErId={newlyAddedErId}
                    onClearNewlyAddedErId={() => setNewlyAddedErId(null)}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Validation Panel */}
        {showValidationPanel && (
          <>
            <div className="validation-overlay" onClick={() => setShowValidationPanel(false)} />
            <ValidationPanel
              results={validationResults}
              onNavigate={handleValidationNavigate}
              onClose={() => setShowValidationPanel(false)}
            />
          </>
        )}

        {/* Close Project Confirmation Dialog */}
        {showCloseConfirmDialog && (
          <>
            <div className="modal-overlay" />
            <div className="close-confirm-dialog">
              <div className="close-confirm-header">
                <h3>Unsaved Changes</h3>
              </div>
              <div className="close-confirm-body">
                <p>Do you want to save changes to your project before closing?</p>
                <p className="close-confirm-hint">Your changes will be lost if you don't save them.</p>
              </div>
              <div className="close-confirm-footer">
                <button
                  className="close-confirm-btn close-confirm-btn-secondary"
                  onClick={() => handleCloseConfirmResponse('cancel')}
                >
                  Cancel
                </button>
                <button
                  className="close-confirm-btn close-confirm-btn-danger"
                  onClick={() => handleCloseConfirmResponse('discard')}
                >
                  Don't Save
                </button>
                <button
                  className="close-confirm-btn close-confirm-btn-primary"
                  onClick={() => handleCloseConfirmResponse('save')}
                >
                  Save
                </button>
              </div>
            </div>
          </>
        )}

        {/* New Project Dialog */}
        {showNewProjectDialog && (
          <>
            <div className="modal-overlay" onClick={() => setShowNewProjectDialog(false)} />
            <div className="new-project-dialog">
              <div className="new-project-header">
                <h3>New Project</h3>
              </div>
              <div className="new-project-body">
                <p>How would you like to start your new IDM specification?</p>
                <div className="new-project-options">
                  <button
                    className="new-project-option"
                    onClick={() => createNewProject('blank')}
                  >
                    <div className="new-project-option-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="4" y="2" width="16" height="20" rx="2" />
                        <line x1="8" y1="6" x2="16" y2="6" />
                      </svg>
                    </div>
                    <div className="new-project-option-text">
                      <span className="new-project-option-title">Blank Project</span>
                      <span className="new-project-option-desc">Start with an empty canvas</span>
                    </div>
                  </button>
                  <button
                    className="new-project-option"
                    onClick={() => createNewProject('sample')}
                  >
                    <div className="new-project-option-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="4" y="2" width="16" height="20" rx="2" />
                        <line x1="8" y1="6" x2="16" y2="6" />
                        <line x1="8" y1="10" x2="16" y2="10" />
                        <line x1="8" y1="14" x2="14" y2="14" />
                        <rect x="8" y="16" width="4" height="3" rx="0.5" />
                      </svg>
                    </div>
                    <div className="new-project-option-text">
                      <span className="new-project-option-title">Sample Project</span>
                      <span className="new-project-option-desc">Start with a sample IDM specification</span>
                    </div>
                  </button>
                </div>
              </div>
              <div className="new-project-footer">
                <button
                  className="close-confirm-btn close-confirm-btn-secondary"
                  onClick={() => setShowNewProjectDialog(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}

        {/* Save & Export Dialog */}
        {showExportDialog && (
          <>
            <div className="modal-overlay" onClick={() => setShowExportDialog(false)} />
            <div className="export-dialog">
              <div className="export-dialog-header">
                <h3>Save & Export</h3>
              </div>
              <div className="export-dialog-body">
                {/* Filename input with browse button */}
                <div className="export-filename-section">
                  <label className="export-filename-label" htmlFor="export-filename">
                    File name:
                  </label>
                  <div className="export-filename-row">
                    <div className="export-filename-input-wrapper">
                      <input
                        type="text"
                        id="export-filename"
                        className="export-filename-input"
                        value={exportFilename}
                        onChange={(e) => {
                          setExportFilename(e.target.value);
                          setExportSavePath(''); // Clear path when manually editing filename
                        }}
                        placeholder="Enter file name"
                      />
                      <span className="export-filename-ext">
                        {exportFormat === 'idm' ? '.idm' :
                         exportFormat === 'idmxml-v2' ? '.xml' :
                         exportFormat === 'idmxml-v1' ? '.xml' :
                         exportFormat === 'html' ? '.html' :
                         exportFormat === 'zip' ? '.zip' :
                         exportFormat === 'bpmn' ? '.bpmn' : ''}
                      </span>
                    </div>
                    {window.electronAPI?.showSaveLocation && (
                      <button
                        type="button"
                        className="export-browse-btn"
                        onClick={handleBrowseSaveLocation}
                        title="Browse for save location"
                      >
                        Browse...
                      </button>
                    )}
                  </div>
                  {exportSavePath && (
                    <div className="export-save-path">
                      <span className="export-save-path-label">Save to:</span>
                      <span className="export-save-path-value" title={exportSavePath}>
                        {exportSavePath}
                      </span>
                    </div>
                  )}
                </div>

                <p className="export-dialog-subtitle">Choose an export format:</p>
                <div className="export-format-options">
                  <label className={`export-format-option ${exportFormat === 'idm' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="exportFormat"
                      value="idm"
                      checked={exportFormat === 'idm'}
                      onChange={(e) => setExportFormat(e.target.value)}
                    />
                    <div className="export-format-content">
                      <span className="export-format-title">IDM Project (.idm)</span>
                      <span className="export-format-desc">Full project file with all data and library</span>
                    </div>
                  </label>
                  <label className={`export-format-option ${exportFormat === 'idmxml-v2' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="exportFormat"
                      value="idmxml-v2"
                      checked={exportFormat === 'idmxml-v2'}
                      onChange={(e) => setExportFormat(e.target.value)}
                    />
                    <div className="export-format-content">
                      <span className="export-format-title">idmXML v2.0 (.xml)</span>
                      <span className="export-format-desc">ISO 29481-3 compliant XML (idmXSD 2.0 - Latest)</span>
                    </div>
                  </label>
                  <label className={`export-format-option ${exportFormat === 'idmxml-v1' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="exportFormat"
                      value="idmxml-v1"
                      checked={exportFormat === 'idmxml-v1'}
                      onChange={(e) => setExportFormat(e.target.value)}
                    />
                    <div className="export-format-content">
                      <span className="export-format-title">idmXML v1.0 (.xml)</span>
                      <span className="export-format-desc">ISO 29481-3 compliant XML (idmXSD 1.0 - Legacy)</span>
                    </div>
                  </label>
                  <label className={`export-format-option ${exportFormat === 'html' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="exportFormat"
                      value="html"
                      checked={exportFormat === 'html'}
                      onChange={(e) => setExportFormat(e.target.value)}
                    />
                    <div className="export-format-content">
                      <span className="export-format-title">HTML Document (.html)</span>
                      <span className="export-format-desc">Self-contained HTML with embedded images and BPMN diagram</span>
                    </div>
                  </label>
                  <label className={`export-format-option ${exportFormat === 'zip' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="exportFormat"
                      value="zip"
                      checked={exportFormat === 'zip'}
                      onChange={(e) => setExportFormat(e.target.value)}
                    />
                    <div className="export-format-content">
                      <span className="export-format-title">ZIP Bundle (.zip)</span>
                      <span className="export-format-desc">idmXML + BPMN + images + project data in one archive</span>
                    </div>
                  </label>
                  <label className={`export-format-option ${exportFormat === 'bpmn' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="exportFormat"
                      value="bpmn"
                      checked={exportFormat === 'bpmn'}
                      onChange={(e) => setExportFormat(e.target.value)}
                    />
                    <div className="export-format-content">
                      <span className="export-format-title">BPMN Only (.bpmn)</span>
                      <span className="export-format-desc">Process map diagram only</span>
                    </div>
                  </label>
                  {serverConnection.isConnected && serverConnection.isAuthenticated && (
                    <label className={`export-format-option export-format-server ${exportFormat === 'server' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="exportFormat"
                        value="server"
                        checked={exportFormat === 'server'}
                        onChange={(e) => setExportFormat(e.target.value)}
                      />
                      <div className="export-format-content">
                        <span className="export-format-title">Save to Server</span>
                        <span className="export-format-desc">{serverSpecId ? 'Update existing specification on server' : 'Create new specification on server'}</span>
                      </div>
                    </label>
                  )}
                </div>

                {exportFormat === 'html' && (
                  <div className="export-html-options">
                    <p className="export-option-label">Stylesheet:</p>
                    <div className="export-xslt-options">
                      <label className="export-xslt-option">
                        <input
                          type="radio"
                          name="xsltSource"
                          value="default"
                          checked={!customXslt}
                          onChange={() => setCustomXslt(null)}
                        />
                        <span>Use default IDM stylesheet</span>
                      </label>
                      <label className="export-xslt-option">
                        <input
                          type="radio"
                          name="xsltSource"
                          value="custom"
                          checked={!!customXslt}
                          onChange={() => document.getElementById('xslt-upload').click()}
                        />
                        <span>{customXslt ? customXslt.name : 'Upload custom XSLT...'}</span>
                      </label>
                      <input
                        type="file"
                        id="xslt-upload"
                        accept=".xsl,.xslt"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCustomXslt(file);
                          }
                        }}
                      />
                    </div>
                    <button
                      className="download-xslt-btn"
                      onClick={() => {
                        const blob = new Blob([defaultIdmXslt], { type: 'application/xslt+xml' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'idm-default-stylesheet.xslt';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      Download default XSLT template
                    </button>
                  </div>
                )}
              </div>
              <div className="export-dialog-footer">
                <button
                  className="close-confirm-btn close-confirm-btn-secondary"
                  onClick={() => setShowExportDialog(false)}
                >
                  Cancel
                </button>
                <button
                  className="close-confirm-btn close-confirm-btn-primary"
                  onClick={executeExport}
                >
                  Export
                </button>
              </div>
            </div>
          </>
        )}

        {/* Status bar */}
        <div className="app-status-bar">
          <div className="status-left">
            {isProjectOpen ? (
              <>
                {currentFilePath ? (
                  <span className="file-path">{currentFilePath}</span>
                ) : (
                  <span className="file-unsaved">Unsaved project</span>
                )}
                {isDirty && <span className="dirty-indicator">*</span>}
              </>
            ) : (
              <span className="file-unsaved">No project open</span>
            )}
          </div>
          <div className="status-center">
            {isProjectOpen && (
              <>
                <span className="er-count">ERs: {erCount}</span>
                <span className="status-divider">|</span>
                <span className="er-library-count">Library: {erLibrary.length}</span>
              </>
            )}
          </div>
          <div className="status-right">
            {serverConnection.isConnected && serverConnection.isAuthenticated && (
              <span
                className="server-status-indicator"
                onClick={() => setShowServerModal(true)}
                title={`Connected as ${serverConnection.user?.name?.givenName || ''} ${serverConnection.user?.name?.familyName || ''}`}
                style={{ cursor: 'pointer', color: '#22c55e', fontSize: '12px', marginRight: '8px' }}
              >
                {serverSpecId ? 'Server (synced)' : 'Server'}
              </span>
            )}
            {isProjectOpen && validationResults && (
              <span className={`validation-status ${validationResults.isValid ? 'valid' : 'invalid'}`}>
                {validationResults.isValid ? 'Valid' : 'Invalid'}
              </span>
            )}
            <button
              className="app-version-btn"
              onClick={() => setShowAboutDialog(true)}
              title="About IDMxPPM"
            >
              IDMxPPM neo-Seoul v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'}
            </button>
          </div>
        </div>

        {/* About Dialog */}
        {showAboutDialog && (
          <>
            <div className="modal-overlay" onClick={() => setShowAboutDialog(false)} />
            <div className="about-dialog">
              <div className="about-dialog-header">
                <h2>IDMxPPM neo-Seoul Edition</h2>
                <button className="about-close-btn" onClick={() => setShowAboutDialog(false)}>×</button>
              </div>
              <div className="about-dialog-body">
                <div className="about-logo">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                  </svg>
                </div>
                <div className="about-info">
                  <p className="about-version">Version {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'}</p>
                  <p className="about-description">
                    Information Delivery Manual (IDM) Authoring Tool<br />
                    Compliant with ISO 29481-1 and ISO 29481-3 (idmXML)
                  </p>
                </div>
                <div className="about-credits">
                  <p><strong>Developer:</strong> Ghang Lee</p>
                  <p><strong>Affiliation:</strong> <a href="http://big.yonsei.ac.kr/" target="_blank" rel="noopener noreferrer">Building Informatics Group, Yonsei University</a></p>
                  <p><strong>Contact:</strong> <a href="mailto:glee@yonsei.ac.kr">glee@yonsei.ac.kr</a></p>
                  <p><strong>GitHub:</strong> <a href="https://github.com/ghanglee/IDMxPPM" target="_blank" rel="noopener noreferrer">github.com/ghanglee/IDMxPPM</a></p>
                  <p><strong>Year:</strong> 2026</p>
                </div>
                <div className="about-license">
                  <h4>License</h4>
                  <p><strong>Dual-Licensed Software</strong></p>
                  <p className="about-license-note">
                    <strong>Open Source:</strong> GNU General Public License v3 (GPL-3.0)<br />
                    <strong>Commercial:</strong> For proprietary use without GPL obligations, a commercial license is required.
                  </p>
                  <p className="about-license-note">
                    For commercial licensing inquiries: <a href="mailto:glee@yonsei.ac.kr">glee@yonsei.ac.kr</a>
                  </p>
                </div>
                <div className="about-acknowledgments">
                  <h4>Acknowledgments</h4>
                  <p>BPMN Editor powered by <a href="https://bpmn.io" target="_blank" rel="noopener noreferrer">bpmn.io</a></p>
                  <p className="about-bpmn-license">
                    Copyright © 2014-present Camunda Services GmbH<br />
                    Licensed under the bpmn.io License
                  </p>
                </div>
              </div>
              <div className="about-dialog-footer">
                <button className="about-ok-btn" onClick={() => setShowAboutDialog(false)}>OK</button>
              </div>
            </div>
          </>
        )}

        {/* File Picker Modal for Browser Mode */}
        <FilePickerModal
          isOpen={showFilePickerModal}
          onClose={() => setShowFilePickerModal(false)}
          onFileSelected={handleFileFromPicker}
        />

        {/* Data Object ER Selection Modal (ER-first workflow) */}
        <DataObjectERSelectModal
          isOpen={showDataObjectERModal}
          dataObject={newDataObjectPending}
          erHierarchy={erHierarchy}
          queueLength={unassociatedDataObjectsQueue.length}
          onSelectExistingER={handleDataObjectERSelected}
          onCreateNewER={handleDataObjectNewER}
          onClose={handleDataObjectERModalClose}
        />

        {/* Root ER Selection Modal (for imports with multiple top-level ERs) */}
        <RootERSelectionModal
          isOpen={showRootERSelectionModal}
          topLevelERs={pendingErHierarchy || []}
          shortTitle={headerData?.shortTitle || ''}
          onSelectRoot={handleRootERSelected}
          onCreateNewRoot={handleCreateNewRootER}
          onCancel={handleRootERSelectionCancel}
        />

        {/* Root Switch Modal (for outdent-to-root scenarios) */}
        <RootSwitchModal
          isOpen={showRootSwitchModal}
          newRootER={pendingOutdentER?.newRoot}
          currentRootER={pendingOutdentER?.currentRoot}
          onDissolveOldRoot={handleRootSwitchDissolveOld}
          onKeepOldRootAsSub={handleRootSwitchKeepOldAsSub}
          onCancel={handleRootSwitchCancel}
        />

        {/* Server Connection Modal */}
        <ServerConnectionModal
          isOpen={showServerModal}
          onClose={() => setShowServerModal(false)}
          serverConnection={serverConnection}
        />

        {/* Server Browser Modal */}
        <ServerBrowser
          isOpen={showServerBrowser}
          onClose={() => setShowServerBrowser(false)}
          onOpenSpec={handleOpenFromServer}
        />

        <style>{`
          .app {
            height: 100vh;
            display: flex;
            flex-direction: column;
            background: var(--bg-primary);
          }

          .app-main {
            flex: 1;
            display: flex;
            overflow: hidden;
          }

          .app-content {
            flex: 1;
            display: flex;
            overflow: hidden;
          }

          .bpmn-editor-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            min-width: 400px;
          }

          .bpmn-collapsed-placeholder {
            width: 36px;
            min-width: 36px;
            background: var(--bg-secondary);
            border-right: 1px solid var(--border-primary);
            display: flex;
            flex-direction: column;
            align-items: center;
            padding-top: 8px;
          }

          .bpmn-show-btn {
            width: 28px;
            height: auto;
            padding: 8px 4px;
            border: 1px solid var(--border-primary);
            border-radius: 4px;
            background: var(--bg-tertiary);
            color: var(--text-secondary);
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            font-size: 9px;
            font-weight: 500;
            transition: all 0.15s ease;
            writing-mode: vertical-rl;
            text-orientation: mixed;
          }

          .bpmn-show-btn:hover {
            background: var(--accent-primary);
            color: white;
            border-color: var(--accent-primary);
          }

          .bpmn-show-icon {
            writing-mode: horizontal-tb;
            font-size: 10px;
          }

          .bpmn-show-text {
            letter-spacing: 1px;
          }

          .app-status-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 10px;
            height: 22px;
            background: #007acc;
            font-size: 12px;
            color: #ffffff;
          }

          .status-left {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .status-center {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
          }

          .status-right {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
          }

          .status-item {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 0 6px;
            height: 22px;
            cursor: default;
          }

          .status-item:hover {
            background: rgba(255, 255, 255, 0.12);
          }

          .file-path {
            max-width: 250px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .file-unsaved {
            font-style: italic;
          }

          .dirty-indicator {
            font-weight: bold;
          }

          .er-count,
          .er-library-count {
            font-size: 12px;
          }

          .status-divider {
            width: 1px;
            height: 14px;
            background: rgba(255, 255, 255, 0.3);
          }

          .validation-status {
            padding: 0 6px;
            font-size: 12px;
          }

          .validation-status.valid {
            color: #ffffff;
          }

          .validation-status.invalid {
            background: rgba(255, 255, 255, 0.2);
            color: #ffffff;
          }

          .app-version {
            font-size: 12px;
          }

          .validation-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
          }

          /* Close Confirmation Dialog */
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
          }

          .close-confirm-dialog {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            max-width: 90vw;
            background: var(--bg-primary);
            border: 1px solid var(--border-primary);
            border-radius: 6px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 1001;
            overflow: hidden;
          }

          .close-confirm-header {
            padding: 16px 20px 12px;
            border-bottom: 1px solid var(--border-primary);
          }

          .close-confirm-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .close-confirm-body {
            padding: 16px 20px;
          }

          .close-confirm-body p {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: var(--text-primary);
            line-height: 1.5;
          }

          .close-confirm-body p:last-child {
            margin-bottom: 0;
          }

          .close-confirm-hint {
            font-size: 13px !important;
            color: var(--text-muted) !important;
          }

          .close-confirm-footer {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 12px 20px 16px;
            border-top: 1px solid var(--border-primary);
          }

          .close-confirm-btn {
            padding: 6px 16px;
            font-size: 13px;
            font-weight: 500;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s ease;
            border: 1px solid transparent;
          }

          .close-confirm-btn-secondary {
            background: var(--bg-tertiary);
            border-color: var(--border-primary);
            color: var(--text-primary);
          }

          .close-confirm-btn-secondary:hover {
            background: var(--bg-hover);
          }

          .close-confirm-btn-danger {
            background: transparent;
            border-color: var(--error);
            color: var(--error);
          }

          .close-confirm-btn-danger:hover {
            background: var(--error);
            color: white;
          }

          .close-confirm-btn-primary {
            background: var(--accent-primary);
            border-color: var(--accent-primary);
            color: white;
          }

          .close-confirm-btn-primary:hover {
            background: var(--accent-hover);
            border-color: var(--accent-hover);
          }

          /* New Project Dialog */
          .new-project-dialog {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 480px;
            max-width: 90vw;
            background: var(--bg-primary);
            border: 1px solid var(--border-primary);
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 1001;
            overflow: hidden;
          }

          .new-project-header {
            padding: 20px 24px 16px;
            border-bottom: 1px solid var(--border-primary);
          }

          .new-project-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .new-project-body {
            padding: 20px 24px;
          }

          .new-project-body > p {
            margin: 0 0 20px 0;
            font-size: 14px;
            color: var(--text-secondary);
          }

          .new-project-options {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .new-project-option {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            background: var(--bg-tertiary);
            border: 2px solid var(--border-primary);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s ease;
            text-align: left;
          }

          .new-project-option:hover {
            border-color: var(--accent-primary);
            background: var(--bg-hover);
          }

          .new-project-option-icon {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-active);
            border-radius: 8px;
            color: var(--accent-primary);
            flex-shrink: 0;
          }

          .new-project-option-text {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .new-project-option-title {
            font-size: 15px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .new-project-option-desc {
            font-size: 13px;
            color: var(--text-muted);
          }

          .new-project-footer {
            display: flex;
            justify-content: flex-end;
            padding: 12px 24px 16px;
            border-top: 1px solid var(--border-primary);
          }

          /* Export Dialog Styles */
          .export-dialog {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 500px;
            max-width: 90vw;
            background: var(--bg-primary);
            border: 1px solid var(--border-primary);
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 1001;
            overflow: hidden;
          }

          .export-dialog-header {
            padding: 20px 24px 16px;
            border-bottom: 1px solid var(--border-primary);
          }

          .export-dialog-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .export-dialog-body {
            padding: 20px 24px;
          }

          .export-dialog-subtitle {
            margin: 0 0 16px;
            font-size: 14px;
            color: var(--text-secondary);
          }

          .export-filename-section {
            margin-bottom: 20px;
          }

          .export-filename-label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-primary);
          }

          .export-filename-input-wrapper {
            display: flex;
            align-items: center;
            background: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            border-radius: 6px;
            overflow: hidden;
          }

          .export-filename-input-wrapper:focus-within {
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 2px var(--accent-primary-transparent, rgba(0, 122, 204, 0.2));
          }

          .export-filename-input {
            flex: 1;
            padding: 10px 12px;
            font-size: 14px;
            background: transparent;
            border: none;
            color: var(--text-primary);
            outline: none;
          }

          .export-filename-input::placeholder {
            color: var(--text-muted);
          }

          .export-filename-ext {
            padding: 10px 12px;
            font-size: 14px;
            color: var(--text-muted);
            background: var(--bg-tertiary);
            border-left: 1px solid var(--border-primary);
          }

          .export-filename-row {
            display: flex;
            gap: 8px;
            align-items: stretch;
          }

          .export-filename-row .export-filename-input-wrapper {
            flex: 1;
          }

          .export-browse-btn {
            padding: 8px 16px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            border-radius: 6px;
            color: var(--text-primary);
            font-size: 13px;
            cursor: pointer;
            transition: all 0.15s ease;
            white-space: nowrap;
          }

          .export-browse-btn:hover {
            background: var(--bg-tertiary);
            border-color: var(--accent-primary);
          }

          .export-save-path {
            margin-top: 6px;
            padding: 6px 10px;
            background: var(--bg-tertiary);
            border-radius: 4px;
            font-size: 12px;
          }

          .export-save-path-label {
            color: var(--text-muted);
            margin-right: 6px;
          }

          .export-save-path-value {
            color: var(--text-primary);
            word-break: break-all;
          }

          .export-version-selector {
            margin-top: 10px;
            padding: 10px;
            background: var(--bg-tertiary);
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .export-version-label {
            font-size: 12px;
            color: var(--text-muted);
          }

          .export-version-option {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: var(--text-primary);
            cursor: pointer;
          }

          .export-version-option input[type="radio"] {
            margin: 0;
          }

          .export-format-options {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .export-format-option {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px 16px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .export-format-option:hover {
            background: var(--bg-hover);
            border-color: var(--border-secondary);
          }

          .export-format-option.selected {
            background: var(--bg-active);
            border-color: var(--accent-primary);
          }

          .export-format-option input[type="radio"] {
            margin-top: 3px;
            accent-color: var(--accent-primary);
          }

          .export-format-content {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .export-format-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .export-format-desc {
            font-size: 12px;
            color: var(--text-muted);
          }

          .export-options {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--border-primary);
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .export-option-checkbox {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 13px;
            color: var(--text-secondary);
            cursor: pointer;
          }

          .export-option-checkbox input[type="checkbox"] {
            accent-color: var(--accent-primary);
          }

          .export-html-options {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--border-primary);
          }

          .download-xslt-btn {
            margin-top: 12px;
            padding: 8px 14px;
            font-size: 12px;
            color: var(--accent-primary);
            background: transparent;
            border: 1px solid var(--accent-primary);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .download-xslt-btn:hover {
            background: var(--accent-primary);
            color: white;
          }

          .export-option-label {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-secondary);
            margin: 0 0 10px 0;
          }

          .export-xslt-options {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .export-xslt-option {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 13px;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 6px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            transition: all 0.15s ease;
          }

          .export-xslt-option:hover {
            background: var(--bg-tertiary);
            border-color: var(--accent-primary);
          }

          .export-xslt-option input[type="radio"] {
            accent-color: var(--accent-primary);
          }

          .export-dialog-footer {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            padding: 16px 24px;
            border-top: 1px solid var(--border-primary);
          }

          /* App Version Button */
          .app-version-btn {
            background: transparent;
            border: none;
            color: #ffffff;
            font-size: 12px;
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 3px;
            transition: background 0.15s ease;
          }

          .app-version-btn:hover {
            background: rgba(255, 255, 255, 0.2);
          }

          /* About Dialog Styles */
          .about-dialog {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 450px;
            max-width: 90vw;
            background: var(--bg-primary);
            border: 1px solid var(--border-primary);
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 1001;
            overflow: hidden;
          }

          .about-dialog-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px 16px;
            border-bottom: 1px solid var(--border-primary);
          }

          .about-dialog-header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .about-close-btn {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            color: var(--text-muted);
            font-size: 20px;
            cursor: pointer;
            border-radius: 4px;
          }

          .about-close-btn:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
          }

          .about-dialog-body {
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .about-logo {
            display: flex;
            justify-content: center;
            color: var(--accent-primary);
          }

          .about-info {
            text-align: center;
          }

          .about-version {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0 0 8px;
          }

          .about-description {
            font-size: 13px;
            color: var(--text-secondary);
            margin: 0;
            line-height: 1.5;
          }

          .about-credits {
            background: var(--bg-secondary);
            padding: 16px;
            border-radius: 6px;
          }

          .about-credits p {
            margin: 0 0 6px;
            font-size: 13px;
            color: var(--text-secondary);
          }

          .about-credits p:last-child {
            margin-bottom: 0;
          }

          .about-credits a {
            color: var(--accent-primary);
            text-decoration: none;
          }

          .about-credits a:hover {
            text-decoration: underline;
          }

          .about-license {
            border-top: 1px solid var(--border-primary);
            padding-top: 16px;
          }

          .about-license h4 {
            margin: 0 0 8px;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .about-license p {
            margin: 0 0 4px;
            font-size: 12px;
            color: var(--text-secondary);
          }

          .about-license-note {
            font-style: italic;
            color: var(--text-muted) !important;
          }

          .about-acknowledgments {
            border-top: 1px solid var(--border-primary);
            padding-top: 16px;
          }

          .about-acknowledgments h4 {
            margin: 0 0 8px;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .about-acknowledgments p {
            margin: 0 0 4px;
            font-size: 12px;
            color: var(--text-secondary);
          }

          .about-acknowledgments a {
            color: var(--accent-primary);
            text-decoration: none;
          }

          .about-acknowledgments a:hover {
            text-decoration: underline;
          }

          .about-bpmn-license {
            font-size: 11px !important;
            color: var(--text-muted) !important;
            margin-top: 8px !important;
          }

          .about-dialog-footer {
            display: flex;
            justify-content: center;
            padding: 16px 24px;
            border-top: 1px solid var(--border-primary);
          }

          .about-ok-btn {
            padding: 8px 32px;
            background: var(--accent-primary);
            border: none;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.15s ease;
          }

          .about-ok-btn:hover {
            background: var(--accent-hover);
          }
        `}</style>
      </div>
    </ThemeProvider>
  );
};

export default App;
