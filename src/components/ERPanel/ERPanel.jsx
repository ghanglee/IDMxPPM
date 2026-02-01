import React, { useState, useRef, useCallback, useEffect } from 'react';
import './ERPanel.css';
import { searchSchema, searchBsdd, getAvailableSchemas, isSchemaSearchable } from '../../utils/schemaSearch';
import {
  DataObjectIcon,
  InfoUnitIcon,
  AddIcon,
  SaveIcon,
  DeleteIcon,
  LibraryIcon,
  ImportIcon,
  SearchIcon,
  LinkIcon,
  CopyIcon,
  CloseIcon,
  ChevronRightIcon,
  ChevronLeftIcon
} from '../icons';

// Data types for Information Units (ISO 29481-3)
const DATA_TYPES = [
  'String / Text',
  'Numeric',
  'Boolean',
  'Date / Time',
  'Image',
  'Audio',
  'Video',
  '2D Vector Drawing',
  '3D Model',
  'Document (PDF, DOCX, etc.)',
  'Structured (list, graph, table, JSON)'
];

// External schema options (with search support)
const SCHEMA_OPTIONS = [
  { value: 'IFC 2x3', label: 'IFC 2x3', searchable: true },
  { value: 'IFC 4x3 ADD2', label: 'IFC 4x3 ADD2', searchable: true },
  { value: 'bSDD', label: 'bSDD', searchable: true, apiEnabled: true },
  { value: 'CityGML', label: 'CityGML', searchable: true },
  { value: 'UniFormat', label: 'UniFormat', searchable: true },
  { value: 'OmniClass', label: 'OmniClass', searchable: true },
  { value: 'MasterFormat', label: 'MasterFormat', searchable: true },
  { value: 'Other', label: 'Other', searchable: false }
];

// Generate unique ID
const uuid = () => crypto.randomUUID?.() || `IU-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * ER Panel Component
 * Exchange Requirement editor with Sub-ER support
 * ISO 29481-3 compliant
 *
 * @param {Object} props
 * @param {string} props.mode - 'list' | 'detail'
 * @param {Object} props.dataObject - Selected data object (for detail mode)
 * @param {Object} props.erData - Current ER data (for detail mode)
 * @param {Object} props.erDataMap - All ERs in project (for list mode)
 * @param {Array} props.erLibrary - ER library for reuse
 * @param {function} props.onChange - Callback when ER data changes
 * @param {function} props.onSave - Callback to save ER
 * @param {function} props.onSaveAs - Callback to save as new ER
 * @param {function} props.onLoadFromLibrary - Callback to load from library
 * @param {function} props.onAddSubER - Callback to add sub-ER
 * @param {function} props.onSelectER - Callback when ER is selected (for list mode)
 * @param {function} props.onModeChange - Callback to switch modes
 * @param {function} props.onClose - Callback to close panel
 */
const ERPanel = ({
  mode = 'detail',
  dataObject,
  erData,
  erDataMap = {},
  erLibrary = [],
  onChange,
  onSave,
  onSaveAs,
  onLoadFromLibrary,
  onAddSubER,
  onSelectER,
  onModeChange,
  onClose
}) => {
  const [expandedUnits, setExpandedUnits] = useState({});
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [selectedUnitForSubER, setSelectedUnitForSubER] = useState(null);
  const fileInputRefs = useRef({});

  // External mapping search state
  const [showMappingSearch, setShowMappingSearch] = useState(false);
  const [mappingSearchUnitId, setMappingSearchUnitId] = useState(null);
  const [mappingSearchSchema, setMappingSearchSchema] = useState('IFC 4x3 ADD2');
  const [mappingSearchQuery, setMappingSearchQuery] = useState('');
  const [mappingSearchType, setMappingSearchType] = useState('exact');
  const [mappingSearchResults, setMappingSearchResults] = useState([]);
  const [mappingSearchLoading, setMappingSearchLoading] = useState(false);

  // Sub-ER section state
  const [showSubERSection, setShowSubERSection] = useState(true);

  // Sub-ER selection modal state
  const [showSubERModal, setShowSubERModal] = useState(false);
  const [subERModalTab, setSubERModalTab] = useState('current'); // 'current' | 'import'
  const erXmlFileRef = useRef(null);

  // Auto-save state - simplified approach
  // Note: onChange already saves data to parent state immediately
  // onSave additionally syncs ER name to BPMN diagram
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved'
  const saveTimerRef = useRef(null);
  const prevDataObjectIdRef = useRef(null);

  // Auto-sync ER name to BPMN diagram after changes settle
  useEffect(() => {
    // Skip if no data or callbacks
    if (!erData || !onSave || !dataObject) {
      return;
    }

    // If we just switched to a different data object, don't trigger save
    if (prevDataObjectIdRef.current !== dataObject.id) {
      prevDataObjectIdRef.current = dataObject.id;
      setSaveStatus('saved');
      return;
    }

    // Show unsaved indicator
    setSaveStatus('unsaved');

    // Clear any pending save timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // After 500ms of no changes, sync to BPMN diagram
    saveTimerRef.current = setTimeout(() => {
      setSaveStatus('saving');
      onSave(erData);
      setSaveStatus('saved');
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [erData, onSave, dataObject]);

  const toggleUnit = (unitId) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  // Save ER
  const handleSave = () => {
    if (onSave) {
      onSave(erData);
    }
  };

  // Save As dialog
  const handleSaveAs = () => {
    setSaveAsName(erData?.name || '');
    setShowSaveAsDialog(true);
  };

  const confirmSaveAs = () => {
    if (onSaveAs && saveAsName.trim()) {
      onSaveAs(erData, saveAsName.trim());
      setShowSaveAsDialog(false);
      setSaveAsName('');
    }
  };

  // Load ER from library as Sub-ER
  const handleLoadSubER = (libraryER) => {
    if (selectedUnitForSubER) {
      // Add as nested sub-information units to the selected unit
      if (onAddSubER) {
        onAddSubER(selectedUnitForSubER, libraryER);
      }
      // Also track as a Sub-ER with reference to the unit
      const subER = {
        ...libraryER,
        id: uuid(),
        linkedTo: selectedUnitForSubER.slice(0, 8) + '...'
      };
      onChange({
        ...erData,
        subERs: [...(erData?.subERs || []), subER]
      });
    } else if (onLoadFromLibrary) {
      // Load as main ER replacement
      onLoadFromLibrary(libraryER);
    }
    setShowLibrary(false);
    setSelectedUnitForSubER(null);
  };

  // Add new Information Unit
  const addInformationUnit = (parentId = null) => {
    const newUnit = {
      id: uuid(),
      name: '',
      dataType: 'String / Text',
      isMandatory: false,
      definition: '',
      examples: '',
      exampleImages: [],
      correspondingExternalElements: [],
      subInformationUnits: []
    };

    // Ensure erData is at least an empty object
    const currentErData = erData || { informationUnits: [] };

    if (parentId) {
      const addToParent = (units) => units.map(u =>
        u.id === parentId
          ? { ...u, subInformationUnits: [...(u.subInformationUnits || []), newUnit] }
          : { ...u, subInformationUnits: addToParent(u.subInformationUnits || []) }
      );
      onChange({ ...currentErData, informationUnits: addToParent(currentErData.informationUnits || []) });
      setExpandedUnits(prev => ({ ...prev, [parentId]: true }));
    } else {
      onChange({ ...currentErData, informationUnits: [...(currentErData.informationUnits || []), newUnit] });
    }
    setExpandedUnits(prev => ({ ...prev, [newUnit.id]: true }));
  };

  // Update Information Unit
  const updateUnit = (unitId, updates) => {
    const updateRecursive = (units) => units.map(u =>
      u.id === unitId ? { ...u, ...updates } : { ...u, subInformationUnits: updateRecursive(u.subInformationUnits || []) }
    );
    onChange({ ...erData, informationUnits: updateRecursive(erData?.informationUnits || []) });
  };

  // Remove Information Unit
  const removeUnit = (unitId) => {
    const removeRecursive = (units) => units
      .filter(u => u.id !== unitId)
      .map(u => ({ ...u, subInformationUnits: removeRecursive(u.subInformationUnits || []) }));
    onChange({ ...erData, informationUnits: removeRecursive(erData?.informationUnits || []) });
  };

  // Image handling
  const handleImageUpload = (unitId, event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage = {
          id: uuid(),
          name: file.name,
          data: e.target.result,
          type: file.type
        };

        const addImageRecursive = (units) => units.map(u => {
          if (u.id === unitId) {
            return { ...u, exampleImages: [...(u.exampleImages || []), newImage] };
          }
          return { ...u, subInformationUnits: addImageRecursive(u.subInformationUnits || []) };
        });
        
        onChange({ ...erData, informationUnits: addImageRecursive(erData?.informationUnits || []) });
      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  };

  const removeImage = (unitId, imageId) => {
    const removeImageRecursive = (units) => units.map(u => {
      if (u.id === unitId) {
        return { ...u, exampleImages: (u.exampleImages || []).filter(img => img.id !== imageId) };
      }
      return { ...u, subInformationUnits: removeImageRecursive(u.subInformationUnits || []) };
    });
    onChange({ ...erData, informationUnits: removeImageRecursive(erData?.informationUnits || []) });
  };

  // External mappings
  const addMapping = (unitId) => {
    const newMapping = { id: uuid(), basis: 'IFC 4x3 ADD2', name: '' };
    const addRecursive = (units) => units.map(u =>
      u.id === unitId
        ? { ...u, correspondingExternalElements: [...(u.correspondingExternalElements || []), newMapping] }
        : { ...u, subInformationUnits: addRecursive(u.subInformationUnits || []) }
    );
    onChange({ ...erData, informationUnits: addRecursive(erData?.informationUnits || []) });
  };

  const updateMapping = (unitId, mappingId, updates) => {
    const updateRecursive = (units) => units.map(u => {
      if (u.id === unitId) {
        return { ...u, correspondingExternalElements: (u.correspondingExternalElements || []).map(m => m.id === mappingId ? { ...m, ...updates } : m) };
      }
      return { ...u, subInformationUnits: updateRecursive(u.subInformationUnits || []) };
    });
    onChange({ ...erData, informationUnits: updateRecursive(erData?.informationUnits || []) });
  };

  const removeMapping = (unitId, mappingId) => {
    const removeRecursive = (units) => units.map(u => {
      if (u.id === unitId) {
        return { ...u, correspondingExternalElements: (u.correspondingExternalElements || []).filter(m => m.id !== mappingId) };
      }
      return { ...u, subInformationUnits: removeRecursive(u.subInformationUnits || []) };
    });
    onChange({ ...erData, informationUnits: removeRecursive(erData?.informationUnits || []) });
  };

  // Open mapping search modal
  const openMappingSearch = (unitId, currentSchema) => {
    setMappingSearchUnitId(unitId);
    setMappingSearchSchema(currentSchema || 'IFC 4x3 ADD2');
    setMappingSearchQuery('');
    setMappingSearchResults([]);
    setShowMappingSearch(true);
  };

  // Debounced auto-search when query changes
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if modal is not open or query is too short
    if (!showMappingSearch || !mappingSearchQuery.trim()) {
      return;
    }

    // Debounce search: wait 300ms after user stops typing
    searchTimeoutRef.current = setTimeout(() => {
      handleMappingSearch();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [mappingSearchQuery, mappingSearchSchema, mappingSearchType, showMappingSearch]);

  // Execute mapping search
  const handleMappingSearch = useCallback(async () => {
    if (!mappingSearchQuery.trim()) {
      setMappingSearchResults([]);
      return;
    }

    setMappingSearchLoading(true);
    setMappingSearchResults([]); // Clear previous results

    try {
      const schemaOption = SCHEMA_OPTIONS.find(s => s.value === mappingSearchSchema);
      let results = [];

      if (schemaOption?.apiEnabled && mappingSearchSchema === 'bSDD') {
        // Use bSDD API
        try {
          results = await searchBsdd(mappingSearchQuery, mappingSearchType);
        } catch (apiError) {
          console.error('bSDD API error:', apiError);
          results = [];
        }
      } else if (schemaOption?.searchable) {
        // Use local schema data
        try {
          results = searchSchema(mappingSearchSchema, mappingSearchQuery, mappingSearchType);
        } catch (searchError) {
          console.error('Local schema search error:', searchError);
          results = [];
        }
      } else {
        console.warn(`Schema ${mappingSearchSchema} is not searchable`);
        results = [];
      }

      // Ensure results is always an array with valid, normalized items
      const validResults = Array.isArray(results)
        ? results
            .filter(r => r && typeof r === 'object')
            .map(r => ({
              name: r.name || r.code || 'Unknown',
              code: r.code || r.name || '',
              description: r.description || '',
              category: r.category || mappingSearchSchema,
              uri: r.uri || '',
              score: typeof r.score === 'number' ? r.score : 1,
              matchType: r.matchType || 'exact'
            }))
            .filter(r => r.name && r.name !== 'Unknown')
        : [];

      setMappingSearchResults(validResults);
    } catch (error) {
      console.error('Mapping search error:', error);
      setMappingSearchResults([]);
    } finally {
      setMappingSearchLoading(false);
    }
  }, [mappingSearchQuery, mappingSearchSchema, mappingSearchType]);

  // Select a search result and apply to mapping
  const handleSelectMappingResult = (result) => {
    if (!mappingSearchUnitId) return;

    // Check if this is a classification system (code-based naming)
    const isClassification = ['UniFormat', 'OmniClass', 'MasterFormat'].includes(mappingSearchSchema);

    // Add a new mapping with the selected result
    // For classification systems, use code as the name; for IFC/CityGML use the element name
    const newMapping = {
      id: uuid(),
      basis: mappingSearchSchema,
      name: isClassification ? (result.code || result.name) : (result.name || result.code),
      description: isClassification ? (result.name || result.description) : (result.description || ''),
      uri: result.uri || '',
      category: result.category || ''
    };

    const addRecursive = (units) => units.map(u =>
      u.id === mappingSearchUnitId
        ? { ...u, correspondingExternalElements: [...(u.correspondingExternalElements || []), newMapping] }
        : { ...u, subInformationUnits: addRecursive(u.subInformationUnits || []) }
    );
    onChange({ ...erData, informationUnits: addRecursive(erData?.informationUnits || []) });

    // Close search modal
    setShowMappingSearch(false);
    setMappingSearchUnitId(null);
    setMappingSearchQuery('');
    setMappingSearchResults([]);
  };

  // Open Sub-ER selection modal
  const openSubERModal = () => {
    setSubERModalTab('current');
    setShowSubERModal(true);
  };

  // Add Sub-ER from current IDM ERs
  const handleAddSubERFromCurrent = (sourceDataObjectId, sourceER) => {
    const newSubER = {
      id: uuid(),
      name: sourceER.name || '(linked from ' + sourceDataObjectId + ')',
      description: sourceER.description || '',
      informationUnits: JSON.parse(JSON.stringify(sourceER.informationUnits || [])), // Deep copy
      linkedTo: sourceDataObjectId,
      sourceERId: sourceER.id
    };
    onChange({
      ...erData,
      subERs: [...(erData?.subERs || []), newSubER]
    });
    setShowSubERModal(false);
  };

  // Import erXML file as Sub-ER
  const handleImportSubERFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        let importedER = null;

        // Try to parse as JSON first (erxml in JSON format)
        try {
          importedER = JSON.parse(content);
        } catch {
          // Try to parse as XML
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, 'text/xml');

          // Extract ER data from XML
          const erElement = xmlDoc.querySelector('er');
          if (erElement) {
            const specId = erElement.querySelector('specId');
            importedER = {
              id: specId?.getAttribute('guid') || uuid(),
              name: specId?.getAttribute('shortTitle') || specId?.getAttribute('fullTitle') || file.name.replace(/\.(er)?xml$/i, ''),
              description: erElement.querySelector('description')?.textContent || '',
              informationUnits: []
            };

            // Parse information units
            const infoUnits = erElement.querySelectorAll(':scope > informationUnit');
            infoUnits.forEach(iu => {
              importedER.informationUnits.push(parseInformationUnitXml(iu));
            });
          }
        }

        if (importedER) {
          const newSubER = {
            id: uuid(),
            name: importedER.name || 'Imported Sub-ER',
            description: importedER.description || '',
            informationUnits: importedER.informationUnits || [],
            linkedTo: 'imported',
            sourceFile: file.name
          };
          onChange({
            ...erData,
            subERs: [...(erData?.subERs || []), newSubER]
          });
          setShowSubERModal(false);
        } else {
          alert('Could not parse the erXML file. Please ensure it is a valid ER specification.');
        }
      } catch (err) {
        console.error('Failed to import erXML:', err);
        alert('Failed to import erXML file: ' + err.message);
      }
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
  };

  // Helper to parse information unit from XML
  const parseInformationUnitXml = (iuElement) => {
    const unit = {
      id: iuElement.getAttribute('id') || uuid(),
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
        id: uuid(),
        basis: m.getAttribute('basis') || 'IFC',
        name: m.getAttribute('name') || ''
      });
    });

    // Parse sub information units (recursive)
    const subUnits = iuElement.querySelectorAll(':scope > subInformationUnit > informationUnit');
    subUnits.forEach(su => {
      unit.subInformationUnits.push(parseInformationUnitXml(su));
    });

    return unit;
  };

  // Render Information Unit (recursive)
  const renderUnit = (unit, depth = 0) => {
    const isExpanded = expandedUnits[unit.id] !== false;
    const hasSubUnits = (unit.subInformationUnits || []).length > 0;
    const hasImages = (unit.exampleImages || []).length > 0;

    return (
      <div key={unit.id} className={`er-unit ${depth > 0 ? 'er-unit-nested' : ''}`}>
        <div className="er-unit-card">
          <div className="er-unit-header" onClick={() => toggleUnit(unit.id)}>
            <div className="er-unit-header-left">
              <span className={`er-unit-chevron ${isExpanded ? 'expanded' : ''}`}>
                <ChevronRightIcon size={14} />
              </span>
              <span className="er-unit-id">{unit.id.slice(0, 8)}...</span>
              <span className="er-unit-name">{unit.name || '(unnamed)'}</span>
              {unit.isMandatory && <span className="er-unit-required">Required</span>}
              {hasImages && <span className="er-unit-has-images">{unit.exampleImages.length} img</span>}
            </div>
            <div className="er-unit-header-right">
              <button className="er-unit-btn" onClick={(e) => { e.stopPropagation(); addInformationUnit(unit.id); }} title="Add sub-unit">
                <AddIcon size={16} />
              </button>
              <button className="er-unit-btn er-unit-btn-danger" onClick={(e) => { e.stopPropagation(); removeUnit(unit.id); }} title="Delete">
                <DeleteIcon size={16} />
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="er-unit-content">
              <div className="er-field-row">
                <input type="text" value={unit.name || ''} onChange={(e) => updateUnit(unit.id, { name: e.target.value })} placeholder="Information Unit Name *" className="er-input" />
                <div className="er-datatype-field">
                  <select
                    value={DATA_TYPES.includes(unit.dataType) ? unit.dataType : 'Other'}
                    onChange={(e) => {
                      if (e.target.value !== 'Other') {
                        updateUnit(unit.id, { dataType: e.target.value });
                      } else {
                        updateUnit(unit.id, { dataType: '' });
                      }
                    }}
                    className="er-select"
                  >
                    {DATA_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                    <option value="Other">Other (specify)</option>
                  </select>
                  {!DATA_TYPES.includes(unit.dataType) && (
                    <input
                      type="text"
                      value={unit.dataType || ''}
                      onChange={(e) => updateUnit(unit.id, { dataType: e.target.value })}
                      placeholder="Specify data type..."
                      className="er-input er-input-datatype"
                    />
                  )}
                </div>
              </div>

              <label className="er-checkbox">
                <input type="checkbox" checked={unit.isMandatory || false} onChange={(e) => updateUnit(unit.id, { isMandatory: e.target.checked })} />
                <span>Mandatory</span>
              </label>

              <div className="er-field">
                <label>Definition</label>
                <textarea value={unit.definition || ''} onChange={(e) => updateUnit(unit.id, { definition: e.target.value })} placeholder="Describe this information unit..." rows={2} className="er-textarea" />
              </div>

              <div className="er-examples-section">
                <label>Examples</label>
                <input type="text" value={unit.examples || ''} onChange={(e) => updateUnit(unit.id, { examples: e.target.value })} placeholder="e.g., Wall-001, Level-1" className="er-input" />
                
                <div className="er-images-section">
                  <div className="er-images-header">
                    <span>Example Images</span>
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} ref={el => fileInputRefs.current[unit.id] = el} onChange={(e) => handleImageUpload(unit.id, e)} />
                    <button className="er-link-btn" onClick={() => fileInputRefs.current[unit.id]?.click()}>+ Add Image</button>
                  </div>
                  
                  {hasImages ? (
                    <div className="er-image-grid">
                      {(unit.exampleImages || []).map(img => (
                        <div key={img.id} className="er-image-item">
                          <img src={img.data} alt={img.name} className="er-image-preview" />
                          <div className="er-image-overlay">
                            <span className="er-image-name" title={img.name}>{img.name}</span>
                            <button className="er-image-remove" onClick={() => removeImage(unit.id, img.id)} title="Remove">×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="er-empty">No images added</p>
                  )}
                </div>
              </div>

              <div className="er-mappings">
                <div className="er-mappings-header">
                  <span><LinkIcon size={14} /> External Mappings</span>
                  <button className="er-link-btn" onClick={() => addMapping(unit.id)}>+ Add Mapping</button>
                </div>
                {(unit.correspondingExternalElements || []).length === 0 ? (
                  <p className="er-empty">No mappings defined</p>
                ) : (
                  <div className="er-mapping-list">
                    {(unit.correspondingExternalElements || []).map(mapping => {
                      const schemaOption = SCHEMA_OPTIONS.find(s => s.value === mapping.basis);
                      const isSearchable = schemaOption?.searchable && mapping.basis !== 'Other';
                      const isOther = mapping.basis === 'Other';
                      // Check if this is a classification system (has code-based naming)
                      const isClassification = ['UniFormat', 'OmniClass', 'MasterFormat'].includes(mapping.basis);
                      return (
                        <div key={mapping.id} className={`er-mapping-row ${isOther ? 'er-mapping-row-other' : ''}`}>
                          <select
                            value={mapping.basis || 'IFC 4x3 ADD2'}
                            onChange={(e) => {
                              // Keep customBasis when switching to Other, clear otherwise
                              const newBasis = e.target.value;
                              if (newBasis === 'Other') {
                                updateMapping(unit.id, mapping.id, { basis: newBasis });
                              } else {
                                updateMapping(unit.id, mapping.id, { basis: newBasis, name: '', description: '', customBasis: '' });
                              }
                            }}
                            className="er-select-small er-select-schema"
                          >
                            {SCHEMA_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          {isOther && (
                            <input
                              type="text"
                              value={mapping.customBasis || ''}
                              onChange={(e) => updateMapping(unit.id, mapping.id, { customBasis: e.target.value })}
                              placeholder="Standard name (e.g., COBie)"
                              className="er-input-small er-input-custom-schema"
                            />
                          )}
                          <div className="er-mapping-value">
                            <input
                              type="text"
                              value={mapping.name || ''}
                              onChange={(e) => updateMapping(unit.id, mapping.id, { name: e.target.value })}
                              placeholder={isOther ? "Element name" : (isSearchable ? "Click search or enter manually" : "Enter element name")}
                              className="er-input-small er-input-mapping"
                              title={mapping.description || mapping.name || ''}
                            />
                            {mapping.description && isClassification && (
                              <span className="er-mapping-desc" title={mapping.description}>
                                {mapping.description}
                              </span>
                            )}
                          </div>
                          {isSearchable && (
                            <button
                              className="er-search-btn"
                              onClick={() => openMappingSearch(unit.id, mapping.basis)}
                              title="Search schema"
                            >
                              <SearchIcon size={14} />
                            </button>
                          )}
                          <button className="er-remove-btn" onClick={() => removeMapping(unit.id, mapping.id)}>×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {isExpanded && hasSubUnits && (
          <div className="er-sub-units">
            {(unit.subInformationUnits || []).map(sub => renderUnit(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Count functions
  const countUnits = (units) => {
    let count = units.length;
    units.forEach(u => { if (u.subInformationUnits) count += countUnits(u.subInformationUnits); });
    return count;
  };
  
  const countImages = (units) => {
    let count = 0;
    units.forEach(u => {
      count += (u.exampleImages || []).length;
      if (u.subInformationUnits) count += countImages(u.subInformationUnits);
    });
    return count;
  };
  
  const totalUnits = countUnits(erData?.informationUnits || []);
  const totalImages = countImages(erData?.informationUnits || []);

  // Count ERs in the project
  const erCount = Object.keys(erDataMap).length;

  // List View: Show all ERs in project
  if (mode === 'list') {
    return (
      <div className="er-panel">
        {/* Header */}
        <div className="er-panel-header">
          <div className="er-panel-title">
            <span className="er-title-icon"><DataObjectIcon size={20} /></span>
            <div>
              <h3>Exchange Requirements</h3>
              <p className="er-data-object-name">{erCount} ER(s) in project</p>
            </div>
          </div>
          <button className="er-close-btn" onClick={onClose}><CloseIcon size={16} /></button>
        </div>

        {/* ER List */}
        <div className="er-list-container">
          {erCount === 0 ? (
            <div className="er-empty-state">
              <DataObjectIcon size={32} />
              <p>No Exchange Requirements defined</p>
              <span className="er-hint">Double-click a Data Object in the diagram to create an ER</span>
            </div>
          ) : (
            <div className="er-list">
              {Object.entries(erDataMap).map(([dataObjectId, er]) => {
                const unitCount = countUnits(er.informationUnits || []);
                return (
                  <div
                    key={dataObjectId}
                    className="er-list-item"
                    onClick={() => onSelectER && onSelectER(dataObjectId)}
                  >
                    <div className="er-list-item-icon">
                      <DataObjectIcon size={18} />
                    </div>
                    <div className="er-list-item-content">
                      <div className="er-list-item-name">{er.name || '(unnamed ER)'}</div>
                      <div className="er-list-item-meta">
                        <span className="er-list-item-do">Data Object: {dataObjectId}</span>
                        <span className="er-list-item-units">{unitCount} unit(s)</span>
                      </div>
                    </div>
                    <div className="er-list-item-arrow">
                      <ChevronRightIcon size={16} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="er-panel-footer">
          <span>{erCount} ER(s) defined</span>
          <span className="er-iso-ref">ISO 29481-3</span>
        </div>
      </div>
    );
  }

  // Detail View: Edit individual ER
  // If no dataObject is selected in detail mode, show empty state
  if (!dataObject) {
    return (
      <div className="er-panel">
        <div className="er-panel-header">
          <div className="er-panel-title">
            <span className="er-title-icon"><DataObjectIcon size={20} /></span>
            <div>
              <h3>Individual Exchange Requirement</h3>
              <p className="er-data-object-name">No Data Object selected</p>
            </div>
          </div>
          <button className="er-close-btn" onClick={onClose}><CloseIcon size={16} /></button>
        </div>
        <div className="er-list-container">
          <div className="er-empty-state">
            <DataObjectIcon size={32} />
            <p>Select a Data Object</p>
            <span className="er-hint">Double-click a Data Object in the diagram or select from the ER list</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="er-panel">
      {/* Header */}
      <div className="er-panel-header">
        <div className="er-panel-title">
          <span className="er-title-icon"><DataObjectIcon size={20} /></span>
          <div>
            <h3>Individual Exchange Requirement</h3>
            <p className="er-data-object-name">{erData?.name || dataObject?.name || '(Unnamed ER)'}</p>
          </div>
        </div>
        <div className="er-header-right">
          <span className={`er-save-status er-save-status-${saveStatus}`}>
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'saving' && '↻ Saving...'}
            {saveStatus === 'unsaved' && '○ Unsaved'}
          </span>
          <button className="er-close-btn" onClick={onClose}><CloseIcon size={16} /></button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="er-actions">
        <button
          className={`er-action-btn ${saveStatus === 'saved' ? 'er-action-btn-saved' : 'er-action-btn-primary'}`}
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
        >
          <SaveIcon size={14} /> {saveStatus === 'saved' ? 'Saved' : 'Save ER'}
        </button>
        <button className="er-action-btn" onClick={handleSaveAs}>
          <CopyIcon size={14} /> Export ER
        </button>
        <button className="er-action-btn" onClick={() => { setSelectedUnitForSubER(null); setShowLibrary(true); }}>
          <LibraryIcon size={14} /> Import ER
        </button>
      </div>

      {/* ER Basic Info */}
      <div className="er-basic-info">
        <div className="er-field">
          <label>ER Name</label>
          <input type="text" value={erData?.name || ''} onChange={(e) => onChange({ ...erData, name: e.target.value })} placeholder="e.g., Design Model Exchange" className="er-input" />
        </div>
        <div className="er-field">
          <label>Description</label>
          <textarea value={erData?.description || ''} onChange={(e) => onChange({ ...erData, description: e.target.value })} placeholder="Describe the exchange requirement..." rows={2} className="er-textarea" />
        </div>
      </div>

      {/* Information Units */}
      <div className="er-units-section">
        <div className="er-units-header">
          <h4>Information Units</h4>
          <button className="er-add-btn" onClick={() => addInformationUnit()}>+ Add Unit</button>
        </div>
        <div className="er-units-list">
          {(erData?.informationUnits || []).length === 0 ? (
            <div className="er-empty-state">
              <InfoUnitIcon size={32} />
              <p>No information units defined</p>
              <span className="er-hint">Click "Add Unit" to start</span>
            </div>
          ) : (
            (erData?.informationUnits || []).map(unit => renderUnit(unit))
          )}
        </div>
      </div>

      {/* Sub-ER Section (Collapsible) */}
      <div className="er-sub-er-section">
        <div
          className="er-sub-er-header"
          onClick={() => setShowSubERSection(!showSubERSection)}
        >
          <div className="er-sub-er-header-left">
            <span className={`er-sub-er-chevron ${showSubERSection ? 'expanded' : ''}`}>
              <ChevronRightIcon size={14} />
            </span>
            <span className="er-sub-er-title"><LinkIcon size={14} /> Sub-ERs</span>
          </div>
          <div className="er-sub-er-header-right" onClick={(e) => e.stopPropagation()}>
            <button
              className="er-sub-er-add-btn"
              onClick={openSubERModal}
              title="Add Sub-ER from current IDM or import erXML"
            >
              <AddIcon size={14} />
            </button>
            <span className="er-sub-er-count">
              {(erData?.subERs || []).length}
            </span>
          </div>
        </div>
        {showSubERSection && (
          <div className="er-sub-er-content">
            {(erData?.subERs || []).length === 0 ? (
              <div className="er-sub-er-empty">
                <p>No Sub-ERs linked</p>
                <span className="er-hint">Click + to add a Sub-ER from current IDM or import from erXML</span>
              </div>
            ) : (
              <div className="er-sub-er-list">
                {(erData?.subERs || []).map((subER, idx) => (
                  <div key={subER.id || idx} className="er-sub-er-item">
                    <div className="er-sub-er-item-icon">
                      <DataObjectIcon size={16} />
                    </div>
                    <div className="er-sub-er-item-content">
                      <div className="er-sub-er-item-name">{subER.name || '(unnamed Sub-ER)'}</div>
                      <div className="er-sub-er-item-meta">
                        {countUnits(subER.informationUnits || [])} unit(s)
                        {subER.linkedTo && <span> • Linked to: {subER.linkedTo}</span>}
                      </div>
                    </div>
                    <button
                      className="er-sub-er-remove"
                      onClick={() => {
                        const updatedSubERs = (erData?.subERs || []).filter((_, i) => i !== idx);
                        onChange({ ...erData, subERs: updatedSubERs });
                      }}
                      title="Remove Sub-ER"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="er-panel-footer">
        <span>{totalUnits} unit(s), {totalImages} image(s)</span>
        <span className="er-iso-ref">ISO 29481-3</span>
      </div>

      {/* Library Modal (Import ER) */}
      {showLibrary && (
        <div className="er-modal-overlay" onClick={() => setShowLibrary(false)}>
          <div className="er-modal" onClick={(e) => e.stopPropagation()}>
            <div className="er-modal-header">
              <h3>{selectedUnitForSubER ? 'Add Sub-ER' : 'Import ER'}</h3>
              <button className="er-close-btn" onClick={() => setShowLibrary(false)}><CloseIcon size={16} /></button>
            </div>
            <div className="er-modal-body">
              <p className="er-modal-instruction">Select an ER from the library or import from an erXML file.</p>
              {erLibrary.length === 0 ? (
                <div className="er-empty-state">
                  <LibraryIcon size={32} />
                  <p>ER Library is empty</p>
                  <span className="er-hint">Save ERs to add them to the library, or import from erXML file</span>
                </div>
              ) : (
                <div className="er-library-list">
                  {erLibrary.map(er => (
                    <div key={er.id} className="er-library-item" onClick={() => handleLoadSubER(er)}>
                      <div className="er-library-item-name">{er.name || '(unnamed)'}</div>
                      <div className="er-library-item-info">
                        {countUnits(er.informationUnits || [])} units
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export ER Dialog */}
      {showSaveAsDialog && (
        <div className="er-modal-overlay" onClick={() => setShowSaveAsDialog(false)}>
          <div className="er-modal er-modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="er-modal-header">
              <h3>Export ER</h3>
              <button className="er-close-btn" onClick={() => setShowSaveAsDialog(false)}><CloseIcon size={16} /></button>
            </div>
            <div className="er-modal-body">
              <p className="er-modal-instruction">Export this Exchange Requirement to an erXML file. Select a folder to save the file.</p>
              <div className="er-field">
                <label>ER Name for Export</label>
                <input type="text" value={saveAsName} onChange={(e) => setSaveAsName(e.target.value)} placeholder="Enter ER name..." className="er-input" autoFocus />
              </div>
            </div>
            <div className="er-modal-footer">
              <button className="er-action-btn" onClick={() => setShowSaveAsDialog(false)}>Cancel</button>
              <button className="er-action-btn er-action-btn-primary" onClick={confirmSaveAs} disabled={!saveAsName.trim()}>Export</button>
            </div>
          </div>
        </div>
      )}

      {/* Mapping Search Modal */}
      {showMappingSearch && (
        <div className="er-modal-overlay" onClick={() => setShowMappingSearch(false)}>
          <div className="er-modal er-modal-search" onClick={(e) => e.stopPropagation()}>
            <div className="er-modal-header">
              <h3>Search Matching External Information Item</h3>
              <button className="er-close-btn" onClick={() => setShowMappingSearch(false)}><CloseIcon size={16} /></button>
            </div>
            <div className="er-modal-body">
              {/* Schema Selection */}
              <div className="er-search-controls">
                <div className="er-field er-field-inline">
                  <label>Schema</label>
                  <select
                    value={mappingSearchSchema}
                    onChange={(e) => {
                      setMappingSearchSchema(e.target.value);
                      setMappingSearchResults([]);
                    }}
                    className="er-select er-select-schema-search"
                  >
                    {SCHEMA_OPTIONS.filter(opt => opt.searchable).map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}{opt.apiEnabled ? ' (API)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Match Type */}
                <div className="er-field er-field-inline">
                  <label>Match Type</label>
                  <div className="er-match-type-toggle">
                    <button
                      className={`er-match-type-btn ${mappingSearchType === 'exact' ? 'active' : ''}`}
                      onClick={() => setMappingSearchType('exact')}
                    >
                      Exact Match
                    </button>
                    <button
                      className={`er-match-type-btn ${mappingSearchType === 'semantic' ? 'active' : ''}`}
                      onClick={() => setMappingSearchType('semantic')}
                    >
                      Semantic Match
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Input */}
              <div className="er-search-input-row">
                <input
                  type="text"
                  value={mappingSearchQuery}
                  onChange={(e) => setMappingSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleMappingSearch()}
                  placeholder={`Search ${mappingSearchSchema} elements...`}
                  className="er-input er-input-search"
                  autoFocus
                />
                <button
                  className="er-action-btn er-action-btn-primary"
                  onClick={handleMappingSearch}
                  disabled={mappingSearchLoading || !mappingSearchQuery.trim()}
                >
                  {mappingSearchLoading ? '...' : <><SearchIcon size={14} /> Search</>}
                </button>
              </div>

              {/* Search Results */}
              <div className="er-search-results">
                {mappingSearchLoading ? (
                  <div className="er-search-loading">
                    <span>Searching...</span>
                  </div>
                ) : mappingSearchResults.length === 0 ? (
                  <div className="er-search-empty">
                    {mappingSearchQuery.trim() ? (
                      <span>No results found. Try a different search term.</span>
                    ) : (
                      <span>Enter a search term to find elements</span>
                    )}
                  </div>
                ) : (
                  <div className="er-search-result-list">
                    {mappingSearchResults.map((result, idx) => (
                      <div
                        key={`${result.code || result.name}-${idx}`}
                        className="er-search-result-item"
                        onClick={() => handleSelectMappingResult(result)}
                      >
                        <div className="er-search-result-header">
                          <span className="er-search-result-name">{result.name}</span>
                          {result.code && result.code !== result.name && (
                            <span className="er-search-result-code">{result.code}</span>
                          )}
                          {result.score && result.matchType === 'semantic' && (
                            <span className="er-search-result-score">
                              {Math.round(result.score * 100)}%
                            </span>
                          )}
                        </div>
                        {result.description && (
                          <p className="er-search-result-desc">{result.description}</p>
                        )}
                        {result.category && (
                          <span className="er-search-result-category">{result.category}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-ER Selection Modal */}
      {showSubERModal && (
        <div className="er-modal-overlay" onClick={() => setShowSubERModal(false)}>
          <div className="er-modal er-modal-sub-er" onClick={(e) => e.stopPropagation()}>
            <div className="er-modal-header">
              <h3>Add Sub-ER</h3>
              <button className="er-close-btn" onClick={() => setShowSubERModal(false)}><CloseIcon size={16} /></button>
            </div>

            {/* Tabs */}
            <div className="er-sub-er-tabs">
              <button
                className={`er-sub-er-tab ${subERModalTab === 'current' ? 'active' : ''}`}
                onClick={() => setSubERModalTab('current')}
              >
                <DataObjectIcon size={14} /> Current IDM
              </button>
              <button
                className={`er-sub-er-tab ${subERModalTab === 'import' ? 'active' : ''}`}
                onClick={() => setSubERModalTab('import')}
              >
                <ImportIcon size={14} /> Import erXML
              </button>
            </div>

            <div className="er-modal-body">
              {/* Current IDM Tab */}
              {subERModalTab === 'current' && (
                <div className="er-sub-er-current">
                  {Object.keys(erDataMap).length === 0 ? (
                    <div className="er-empty-state">
                      <DataObjectIcon size={32} />
                      <p>No ERs in current IDM</p>
                      <span className="er-hint">Create ERs by double-clicking Data Objects in the diagram</span>
                    </div>
                  ) : Object.entries(erDataMap).filter(([doId]) => doId !== dataObject?.id).length === 0 ? (
                    <div className="er-empty-state">
                      <DataObjectIcon size={32} />
                      <p>No other ERs available</p>
                      <span className="er-hint">This is the only ER in the current IDM specification</span>
                    </div>
                  ) : (
                    <div className="er-sub-er-list-select">
                      <p className="er-sub-er-instruction">Select an ER to link as Sub-ER:</p>
                      {Object.entries(erDataMap)
                        .filter(([doId]) => doId !== dataObject?.id) // Exclude current ER
                        .map(([doId, er]) => (
                          <div
                            key={doId}
                            className="er-sub-er-select-item"
                            onClick={() => handleAddSubERFromCurrent(doId, er)}
                          >
                            <div className="er-sub-er-select-icon">
                              <DataObjectIcon size={18} />
                            </div>
                            <div className="er-sub-er-select-content">
                              <div className="er-sub-er-select-name">{er.name || '(unnamed ER)'}</div>
                              <div className="er-sub-er-select-meta">
                                <span>Data Object: {doId}</span>
                                <span>{countUnits(er.informationUnits || [])} unit(s)</span>
                              </div>
                            </div>
                            <div className="er-sub-er-select-arrow">
                              <ChevronRightIcon size={16} />
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Import erXML Tab */}
              {subERModalTab === 'import' && (
                <div className="er-sub-er-import">
                  <div className="er-import-dropzone">
                    <ImportIcon size={32} />
                    <p>Import ER from erXML file</p>
                    <span className="er-hint">Supports ISO 29481-3 erXML format and JSON</span>
                    <input
                      type="file"
                      accept=".xml,.erxml,.json"
                      ref={erXmlFileRef}
                      onChange={handleImportSubERFile}
                      style={{ display: 'none' }}
                    />
                    <button
                      className="er-action-btn er-action-btn-primary"
                      onClick={() => erXmlFileRef.current?.click()}
                    >
                      <ImportIcon size={14} /> Browse Files
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ERPanel;
