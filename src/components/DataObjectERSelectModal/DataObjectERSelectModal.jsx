import React, { useState, useMemo, useEffect } from 'react';
import './DataObjectERSelectModal.css';
import {
  FolderIcon,
  AddIcon,
  CloseIcon,
  ChevronRightIcon
} from '../icons';

/**
 * Modal shown when a new Data Object is placed in the BPMN diagram.
 * Allows users to either:
 * 1. Select an existing ER from the hierarchy
 * 2. Create a new ER
 */
const DataObjectERSelectModal = ({
  isOpen,
  dataObject,          // The new data object being created
  erHierarchy = [],    // Full ER hierarchy
  queueLength = 0,     // Number of data objects remaining in queue (for batch processing)
  onSelectExistingER,  // Called when user selects existing ER
  onCreateNewER,       // Called when user creates new ER
  onClose              // Called when modal is closed/cancelled
}) => {
  const [mode, setMode] = useState('select'); // 'select' or 'create'
  const [selectedErId, setSelectedErId] = useState(null);
  const [newErName, setNewErName] = useState(dataObject?.name || '');
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  // Reset form state when data object changes (for processing multiple unassociated data objects)
  useEffect(() => {
    if (dataObject) {
      setNewErName(dataObject.name || '');
      setSelectedErId(null);
      // If no existing ERs, switch to create mode
      setMode(erHierarchy.length > 0 ? 'select' : 'create');
    }
  }, [dataObject, erHierarchy.length]);

  // Flatten ER hierarchy for tree display
  const flattenHierarchy = useMemo(() => {
    const rows = [];
    const addRows = (ers, depth = 0) => {
      ers?.forEach(er => {
        const hasChildren = er.subERs?.length > 0;
        rows.push({
          id: er.id,
          guid: er.guid,
          name: er.name || '(unnamed ER)',
          depth,
          hasChildren,
          isExpanded: expandedNodes.has(er.id),
          data: er
        });
        if (expandedNodes.has(er.id) && hasChildren) {
          addRows(er.subERs, depth + 1);
        }
      });
    };
    addRows(erHierarchy);
    return rows;
  }, [erHierarchy, expandedNodes]);

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
      const findEr = (ers) => {
        for (const er of ers) {
          if (er.id === selectedErId || er.guid === selectedErId) return er;
          if (er.subERs?.length > 0) {
            const found = findEr(er.subERs);
            if (found) return found;
          }
        }
        return null;
      };
      const er = findEr(erHierarchy);
      if (er) {
        onSelectExistingER(er);
      }
    } else if (mode === 'create' && newErName.trim()) {
      onCreateNewER(newErName.trim());
    }
  };

  const canConfirm = (mode === 'select' && selectedErId) || (mode === 'create' && newErName.trim());

  if (!isOpen) return null;

  return (
    <div className="do-er-modal-overlay" onClick={onClose}>
      <div className="do-er-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="do-er-modal-header">
          <h2>Assign Exchange Requirement</h2>
          {queueLength > 1 && (
            <span className="do-er-queue-badge">{queueLength} remaining</span>
          )}
          <button className="do-er-close-btn" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Data Object Info */}
        <div className="do-er-data-object-info">
          <span className="do-er-label">Data Object:</span>
          <span className="do-er-data-object-name">{dataObject?.name || dataObject?.id || 'Unnamed'}</span>
        </div>

        {/* Mode Tabs */}
        <div className="do-er-tabs">
          <button
            className={`do-er-tab ${mode === 'select' ? 'active' : ''}`}
            onClick={() => setMode('select')}
          >
            <FolderIcon size={14} />
            Associate with Existing ER
          </button>
          <button
            className={`do-er-tab ${mode === 'create' ? 'active' : ''}`}
            onClick={() => setMode('create')}
          >
            <AddIcon size={14} />
            Create New ER
          </button>
        </div>

        {/* Content */}
        <div className="do-er-modal-body">
          {mode === 'select' ? (
            <div className="do-er-select-content">
              {erHierarchy.length === 0 ? (
                <div className="do-er-empty">
                  <FolderIcon size={32} />
                  <p>No Exchange Requirements yet</p>
                  <span>Switch to "Create New ER" to add one</span>
                </div>
              ) : (
                <div className="do-er-tree">
                  {flattenHierarchy.map(row => (
                    <div
                      key={row.id}
                      className={`do-er-tree-row ${selectedErId === row.id ? 'selected' : ''}`}
                      onClick={() => setSelectedErId(row.id)}
                    >
                      {/* Indent */}
                      {Array(row.depth).fill(0).map((_, i) => (
                        <span key={i} className="do-er-tree-indent" />
                      ))}
                      {/* Chevron */}
                      {row.hasChildren ? (
                        <span
                          className={`do-er-tree-chevron ${row.isExpanded ? 'expanded' : ''}`}
                          onClick={(e) => { e.stopPropagation(); toggleExpand(row.id); }}
                        >
                          <ChevronRightIcon size={12} />
                        </span>
                      ) : (
                        <span className="do-er-tree-indent" />
                      )}
                      {/* Icon */}
                      <FolderIcon size={14} className="do-er-tree-icon" />
                      {/* Name */}
                      <span className="do-er-tree-name">{row.name}</span>
                      {/* IU Count */}
                      <span className="do-er-tree-count">
                        {row.data.informationUnits?.length || 0} information unit(s)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="do-er-create-content">
              <div className="do-er-field">
                <label>ER Name</label>
                <input
                  type="text"
                  value={newErName}
                  onChange={(e) => setNewErName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && newErName.trim() && handleConfirm()}
                  placeholder="Enter Exchange Requirement name..."
                  autoFocus
                />
              </div>
              <p className="do-er-hint">
                A new Exchange Requirement will be created and the Data Object will be linked to it.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="do-er-modal-footer">
          <button className="do-er-btn do-er-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="do-er-btn do-er-btn-primary"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {mode === 'select' ? 'Select ER' : 'Create ER'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataObjectERSelectModal;
