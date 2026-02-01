import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import BPMNEditor from './components/BPMNEditor/BPMNEditor';
import ERPanel from './components/ERPanel/ERPanel';
import ValidationPanel from './components/ValidationPanel/ValidationPanel';
import SpecNameBar from './components/SpecNameBar/SpecNameBar';
import VerticalMenuBar from './components/VerticalMenuBar/VerticalMenuBar';
import ContentPane from './components/ContentPane/ContentPane';
import StartupScreen from './components/StartupScreen/StartupScreen';
import { ThemeProvider } from './hooks/useTheme';
import { generateIdmXml } from './utils/idmXmlGenerator';
import { validateProject, getValidationStatusLabel } from './utils/validation';
import { parseIdmXml, isIdmXml } from './utils/idmXmlParser';
import {
  SAMPLE_BPMN_XML,
  SAMPLE_HEADER_DATA,
  SAMPLE_ER_DATA_MAP,
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
  const [erPanelMode, setErPanelMode] = useState('list');
  const [erDataMap, setErDataMap] = useState({});
  const [erLibrary, setErLibrary] = useState([]);
  const [currentFilePath, setCurrentFilePath] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [bpmnDataObjects, setBpmnDataObjects] = useState([]); // Track all data objects from BPMN

  // Explicit project state - true only when user creates/opens a project
  const [hasActiveProject, setHasActiveProject] = useState(false);

  // Header Data State (Basic Information per ISO 29481-1)
  const [headerData, setHeaderData] = useState({
    // Required fields
    title: '',
    authors: [],             // Array of authors (individuals or organizations)
    organization: '',
    version: '1.0',
    creationDate: new Date().toISOString().split('T')[0],
    status: 'NP',
    language: 'EN',
    region: 'international',
    // Use Case specific fields (moved from Basic Information)
    projectStages: [],       // Array of selected project stages
    useCategories: [],       // Array of selected use categories
    // Optional fields
    summary: '',
    revisionHistory: [],     // Array of {date, description} for revision tracking
    contributors: [],        // Array of contributor names
    copyright: '',
    keywords: [],            // Array of keywords/tags
    relatedStandards: [],    // Array of related standard references
    externalReferences: [],  // Array of external URLs/references
    // Use Case fields (per ISO 29481-1)
    objectives: '',
    benefits: '',
    limitations: '',
    actors: '',              // Process actors (sender, receiver, etc.)
    preconditions: '',       // Conditions before process starts
    postconditions: '',      // Expected outcomes after completion
    triggeringEvents: '',    // Events that trigger the process
    requiredCapabilities: '',// Required software/process capabilities
    complianceCriteria: ''   // Criteria for compliance verification
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
  const [exportFormat, setExportFormat] = useState('idmxml');
  const [exportOptions, setExportOptions] = useState({
    includeBpmn: true,
    includeImages: true,
    includeXslt: false
  });

  // About Dialog State
  const [showAboutDialog, setShowAboutDialog] = useState(false);

  // Active content pane state
  const [activePane, setActivePane] = useState(null); // 'specification' | 'useCase' | 'exchangeReq' | null

  const modelerRef = useRef(null);
  const isLoadingProjectRef = useRef(false); // Track when loading a project to skip marking dirty

  // Helper function to extract data objects after project load
  // Called after loading a project since importXML doesn't trigger commandStack.changed
  const extractDataObjectsAfterLoad = useCallback(() => {
    setTimeout(() => {
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
      } catch (error) {
        console.error('Error extracting data objects after load:', error);
      }
    }, 300); // Wait for modeler to finish importing
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

  // Handle Data Object selection from BPMN editor
  const handleDataObjectSelect = useCallback((dataObject) => {
    setSelectedDataObject(dataObject);

    // Initialize ER data if not exists
    if (!erDataMap[dataObject.id]) {
      setErDataMap(prev => ({
        ...prev,
        [dataObject.id]: {
          id: `ER-${Date.now()}`,
          name: dataObject.name || '',
          description: '',
          informationUnits: []
        }
      }));
    }

    if (dataObject.forceOpen || !showERPanel) {
      setShowERPanel(true);
      setErPanelMode('detail');
      setActivePane(null); // Close content pane when opening ER panel
    }
  }, [erDataMap, showERPanel]);

  // Handle ER data change
  // Uses functional update to merge with current state, preventing race conditions
  // when multiple fields are updated before React re-renders
  const handleERChange = useCallback((newErData) => {
    if (selectedDataObject) {
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
      setIsDirty(true);
    }
  }, [selectedDataObject]);

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
  }, [selectedDataObject]);

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

  // Extract swimlanes (Participants and Lanes) from the modeler
  const extractSwimlanesFromModeler = useCallback(() => {
    if (!modelerRef.current) return [];

    try {
      const elementRegistry = modelerRef.current.get('elementRegistry');
      if (!elementRegistry) return [];

      const swimlanes = [];
      elementRegistry.forEach(element => {
        // Get Participants (pools) and Lanes
        if (element.type === 'bpmn:Participant' || element.type === 'bpmn:Lane') {
          const businessObject = element.businessObject;
          const name = businessObject?.name || '';
          if (name) { // Only include named swimlanes
            swimlanes.push({
              id: element.id,
              name: name,
              type: element.type === 'bpmn:Participant' ? 'pool' : 'lane'
            });
          }
        }
      });

      return swimlanes;
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

      // Sync swimlanes (Participants/Lanes) with Actor Roles
      const swimlanes = extractSwimlanesFromModeler();
      if (swimlanes.length > 0) {
        setHeaderData(prevHeaderData => {
          const currentActors = prevHeaderData.actorsList || [];
          const currentActorNames = new Set(currentActors.map(a => a.name?.toLowerCase()));

          // Add new swimlanes that don't exist in actorsList
          const newActors = [...currentActors];
          swimlanes.forEach(swimlane => {
            if (swimlane.name && !currentActorNames.has(swimlane.name.toLowerCase())) {
              newActors.push({
                id: `actor-${swimlane.id}`,
                name: swimlane.name,
                role: swimlane.type === 'pool' ? 'Pool' : 'Lane',
                bpmnId: swimlane.id // Track the BPMN element ID for future syncing
              });
            }
          });

          // Only update if there are changes
          if (newActors.length !== currentActors.length) {
            return { ...prevHeaderData, actorsList: newActors };
          }
          return prevHeaderData;
        });
      }
    }, 100);
  }, [extractDataObjectsFromModeler, extractSwimlanesFromModeler]);

  // Close ER panel
  const handleCloseERPanel = useCallback(() => {
    setShowERPanel(false);
    setSelectedDataObject(null);
  }, []);

  // Handle Header Data change
  const handleHeaderChange = useCallback((newHeaderData) => {
    setHeaderData(newHeaderData);
    setIsDirty(true);
  }, []);

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
  const handleSelectER = useCallback((dataObjectId) => {
    setSelectedDataObject({ id: dataObjectId, name: dataObjectId });
    setErPanelMode('detail');
    setShowERPanel(true);
    // Keep the ER list open on the left when selecting an individual ER
  }, []);

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

  // Open project
  const handleOpenProject = useCallback(async () => {
    if (window.electronAPI) {
      await window.electronAPI.openProject();
    } else {
      // Browser fallback: use file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.idm,.bpmn,.xml';

      input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
          const content = await file.text();
          const fileName = file.name.toLowerCase();

          if (fileName.endsWith('.json') || fileName.endsWith('.idm')) {
            // Parse as project file (.json or .idm)
            isLoadingProjectRef.current = true;
            const projectData = JSON.parse(content);
            if (projectData.bpmnXml) {
              setBpmnXml(projectData.bpmnXml);
            }
            if (projectData.headerData) {
              setHeaderData(projectData.headerData);
            }
            if (projectData.erDataMap) {
              setErDataMap(projectData.erDataMap);
            }
            if (projectData.erLibrary) {
              setErLibrary(projectData.erLibrary);
            }
            setCurrentFilePath(file.name);
            setIsDirty(false);
            setValidationResults(null);
            setHasActiveProject(true);
            setActivePane('specification'); // Open specification pane after loading
            setTimeout(() => { isLoadingProjectRef.current = false; }, 300);
            extractDataObjectsAfterLoad(); // Extract data objects from loaded BPMN
          } else if (fileName.endsWith('.xml')) {
            // Check if it's an idmXML file
            if (isIdmXml(content)) {
              try {
                isLoadingProjectRef.current = true;
                const idmData = parseIdmXml(content);
                if (idmData.headerData) {
                  setHeaderData(idmData.headerData);
                }
                if (idmData.erDataMap) {
                  setErDataMap(idmData.erDataMap);
                }
                // Use embedded BPMN if available, otherwise use DEFAULT diagram
                if (idmData.bpmnXml) {
                  setBpmnXml(idmData.bpmnXml);
                  setIsDirty(false); // Not dirty since we loaded complete data
                } else {
                  setBpmnXml('DEFAULT');
                  setIsDirty(true); // Mark dirty since BPMN needs to be recreated
                  alert('idmXML imported successfully. Note: No embedded BPMN diagram found. The process map needs to be recreated manually.');
                }
                setCurrentFilePath(file.name);
                setValidationResults(null);
                setHasActiveProject(true);
                setActivePane('specification'); // Open specification pane
                setTimeout(() => { isLoadingProjectRef.current = false; }, 300);
                extractDataObjectsAfterLoad(); // Extract data objects from loaded BPMN
              } catch (idmErr) {
                console.error('Failed to parse idmXML:', idmErr);
                alert('Failed to parse idmXML file: ' + idmErr.message);
                isLoadingProjectRef.current = false;
              }
            } else {
              // Treat as BPMN XML
              setBpmnXml(content);
              setErDataMap({});
              setCurrentFilePath(null);
              setIsDirty(true);
              setHasActiveProject(true);
            }
          } else if (fileName.endsWith('.bpmn')) {
            // Parse as BPMN file
            setBpmnXml(content);
            setErDataMap({});
            setCurrentFilePath(null);
            setIsDirty(true);
            setHasActiveProject(true);
            extractDataObjectsAfterLoad(); // Extract data objects from loaded BPMN
          }
        } catch (err) {
          console.error('Failed to parse file:', err);
          alert('Failed to open file. Please ensure it is a valid project, idmXML, or BPMN file.');
        }
      };

      input.click();
    }
  }, [extractDataObjectsAfterLoad]);

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
  const createNewProject = useCallback((projectType) => {
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
      // Load GDE-IDM sample project data
      setHeaderData({ ...SAMPLE_HEADER_DATA });
      setErDataMap({ ...SAMPLE_ER_DATA_MAP });
      setErLibrary([...SAMPLE_ER_LIBRARY]);
      setBpmnXml(SAMPLE_BPMN_XML);
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
      setErLibrary([]);
      setBpmnXml('BLANK'); // Signal for empty canvas with just a start event
    }
    extractDataObjectsAfterLoad(); // Extract data objects from loaded BPMN
  }, [extractDataObjectsAfterLoad]);

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
        const idmXml = generateIdmXml({
          headerData,
          bpmnXml: currentBpmnXml,
          erDataMap,
          dataObjects
        });

        // Download the file
        const blob = new Blob([idmXml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = headerData.title
          ? `${headerData.title.replace(/\s+/g, '_')}.idm.xml`
          : 'idm_specification.idm.xml';
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
    const manualUrl = 'https://github.com/ghanglee/IDMxPPM/blob/main/docs/USER_MANUAL.md';

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

    // Show export dialog regardless of validation result
    // Users may want to save incomplete work to continue later
    setShowExportDialog(true);
  }, [headerData, bpmnXml, erDataMap]);

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
    const fileName = (headerData.title || 'idm-specification').replace(/[^a-zA-Z0-9.-]/g, '_');

    const downloadFile = (content, filename, mimeType) => {
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
        case 'idmxml': {
          // ISO 29481-3 compliant idmXML
          const idmXmlContent = generateIdmXml({
            headerData,
            bpmnXml: exportOptions.includeBpmn ? currentBpmnXml : null,
            erDataMap,
            dataObjects
          });
          downloadFile(idmXmlContent, `${fileName}.xml`, 'application/xml');
          break;
        }

        case 'idm': {
          // Compressed JSON project file (.idm)
          const projectData = {
            version: '1.0.0',
            format: 'idm-binary',
            appName: 'IDMxPPM - Neo Seoul',
            bpmnXml: currentBpmnXml,
            headerData,
            erDataMap,
            erLibrary,
            exportedAt: new Date().toISOString()
          };
          const jsonContent = JSON.stringify(projectData);
          // Use compression if available, otherwise plain JSON
          downloadFile(jsonContent, `${fileName}.idm`, 'application/json');
          break;
        }

        case 'zip': {
          // ZIP archive with multiple files
          // Note: Full ZIP support would require a library like JSZip
          // For now, create a JSON bundle that can be used
          const bundle = {
            'manifest.json': JSON.stringify({
              version: '1.0.0',
              format: 'idm-bundle',
              files: ['idm-specification.xml', 'process-map.bpmn'],
              createdAt: new Date().toISOString()
            }, null, 2),
            'idm-specification.xml': generateIdmXml({
              headerData,
              bpmnXml: null, // BPMN in separate file
              erDataMap,
              dataObjects
            }),
            'process-map.bpmn': currentBpmnXml,
            'project.json': JSON.stringify({
              headerData,
              erDataMap,
              erLibrary
            }, null, 2)
          };
          // Download as JSON bundle (in production, use JSZip for actual ZIP)
          downloadFile(JSON.stringify(bundle, null, 2), `${fileName}-bundle.json`, 'application/json');
          alert('Note: For full ZIP support, use the desktop app. Downloaded as JSON bundle.');
          break;
        }

        case 'bpmn': {
          // BPMN file only
          downloadFile(currentBpmnXml, `${fileName}.bpmn`, 'application/xml');
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
  }, [bpmnXml, headerData, erDataMap, erLibrary, exportFormat, exportOptions]);

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
      version: '1.0.0',
      appName: 'IDMxPPM - Neo Seoul',
      bpmnXml: currentBpmnXml,
      headerData,
      erDataMap,
      erLibrary,
      savedAt: new Date().toISOString()
    };

    const content = JSON.stringify(projectData, null, 2);

    if (currentFilePath && !saveAs) {
      const result = await window.electronAPI.saveFile({ content, filePath: currentFilePath });
      if (result.success) {
        setIsDirty(false);
      }
    } else {
      const result = await window.electronAPI.saveProject({
        content,
        defaultName: 'idm-project.json'
      });
      if (result.success) {
        setCurrentFilePath(result.filePath);
        setIsDirty(false);
      }
    }
  };

  // Electron IPC event handlers
  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onFileOpened((data) => {
      if (data.type === 'project') {
        try {
          // Set loading flag to prevent marking dirty during load
          isLoadingProjectRef.current = true;

          const projectData = JSON.parse(data.content);
          if (projectData.bpmnXml) {
            setBpmnXml(projectData.bpmnXml);
          }
          if (projectData.headerData) {
            setHeaderData(projectData.headerData);
          }
          if (projectData.erDataMap) {
            setErDataMap(projectData.erDataMap);
          }
          if (projectData.erLibrary) {
            setErLibrary(projectData.erLibrary);
          }
          setCurrentFilePath(data.filePath);
          setIsDirty(false);
          setValidationResults(null);
          setHasActiveProject(true); // Mark project as active
          extractDataObjectsAfterLoad(); // Extract data objects from loaded BPMN

          // Clear loading flag after a delay (after onChange callbacks complete)
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

          const idmData = parseIdmXml(data.content);
          if (idmData.headerData) {
            setHeaderData(idmData.headerData);
          }
          if (idmData.erDataMap) {
            setErDataMap(idmData.erDataMap);
          }
          // Use embedded BPMN if available, otherwise use DEFAULT diagram
          if (idmData.bpmnXml) {
            setBpmnXml(idmData.bpmnXml);
            setIsDirty(false);
          } else {
            setBpmnXml('DEFAULT');
            setIsDirty(true);
            alert('idmXML imported successfully. Note: No embedded BPMN diagram found. The process map needs to be recreated manually.');
          }
          setCurrentFilePath(data.filePath);
          setValidationResults(null);
          setHasActiveProject(true);
          setActivePane('specification');
          extractDataObjectsAfterLoad(); // Extract data objects from loaded BPMN

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
        setErDataMap({});
        setCurrentFilePath(null);
        setIsDirty(true);
        setHasActiveProject(true);
        extractDataObjectsAfterLoad(); // Extract data objects from loaded BPMN
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
      setErLibrary([]); // Clear library
      setSelectedDataObject(null);
      setShowERPanel(false);
      setActivePane('specification');
      setCurrentFilePath(null);
      setIsDirty(false); // New blank project starts clean
      setValidationResults(null);
      setHasActiveProject(true); // Mark project as active
      extractDataObjectsAfterLoad(); // Extract data objects from loaded BPMN
    });

    window.electronAPI.onMenuSave(() => saveProject(false));
    window.electronAPI.onMenuSaveAs(() => saveProject(true));

    return () => {
      window.electronAPI.removeAllListeners('file-opened');
      window.electronAPI.removeAllListeners('er-imported');
      window.electronAPI.removeAllListeners('menu-new');
      window.electronAPI.removeAllListeners('menu-save');
      window.electronAPI.removeAllListeners('menu-save-as');
    };
  }, [isDirty, handleImportER, extractDataObjectsAfterLoad]);

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
          />

          {/* Content Area */}
          <div className="app-content">
            {!isProjectOpen ? (
              /* Startup Screen - shown when no project is active */
              <StartupScreen
                onNewBlank={() => createNewProject('blank')}
                onNewSample={() => createNewProject('sample')}
                onOpen={handleOpenProject}
              />
            ) : (
              <>
                {/* Content Pane (Specification/Use Case/Exchange Requirements List) */}
                {activePane && (
                  <ContentPane
                    type={activePane}
                    headerData={headerData}
                    erDataMap={erDataMap}
                    dataObjects={bpmnDataObjects}
                    onHeaderChange={handleHeaderChange}
                    onSelectER={handleSelectER}
                    onClose={() => {
                      setActivePane(null);
                      if (activePane === 'exchangeReq') {
                        setShowERPanel(false);
                        setSelectedDataObject(null);
                      }
                    }}
                  />
                )}

                {/* BPMN Editor (shown when project is open) */}
                <div className="bpmn-editor-container">
                  <BPMNEditor
                    xml={bpmnXml}
                    onDataObjectSelect={handleDataObjectSelect}
                    onChange={handleBpmnChange}
                    onReady={handleModelerReady}
                  />
                </div>

                {/* Individual ER Panel (Right side) - Shows when a specific ER is selected */}
                {showERPanel && selectedDataObject && (
                  <ERPanel
                    mode="detail"
                    dataObject={selectedDataObject}
                    erData={erDataMap[selectedDataObject.id] || null}
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
                <p className="export-dialog-subtitle">Choose an export format:</p>
                <div className="export-format-options">
                  <label className={`export-format-option ${exportFormat === 'idmxml' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="exportFormat"
                      value="idmxml"
                      checked={exportFormat === 'idmxml'}
                      onChange={(e) => setExportFormat(e.target.value)}
                    />
                    <div className="export-format-content">
                      <span className="export-format-title">idmXML (.xml)</span>
                      <span className="export-format-desc">ISO 29481-3 compliant XML with embedded BPMN</span>
                    </div>
                  </label>
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
                  <label className={`export-format-option ${exportFormat === 'zip' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="exportFormat"
                      value="zip"
                      checked={exportFormat === 'zip'}
                      onChange={(e) => setExportFormat(e.target.value)}
                    />
                    <div className="export-format-content">
                      <span className="export-format-title">Archive Bundle (.json)</span>
                      <span className="export-format-desc">Separate files: idmXML + BPMN + project data</span>
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
                </div>

                {exportFormat === 'idmxml' && (
                  <div className="export-options">
                    <label className="export-option-checkbox">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeBpmn}
                        onChange={(e) => setExportOptions({ ...exportOptions, includeBpmn: e.target.checked })}
                      />
                      <span>Include embedded BPMN diagram</span>
                    </label>
                    <label className="export-option-checkbox">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeXslt}
                        onChange={(e) => setExportOptions({ ...exportOptions, includeXslt: e.target.checked })}
                      />
                      <span>Include XSLT stylesheet reference</span>
                    </label>
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
              IDMxPPM neo-Seoul v0.1.0
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
                  <p className="about-version">Version 0.1.0</p>
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
