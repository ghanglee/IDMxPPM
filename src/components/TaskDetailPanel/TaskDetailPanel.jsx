import React, { useState, useEffect } from 'react';
import { CloseIcon, SaveIcon } from '../icons';
import './TaskDetailPanel.css';

const TaskDetailPanel = ({ task, onSave, onClose }) => {
  const [name, setName] = useState('');
  const [documentation, setDocumentation] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state when selected task changes
  useEffect(() => {
    if (task) {
      setName(task.name || '');
      setDocumentation(task.documentation || '');
      setHasChanges(false);
    }
  }, [task?.id]);

  const handleNameChange = (e) => {
    setName(e.target.value);
    setHasChanges(true);
  };

  const handleDocumentationChange = (e) => {
    setDocumentation(e.target.value);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (task && onSave) {
      onSave(task.id, { name, documentation });
      setHasChanges(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  // Show human-readable task type (strip "bpmn:" prefix)
  const displayType = task?.type?.replace('bpmn:', '') || 'Task';

  if (!task) return null;

  return (
    <div className="task-detail-panel">
      <div className="task-detail-header">
        <div className="task-detail-title">
          <div>
            <h3>Task Details</h3>
            <div className="task-type-label">{displayType}</div>
          </div>
        </div>
        <div className="task-header-right">
          {hasChanges && (
            <span className="task-save-status task-save-status-unsaved">Unsaved</span>
          )}
          <button className="task-close-btn" onClick={onClose} title="Close">
            <CloseIcon size={16} />
          </button>
        </div>
      </div>

      <div className="task-detail-body" onKeyDown={handleKeyDown}>
        <div className="task-field">
          <label className="task-label">Name</label>
          <input
            type="text"
            className="task-input"
            value={name}
            onChange={handleNameChange}
            placeholder="Task name..."
          />
        </div>

        <div className="task-field">
          <label className="task-label">Documentation</label>
          <textarea
            className="task-textarea"
            value={documentation}
            onChange={handleDocumentationChange}
            placeholder="Task description / documentation..."
            rows={8}
          />
        </div>

        <div className="task-actions">
          <button
            className="task-save-btn"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <SaveIcon size={14} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailPanel;
