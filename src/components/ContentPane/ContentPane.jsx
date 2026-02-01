import React, { useState, useCallback, useMemo } from 'react';
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
  SettingsIcon
} from '../icons';
import './ContentPane.css';

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
              <div key={index} className="pane-revision-entry">
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
 * Use Entry Component (Verb + Noun format per ISO 29481-3)
 */
const UseEntry = ({ uses = [], onChange }) => {
  const [newVerb, setNewVerb] = useState('');
  const [newNoun, setNewNoun] = useState('');

  const handleAdd = () => {
    if (newVerb.trim() && newNoun.trim()) {
      onChange([...uses, { verb: newVerb.trim(), noun: newNoun.trim() }]);
      setNewVerb('');
      setNewNoun('');
    }
  };

  const handleRemove = (index) => {
    onChange(uses.filter((_, i) => i !== index));
  };

  return (
    <div className="use-entry">
      <label>Use (Verb + Noun) <span className="required">*</span></label>
      <div className="use-input-row">
        <input
          type="text"
          value={newVerb}
          onChange={(e) => setNewVerb(e.target.value)}
          placeholder="Verb (e.g., Coordinate)"
          className="pane-input use-verb"
        />
        <input
          type="text"
          value={newNoun}
          onChange={(e) => setNewNoun(e.target.value)}
          placeholder="Noun (e.g., Design Model)"
          className="pane-input use-noun"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          type="button"
          className="pane-add-btn-small"
          onClick={handleAdd}
          disabled={!newVerb.trim() || !newNoun.trim()}
        >
          <AddIcon size={12} />
        </button>
      </div>
      {uses.length > 0 && (
        <div className="use-list">
          {uses.map((use, index) => (
            <div key={index} className="use-tag">
              <span className="use-verb-text">{use.verb}</span>
              <span className="use-noun-text">{use.noun}</span>
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
              <img src={figure.data} alt={figure.caption || figure.name} />
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
                <img src={figure.data} alt={figure.caption || figure.name} />
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

// Regional Applicability
const REGIONS = [
  { value: 'international', label: 'International' },
  { value: 'europe', label: 'Europe' },
  { value: 'north-america', label: 'North America' },
  { value: 'asia-pacific', label: 'Asia-Pacific' },
  { value: 'middle-east', label: 'Middle East' },
  { value: 'africa', label: 'Africa' },
  { value: 'south-america', label: 'South America' }
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
  dataObjects = [],
  onHeaderChange,
  onSelectER,
  onClose
}) => {
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

  if (!type) return null;

  const handleHeaderFieldChange = (field, value) => {
    onHeaderChange?.({
      ...headerData,
      [field]: value
    });
  };

  const handleOptionalFieldsChange = (category, fields) => {
    setVisibleOptionalFields(prev => ({
      ...prev,
      [category]: fields
    }));
  };

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
          onChange={(uses) => handleHeaderFieldChange('uses', uses)}
        />
        <span className="pane-hint pane-hint-examples">Examples include Author Design, Review Design, Analyze Structural Performance, etc. See <a href="https://bim.psu.edu/uses/" target="_blank" rel="noopener noreferrer">https://bim.psu.edu/uses/</a> for more examples.</span>

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

        <MultiSelectCheckbox
          label={<>Target Regions <span className="required">*</span></>}
          options={REGIONS}
          selected={Array.isArray(headerData.regions) ? headerData.regions : (headerData.region ? [headerData.region] : ['international'])}
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

      {/* ACTOR ROLES Section */}
      <Section title="Actor Roles" defaultExpanded={true}>
        <div className="pane-field">
          <div className="pane-field-header">
            <label>Actors</label>
            <button
              type="button"
              className="pane-add-btn"
              onClick={() => {
                const newActors = [...(Array.isArray(headerData.actorsList) ? headerData.actorsList : []), { id: `actor-${Date.now()}`, name: '', role: '' }];
                handleHeaderFieldChange('actorsList', newActors);
              }}
              title="Add a new actor"
            >
              <AddIcon size={12} /> Add Actor
            </button>
          </div>
          <span className="pane-hint">Named swimlanes (Pools/Lanes) from the BPMN diagram are automatically added here as actors. You can also manually add actors.</span>
        </div>
        {(Array.isArray(headerData.actorsList) ? headerData.actorsList : []).length === 0 ? (
          <div className="pane-empty-small">No actors defined. Actors will be auto-populated from BPMN swimlanes.</div>
        ) : (
          <div className="actors-list-items">
            {(Array.isArray(headerData.actorsList) ? headerData.actorsList : []).map((actor, index) => (
              <div key={actor.id || index} className="actor-list-item">
                <input
                  type="text"
                  value={actor.name || ''}
                  onChange={(e) => {
                    const newActors = [...headerData.actorsList];
                    newActors[index] = { ...actor, name: e.target.value };
                    handleHeaderFieldChange('actorsList', newActors);
                  }}
                  placeholder="Actor name (e.g., Architect, Contractor)"
                  className="pane-input actor-name-input"
                />
                <input
                  type="text"
                  value={actor.role || ''}
                  onChange={(e) => {
                    const newActors = [...headerData.actorsList];
                    newActors[index] = { ...actor, role: e.target.value };
                    handleHeaderFieldChange('actorsList', newActors);
                  }}
                  placeholder="Role description"
                  className="pane-input actor-role-input"
                />
                <button
                  type="button"
                  className="actor-remove-btn"
                  onClick={() => {
                    const newActors = headerData.actorsList.filter((_, i) => i !== index);
                    handleHeaderFieldChange('actorsList', newActors);
                  }}
                  title="Remove actor"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
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
      </Section>
    </div>
  );

  // =========================================================================
  // EXCHANGE REQUIREMENTS
  // =========================================================================
  const renderExchangeReq = () => {
    // Use dataObjects from BPMN as the single source of truth
    // Filter to only DataObjectReference types (the visual elements users interact with)
    const filteredDataObjects = dataObjects.filter(d =>
      d.type === 'bpmn:DataObjectReference' || d.type === 'bpmn:DataStoreReference'
    );

    // Build a list of all items with their ER data (if exists)
    // Use a Map to dedupe by data object ID
    const itemsMap = new Map();
    filteredDataObjects.forEach(dataObject => {
      if (!itemsMap.has(dataObject.id)) {
        const er = erDataMap[dataObject.id];
        itemsMap.set(dataObject.id, {
          dataObjectId: dataObject.id,
          dataObjectName: dataObject.name || dataObject.id,
          er
        });
      }
    });

    const allItems = Array.from(itemsMap.values());
    const definedCount = allItems.filter(item => item.er).length;
    const totalCount = allItems.length;

    return (
      <div className="content-pane-body">
        <Section
          title="Master Exchange Requirements List"
          count={totalCount}
          badge={definedCount < totalCount ? `${definedCount}/${totalCount} defined` : null}
          defaultExpanded={true}
        >
          {totalCount === 0 ? (
            <div className="pane-empty">
              <p>No Data Objects</p>
              <span>Add Data Objects in the BPMN diagram and double-click to define ERs</span>
            </div>
          ) : (
            <div className="er-list">
              {allItems.map(({ dataObjectId, dataObjectName, er }) => {
                const hasER = !!er;
                const hasName = er?.name && er.name.trim();
                const hasUnits = er?.informationUnits && er.informationUnits.length > 0;
                const isComplete = hasER && hasName && hasUnits;
                const isDefined = hasER;

                return (
                  <div
                    key={dataObjectId}
                    className={`er-list-item ${!isDefined ? 'undefined' : ''} ${isDefined && !isComplete ? 'incomplete' : ''}`}
                    onClick={() => onSelectER?.(dataObjectId)}
                    title={!isDefined ? 'Double-click to define this Exchange Requirement' : undefined}
                  >
                    <div className="er-list-item-icon">
                      <ExchangeReqIcon size={14} />
                    </div>
                    <div className="er-list-item-content">
                      <div className="er-list-item-name">
                        {hasName ? er.name : dataObjectName}
                      </div>
                      <div className="er-list-item-meta">
                        {isDefined ? (
                          <>
                            <span className="er-unit-count">
                              {(er.informationUnits || []).length} units
                            </span>
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
                );
              })}
            </div>
          )}
        </Section>
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

export default ContentPane;
