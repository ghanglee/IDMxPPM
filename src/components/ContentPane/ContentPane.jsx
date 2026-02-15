import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import {
  CloseIcon,
  SpecificationIcon,
  UseCaseIcon,
  ExchangeReqIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  AddIcon,
  DeleteIcon,
  EditIcon,
  SettingsIcon,
  ExpandAllIcon,
  CollapseAllIcon,
  ImportIcon,
  SaveExportIcon
} from '../icons';
import { normalizeRegionCode } from '../../utils/idmXmlParser';
import './ContentPane.css';

// ============================================================================
// MEMOIZED ER HIERARCHY ITEM COMPONENT
// Extracted to prevent recreation on every render (fixes hover flash issue)
// ============================================================================
const ERHierarchyItem = memo(({
  er,
  level = 0,
  parentId = 'root',
  isRoot = false,
  expandedNodes,
  onToggleNode,
  onSelectER,
  itemRefs,  // Ref object to store item refs for scrolling
  selectedErId = null  // Currently selected ER for highlighting
}) => {
  const hasName = er.name && er.name.trim();
  const hasUnits = er.informationUnits && er.informationUnits.length > 0;
  const hasSubERs = er.subERs && er.subERs.length > 0;
  const isComplete = hasName && (hasUnits || hasSubERs);
  const nodeId = isRoot ? 'root' : `${parentId}-${er.id}`;
  const isExpanded = expandedNodes.has(nodeId);
  const isSelected = selectedErId === er.id;

  return (
    <div
      className="er-tree-item-wrapper"
      ref={el => { if (el && itemRefs) itemRefs.current[er.id] = el; }}
    >
      <div
        className={`er-tree-item ${isRoot ? 'root-er' : ''} ${!isComplete ? 'incomplete' : ''} ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          if (onSelectER) {
            onSelectER(er.id);
          }
        }}
      >
        {hasSubERs ? (
          <button
            className="er-tree-toggle"
            onClick={(e) => {
              e.stopPropagation();
              onToggleNode(nodeId);
            }}
          >
            {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
          </button>
        ) : (
          <span className="er-tree-spacer" />
        )}
        <div className={`er-tree-item-icon ${isRoot ? 'root' : ''}`}>
          <ExchangeReqIcon size={isRoot ? 16 : 14} />
        </div>
        <div className="er-tree-item-content">
          <div className={`er-tree-item-name ${isRoot ? 'root-name' : ''}`}>
            {hasName ? er.name : `(Unnamed ER)`}
          </div>
          <div className="er-tree-item-meta">
            <span className="er-unit-count">
              {(er.informationUnits || []).length} information units
            </span>
            {hasSubERs && (
              <span className="er-sub-count">{er.subERs.length} sub-ERs</span>
            )}
            {!isComplete && !isRoot && (
              <span className="er-incomplete-badge">Incomplete</span>
            )}
          </div>
        </div>
      </div>
      {hasSubERs && isExpanded && (
        <div className="er-tree-children">
          {er.subERs.map(subEr => (
            <ERHierarchyItem
              key={subEr.id}
              er={subEr}
              level={level + 1}
              parentId={nodeId}
              expandedNodes={expandedNodes}
              onToggleNode={onToggleNode}
              onSelectER={onSelectER}
              itemRefs={itemRefs}
              selectedErId={selectedErId}
            />
          ))}
        </div>
      )}
    </div>
  );
});

ERHierarchyItem.displayName = 'ERHierarchyItem';

// ============================================================================
// ISO 29481-3 COMPLIANT IDM CODE GENERATION (Clause 11)
// ============================================================================

/**
 * Generate IDM Code per ISO 29481-3 Clause 11
 * Format: IDM-[ORG]-[YEAR]-[TITLE_ABBREV]-[VERSION]
 */
const generateIdmCode = (title, organization, version, creationDate) => {
  const year = creationDate ? new Date(creationDate).getFullYear() : new Date().getFullYear();
  const orgAbbrev = organization
    ? organization.split(/\s+/).map(w => w[0]?.toUpperCase() || '').join('').slice(0, 4)
    : 'IDM';
  const titleAbbrev = title
    ? title.split(/\s+/).map(w => w[0]?.toUpperCase() || '').join('').slice(0, 6)
    : 'SPEC';
  const ver = version?.replace(/\./g, '') || '10';

  return `IDM-${orgAbbrev}-${year}-${titleAbbrev}-v${ver}`;
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Collapsible Section Component (VS Code style)
 */
const Section = ({ title, count, defaultExpanded = true, children, badge }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={`pane-section ${!expanded ? 'collapsed' : ''}`}>
      <div
        className="pane-section-header"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
        <span className="pane-section-title">{title}</span>
        {count !== undefined && <span className="pane-count">{count}</span>}
        {badge && <span className="pane-badge">{badge}</span>}
      </div>
      {expanded && <div className="pane-section-content">{children}</div>}
    </div>
  );
};

/**
 * Optional Fields Toggle Component
 * Shows a button to expand checkbox list for optional fields
 */
const OptionalFieldsToggle = ({ options, selected = [], onChange, label = 'Add optional fields' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (fieldKey) => {
    if (selected.includes(fieldKey)) {
      onChange(selected.filter(k => k !== fieldKey));
    } else {
      onChange([...selected, fieldKey]);
    }
  };

  return (
    <div className="optional-fields-toggle">
      <button
        type="button"
        className="optional-fields-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <SettingsIcon size={12} />
        <span>{label}</span>
        {isOpen ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
      </button>
      {isOpen && (
        <div className="optional-fields-list">
          {options.map(opt => (
            <label key={opt.key} className="optional-field-item">
              <input
                type="checkbox"
                checked={selected.includes(opt.key)}
                onChange={() => handleToggle(opt.key)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Author/Person Entry Component
 * Per ISO 29481-3:
 * - Person: familyName, givenName, middleInitial, prefix, suffix, postnominalDesignation, uri
 * - Organization: name, localName, code, localCode, uri
 */
const AuthorEntry = ({ author, onChange, onRemove, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const isPerson = author.type === 'person';

  const handleFieldChange = (field, value) => {
    onChange({ ...author, [field]: value });
  };

  // Build display name from ISO 29481-3 fields (with backward compatibility)
  const displayName = isPerson
    ? [
        author.prefix,
        author.givenName || author.firstName,
        author.middleInitial || author.middleName,
        author.familyName || author.lastName,
        author.suffix,
        author.postnominalDesignation
      ].filter(Boolean).join(' ') || '(unnamed)'
    : author.name || author.organizationName || '(unnamed organization)';

  return (
    <div className="author-entry">
      <div className="author-entry-header" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
        <span className="author-type-badge">{isPerson ? 'Person' : 'Org'}</span>
        <span className="author-name">{displayName}</span>
        <button
          type="button"
          className="author-remove"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title="Remove"
        >
          ×
        </button>
      </div>
      {expanded && (
        <div className="author-entry-body">
          {isPerson ? (
            <>
              {/* Required fields */}
              <div className="pane-field-row">
                <div className="pane-field">
                  <label>Given Name <span className="required">*</span></label>
                  <input
                    type="text"
                    value={author.givenName || author.firstName || ''}
                    onChange={(e) => handleFieldChange('givenName', e.target.value)}
                    placeholder="e.g., John"
                    className="pane-input"
                  />
                </div>
                <div className="pane-field">
                  <label>Family Name <span className="required">*</span></label>
                  <input
                    type="text"
                    value={author.familyName || author.lastName || ''}
                    onChange={(e) => handleFieldChange('familyName', e.target.value)}
                    placeholder="e.g., Smith"
                    className="pane-input"
                  />
                </div>
              </div>
              <div className="pane-field">
                <label>URI (Email / Website)</label>
                <input
                  type="text"
                  value={author.uri || author.email || ''}
                  onChange={(e) => handleFieldChange('uri', e.target.value)}
                  placeholder="e.g., john.smith@example.com"
                  className="pane-input"
                />
              </div>
              <div className="pane-field">
                <label>Affiliation (Organization)</label>
                <input
                  type="text"
                  value={author.affiliation || ''}
                  onChange={(e) => handleFieldChange('affiliation', e.target.value)}
                  placeholder="e.g., Yonsei University"
                  className="pane-input"
                />
              </div>

              {/* Optional fields toggle */}
              <button
                type="button"
                className="optional-fields-btn small"
                onClick={() => setShowOptional(!showOptional)}
              >
                <SettingsIcon size={12} />
                <span>Optional fields</span>
                {showOptional ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
              </button>

              {showOptional && (
                <div className="author-optional-fields">
                  <div className="pane-field-row">
                    <div className="pane-field">
                      <label>Prefix</label>
                      <input
                        type="text"
                        value={author.prefix || ''}
                        onChange={(e) => handleFieldChange('prefix', e.target.value)}
                        placeholder="e.g., Dr., Prof."
                        className="pane-input"
                      />
                    </div>
                    <div className="pane-field">
                      <label>Suffix</label>
                      <input
                        type="text"
                        value={author.suffix || ''}
                        onChange={(e) => handleFieldChange('suffix', e.target.value)}
                        placeholder="e.g., Jr., III"
                        className="pane-input"
                      />
                    </div>
                  </div>
                  <div className="pane-field-row">
                    <div className="pane-field">
                      <label>Middle Initial</label>
                      <input
                        type="text"
                        value={author.middleInitial || author.middleName || ''}
                        onChange={(e) => handleFieldChange('middleInitial', e.target.value)}
                        placeholder="e.g., A."
                        className="pane-input"
                      />
                    </div>
                    <div className="pane-field">
                      <label>Postnominal Designation</label>
                      <input
                        type="text"
                        value={author.postnominalDesignation || ''}
                        onChange={(e) => handleFieldChange('postnominalDesignation', e.target.value)}
                        placeholder="e.g., PhD, PE, AIA"
                        className="pane-input"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Organization fields per ISO 29481-3 */}
              <div className="pane-field">
                <label>Organization Name <span className="required">*</span></label>
                <input
                  type="text"
                  value={author.name || author.organizationName || ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="e.g., buildingSMART International"
                  className="pane-input"
                />
              </div>
              <div className="pane-field">
                <label>URI (Website)</label>
                <input
                  type="text"
                  value={author.uri || ''}
                  onChange={(e) => handleFieldChange('uri', e.target.value)}
                  placeholder="e.g., https://www.buildingsmart.org"
                  className="pane-input"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Authors List Component
 * Per ISO 29481-3: Supports Person and Organization types
 */
const AuthorsList = ({ authors = [], onChange }) => {
  const handleAddPerson = () => {
    // ISO 29481-3 Person structure
    onChange([...authors, {
      type: 'person',
      givenName: '',
      familyName: '',
      middleInitial: '',
      prefix: '',
      suffix: '',
      postnominalDesignation: '',
      uri: '',
      affiliation: ''
    }]);
  };

  const handleAddOrganization = () => {
    // ISO 29481-3 Organization structure
    onChange([...authors, {
      type: 'organization',
      name: '',
      localName: '',
      code: '',
      localCode: '',
      uri: ''
    }]);
  };

  const handleAuthorChange = (index, updatedAuthor) => {
    const updated = authors.map((a, i) => i === index ? updatedAuthor : a);
    onChange(updated);
  };

  const handleRemoveAuthor = (index) => {
    onChange(authors.filter((_, i) => i !== index));
  };

  return (
    <div className="authors-list">
      <div className="authors-actions">
        <button type="button" className="pane-add-btn" onClick={handleAddPerson}>
          <AddIcon size={12} /> Person
        </button>
        <button type="button" className="pane-add-btn" onClick={handleAddOrganization}>
          <AddIcon size={12} /> Organization
        </button>
      </div>
      {authors.length === 0 ? (
        <div className="pane-empty-small">No authors added</div>
      ) : (
        <div className="authors-entries">
          {authors.map((author, index) => (
            <AuthorEntry
              key={index}
              author={author}
              index={index}
              onChange={(updated) => handleAuthorChange(index, updated)}
              onRemove={() => handleRemoveAuthor(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Revision History Component
 */
const RevisionHistory = ({ creationDate, revisionHistory = [], onCreationDateChange, onHistoryChange }) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editDescription, setEditDescription] = useState('');

  // Ref to track previous length for detecting new additions
  const prevLengthRef = useRef(revisionHistory.length);
  // Ref for revision entry elements
  const entryRefs = useRef({});

  // Auto-scroll and start editing when a new entry is added
  useEffect(() => {
    const currentLength = revisionHistory.length;
    if (currentLength > prevLengthRef.current) {
      // A new entry was added - scroll to it and start editing
      const newIndex = currentLength - 1;
      setTimeout(() => {
        const entryEl = entryRefs.current[newIndex];
        if (entryEl) {
          entryEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        // Start editing the new entry's description
        setEditingIndex(newIndex);
        setEditDescription(revisionHistory[newIndex]?.description || '');
      }, 100);
    }
    prevLengthRef.current = currentLength;
  }, [revisionHistory]);

  const handleAddRevision = () => {
    const newEntry = {
      date: new Date().toISOString().split('T')[0],
      description: 'Modified'
    };
    onHistoryChange([...revisionHistory, newEntry]);
  };

  const handleRemoveRevision = (index) => {
    onHistoryChange(revisionHistory.filter((_, i) => i !== index));
  };

  const handleEditRevision = (index, field, value) => {
    const updated = revisionHistory.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry
    );
    onHistoryChange(updated);
  };

  const startEditing = (index) => {
    setEditingIndex(index);
    setEditDescription(revisionHistory[index]?.description || '');
  };

  const finishEditing = () => {
    if (editingIndex !== null) {
      handleEditRevision(editingIndex, 'description', editDescription);
      setEditingIndex(null);
      setEditDescription('');
    }
  };

  return (
    <div className="pane-revision-history">
      <div className="pane-field">
        <label>Creation Date <span className="required">*</span></label>
        <input
          type="date"
          value={creationDate || new Date().toISOString().split('T')[0]}
          onChange={(e) => onCreationDateChange(e.target.value)}
          className="pane-input"
        />
      </div>

      <div className="pane-field">
        <div className="pane-field-header">
          <label>Modification History</label>
          <button
            type="button"
            className="pane-add-revision-btn"
            onClick={handleAddRevision}
            title="Add modification entry"
          >
            <AddIcon size={14} /> Add
          </button>
        </div>

        {revisionHistory.length > 0 ? (
          <div className="pane-revision-list">
            {revisionHistory.map((entry, index) => (
              <div key={index} ref={(el) => { entryRefs.current[index] = el; }} className="pane-revision-entry">
                <input
                  type="date"
                  value={entry.date || ''}
                  onChange={(e) => handleEditRevision(index, 'date', e.target.value)}
                  className="pane-revision-date"
                />
                {editingIndex === index ? (
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={(e) => e.key === 'Enter' && finishEditing()}
                    className="pane-revision-desc-input"
                    autoFocus
                  />
                ) : (
                  <span
                    className="pane-revision-desc"
                    onClick={() => startEditing(index)}
                    title="Click to edit"
                  >
                    {entry.description || '(no description)'}
                  </span>
                )}
                <button
                  type="button"
                  className="pane-revision-edit"
                  onClick={() => startEditing(index)}
                  title="Edit"
                >
                  <EditIcon size={12} />
                </button>
                <button
                  type="button"
                  className="pane-revision-remove"
                  onClick={() => handleRemoveRevision(index)}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="pane-revision-empty">No modifications recorded</div>
        )}
      </div>
    </div>
  );
};

/**
 * Use Entry Component
 * Per ISO 29481-3, with support for NBIMS-US V4, other classifications, or user-defined uses
 */
const UseEntry = ({ uses = [], useClassification = null, onChange, onClassificationChange }) => {
  const [selectedClassificationUse, setSelectedClassificationUse] = useState('');
  const [classificationType, setClassificationType] = useState('nbims-us-v4'); // 'nbims-us-v4', 'other', 'user-defined'
  const [otherClassificationName, setOtherClassificationName] = useState('');
  const [otherUseName, setOtherUseName] = useState('');
  const [userDefinedUseName, setUserDefinedUseName] = useState('');

  // Import use classifications dynamically
  const [nbimsClassification, setNbimsClassification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load NBIMS classification on mount
  useEffect(() => {
    let isMounted = true;

    import('../../data/useClassifications.js')
      .then(module => {
        if (!isMounted) return;
        setNbimsClassification(module.NBIMS_US_V4_BIM_USE);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load use classifications:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddFromNBIMS = () => {
    if (!selectedClassificationUse || !nbimsClassification) return;
    const selectedUse = nbimsClassification.uses.find(u => u.id === selectedClassificationUse);
    if (selectedUse) {
      const newUse = {
        name: selectedUse.name,
        description: selectedUse.description,
        classificationId: nbimsClassification.id,
        classificationName: nbimsClassification.name
      };
      onChange([...uses, newUse]);
      setSelectedClassificationUse('');
    }
  };

  const handleAddFromOther = () => {
    if (!otherClassificationName.trim() || !otherUseName.trim()) return;
    const newUse = {
      name: otherUseName.trim(),
      description: '',
      classificationId: 'other',
      classificationName: otherClassificationName.trim()
    };
    onChange([...uses, newUse]);
    setOtherClassificationName('');
    setOtherUseName('');
  };

  const handleAddUserDefined = () => {
    if (!userDefinedUseName.trim()) return;
    const newUse = {
      name: userDefinedUseName.trim(),
      description: '',
      classificationId: 'user-defined',
      classificationName: 'User-defined'
    };
    onChange([...uses, newUse]);
    setUserDefinedUseName('');
  };

  const handleRemove = (index) => {
    onChange(uses.filter((_, i) => i !== index));
  };

  const handleClassificationTypeChange = (type) => {
    setClassificationType(type);
    setSelectedClassificationUse('');
    setOtherClassificationName('');
    setOtherUseName('');
    setUserDefinedUseName('');
    if (onClassificationChange) {
      onClassificationChange({ type });
    }
  };

  return (
    <div className="use-entry">
      <label>(Information) Use <span className="required">*</span></label>

      {/* Classification type selector */}
      <div className="use-classification-row">
        <span className="use-classification-label">Use Classification:</span>
        <select
          value={classificationType}
          onChange={(e) => handleClassificationTypeChange(e.target.value)}
          className="pane-select use-classification-select"
        >
          <option value="nbims-us-v4">NBIMS-US V4 BIM Use</option>
          <option value="other">Other Use Classification</option>
          <option value="user-defined">User-defined Use</option>
        </select>
      </div>

      {/* NBIMS-US V4 BIM Use mode */}
      {classificationType === 'nbims-us-v4' && nbimsClassification && (
        <div className="use-input-row">
          <select
            value={selectedClassificationUse}
            onChange={(e) => setSelectedClassificationUse(e.target.value)}
            className="pane-select use-select"
          >
            <option value="">Select a use...</option>
            {nbimsClassification.uses.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <button
            type="button"
            className="pane-add-btn-small"
            onClick={handleAddFromNBIMS}
            disabled={!selectedClassificationUse}
            title="Add Use"
          >
            <AddIcon size={12} />
          </button>
        </div>
      )}

      {/* Selected use description for NBIMS */}
      {classificationType === 'nbims-us-v4' && selectedClassificationUse && nbimsClassification && (
        <div className="use-description-preview">
          {nbimsClassification.uses.find(u => u.id === selectedClassificationUse)?.description || ''}
        </div>
      )}

      {/* Other Use Classification mode */}
      {classificationType === 'other' && (
        <div className="use-other-fields">
          <div className="use-input-row">
            <input
              type="text"
              value={otherClassificationName}
              onChange={(e) => setOtherClassificationName(e.target.value)}
              placeholder="Use Classification Name *"
              className="pane-input use-classification-name-input"
            />
          </div>
          <div className="use-input-row">
            <input
              type="text"
              value={otherUseName}
              onChange={(e) => setOtherUseName(e.target.value)}
              placeholder="Use Name *"
              className="pane-input use-custom-input"
              onKeyDown={(e) => e.key === 'Enter' && handleAddFromOther()}
            />
            <button
              type="button"
              className="pane-add-btn-small"
              onClick={handleAddFromOther}
              disabled={!otherClassificationName.trim() || !otherUseName.trim()}
              title="Add Use"
            >
              <AddIcon size={12} />
            </button>
          </div>
        </div>
      )}

      {/* User-defined Use mode */}
      {classificationType === 'user-defined' && (
        <div className="use-input-row">
          <input
            type="text"
            value={userDefinedUseName}
            onChange={(e) => setUserDefinedUseName(e.target.value)}
            placeholder="Use Name *"
            className="pane-input use-custom-input"
            onKeyDown={(e) => e.key === 'Enter' && handleAddUserDefined()}
          />
          <button
            type="button"
            className="pane-add-btn-small"
            onClick={handleAddUserDefined}
            disabled={!userDefinedUseName.trim()}
            title="Add Use"
          >
            <AddIcon size={12} />
          </button>
        </div>
      )}

      {/* List of added uses */}
      {uses.length > 0 && (
        <div className="use-list">
          {uses.map((use, index) => (
            <div key={index} className={`use-tag ${use.classificationId === 'user-defined' ? 'custom' : 'from-classification'}`}>
              <span className="use-name-text">{use.name || `${use.verb} ${use.noun}`}</span>
              {use.classificationName && use.classificationName !== 'User-defined' && (
                <span className="use-classification-badge">{use.classificationName}</span>
              )}
              <button
                type="button"
                className="use-remove"
                onClick={() => handleRemove(index)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Multi-Select Checkbox Component with custom option
 */
const MultiSelectCheckbox = ({ options, selected = [], onChange, label, allowCustom = false, customLabel = 'Custom' }) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const handleToggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleAddCustom = () => {
    if (customValue.trim()) {
      onChange([...selected, customValue.trim()]);
      setCustomValue('');
      setShowCustomInput(false);
    }
  };

  // Separate standard options from custom values
  const standardValues = options.map(o => o.value);
  const customValues = selected.filter(v => !standardValues.includes(v));

  return (
    <div className="pane-multi-select">
      <label>{label}</label>
      <div className="pane-checkbox-grid">
        {options.map(opt => (
          <label key={opt.value} className="pane-checkbox-item" title={opt.description}>
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => handleToggle(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
        {customValues.map(cv => (
          <label key={cv} className="pane-checkbox-item custom">
            <input
              type="checkbox"
              checked={true}
              onChange={() => handleToggle(cv)}
            />
            <span>{cv}</span>
          </label>
        ))}
      </div>
      {allowCustom && (
        <div className="custom-option-row">
          {showCustomInput ? (
            <div className="custom-input-row">
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder={`Enter ${customLabel.toLowerCase()}...`}
                className="pane-input custom-input"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              />
              <button type="button" className="pane-add-btn-small" onClick={handleAddCustom}>
                <AddIcon size={12} />
              </button>
              <button type="button" className="pane-cancel-btn" onClick={() => setShowCustomInput(false)}>
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="add-custom-btn"
              onClick={() => setShowCustomInput(true)}
            >
              <AddIcon size={12} /> Add {customLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Region Selector Component
 * Dropdown with + button to add multiple regions (ISO 3166-1)
 */
const RegionSelector = ({ regions = [], options = [], onChange, label }) => {
  const [selectedRegion, setSelectedRegion] = useState('');

  const handleAddRegion = () => {
    if (selectedRegion && !regions.includes(selectedRegion)) {
      onChange([...regions, selectedRegion]);
      setSelectedRegion('');
    }
  };

  const handleRemoveRegion = (regionToRemove) => {
    onChange(regions.filter(r => r !== regionToRemove));
  };

  // Get label for a region value (handles alpha-3 codes from imported data)
  const getRegionLabel = (value) => {
    const option = options.find(o => o.value === value);
    if (option) return option.label;
    // Try normalizing alpha-3 to alpha-2
    const normalized = normalizeRegionCode(value);
    if (normalized !== value) {
      const normOption = options.find(o => o.value === normalized);
      if (normOption) return normOption.label;
    }
    return value;
  };

  // Filter out already selected regions from dropdown
  const availableOptions = options.filter(o => !regions.includes(o.value));

  return (
    <div className="region-selector">
      <label>{label}</label>
      <div className="region-selector-input">
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="pane-select region-dropdown"
        >
          <option value="">Select a region...</option>
          {availableOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          type="button"
          className="pane-add-btn-small"
          onClick={handleAddRegion}
          disabled={!selectedRegion}
          title="Add region"
        >
          <AddIcon size={12} />
        </button>
      </div>
      {regions.length > 0 && (
        <div className="region-tags">
          {regions.map(region => (
            <div key={region} className="region-tag">
              <span>{getRegionLabel(region)}</span>
              <button
                type="button"
                className="region-tag-remove"
                onClick={() => handleRemoveRegion(region)}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {regions.length === 0 && (
        <div className="pane-hint" style={{ marginTop: '4px' }}>No regions selected. Add at least one target region.</div>
      )}
    </div>
  );
};

/**
 * Description with Figures Component
 * Combines a textarea with optional figure upload for any description field
 */
const DescriptionWithFigures = ({
  label,
  value = '',
  figures = [],
  onChange,
  onFiguresChange,
  placeholder = '',
  rows = 3,
  required = false
}) => {
  const fileInputRef = React.useRef(null);

  const handleAddFigure = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newFigure = {
            id: `fig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            caption: '',
            data: event.target.result,
            type: file.type
          };
          onFiguresChange?.([...figures, newFigure]);
        };
        reader.readAsDataURL(file);
      }
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFigure = (id) => {
    onFiguresChange?.(figures.filter(f => f.id !== id));
  };

  const handleCaptionChange = (id, caption) => {
    onFiguresChange?.(figures.map(f => f.id === id ? { ...f, caption } : f));
  };

  return (
    <div className="description-with-figures">
      <div className="pane-field">
        <div className="description-header">
          <label>{label} {required && <span className="required">*</span>}</label>
          <button
            type="button"
            className="pane-add-btn-small"
            onClick={handleAddFigure}
            title="Add figure to this description"
          >
            <AddIcon size={12} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pane-textarea"
          rows={rows}
        />
      </div>
      {figures.length > 0 && (
        <div className="description-figures">
          {figures.map((figure, index) => (
            <div key={figure.id} className="description-figure-item">
              {figure.data ? (
                <img src={figure.data} alt={figure.caption || figure.name} />
              ) : (
                <div className="figure-placeholder" title={`Image file: ${figure.filePath || figure.name}`}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5-8 8" />
                  </svg>
                  <span className="figure-placeholder-text">{figure.name || 'Image'}</span>
                  <span className="figure-placeholder-path">{figure.filePath || 'Click to load'}</span>
                </div>
              )}
              <div className="description-figure-controls">
                <input
                  type="text"
                  value={figure.caption || ''}
                  onChange={(e) => handleCaptionChange(figure.id, e.target.value)}
                  placeholder={`Figure ${index + 1} caption...`}
                  className="figure-caption-input"
                />
                <button
                  type="button"
                  className="description-figure-remove"
                  onClick={() => handleRemoveFigure(figure.id)}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Figures List Component
 * Allows uploading and managing figure images for Use Case
 */
const FiguresList = ({ figures = [], onChange }) => {
  const fileInputRef = React.useRef(null);

  const handleAddFigure = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newFigure = {
            id: `fig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            caption: '',
            data: event.target.result,
            type: file.type
          };
          onChange([...figures, newFigure]);
        };
        reader.readAsDataURL(file);
      }
    });
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFigure = (id) => {
    onChange(figures.filter(f => f.id !== id));
  };

  const handleCaptionChange = (id, caption) => {
    onChange(figures.map(f => f.id === id ? { ...f, caption } : f));
  };

  return (
    <div className="figures-list">
      <div className="figures-header">
        <label>Figures</label>
        <button
          type="button"
          className="pane-add-btn"
          onClick={handleAddFigure}
          title="Add figure image"
        >
          <AddIcon size={12} /> Add Figure
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
      {figures.length === 0 ? (
        <div className="pane-empty-small">No figures added</div>
      ) : (
        <div className="figures-grid">
          {figures.map((figure, index) => (
            <div key={figure.id} className="figure-item">
              <div className="figure-preview">
                {figure.data ? (
                  <img src={figure.data} alt={figure.caption || figure.name} />
                ) : (
                  <div className="figure-placeholder-grid" title={`Image file: ${figure.filePath || figure.name}`}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5-8 8" />
                    </svg>
                    <span>{figure.name || 'Image'}</span>
                  </div>
                )}
                <button
                  type="button"
                  className="figure-remove"
                  onClick={() => handleRemoveFigure(figure.id)}
                  title="Remove figure"
                >
                  ×
                </button>
              </div>
              <div className="figure-info">
                <span className="figure-number">Figure {index + 1}</span>
                <input
                  type="text"
                  value={figure.caption || ''}
                  onChange={(e) => handleCaptionChange(figure.id, e.target.value)}
                  placeholder="Add caption..."
                  className="figure-caption-input"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CONSTANTS
// ============================================================================

// Complete ISO 639-1 Language codes
const LANGUAGES = [
  { code: 'AA', name: 'Afar' },
  { code: 'AB', name: 'Abkhazian' },
  { code: 'AF', name: 'Afrikaans' },
  { code: 'AK', name: 'Akan' },
  { code: 'SQ', name: 'Albanian' },
  { code: 'AM', name: 'Amharic' },
  { code: 'AR', name: 'Arabic' },
  { code: 'AN', name: 'Aragonese' },
  { code: 'HY', name: 'Armenian' },
  { code: 'AS', name: 'Assamese' },
  { code: 'AV', name: 'Avaric' },
  { code: 'AE', name: 'Avestan' },
  { code: 'AY', name: 'Aymara' },
  { code: 'AZ', name: 'Azerbaijani' },
  { code: 'BA', name: 'Bashkir' },
  { code: 'BM', name: 'Bambara' },
  { code: 'EU', name: 'Basque' },
  { code: 'BE', name: 'Belarusian' },
  { code: 'BN', name: 'Bengali' },
  { code: 'BH', name: 'Bihari' },
  { code: 'BI', name: 'Bislama' },
  { code: 'BS', name: 'Bosnian' },
  { code: 'BR', name: 'Breton' },
  { code: 'BG', name: 'Bulgarian' },
  { code: 'MY', name: 'Burmese' },
  { code: 'CA', name: 'Catalan' },
  { code: 'CH', name: 'Chamorro' },
  { code: 'CE', name: 'Chechen' },
  { code: 'ZH', name: 'Chinese' },
  { code: 'CU', name: 'Church Slavic' },
  { code: 'CV', name: 'Chuvash' },
  { code: 'KW', name: 'Cornish' },
  { code: 'CO', name: 'Corsican' },
  { code: 'CR', name: 'Cree' },
  { code: 'HR', name: 'Croatian' },
  { code: 'CS', name: 'Czech' },
  { code: 'DA', name: 'Danish' },
  { code: 'DV', name: 'Divehi' },
  { code: 'NL', name: 'Dutch' },
  { code: 'DZ', name: 'Dzongkha' },
  { code: 'EN', name: 'English' },
  { code: 'EO', name: 'Esperanto' },
  { code: 'ET', name: 'Estonian' },
  { code: 'EE', name: 'Ewe' },
  { code: 'FO', name: 'Faroese' },
  { code: 'FJ', name: 'Fijian' },
  { code: 'FI', name: 'Finnish' },
  { code: 'FR', name: 'French' },
  { code: 'FY', name: 'Western Frisian' },
  { code: 'FF', name: 'Fulah' },
  { code: 'GL', name: 'Galician' },
  { code: 'KA', name: 'Georgian' },
  { code: 'DE', name: 'German' },
  { code: 'EL', name: 'Greek' },
  { code: 'GN', name: 'Guarani' },
  { code: 'GU', name: 'Gujarati' },
  { code: 'HT', name: 'Haitian' },
  { code: 'HA', name: 'Hausa' },
  { code: 'HE', name: 'Hebrew' },
  { code: 'HZ', name: 'Herero' },
  { code: 'HI', name: 'Hindi' },
  { code: 'HO', name: 'Hiri Motu' },
  { code: 'HU', name: 'Hungarian' },
  { code: 'IA', name: 'Interlingua' },
  { code: 'ID', name: 'Indonesian' },
  { code: 'IE', name: 'Interlingue' },
  { code: 'GA', name: 'Irish' },
  { code: 'IG', name: 'Igbo' },
  { code: 'IK', name: 'Inupiaq' },
  { code: 'IO', name: 'Ido' },
  { code: 'IS', name: 'Icelandic' },
  { code: 'IT', name: 'Italian' },
  { code: 'IU', name: 'Inuktitut' },
  { code: 'JA', name: 'Japanese' },
  { code: 'JV', name: 'Javanese' },
  { code: 'KL', name: 'Kalaallisut' },
  { code: 'KN', name: 'Kannada' },
  { code: 'KR', name: 'Kanuri' },
  { code: 'KS', name: 'Kashmiri' },
  { code: 'KK', name: 'Kazakh' },
  { code: 'KM', name: 'Khmer' },
  { code: 'KI', name: 'Kikuyu' },
  { code: 'RW', name: 'Kinyarwanda' },
  { code: 'KY', name: 'Kirghiz' },
  { code: 'KV', name: 'Komi' },
  { code: 'KG', name: 'Kongo' },
  { code: 'KO', name: 'Korean' },
  { code: 'KU', name: 'Kurdish' },
  { code: 'KJ', name: 'Kuanyama' },
  { code: 'LA', name: 'Latin' },
  { code: 'LB', name: 'Luxembourgish' },
  { code: 'LG', name: 'Ganda' },
  { code: 'LI', name: 'Limburgish' },
  { code: 'LN', name: 'Lingala' },
  { code: 'LO', name: 'Lao' },
  { code: 'LT', name: 'Lithuanian' },
  { code: 'LU', name: 'Luba-Katanga' },
  { code: 'LV', name: 'Latvian' },
  { code: 'GV', name: 'Manx' },
  { code: 'MK', name: 'Macedonian' },
  { code: 'MG', name: 'Malagasy' },
  { code: 'MS', name: 'Malay' },
  { code: 'ML', name: 'Malayalam' },
  { code: 'MT', name: 'Maltese' },
  { code: 'MI', name: 'Maori' },
  { code: 'MR', name: 'Marathi' },
  { code: 'MH', name: 'Marshallese' },
  { code: 'MN', name: 'Mongolian' },
  { code: 'NA', name: 'Nauru' },
  { code: 'NV', name: 'Navajo' },
  { code: 'ND', name: 'North Ndebele' },
  { code: 'NE', name: 'Nepali' },
  { code: 'NG', name: 'Ndonga' },
  { code: 'NB', name: 'Norwegian Bokmål' },
  { code: 'NN', name: 'Norwegian Nynorsk' },
  { code: 'NO', name: 'Norwegian' },
  { code: 'II', name: 'Sichuan Yi' },
  { code: 'NR', name: 'South Ndebele' },
  { code: 'OC', name: 'Occitan' },
  { code: 'OJ', name: 'Ojibwa' },
  { code: 'OR', name: 'Oriya' },
  { code: 'OM', name: 'Oromo' },
  { code: 'OS', name: 'Ossetian' },
  { code: 'PA', name: 'Punjabi' },
  { code: 'PI', name: 'Pali' },
  { code: 'FA', name: 'Persian' },
  { code: 'PL', name: 'Polish' },
  { code: 'PS', name: 'Pashto' },
  { code: 'PT', name: 'Portuguese' },
  { code: 'QU', name: 'Quechua' },
  { code: 'RM', name: 'Romansh' },
  { code: 'RN', name: 'Rundi' },
  { code: 'RO', name: 'Romanian' },
  { code: 'RU', name: 'Russian' },
  { code: 'SA', name: 'Sanskrit' },
  { code: 'SC', name: 'Sardinian' },
  { code: 'SD', name: 'Sindhi' },
  { code: 'SE', name: 'Northern Sami' },
  { code: 'SM', name: 'Samoan' },
  { code: 'SG', name: 'Sango' },
  { code: 'SR', name: 'Serbian' },
  { code: 'GD', name: 'Scottish Gaelic' },
  { code: 'SN', name: 'Shona' },
  { code: 'SI', name: 'Sinhala' },
  { code: 'SK', name: 'Slovak' },
  { code: 'SL', name: 'Slovenian' },
  { code: 'SO', name: 'Somali' },
  { code: 'ST', name: 'Southern Sotho' },
  { code: 'ES', name: 'Spanish' },
  { code: 'SU', name: 'Sundanese' },
  { code: 'SW', name: 'Swahili' },
  { code: 'SS', name: 'Swati' },
  { code: 'SV', name: 'Swedish' },
  { code: 'TA', name: 'Tamil' },
  { code: 'TE', name: 'Telugu' },
  { code: 'TG', name: 'Tajik' },
  { code: 'TH', name: 'Thai' },
  { code: 'TI', name: 'Tigrinya' },
  { code: 'BO', name: 'Tibetan' },
  { code: 'TK', name: 'Turkmen' },
  { code: 'TL', name: 'Tagalog' },
  { code: 'TN', name: 'Tswana' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TR', name: 'Turkish' },
  { code: 'TS', name: 'Tsonga' },
  { code: 'TT', name: 'Tatar' },
  { code: 'TW', name: 'Twi' },
  { code: 'TY', name: 'Tahitian' },
  { code: 'UG', name: 'Uighur' },
  { code: 'UK', name: 'Ukrainian' },
  { code: 'UR', name: 'Urdu' },
  { code: 'UZ', name: 'Uzbek' },
  { code: 'VE', name: 'Venda' },
  { code: 'VI', name: 'Vietnamese' },
  { code: 'VO', name: 'Volapük' },
  { code: 'WA', name: 'Walloon' },
  { code: 'CY', name: 'Welsh' },
  { code: 'WO', name: 'Wolof' },
  { code: 'XH', name: 'Xhosa' },
  { code: 'YI', name: 'Yiddish' },
  { code: 'YO', name: 'Yoruba' },
  { code: 'ZA', name: 'Zhuang' },
  { code: 'ZU', name: 'Zulu' }
];

// IDM Status values per ISO 29481-1
const STATUS_OPTIONS = [
  { value: 'NP', label: 'NP - New Project', description: 'Initial proposal stage' },
  { value: 'WD', label: 'WD - Working Draft', description: 'Under development' },
  { value: 'CD', label: 'CD - Committee Draft', description: 'Under committee review' },
  { value: 'DIS', label: 'DIS - Draft International Standard', description: 'Draft for voting' },
  { value: 'FDIS', label: 'FDIS - Final Draft', description: 'Final draft' },
  { value: 'PUB', label: 'PUB - Published', description: 'Officially published' },
  { value: 'WDRL', label: 'WDRL - Withdrawn', description: 'No longer active' }
];

// Project Stages per ISO 22263 (international standard)
const PROJECT_STAGES_ISO = [
  { value: 'inception', label: 'Inception', description: 'Initial project conception' },
  { value: 'brief', label: 'Brief', description: 'Project brief and requirements' },
  { value: 'design', label: 'Design', description: 'Design development phase' },
  { value: 'production', label: 'Production', description: 'Construction/production phase' },
  { value: 'handover', label: 'Handover', description: 'Project handover and commissioning' },
  { value: 'operation', label: 'Operation', description: 'Facility operation and maintenance' },
  { value: 'end-of-life', label: 'End of Life', description: 'Demolition/decommissioning' }
];

// AIA Document B101 Project Stages (US standard)
const PROJECT_STAGES_AIA = [
  { value: 'aia-sd', label: 'SD - Schematic Design', description: 'AIA: Initial design concepts' },
  { value: 'aia-dd', label: 'DD - Design Development', description: 'AIA: Detailed design development' },
  { value: 'aia-cd', label: 'CD - Construction Documents', description: 'AIA: Construction documentation' },
  { value: 'aia-procurement', label: 'Procurement', description: 'AIA: Bidding and procurement' },
  { value: 'aia-construction', label: 'Construction', description: 'AIA: Construction administration' }
];

// RIBA Plan of Work Stages (UK standard)
const PROJECT_STAGES_RIBA = [
  { value: 'riba-0', label: 'Stage 0 - Strategic Definition', description: 'RIBA: Project brief development' },
  { value: 'riba-1', label: 'Stage 1 - Preparation & Brief', description: 'RIBA: Initial studies and brief' },
  { value: 'riba-2', label: 'Stage 2 - Concept Design', description: 'RIBA: Concept proposals' },
  { value: 'riba-3', label: 'Stage 3 - Developed Design', description: 'RIBA: Developed design proposals' },
  { value: 'riba-4', label: 'Stage 4 - Technical Design', description: 'RIBA: Technical design' },
  { value: 'riba-5', label: 'Stage 5 - Construction', description: 'RIBA: Construction phase' },
  { value: 'riba-6', label: 'Stage 6 - Handover & Close Out', description: 'RIBA: Project completion' },
  { value: 'riba-7', label: 'Stage 7 - In Use', description: 'RIBA: Post-occupancy' }
];

// Stage framework options
const STAGE_FRAMEWORKS = [
  { value: 'iso22263', label: 'ISO 22263 (International)', stages: PROJECT_STAGES_ISO },
  { value: 'aia', label: 'AIA Document B101 (US)', stages: PROJECT_STAGES_AIA },
  { value: 'riba', label: 'RIBA Plan of Work (UK)', stages: PROJECT_STAGES_RIBA }
];

// Regional Applicability - ISO 3166-1 Country Codes
const REGIONS = [
  { value: 'international', label: 'International (All regions)' },
  // Major regions
  { value: 'EU', label: 'European Union' },
  { value: 'NA', label: 'North America' },
  { value: 'APAC', label: 'Asia-Pacific' },
  // ISO 3166-1 alpha-2 country codes (common countries)
  { value: 'AF', label: 'Afghanistan' },
  { value: 'AL', label: 'Albania' },
  { value: 'DZ', label: 'Algeria' },
  { value: 'AR', label: 'Argentina' },
  { value: 'AU', label: 'Australia' },
  { value: 'AT', label: 'Austria' },
  { value: 'BE', label: 'Belgium' },
  { value: 'BR', label: 'Brazil' },
  { value: 'BG', label: 'Bulgaria' },
  { value: 'CA', label: 'Canada' },
  { value: 'CL', label: 'Chile' },
  { value: 'CN', label: 'China' },
  { value: 'CO', label: 'Colombia' },
  { value: 'HR', label: 'Croatia' },
  { value: 'CZ', label: 'Czech Republic' },
  { value: 'DK', label: 'Denmark' },
  { value: 'EG', label: 'Egypt' },
  { value: 'EE', label: 'Estonia' },
  { value: 'FI', label: 'Finland' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'GR', label: 'Greece' },
  { value: 'HK', label: 'Hong Kong' },
  { value: 'HU', label: 'Hungary' },
  { value: 'IS', label: 'Iceland' },
  { value: 'IN', label: 'India' },
  { value: 'ID', label: 'Indonesia' },
  { value: 'IE', label: 'Ireland' },
  { value: 'IL', label: 'Israel' },
  { value: 'IT', label: 'Italy' },
  { value: 'JP', label: 'Japan' },
  { value: 'KZ', label: 'Kazakhstan' },
  { value: 'KR', label: 'Korea, Republic of' },
  { value: 'KW', label: 'Kuwait' },
  { value: 'LV', label: 'Latvia' },
  { value: 'LT', label: 'Lithuania' },
  { value: 'LU', label: 'Luxembourg' },
  { value: 'MY', label: 'Malaysia' },
  { value: 'MX', label: 'Mexico' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'NO', label: 'Norway' },
  { value: 'PK', label: 'Pakistan' },
  { value: 'PE', label: 'Peru' },
  { value: 'PH', label: 'Philippines' },
  { value: 'PL', label: 'Poland' },
  { value: 'PT', label: 'Portugal' },
  { value: 'QA', label: 'Qatar' },
  { value: 'RO', label: 'Romania' },
  { value: 'RU', label: 'Russian Federation' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'RS', label: 'Serbia' },
  { value: 'SG', label: 'Singapore' },
  { value: 'SK', label: 'Slovakia' },
  { value: 'SI', label: 'Slovenia' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'ES', label: 'Spain' },
  { value: 'SE', label: 'Sweden' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'TW', label: 'Taiwan' },
  { value: 'TH', label: 'Thailand' },
  { value: 'TR', label: 'Turkey' },
  { value: 'UA', label: 'Ukraine' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'VN', label: 'Vietnam' }
];

// Optional fields for IDM Header - Identifiers section (per ISO 29481-3)
const OPTIONAL_IDENTIFIER_FIELDS = [
  { key: 'subTitle', label: 'Sub-Title' },
  { key: 'localCode', label: 'Local Code' },
  { key: 'copyright', label: 'Copyright' },
  { key: 'license', label: 'License' }
];

// Optional fields for Use Case - Purpose section (per ISO 29481-3)
const OPTIONAL_PURPOSE_FIELDS = [
  { key: 'keywords', label: 'Scope Keywords' },
  { key: 'benefitKeywords', label: 'Benefit Keywords' },
  { key: 'benefits', label: 'Benefits (Description)' },
  { key: 'propositions', label: 'Propositions' },
  { key: 'limitations', label: 'Limitations' },
  { key: 'constructionEntities', label: 'Target Construction Entities' },
  { key: 'additionalDescription', label: 'Additional Description' },
  { key: 'references', label: 'References' }
];

// Optional fields for Use Case - Actors section (per ISO 29481-3)
const OPTIONAL_ACTOR_FIELDS = [
  { key: 'actors', label: 'Actors' },
  { key: 'actorRoles', label: 'Actor Roles/Responsibilities' }
];


// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ContentPane = ({
  type,
  headerData = {},
  erDataMap = {},
  erHierarchy = [],  // ER-first mode: hierarchical array of ERs
  dataObjects = [],
  onHeaderChange,
  onSelectER,
  newlyAddedErId = null,         // ID of newly added ER (for scrolling)
  onClearNewlyAddedErId,         // Callback to clear newly added ER ID after scrolling
  // ER hierarchy manipulation handlers
  onAddER,
  onDeleteER,
  onMoveUp,
  onMoveDown,
  onIndent,
  onOutdent,
  onImportER,
  onExportER,
  selectedErId = null,           // Currently selected ER for operations
  bpmnActorsList = [],           // BPMN Pools/Lanes for actor linking
  onClose
}) => {
  // Determine if using ER-first mode
  // Always use ER-first mode unless there's legacy erDataMap data without erHierarchy
  const hasLegacyData = Object.keys(erDataMap || {}).length > 0;
  const isErFirstMode = erHierarchy.length > 0 || !hasLegacyData;
  // Ref to prevent double-clicks on Add buttons (React StrictMode can cause double invocations)
  const lastAddTimeRef = useRef(0);
  // Refs for scrolling to newly added ER
  const erItemRefs = useRef({});
  // Ref for hidden file input (ER import)
  const erImportFileRef = useRef(null);
  // Ref to track newly added actor for auto-focus
  const newActorIdRef = useRef(null);
  // State for actor-to-BPMN link modal
  const [linkModalState, setLinkModalState] = useState(null); // { actorIndex, subActorIndex? }
  const [mergeModalState, setMergeModalState] = useState(null); // { item, sourceActorIndex, sourceSubActorIndex?, isSubActorLink }

  // Determine which optional fields have data and should be visible
  const getInitialVisibleFields = useCallback((data) => {
    const identifierKeys = ['subTitle', 'localCode', 'copyright', 'license'];
    const purposeKeys = ['keywords', 'benefitKeywords', 'benefits', 'propositions', 'limitations', 'constructionEntities', 'additionalDescription', 'references'];
    const actorKeys = ['actors', 'actorRoles'];

    const hasData = (key) => {
      const value = data[key];
      if (value === undefined || value === null) return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      return true;
    };

    return {
      identifiers: identifierKeys.filter(key => hasData(key)),
      purpose: purposeKeys.filter(key => hasData(key)),
      actors: actorKeys.filter(key => hasData(key))
    };
  }, []);

  // State for optional fields visibility - initialize based on existing data
  const [visibleOptionalFields, setVisibleOptionalFields] = useState(() => getInitialVisibleFields(headerData));

  // Update visible fields when headerData changes (e.g., when project is loaded)
  React.useEffect(() => {
    const newVisibleFields = getInitialVisibleFields(headerData);
    setVisibleOptionalFields(prev => ({
      identifiers: [...new Set([...prev.identifiers, ...newVisibleFields.identifiers])],
      purpose: [...new Set([...prev.purpose, ...newVisibleFields.purpose])],
      actors: [...new Set([...prev.actors, ...newVisibleFields.actors])]
    }));
  }, [headerData, getInitialVisibleFields]);

  // Auto-expand and scroll to newly added ER in the hierarchy
  React.useEffect(() => {
    if (newlyAddedErId && type === 'exchangeReq' && erHierarchy.length > 0) {
      // Find the path to the newly added ER and expand all nodes along the way
      // nodeId format matches ERHierarchyItem: isRoot ? 'root' : `${parentId}-${er.id}`
      const findPathToEr = (hierarchy, targetId, parentNodeId = null, isTopLevel = true) => {
        for (const er of hierarchy) {
          // Calculate nodeId the same way ERHierarchyItem does
          const nodeId = isTopLevel ? 'root' : `${parentNodeId}-${er.id}`;
          if (er.id === targetId) {
            return [nodeId];
          }
          if (er.subERs && er.subERs.length > 0) {
            const childPath = findPathToEr(er.subERs, targetId, nodeId, false);
            if (childPath) {
              return [nodeId, ...childPath];
            }
          }
        }
        return null;
      };

      const pathToNewEr = findPathToEr(erHierarchy, newlyAddedErId);
      if (pathToNewEr && pathToNewEr.length > 0) {
        // Expand all ancestors (not the new ER itself, which is the last in the path)
        setExpandedNodes(prev => {
          const next = new Set(prev);
          pathToNewEr.slice(0, -1).forEach(nodeId => next.add(nodeId));
          return next;
        });
      }

      // Wait for DOM update then scroll to the newly added ER
      setTimeout(() => {
        const element = erItemRefs.current[newlyAddedErId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        // Clear the newly added ER ID after scrolling
        onClearNewlyAddedErId?.();
      }, 150);
    }
  }, [newlyAddedErId, type, erHierarchy, onClearNewlyAddedErId]);

  if (!type) return null;

  const handleHeaderFieldChange = useCallback((field, value) => {
    // Skip if value hasn't actually changed (prevents isDirty false positives from dropdown re-selection)
    const currentValue = headerData[field];
    if (currentValue === value) return;
    if (value != null && currentValue != null && typeof value === 'object' && typeof currentValue === 'object') {
      if (JSON.stringify(value) === JSON.stringify(currentValue)) return;
    }
    onHeaderChange?.({
      ...headerData,
      [field]: value
    });
  }, [onHeaderChange, headerData]);

  const handleOptionalFieldsChange = useCallback((category, fields) => {
    setVisibleOptionalFields(prev => ({
      ...prev,
      [category]: fields
    }));
  }, []);

  // Generate IDM Code
  const idmCode = useMemo(() => {
    return generateIdmCode(
      headerData.title,
      headerData.organization,
      headerData.version,
      headerData.creationDate
    );
  }, [headerData.title, headerData.organization, headerData.version, headerData.creationDate]);

  const renderHeader = () => {
    const titles = {
      specification: { icon: SpecificationIcon, title: 'IDM Header' },
      useCase: { icon: UseCaseIcon, title: 'Use Case' },
      exchangeReq: { icon: ExchangeReqIcon, title: 'Exchange Requirements' }
    };

    const { title } = titles[type] || {};

    return (
      <div className="content-pane-header">
        <div className="content-pane-title">
          <span>{title}</span>
        </div>
        <button className="content-pane-close" onClick={onClose} title="Close">
          <CloseIcon size={16} />
        </button>
      </div>
    );
  };

  // =========================================================================
  // IDM HEADER (formerly Basic Information)
  // =========================================================================
  const renderIdmHeader = () => (
    <div className="content-pane-body">
      {/* IDENTIFIERS Section */}
      <Section title="Identifiers" defaultExpanded={true}>
        <div className="pane-field">
          <label>Full Title <span className="required">*</span></label>
          <input
            type="text"
            value={headerData.title || ''}
            onChange={(e) => handleHeaderFieldChange('title', e.target.value)}
            placeholder="e.g., Design to Construction Information Exchange"
            className="pane-input"
          />
          <span className="pane-hint">Complete descriptive title of the IDM specification.</span>
          <div className="idm-code-display">
            {idmCode}
          </div>
        </div>

        <div className="pane-field">
          <label>Short Title <span className="required">*</span></label>
          <input
            type="text"
            value={headerData.shortTitle || ''}
            onChange={(e) => handleHeaderFieldChange('shortTitle', e.target.value)}
            placeholder="e.g., Design-Construction Exchange"
            className="pane-input"
          />
          <span className="pane-hint">Short title of the IDM specification.</span>
        </div>

        <div className="pane-field-row">
          <div className="pane-field">
            <label>Version</label>
            <input
              type="text"
              value={headerData.version || ''}
              onChange={(e) => handleHeaderFieldChange('version', e.target.value)}
              placeholder="e.g., 1.0.0"
              className="pane-input"
            />
          </div>
          <div className="pane-field">
            <label>Status <span className="required">*</span></label>
            <select
              value={headerData.status || 'NP'}
              onChange={(e) => handleHeaderFieldChange('status', e.target.value)}
              className="pane-select"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Optional Identifier Fields per ISO 29481-3 */}

        {visibleOptionalFields.identifiers.includes('subTitle') && (
          <div className="pane-field">
            <label>Sub-Title</label>
            <input
              type="text"
              value={headerData.subTitle || ''}
              onChange={(e) => handleHeaderFieldChange('subTitle', e.target.value)}
              placeholder="Additional subtitle or qualifier"
              className="pane-input"
            />
          </div>
        )}

        {visibleOptionalFields.identifiers.includes('localCode') && (
          <div className="pane-field">
            <label>Local Code</label>
            <input
              type="text"
              value={headerData.localCode || ''}
              onChange={(e) => handleHeaderFieldChange('localCode', e.target.value)}
              placeholder="e.g., KR-IDM-2024-DC-01"
              className="pane-input"
            />
          </div>
        )}

        {visibleOptionalFields.identifiers.includes('copyright') && (
          <div className="pane-field">
            <label>Copyright</label>
            <input
              type="text"
              value={headerData.copyright || ''}
              onChange={(e) => handleHeaderFieldChange('copyright', e.target.value)}
              placeholder="e.g., © 2024 Organization Name"
              className="pane-input"
            />
          </div>
        )}

        {visibleOptionalFields.identifiers.includes('license') && (
          <div className="pane-field">
            <label>License</label>
            <input
              type="text"
              value={headerData.license || ''}
              onChange={(e) => handleHeaderFieldChange('license', e.target.value)}
              placeholder="e.g., CC BY 4.0"
              className="pane-input"
            />
          </div>
        )}

        <OptionalFieldsToggle
          options={OPTIONAL_IDENTIFIER_FIELDS}
          selected={visibleOptionalFields.identifiers}
          onChange={(fields) => handleOptionalFieldsChange('identifiers', fields)}
          label="Add optional fields"
        />
      </Section>

      {/* AUTHORS Section */}
      <Section title="Authors" defaultExpanded={true}>
        <AuthorsList
          authors={Array.isArray(headerData.authors) ? headerData.authors : []}
          onChange={(authors) => handleHeaderFieldChange('authors', authors)}
        />
      </Section>

      {/* REVISION HISTORY Section */}
      <Section title="Revision History" defaultExpanded={true}>
        <RevisionHistory
          creationDate={headerData.creationDate}
          revisionHistory={Array.isArray(headerData.revisionHistory) ? headerData.revisionHistory : []}
          onCreationDateChange={(date) => handleHeaderFieldChange('creationDate', date)}
          onHistoryChange={(history) => handleHeaderFieldChange('revisionHistory', history)}
        />
      </Section>
    </div>
  );

  // =========================================================================
  // USE CASE
  // =========================================================================
  const renderUseCase = () => (
    <div className="content-pane-body">
      {/* PURPOSE Section */}
      <Section title="Purpose" defaultExpanded={true}>
        <DescriptionWithFigures
          label="Aim and Scope"
          value={headerData.aimAndScope || headerData.objectives || ''}
          figures={Array.isArray(headerData.aimAndScopeFigures) ? headerData.aimAndScopeFigures : []}
          onChange={(value) => handleHeaderFieldChange('aimAndScope', value)}
          onFiguresChange={(figures) => handleHeaderFieldChange('aimAndScopeFigures', figures)}
          placeholder="Describe the purpose and coverage of this IDM specification..."
          rows={3}
          required
        />
        <span className="pane-hint">A brief description of the purpose and coverage of the IDM specification.</span>

        <UseEntry
          uses={Array.isArray(headerData.uses) ? headerData.uses : []}
          useClassification={headerData.useClassification}
          onChange={(uses) => handleHeaderFieldChange('uses', uses)}
          onClassificationChange={(classification) => handleHeaderFieldChange('useClassification', classification)}
        />
        <span className="pane-hint">Use defines the purpose of information exchange in a project. Combining uses with specific execution methods and outcome definitions, it forms a use case of an IDM specification.</span>

        <DescriptionWithFigures
          label="Summary"
          value={headerData.summary || ''}
          figures={Array.isArray(headerData.summaryFigures) ? headerData.summaryFigures : []}
          onChange={(value) => handleHeaderFieldChange('summary', value)}
          onFiguresChange={(figures) => handleHeaderFieldChange('summaryFigures', figures)}
          placeholder="Describe the aim and scope, benefits, and other aspects of the IDM specification..."
          rows={3}
          required
        />
        <span className="pane-hint">A description of the aim and scope, benefits, and other aspects of the IDM specification. You can add figures by pressing "+" button.</span>

        <RegionSelector
          label={<>Target Regions <span className="required">*</span></>}
          options={REGIONS}
          regions={Array.isArray(headerData.regions) ? headerData.regions : (headerData.region ? [headerData.region] : [])}
          onChange={(items) => handleHeaderFieldChange('regions', items)}
        />

        <div className="pane-field">
          <label>Language <span className="required">*</span></label>
          <select
            value={headerData.language || 'EN'}
            onChange={(e) => handleHeaderFieldChange('language', e.target.value)}
            className="pane-select"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.code} - {lang.name}</option>
            ))}
          </select>
        </div>

        {/* Optional Purpose Fields */}
        {visibleOptionalFields.purpose.includes('keywords') && (
          <div className="pane-field">
            <label>Scope Keywords</label>
            <input
              type="text"
              value={headerData.keywords?.join(', ') || ''}
              onChange={(e) => handleHeaderFieldChange('keywords', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="e.g., coordination, clash detection, design review"
              className="pane-input"
            />
          </div>
        )}

        {visibleOptionalFields.purpose.includes('benefitKeywords') && (
          <div className="pane-field">
            <label>Benefit Keywords</label>
            <input
              type="text"
              value={headerData.benefitKeywords?.join(', ') || ''}
              onChange={(e) => handleHeaderFieldChange('benefitKeywords', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="e.g., efficiency, accuracy, time-saving"
              className="pane-input"
            />
          </div>
        )}

        {visibleOptionalFields.purpose.includes('benefits') && (
          <DescriptionWithFigures
            label="Benefits (Description)"
            value={headerData.benefits || ''}
            figures={Array.isArray(headerData.benefitsFigures) ? headerData.benefitsFigures : []}
            onChange={(value) => handleHeaderFieldChange('benefits', value)}
            onFiguresChange={(figures) => handleHeaderFieldChange('benefitsFigures', figures)}
            placeholder="Detailed description of expected benefits..."
            rows={2}
          />
        )}

        {visibleOptionalFields.purpose.includes('propositions') && (
          <DescriptionWithFigures
            label="Propositions"
            value={headerData.propositions || ''}
            figures={Array.isArray(headerData.propositionsFigures) ? headerData.propositionsFigures : []}
            onChange={(value) => handleHeaderFieldChange('propositions', value)}
            onFiguresChange={(figures) => handleHeaderFieldChange('propositionsFigures', figures)}
            placeholder="Value propositions for this use case..."
            rows={2}
          />
        )}

        {visibleOptionalFields.purpose.includes('limitations') && (
          <DescriptionWithFigures
            label="Limitations"
            value={headerData.limitations || ''}
            figures={Array.isArray(headerData.limitationsFigures) ? headerData.limitationsFigures : []}
            onChange={(value) => handleHeaderFieldChange('limitations', value)}
            onFiguresChange={(figures) => handleHeaderFieldChange('limitationsFigures', figures)}
            placeholder="Known limitations..."
            rows={2}
          />
        )}

        {visibleOptionalFields.purpose.includes('constructionEntities') && (
          <div className="pane-field">
            <label>Target Construction Entities</label>
            <input
              type="text"
              value={headerData.constructionEntities?.join(', ') || ''}
              onChange={(e) => handleHeaderFieldChange('constructionEntities', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="e.g., Building, Bridge, Road, Tunnel"
              className="pane-input"
            />
          </div>
        )}

        {visibleOptionalFields.purpose.includes('additionalDescription') && (
          <div className="pane-field">
            <label>Additional Description</label>
            <textarea
              value={headerData.additionalDescription || ''}
              onChange={(e) => handleHeaderFieldChange('additionalDescription', e.target.value)}
              placeholder="User-defined properties of the IDM specification (key=value format, one per line)..."
              className="pane-textarea"
              rows={3}
            />
            <span className="pane-hint">User-defined properties of the IDM specification.</span>
          </div>
        )}

        {visibleOptionalFields.purpose.includes('references') && (
          <div className="pane-field">
            <label>References</label>
            <textarea
              value={headerData.references || ''}
              onChange={(e) => handleHeaderFieldChange('references', e.target.value)}
              placeholder="Related standards, documents, or resources..."
              className="pane-textarea"
              rows={2}
            />
          </div>
        )}

        <OptionalFieldsToggle
          options={OPTIONAL_PURPOSE_FIELDS}
          selected={visibleOptionalFields.purpose}
          onChange={(fields) => handleOptionalFieldsChange('purpose', fields)}
          label="Add optional fields"
        />
      </Section>

      {/* ACTOR ROLES Section - IDM 2.0 Schema Compliant */}
      <Section title="Actor Roles" defaultExpanded={true}>
        <div className="pane-field">
          <div className="pane-field-header">
            <label>Actors</label>
            <button
              type="button"
              className="pane-add-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Debounce to prevent multiple rapid clicks (React StrictMode issue)
                const now = Date.now();
                if (now - lastAddTimeRef.current < 300) return;
                lastAddTimeRef.current = now;

                const currentActors = Array.isArray(headerData.actorsList) ? headerData.actorsList : [];
                const newActor = {
                  id: `actor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  name: '',
                  role: '', // Role field (user-editable)
                  actorType: 'group', // Default to group (Pool) per IDM 2.0
                  bpmnShapeName: '',
                  subActors: [] // For BPMN lanes within a pool
                };
                newActorIdRef.current = newActor.id;
                handleHeaderFieldChange('actorsList', [...currentActors, newActor]);
              }}
              title="Add a new actor (Pool)"
            >
              <AddIcon size={12} /> Add Actor
            </button>
          </div>
          <span className="pane-hint">Actors can be groups or individuals. Information exchange between groups is external, while exchange between individuals is internal. In BPMN, Pools represent groups and external exchanges, and Swimlanes represent individuals and internal exchanges.</span>
        </div>
        {(Array.isArray(headerData.actorsList) ? headerData.actorsList : []).length === 0 ? (
          <div className="pane-empty-small">No actors defined. Add actors manually or they will be auto-populated from BPMN Pools and Swimlanes.</div>
        ) : (
          <div className="actors-list-items">
            {(Array.isArray(headerData.actorsList) ? headerData.actorsList : []).map((actor, index) => (
              <div key={actor.id || index} className="actor-card">
                {/* Line 1: Actor Name + Badge + Remove */}
                <div className="actor-header-row">
                  <textarea
                    ref={el => {
                      if (el && newActorIdRef.current === actor.id) {
                        el.focus();
                        newActorIdRef.current = null;
                      }
                    }}
                    value={actor.name || ''}
                    onChange={(e) => {
                      const newActors = [...headerData.actorsList];
                      newActors[index] = { ...actor, name: e.target.value };
                      handleHeaderFieldChange('actorsList', newActors);
                    }}
                    placeholder="Actor name (e.g., Design Team, Client)"
                    className="pane-input actor-name-input"
                    rows={1}
                  />
                  {actor.bpmnId ? (
                    <span className="actor-swimlane-badge" title={`Linked to BPMN Pool: ${actor.bpmnShapeName || actor.bpmnId}`}>
                      Pool
                    </span>
                  ) : actor.bpmnLaneId ? (
                    <span className="actor-lane-badge" title={`Linked to BPMN Lane: ${actor.bpmnLaneId}`}>
                      Lane
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="actor-manual-badge actor-manual-badge-clickable"
                      title="Click to link to a BPMN Pool"
                      onClick={() => setLinkModalState({ actorIndex: index })}
                    >
                      Manual
                    </button>
                  )}
                  <button
                    type="button"
                    className="actor-remove-btn"
                    onClick={() => {
                      if (actor.bpmnId) {
                        const confirmed = window.confirm(
                          `This actor "${actor.name || 'Unnamed'}" is linked to a BPMN Pool.\n\n` +
                          `Removing this actor will also delete the corresponding Pool in the process map.\n\n` +
                          `Do you want to continue?`
                        );
                        if (!confirmed) return;
                      }
                      const newActors = headerData.actorsList.filter((_, i) => i !== index);
                      handleHeaderFieldChange('actorsList', newActors);
                    }}
                    title="Remove actor"
                  >
                    ×
                  </button>
                </div>

                {/* Line 2: Role */}
                <div className="actor-role-row">
                  <textarea
                    value={actor.role || ''}
                    onChange={(e) => {
                      const newActors = [...headerData.actorsList];
                      newActors[index] = { ...actor, role: e.target.value };
                      handleHeaderFieldChange('actorsList', newActors);
                    }}
                    placeholder="Role"
                    className="pane-input actor-role-input"
                    title="Role of this actor in the process"
                    rows={1}
                  />
                </div>

                {/* Line 3: sub-actors list + Sub-actor button below */}
                <div className="actor-subactors-section">
                  {(actor.subActors || []).length > 0 && (
                    <div className="actor-lanes-list">
                      {(actor.subActors || []).map((subActor, subIndex) => (
                        <div key={subActor.id || subIndex} className="actor-lane-item">
                          {/* Sub-actor Line 1: Name + Badge + Remove */}
                          <div className="actor-lane-header-row">
                            <span className="actor-lane-indent">└</span>
                            <textarea
                              value={subActor.name || ''}
                              onChange={(e) => {
                                const newActors = [...headerData.actorsList];
                                const newSubActors = [...(actor.subActors || [])];
                                newSubActors[subIndex] = { ...subActor, name: e.target.value };
                                newActors[index] = { ...actor, subActors: newSubActors };
                                handleHeaderFieldChange('actorsList', newActors);
                              }}
                              placeholder="Sub-actor name (e.g., Architect, Engineer)"
                              className="pane-input actor-lane-input"
                              rows={1}
                            />
                            {subActor.bpmnShapeName ? (
                              <span className="actor-lane-badge" title={`Linked to BPMN Lane: ${subActor.bpmnShapeName}`}>
                                Lane
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="actor-manual-badge actor-manual-badge-clickable"
                                title="Click to link to a BPMN Lane"
                                onClick={() => setLinkModalState({ actorIndex: index, subActorIndex: subIndex })}
                              >
                                Manual
                              </button>
                            )}
                            <button
                              type="button"
                              className="actor-lane-remove-btn"
                              onClick={() => {
                                const newActors = [...headerData.actorsList];
                                const newSubActors = (actor.subActors || []).filter((_, i) => i !== subIndex);
                                newActors[index] = { ...actor, subActors: newSubActors };
                                handleHeaderFieldChange('actorsList', newActors);
                              }}
                              title="Remove sub-actor"
                            >
                              ×
                            </button>
                          </div>
                          {/* Sub-actor Line 2: Role */}
                          <div className="actor-lane-role-row">
                            <textarea
                              value={subActor.role || ''}
                              onChange={(e) => {
                                const newActors = [...headerData.actorsList];
                                const newSubActors = [...(actor.subActors || [])];
                                newSubActors[subIndex] = { ...subActor, role: e.target.value };
                                newActors[index] = { ...actor, subActors: newSubActors };
                                handleHeaderFieldChange('actorsList', newActors);
                              }}
                              placeholder="Role"
                              className="pane-input actor-lane-role-input"
                              title="Role of this individual"
                              rows={1}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="actor-add-lane-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const newActors = [...headerData.actorsList];
                      const subActors = actor.subActors || [];
                      const makeSubActor = () => ({
                        id: `subactor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        name: '',
                        role: '',
                        bpmnShapeName: ''
                      });
                      if (subActors.length === 0) {
                        newActors[index] = { ...actor, subActors: [makeSubActor(), makeSubActor()] };
                      } else {
                        newActors[index] = { ...actor, subActors: [...subActors, makeSubActor()] };
                      }
                      handleHeaderFieldChange('actorsList', newActors);
                    }}
                    title="Add a sub-actor (individual) to this actor"
                  >
                    + Sub-actor
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Link to BPMN Pool/Lane Modal */}
        {linkModalState && (() => {
          const isSubActorLink = linkModalState.subActorIndex !== undefined;
          const currentActors = Array.isArray(headerData.actorsList) ? headerData.actorsList : [];

          // Build separate maps for Pool links, top-level Lane links, and sub-actor Lane links
          const linkedByPoolId = {}; // poolId -> { actorIndex, actorName }
          const linkedLaneByActor = {}; // laneId -> { actorIndex, actorName } (top-level actor bpmnLaneId)
          const linkedLaneBySub = {}; // laneId -> { actorIndex, subActorIndex, actorName, subActorName }
          currentActors.forEach((a, ai) => {
            if (a.bpmnId) {
              linkedByPoolId[a.bpmnId] = { actorIndex: ai, actorName: a.name || '(unnamed)' };
            }
            if (a.bpmnLaneId) {
              linkedLaneByActor[a.bpmnLaneId] = { actorIndex: ai, actorName: a.name || '(unnamed)' };
            }
            (a.subActors || []).forEach((s, si) => {
              if (s.bpmnShapeName) {
                linkedLaneBySub[s.bpmnShapeName] = { actorIndex: ai, subActorIndex: si, actorName: a.name || '(unnamed)', subActorName: s.name || '(unnamed)' };
              }
            });
          });

          // Show ALL Pools and Lanes regardless of link status
          let allItems = [];
          (bpmnActorsList || []).forEach(pool => {
            const linked = linkedByPoolId[pool.id];
            allItems.push({
              id: pool.id,
              name: pool.name || '(unnamed)',
              type: 'pool',
              linkedTo: linked ? linked.actorName : null,
              linkedActorIndex: linked ? linked.actorIndex : null
            });
            (pool.subActors || []).forEach(lane => {
              const topLinked = linkedLaneByActor[lane.id];
              const subLinked = linkedLaneBySub[lane.id];
              const displayLinked = topLinked ? topLinked.actorName : (subLinked ? subLinked.subActorName : null);
              allItems.push({
                id: lane.id,
                name: lane.name || '(unnamed)',
                poolName: pool.name,
                type: 'lane',
                linkedTo: displayLinked,
                topLevelLink: topLinked || null,
                subActorLink: subLinked || null
              });
            });
          });

          const handleLinkSelect = (item) => {
            const sourceActorIndex = linkModalState.actorIndex;
            const sourceSubActorIndex = linkModalState.subActorIndex;

            // Check for same-level conflicts only
            if (item.linkedTo !== null) {
              let conflictItem = null;
              if (item.type === 'pool' && item.linkedTo) {
                // Pool links are always top-level — same-level conflict
                conflictItem = { ...item, linkedActorIndex: item.linkedActorIndex, linkedSubActorIndex: undefined };
              } else if (item.type === 'lane') {
                if (isSubActorLink && item.subActorLink) {
                  // Sub-actor linking to lane already linked by another sub-actor
                  conflictItem = { ...item, linkedActorIndex: item.subActorLink.actorIndex, linkedSubActorIndex: item.subActorLink.subActorIndex };
                } else if (!isSubActorLink && item.topLevelLink) {
                  // Top-level actor linking to lane already linked by another top-level actor
                  conflictItem = { ...item, linkedActorIndex: item.topLevelLink.actorIndex, linkedSubActorIndex: undefined };
                } else if (!isSubActorLink && item.subActorLink) {
                  // Top-level actor linking to lane linked by a sub-actor — cross-level merge
                  conflictItem = { ...item, linkedActorIndex: item.subActorLink.actorIndex, linkedSubActorIndex: item.subActorLink.subActorIndex };
                }
              }
              if (conflictItem) {
                setMergeModalState({
                  item: conflictItem,
                  sourceActorIndex,
                  sourceSubActorIndex,
                  isSubActorLink
                });
                return;
              }
            }

            // Recommend Pool for actors with sub-actors
            if (!isSubActorLink && item.type === 'lane') {
              const sourceActor = currentActors[sourceActorIndex];
              if (sourceActor?.subActors?.length > 0) {
                const proceed = window.confirm(
                  `"${sourceActor.name || '(unnamed)'}" has sub-actors. ` +
                  `Consider mapping it to a Pool instead, so sub-actors can map to Lanes within it.\n\n` +
                  `Link to this Lane anyway?`
                );
                if (!proceed) return;
              }
            }

            // No conflict — apply link
            const newActors = [...currentActors];
            if (isSubActorLink) {
              const actor = newActors[sourceActorIndex];
              const newSubActors = [...(actor.subActors || [])];
              newSubActors[sourceSubActorIndex] = {
                ...newSubActors[sourceSubActorIndex],
                bpmnShapeName: item.id
              };
              newActors[sourceActorIndex] = { ...actor, subActors: newSubActors };
            } else if (item.type === 'lane') {
              // Top-level actor linking to a Lane
              newActors[sourceActorIndex] = {
                ...newActors[sourceActorIndex],
                bpmnId: null,
                bpmnLaneId: item.id
              };
            } else {
              // Top-level actor linking to a Pool
              newActors[sourceActorIndex] = {
                ...newActors[sourceActorIndex],
                bpmnId: item.id,
                bpmnShapeName: item.name,
                bpmnLaneId: null
              };
            }
            handleHeaderFieldChange('actorsList', newActors);
            setLinkModalState(null);
            setMergeModalState(null);
          };

          return (
            <div className="actor-link-modal-overlay" onClick={() => { setLinkModalState(null); setMergeModalState(null); }}>
              <div className="actor-link-modal" onClick={(e) => e.stopPropagation()}>
                <div className="actor-link-modal-header">
                  <h4>Link to BPMN Pool or Swimlane</h4>
                  <button className="actor-link-modal-close" onClick={() => { setLinkModalState(null); setMergeModalState(null); }}>×</button>
                </div>
                <div className="actor-link-modal-body">
                  {allItems.length === 0 ? (
                    <div className="actor-link-modal-empty">
                      No Pools or Swimlanes available. Create Pools or Swimlanes in the BPMN editor first.
                    </div>
                  ) : (
                    <div className="actor-link-modal-list">
                      {allItems.map(item => (
                        <button
                          key={item.id}
                          className={`actor-link-modal-item${item.linkedTo ? ' actor-link-modal-item-linked' : ''}`}
                          onClick={() => handleLinkSelect(item)}
                        >
                          <span className={item.type === 'pool' ? 'actor-swimlane-badge' : 'actor-lane-badge'}>
                            {item.type === 'pool' ? 'Pool' : 'Lane'}
                          </span>
                          <span className="actor-link-modal-item-name">{item.name}</span>
                          {item.poolName && <span className="actor-link-modal-item-pool">in {item.poolName}</span>}
                          {item.linkedTo && <span className="actor-link-modal-item-linked-label">linked to: {item.linkedTo}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
        {/* Merge options modal — shown when user clicks a Pool/Lane that is already linked */}
        {mergeModalState && (() => {
          const { item, sourceActorIndex, sourceSubActorIndex, isSubActorLink: isSub } = mergeModalState;
          const actors = Array.isArray(headerData.actorsList) ? headerData.actorsList : [];

          // A = the currently unconnected actor (clicked "Manual")
          // B = the already-connected actor (linked to the selected Pool/Lane)
          let nameA, roleA, nameB, roleB;
          if (isSub) {
            const subA = actors[sourceActorIndex]?.subActors?.[sourceSubActorIndex];
            nameA = subA?.name || '(unnamed)';
            roleA = subA?.role || '';
            if (item.linkedSubActorIndex !== undefined) {
              const subB = actors[item.linkedActorIndex]?.subActors?.[item.linkedSubActorIndex];
              nameB = subB?.name || '(unnamed)';
              roleB = subB?.role || '';
            } else {
              nameB = actors[item.linkedActorIndex]?.name || '(unnamed)';
              roleB = actors[item.linkedActorIndex]?.role || '';
            }
          } else {
            nameA = actors[sourceActorIndex]?.name || '(unnamed)';
            roleA = actors[sourceActorIndex]?.role || '';
            if (item.linkedSubActorIndex !== undefined) {
              // Cross-level: B is a sub-actor
              const subB = actors[item.linkedActorIndex]?.subActors?.[item.linkedSubActorIndex];
              nameB = subB?.name || '(unnamed)';
              roleB = subB?.role || '';
            } else {
              nameB = actors[item.linkedActorIndex]?.name || '(unnamed)';
              roleB = actors[item.linkedActorIndex]?.role || '';
            }
          }

          // Always: remove unlinked A, keep linked B, apply chosen name/role to B
          const applyMerge = (mode) => {
            const newActors = [...actors];

            let mergedName, mergedRole;
            if (mode === 'keepB') { mergedName = nameB; mergedRole = roleB; }
            else if (mode === 'keepA') { mergedName = nameA; mergedRole = roleA; }
            else { // merge
              mergedName = [nameA, nameB].filter(Boolean).join('; ');
              mergedRole = [roleA, roleB].filter(Boolean).join('; ');
            }

            if (isSub) {
              // --- A is a sub-actor (unlinked) — remove it, update B ---
              if (item.linkedSubActorIndex !== undefined) {
                // B is also a sub-actor — update B's name/role, then remove A
                let adjLinkedSubIdx = item.linkedSubActorIndex;
                if (item.linkedActorIndex === sourceActorIndex && item.linkedSubActorIndex > sourceSubActorIndex) {
                  adjLinkedSubIdx = item.linkedSubActorIndex - 1;
                }
                // Remove sub-actor A
                const parentA = newActors[sourceActorIndex];
                const subsA = [...(parentA.subActors || [])];
                subsA.splice(sourceSubActorIndex, 1);
                newActors[sourceActorIndex] = { ...parentA, subActors: subsA };
                // Update sub-actor B
                const parentB = newActors[item.linkedActorIndex];
                const subsB = [...(parentB.subActors || [])];
                subsB[adjLinkedSubIdx] = { ...subsB[adjLinkedSubIdx], name: mergedName, role: mergedRole };
                newActors[item.linkedActorIndex] = { ...parentB, subActors: subsB };
              } else {
                // B is a top-level actor — update B's name/role, remove sub-actor A
                newActors[item.linkedActorIndex] = { ...newActors[item.linkedActorIndex], name: mergedName, role: mergedRole };
                const parentA = newActors[sourceActorIndex];
                const subsA = [...(parentA.subActors || [])];
                subsA.splice(sourceSubActorIndex, 1);
                newActors[sourceActorIndex] = { ...parentA, subActors: subsA };
              }
            } else {
              // --- A is a top-level actor (unlinked) — remove it, update B ---
              const aSubActors = newActors[sourceActorIndex]?.subActors || [];

              if (item.linkedSubActorIndex !== undefined) {
                // B is a sub-actor (cross-level) — update B, move A's sub-actors to B's parent, remove A
                const parentBIdx = item.linkedActorIndex;
                const parentB = newActors[parentBIdx];
                const subsB = [...(parentB.subActors || [])];
                subsB[item.linkedSubActorIndex] = { ...subsB[item.linkedSubActorIndex], name: mergedName, role: mergedRole };
                newActors[parentBIdx] = { ...parentB, subActors: [...subsB, ...aSubActors] };
                newActors.splice(sourceActorIndex, 1);
              } else {
                // B is also a top-level actor (same-level) — update B, move A's sub-actors to B, remove A
                const bSubActors = newActors[item.linkedActorIndex]?.subActors || [];
                newActors[item.linkedActorIndex] = {
                  ...newActors[item.linkedActorIndex],
                  name: mergedName,
                  role: mergedRole,
                  subActors: [...bSubActors, ...aSubActors]
                };
                newActors.splice(sourceActorIndex, 1);
              }
            }

            handleHeaderFieldChange('actorsList', newActors);
            setMergeModalState(null);
            setLinkModalState(null);
          };

          return (
            <div className="actor-link-modal-overlay" onClick={() => setMergeModalState(null)}>
              <div className="actor-link-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
                <div className="actor-link-modal-header">
                  <h4>Resolve Link Conflict</h4>
                  <button className="actor-link-modal-close" onClick={() => setMergeModalState(null)}>×</button>
                </div>
                <div className="actor-link-modal-body" style={{ padding: '12px 16px' }}>
                  <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    <strong>{item.name}</strong> is already linked to <strong>"{nameB}"</strong>.
                    The unlinked actor <strong>"{nameA}"</strong> will be removed. Choose how to resolve:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button className="actor-link-modal-item" onClick={() => applyMerge('keepB')}
                      style={{ textAlign: 'left', padding: '8px 12px', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: 13 }}>Keep linked actor information</strong>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Keep "{nameB}" and discard "{nameA}"
                      </span>
                    </button>
                    <button className="actor-link-modal-item" onClick={() => applyMerge('keepA')}
                      style={{ textAlign: 'left', padding: '8px 12px', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: 13 }}>Replace with unlinked actor information</strong>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Rename linked actor to "{nameA}" and remove the unlinked actor
                      </span>
                    </button>
                    <button className="actor-link-modal-item" onClick={() => applyMerge('merge')}
                      style={{ textAlign: 'left', padding: '8px 12px', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: 13 }}>Merge both</strong>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Rename linked actor to "{[nameA, nameB].filter(Boolean).join('; ')}" and remove the unlinked actor
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </Section>

      {/* TARGET PROJECT PHASES Section */}
      <Section title="Target Project Phases" defaultExpanded={true}>
        {/* Default: ISO 22263 Stages (mandatory) */}
        <MultiSelectCheckbox
          label={<>ISO 22263 Project Stages <span className="required">*</span></>}
          options={PROJECT_STAGES_ISO}
          selected={Array.isArray(headerData.projectStagesIso) ? headerData.projectStagesIso : (Array.isArray(headerData.projectStages) ? headerData.projectStages : [])}
          onChange={(items) => handleHeaderFieldChange('projectStagesIso', items)}
          allowCustom={false}
        />
        <span className="pane-hint">ISO 22263 project stages are mandatory for the IDM specification.</span>

        {/* Optional: Additional Framework Stages */}
        <div className="pane-field" style={{ marginTop: '16px' }}>
          <label>Additional Project Phase Classifications (Optional)</label>
          <span className="pane-hint">Optionally select additional project phase classifications to complement ISO 22263.</span>
        </div>

        {/* AIA Stages (optional) */}
        <MultiSelectCheckbox
          label="AIA B101 Project Stages (US)"
          options={PROJECT_STAGES_AIA}
          selected={Array.isArray(headerData.projectStagesAia) ? headerData.projectStagesAia : []}
          onChange={(items) => handleHeaderFieldChange('projectStagesAia', items)}
          allowCustom={false}
        />

        {/* RIBA Stages (optional) */}
        <MultiSelectCheckbox
          label="RIBA Plan of Work Stages (UK)"
          options={PROJECT_STAGES_RIBA}
          selected={Array.isArray(headerData.projectStagesRiba) ? headerData.projectStagesRiba : []}
          onChange={(items) => handleHeaderFieldChange('projectStagesRiba', items)}
          allowCustom={false}
        />

        {/* Custom Project Phase Classification */}
        <div className="pane-field" style={{ marginTop: '16px' }}>
          <div className="pane-field-header">
            <label>Custom Project Phase Classification</label>
            <button
              type="button"
              className="pane-add-btn"
              onClick={() => {
                const customPhases = Array.isArray(headerData.customProjectPhases) ? headerData.customProjectPhases : [];
                const newPhase = {
                  id: `custom-phase-${Date.now()}`,
                  classificationName: '',
                  phaseName: ''
                };
                handleHeaderFieldChange('customProjectPhases', [...customPhases, newPhase]);
              }}
              title="Add custom project phase"
            >
              <AddIcon size={12} /> Add
            </button>
          </div>
          <span className="pane-hint">Define your own project phase classifications and phases.</span>
        </div>
        {(Array.isArray(headerData.customProjectPhases) ? headerData.customProjectPhases : []).length > 0 && (
          <div className="custom-phases-list">
            {(headerData.customProjectPhases || []).map((phase, index) => (
              <div key={phase.id || index} className="custom-phase-item">
                <input
                  type="text"
                  value={phase.classificationName || ''}
                  onChange={(e) => {
                    const newPhases = [...headerData.customProjectPhases];
                    newPhases[index] = { ...phase, classificationName: e.target.value };
                    handleHeaderFieldChange('customProjectPhases', newPhases);
                  }}
                  placeholder="Classification Name *"
                  className="pane-input custom-phase-classification-input"
                />
                <input
                  type="text"
                  value={phase.phaseName || ''}
                  onChange={(e) => {
                    const newPhases = [...headerData.customProjectPhases];
                    newPhases[index] = { ...phase, phaseName: e.target.value };
                    handleHeaderFieldChange('customProjectPhases', newPhases);
                  }}
                  placeholder="Phase Name *"
                  className="pane-input custom-phase-name-input"
                />
                <button
                  type="button"
                  className="custom-phase-remove-btn"
                  onClick={() => {
                    const newPhases = headerData.customProjectPhases.filter((_, i) => i !== index);
                    handleHeaderFieldChange('customProjectPhases', newPhases);
                  }}
                  title="Remove custom phase"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );

  // =========================================================================
  // EXCHANGE REQUIREMENTS - Hierarchical Tree View
  // =========================================================================

  // State for expanded/collapsed tree nodes
  const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));

  const toggleNode = useCallback((nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // Find selected ER's location in hierarchy for move/indent/outdent operations
  const selectedErLocation = useMemo(() => {
    if (!selectedErId || !erHierarchy || erHierarchy.length === 0) return null;

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

    return findLocation(erHierarchy, selectedErId);
  }, [selectedErId, erHierarchy]);

  // Determine if selected ER can be moved/indented/outdented
  const canMoveUp = selectedErLocation && selectedErLocation.index > 0;
  const canMoveDown = selectedErLocation && selectedErLocation.index < selectedErLocation.siblings.length - 1;
  const canIndent = selectedErLocation && selectedErLocation.index > 0; // Has sibling above to become parent
  const canOutdent = selectedErLocation && selectedErLocation.parent !== null; // Has parent to outdent from

  // Expand all nodes
  const handleExpandAll = useCallback(() => {
    const collectAllNodeIds = (hierarchy, parentNodeId = null, isTopLevel = true) => {
      const ids = [];
      hierarchy.forEach(er => {
        const nodeId = isTopLevel ? 'root' : `${parentNodeId}-${er.id}`;
        ids.push(nodeId);
        if (er.subERs?.length > 0) {
          ids.push(...collectAllNodeIds(er.subERs, nodeId, false));
        }
      });
      return ids;
    };
    const allIds = collectAllNodeIds(erHierarchy);
    setExpandedNodes(new Set(allIds));
  }, [erHierarchy]);

  // Collapse all nodes
  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set(['root'])); // Keep root expanded
  }, []);

  const renderExchangeReq = () => {
    // Use given root ER name from import, or generate from shortTitle
    const rootERName = headerData.rootERName
      ? headerData.rootERName
      : (headerData.shortTitle
          ? `er_${headerData.shortTitle.replace(/\s+/g, '_')}`
          : 'er_IDM_Specification');

    // =========================================================================
    // ER-FIRST MODE: Render from erHierarchy directly
    // =========================================================================
    if (isErFirstMode) {
      // Count total ERs recursively
      const countERs = (ers) => {
        let count = 0;
        (ers || []).forEach(er => {
          count += 1;
          if (er.subERs && er.subERs.length > 0) {
            count += countERs(er.subERs);
          }
        });
        return count;
      };
      const totalERs = countERs(erHierarchy);

      // Only ONE top-level ER is allowed (enforced by design)
      const rootER = erHierarchy.length > 0 ? erHierarchy[0] : null;

      return (
        <div className="content-pane-body">
          <Section
            title="Exchange Requirement Hierarchy"
            defaultExpanded={true}
          >
            {/* ER Hierarchy Toolbar */}
            <div className="er-hierarchy-toolbar">
              <button
                className="er-hierarchy-btn"
                onClick={onAddER}
                title="Add new ER under selected ER"
              >
                <AddIcon size={14} />
              </button>
              <button
                className="er-hierarchy-btn"
                onClick={() => selectedErId && onDeleteER?.(selectedErId)}
                disabled={!selectedErId || !selectedErLocation?.parent}
                title="Delete selected ER"
              >
                <DeleteIcon size={14} />
              </button>
              <div className="er-hierarchy-divider" />
              <button
                className="er-hierarchy-btn"
                onClick={() => erImportFileRef.current?.click()}
                title="Import ER from erXML file"
              >
                <ImportIcon size={14} />
              </button>
              <input
                ref={erImportFileRef}
                type="file"
                accept=".xml,.erxml,.json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && onImportER) onImportER(file);
                  e.target.value = '';
                }}
              />
              <button
                className="er-hierarchy-btn"
                onClick={() => selectedErId && onExportER?.(selectedErId)}
                disabled={!selectedErId}
                title="Export selected ER to erXML file"
              >
                <SaveExportIcon size={14} />
              </button>
              <div className="er-hierarchy-divider" />
              <button
                className="er-hierarchy-btn"
                onClick={() => selectedErId && onMoveUp?.(selectedErId)}
                disabled={!canMoveUp}
                title="Move ER up"
              >
                ↑
              </button>
              <button
                className="er-hierarchy-btn"
                onClick={() => selectedErId && onMoveDown?.(selectedErId)}
                disabled={!canMoveDown}
                title="Move ER down"
              >
                ↓
              </button>
              <div className="er-hierarchy-divider" />
              <button
                className="er-hierarchy-btn"
                onClick={() => selectedErId && onIndent?.(selectedErId)}
                disabled={!canIndent}
                title="Indent ER (make sub-ER of above)"
              >
                &gt;
              </button>
              <button
                className="er-hierarchy-btn"
                onClick={() => selectedErId && onOutdent?.(selectedErId)}
                disabled={!canOutdent}
                title="Outdent ER (promote to parent level)"
              >
                &lt;
              </button>
              <div className="er-hierarchy-divider" />
              <button
                className="er-hierarchy-btn"
                onClick={handleExpandAll}
                title="Expand all"
              >
                <ExpandAllIcon size={14} />
              </button>
              <button
                className="er-hierarchy-btn"
                onClick={handleCollapseAll}
                title="Collapse all"
              >
                <CollapseAllIcon size={14} />
              </button>
            </div>

            <div className="er-tree-root">
              {/* Single top-level ER (only ONE allowed by design) */}
              {rootER && (
                <ERHierarchyItem
                  er={rootER}
                  level={0}
                  isRoot={true}
                  expandedNodes={expandedNodes}
                  onToggleNode={toggleNode}
                  onSelectER={onSelectER}
                  itemRefs={erItemRefs}
                  selectedErId={selectedErId}
                />
              )}

              {/* No ERs - show empty state */}
              {!rootER && (
                <div className="pane-empty">
                  <p>No Exchange Requirements</p>
                  <span>Click "+ER" to add an Exchange Requirement, or add Data Objects in the BPMN diagram</span>
                </div>
              )}
            </div>
          </Section>

          <div className="er-stats">
            <span>Total ERs: {totalERs}</span>
          </div>
        </div>
      );
    }

    // =========================================================================
    // LEGACY MODE: Build tree from erDataMap
    // =========================================================================

    // Get data objects from BPMN diagram
    const filteredDataObjects = dataObjects.filter(d =>
      d.type === 'bpmn:DataObjectReference' || d.type === 'bpmn:DataStoreReference' || d.type === 'bpmn:DataObject'
    );

    // Build a set of BPMN data object IDs for quick lookup
    const bpmnDataObjectIds = new Set(filteredDataObjects.map(d => d.id));

    // Build list of ERs - primary source is erDataMap
    // IMPORTANT: Deduplicate by ER guid/id to avoid showing same ER multiple times
    // (Multiple data objects can reference the same ER)
    const allERs = [];
    const processedDataObjectIds = new Set();
    const processedErGuids = new Set(); // Track unique ERs by guid to prevent duplicates

    // First, add all ERs from erDataMap (these are defined ERs)
    Object.entries(erDataMap).forEach(([key, er]) => {
      if (!er) return;

      // Get unique identifier for this ER (prefer guid, fallback to id or name)
      const erUniqueId = er.guid || er.id || er.name;

      // Skip if we've already added this ER (deduplicate by ER identifier)
      if (erUniqueId && processedErGuids.has(erUniqueId)) {
        // Still track the data object ID as processed
        processedDataObjectIds.add(key);
        return;
      }

      // Skip internal keys like 'unlinked_' prefix
      const isUnlinkedKey = key.startsWith('unlinked_');
      const displayKey = isUnlinkedKey ? key.replace('unlinked_', '') : key;

      // Check if this ER is linked to a BPMN data object
      const isLinkedToBpmn = bpmnDataObjectIds.has(key);

      // Get the data object name from BPMN if linked
      const bpmnDataObject = filteredDataObjects.find(d => d.id === key);

      allERs.push({
        dataObjectId: key,
        dataObjectName: er.name || bpmnDataObject?.name || displayKey,
        er,
        isLinked: isLinkedToBpmn && !isUnlinkedKey
      });

      processedDataObjectIds.add(key);
      if (erUniqueId) {
        processedErGuids.add(erUniqueId);
      }
    });

    // Then, add any BPMN data objects that don't have ERs defined yet
    filteredDataObjects.forEach(dataObject => {
      if (!processedDataObjectIds.has(dataObject.id)) {
        allERs.push({
          dataObjectId: dataObject.id,
          dataObjectName: dataObject.name || dataObject.id,
          er: null,
          isLinked: true
        });
        processedDataObjectIds.add(dataObject.id);
      }
    });

    // Separate into linked and unassociated for display
    const linkedERs = allERs.filter(item => item.isLinked || item.er === null);
    const unassociatedERs = allERs.filter(item => !item.isLinked && item.er !== null);

    // Count statistics
    const totalLinked = linkedERs.length;
    const definedLinked = linkedERs.filter(item => item.er).length;
    const totalUnassociated = unassociatedERs.length;

    // Recursive component to render ER tree item
    const ERTreeItem = ({ item, level = 0, parentId = 'root' }) => {
      const { dataObjectId, dataObjectName, er, isLinked } = item;
      const hasER = !!er;
      const hasName = er?.name && er.name.trim();
      const hasUnits = er?.informationUnits && er.informationUnits.length > 0;
      const hasSubERs = er?.subErs && er.subErs.length > 0;
      const isComplete = hasER && hasName && hasUnits;
      const nodeId = `${parentId}-${dataObjectId}`;
      const isExpanded = expandedNodes.has(nodeId);

      return (
        <div className="er-tree-item-wrapper">
          <div
            className={`er-tree-item ${!hasER ? 'undefined' : ''} ${hasER && !isComplete ? 'incomplete' : ''} ${!isLinked ? 'unassociated' : ''}`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => onSelectER?.(dataObjectId)}
          >
            {hasSubERs ? (
              <button
                className="er-tree-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(nodeId);
                }}
              >
                {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
              </button>
            ) : (
              <span className="er-tree-spacer" />
            )}
            <div className="er-tree-item-icon">
              <ExchangeReqIcon size={14} />
            </div>
            <div className="er-tree-item-content">
              <div className="er-tree-item-name">
                {hasName ? er.name : dataObjectName}
              </div>
              <div className="er-tree-item-meta">
                {!isLinked && (
                  <span className="er-unassociated-badge">Unassociated</span>
                )}
                {hasER ? (
                  <>
                    <span className="er-unit-count">
                      {(er.informationUnits || []).length} units
                    </span>
                    {hasSubERs && (
                      <span className="er-sub-count">{er.subErs.length} sub-ERs</span>
                    )}
                    {!isComplete && (
                      <span className="er-incomplete-badge">Incomplete</span>
                    )}
                  </>
                ) : (
                  <span className="er-undefined-badge">Not defined</span>
                )}
              </div>
            </div>
          </div>
          {hasSubERs && isExpanded && (
            <div className="er-tree-children">
              {er.subErs.map(subEr => {
                // Find the full ER data for this sub-ER
                const subErData = erDataMap[subEr.id] || { name: subEr.name, id: subEr.id };
                return (
                  <ERTreeItem
                    key={subEr.id}
                    item={{
                      dataObjectId: subEr.id,
                      dataObjectName: subEr.name || subEr.id,
                      er: subErData,
                      isLinked: true
                    }}
                    level={level + 1}
                    parentId={nodeId}
                  />
                );
              })}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="content-pane-body">
        {/* Root ER Section */}
        <Section
          title="Exchange Requirement Hierarchy"
          defaultExpanded={true}
        >
          <div className="er-tree-root">
            <div
              className="er-tree-item root-er"
              onClick={() => toggleNode('root')}
            >
              <button className="er-tree-toggle">
                {expandedNodes.has('root') ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
              </button>
              <div className="er-tree-item-icon root">
                <ExchangeReqIcon size={16} />
              </div>
              <div className="er-tree-item-content">
                <div className="er-tree-item-name root-name">{rootERName}</div>
                <div className="er-tree-item-meta">
                  <span className="er-sub-count">{totalLinked + totalUnassociated} ERs total</span>
                </div>
              </div>
            </div>

            {expandedNodes.has('root') && (
              <div className="er-tree-children">
                {/* Linked ERs from BPMN */}
                {linkedERs.map(item => (
                  <ERTreeItem key={item.dataObjectId} item={item} level={1} />
                ))}

                {/* Unassociated ERs Section */}
                {unassociatedERs.length > 0 && (
                  <div className="er-tree-unassociated-section">
                    <div
                      className="er-tree-item section-header"
                      style={{ paddingLeft: '24px' }}
                      onClick={() => toggleNode('unassociated')}
                    >
                      <button className="er-tree-toggle">
                        {expandedNodes.has('unassociated') ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
                      </button>
                      <span className="section-label">Unassociated ERs ({totalUnassociated})</span>
                    </div>
                    {expandedNodes.has('unassociated') && (
                      <div className="er-tree-children">
                        {unassociatedERs.map(item => (
                          <ERTreeItem key={item.dataObjectId} item={item} level={2} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {linkedERs.length === 0 && unassociatedERs.length === 0 && (
                  <div className="pane-empty" style={{ marginLeft: '24px' }}>
                    <p>No Exchange Requirements</p>
                    <span>Add Data Objects in the BPMN diagram and double-click to define ERs</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* Statistics */}
        <div className="er-stats">
          <span>BPMN Data Objects: {totalLinked}</span>
          <span>Defined: {definedLinked}/{totalLinked}</span>
          {totalUnassociated > 0 && <span>Unassociated: {totalUnassociated}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="content-pane">
      {renderHeader()}
      {type === 'specification' && renderIdmHeader()}
      {type === 'useCase' && renderUseCase()}
      {type === 'exchangeReq' && renderExchangeReq()}
    </div>
  );
};

export default React.memo(ContentPane);
