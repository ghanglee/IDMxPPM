import React, { useState, useEffect } from 'react';
import { CloseIcon, SaveIcon } from '../icons';
import './TaskDetailPanel.css';

// Human-readable type labels for all documentable BPMN elements
const TYPE_LABELS = {
  'Task': 'Task',
  'UserTask': 'User Task',
  'ServiceTask': 'Service Task',
  'SendTask': 'Send Task',
  'ReceiveTask': 'Receive Task',
  'ManualTask': 'Manual Task',
  'BusinessRuleTask': 'Business Rule Task',
  'ScriptTask': 'Script Task',
  'CallActivity': 'Call Activity',
  'SubProcess': 'Sub-Process',
  'ExclusiveGateway': 'Exclusive Gateway (XOR)',
  'ParallelGateway': 'Parallel Gateway (AND)',
  'InclusiveGateway': 'Inclusive Gateway (OR)',
  'EventBasedGateway': 'Event-Based Gateway',
  'ComplexGateway': 'Complex Gateway',
  'StartEvent': 'Start Event',
  'EndEvent': 'End Event',
  'IntermediateCatchEvent': 'Intermediate Catch Event',
  'IntermediateThrowEvent': 'Intermediate Throw Event',
  'BoundaryEvent': 'Boundary Event',
  'SequenceFlow': 'Sequence Flow'
};

const ElementDetailPanel = ({ task, onSave, onClose }) => {
  const [name, setName] = useState('');
  const [documentation, setDocumentation] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state when selected element changes
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

  // Human-readable element type
  const rawType = task?.type?.replace('bpmn:', '') || 'Element';
  const displayType = TYPE_LABELS[rawType] || rawType;

  if (!task) return null;

  return (
    <div className="task-detail-panel">
      <div className="task-detail-header">
        <div className="task-detail-title">
          <div>
            <h3>Element Details</h3>
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
            placeholder="Element name..."
          />
        </div>

        <div className="task-field">
          <label className="task-label">Documentation</label>
          <textarea
            className="task-textarea"
            value={documentation}
            onChange={handleDocumentationChange}
            placeholder="Element description / documentation..."
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

export default ElementDetailPanel;
