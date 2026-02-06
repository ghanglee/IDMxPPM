import React, { useState, useMemo, useEffect } from 'react';
import './RootERSelectionModal.css';
import {
  FolderIcon,
  AddIcon,
  CloseIcon,
  ChevronRightIcon
} from '../icons';

/**
 * Modal shown when importing/loading a project with multiple top-level ERs.
 * Per Rule 2: Only ONE top-level ER is allowed.
 *
 * Options:
 * 1. Select one existing ER as the root (others become its sub-ERs)
 * 2. Create a new root ER named "er_" + ShortTitle (all existing become sub-ERs)
 */
const RootERSelectionModal = ({
  isOpen,
  topLevelERs = [],      // Array of top-level ERs that need consolidation
  shortTitle = '',       // IDM specification short title for auto-naming
  onSelectRoot,          // Called when user selects existing ER as root: (selectedErId) => void
  onCreateNewRoot,       // Called when user wants to create new root: (newRootName) => void
  onCancel               // Called when user cancels (import will be cancelled)
}) => {
  const [mode, setMode] = useState('select'); // 'select' or 'create'
  const [selectedErId, setSelectedErId] = useState(null);
  const [newRootName, setNewRootName] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  // Auto-set default name when shortTitle changes
  useEffect(() => {
    if (shortTitle) {
      setNewRootName(`er_${shortTitle}`);
    } else {
      setNewRootName('er_Root');
    }
  }, [shortTitle]);

  // Auto-select first ER by default
  useEffect(() => {
    if (topLevelERs.length > 0 && !selectedErId) {
      setSelectedErId(topLevelERs[0].id);
    }
  }, [topLevelERs, selectedErId]);

  // Flatten ER hierarchy for tree display (shows sub-ERs too)
  const flattenHierarchy = useMemo(() => {
    const rows = [];
    const addRows = (ers, depth = 0, isTopLevel = false) => {
      ers?.forEach(er => {
        const hasChildren = er.subERs?.length > 0;
        rows.push({
          id: er.id,
          guid: er.guid,
          name: er.name || '(unnamed ER)',
          depth,
          hasChildren,
          isExpanded: expandedNodes.has(er.id),
          isTopLevel,
          data: er
        });
        if (expandedNodes.has(er.id) && hasChildren) {
          addRows(er.subERs, depth + 1, false);
        }
      });
    };
    // Mark top-level ERs
    addRows(topLevelERs, 0, true);
    return rows;
  }, [topLevelERs, expandedNodes]);

  const toggleExpand = (erId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(erId)) {
        next.delete(erId);
      } else {
        next.add(erId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (mode === 'select' && selectedErId) {
      onSelectRoot(selectedErId);
    } else if (mode === 'create' && newRootName.trim()) {
      onCreateNewRoot(newRootName.trim());
    }
  };

  // Count total IUs in an ER (including sub-ERs)
  const countTotalIUs = (er) => {
    let count = er.informationUnits?.length || 0;
    er.subERs?.forEach(sub => {
      count += countTotalIUs(sub);
    });
    return count;
  };

  const canConfirm = (mode === 'select' && selectedErId) || (mode === 'create' && newRootName.trim());

  if (!isOpen) return null;

  return (
    <div className="root-er-modal-overlay">
      <div className="root-er-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="root-er-modal-header">
          <h2>Select Root Exchange Requirement</h2>
          <button className="root-er-close-btn" onClick={onCancel}>
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Warning Message */}
        <div className="root-er-warning">
          <span className="root-er-warning-icon">⚠️</span>
          <div className="root-er-warning-text">
            <strong>Multiple top-level ERs detected</strong>
            <p>Per ISO 29481-3, only one root Exchange Requirement is allowed.
               Please select which ER should be the root, or create a new one.</p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="root-er-tabs">
          <button
            className={`root-er-tab ${mode === 'select' ? 'active' : ''}`}
            onClick={() => setMode('select')}
          >
            <FolderIcon size={14} />
            Select Existing ER as Root
          </button>
          <button
            className={`root-er-tab ${mode === 'create' ? 'active' : ''}`}
            onClick={() => setMode('create')}
          >
            <AddIcon size={14} />
            Create New Root ER
          </button>
        </div>

        {/* Content */}
        <div className="root-er-modal-body">
          {mode === 'select' ? (
            <div className="root-er-select-content">
              <p className="root-er-instruction">
                Select an ER to become the root. Other top-level ERs will become its sub-ERs.
              </p>
              <div className="root-er-tree">
                {flattenHierarchy.map(row => (
                  <div
                    key={row.id}
                    className={`root-er-tree-row ${selectedErId === row.id ? 'selected' : ''} ${row.isTopLevel ? 'top-level' : ''}`}
                    onClick={() => row.isTopLevel && setSelectedErId(row.id)}
                    style={{ cursor: row.isTopLevel ? 'pointer' : 'default', opacity: row.isTopLevel ? 1 : 0.6 }}
                  >
                    {/* Indent */}
                    {Array(row.depth).fill(0).map((_, i) => (
                      <span key={i} className="root-er-tree-indent" />
                    ))}
                    {/* Chevron */}
                    {row.hasChildren ? (
                      <span
                        className={`root-er-tree-chevron ${row.isExpanded ? 'expanded' : ''}`}
                        onClick={(e) => { e.stopPropagation(); toggleExpand(row.id); }}
                      >
                        <ChevronRightIcon size={12} />
                      </span>
                    ) : (
                      <span className="root-er-tree-indent" />
                    )}
                    {/* Icon */}
                    <FolderIcon size={14} className="root-er-tree-icon" />
                    {/* Name */}
                    <span className="root-er-tree-name">{row.name}</span>
                    {/* Badge for top-level */}
                    {row.isTopLevel && (
                      <span className="root-er-top-level-badge">Top-level</span>
                    )}
                    {/* IU Count */}
                    <span className="root-er-tree-count">
                      {countTotalIUs(row.data)} IU(s)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="root-er-create-content">
              <p className="root-er-instruction">
                Create a new root ER. All existing top-level ERs will become its sub-ERs.
              </p>
              <div className="root-er-field">
                <label>New Root ER Name</label>
                <input
                  type="text"
                  value={newRootName}
                  onChange={(e) => setNewRootName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                  placeholder="Enter root ER name..."
                  autoFocus
                />
              </div>
              <div className="root-er-preview">
                <p className="root-er-preview-label">Preview structure:</p>
                <div className="root-er-preview-tree">
                  <div className="root-er-preview-item root-er-preview-new">
                    <FolderIcon size={14} />
                    <span>{newRootName || 'er_Root'}</span>
                    <span className="root-er-preview-badge">New Root</span>
                  </div>
                  {topLevelERs.map(er => (
                    <div key={er.id} className="root-er-preview-item root-er-preview-sub">
                      <span className="root-er-tree-indent" />
                      <FolderIcon size={14} />
                      <span>{er.name || '(unnamed)'}</span>
                      <span className="root-er-preview-badge-sub">Sub-ER</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="root-er-modal-footer">
          <button className="root-er-btn root-er-btn-secondary" onClick={onCancel}>
            Cancel Import
          </button>
          <button
            className="root-er-btn root-er-btn-primary"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {mode === 'select' ? 'Set as Root' : 'Create Root ER'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RootERSelectionModal;
