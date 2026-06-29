import React, { useState, useRef, useCallback, useEffect, useMemo, Component } from 'react';
import './ERPanel.css';
import { searchSchema, searchSchemaGrouped, searchBsdd, fetchBsddClassProperties, getAvailableSchemas, isSchemaSearchable, RateLimitError } from '../../utils/schemaSearch';
import { getBsddCacheState, initBsddCache } from '../../utils/bsddCache';
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
  ChevronLeftIcon,
  FolderIcon,
  DocumentIcon,
  IndentIcon,
  ExpandAllIcon,
  CollapseAllIcon,
  TogglePanelIcon
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

// Error Boundary to catch silent render crashes in the search modal
class SearchErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('SearchErrorBoundary caught:', error, info?.componentStack);
    if (this.props.onError) this.props.onError(error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="er-modal-overlay">
          <div className="er-modal" style={{ maxWidth: '400px' }}>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Search encountered an error</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1rem' }}>{this.state.error?.message || 'An unexpected error occurred'}</p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button
                  className="er-action-btn"
                  onClick={() => this.setState({ hasError: false, error: null })}
                >
                  Retry
                </button>
                <button
                  className="er-action-btn"
                  onClick={() => { this.setState({ hasError: false, error: null }); if (this.props.onClose) this.props.onClose(); }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// External schema options (with search support)
const SCHEMA_OPTIONS = [
  { value: 'bSDD', label: 'bSDD', searchable: true, apiEnabled: true },
  { value: 'IFC 2x3', label: 'IFC 2x3', searchable: true },
  { value: 'IFC 4x3 ADD2', label: 'IFC 4x3 ADD2', searchable: true },
  { value: 'CityGML', label: 'CityGML', searchable: true },
  { value: 'UniFormat', label: 'UniFormat', searchable: true },
  { value: 'OmniClass', label: 'OmniClass', searchable: true },
  { value: 'MasterFormat', label: 'MasterFormat', searchable: true },
  { value: 'Other', label: 'Other', searchable: false }
];

// Generate unique ID
const uuid = () => crypto.randomUUID?.() || `IU-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Auto-resize a textarea to fit its content.
 */
const autoResizeTextarea = (textarea) => {
  if (!textarea) return;
  textarea.style.height = 'auto';
  const minHeight = 40;
  const maxHeight = 300;
  textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)}px`;
};

/**
 * Compact definition field with figure upload support.
 * Used for ER descriptions and IU definitions.
 */
const DefinitionWithFigures = ({ value, figures = [], onChange, onFiguresChange, onBlur, placeholder, rows = 4, label = 'Definition', className = 'er-textarea' }) => {
  const fileRef = React.useRef(null);
  const textareaRef = React.useRef(null);

  const handleFileChange = (e) => {
    Array.from(e.target.files || []).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        onFiguresChange?.([...figures, {
          id: `fig-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: file.name,
          caption: '',
          data: ev.target.result,
          type: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  return (
    <div className="er-def-with-figures">
      <div className="er-def-header">
        <label>{label}</label>
        <button type="button" className="er-fig-add-btn" onClick={() => fileRef.current?.click()} title="Add figure">
          <AddIcon size={10} /> Fig
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />
      </div>
      <textarea
        ref={textareaRef}
        value={value || ''}
        onChange={(e) => {
          onChange(e.target.value);
          autoResizeTextarea(e.target);
        }}
        onBlur={onBlur}
        onFocus={(e) => autoResizeTextarea(e.target)}
        placeholder={placeholder}
        rows={rows}
        className={className}
        style={{ overflow: 'hidden' }}
      />
      {figures.length > 0 && (
        <div className="er-def-figures">
          {figures.map((fig, i) => (
            <div key={fig.id} className="er-def-figure-item">
              {fig.data ? (
                <img src={fig.data} alt={fig.caption || fig.name} className="er-def-figure-img" />
              ) : (
                <div className="er-def-figure-placeholder">{fig.name || 'Image'}</div>
              )}
              <div className="er-def-figure-controls">
                <input
                  type="text"
                  value={fig.caption || ''}
                  onChange={(e) => onFiguresChange?.(figures.map(f => f.id === fig.id ? { ...f, caption: e.target.value } : f))}
                  placeholder={`Figure ${i + 1} caption...`}
                  className="er-def-figure-caption"
                />
                <button type="button" className="er-def-figure-remove" onClick={() => onFiguresChange?.(figures.filter(f => f.id !== fig.id))} title="Remove">x</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * ER Panel Component - ER-First Hierarchical Tree View
 * Exchange Requirement editor with hierarchical tree structure
 * ER-first architecture: erHierarchy is the source of truth
 * ISO 29481-3 compliant
 */
const ERPanel = ({
  // ER-First architecture props (new)
  erHierarchy = [],              // Full hierarchical array of ERs (source of truth)
  selectedErId = null,           // Currently selected ER ID
  onSelectER,                    // Callback to select an ER
  onUpdateER,                    // Callback to update ER data
  onAddER,                       // Callback to add new root ER
  onDeleteER,                    // Callback to delete ER
  onMoveUp,                      // Callback to move ER up
  onMoveDown,                    // Callback to move ER down
  onIndent,                      // Callback to indent ER (make sub-ER)
  onOutdent,                     // Callback to outdent ER (promote)
  onMoveERAsSubER,               // Callback to move ER as sub-ER of another ER
  newlyAddedErId = null,         // ID of newly added ER (for scrolling)
  onClearNewlyAddedErId,         // Callback to clear newly added ER ID after scrolling

  // Legacy props (for backward compatibility during migration)
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
  onModeChange,
  onClose,
  showBpmnEditor = true,
  onToggleBpmn
}) => {
  // Determine if using ER-first mode or legacy mode
  // ER-first mode is active when we have an ER hierarchy OR when a specific ER is selected
  const isErFirstMode = (erHierarchy?.length ?? 0) > 0 || selectedErId !== null;

  // Tree table state
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedItem, setSelectedItem] = useState(null);
  // View mode toggle: 'tree' or 'table'
  const [viewMode, setViewMode] = useState('tree');

  // Legacy state for modals
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [selectedUnitForSubER, setSelectedUnitForSubER] = useState(null);
  const fileInputRefs = useRef({});

  // External mapping search state
  const [showMappingSearch, setShowMappingSearch] = useState(false);
  const [mappingSearchUnitId, setMappingSearchUnitId] = useState(null);
  const [mappingSearchMappingId, setMappingSearchMappingId] = useState(null);  // ID of existing mapping to update (null = add new)
  const [mappingSearchSchema, setMappingSearchSchema] = useState('bSDD');
  const [mappingSearchQuery, setMappingSearchQuery] = useState('');
  const [mappingSearchType, setMappingSearchType] = useState('exact');
  const [mappingSearchResults, setMappingSearchResults] = useState([]);
  const [mappingSearchGroups, setMappingSearchGroups] = useState([]); // [{classCode, className, classUri, resultType, properties:[]}]
  const [expandedGroups, setExpandedGroups] = useState(new Set()); // classUris currently expanded
  const [mappingDrilldownClass, setMappingDrilldownClass] = useState(null); // { name, uri } when browsing class properties
  const [mappingDrilldownFilter, setMappingDrilldownFilter] = useState('');
  const [mappingSearchLoading, setMappingSearchLoading] = useState(false);
  const [mappingSearchStep, setMappingSearchStep] = useState(null); // 'classes' | 'properties' | null
  const [mappingSearchError, setMappingSearchError] = useState(null);
  const [mappingSearchRateLimited, setMappingSearchRateLimited] = useState(false);
  const [mappingSearchNote, setMappingSearchNote] = useState(null); // advisory hint (not an error)
  const [bsddCacheInfo, setBsddCacheInfo] = useState(getBsddCacheState);
  const [drilldownCountdown, setDrilldownCountdown] = useState(null); // seconds remaining until auto-retry
  const drilldownRetryTimerRef = useRef(null); // { intervalId, timeoutId }
  const drilldownRetryClassRef = useRef(null); // classResult to retry (drilldown path)
  const rateLimitRetryFnRef = useRef(null); // generic retry callback (both drilldown and search paths)
  const rateLimitRetryCountRef = useRef(0); // number of auto-retries attempted; reset on new search
  const [selectedSearchResult, setSelectedSearchResult] = useState(null); // Highlighted result (click to preview, Apply to confirm)
  const [searchClosedUnexpectedly, setSearchClosedUnexpectedly] = useState(false);

  // AbortController ref for cancelling in-flight search requests
  const searchAbortControllerRef = useRef(null);
  // Request counter to guard against stale responses
  const searchRequestIdRef = useRef(0);
  const mappingSearchIuNameRef = useRef('');

  // Sub-ER selection modal state
  const [showSubERModal, setShowSubERModal] = useState(false);
  const [subERModalTab, setSubERModalTab] = useState('current');
  const erXmlFileRef = useRef(null);

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState('saved');
  const saveTimerRef = useRef(null);
  const prevDataObjectIdRef = useRef(null);

  // Refs for scrolling to newly added items
  const treeRowRefs = useRef({});
  const detailPanelRef = useRef(null);

  // Ref for newly added mapping (for auto-scroll and focus)
  const newlyAddedMappingRef = useRef(null);
  const mappingInputRefs = useRef({});

  // Detail panel resize state (proportion-based)
  const [detailPanelRatio, setDetailPanelRatio] = useState(0.5);
  const resizingRef = useRef(false);
  const resizeStartYRef = useRef(0);
  const resizeStartRatioRef = useRef(0);
  const panelContainerRef = useRef(null);

  // Snapshot of selectedItem.data when first selected (for dirty detection)
  const selectedItemSnapshotRef = useRef(null);

  // Signal that a mapping was just applied via the search modal and selectedItem needs committing
  const pendingMappingCommitRef = useRef(false);

  // Always-current ref for erHierarchy — updated synchronously during render so event handlers
  // never read a stale closure capture (avoids the "first open, can't add IU" race)
  const erHierarchyRef = useRef(erHierarchy);
  erHierarchyRef.current = erHierarchy;

  // Auto-expand the selected ER and its ancestors when it changes
  // This ensures the user can see the ER's content when first selecting it
  useEffect(() => {
    if (selectedErId && erHierarchy?.length > 0) {
      // Find the path from root to the selected ER (all ancestors)
      const findPath = (hierarchy, targetId, path = []) => {
        for (const er of hierarchy) {
          if (er.id === targetId || er.guid === targetId) {
            return [...path, er.id];
          }
          if (er.subERs?.length > 0) {
            const found = findPath(er.subERs, targetId, [...path, er.id]);
            if (found) return found;
          }
        }
        return null;
      };
      const pathToSelected = findPath(erHierarchy, selectedErId);
      if (pathToSelected) {
        setExpandedNodes(prev => {
          const next = new Set(prev);
          // Expand all ancestors (not the selected ER itself, unless it has children)
          pathToSelected.forEach(id => next.add(id));
          return next;
        });
      }
    }
  }, [selectedErId, erHierarchy]);

  // Auto-scroll to selected item when it changes
  useEffect(() => {
    if (selectedItem?.id) {
      // Wait for DOM update then scroll to the element
      setTimeout(() => {
        const element = treeRowRefs.current[selectedItem.id];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        // Also scroll the detail panel to top when selection changes
        if (detailPanelRef.current) {
          detailPanelRef.current.scrollTop = 0;
        }
      }, 100);
    }
  }, [selectedItem?.id]);

  // Auto-scroll to newly added ER and select it in the detail panel
  useEffect(() => {
    if (newlyAddedErId && erHierarchy?.length > 0) {
      // Find the newly added ER in the hierarchy
      const findEr = (hierarchy, targetId) => {
        for (const er of hierarchy) {
          if (er.id === targetId) return er;
          if (er.subERs?.length > 0) {
            const found = findEr(er.subERs, targetId);
            if (found) return found;
          }
        }
        return null;
      };
      const newErData = findEr(erHierarchy, newlyAddedErId);

      // Select the newly added ER in the detail panel so users can edit it
      if (newErData) {
        selectNewItem({ id: newlyAddedErId, type: 'er', data: newErData, erParent: null });
      }

      // Wait for DOM update then scroll to the newly added ER
      setTimeout(() => {
        const element = treeRowRefs.current[newlyAddedErId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        // Clear the newly added ER ID after scrolling
        onClearNewlyAddedErId?.();
      }, 150);
    }
  }, [newlyAddedErId, erHierarchy, onClearNewlyAddedErId]);

  // Auto-scroll and focus newly added external mapping
  const [mappingScrollTrigger, setMappingScrollTrigger] = useState(0);
  useEffect(() => {
    if (newlyAddedMappingRef.current) {
      const { mappingId } = newlyAddedMappingRef.current;
      // Wait for DOM update then scroll and focus
      setTimeout(() => {
        const inputRef = mappingInputRefs.current[mappingId];
        if (inputRef) {
          inputRef.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          inputRef.focus();
        }
        newlyAddedMappingRef.current = null;
      }, 100);
    }
  }, [mappingScrollTrigger]);

  // Auto-sync ER name to BPMN diagram after changes settle (legacy mode only)
  // In ER-first mode, saves go through onUpdateER — this effect must NOT run or it will
  // overwrite erHierarchy with stale erData from erDataMap (which lacks recently added IUs).
  useEffect(() => {
    if (isErFirstMode || !erData || !onSave || !dataObject) {
      return;
    }

    if (prevDataObjectIdRef.current !== dataObject.id) {
      prevDataObjectIdRef.current = dataObject.id;
      setSaveStatus('saved');
      return;
    }

    setSaveStatus('unsaved');

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

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
  }, [isErFirstMode, erData, onSave, dataObject]);

  // Track previous dataObject ID for legacy mode transitions
  const prevDataObjectIdForSelectionRef = useRef(null);

  // Track previous selectedErId to detect actual changes
  // Initialize to undefined so first render with selectedErId will trigger sync
  const prevSelectedErIdRef = useRef(undefined);

  // Expand all nodes when data object changes (legacy mode only)
  // This effect ONLY runs for legacy mode transitions, never in ER-first mode
  useEffect(() => {
    // Always skip in ER-first mode - selectedItem is managed by the tree click handler
    if (isErFirstMode) {
      // Just update the ref without clearing anything
      prevDataObjectIdForSelectionRef.current = dataObject?.id;
      return;
    }

    // Only process if dataObject ID actually changed (legacy mode)
    if (dataObject?.id && erData && dataObject.id !== prevDataObjectIdForSelectionRef.current) {
      prevDataObjectIdForSelectionRef.current = dataObject.id;
      // Auto-expand the root ER
      const initialExpanded = new Set();
      initialExpanded.add(dataObject.id);
      setExpandedNodes(initialExpanded);
      selectedItemSnapshotRef.current = null; setSelectedItem(null);
    }
  }, [dataObject?.id, erData, isErFirstMode]);

  // Sync selectedItem.data when erHierarchy changes (e.g. new project loaded or external update).
  // If the selected ID no longer exists → clear. If it still exists and there are no uncommitted
  // edits → refresh data from hierarchy so the detail panel always reflects stored values
  // (e.g. mapping basis schema shows 'IFC 4x3 ADD2' instead of stale 'bSDD').
  useEffect(() => {
    if (!selectedItem || !isErFirstMode) return;
    const idToFind = selectedItem.id;

    // Walk hierarchy to find the node with matching id; return its data object and type
    const findInHierarchy = (items) => {
      for (const er of (items || [])) {
        if (er.id === idToFind) {
          const isTopLevel = erHierarchy.some(e => e.id === idToFind);
          return { data: er, type: isTopLevel ? 'er' : 'subEr' };
        }
        for (const iu of (er.informationUnits || [])) {
          if (iu.id === idToFind) return { data: iu, type: 'iu' };
          const inSubIus = (subIus) => {
            for (const s of subIus) {
              if (s.id === idToFind) return { data: s, type: 'iu' };
              const found = inSubIus(s.subInformationUnits || []);
              if (found) return found;
            }
            return null;
          };
          const found = inSubIus(iu.subInformationUnits || []);
          if (found) return found;
        }
        const found = findInHierarchy(er.subERs || []);
        if (found) return found;
      }
      return null;
    };

    const found = findInHierarchy(erHierarchy);
    if (!found) {
      selectedItemSnapshotRef.current = null;
      setSelectedItem(null);
    } else if (found.data !== selectedItem.data) {
      // Only refresh if there are no uncommitted edits (snapshot matches current data)
      const hasUnsaved = selectedItemSnapshotRef.current !== null &&
        JSON.stringify(selectedItem.data) !== selectedItemSnapshotRef.current;
      if (!hasUnsaved) {
        selectedItemSnapshotRef.current = JSON.stringify(found.data);
        setSelectedItem(prev => ({ ...prev, data: found.data, type: found.type }));
      }
    }
  }, [erHierarchy]);

  // Sync selectedItem when selectedErId changes (for ER-first mode)
  // This ONLY runs when selectedErId changes from external source (ContentPane or BPMN)
  // NOT when user clicks in the tree (which sets selectedItem directly via click handler)
  useEffect(() => {
    // Skip if no selectedErId or no hierarchy data yet
    if (!selectedErId || !erHierarchy?.length) {
      return;
    }

    // Only run when selectedErId actually changes from external source
    if (selectedErId === prevSelectedErIdRef.current) {
      return;
    }

    // Auto-commit pending detail panel edits before switching to new ER
    if (selectedItem && selectedItemSnapshotRef.current) {
      const currentData = JSON.stringify(selectedItem.data);
      if (currentData !== selectedItemSnapshotRef.current) {
        commitCurrentEdit();
      }
    }

    prevSelectedErIdRef.current = selectedErId;

    // Find the ER data in hierarchy
    const findEr = (hierarchy, targetId) => {
      for (const er of hierarchy) {
        if (er.id === targetId || er.guid === targetId) return er;
        if (er.subERs?.length > 0) {
          const found = findEr(er.subERs, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    const erData = findEr(erHierarchy, selectedErId);
    if (erData) {
      // Set selectedItem to show details of the selected ER
      const isTopLevel = erHierarchy.some(e => e.id === selectedErId || e.guid === selectedErId);
      const type = isTopLevel ? 'er' : 'subEr';
      selectNewItem({ id: erData.id, type, data: erData });
      // Also expand the ER node
      setExpandedNodes(prev => {
        const next = new Set(prev);
        next.add(erData.id);
        return next;
      });
    }
  }, [selectedErId, erHierarchy]);

  // ========== Tree Table Helper Functions ==========

  // Flatten the ER tree into rows for table display
  const flattenERTree = useCallback((erDataMap, currentErId, erData, expandedNodes) => {
    const rows = [];
    if (!currentErId || !erData) return rows;

    // Add root ER row
    const hasChildren = (erData.informationUnits?.length > 0) || (erData.subERs?.length > 0);
    rows.push({
      id: currentErId,
      type: 'er',
      name: erData.name || 'Unnamed ER',
      depth: 0,
      hasChildren,
      isExpanded: expandedNodes.has(currentErId),
      data: erData,
      parentId: null
    });

    if (expandedNodes.has(currentErId)) {
      // Add Information Units
      const addIURows = (units, depth, parentId) => {
        units?.forEach(iu => {
          const iuHasChildren = (iu.subInformationUnits?.length > 0);
          rows.push({
            id: iu.id,
            type: 'iu',
            name: iu.name || '(unnamed)',
            depth,
            hasChildren: iuHasChildren,
            isExpanded: expandedNodes.has(iu.id),
            data: iu,
            parentId
          });
          if (expandedNodes.has(iu.id) && iuHasChildren) {
            addIURows(iu.subInformationUnits, depth + 1, iu.id);
          }
        });
      };
      addIURows(erData.informationUnits, 1, currentErId);

      // Add Sub-ERs
      erData.subERs?.forEach(subER => {
        const subHasChildren = (subER.informationUnits?.length > 0) || (subER.subERs?.length > 0);
        rows.push({
          id: subER.id,
          type: 'subEr',
          name: subER.name || '(unnamed Sub-ER)',
          depth: 1,
          hasChildren: subHasChildren,
          isExpanded: expandedNodes.has(subER.id),
          data: subER,
          parentId: currentErId
        });
        if (expandedNodes.has(subER.id)) {
          // Add Sub-ER's Information Units
          const addSubERIURows = (units, depth, parentId) => {
            units?.forEach(iu => {
              const iuHasChildren = (iu.subInformationUnits?.length > 0);
              rows.push({
                id: iu.id,
                type: 'iu',
                name: iu.name || '(unnamed)',
                depth,
                hasChildren: iuHasChildren,
                isExpanded: expandedNodes.has(iu.id),
                data: iu,
                parentId,
                subERParent: subER.id
              });
              if (expandedNodes.has(iu.id) && iuHasChildren) {
                addSubERIURows(iu.subInformationUnits, depth + 1, iu.id);
              }
            });
          };
          addSubERIURows(subER.informationUnits, 2, subER.id);
        }
      });
    }

    return rows;
  }, []);

  // Flatten full ER hierarchy into rows for ER-first mode
  const flattenErHierarchy = useCallback((hierarchy, expandedNodes, depth = 0, parentId = null) => {
    const rows = [];
    if (!hierarchy || hierarchy.length === 0) return rows;

    hierarchy.forEach(er => {
      const hasChildren = (er.informationUnits?.length > 0) || (er.subERs?.length > 0);
      rows.push({
        id: er.id,
        type: depth === 0 ? 'er' : 'subEr',
        name: er.name || '(unnamed ER)',
        depth,
        hasChildren,
        isExpanded: expandedNodes.has(er.id),
        data: er,
        parentId
      });

      if (expandedNodes.has(er.id)) {
        // Add Information Units
        const addIURows = (units, iuDepth, iuParentId) => {
          units?.forEach(iu => {
            const iuHasChildren = (iu.subInformationUnits?.length > 0);
            rows.push({
              id: iu.id,
              type: 'iu',
              name: iu.name || '(unnamed)',
              depth: iuDepth,
              hasChildren: iuHasChildren,
              isExpanded: expandedNodes.has(iu.id),
              data: iu,
              parentId: iuParentId,
              erParent: er.id
            });
            if (expandedNodes.has(iu.id) && iuHasChildren) {
              addIURows(iu.subInformationUnits, iuDepth + 1, iu.id);
            }
          });
        };
        addIURows(er.informationUnits, depth + 1, er.id);

        // Add Sub-ERs recursively
        if (er.subERs?.length > 0) {
          const subRows = flattenErHierarchy(er.subERs, expandedNodes, depth + 1, er.id);
          rows.push(...subRows);
        }
      }
    });

    return rows;
  }, []);

  // Flatten the selected ER's content: Information Units AND Sub-ERs
  // This is the view for the Individual ER Panel
  // - IUs of the selected ER are shown at depth 0
  // - Sub-ERs are shown at depth 0 (as folder items)
  // - Sub-ER's IUs and nested sub-ERs are shown at increasing depths
  // Note: ER hierarchy manipulation is done in ContentPane, not here
  const flattenErIUsOnly = useCallback((er, expandedNodes) => {
    if (!er) return [];
    const rows = [];

    // Helper to add Information Units recursively
    const addIURows = (units, depth, parentId, erParentId) => {
      units?.forEach(iu => {
        const iuHasChildren = (iu.subInformationUnits?.length > 0);
        rows.push({
          id: iu.id,
          type: 'iu',
          name: iu.name || '(unnamed)',
          depth,
          hasChildren: iuHasChildren,
          isExpanded: expandedNodes.has(iu.id),
          data: iu,
          parentId,
          erParent: erParentId
        });
        if (expandedNodes.has(iu.id) && iuHasChildren) {
          addIURows(iu.subInformationUnits, depth + 1, iu.id, erParentId);
        }
      });
    };

    // Helper to add Sub-ERs and their content recursively
    const addSubErRows = (subERs, depth, parentId) => {
      subERs?.forEach(subEr => {
        const subHasChildren = (subEr.informationUnits?.length > 0) || (subEr.subERs?.length > 0);
        rows.push({
          id: subEr.id,
          type: 'subEr',
          name: subEr.name || '(unnamed Sub-ER)',
          depth,
          hasChildren: subHasChildren,
          isExpanded: expandedNodes.has(subEr.id),
          data: subEr,
          parentId,
          erParent: parentId
        });
        if (expandedNodes.has(subEr.id)) {
          // Add this sub-ER's IUs
          addIURows(subEr.informationUnits, depth + 1, subEr.id, subEr.id);
          // Add nested sub-ERs
          if (subEr.subERs?.length > 0) {
            addSubErRows(subEr.subERs, depth + 1, subEr.id);
          }
        }
      });
    };

    // Add the selected ER itself as the root row
    const erHasChildren = (er.informationUnits?.length > 0) || (er.subERs?.length > 0);
    rows.push({
      id: er.id,
      type: 'er',
      name: er.name || '(unnamed ER)',
      depth: 0,
      hasChildren: erHasChildren,
      isExpanded: expandedNodes.has(er.id),
      data: er,
      parentId: null,
      erParent: er.id
    });

    // Show children only when the root ER is expanded
    if (expandedNodes.has(er.id)) {
      // Add the selected ER's Information Units at depth 1
      addIURows(er.informationUnits, 1, er.id, er.id);

      // Add Sub-ERs and their content at depth 1
      if (er.subERs?.length > 0) {
        addSubErRows(er.subERs, 1, er.id);
      }
    }

    return rows;
  }, []);

  // Flatten only the selected ER and its content (includes sub-ERs - legacy)
  const flattenSelectedEr = useCallback((er, expandedNodes) => {
    if (!er) return [];
    const rows = [];

    // Add the ER itself as root
    const hasChildren = (er.informationUnits?.length > 0) || (er.subERs?.length > 0);
    rows.push({
      id: er.id,
      type: 'er',
      name: er.name || '(unnamed ER)',
      depth: 0,
      hasChildren,
      isExpanded: expandedNodes.has(er.id),
      data: er,
      parentId: null
    });

    if (expandedNodes.has(er.id)) {
      // Add Information Units
      const addIURows = (units, depth, parentId) => {
        units?.forEach(iu => {
          const iuHasChildren = (iu.subInformationUnits?.length > 0);
          rows.push({
            id: iu.id,
            type: 'iu',
            name: iu.name || '(unnamed)',
            depth,
            hasChildren: iuHasChildren,
            isExpanded: expandedNodes.has(iu.id),
            data: iu,
            parentId,
            erParent: er.id
          });
          if (expandedNodes.has(iu.id) && iuHasChildren) {
            addIURows(iu.subInformationUnits, depth + 1, iu.id);
          }
        });
      };
      addIURows(er.informationUnits, 1, er.id);

      // Add Sub-ERs and their content
      const addSubErRows = (subERs, depth, parentId) => {
        subERs?.forEach(subEr => {
          const subHasChildren = (subEr.informationUnits?.length > 0) || (subEr.subERs?.length > 0);
          rows.push({
            id: subEr.id,
            type: 'subEr',
            name: subEr.name || '(unnamed Sub-ER)',
            depth,
            hasChildren: subHasChildren,
            isExpanded: expandedNodes.has(subEr.id),
            data: subEr,
            parentId
          });
          if (expandedNodes.has(subEr.id)) {
            addIURows(subEr.informationUnits, depth + 1, subEr.id);
            if (subEr.subERs?.length > 0) {
              addSubErRows(subEr.subERs, depth + 1, subEr.id);
            }
          }
        });
      };
      if (er.subERs?.length > 0) {
        addSubErRows(er.subERs, 1, er.id);
      }
    }

    return rows;
  }, []);

  // Find selected ER data from hierarchy (must be defined before treeRows)
  const selectedErData = useMemo(() => {
    if (!isErFirstMode || !selectedErId || !erHierarchy || erHierarchy.length === 0) {
      return null;
    }

    const findEr = (hierarchy, targetId) => {
      if (!hierarchy || !Array.isArray(hierarchy)) return null;
      for (const er of hierarchy) {
        if (er.id === targetId || er.guid === targetId) return er;
        if (er.subERs?.length > 0) {
          const found = findEr(er.subERs, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    return findEr(erHierarchy, selectedErId);
  }, [isErFirstMode, erHierarchy, selectedErId]);

  // Auto-expand selected ER when sub-ERs change (e.g., when a new sub-ER is added)
  useEffect(() => {
    if (selectedErId && selectedErData?.subERs?.length > 0) {
      setExpandedNodes(prev => {
        if (!prev.has(selectedErId)) {
          const next = new Set(prev);
          next.add(selectedErId);
          return next;
        }
        return prev;
      });
    }
  }, [selectedErId, selectedErData?.subERs?.length]);

  // Get all ERs from hierarchy as a flat list (for sub-ER modal selection)
  const allERsFlat = useMemo(() => {
    if (!isErFirstMode || !erHierarchy) return [];

    const result = [];
    const flattenAll = (ers, depth = 0) => {
      ers?.forEach(er => {
        result.push({
          id: er.id,
          guid: er.guid,
          name: er.name || '(unnamed ER)',
          description: er.description || '',
          informationUnits: er.informationUnits || [],
          subERs: er.subERs || [],
          depth
        });
        if (er.subERs?.length > 0) {
          flattenAll(er.subERs, depth + 1);
        }
      });
    };
    flattenAll(erHierarchy);
    return result;
  }, [isErFirstMode, erHierarchy]);

  const treeRows = useMemo(() => {
    if (isErFirstMode) {
      if (selectedErId && selectedErData) {
        return flattenErIUsOnly(selectedErData, expandedNodes);
      }
      return [];
    }
    return flattenERTree(erDataMap || {}, dataObject?.id, erData, expandedNodes);
  }, [isErFirstMode, selectedErId, selectedErData, erDataMap, dataObject?.id, erData, expandedNodes, flattenERTree, flattenErIUsOnly]);

  // Find parent of selected ER (for determining if can indent/outdent)
  const selectedErLocation = useMemo(() => {
    if (!isErFirstMode || !selectedErId) return null;

    const findLocation = (hierarchy, targetId, parent = null, index = 0) => {
      for (let i = 0; i < hierarchy.length; i++) {
        if (hierarchy[i].id === targetId || hierarchy[i].guid === targetId) {
          return { parent, index: i, siblings: hierarchy, er: hierarchy[i] };
        }
        if (hierarchy[i].subERs?.length > 0) {
          const found = findLocation(hierarchy[i].subERs, targetId, hierarchy[i], i);
          if (found) return found;
        }
      }
      return null;
    };

    return findLocation(erHierarchy, selectedErId);
  }, [isErFirstMode, erHierarchy, selectedErId]);

  // Find location of the sub-ER selected within the tree view (for move/indent/outdent)
  // This is different from selectedErLocation which tracks the top-level displayed ER
  const selectedSubErLocation = useMemo(() => {
    if (!selectedItem || (selectedItem.type !== 'er' && selectedItem.type !== 'subEr')) return null;
    if (!erHierarchy || erHierarchy.length === 0) return null;

    const findLocation = (hierarchy, targetId, parent = null) => {
      for (let i = 0; i < hierarchy.length; i++) {
        if (hierarchy[i].id === targetId || hierarchy[i].guid === targetId) {
          return { parent, index: i, siblings: hierarchy, er: hierarchy[i] };
        }
        if (hierarchy[i].subERs?.length > 0) {
          const found = findLocation(hierarchy[i].subERs, targetId, hierarchy[i]);
          if (found) return found;
        }
      }
      return null;
    };

    return findLocation(erHierarchy, selectedItem.id);
  }, [selectedItem, erHierarchy]);

  // Determine which ER to use for move/indent/outdent operations
  // If a sub-ER is selected within the tree, use that; otherwise use the top-level selectedErId
  const activeErForOperations = selectedSubErLocation || selectedErLocation;
  const activeErId = selectedSubErLocation ? selectedItem.id : selectedErId;

  // Compute if selected ER can be moved/indented/outdented
  const canMoveUp = activeErForOperations && activeErForOperations.index > 0;
  const canMoveDown = activeErForOperations && activeErForOperations.index < activeErForOperations.siblings.length - 1;
  const canIndent = activeErForOperations && activeErForOperations.index > 0; // Has sibling above to become parent
  const canOutdent = activeErForOperations && activeErForOperations.parent !== null; // Has parent to outdent from

  // Find selected IU location (for determining if can move/indent/outdent)
  const selectedIULocation = useMemo(() => {
    if (!selectedItem || selectedItem.type !== 'iu') return null;
    const iuId = selectedItem.id;

    // Helper to find IU within a list of IUs
    const findIULocation = (ius, parent = null, parentErId = null) => {
      for (let i = 0; i < ius.length; i++) {
        if (ius[i].id === iuId) {
          return { parent, index: i, siblings: ius, iu: ius[i], parentErId };
        }
        if (ius[i].subInformationUnits?.length > 0) {
          const found = findIULocation(ius[i].subInformationUnits, ius[i], parentErId);
          if (found) return found;
        }
      }
      return null;
    };

    // Search in erHierarchy for ER-first mode
    if (isErFirstMode && erHierarchy && Array.isArray(erHierarchy)) {
      const searchInErs = (ers) => {
        if (!ers || !Array.isArray(ers)) return null;
        for (const er of ers) {
          const found = findIULocation(er.informationUnits || [], null, er.id);
          if (found) return found;
          if (er.subERs?.length > 0) {
            const foundInSubErs = searchInErs(er.subERs);
            if (foundInSubErs) return foundInSubErs;
          }
        }
        return null;
      };
      return searchInErs(erHierarchy);
    }
    return null;
  }, [selectedItem, isErFirstMode, erHierarchy]);

  // Compute if selected IU can be moved/indented/outdented
  const canMoveSelectedIUUp = selectedIULocation && selectedIULocation.index > 0;
  const canMoveSelectedIUDown = selectedIULocation && selectedIULocation.index < selectedIULocation.siblings.length - 1;
  const canIndentSelectedIU = selectedIULocation && selectedIULocation.index > 0; // Has sibling above
  const canOutdentSelectedIU = selectedIULocation && selectedIULocation.parent !== null; // Has parent IU

  // Commit current detail panel edits to the hierarchy (without closing the panel)
  const commitCurrentEdit = useCallback(() => {
    if (!selectedItem || !onUpdateER) return;

    // Trim leading/trailing whitespace from text fields
    const trim = (v) => (typeof v === 'string' ? v.trim() : v);

    if (selectedItem.type === 'iu') {
      const parentErId = selectedItem.erParent || selectedIULocation?.parentErId;
      if (parentErId) {
        const updatedIUData = {
          ...selectedItem.data,
          name: trim(selectedItem.data?.name),
          definition: trim(selectedItem.data?.definition),
          examples: trim(selectedItem.data?.examples)
        };
        const updateIURecursive = (ius) => ius.map(iu =>
          iu.id === selectedItem.id
            ? { ...iu, ...updatedIUData }
            : { ...iu, subInformationUnits: iu.subInformationUnits ? updateIURecursive(iu.subInformationUnits) : [] }
        );
        const findAndUpdate = (ers) => {
          for (const er of ers) {
            if (er.id === parentErId) {
              onUpdateER(er.id, { informationUnits: updateIURecursive(er.informationUnits || []) });
              return true;
            }
            if (er.subERs?.length > 0 && findAndUpdate(er.subERs)) return true;
          }
          return false;
        };
        findAndUpdate(erHierarchy);
      }
    } else if (selectedItem.type === 'er' || selectedItem.type === 'subEr') {
      onUpdateER(selectedItem.id, {
        name: trim(selectedItem.data?.name),
        description: trim(selectedItem.data?.description),
        descriptionFigures: selectedItem.data?.descriptionFigures,
        examples: trim(selectedItem.data?.examples),
        exampleImages: selectedItem.data?.exampleImages
      });
    }
  }, [selectedItem, selectedIULocation, erHierarchy, onUpdateER]);

  // Immediately commit a figure-array change to erHierarchy and update the snapshot.
  // Used by onFiguresChange in the detail panel so figures are persisted to erHierarchy
  // right after the async file read completes — not deferred until blur/save.
  const commitFigureChange = useCallback((field, figs) => {
    if (!selectedItem || !onUpdateER) return;

    const newData = { ...selectedItem.data, [field]: figs };
    // Update local detail-panel state
    setSelectedItem(prev => prev ? { ...prev, data: newData } : prev);
    // Update snapshot so hasUnsavedDetailChanges() doesn't fire a false positive
    selectedItemSnapshotRef.current = JSON.stringify(newData);

    if (selectedItem.type === 'er' || selectedItem.type === 'subEr') {
      onUpdateER(selectedItem.id, { [field]: figs });
    } else if (selectedItem.type === 'iu') {
      const parentErId = selectedItem.erParent || selectedIULocation?.parentErId;
      if (!parentErId) return;
      const updateIURecursive = (ius) => ius.map(iu =>
        iu.id === selectedItem.id
          ? { ...iu, [field]: figs }
          : { ...iu, subInformationUnits: iu.subInformationUnits ? updateIURecursive(iu.subInformationUnits) : [] }
      );
      const findAndUpdate = (ers) => {
        for (const er of ers) {
          if (er.id === parentErId || er.guid === parentErId) {
            onUpdateER(er.id, { informationUnits: updateIURecursive(er.informationUnits || []) });
            return true;
          }
          if (er.subERs?.length > 0 && findAndUpdate(er.subERs)) return true;
        }
        return false;
      };
      findAndUpdate(erHierarchy);
    }
  }, [selectedItem, selectedIULocation, onUpdateER, erHierarchy]);

  // After a mapping is applied via the search modal, commitCurrentEdit runs once
  // selectedItem has been updated with the new mapping data.
  useEffect(() => {
    if (pendingMappingCommitRef.current) {
      pendingMappingCommitRef.current = false;
      commitCurrentEdit();
    }
  }, [selectedItem, commitCurrentEdit]);

  // Save detail panel edits and close the panel
  const handleDetailSave = useCallback(() => {
    commitCurrentEdit();
    selectedItemSnapshotRef.current = null;
    selectedItemSnapshotRef.current = null; setSelectedItem(null);
  }, [commitCurrentEdit]);

  // Close the detail panel without saving
  const handleDetailClose = useCallback(() => {
    selectedItemSnapshotRef.current = null;
    selectedItemSnapshotRef.current = null; setSelectedItem(null);
  }, []);

  // Select a new item in the detail panel, storing a snapshot for dirty detection
  const selectNewItem = useCallback((item) => {
    selectedItemSnapshotRef.current = item ? JSON.stringify(item.data) : null;
    setSelectedItem(item);
  }, []);

  // Check if the current detail panel has unsaved changes
  const hasUnsavedDetailChanges = useCallback(() => {
    if (!selectedItem || !selectedItemSnapshotRef.current) return false;
    return JSON.stringify(selectedItem.data) !== selectedItemSnapshotRef.current;
  }, [selectedItem]);

  // Prompt for unsaved changes before switching to a new item.
  // Returns true if it's safe to proceed (changes applied, discarded, or none).
  const confirmBeforeSwitch = useCallback((nextItemFn) => {
    if (hasUnsavedDetailChanges()) {
      const choice = window.confirm(
        'You have unsaved changes in the detail panel. Click OK to apply and save them, or Cancel to discard.'
      );
      if (choice) {
        commitCurrentEdit();
      }
      // Either way, proceed to the new item
    }
    nextItemFn();
  }, [hasUnsavedDetailChanges, commitCurrentEdit]);

  // Detail panel resize handlers (proportion-based)
  const handleResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    resizingRef.current = true;
    resizeStartYRef.current = e.clientY;
    resizeStartRatioRef.current = detailPanelRatio;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [detailPanelRatio]);

  useEffect(() => {
    const handleResizeMouseMove = (e) => {
      if (!resizingRef.current) return;
      const containerH = panelContainerRef.current?.clientHeight || 400;
      const delta = resizeStartYRef.current - e.clientY;
      const newRatio = Math.max(0.15, Math.min(resizeStartRatioRef.current + delta / containerH, 0.85));
      setDetailPanelRatio(newRatio);
    };

    const handleResizeMouseUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleResizeMouseMove);
    document.addEventListener('mouseup', handleResizeMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleResizeMouseMove);
      document.removeEventListener('mouseup', handleResizeMouseUp);
    };
  }, []);

  // Toggle expand/collapse for a node
  const toggleExpand = useCallback((nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Expand all nodes
  const handleExpandAll = useCallback(() => {
    const allIds = new Set();

    if (isErFirstMode) {
      // ER-first mode: expand all ERs and IUs in hierarchy
      const addAllIdsFromHierarchy = (ers) => {
        ers?.forEach(er => {
          allIds.add(er.id);
          er.informationUnits?.forEach(iu => {
            allIds.add(iu.id);
            const addSubIUs = (units) => {
              units?.forEach(u => {
                allIds.add(u.id);
                if (u.subInformationUnits) addSubIUs(u.subInformationUnits);
              });
            };
            if (iu.subInformationUnits) addSubIUs(iu.subInformationUnits);
          });
          if (er.subERs) addAllIdsFromHierarchy(er.subERs);
        });
      };
      addAllIdsFromHierarchy(erHierarchy);
    } else {
      // Legacy mode
      if (dataObject?.id) allIds.add(dataObject.id);
      const addAllIds = (units) => {
        units?.forEach(u => {
          allIds.add(u.id);
          if (u.subInformationUnits) addAllIds(u.subInformationUnits);
        });
      };
      addAllIds(erData?.informationUnits);
      erData?.subERs?.forEach(sub => {
        allIds.add(sub.id);
        addAllIds(sub.informationUnits);
      });
    }

    setExpandedNodes(allIds);
  }, [isErFirstMode, erHierarchy, dataObject?.id, erData]);

  // Collapse all nodes
  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  // ========== ER-First Mode Handlers ==========

  // Toggle mandatory flag in ER-first mode
  const handleMandatoryToggle = useCallback((iuId, value) => {
    if (!isErFirstMode || !onUpdateER) return;

    // Find which ER contains this IU
    const findAndUpdateIU = (ers) => {
      for (const er of ers) {
        // Check in direct IUs
        const iuIndex = er.informationUnits?.findIndex(iu => iu.id === iuId);
        if (iuIndex !== undefined && iuIndex >= 0) {
          const updatedIUs = [...er.informationUnits];
          updatedIUs[iuIndex] = { ...updatedIUs[iuIndex], isMandatory: value };
          onUpdateER(er.id, { informationUnits: updatedIUs });
          return true;
        }
        // Check in sub-ERs
        if (er.subERs?.length > 0 && findAndUpdateIU(er.subERs)) {
          return true;
        }
      }
      return false;
    };

    findAndUpdateIU(erHierarchy);
  }, [isErFirstMode, onUpdateER, erHierarchy]);

  // Add Information Unit to an ER in ER-first mode
  const handleAddIUToEr = useCallback((erId) => {
    if (!isErFirstMode || !onUpdateER) return;

    const newIU = {
      id: uuid(),
      name: '',
      dataType: 'String / Text',
      isMandatory: false,
      definition: '',
      examples: '',
      exampleImages: [],
      correspondingExternalElements: [],
      constraints: [],
      subInformationUnits: []
    };

    // Use the always-current ref to avoid stale closure when the panel first opens
    const findEr = (ers) => {
      for (const er of ers) {
        if (er.id === erId || er.guid === erId) {
          onUpdateER(erId, {
            informationUnits: [...(er.informationUnits || []), newIU]
          });
          setExpandedNodes(prev => new Set([...prev, erId]));
          selectNewItem({ id: newIU.id, type: 'iu', data: newIU, erParent: erId });
          return true;
        }
        if (er.subERs?.length > 0 && findEr(er.subERs)) return true;
      }
      return false;
    };

    findEr(erHierarchyRef.current);
  }, [isErFirstMode, onUpdateER]);

  // Delete Information Unit in ER-first mode
  const handleDeleteIU = useCallback((iuId, erParentId) => {
    if (!isErFirstMode || !onUpdateER) return;

    const removeIURecursive = (ius) => {
      return ius
        .filter(iu => iu.id !== iuId)
        .map(iu => ({
          ...iu,
          subInformationUnits: iu.subInformationUnits ? removeIURecursive(iu.subInformationUnits) : []
        }));
    };

    const updateErRecursive = (ers) => {
      for (const er of ers) {
        if (er.id === erParentId || er.guid === erParentId) {
          onUpdateER(er.id, {
            informationUnits: removeIURecursive(er.informationUnits || [])
          });
          return true;
        }
        if (er.subERs?.length > 0 && updateErRecursive(er.subERs)) {
          return true;
        }
      }
      return false;
    };

    updateErRecursive(erHierarchy);
    if (selectedItem?.id === iuId) {
      selectedItemSnapshotRef.current = null; setSelectedItem(null);
    }
  }, [isErFirstMode, onUpdateER, erHierarchy, selectedItem?.id]);

  // Move IU up in ER-first mode
  const handleMoveIUUp = useCallback((iuId, erParentId) => {
    if (!isErFirstMode || !onUpdateER || !selectedIULocation) return;
    if (selectedIULocation.index <= 0) return;

    const moveIUInList = (ius) => {
      const idx = ius.findIndex(iu => iu.id === iuId);
      if (idx > 0) {
        const newIus = [...ius];
        [newIus[idx - 1], newIus[idx]] = [newIus[idx], newIus[idx - 1]];
        return newIus;
      }
      return ius.map(iu => ({
        ...iu,
        subInformationUnits: iu.subInformationUnits ? moveIUInList(iu.subInformationUnits) : []
      }));
    };

    const updateErRecursive = (ers) => {
      for (const er of ers) {
        if (er.id === erParentId || er.guid === erParentId) {
          onUpdateER(er.id, {
            informationUnits: moveIUInList(er.informationUnits || [])
          });
          return true;
        }
        if (er.subERs?.length > 0 && updateErRecursive(er.subERs)) {
          return true;
        }
      }
      return false;
    };

    updateErRecursive(erHierarchy);
  }, [isErFirstMode, onUpdateER, selectedIULocation, erHierarchy]);

  // Move IU down in ER-first mode
  const handleMoveIUDown = useCallback((iuId, erParentId) => {
    if (!isErFirstMode || !onUpdateER || !selectedIULocation) return;
    if (selectedIULocation.index >= selectedIULocation.siblings.length - 1) return;

    const moveIUInList = (ius) => {
      const idx = ius.findIndex(iu => iu.id === iuId);
      if (idx >= 0 && idx < ius.length - 1) {
        const newIus = [...ius];
        [newIus[idx], newIus[idx + 1]] = [newIus[idx + 1], newIus[idx]];
        return newIus;
      }
      return ius.map(iu => ({
        ...iu,
        subInformationUnits: iu.subInformationUnits ? moveIUInList(iu.subInformationUnits) : []
      }));
    };

    const updateErRecursive = (ers) => {
      for (const er of ers) {
        if (er.id === erParentId || er.guid === erParentId) {
          onUpdateER(er.id, {
            informationUnits: moveIUInList(er.informationUnits || [])
          });
          return true;
        }
        if (er.subERs?.length > 0 && updateErRecursive(er.subERs)) {
          return true;
        }
      }
      return false;
    };

    updateErRecursive(erHierarchy);
  }, [isErFirstMode, onUpdateER, selectedIULocation, erHierarchy]);

  // Indent IU (make it a sub-IU of the sibling above)
  const handleIndentIU = useCallback((iuId, erParentId) => {
    if (!isErFirstMode || !onUpdateER || !selectedIULocation) return;
    if (selectedIULocation.index <= 0) return;

    const indentIUInList = (ius) => {
      const idx = ius.findIndex(iu => iu.id === iuId);
      if (idx > 0) {
        const iuToMove = ius[idx];
        const siblingAbove = ius[idx - 1];
        const newIus = ius.filter(iu => iu.id !== iuId);
        // Find the sibling above and add the IU to its subInformationUnits
        return newIus.map(iu => {
          if (iu.id === siblingAbove.id) {
            return {
              ...iu,
              subInformationUnits: [...(iu.subInformationUnits || []), iuToMove]
            };
          }
          return iu;
        });
      }
      return ius.map(iu => ({
        ...iu,
        subInformationUnits: iu.subInformationUnits ? indentIUInList(iu.subInformationUnits) : []
      }));
    };

    const updateErRecursive = (ers) => {
      for (const er of ers) {
        if (er.id === erParentId || er.guid === erParentId) {
          const newIUs = indentIUInList(er.informationUnits || []);
          onUpdateER(er.id, { informationUnits: newIUs });
          // Auto-expand the parent to show the nested IU
          const parentIU = newIUs.find(iu =>
            iu.subInformationUnits?.some(sub => sub.id === iuId)
          );
          if (parentIU) {
            setExpandedNodes(prev => new Set([...prev, parentIU.id]));
          }
          return true;
        }
        if (er.subERs?.length > 0 && updateErRecursive(er.subERs)) {
          return true;
        }
      }
      return false;
    };

    updateErRecursive(erHierarchy);
  }, [isErFirstMode, onUpdateER, selectedIULocation, erHierarchy]);

  // Outdent IU (promote from parent IU to its parent level)
  const handleOutdentIU = useCallback((iuId, erParentId) => {
    if (!isErFirstMode || !onUpdateER || !selectedIULocation) return;
    if (!selectedIULocation.parent) return;

    const outdentIUInList = (ius, parentIuId = null) => {
      // If we find the parent IU, extract the target IU and insert after parent
      const result = [];
      for (const iu of ius) {
        const hasTarget = iu.subInformationUnits?.some(sub => sub.id === iuId);
        if (hasTarget) {
          // This IU contains the target, remove target from subIUs
          const iuToMove = iu.subInformationUnits.find(sub => sub.id === iuId);
          const newSubIUs = iu.subInformationUnits.filter(sub => sub.id !== iuId);
          result.push({ ...iu, subInformationUnits: newSubIUs });
          result.push(iuToMove); // Insert after parent
        } else {
          result.push({
            ...iu,
            subInformationUnits: iu.subInformationUnits ? outdentIUInList(iu.subInformationUnits, iu.id) : []
          });
        }
      }
      return result;
    };

    const updateErRecursive = (ers) => {
      for (const er of ers) {
        if (er.id === erParentId || er.guid === erParentId) {
          onUpdateER(er.id, {
            informationUnits: outdentIUInList(er.informationUnits || [])
          });
          return true;
        }
        if (er.subERs?.length > 0 && updateErRecursive(er.subERs)) {
          return true;
        }
      }
      return false;
    };

    updateErRecursive(erHierarchy);
  }, [isErFirstMode, onUpdateER, selectedIULocation, erHierarchy]);

  // ========== IU Reorder / Indent / Outdent — Legacy Mode ==========

  const moveLegacyIUUp = useCallback((unitId, subERId) => {
    if (!onChange || !erData) return;
    const moveUp = (ius) => {
      const idx = ius.findIndex(u => u.id === unitId);
      if (idx > 0) {
        const n = [...ius]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n;
      }
      return ius.map(u => ({ ...u, subInformationUnits: u.subInformationUnits?.length ? moveUp(u.subInformationUnits) : [] }));
    };
    if (subERId) onChange({ ...erData, subERs: (erData.subERs || []).map(s => s.id === subERId ? { ...s, informationUnits: moveUp(s.informationUnits || []) } : s) });
    else onChange({ ...erData, informationUnits: moveUp(erData.informationUnits || []) });
  }, [onChange, erData]);

  const moveLegacyIUDown = useCallback((unitId, subERId) => {
    if (!onChange || !erData) return;
    const moveDown = (ius) => {
      const idx = ius.findIndex(u => u.id === unitId);
      if (idx >= 0 && idx < ius.length - 1) {
        const n = [...ius]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; return n;
      }
      return ius.map(u => ({ ...u, subInformationUnits: u.subInformationUnits?.length ? moveDown(u.subInformationUnits) : [] }));
    };
    if (subERId) onChange({ ...erData, subERs: (erData.subERs || []).map(s => s.id === subERId ? { ...s, informationUnits: moveDown(s.informationUnits || []) } : s) });
    else onChange({ ...erData, informationUnits: moveDown(erData.informationUnits || []) });
  }, [onChange, erData]);

  const indentLegacyIU = useCallback((unitId, subERId) => {
    if (!onChange || !erData) return;
    const indent = (ius) => {
      const idx = ius.findIndex(u => u.id === unitId);
      if (idx > 0) {
        const iuToMove = ius[idx];
        return ius.filter(u => u.id !== unitId).map((u, i) =>
          i === idx - 1 ? { ...u, subInformationUnits: [...(u.subInformationUnits || []), iuToMove] } : u
        );
      }
      return ius.map(u => ({ ...u, subInformationUnits: u.subInformationUnits?.length ? indent(u.subInformationUnits) : [] }));
    };
    if (subERId) onChange({ ...erData, subERs: (erData.subERs || []).map(s => s.id === subERId ? { ...s, informationUnits: indent(s.informationUnits || []) } : s) });
    else onChange({ ...erData, informationUnits: indent(erData.informationUnits || []) });
  }, [onChange, erData]);

  const outdentLegacyIU = useCallback((unitId, subERId) => {
    if (!onChange || !erData) return;
    const outdent = (ius) => {
      for (let i = 0; i < ius.length; i++) {
        const subs = ius[i].subInformationUnits || [];
        const ci = subs.findIndex(s => s.id === unitId);
        if (ci >= 0) {
          const child = subs[ci];
          const newSubs = subs.filter(s => s.id !== unitId);
          return [
            ...ius.slice(0, i).concat({ ...ius[i], subInformationUnits: newSubs }),
            child,
            ...ius.slice(i + 1)
          ];
        }
        if (subs.length > 0) {
          const result = outdent(subs);
          if (result !== subs) return ius.map((u, j) => j === i ? { ...u, subInformationUnits: result } : u);
        }
      }
      return ius;
    };
    if (subERId) onChange({ ...erData, subERs: (erData.subERs || []).map(s => s.id === subERId ? { ...s, informationUnits: outdent(s.informationUnits || []) } : s) });
    else onChange({ ...erData, informationUnits: outdent(erData.informationUnits || []) });
  }, [onChange, erData]);

  // ========== CRUD Operations ==========

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(erData);
    }
  }, [onSave, erData]);

  const handleSaveAs = useCallback(() => {
    setSaveAsName(erData?.name || '');
    setShowSaveAsDialog(true);
  }, [erData]);

  const confirmSaveAs = useCallback(() => {
    if (onSaveAs && saveAsName.trim()) {
      onSaveAs(erData, saveAsName.trim());
      setShowSaveAsDialog(false);
      setSaveAsName('');
    }
  }, [onSaveAs, erData, saveAsName]);

  // Add new Information Unit
  const addInformationUnit = useCallback((parentId = null, subERId = null) => {
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

    const currentErData = erData || { informationUnits: [] };

    if (subERId) {
      // Add to Sub-ER
      const updateSubERs = (subERs) => subERs.map(sub => {
        if (sub.id === subERId) {
          if (parentId && parentId !== subERId) {
            // Add to a specific unit within sub-ER
            const addToUnit = (units) => units.map(u =>
              u.id === parentId
                ? { ...u, subInformationUnits: [...(u.subInformationUnits || []), newUnit] }
                : { ...u, subInformationUnits: addToUnit(u.subInformationUnits || []) }
            );
            return { ...sub, informationUnits: addToUnit(sub.informationUnits || []) };
          }
          return { ...sub, informationUnits: [...(sub.informationUnits || []), newUnit] };
        }
        return sub;
      });
      onChange({ ...currentErData, subERs: updateSubERs(currentErData.subERs || []) });
    } else if (parentId) {
      // Add to parent unit in main ER
      const addToParent = (units) => units.map(u =>
        u.id === parentId
          ? { ...u, subInformationUnits: [...(u.subInformationUnits || []), newUnit] }
          : { ...u, subInformationUnits: addToParent(u.subInformationUnits || []) }
      );
      onChange({ ...currentErData, informationUnits: addToParent(currentErData.informationUnits || []) });
      setExpandedNodes(prev => new Set([...prev, parentId]));
    } else {
      // Add to root
      onChange({ ...currentErData, informationUnits: [...(currentErData.informationUnits || []), newUnit] });
    }

    setExpandedNodes(prev => new Set([...prev, newUnit.id]));
    selectNewItem({ id: newUnit.id, type: 'iu', data: newUnit });
  }, [erData, onChange, selectNewItem]);

  // Update Information Unit
  const updateUnit = useCallback((unitId, updates, subERId = null) => {
    const updateRecursive = (units) => units.map(u =>
      u.id === unitId ? { ...u, ...updates } : { ...u, subInformationUnits: updateRecursive(u.subInformationUnits || []) }
    );

    if (subERId) {
      const updateSubERs = (subERs) => subERs.map(sub =>
        sub.id === subERId
          ? { ...sub, informationUnits: updateRecursive(sub.informationUnits || []) }
          : sub
      );
      onChange({ ...erData, subERs: updateSubERs(erData?.subERs || []) });
    } else {
      onChange({ ...erData, informationUnits: updateRecursive(erData?.informationUnits || []) });
    }

    // Update selected item if it's the one being updated
    if (selectedItem?.id === unitId) {
      setSelectedItem(prev => ({ ...prev, data: { ...prev.data, ...updates } }));
    }
  }, [erData, onChange, selectedItem?.id]);

  // Remove Information Unit
  const removeUnit = useCallback((unitId, subERId = null) => {
    const removeRecursive = (units) => units
      .filter(u => u.id !== unitId)
      .map(u => ({ ...u, subInformationUnits: removeRecursive(u.subInformationUnits || []) }));

    if (subERId) {
      const updateSubERs = (subERs) => subERs.map(sub =>
        sub.id === subERId
          ? { ...sub, informationUnits: removeRecursive(sub.informationUnits || []) }
          : sub
      );
      onChange({ ...erData, subERs: updateSubERs(erData?.subERs || []) });
    } else {
      onChange({ ...erData, informationUnits: removeRecursive(erData?.informationUnits || []) });
    }

    if (selectedItem?.id === unitId) {
      selectedItemSnapshotRef.current = null; setSelectedItem(null);
    }
  }, [erData, onChange, selectedItem?.id]);

  // Remove item (generic)
  const handleRemoveItem = useCallback(() => {
    if (!selectedItem) return;

    if (selectedItem.type === 'er') {
      // Cannot remove root ER from here
      return;
    } else if (selectedItem.type === 'subEr') {
      const updatedSubERs = (erData?.subERs || []).filter(sub => sub.id !== selectedItem.id);
      onChange({ ...erData, subERs: updatedSubERs });
      selectedItemSnapshotRef.current = null; setSelectedItem(null);
    } else if (selectedItem.type === 'iu') {
      const row = treeRows.find(r => r.id === selectedItem.id);
      removeUnit(selectedItem.id, row?.subERParent);
    }
  }, [selectedItem, erData, onChange, treeRows, removeUnit]);

  // ========== External Mappings ==========

  const addMapping = useCallback((unitId) => {
    const newMapping = { id: uuid(), basis: 'bSDD', name: '' };
    const addRecursive = (units) => units.map(u =>
      u.id === unitId
        ? { ...u, correspondingExternalElements: [...(u.correspondingExternalElements || []), newMapping] }
        : { ...u, subInformationUnits: addRecursive(u.subInformationUnits || []) }
    );
    onChange({ ...erData, informationUnits: addRecursive(erData?.informationUnits || []) });
    // Track newly added mapping for auto-scroll and focus
    newlyAddedMappingRef.current = { mappingId: newMapping.id, unitId };
    setMappingScrollTrigger(c => c + 1);
  }, [erData, onChange]);

  const updateMapping = useCallback((unitId, mappingId, updates) => {
    const updateRecursive = (units) => units.map(u => {
      if (u.id === unitId) {
        return { ...u, correspondingExternalElements: (u.correspondingExternalElements || []).map(m => m.id === mappingId ? { ...m, ...updates } : m) };
      }
      return { ...u, subInformationUnits: updateRecursive(u.subInformationUnits || []) };
    });
    onChange({ ...erData, informationUnits: updateRecursive(erData?.informationUnits || []) });
  }, [erData, onChange]);

  const removeMapping = useCallback((unitId, mappingId) => {
    const removeRecursive = (units) => units.map(u => {
      if (u.id === unitId) {
        return { ...u, correspondingExternalElements: (u.correspondingExternalElements || []).filter(m => m.id !== mappingId) };
      }
      return { ...u, subInformationUnits: removeRecursive(u.subInformationUnits || []) };
    });
    onChange({ ...erData, informationUnits: removeRecursive(erData?.informationUnits || []) });
  }, [erData, onChange]);

  // Debounced auto-search with AbortController for cancellation
  const searchTimeoutRef = useRef(null);

  // Cancel any in-flight search request.
  // Also bumps the request counter so any pending finally{} block from the
  // aborted executeSearch sees a stale requestId and skips state updates.
  const cancelSearch = useCallback(() => {
    searchRequestIdRef.current++;
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
      searchAbortControllerRef.current = null;
    }
  }, []);

  // Start a rate-limit countdown; calls rateLimitRetryFnRef.current when it expires.
  // Declared before executeSearch and drillIntoClassProperties so both can reference it.
  // Applies exponential backoff: attempt 1 → 60s, attempt 2 → 120s, then permanent error.
  // Returns false if the retry limit is reached (caller should show a permanent error instead).
  const MAX_RATE_LIMIT_RETRIES = 2;
  const startRateLimitCountdown = useCallback((serverRetryAfterMs) => {
    if (rateLimitRetryCountRef.current >= MAX_RATE_LIMIT_RETRIES) {
      rateLimitRetryFnRef.current = null;
      drilldownRetryClassRef.current = null;
      setMappingSearchError('bSDD is still rate-limiting after two retries. Please wait a few minutes and try again manually.');
      setMappingSearchLoading(false);
      setDrilldownCountdown(null);
      return false;
    }
    // Exponential backoff: 60s * 2^attempt, at least as long as the server requests
    const backoffMs = Math.max(serverRetryAfterMs, 60000 * Math.pow(2, rateLimitRetryCountRef.current));
    rateLimitRetryCountRef.current += 1;
    const totalSec = Math.ceil(backoffMs / 1000);
    if (drilldownRetryTimerRef.current) {
      clearInterval(drilldownRetryTimerRef.current.intervalId);
      clearTimeout(drilldownRetryTimerRef.current.timeoutId);
      drilldownRetryTimerRef.current = null;
    }
    setDrilldownCountdown(totalSec);
    let remaining = totalSec;
    const intervalId = setInterval(() => {
      remaining -= 1;
      setDrilldownCountdown(remaining);
      if (remaining <= 0) clearInterval(intervalId);
    }, 1000);
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      drilldownRetryTimerRef.current = null;
      setDrilldownCountdown(null);
      const retryFn = rateLimitRetryFnRef.current;
      rateLimitRetryFnRef.current = null;
      drilldownRetryClassRef.current = null;
      retryFn?.();
    }, backoffMs);
    drilldownRetryTimerRef.current = { intervalId, timeoutId };
    return true;
  }, []);

  // Core search execution — captures query/schema/type at call time
  const executeSearch = useCallback(async (query, schema, matchType, { isRetry = false } = {}) => {
    if (!query.trim()) {
      setMappingSearchResults([]);
      setMappingSearchError(null);
      setMappingSearchLoading(false);
      return;
    }

    if (!isRetry) rateLimitRetryCountRef.current = 0;

    // Cancel previous in-flight request
    cancelSearch();

    // Create a new AbortController for this request
    const abortController = new AbortController();
    searchAbortControllerRef.current = abortController;

    // Increment request ID to detect stale responses
    const requestId = ++searchRequestIdRef.current;

    setMappingSearchLoading(true);
    // Clear groups immediately so stale groups from previous searches don't linger
    setMappingSearchGroups([]);
    setExpandedGroups(new Set());
    setMappingSearchError(null);

    try {
      const schemaOption = SCHEMA_OPTIONS.find(s => s.value === schema);
      let results = [];
      let searchError = null;

      if (schemaOption?.apiEnabled && schema === 'bSDD') {
        try {
          const onStep = (step) => {
            if (requestId === searchRequestIdRef.current) setMappingSearchStep(step);
          };
          const bsddResponse = await searchBsdd(query, matchType, abortController.signal, onStep);
          results = bsddResponse.results || [];
          const groups = bsddResponse.groups || [];
          setMappingSearchGroups(groups);
          setExpandedGroups(new Set(groups.map(g => g.classUri)));
          setMappingSearchNote(bsddResponse.note || null);
          if (bsddResponse.rateLimited) {
            searchError = 'bSDD is rate-limiting requests. Please wait a moment and try again.';
            setMappingSearchRateLimited(true);
            results = [];
          } else {
            setMappingSearchRateLimited(false);
          }
        } catch (apiError) {
          if (apiError.name === 'AbortError') {
            return; // Silently exit — request was cancelled by a newer search
          }
          if (apiError.name === 'RateLimitError') {
            if (requestId !== searchRequestIdRef.current) return;
            rateLimitRetryFnRef.current = () => executeSearch(query, schema, matchType, { isRetry: true });
            const started = startRateLimitCountdown(apiError.retryAfterMs);
            if (!started) return; // retry limit reached — permanent error already set
            setMappingSearchLoading(false);
            return;
          }
          console.error('bSDD API error:', apiError);
          searchError = `bSDD API error: ${apiError.message || 'Connection failed'}`;
          results = [];
        }
      } else if (schemaOption?.searchable) {
        setMappingSearchNote(null);
        try {
          const { results: groupedResults, groups: schemaGroups } = searchSchemaGrouped(schema, query, matchType);
          if (schemaGroups.length > 0) {
            setMappingSearchGroups(schemaGroups);
            setExpandedGroups(new Set(schemaGroups.map(g => g.classUri)));
            results = groupedResults;
          } else {
            // Flat results — group any property entries by entity·Pset category for cleaner display
            const rawResults = groupedResults;
            if (rawResults.some(r => r.resultType === 'property')) {
              const propertyResults = rawResults.filter(r => r.resultType === 'property');
              const groupMap = new Map();
              for (const prop of propertyResults) {
                const key = prop.category || 'IFC Properties';
                if (!groupMap.has(key)) {
                  const parts = key.split(' · ');
                  groupMap.set(key, {
                    classCode: parts[0] || key,
                    className: parts[1] || '',
                    classUri: key,
                    resultType: 'propertySet',
                    properties: []
                  });
                }
                groupMap.get(key).properties.push(prop);
              }
              const propGroups = [...groupMap.values()];
              setMappingSearchGroups(propGroups);
              setExpandedGroups(new Set(propGroups.map(g => g.classUri)));
              results = rawResults.filter(r => r.resultType !== 'property');
            } else {
              results = rawResults;
            }
          }
        } catch (err) {
          console.error('Local schema search error:', err);
          searchError = `Schema search error: ${err.message || 'Unknown error'}`;
          results = [];
        }
      } else {
        searchError = `Schema '${schema}' does not support search.`;
      }

      // Guard against stale responses: only update state if this is still the latest request
      if (requestId !== searchRequestIdRef.current) return;

      const validResults = Array.isArray(results)
        ? results
            .filter(r => r && typeof r === 'object')
            .map(r => ({
              name: r.name || r.code || 'Unknown',
              code: r.code || r.name || '',
              description: r.description || '',
              category: r.category || schema,
              uri: r.uri || '',
              score: typeof r.score === 'number' && !isNaN(r.score) ? r.score : 1,
              matchType: r.matchType || 'exact',
              resultType: r.resultType || ''
            }))
            .filter(r => r.name && r.name !== 'Unknown')
        : [];

      setMappingSearchResults(validResults);
      if (searchError && validResults.length === 0) {
        setMappingSearchError(searchError);
      }
    } catch (error) {
      if (error.name === 'AbortError' || requestId !== searchRequestIdRef.current) return;
      console.error('Mapping search error:', error);
      setMappingSearchResults([]);
      setMappingSearchError(`Search failed: ${error.message || 'Unknown error'}`);
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setMappingSearchLoading(false);
        setMappingSearchStep(null);
      }
    }
  }, [cancelSearch, startRateLimitCountdown]);

  // Normalize a basis string to the closest SCHEMA_OPTIONS value.
  // Handles legacy strings like "IFC4x3 ADD2" → "IFC 4x3 ADD2" by comparing
  // without whitespace and case-insensitively.
  const normalizeSchema = useCallback((schema) => {
    if (!schema) return 'bSDD';
    if (SCHEMA_OPTIONS.find(s => s.value === schema)) return schema;
    const stripped = schema.replace(/\s/g, '').toLowerCase();
    if (stripped === 'ifc' || stripped === 'ifc4') return 'IFC 4x3 ADD2';
    if (stripped === 'ifc2x3' || stripped === 'ifc2') return 'IFC 2x3';
    const match = SCHEMA_OPTIONS.find(s => s.value.replace(/\s/g, '').toLowerCase() === stripped);
    return match?.value || 'bSDD';
  }, []);

  // Open mapping search modal
  // If mappingId is provided, we're updating an existing mapping; otherwise adding a new one
  const openMappingSearch = useCallback((unitId, currentSchema, mappingId = null) => {
    cancelSearch();

    const iuData = selectedItem?.id === unitId ? selectedItem.data : null;
    mappingSearchIuNameRef.current = iuData?.name || '';

    setMappingSearchUnitId(unitId);
    setMappingSearchMappingId(mappingId);
    setMappingSearchSchema(normalizeSchema(currentSchema));
    setMappingSearchQuery(iuData?.name || '');
    setMappingSearchResults([]);
    setMappingSearchGroups([]);
    setExpandedGroups(new Set());
    setMappingSearchError(null);
    setMappingSearchNote(null);
    setMappingSearchLoading(false);
    setMappingSearchStep(null);
    setMappingSearchRateLimited(false);
    setSelectedSearchResult(null);
    setMappingDrilldownClass(null);
    setMappingDrilldownFilter('');
    setSearchClosedUnexpectedly(false);
    setShowMappingSearch(true);
  }, [cancelSearch, normalizeSchema, selectedItem]);

  // Clear any pending rate-limit countdown timers (declared before closeMappingSearch and executeSearch)
  const clearDrilldownRetry = useCallback(() => {
    if (drilldownRetryTimerRef.current) {
      clearInterval(drilldownRetryTimerRef.current.intervalId);
      clearTimeout(drilldownRetryTimerRef.current.timeoutId);
      drilldownRetryTimerRef.current = null;
    }
    drilldownRetryClassRef.current = null;
    rateLimitRetryFnRef.current = null;
    rateLimitRetryCountRef.current = 0;
    setDrilldownCountdown(null);
  }, []);

  // Close mapping search and cancel in-flight requests
  const closeMappingSearch = useCallback(() => {
    cancelSearch();
    clearDrilldownRetry();
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setShowMappingSearch(false);
    setMappingSearchResults([]);
    setMappingSearchGroups([]);
    setExpandedGroups(new Set());
    setMappingSearchError(null);
    setMappingSearchNote(null);
    setMappingSearchLoading(false);
    setSelectedSearchResult(null);
    setMappingDrilldownClass(null);
    setMappingDrilldownFilter('');
  }, [cancelSearch, clearDrilldownRetry]);

  const drillIntoClassProperties = useCallback(async (classResult) => {
    if (!classResult?.uri) return;
    clearDrilldownRetry();
    cancelSearch();
    const abortController = new AbortController();
    searchAbortControllerRef.current = abortController;
    const requestId = ++searchRequestIdRef.current;

    setMappingDrilldownClass({ name: classResult.code || classResult.name, uri: classResult.uri });
    setMappingDrilldownFilter('');
    setMappingSearchLoading(true);
    setMappingSearchResults([]);
    setMappingSearchError(null);
    setSelectedSearchResult(null);

    try {
      const props = await fetchBsddClassProperties(classResult.uri, classResult.code || classResult.name, abortController.signal);
      if (requestId !== searchRequestIdRef.current) return;
      setMappingSearchResults(props || []);
      if (!props || props.length === 0) {
        setMappingSearchError('No properties found for this class.');
      }
    } catch (error) {
      if (error.name === 'AbortError' || requestId !== searchRequestIdRef.current) return;
      if (error.name === 'RateLimitError') {
        // bSDD rate-limited: start countdown and auto-retry when it expires
        drilldownRetryClassRef.current = classResult;
        rateLimitRetryFnRef.current = () => drillIntoClassProperties(classResult);
        const started = startRateLimitCountdown(error.retryAfterMs);
        setMappingSearchLoading(false);
        if (!started) return; // retry limit reached — permanent error already set
        return;
      }
      setMappingSearchError(`Failed to load properties: ${error.message}`);
    } finally {
      if (requestId === searchRequestIdRef.current) setMappingSearchLoading(false);
    }
  }, [cancelSearch, clearDrilldownRetry, startRateLimitCountdown]);

  // Cancel any in-flight request and reset results when query/schema/type changes.
  // Search is only triggered explicitly by the Search button or Enter key.
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    cancelSearch();

    if (!showMappingSearch || !mappingSearchQuery.trim()) {
      setMappingSearchLoading(false);
      setMappingSearchStep(null);
      setMappingSearchRateLimited(false);
      setMappingSearchResults([]);
      setMappingDrilldownClass(null);
      setMappingDrilldownFilter('');
      setMappingSearchNote(null);
      setMappingSearchGroups([]);
      setExpandedGroups(new Set());
    }
  }, [mappingSearchQuery, mappingSearchSchema, mappingSearchType, showMappingSearch, cancelSearch]);

  // Cleanup on unmount: cancel any in-flight requests and drilldown retry timers
  useEffect(() => {
    return () => {
      cancelSearch();
      clearDrilldownRetry();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [cancelSearch, clearDrilldownRetry]);

  // Trigger bSDD cache init (background) whenever the search modal opens with bSDD selected
  useEffect(() => {
    if (showMappingSearch && mappingSearchSchema === 'bSDD') {
      initBsddCache((info) => setBsddCacheInfo({ ...info })).catch(() => {});
    }
  }, [showMappingSearch, mappingSearchSchema]);

  // Manual search trigger (for Search button click and Enter key)
  const handleMappingSearch = useCallback(() => {
    // Clear debounce timer to prevent it from cancelling this manual search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    executeSearch(mappingSearchQuery, mappingSearchSchema, mappingSearchType);
  }, [executeSearch, mappingSearchQuery, mappingSearchSchema, mappingSearchType]);

  const handleSelectMappingResult = useCallback((result) => {
    if (!mappingSearchUnitId) return;

    const isClassification = ['UniFormat', 'OmniClass', 'MasterFormat'].includes(mappingSearchSchema);

    // When searching via bSDD API, derive the actual schema from the result URI so that
    // IFC elements are labelled "IFC 4x3 ADD2" rather than the generic "bSDD" bucket.
    let effectiveBasis = mappingSearchSchema;
    if (mappingSearchSchema === 'bSDD') {
      const checkUri = result.uri || result._groupUri || '';
      if (checkUri.includes('/buildingsmart/ifc/4.3')) effectiveBasis = 'IFC 4x3 ADD2';
      else if (checkUri.includes('/buildingsmart/ifc/2x3')) effectiveBasis = 'IFC 2x3';
    }

    // Build the mapping data from search result
    const mappingData = {
      basis: effectiveBasis,
      name: isClassification
        ? (result.code && result.name && result.code !== result.name
            ? `${result.code} ${result.name}`
            : result.code || result.name)
        : (result.resultType === 'property'
            ? (() => {
                const parts = result.category ? result.category.split(' · ') : [];
                const entity = result._groupCode || parts[0] || '';
                const pset = parts[1] && (parts[1].startsWith('Pset_') || parts[1].startsWith('Qto_')) ? parts[1] : '';
                const prop = result.name || result.code;
                return entity && pset ? `${entity}.${pset}.${prop}` : entity ? `${entity}.${prop}` : prop;
              })()
            : (result.name || result.code)),
      description: isClassification ? (result.description || '') : (result.description || ''),
      uri: result.uri || '',
      category: result.category || ''
    };

    // Determine if we're updating an existing mapping or adding a new one
    const isUpdating = mappingSearchMappingId !== null;

    const updateRecursive = (units) => units.map(u => {
      if (u.id === mappingSearchUnitId) {
        if (isUpdating) {
          // Update existing mapping
          return {
            ...u,
            correspondingExternalElements: (u.correspondingExternalElements || []).map(m =>
              m.id === mappingSearchMappingId
                ? { ...m, ...mappingData }
                : m
            )
          };
        } else {
          // Add new mapping
          return {
            ...u,
            correspondingExternalElements: [...(u.correspondingExternalElements || []), { id: uuid(), ...mappingData }]
          };
        }
      }
      return { ...u, subInformationUnits: updateRecursive(u.subInformationUnits || []) };
    });

    // ER-first mode: update the buffer (selectedItem) then auto-commit to erHierarchy
    if (isErFirstMode && selectedItem?.id === mappingSearchUnitId) {
      setSelectedItem(prev => {
        if (isUpdating) {
          return {
            ...prev,
            data: {
              ...prev.data,
              correspondingExternalElements: (prev.data?.correspondingExternalElements || []).map(m =>
                m.id === mappingSearchMappingId
                  ? { ...m, ...mappingData }
                  : m
              )
            }
          };
        } else {
          return {
            ...prev,
            data: {
              ...prev.data,
              correspondingExternalElements: [...(prev.data?.correspondingExternalElements || []), { id: uuid(), ...mappingData }]
            }
          };
        }
      });
      pendingMappingCommitRef.current = true;
    } else if (!isErFirstMode) {
      // Legacy mode
      onChange({ ...erData, informationUnits: updateRecursive(erData?.informationUnits || []) });
    }

    closeMappingSearch();
    setMappingSearchUnitId(null);
    setMappingSearchMappingId(null);
    setMappingSearchQuery('');
  }, [mappingSearchUnitId, mappingSearchSchema, mappingSearchMappingId, isErFirstMode, selectedItem?.id, onChange, erData, closeMappingSearch]);

  // Apply the currently highlighted search result
  const handleApplySearchResult = useCallback(() => {
    if (selectedSearchResult) {
      handleSelectMappingResult(selectedSearchResult);
      setSelectedSearchResult(null);
    }
  }, [selectedSearchResult, handleSelectMappingResult]);

  // ========== Sub-ER Functions ==========

  const openSubERModal = useCallback(() => {
    setSubERModalTab('current');
    setShowSubERModal(true);
  }, []);

  // Convert selected IU to a new Sub-ER (>ER button functionality)
  const handleConvertIUToSubER = useCallback(() => {
    if (!selectedItem || selectedItem.type !== 'iu') return;

    const iuData = selectedItem.data;
    const row = treeRows.find(r => r.id === selectedItem.id);
    const currentSubERParent = row?.subERParent;

    // Create new Sub-ER with the selected IU
    const newSubER = {
      id: uuid(),
      name: iuData.name || 'New Sub-ER',
      definition: '',
      informationUnits: [{ ...iuData }],
      subErs: [],
      constraints: [],
      correspondingMvd: null
    };

    // Remove the IU from its current location
    const removeRecursive = (units) => units
      .filter(u => u.id !== iuData.id)
      .map(u => ({ ...u, subInformationUnits: removeRecursive(u.subInformationUnits || []) }));

    let updatedErData;
    if (currentSubERParent) {
      // IU is in a Sub-ER
      const updateSubERs = (subERs) => subERs.map(sub =>
        sub.id === currentSubERParent
          ? { ...sub, informationUnits: removeRecursive(sub.informationUnits || []) }
          : sub
      );
      updatedErData = {
        ...erData,
        informationUnits: erData?.informationUnits || [],
        subERs: [...updateSubERs(erData?.subERs || []), newSubER]
      };
    } else {
      // IU is in the main ER
      updatedErData = {
        ...erData,
        informationUnits: removeRecursive(erData?.informationUnits || []),
        subERs: [...(erData?.subERs || []), newSubER]
      };
    }

    onChange(updatedErData);
    setExpandedNodes(prev => new Set([...prev, newSubER.id]));
    selectNewItem({ id: newSubER.id, type: 'subEr', data: newSubER });
  }, [selectedItem, treeRows, erData, onChange, selectNewItem]);

  const handleAddSubERFromCurrent = useCallback((sourceId, sourceER) => {
    // In ER-first mode, use onMoveERAsSubER for a MOVE operation
    // The ER is removed from its original location and added as a sub-ER
    if (isErFirstMode && selectedErId && onMoveERAsSubER) {
      // Move the ER to become a sub-ER of the selected ER
      onMoveERAsSubER(sourceER.id, selectedErId);
      setShowSubERModal(false);
      // Expand to show the moved ER and select it in the detail panel
      setExpandedNodes(prev => new Set([...prev, selectedErId, sourceER.id]));
      selectNewItem({ id: sourceER.id, type: 'subEr', data: sourceER, erParent: selectedErId });
      return;
    }

    // Legacy mode: Create a copy as sub-ER
    const newSubER = {
      id: uuid(),
      name: sourceER.name || '(linked from ' + sourceId + ')',
      description: sourceER.description || '',
      informationUnits: JSON.parse(JSON.stringify(sourceER.informationUnits || [])),
      linkedTo: sourceId,
      sourceERId: sourceER.id
    };

    if (isErFirstMode && selectedErData && onUpdateER) {
      const updatedER = {
        ...selectedErData,
        subERs: [...(selectedErData.subERs || []), newSubER]
      };
      onUpdateER(selectedErId, updatedER);
    } else {
      onChange({
        ...erData,
        subERs: [...(erData?.subERs || []), newSubER]
      });
    }
    setShowSubERModal(false);
    setExpandedNodes(prev => new Set([...prev, newSubER.id]));
    selectNewItem({ id: newSubER.id, type: 'subEr', data: newSubER });
  }, [isErFirstMode, selectedErId, onMoveERAsSubER, selectedErData, onUpdateER, onChange, erData, selectNewItem]);

  const handleImportSubERFile = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        let importedER = null;

        try {
          importedER = JSON.parse(content);
        } catch {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, 'text/xml');

          const erElement = xmlDoc.querySelector('er');
          if (erElement) {
            const specId = erElement.querySelector('specId');
            importedER = {
              id: specId?.getAttribute('guid') || uuid(),
              name: specId?.getAttribute('shortTitle') || specId?.getAttribute('fullTitle') || file.name.replace(/\.(er)?xml$/i, ''),
              description: erElement.querySelector('description')?.textContent || '',
              informationUnits: []
            };

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

          // In ER-first mode, use onUpdateER to update the selected ER
          if (isErFirstMode && selectedErData && onUpdateER) {
            const updatedER = {
              ...selectedErData,
              subERs: [...(selectedErData.subERs || []), newSubER]
            };
            onUpdateER(selectedErId, updatedER);
          } else {
            // Legacy mode: use onChange
            onChange({
              ...erData,
              subERs: [...(erData?.subERs || []), newSubER]
            });
          }
          setShowSubERModal(false);
          // Expand to show the imported sub-ER and select it in the detail panel
          setExpandedNodes(prev => new Set([...prev, selectedErId || dataObject?.id, newSubER.id]));
          selectNewItem({ id: newSubER.id, type: 'subEr', data: newSubER, erParent: selectedErId });
        } else {
          alert('Could not parse the erXML file. Please ensure it is a valid ER specification.');
        }
      } catch (err) {
        console.error('Failed to import erXML:', err);
        alert('Failed to import erXML file: ' + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [isErFirstMode, selectedErData, onUpdateER, selectedErId, onChange, erData, dataObject?.id]);

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

    const examples = iuElement.querySelector('examples description');
    if (examples) {
      unit.examples = examples.textContent || '';
    }

    const mappings = iuElement.querySelectorAll('correspondingExternalElement');
    mappings.forEach(m => {
      unit.correspondingExternalElements.push({
        id: uuid(),
        basis: m.getAttribute('basis') || 'IFC',
        name: m.getAttribute('name') || ''
      });
    });

    const subUnits = iuElement.querySelectorAll(':scope > subInformationUnit > informationUnit');
    subUnits.forEach(su => {
      unit.subInformationUnits.push(parseInformationUnitXml(su));
    });

    return unit;
  };

  // ========== Image Handling ==========

  const handleImageUpload = useCallback((unitId, event) => {
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
  }, [erData, onChange]);

  const removeImage = useCallback((unitId, imageId) => {
    const removeImageRecursive = (units) => units.map(u => {
      if (u.id === unitId) {
        return { ...u, exampleImages: (u.exampleImages || []).filter(img => img.id !== imageId) };
      }
      return { ...u, subInformationUnits: removeImageRecursive(u.subInformationUnits || []) };
    });
    onChange({ ...erData, informationUnits: removeImageRecursive(erData?.informationUnits || []) });
  }, [erData, onChange]);

  // Load ER from library
  const handleLoadSubER = useCallback((libraryER) => {
    if (selectedUnitForSubER) {
      if (onAddSubER) {
        onAddSubER(selectedUnitForSubER, libraryER);
      }
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
      onLoadFromLibrary(libraryER);
    }
    setShowLibrary(false);
    setSelectedUnitForSubER(null);
  }, [selectedUnitForSubER, onAddSubER, onChange, erData, onLoadFromLibrary]);

  // ========== Count Functions ==========

  const countUnits = (units) => {
    let count = units?.length || 0;
    units?.forEach(u => { if (u.subInformationUnits) count += countUnits(u.subInformationUnits); });
    return count;
  };

  const countImages = (units) => {
    let count = 0;
    units?.forEach(u => {
      count += (u.exampleImages || []).length;
      if (u.subInformationUnits) count += countImages(u.subInformationUnits);
    });
    return count;
  };

  const totalUnits = countUnits(erData?.informationUnits || []);
  const totalImages = countImages(erData?.informationUnits || []);
  const erCount = Object.keys(erDataMap).length;

  // ========== Card-Based Information Unit Renderer ==========

  const renderInformationUnitCard = (unit, depth = 0, subERId = null, index = 0, siblingsLength = 1, hasParentIU = false) => {
    const isExpanded = expandedNodes.has(unit.id);
    const hasSubUnits = unit.subInformationUnits && unit.subInformationUnits.length > 0;

    return (
      <div key={unit.id} className={`er-card er-card-iu ${depth > 0 ? 'er-card-nested' : ''}`}>
        <div className="er-card-header" onClick={() => toggleExpand(unit.id)}>
          <span className={`er-card-chevron ${isExpanded ? 'expanded' : ''}`}>
            <ChevronRightIcon size={12} />
          </span>
          <DocumentIcon size={14} className="er-card-icon iu-icon" />
          <span className="er-card-title">{unit.name || '(unnamed)'}</span>
          <span className={`er-card-badge ${unit.isMandatory ? 'mandatory' : 'optional'}`}>
            {unit.isMandatory ? 'Required' : 'Optional'}
          </span>
          <button className="er-card-delete" onClick={(e) => { e.stopPropagation(); moveLegacyIUUp(unit.id, subERId); }} disabled={index === 0} title="Move Up">↑</button>
          <button className="er-card-delete" onClick={(e) => { e.stopPropagation(); moveLegacyIUDown(unit.id, subERId); }} disabled={index === siblingsLength - 1} title="Move Down">↓</button>
          <button className="er-card-delete" onClick={(e) => { e.stopPropagation(); indentLegacyIU(unit.id, subERId); }} disabled={index === 0} title="Indent (Make Sub-IU)">&gt;</button>
          <button className="er-card-delete" onClick={(e) => { e.stopPropagation(); outdentLegacyIU(unit.id, subERId); }} disabled={!hasParentIU} title="Outdent (Promote)">&lt;</button>
          <button
            className="er-card-delete"
            onClick={(e) => { e.stopPropagation(); removeUnit(unit.id, subERId); }}
            title="Delete"
          >
            <DeleteIcon size={12} />
          </button>
        </div>

        {isExpanded && (
          <div className="er-card-body">
            {/* Basic Fields Row */}
            <div className="er-card-row">
              <div className="er-card-field er-card-field-grow">
                <label>Name *</label>
                <input
                  type="text"
                  value={unit.name || ''}
                  onChange={(e) => updateUnit(unit.id, { name: e.target.value }, subERId)}
                  placeholder="Information Unit Name"
                  className="er-input"
                />
              </div>
              <div className="er-card-field">
                <label>Data Type</label>
                <select
                  value={DATA_TYPES.includes(unit.dataType) ? unit.dataType : 'Other'}
                  onChange={(e) => {
                    const val = e.target.value === 'Other' ? '' : e.target.value;
                    updateUnit(unit.id, { dataType: val }, subERId);
                  }}
                  className="er-select"
                >
                  {DATA_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                  <option value="Other">Other (specify)</option>
                </select>
              </div>
              <div className="er-card-field er-card-field-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={unit.isMandatory || false}
                    onChange={(e) => updateUnit(unit.id, { isMandatory: e.target.checked }, subERId)}
                  />
                  Mandatory
                </label>
              </div>
            </div>

            {/* Custom Data Type */}
            {!DATA_TYPES.includes(unit.dataType) && unit.dataType !== '' && (
              <div className="er-card-field">
                <label>Custom Data Type</label>
                <input
                  type="text"
                  value={unit.dataType || ''}
                  onChange={(e) => updateUnit(unit.id, { dataType: e.target.value }, subERId)}
                  placeholder="Specify data type..."
                  className="er-input"
                />
              </div>
            )}

            {/* Definition */}
            <div className="er-card-field">
              <DefinitionWithFigures
                value={unit.definition || ''}
                figures={unit.definitionFigures || []}
                onChange={(val) => updateUnit(unit.id, { definition: val }, subERId)}
                onFiguresChange={(figs) => updateUnit(unit.id, { definitionFigures: figs }, subERId)}
                placeholder="Describe this information unit..."
              />
            </div>

            {/* Examples */}
            <div className="er-card-field">
              <label>Examples</label>
              <input
                type="text"
                value={unit.examples || ''}
                onChange={(e) => updateUnit(unit.id, { examples: e.target.value }, subERId)}
                placeholder="e.g., Wall-001, Level-1"
                className="er-input"
              />
            </div>

            {/* Example Images */}
            <div className="er-card-field">
              <div className="er-card-field-header">
                <label>Example Images</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  ref={el => fileInputRefs.current[unit.id] = el}
                  onChange={(e) => handleImageUpload(unit.id, e)}
                />
                <button className="er-link-btn" onClick={() => fileInputRefs.current[unit.id]?.click()}>
                  + Add Image
                </button>
              </div>
              {(unit.exampleImages || []).length > 0 ? (
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
                <p className="er-empty-small">No images added</p>
              )}
            </div>

            {/* External Mappings */}
            <div className="er-card-field">
              <div className="er-card-field-header">
                <label><LinkIcon size={12} /> External Mappings</label>
                <button className="er-link-btn" onClick={() => addMapping(unit.id)}>+ Add Mapping</button>
              </div>
              {(unit.correspondingExternalElements || []).length === 0 ? (
                <p className="er-empty-small">No mappings defined</p>
              ) : (
                <div className="er-mapping-list">
                  {(unit.correspondingExternalElements || []).map(mapping => {
                    const schemaOption = SCHEMA_OPTIONS.find(s => s.value === mapping.basis);
                    const isSearchable = mapping.basis !== 'Other';
                    const isOther = mapping.basis === 'Other';
                    const isClassification = ['UniFormat', 'OmniClass', 'MasterFormat'].includes(mapping.basis);

                    return (
                      <div key={mapping.id} className={`er-mapping-row ${isOther ? 'er-mapping-row-other' : ''}`}>
                        <select
                          value={mapping.basis || 'bSDD'}
                          onChange={(e) => {
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
                            placeholder="Standard name"
                            className="er-input-small er-input-custom-schema"
                          />
                        )}
                        <div className="er-mapping-value">
                          <input
                            type="text"
                            ref={(el) => { mappingInputRefs.current[mapping.id] = el; }}
                            value={mapping.name || ''}
                            onChange={(e) => updateMapping(unit.id, mapping.id, { name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && isSearchable) {
                                e.preventDefault();
                                openMappingSearch(unit.id, mapping.basis, mapping.id);
                              }
                            }}
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
                            onClick={() => openMappingSearch(unit.id, mapping.basis, mapping.id)}
                            title={mapping.name ? "Change mapping" : "Search schema"}
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

            {/* Sub Information Units */}
            {hasSubUnits && (
              <div className="er-card-sub-units">
                <div className="er-card-sub-units-header">
                  <label>Sub Information Units</label>
                </div>
                {unit.subInformationUnits.map((subUnit, i) => renderInformationUnitCard(subUnit, depth + 1, subERId, i, unit.subInformationUnits.length, true))}
              </div>
            )}

            {/* Add Sub-Unit Button */}
            <div className="er-card-actions">
              <button className="er-link-btn" onClick={() => addInformationUnit(unit.id, subERId)}>
                + Add Sub-Unit
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ========== Card-Based Sub-ER Renderer ==========

  const renderSubERCard = (subER) => {
    const isExpanded = expandedNodes.has(subER.id);
    const hasContent = (subER.informationUnits?.length > 0) || (subER.subERs?.length > 0);

    return (
      <div key={subER.id} className="er-card er-card-sub-er">
        <div className="er-card-header" onClick={() => toggleExpand(subER.id)}>
          <span className={`er-card-chevron ${isExpanded ? 'expanded' : ''}`}>
            <ChevronRightIcon size={12} />
          </span>
          <FolderIcon size={14} className="er-card-icon sub-er-icon" />
          <span className="er-card-title">{subER.name || '(unnamed Sub-ER)'}</span>
          {subER.linkedTo && (
            <span className="er-card-badge linked">Linked</span>
          )}
          <button
            className="er-card-delete"
            onClick={(e) => {
              e.stopPropagation();
              const updated = (erData?.subERs || []).filter(s => s.id !== subER.id);
              onChange({ ...erData, subERs: updated });
            }}
            title="Delete Sub-ER"
          >
            <DeleteIcon size={12} />
          </button>
        </div>

        {isExpanded && (
          <div className="er-card-body">
            {/* Sub-ER Name */}
            <div className="er-card-field">
              <label>Sub-ER Name</label>
              <input
                type="text"
                value={subER.name || ''}
                onChange={(e) => {
                  const updated = (erData?.subERs || []).map(s =>
                    s.id === subER.id ? { ...s, name: e.target.value } : s
                  );
                  onChange({ ...erData, subERs: updated });
                }}
                placeholder="Sub-ER name"
                className="er-input"
              />
            </div>

            {/* Sub-ER Description */}
            <div className="er-card-field">
              <label>Description</label>
              <textarea
                value={subER.description || ''}
                onChange={(e) => {
                  const updated = (erData?.subERs || []).map(s =>
                    s.id === subER.id ? { ...s, description: e.target.value } : s
                  );
                  onChange({ ...erData, subERs: updated });
                }}
                placeholder="Description..."
                rows={2}
                className="er-textarea"
              />
            </div>

            {subER.linkedTo && (
              <div className="er-card-meta">
                Linked to: {subER.linkedTo}
              </div>
            )}

            {/* Information Units in Sub-ER */}
            {subER.informationUnits && subER.informationUnits.length > 0 && (
              <div className="er-card-section">
                <div className="er-card-section-header">
                  <label>Information Units ({subER.informationUnits.length})</label>
                </div>
                {subER.informationUnits.map((iu, i) => renderInformationUnitCard(iu, 0, subER.id, i, subER.informationUnits.length, false))}
              </div>
            )}

            {/* Add IU to Sub-ER */}
            <div className="er-card-actions">
              <button className="er-link-btn" onClick={() => addInformationUnit(null, subER.id)}>
                + Add Information Unit
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ========== List View ==========

  if (mode === 'list') {
    return (
      <div className={`er-panel ${!showBpmnEditor ? 'er-panel-expanded' : ''}`}>
        <div className="er-panel-header">
          <div className="er-panel-title">
            <span className="er-title-icon"><DataObjectIcon size={20} /></span>
            <div>
              <h3>Individual ER</h3>
              <p className="er-data-object-name">{erCount} ER(s) in project</p>
            </div>
          </div>
          <button className="er-close-btn" onClick={onClose}><CloseIcon size={16} /></button>
        </div>

        <div className="er-list-container">
          {erCount === 0 ? (
            <div className="er-empty-state">
              <DataObjectIcon size={32} />
              <p>No ERs in project</p>
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
                        <span className="er-list-item-units">{unitCount} information unit(s)</span>
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

        <div className="er-panel-footer">
          <span>{erCount} ER(s) defined</span>
          <span className="er-iso-ref">ISO 29481-3</span>
        </div>
      </div>
    );
  }

  // ========== ER-First Mode View ==========
  // Check ER-first mode FIRST (before legacy dataObject check)

  if (isErFirstMode) {
    return (
      <div ref={panelContainerRef} className={`er-panel er-panel-first-mode ${!showBpmnEditor ? 'er-panel-expanded' : ''}`}>
        {/* Header */}
        <div className="er-panel-header">
          <div className="er-panel-title">
            <span className="er-title-icon"><FolderIcon size={20} /></span>
            <div>
              <h3>Individual ER</h3>
              <p className="er-data-object-name">
                {selectedErData?.name || 'No ER selected'}
                {selectedErId && selectedErData && (
                  <button
                    className={`er-info-btn ${selectedItem?.id === selectedErId && selectedItem?.type === 'er' ? 'er-info-btn-active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedItem?.id !== selectedErId || selectedItem?.type !== 'er') {
                        confirmBeforeSwitch(() => {
                          selectNewItem({ id: selectedErId, type: 'er', data: selectedErData });
                        });
                      }
                    }}
                    title="Show ER details"
                  >
                    i
                  </button>
                )}
              </p>
            </div>
          </div>
          <button className="er-close-btn" onClick={onClose} title="Close ER panel"><CloseIcon size={16} /></button>
        </div>

        {/* Toolbar for Information Units (ER manipulation is in ER Hierarchy Pane) */}
        <div className="er-toolbar">
          {/* Add/Delete IU buttons */}
          <button
            className="er-toolbar-btn"
            onClick={() => selectedErId && handleAddIUToEr(selectedErId)}
            disabled={!selectedErId}
            title="Add Information Unit"
          >
            <AddIcon size={14} /> IU
          </button>
          <button
            className="er-toolbar-btn"
            onClick={() => {
              commitCurrentEdit();
              const parentErId = selectedItem?.erParent || selectedIULocation?.parentErId;
              if (selectedItem?.type === 'iu' && parentErId) {
                handleDeleteIU(selectedItem.id, parentErId);
              }
            }}
            disabled={!selectedItem || selectedItem?.type !== 'iu'}
            title="Delete selected Information Unit"
          >
            <DeleteIcon size={14} />
          </button>
          <div className="er-toolbar-divider" />
          {/* Move and indent controls for IUs */}
          <button
            className="er-toolbar-btn"
            onClick={() => {
              commitCurrentEdit();
              const parentErId = selectedItem?.erParent || selectedIULocation?.parentErId;
              if (selectedItem?.type === 'iu' && parentErId) {
                handleMoveIUUp(selectedItem.id, parentErId);
              }
            }}
            disabled={!canMoveSelectedIUUp}
            title="Move IU Up"
          >
            ↑
          </button>
          <button
            className="er-toolbar-btn"
            onClick={() => {
              commitCurrentEdit();
              const parentErId = selectedItem?.erParent || selectedIULocation?.parentErId;
              if (selectedItem?.type === 'iu' && parentErId) {
                handleMoveIUDown(selectedItem.id, parentErId);
              }
            }}
            disabled={!canMoveSelectedIUDown}
            title="Move IU Down"
          >
            ↓
          </button>
          <button
            className="er-toolbar-btn"
            onClick={() => {
              commitCurrentEdit();
              const parentErId = selectedItem?.erParent || selectedIULocation?.parentErId;
              if (selectedItem?.type === 'iu' && parentErId) {
                handleIndentIU(selectedItem.id, parentErId);
              }
            }}
            disabled={!canIndentSelectedIU}
            title="Indent IU (Make Sub-IU)"
          >
            &gt;
          </button>
          <button
            className="er-toolbar-btn"
            onClick={() => {
              commitCurrentEdit();
              const parentErId = selectedItem?.erParent || selectedIULocation?.parentErId;
              if (selectedItem?.type === 'iu' && parentErId) {
                handleOutdentIU(selectedItem.id, parentErId);
              }
            }}
            disabled={!canOutdentSelectedIU}
            title="Outdent IU (Promote)"
          >
            &lt;
          </button>
          <div className="er-toolbar-divider" />
          <button className="er-toolbar-btn" onClick={handleExpandAll} title="Expand All">
            <ExpandAllIcon size={14} />
          </button>
          <button className="er-toolbar-btn" onClick={handleCollapseAll} title="Collapse All">
            <CollapseAllIcon size={14} />
          </button>
        </div>

        {/* Information Units and Sub-ERs Section Header */}
        {selectedErId && (
          <div className="er-iu-section-header">
            <span>Information Units and Sub-ERs</span>
            <span className="er-iu-count">{selectedErData?.informationUnits?.length || 0} IU(s)</span>
          </div>
        )}

        {/* Information Units Tree */}
        <div className={`er-hierarchy-tree ${!showBpmnEditor ? 'er-table-mode' : ''}`}>
          {!selectedErId ? (
            <div className="er-empty-state">
              <FolderIcon size={32} />
              <p>No ER selected</p>
              <span className="er-hint">Select an ER from the ER Hierarchy pane</span>
            </div>
          ) : treeRows.length === 0 ? (
            <div className="er-empty-state">
              <DocumentIcon size={32} />
              <p>No Information Units or ERs</p>
              <span className="er-hint">Click "+IU" to add an Information Unit or "+ER" to add a Sub-ER</span>
            </div>
          ) : (
            <div className="er-tree-container">
              {/* Table Header - shown in full table mode */}
              {!showBpmnEditor && (
                <div className="er-table-header">
                  <div className="er-tree-cell er-col-name">Name</div>
                  <div className="er-tree-cell er-col-datatype">Data Type</div>
                  <div className="er-tree-cell er-col-definition">Definition</div>
                  <div className="er-tree-cell er-col-mandatory">Mandatory</div>
                  <div className="er-tree-cell er-col-examples">Examples</div>
                  <div className="er-tree-cell er-col-constraints">Constraints</div>
                  <div className="er-tree-cell er-col-ext">Ext. Elm.</div>
                </div>
              )}
              {treeRows.map(row => (
                <div
                  key={row.id}
                  ref={el => { if (el) treeRowRefs.current[row.id] = el; }}
                  className={`er-tree-row ${row.type}-type ${selectedErId === row.id ? 'selected' : ''} ${selectedItem?.id === row.id ? 'item-selected' : ''}`}
                  onClick={() => {
                    // Check for unsaved changes before switching
                    if (selectedItem?.id !== row.id) {
                      confirmBeforeSwitch(() => {
                        selectNewItem({ id: row.id, type: row.type, data: row.data, erParent: row.erParent || null });
                      });
                    }
                  }}
                >
                  <div className="er-tree-cell er-col-name">
                    <div className="er-tree-cell-name">
                      {/* Indent spacers */}
                      {Array(row.depth).fill(0).map((_, i) => (
                        <span key={i} className="er-tree-indent" />
                      ))}
                      {/* Expand/Collapse Chevron */}
                      {row.hasChildren ? (
                        <span
                          className={`er-tree-chevron ${row.isExpanded ? 'expanded' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(row.id);
                            if (selectedItem?.id !== row.id) {
                              confirmBeforeSwitch(() => {
                                selectNewItem({ id: row.id, type: row.type, data: row.data, erParent: row.erParent || null });
                              });
                            }
                          }}
                        >
                          <ChevronRightIcon size={12} />
                        </span>
                      ) : (
                        <span className="er-tree-indent" />
                      )}
                      {/* Icon */}
                      {row.type === 'er' || row.type === 'subEr' ? (
                        <FolderIcon size={14} className="er-tree-icon er-icon" />
                      ) : (
                        <DocumentIcon size={14} className="er-tree-icon iu-icon" />
                      )}
                      {/* Name */}
                      <span className="er-tree-name">{row.name}</span>
                    </div>
                  </div>
                  {/* Data Type (IU only) */}
                  <div className="er-tree-cell er-col-datatype">
                    {row.type === 'iu' ? row.data?.dataType || '-' : ''}
                  </div>
                  {/* Definition */}
                  <div className="er-tree-cell er-col-definition">
                    {(row.data?.definition || row.data?.description || '').substring(0, 30)}
                    {(row.data?.definition || row.data?.description || '').length > 30 ? '...' : ''}
                    {!(row.data?.definition || row.data?.description) && '-'}
                  </div>
                  {/* Mandatory */}
                  <div className="er-tree-cell er-col-mandatory">
                    {row.type === 'iu' && (
                      <input
                        type="checkbox"
                        checked={row.data?.isMandatory || false}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleMandatoryToggle(row.id, e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                  {/* Examples - shown in full table mode */}
                  {!showBpmnEditor && (
                    <div className="er-tree-cell er-col-examples">
                      {row.type === 'iu' && row.data?.examples ? (
                        <span title={row.data.examples}>
                          {row.data.examples.substring(0, 20)}{row.data.examples.length > 20 ? '...' : ''}
                        </span>
                      ) : '-'}
                    </div>
                  )}
                  {/* Constraints - shown in full table mode */}
                  {!showBpmnEditor && (
                    <div className="er-tree-cell er-col-constraints">
                      {row.type === 'iu' && (() => {
                        const c = row.data?.constraints;
                        const count = Array.isArray(c) ? c.length : (c ? 1 : 0);
                        return count > 0 ? <span className="er-constraint-badge">{count}</span> : '-';
                      })()}
                    </div>
                  )}
                  {/* External Element Mappings - shown in full table mode */}
                  {!showBpmnEditor && (
                    <div className="er-tree-cell er-col-ext">
                      {row.type === 'iu' && row.data?.correspondingExternalElements?.length > 0 ? (
                        <span className="er-ext-badge">{row.data.correspondingExternalElements.length}</span>
                      ) : '-'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel (below tree) - shows selected ER or IU for editing */}
        {selectedItem && (
          <>
          <div
            className={`er-detail-resize-handle ${resizingRef.current ? 'dragging' : ''}`}
            onMouseDown={handleResizeMouseDown}
            title="Drag to resize"
          />
          <div className="er-detail-panel" ref={detailPanelRef} style={{ height: `${detailPanelRatio * 100}%` }}>
            {selectedItem.type === 'iu' ? (
              /* IU Detail Editor */
              <>
                <div className="er-detail-header">
                  <span className="er-detail-title">
                    <DocumentIcon size={14} /> Edit Information Unit: {selectedItem.data?.name || '(unnamed)'}
                  </span>
                  <div className="er-detail-actions">
                    <button className="er-detail-save-btn" onClick={handleDetailSave} title="Apply changes and close">
                      <SaveIcon size={14} /> Apply and Close
                    </button>
                    <button className="er-detail-close-btn" onClick={handleDetailClose} title="Close without saving">
                      <CloseIcon size={14} />
                    </button>
                  </div>
                </div>
                <div className="er-detail-body">
                  <div className="er-detail-row">
                    <div className="er-detail-field er-detail-field-grow">
                      <label>Name *</label>
                      <input
                        type="text"
                        value={selectedItem.data?.name || ''}
                        onChange={(e) => {
                          setSelectedItem(prev => ({ ...prev, data: { ...prev.data, name: e.target.value } }));
                        }}
                        placeholder="Information Unit name"
                        className="er-input"
                      />
                    </div>
                    <div className="er-detail-field er-detail-field-datatype">
                      <label>Data Type</label>
                      <select
                        value={DATA_TYPES.includes(selectedItem.data?.dataType) ? selectedItem.data?.dataType : 'Other'}
                        onChange={(e) => {
                          const newType = e.target.value === 'Other' ? '' : e.target.value;
                          setSelectedItem(prev => ({ ...prev, data: { ...prev.data, dataType: newType } }));
                        }}
                        className="er-select"
                      >
                        {DATA_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                        <option value="Other">Other (specify)</option>
                      </select>
                    </div>
                    <div className="er-detail-field er-detail-field-checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedItem.data?.isMandatory || false}
                          onChange={(e) => {
                            setSelectedItem(prev => ({ ...prev, data: { ...prev.data, isMandatory: e.target.checked } }));
                          }}
                        />
                        Mandatory
                      </label>
                    </div>
                  </div>
                  <div className="er-detail-field">
                    <DefinitionWithFigures
                      value={selectedItem.data?.definition || ''}
                      figures={selectedItem.data?.definitionFigures || []}
                      onChange={(val) => {
                        setSelectedItem(prev => ({ ...prev, data: { ...prev.data, definition: val } }));
                      }}
                      onFiguresChange={(figs) => commitFigureChange('definitionFigures', figs)}
                      onBlur={() => { if (hasUnsavedDetailChanges()) commitCurrentEdit(); }}
                      placeholder="Describe this information unit..."
                      rows={6}
                    />
                  </div>
                  <div className="er-detail-field">
                    <DefinitionWithFigures
                      label="Examples"
                      value={selectedItem.data?.examples || ''}
                      figures={selectedItem.data?.exampleImages || []}
                      onChange={(val) => {
                        setSelectedItem(prev => ({ ...prev, data: { ...prev.data, examples: val } }));
                      }}
                      onFiguresChange={(figs) => commitFigureChange('exampleImages', figs)}
                      onBlur={() => { if (hasUnsavedDetailChanges()) commitCurrentEdit(); }}
                      placeholder="e.g., Wall-001, Level-1"
                      rows={3}
                    />
                  </div>
                  {/* Constraints
                      Normalise legacy string format (mvdXML/old imports) to array for display.
                      On first edit the array is written back, migrating the IU in place. */}
                  {(() => {
                    const raw = selectedItem.data?.constraints;
                    const constraintArr = Array.isArray(raw)
                      ? raw
                      : (raw ? [{ id: 'legacy-0', description: raw, businessRule: '' }] : []);
                    const setConstraints = (updater) => setSelectedItem(prev => ({
                      ...prev,
                      data: { ...prev.data, constraints: updater(Array.isArray(prev.data?.constraints) ? prev.data.constraints : []) }
                    }));
                    return (
                  <div className="er-card-field">
                    <div className="er-card-field-header">
                      <label>Constraints</label>
                      <button
                        className="er-link-btn"
                        onClick={() => {
                          const newConstraint = { id: uuid(), description: '', businessRule: '' };
                          setConstraints(prev => [...prev, newConstraint]);
                        }}
                      >
                        + Add Constraint
                      </button>
                    </div>
                    {constraintArr.length === 0 ? (
                      <p className="er-empty-small">No constraints defined</p>
                    ) : (
                      <div className="er-constraint-list">
                        {constraintArr.map((constraint, idx) => (
                          <div key={constraint.id} className="er-constraint-item">
                            <div className="er-constraint-index">{idx + 1}</div>
                            <div className="er-constraint-fields">
                              <input
                                type="text"
                                value={constraint.description || ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setConstraints(prev => prev.map(c =>
                                    c.id === constraint.id ? { ...c, description: v } : c
                                  ));
                                }}
                                placeholder="Constraint (e.g., > 0, length ≤ 100, must be unique, Pattern: RAL.*)"
                                className="er-input-small er-constraint-desc"
                              />
                              <input
                                type="text"
                                value={constraint.businessRule || ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setConstraints(prev => prev.map(c =>
                                    c.id === constraint.id ? { ...c, businessRule: v } : c
                                  ));
                                }}
                                placeholder="Business rule reference (optional, e.g., BR-001) → IDS instructions"
                                className="er-input-small er-constraint-br"
                              />
                            </div>
                            <button
                              className="er-remove-btn"
                              onClick={() => setConstraints(prev => prev.filter(c => c.id !== constraint.id))}
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                    );
                  })()}

                  {/* External Mappings */}
                  <div className="er-card-field">
                    <div className="er-card-field-header">
                      <label><LinkIcon size={12} /> External Mappings</label>
                      <button
                        className="er-link-btn"
                        onClick={() => {
                          const newMapping = { id: uuid(), basis: 'bSDD', name: '' };
                          setSelectedItem(prev => ({
                            ...prev,
                            data: { ...prev.data, correspondingExternalElements: [...(prev.data?.correspondingExternalElements || []), newMapping] }
                          }));
                          // Track newly added mapping for auto-scroll and focus
                          newlyAddedMappingRef.current = { mappingId: newMapping.id, unitId: selectedItem.id };
                          setMappingScrollTrigger(c => c + 1);
                        }}
                      >
                        + Add Mapping
                      </button>
                    </div>
                    {(selectedItem.data?.correspondingExternalElements || []).length === 0 ? (
                      <p className="er-empty-small">No mappings defined</p>
                    ) : (
                      <div className="er-mapping-list">
                        {(selectedItem.data?.correspondingExternalElements || []).map(mapping => {
                          const schemaOption = SCHEMA_OPTIONS.find(s => s.value === mapping.basis);
                          const isSearchable = mapping.basis !== 'Other';
                          const isOther = mapping.basis === 'Other';
                          const isClassification = ['UniFormat', 'OmniClass', 'MasterFormat'].includes(mapping.basis);

                          const updateMappingInHierarchy = (mappingId, updates) => {
                            setSelectedItem(prev => ({
                              ...prev,
                              data: {
                                ...prev.data,
                                correspondingExternalElements: (prev.data?.correspondingExternalElements || []).map(m =>
                                  m.id === mappingId ? { ...m, ...updates } : m
                                )
                              }
                            }));
                          };

                          const removeMappingFromHierarchy = (mappingId) => {
                            setSelectedItem(prev => ({
                              ...prev,
                              data: {
                                ...prev.data,
                                correspondingExternalElements: (prev.data?.correspondingExternalElements || []).filter(m => m.id !== mappingId)
                              }
                            }));
                          };

                          return (
                            <div key={mapping.id} className={`er-mapping-row ${isOther ? 'er-mapping-row-other' : ''}`}>
                              <select
                                value={mapping.basis || 'bSDD'}
                                onChange={(e) => {
                                  const newBasis = e.target.value;
                                  if (newBasis === 'Other') {
                                    updateMappingInHierarchy(mapping.id, { basis: newBasis });
                                  } else {
                                    updateMappingInHierarchy(mapping.id, { basis: newBasis, name: '', description: '', customBasis: '' });
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
                                  onChange={(e) => updateMappingInHierarchy(mapping.id, { customBasis: e.target.value })}
                                  placeholder="Standard name"
                                  className="er-input-small er-input-custom-schema"
                                />
                              )}
                              <div className="er-mapping-value">
                                <input
                                  type="text"
                                  ref={(el) => { mappingInputRefs.current[mapping.id] = el; }}
                                  value={mapping.name || ''}
                                  onChange={(e) => updateMappingInHierarchy(mapping.id, { name: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && isSearchable) {
                                      e.preventDefault();
                                      openMappingSearch(selectedItem.id, mapping.basis, mapping.id);
                                    }
                                  }}
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
                                  onClick={() => openMappingSearch(selectedItem.id, mapping.basis, mapping.id)}
                                  title={mapping.name ? "Change mapping" : "Search schema"}
                                >
                                  <SearchIcon size={14} />
                                </button>
                              )}
                              <button className="er-remove-btn" onClick={() => removeMappingFromHierarchy(mapping.id)}>×</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* ER Detail Editor */
              <>
                <div className="er-detail-header">
                  <span className="er-detail-title">
                    <FolderIcon size={14} /> Edit ER: {selectedItem.data?.name || '(unnamed ER)'}
                  </span>
                  <div className="er-detail-actions">
                    <button className="er-detail-save-btn" onClick={handleDetailSave} title="Apply changes and close">
                      <SaveIcon size={14} /> Apply and Close
                    </button>
                    <button className="er-detail-close-btn" onClick={handleDetailClose} title="Close without saving">
                      <CloseIcon size={14} />
                    </button>
                  </div>
                </div>
                <div className="er-detail-body">
                  <div className="er-detail-field">
                    <label>ER Name</label>
                    <input
                      type="text"
                      value={selectedItem.data?.name || ''}
                      onChange={(e) => {
                        setSelectedItem(prev => ({ ...prev, data: { ...prev.data, name: e.target.value } }));
                      }}
                      onBlur={() => {
                        if (hasUnsavedDetailChanges()) commitCurrentEdit();
                      }}
                      placeholder="e.g., Site Survey Data"
                      className="er-input"
                    />
                  </div>
                  <div className="er-detail-field">
                    <DefinitionWithFigures
                      label="Description"
                      value={selectedItem.data?.description || ''}
                      figures={selectedItem.data?.descriptionFigures || []}
                      onChange={(val) => {
                        setSelectedItem(prev => ({ ...prev, data: { ...prev.data, description: val } }));
                      }}
                      onFiguresChange={(figs) => commitFigureChange('descriptionFigures', figs)}
                      onBlur={() => { if (hasUnsavedDetailChanges()) commitCurrentEdit(); }}
                      placeholder="Brief description of this Exchange Requirement..."
                      rows={4}
                    />
                  </div>
                  <div className="er-detail-field">
                    <DefinitionWithFigures
                      label="Examples"
                      value={selectedItem.data?.examples || ''}
                      figures={selectedItem.data?.exampleImages || []}
                      onChange={(val) => {
                        setSelectedItem(prev => ({ ...prev, data: { ...prev.data, examples: val } }));
                      }}
                      onFiguresChange={(figs) => commitFigureChange('exampleImages', figs)}
                      onBlur={() => { if (hasUnsavedDetailChanges()) commitCurrentEdit(); }}
                      placeholder="Examples for this Exchange Requirement..."
                      rows={3}
                    />
                  </div>
                  <div className="er-detail-section">
                    <div className="er-detail-section-header">
                      <InfoUnitIcon size={14} />
                      <span>Information Units ({selectedItem.data?.informationUnits?.length || 0})</span>
                      <button
                        className="er-detail-add-btn"
                        onClick={() => {
                          commitCurrentEdit();
                          handleAddIUToEr(selectedItem.id);
                        }}
                        title="Add Information Unit"
                      >
                        <AddIcon size={12} /> + IU
                      </button>
                    </div>
                    {selectedItem.data?.informationUnits?.length > 0 && (
                      <div className="er-iu-list">
                        {selectedItem.data.informationUnits.map(iu => (
                          <div key={iu.id} className="er-iu-item">
                            <span className="er-iu-name">{iu.name || '(unnamed)'}</span>
                            <span className="er-iu-type">{iu.dataType || 'String / Text'}</span>
                            <span className={`er-iu-mandatory ${iu.isMandatory ? 'required' : ''}`}>
                              {iu.isMandatory ? 'Required' : 'Optional'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          </>
        )}

        {/* Footer */}
        <div className="er-panel-footer">
          <span>{treeRows.filter(r => r.type === 'er' || r.type === 'subEr').length} ER(s), {treeRows.filter(r => r.type === 'iu').length} IU(s)</span>
          <span className="er-iso-ref">ISO 29481-3</span>
        </div>

        {/* Mapping Search Modal for ER-first mode */}
        {showMappingSearch && (
          <SearchErrorBoundary onClose={closeMappingSearch}>
          <div className="er-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeMappingSearch(); }}>
            <div className="er-modal er-modal-search" onClick={(e) => e.stopPropagation()}>
              <div className="er-modal-header">
                <h3>Search Matching External Information Item</h3>
                <button className="er-close-btn" onClick={closeMappingSearch}><CloseIcon size={16} /></button>
              </div>
              <div className="er-modal-body">
                <div className="er-search-controls">
                  <div className="er-field er-field-inline">
                    <label>Schema</label>
                    <select
                      value={mappingSearchSchema}
                      onChange={(e) => {
                        setMappingSearchSchema(e.target.value);
                        setMappingSearchResults([]);
                        setMappingSearchQuery(mappingSearchIuNameRef.current || '');
                      }}
                      className="er-select er-select-schema-search"
                    >
                      {SCHEMA_OPTIONS.filter(opt => opt.searchable).map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}{opt.value === 'bSDD' && bsddCacheInfo.state === 'ready' ? ' (cached)' : opt.apiEnabled ? ' (API)' : ''}
                        </option>
                      ))}
                    </select>
                    {mappingSearchSchema === 'bSDD' && (
                      <span className={`er-bsdd-cache-badge er-bsdd-cache-${bsddCacheInfo.state}`}>
                        {bsddCacheInfo.state === 'loading' && (bsddCacheInfo.current > 0
                          ? `Loading ${bsddCacheInfo.current}${bsddCacheInfo.total > 0 ? `/${bsddCacheInfo.total}` : ''}…`
                          : (bsddCacheInfo.stage || 'Connecting…'))}
                        {bsddCacheInfo.state === 'ready' && `✓ ${bsddCacheInfo.classCount} classes`}
                        {bsddCacheInfo.state === 'error' && '⚠ using live API'}
                      </span>
                    )}
                  </div>

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

                <div className="er-search-input-row">
                  <input
                    type="text"
                    value={mappingSearchQuery}
                    onChange={(e) => { setMappingSearchQuery(e.target.value); setSelectedSearchResult(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleMappingSearch(); } }}
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
                  {selectedSearchResult && (
                    <span className="er-selection-hint">
                      {(() => {
                        const r = selectedSearchResult;
                        if (r.resultType !== 'property') return r.code || r.name;
                        const parts = r.category ? r.category.split(' · ') : [];
                        const entity = r._groupCode || parts[0] || '';
                        const pset = parts[1] && (parts[1].startsWith('Pset_') || parts[1].startsWith('Qto_')) ? parts[1] : '';
                        const prop = r.name || r.code;
                        return entity && pset ? `${entity}.${pset}.${prop}` : entity ? `${entity}.${prop}` : prop;
                      })()}
                    </span>
                  )}
                  <button
                    className="er-action-btn er-action-btn-primary"
                    onClick={handleApplySearchResult}
                    disabled={!selectedSearchResult}
                    title="Apply selected result as external mapping"
                  >
                    Apply
                  </button>
                </div>

                <div className="er-search-results">
                  {mappingSearchNote && !mappingSearchLoading && drilldownCountdown === null && (
                    <div className="er-search-note">{mappingSearchNote}</div>
                  )}
                  {drilldownCountdown !== null ? (
                    <div className="er-search-loading er-search-ratelimit-countdown">
                      <span className="er-search-hourglass er-search-hourglass-spin">&#9203;</span>
                      <span>bSDD rate limit reached. Retrying in <strong>{drilldownCountdown}s</strong>…</span>
                      <button className="er-retry-btn" onClick={() => { const fn = rateLimitRetryFnRef.current; clearDrilldownRetry(); fn?.(); }}>Retry Now</button>
                      <div className="er-search-ratelimit-note">Note: On first use, bSDD classes are downloaded and cached locally. Subsequent searches run instantly from the local cache.</div>
                    </div>
                  ) : mappingSearchLoading ? (
                    <div className="er-search-loading">
                      {mappingSearchSchema === 'bSDD' ? (
                        <>
                          <span className="er-search-hourglass">&#9203;</span>
                          <span>
                            {mappingSearchStep === 'properties'
                              ? 'Loading class properties...'
                              : 'Searching IFC classes...'}
                          </span>
                          {bsddCacheInfo.state !== 'ready' && (
                            <span className="er-search-loading-hint">This may take a moment on the first search.</span>
                          )}
                        </>
                      ) : (
                        <span>Searching...</span>
                      )}
                    </div>
                  ) : mappingSearchError ? (
                    <div className="er-search-empty er-search-error">
                      <span>{mappingSearchError}</span>
                      {mappingSearchRateLimited && (
                        <button className="er-retry-btn" onClick={handleMappingSearch}>Try Again</button>
                      )}
                    </div>
                  ) : (mappingSearchGroups.length === 0 && (!Array.isArray(mappingSearchResults) || mappingSearchResults.length === 0)) ? (
                    <div className="er-search-empty">
                      {mappingSearchQuery.trim() ? (
                        <span>No results found. Try a different search term.</span>
                      ) : (
                        <span>Enter a search term to find elements. Click a result to preview details, then click <strong>Apply</strong> to confirm.</span>
                      )}
                    </div>
                  ) : (
                    <div className="er-search-result-list">
                      {mappingSearchGroups.length > 0 ? (
                        mappingSearchGroups.map((group) => {
                          const isExpanded = expandedGroups.has(group.classUri);
                          const isClassSelected = selectedSearchResult?.resultType === 'class' && selectedSearchResult?.uri === group.classUri;
                          return (
                            <div key={group.classUri} className="er-search-group">
                              <div className={`er-search-group-header ${isClassSelected ? 'er-search-result-selected' : ''}`}>
                                <span
                                  className="er-search-group-arrow"
                                  onClick={(e) => { e.stopPropagation(); setExpandedGroups(prev => { const next = new Set(prev); if (next.has(group.classUri)) next.delete(group.classUri); else next.add(group.classUri); return next; }); }}
                                >
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                                <span
                                  className="er-search-group-name er-search-group-name-selectable"
                                  onClick={() => setSelectedSearchResult({ name: group.classCode || group.className, code: group.classCode || '', description: '', category: 'bSDD (IFC 4.3)', uri: group.classUri, resultType: 'class', _groupUri: group.classUri, _groupCode: group.classCode || '' })}
                                  onDoubleClick={() => handleSelectMappingResult({ name: group.classCode || group.className, code: group.classCode || '', description: '', category: 'bSDD (IFC 4.3)', uri: group.classUri, resultType: 'class', _groupCode: group.classCode || '' })}
                                >
                                  {group.classCode || group.className}
                                  {group.classCode && group.classCode !== group.className && <span className="er-search-result-code">{group.className}</span>}
                                </span>
                                <span className="er-search-group-count">{group.properties.length} {group.properties.length === 1 ? 'property' : 'properties'}</span>
                              </div>
                              {isExpanded && group.properties.map((prop, propIdx) => {
                                const isSelected = selectedSearchResult && selectedSearchResult.uri === prop.uri && selectedSearchResult._groupUri === group.classUri;
                                return (
                                  <div
                                    key={`${group.classUri}-${prop.code || prop.name}-${propIdx}`}
                                    className={`er-search-result-item er-search-result-child ${isSelected ? 'er-search-result-selected' : ''}`}
                                    onClick={() => setSelectedSearchResult({ ...prop, _groupUri: group.classUri, _groupCode: group.classCode })}
                                    onDoubleClick={() => handleSelectMappingResult({ ...prop, _groupCode: group.classCode })}
                                  >
                                    <div className="er-search-result-header">
                                      <span className="er-search-result-name">{prop.name}</span>
                                      {prop.code && prop.code !== prop.name && (
                                        <span className="er-search-result-code">{prop.code}</span>
                                      )}
                                    </div>
                                    {prop.description && (
                                      <p className="er-search-result-desc">{prop.description}</p>
                                    )}
                                    {prop.category && (
                                      <span className="er-search-result-category">{prop.category}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })
                      ) : (
                        <>
                          {mappingDrilldownClass && (
                            <div className="er-drilldown-bar">
                              <button className="er-drilldown-back" onClick={() => { setMappingDrilldownClass(null); setMappingDrilldownFilter(''); handleMappingSearch(); }}>← Back</button>
                              <span className="er-drilldown-label">Properties of <strong>{mappingDrilldownClass.name}</strong></span>
                              <input
                                className="er-drilldown-filter"
                                type="text"
                                placeholder="Filter properties..."
                                value={mappingDrilldownFilter}
                                onChange={(e) => { setMappingDrilldownFilter(e.target.value); setSelectedSearchResult(null); }}
                                autoFocus
                              />
                            </div>
                          )}
                          {mappingSearchResults.filter(r => {
                            if (!r || !r.name) return false;
                            if (!mappingDrilldownFilter.trim()) return true;
                            const f = mappingDrilldownFilter.toLowerCase();
                            return r.name.toLowerCase().includes(f) || (r.code || '').toLowerCase().includes(f) || (r.description || '').toLowerCase().includes(f);
                          }).map((result, idx) => {
                            const isSelected = selectedSearchResult && (selectedSearchResult.code || selectedSearchResult.name) === (result.code || result.name) && idx === selectedSearchResult._idx;
                            const isDrillable = (result.resultType === 'class' || result.resultType === 'propertySet') && result.uri && mappingSearchSchema === 'bSDD';
                            return (
                              <div
                                key={`${result.code || result.name}-${idx}`}
                                className={`er-search-result-item ${isSelected ? 'er-search-result-selected' : ''}`}
                                onClick={() => setSelectedSearchResult({ ...result, _idx: idx, ...(mappingDrilldownClass ? { _groupCode: mappingDrilldownClass.name } : {}) })}
                                onDoubleClick={() => handleSelectMappingResult(mappingDrilldownClass ? { ...result, _groupCode: mappingDrilldownClass.name } : result)}
                              >
                                <div className="er-search-result-header">
                                  <span className="er-search-result-name">{result.name}</span>
                                  {result.code && result.code !== result.name && (
                                    <span className="er-search-result-code">{result.code}</span>
                                  )}
                                  {mappingSearchSchema === 'bSDD' && result.resultType && (
                                    <span className={`er-result-type-badge er-result-type-${result.resultType}`}>
                                      {result.resultType === 'class' ? 'Entity' : result.resultType === 'propertySet' ? 'Property Set' : 'Property'}
                                    </span>
                                  )}
                                  {result.score && result.matchType === 'semantic' && (
                                    <span className="er-search-result-score">
                                      {Math.round(result.score * 100)}%
                                    </span>
                                  )}
                                </div>
                                {isSelected && result.description ? (
                                  <p className="er-search-result-desc er-search-result-desc-expanded">{result.description}</p>
                                ) : result.description ? (
                                  <p className="er-search-result-desc">{result.description}</p>
                                ) : null}
                                {isSelected && result.uri && (
                                  <span className="er-search-result-uri">{result.uri}</span>
                                )}
                                {result.category && (
                                  <span className="er-search-result-category">{result.category}</span>
                                )}
                                {isSelected && isDrillable && (
                                  <button
                                    className="er-drilldown-btn"
                                    onClick={(e) => { e.stopPropagation(); drillIntoClassProperties(result); }}
                                    title={result.resultType === 'propertySet' ? 'Browse properties in this property set' : 'Browse properties of this entity'}
                                  >
                                    Browse properties →
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </SearchErrorBoundary>
        )}
      </div>
    );
  }

  // ========== Detail View - Empty State (Legacy Mode) ==========

  if (!dataObject) {
    return (
      <div className={`er-panel ${!showBpmnEditor ? 'er-panel-expanded' : ''}`}>
        <div className="er-panel-header">
          <div className="er-panel-title">
            <span className="er-title-icon"><DataObjectIcon size={20} /></span>
            <div>
              <h3>Individual ER</h3>
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

  // ========== Detail View - Card-Based (Legacy Mode) ==========

  return (
    <div className={`er-panel ${!showBpmnEditor ? 'er-panel-expanded' : ''}`}>
      {/* Header */}
      <div className="er-panel-header">
        <div className="er-panel-title">
          <span className="er-title-icon"><DataObjectIcon size={20} /></span>
          <div>
            <h3>Individual ER</h3>
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

      {/* Toolbar - Simplified */}
      <div className="er-toolbar">
        <button className="er-toolbar-btn" onClick={() => addInformationUnit()} title="Add Information Unit">
          <AddIcon size={14} /> IU
        </button>
        <button className="er-toolbar-btn" onClick={openSubERModal} title="Add Sub-ER">
          <IndentIcon size={14} /> Sub-ER
        </button>
        <div className="er-toolbar-divider" />
        <button className="er-toolbar-btn" onClick={handleExpandAll} title="Expand All">
          <ExpandAllIcon size={14} />
        </button>
        <button className="er-toolbar-btn" onClick={handleCollapseAll} title="Collapse All">
          <CollapseAllIcon size={14} />
        </button>
        <div className="er-toolbar-spacer" />
        <button className="er-toolbar-btn" onClick={handleSaveAs} title="Export ER">
          <CopyIcon size={14} />
        </button>
        <button className="er-toolbar-btn" onClick={() => { setSelectedUnitForSubER(null); setShowLibrary(true); }} title="Import ER">
          <ImportIcon size={14} />
        </button>
      </div>

      {/* ER Details Section */}
      <div className="er-card-container">
        {/* ER Name and Description */}
        <div className="er-card er-card-er">
          <div className="er-card-header er-card-header-er">
            <FolderIcon size={14} className="er-card-icon er-icon" />
            <span className="er-card-title">Exchange Requirement Details</span>
          </div>
          <div className="er-card-body er-card-body-inline">
            <div className="er-card-field er-card-field-grow">
              <label>ER Name</label>
              <input
                type="text"
                value={erData?.name || ''}
                onChange={(e) => onChange({ ...erData, name: e.target.value })}
                placeholder="e.g., Design Model Exchange"
                className="er-input"
              />
            </div>
            <div className="er-card-field er-card-field-grow">
              <label>Description</label>
              <input
                type="text"
                value={erData?.description || ''}
                onChange={(e) => onChange({ ...erData, description: e.target.value })}
                placeholder="Brief description..."
                className="er-input"
              />
            </div>
          </div>
        </div>

        {/* Information Units */}
        <div className="er-section">
          <div className="er-section-header">
            <InfoUnitIcon size={16} />
            <span>Information Units ({erData?.informationUnits?.length || 0})</span>
          </div>

          {(!erData?.informationUnits || erData.informationUnits.length === 0) ? (
            <div className="er-empty-state er-empty-state-small">
              <InfoUnitIcon size={24} />
              <p>No Information Units yet</p>
              <span className="er-hint">Click "+ IU" in the toolbar to add one</span>
            </div>
          ) : (
            erData.informationUnits.map((iu, i) => renderInformationUnitCard(iu, 0, null, i, erData.informationUnits.length, false))
          )}
        </div>

        {/* Sub-ERs */}
        {erData?.subERs && erData.subERs.length > 0 && (
          <div className="er-section">
            <div className="er-section-header">
              <FolderIcon size={16} />
              <span>Sub-ERs ({erData.subERs.length})</span>
            </div>
            {erData.subERs.map(subER => renderSubERCard(subER))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="er-panel-footer">
        <span>{totalUnits} unit(s), {(erData?.subERs || []).length} sub-ER(s), {totalImages} image(s)</span>
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
                        {countUnits(er.informationUnits || [])} information units
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
              <p className="er-modal-instruction">Export this Exchange Requirement to an erXML file.</p>
              <div className="er-field">
                <label>ER Name for Export</label>
                <input type="text" value={saveAsName} onChange={(e) => setSaveAsName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveAsName.trim() && confirmSaveAs()} placeholder="Enter ER name..." className="er-input" autoFocus />
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
        <SearchErrorBoundary onClose={closeMappingSearch}>
        <div className="er-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeMappingSearch(); }}>
          <div className="er-modal er-modal-search" onClick={(e) => e.stopPropagation()}>
            <div className="er-modal-header">
              <h3>Search Matching External Information Item</h3>
              <button className="er-close-btn" onClick={closeMappingSearch}><CloseIcon size={16} /></button>
            </div>
            <div className="er-modal-body">
              <div className="er-search-controls">
                <div className="er-field er-field-inline">
                  <label>Schema</label>
                  <select
                    value={mappingSearchSchema}
                    onChange={(e) => {
                      setMappingSearchSchema(e.target.value);
                      setMappingSearchResults([]);
                      setMappingSearchQuery(mappingSearchIuNameRef.current || '');
                    }}
                    className="er-select er-select-schema-search"
                  >
                    {SCHEMA_OPTIONS.filter(opt => opt.searchable).map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}{opt.value === 'bSDD' && bsddCacheInfo.state === 'ready' ? ' (cached)' : opt.apiEnabled ? ' (API)' : ''}
                      </option>
                    ))}
                  </select>
                  {mappingSearchSchema === 'bSDD' && (
                    <span className={`er-bsdd-cache-badge er-bsdd-cache-${bsddCacheInfo.state}`}>
                      {bsddCacheInfo.state === 'loading' && (bsddCacheInfo.current > 0
                        ? `Loading ${bsddCacheInfo.current}${bsddCacheInfo.total > 0 ? `/${bsddCacheInfo.total}` : ''}…`
                        : (bsddCacheInfo.stage || 'Connecting…'))}
                      {bsddCacheInfo.state === 'ready' && `✓ ${bsddCacheInfo.classCount} classes`}
                      {bsddCacheInfo.state === 'error' && '⚠ using live API'}
                    </span>
                  )}
                </div>

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

              <div className="er-search-input-row">
                <input
                  type="text"
                  value={mappingSearchQuery}
                  onChange={(e) => { setMappingSearchQuery(e.target.value); setSelectedSearchResult(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleMappingSearch(); } }}
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
                {selectedSearchResult && (
                  <span className="er-selection-hint">
                    {(() => {
                      const r = selectedSearchResult;
                      if (r.resultType !== 'property') return r.code || r.name;
                      const parts = r.category ? r.category.split(' · ') : [];
                      const entity = r._groupCode || parts[0] || '';
                      const pset = parts[1] && (parts[1].startsWith('Pset_') || parts[1].startsWith('Qto_')) ? parts[1] : '';
                      const prop = r.name || r.code;
                      return entity && pset ? `${entity}.${pset}.${prop}` : entity ? `${entity}.${prop}` : prop;
                    })()}
                  </span>
                )}
                <button
                  className="er-action-btn er-action-btn-primary"
                  onClick={handleApplySearchResult}
                  disabled={!selectedSearchResult}
                  title="Apply selected result as external mapping"
                >
                  Apply
                </button>
              </div>

              <div className="er-search-results">
                {drilldownCountdown !== null ? (
                  <div className="er-search-loading er-search-ratelimit-countdown">
                    <span className="er-search-hourglass er-search-hourglass-spin">&#9203;</span>
                    <span>bSDD rate limit reached. Retrying in <strong>{drilldownCountdown}s</strong>…</span>
                    <button className="er-retry-btn" onClick={() => { const fn = rateLimitRetryFnRef.current; clearDrilldownRetry(); fn?.(); }}>Retry Now</button>
                    <div className="er-search-ratelimit-note">Note: On first use, bSDD classes are downloaded and cached locally. Subsequent searches run instantly from the local cache.</div>
                  </div>
                ) : mappingSearchLoading ? (
                  <div className="er-search-loading">
                    {mappingSearchSchema === 'bSDD' ? (
                      <>
                        <span className="er-search-hourglass">&#9203;</span>
                        <span>
                          {mappingSearchStep === 'properties'
                            ? 'Loading class properties...'
                            : 'Searching IFC classes...'}
                        </span>
                        {bsddCacheInfo.state !== 'ready' && (
                          <span className="er-search-loading-hint">This may take a moment on the first search.</span>
                        )}
                      </>
                    ) : (
                      <span>Searching...</span>
                    )}
                  </div>
                ) : mappingSearchError ? (
                  <div className="er-search-empty er-search-error">
                    <span>{mappingSearchError}</span>
                    {mappingSearchRateLimited && (
                      <button className="er-retry-btn" onClick={handleMappingSearch}>Try Again</button>
                    )}
                  </div>
                ) : (mappingSearchGroups.length === 0 && (!Array.isArray(mappingSearchResults) || mappingSearchResults.length === 0)) ? (
                  <div className="er-search-empty">
                    {mappingSearchQuery.trim() ? (
                      <span>No results found. Try a different search term.</span>
                    ) : (
                      <span>Enter a search term to find elements. Click a result to preview details, then click <strong>Apply</strong> to confirm.</span>
                    )}
                  </div>
                ) : (
                  <div className="er-search-result-list">
                    {mappingSearchGroups.length > 0 ? (
                      mappingSearchGroups.map((group) => {
                        const isExpanded = expandedGroups.has(group.classUri);
                        const isClassSelected = selectedSearchResult?.resultType === 'class' && selectedSearchResult?.uri === group.classUri;
                        return (
                          <div key={group.classUri} className="er-search-group">
                            <div className={`er-search-group-header ${isClassSelected ? 'er-search-result-selected' : ''}`}>
                              <span
                                className="er-search-group-arrow"
                                onClick={(e) => { e.stopPropagation(); setExpandedGroups(prev => { const next = new Set(prev); if (next.has(group.classUri)) next.delete(group.classUri); else next.add(group.classUri); return next; }); }}
                              >
                                {isExpanded ? '▼' : '▶'}
                              </span>
                              <span
                                className="er-search-group-name er-search-group-name-selectable"
                                onClick={() => setSelectedSearchResult({ name: group.classCode || group.className, code: group.classCode || '', description: '', category: 'bSDD (IFC 4.3)', uri: group.classUri, resultType: 'class', _groupUri: group.classUri, _groupCode: group.classCode || '' })}
                                onDoubleClick={() => handleSelectMappingResult({ name: group.classCode || group.className, code: group.classCode || '', description: '', category: 'bSDD (IFC 4.3)', uri: group.classUri, resultType: 'class', _groupCode: group.classCode || '' })}
                              >
                                {group.classCode || group.className}
                                {group.classCode && group.classCode !== group.className && <span className="er-search-result-code">{group.className}</span>}
                              </span>
                              <span className="er-search-group-count">{group.properties.length} {group.properties.length === 1 ? 'property' : 'properties'}</span>
                            </div>
                            {isExpanded && group.properties.map((prop, propIdx) => {
                              const isSelected = selectedSearchResult && selectedSearchResult.uri === prop.uri && selectedSearchResult._groupUri === group.classUri;
                              return (
                                <div
                                  key={`${group.classUri}-${prop.code || prop.name}-${propIdx}`}
                                  className={`er-search-result-item er-search-result-child ${isSelected ? 'er-search-result-selected' : ''}`}
                                  onClick={() => setSelectedSearchResult({ ...prop, _groupUri: group.classUri, _groupCode: group.classCode })}
                                  onDoubleClick={() => handleSelectMappingResult({ ...prop, _groupCode: group.classCode })}
                                >
                                  <div className="er-search-result-header">
                                    <span className="er-search-result-name">{prop.name}</span>
                                    {prop.code && prop.code !== prop.name && (
                                      <span className="er-search-result-code">{prop.code}</span>
                                    )}
                                  </div>
                                  {prop.description && (
                                    <p className="er-search-result-desc">{prop.description}</p>
                                  )}
                                  {prop.category && (
                                    <span className="er-search-result-category">{prop.category}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })
                    ) : (
                      <>
                        {mappingDrilldownClass && (
                          <div className="er-drilldown-bar">
                            <button className="er-drilldown-back" onClick={() => { setMappingDrilldownClass(null); setMappingDrilldownFilter(''); handleMappingSearch(); }}>← Back</button>
                            <span className="er-drilldown-label">Properties of <strong>{mappingDrilldownClass.name}</strong></span>
                            <input
                              className="er-drilldown-filter"
                              type="text"
                              placeholder="Filter properties..."
                              value={mappingDrilldownFilter}
                              onChange={(e) => { setMappingDrilldownFilter(e.target.value); setSelectedSearchResult(null); }}
                              autoFocus
                            />
                          </div>
                        )}
                        {mappingSearchResults.filter(r => {
                          if (!r || !r.name) return false;
                          if (!mappingDrilldownFilter.trim()) return true;
                          const f = mappingDrilldownFilter.toLowerCase();
                          return r.name.toLowerCase().includes(f) || (r.code || '').toLowerCase().includes(f) || (r.description || '').toLowerCase().includes(f);
                        }).map((result, idx) => {
                          const isSelected = selectedSearchResult && (selectedSearchResult.code || selectedSearchResult.name) === (result.code || result.name) && idx === selectedSearchResult._idx;
                          const isDrillable = (result.resultType === 'class' || result.resultType === 'propertySet') && result.uri && mappingSearchSchema === 'bSDD';
                          return (
                            <div
                              key={`${result.code || result.name}-${idx}`}
                              className={`er-search-result-item ${isSelected ? 'er-search-result-selected' : ''}`}
                              onClick={() => setSelectedSearchResult({ ...result, _idx: idx, ...(mappingDrilldownClass ? { _groupCode: mappingDrilldownClass.name } : {}) })}
                              onDoubleClick={() => handleSelectMappingResult(mappingDrilldownClass ? { ...result, _groupCode: mappingDrilldownClass.name } : result)}
                            >
                              <div className="er-search-result-header">
                                <span className="er-search-result-name">{result.name}</span>
                                {result.code && result.code !== result.name && (
                                  <span className="er-search-result-code">{result.code}</span>
                                )}
                                {mappingSearchSchema === 'bSDD' && result.resultType && (
                                  <span className={`er-result-type-badge er-result-type-${result.resultType}`}>
                                    {result.resultType === 'class' ? 'Entity' : result.resultType === 'propertySet' ? 'Property Set' : 'Property'}
                                  </span>
                                )}
                                {result.score && result.matchType === 'semantic' && (
                                  <span className="er-search-result-score">
                                    {Math.round(result.score * 100)}%
                                  </span>
                                )}
                              </div>
                              {isSelected && result.description ? (
                                <p className="er-search-result-desc er-search-result-desc-expanded">{result.description}</p>
                              ) : result.description ? (
                                <p className="er-search-result-desc">{result.description}</p>
                              ) : null}
                              {isSelected && result.uri && (
                                <span className="er-search-result-uri">{result.uri}</span>
                              )}
                              {result.category && (
                                <span className="er-search-result-category">{result.category}</span>
                              )}
                              {isSelected && isDrillable && (
                                <button
                                  className="er-drilldown-btn"
                                  onClick={(e) => { e.stopPropagation(); drillIntoClassProperties(result); }}
                                  title={result.resultType === 'propertySet' ? 'Browse properties in this property set' : 'Browse properties of this entity'}
                                >
                                  Browse properties →
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </SearchErrorBoundary>
      )}

      {/* Sub-ER Selection Modal */}
      {showSubERModal && (
        <div className="er-modal-overlay" onClick={() => setShowSubERModal(false)}>
          <div className="er-modal er-modal-sub-er" onClick={(e) => e.stopPropagation()}>
            <div className="er-modal-header">
              <h3>Add Sub-ER</h3>
              <button className="er-close-btn" onClick={() => setShowSubERModal(false)}><CloseIcon size={16} /></button>
            </div>

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
              {subERModalTab === 'current' && (
                <div className="er-sub-er-current">
                  {isErFirstMode ? (
                    // ER-first mode: use allERsFlat
                    allERsFlat.length === 0 ? (
                      <div className="er-empty-state">
                        <FolderIcon size={32} />
                        <p>No ERs in current IDM</p>
                        <span className="er-hint">Click "+ ER" in the ER Hierarchy to create an ER first</span>
                      </div>
                    ) : allERsFlat.filter(er => er.id !== selectedErId).length === 0 ? (
                      <div className="er-empty-state">
                        <FolderIcon size={32} />
                        <p>No other ERs available</p>
                        <span className="er-hint">This is the only ER in the current IDM specification</span>
                      </div>
                    ) : (
                      <div className="er-sub-er-list-select">
                        <p className="er-sub-er-instruction">Select an ER to link as Sub-ER:</p>
                        {allERsFlat
                          .filter(er => er.id !== selectedErId)
                          .map(er => (
                            <div
                              key={er.id}
                              className="er-sub-er-select-item"
                              onClick={() => handleAddSubERFromCurrent(er.id, er)}
                            >
                              <div className="er-sub-er-select-icon">
                                <FolderIcon size={18} />
                              </div>
                              <div className="er-sub-er-select-content">
                                <div className="er-sub-er-select-name">
                                  {Array(er.depth).fill('  ').join('')}{er.name}
                                </div>
                                <div className="er-sub-er-select-meta">
                                  <span>{countUnits(er.informationUnits || [])} unit(s)</span>
                                  {er.subERs?.length > 0 && <span>{er.subERs.length} sub-ER(s)</span>}
                                </div>
                              </div>
                              <div className="er-sub-er-select-arrow">
                                <ChevronRightIcon size={16} />
                              </div>
                            </div>
                          ))}
                      </div>
                    )
                  ) : (
                    // Legacy mode: use erDataMap
                    Object.keys(erDataMap).length === 0 ? (
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
                          .filter(([doId]) => doId !== dataObject?.id)
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
                    )
                  )}
                </div>
              )}

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

export default React.memo(ERPanel);
