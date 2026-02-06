import React from 'react';
import './RootSwitchModal.css';
import {
  FolderIcon,
  CloseIcon
} from '../icons';

/**
 * Modal shown when user attempts to outdent a level-2 ER to root level.
 * Per Rule 2: Only ONE top-level ER is allowed, so we need to handle the switch.
 *
 * Options:
 * A. New Root (Dissolve Old): Delete old root, merge its children to new root
 * B. New Root (Keep Old): Old root becomes a sub-ER of new root
 * Cancel: Abort the outdent action
 */
const RootSwitchModal = ({
  isOpen,
  newRootER,              // The ER that will become the new root
  currentRootER,          // The current root ER
  onDissolveOldRoot,      // Option A: Delete old root, merge children
  onKeepOldRootAsSub,     // Option B: Old root becomes sub-ER
  onCancel                // Cancel the outdent
}) => {
  if (!isOpen) return null;

  const newRootName = newRootER?.name || '(unnamed)';
  const currentRootName = currentRootER?.name || '(unnamed)';
  const currentRootChildCount = (currentRootER?.subERs?.length || 0) - 1; // Excluding the new root itself

  return (
    <div className="root-switch-modal-overlay">
      <div className="root-switch-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="root-switch-modal-header">
          <h2>Change Root Exchange Requirement</h2>
          <button className="root-switch-close-btn" onClick={onCancel}>
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Question */}
        <div className="root-switch-question">
          <span className="root-switch-question-icon">🔄</span>
          <div className="root-switch-question-text">
            <strong>Do you want to make "{newRootName}" the new Root ER?</strong>
            <p>This action will change the root of the ER hierarchy. Choose how to handle the current root ER.</p>
          </div>
        </div>

        {/* Current State Preview */}
        <div className="root-switch-preview">
          <div className="root-switch-preview-section">
            <span className="root-switch-preview-label">Current structure:</span>
            <div className="root-switch-preview-tree">
              <div className="root-switch-preview-item root">
                <FolderIcon size={14} />
                <span>{currentRootName}</span>
                <span className="root-switch-badge root-badge">Current Root</span>
              </div>
              <div className="root-switch-preview-item sub">
                <span className="root-switch-indent" />
                <FolderIcon size={14} />
                <span>{newRootName}</span>
                <span className="root-switch-badge">Sub-ER</span>
              </div>
              {currentRootChildCount > 0 && (
                <div className="root-switch-preview-item sub muted">
                  <span className="root-switch-indent" />
                  <span className="root-switch-ellipsis">... {currentRootChildCount} other sub-ER(s)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="root-switch-options">
          {/* Option A: Dissolve Old Root */}
          <button className="root-switch-option" onClick={onDissolveOldRoot}>
            <div className="root-switch-option-header">
              <span className="root-switch-option-letter">A</span>
              <strong>New Root (Dissolve Old)</strong>
            </div>
            <p className="root-switch-option-desc">
              Delete "{currentRootName}" and promote its children as children of the new root.
            </p>
            <div className="root-switch-option-preview">
              <div className="root-switch-preview-item root">
                <FolderIcon size={14} />
                <span>{newRootName}</span>
                <span className="root-switch-badge new-badge">New Root</span>
              </div>
              {currentRootChildCount > 0 && (
                <div className="root-switch-preview-item sub muted">
                  <span className="root-switch-indent" />
                  <span className="root-switch-ellipsis">... {currentRootChildCount} sub-ER(s) moved here</span>
                </div>
              )}
            </div>
          </button>

          {/* Option B: Keep Old Root */}
          <button className="root-switch-option" onClick={onKeepOldRootAsSub}>
            <div className="root-switch-option-header">
              <span className="root-switch-option-letter">B</span>
              <strong>New Root (Keep Old)</strong>
            </div>
            <p className="root-switch-option-desc">
              Make "{currentRootName}" a sub-ER of the new root. Preserves all existing structure.
            </p>
            <div className="root-switch-option-preview">
              <div className="root-switch-preview-item root">
                <FolderIcon size={14} />
                <span>{newRootName}</span>
                <span className="root-switch-badge new-badge">New Root</span>
              </div>
              <div className="root-switch-preview-item sub">
                <span className="root-switch-indent" />
                <FolderIcon size={14} />
                <span>{currentRootName}</span>
                <span className="root-switch-badge">Sub-ER</span>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="root-switch-modal-footer">
          <button className="root-switch-btn root-switch-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RootSwitchModal;
