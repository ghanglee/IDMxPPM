import React, { useState } from 'react';
import './HeaderPanel.css';

// ISO 639-1 Language codes (common ones for BIM standards)
const LANGUAGES = [
  { code: 'EN', name: 'English' },
  { code: 'KO', name: 'Korean' },
  { code: 'DE', name: 'German' },
  { code: 'FR', name: 'French' },
  { code: 'ES', name: 'Spanish' },
  { code: 'IT', name: 'Italian' },
  { code: 'JA', name: 'Japanese' },
  { code: 'ZH', name: 'Chinese' },
  { code: 'NL', name: 'Dutch' },
  { code: 'PT', name: 'Portuguese' },
  { code: 'RU', name: 'Russian' },
  { code: 'SV', name: 'Swedish' },
  { code: 'NO', name: 'Norwegian' },
  { code: 'DA', name: 'Danish' },
  { code: 'FI', name: 'Finnish' }
];

// IDM Status values per ISO 29481-1
const STATUS_OPTIONS = [
  { value: 'NP', label: 'NP - New Project', description: 'Initial proposal stage' },
  { value: 'WD', label: 'WD - Working Draft', description: 'Under development' },
  { value: 'PUB', label: 'PUB - Published', description: 'Officially published' },
  { value: 'WDRL', label: 'WDRL - Withdrawn', description: 'No longer active' }
];

/**
 * Header Panel Component
 * IDM Use Case metadata editor per ISO 29481-1
 */
const HeaderPanel = ({
  data,
  onChange,
  onClose,
  validationErrors = []
}) => {
  const [showOptional, setShowOptional] = useState(false);

  // Handle field change
  const handleChange = (field, value) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  // Check if field has validation error
  const hasError = (field) => {
    return validationErrors.some(err => err.field === field);
  };

  // Get error message for field
  const getErrorMessage = (field) => {
    const error = validationErrors.find(err => err.field === field);
    return error?.message || '';
  };

  return (
    <div className="header-panel">
      <div className="header-panel-header">
        <div className="header-panel-title">
          <span className="header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </span>
          <div>
            <h3>IDM Header</h3>
            <p className="header-subtitle">Use Case Metadata (ISO 29481-1)</p>
          </div>
        </div>
        <button className="header-close-btn" onClick={onClose} title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="header-panel-content">
        {/* Required Fields Section */}
        <div className="header-section">
          <div className="header-section-title">
            <span>Required Information</span>
            <span className="required-indicator">* Required</span>
          </div>

          <div className="header-field-row">
            <div className={`header-field header-field-wide ${hasError('title') ? 'has-error' : ''}`}>
              <label>
                IDM Title <span className="required">*</span>
              </label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Design to Construction Exchange"
                className="header-input"
              />
              {hasError('title') && (
                <span className="field-error">{getErrorMessage('title')}</span>
              )}
            </div>
          </div>

          <div className="header-field-row">
            <div className={`header-field ${hasError('author') ? 'has-error' : ''}`}>
              <label>
                Author <span className="required">*</span>
              </label>
              <input
                type="text"
                value={data.author || ''}
                onChange={(e) => handleChange('author', e.target.value)}
                placeholder="e.g., BIG, Yonsei University"
                className="header-input"
              />
              {hasError('author') && (
                <span className="field-error">{getErrorMessage('author')}</span>
              )}
            </div>

            <div className={`header-field ${hasError('version') ? 'has-error' : ''}`}>
              <label>
                Version <span className="required">*</span>
              </label>
              <input
                type="text"
                value={data.version || ''}
                onChange={(e) => handleChange('version', e.target.value)}
                placeholder="e.g., 1.0.0"
                className="header-input"
              />
              {hasError('version') && (
                <span className="field-error">{getErrorMessage('version')}</span>
              )}
            </div>
          </div>

          <div className="header-field-row">
            <div className={`header-field ${hasError('status') ? 'has-error' : ''}`}>
              <label>
                Status <span className="required">*</span>
              </label>
              <select
                value={data.status || 'NP'}
                onChange={(e) => handleChange('status', e.target.value)}
                className="header-select"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                {STATUS_OPTIONS.find(s => s.value === (data.status || 'NP'))?.description}
              </span>
            </div>

            <div className={`header-field ${hasError('language') ? 'has-error' : ''}`}>
              <label>
                Language <span className="required">*</span>
              </label>
              <select
                value={data.language || 'EN'}
                onChange={(e) => handleChange('language', e.target.value)}
                className="header-select"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.code} - {lang.name}
                  </option>
                ))}
              </select>
              {hasError('language') && (
                <span className="field-error">{getErrorMessage('language')}</span>
              )}
            </div>
          </div>
        </div>

        {/* Optional Fields Toggle */}
        <button
          className="header-optional-toggle"
          onClick={() => setShowOptional(!showOptional)}
        >
          <span className={`toggle-chevron ${showOptional ? 'expanded' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <span>Optional Information</span>
          <span className="optional-count">
            {[data.targetPhases, data.summary, data.objectives, data.benefits, data.limitations]
              .filter(Boolean).length} / 5 filled
          </span>
        </button>

        {/* Optional Fields Section */}
        {showOptional && (
          <div className="header-section header-section-optional">
            <div className="header-field">
              <label>Target Phases</label>
              <input
                type="text"
                value={data.targetPhases || ''}
                onChange={(e) => handleChange('targetPhases', e.target.value)}
                placeholder="e.g., Design, Construction, Handover"
                className="header-input"
              />
              <span className="field-hint">Project phases this IDM covers</span>
            </div>

            <div className="header-field">
              <label>Summary</label>
              <textarea
                value={data.summary || ''}
                onChange={(e) => handleChange('summary', e.target.value)}
                placeholder="Brief description of this IDM specification..."
                className="header-textarea"
                rows={2}
              />
            </div>

            <div className="header-field">
              <label>Objectives</label>
              <textarea
                value={data.objectives || ''}
                onChange={(e) => handleChange('objectives', e.target.value)}
                placeholder="Goals and intended outcomes..."
                className="header-textarea"
                rows={2}
              />
            </div>

            <div className="header-field-row">
              <div className="header-field">
                <label>Benefits</label>
                <textarea
                  value={data.benefits || ''}
                  onChange={(e) => handleChange('benefits', e.target.value)}
                  placeholder="Expected benefits..."
                  className="header-textarea"
                  rows={2}
                />
              </div>

              <div className="header-field">
                <label>Limitations</label>
                <textarea
                  value={data.limitations || ''}
                  onChange={(e) => handleChange('limitations', e.target.value)}
                  placeholder="Known limitations..."
                  className="header-textarea"
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="header-panel-footer">
        <span className="header-iso-ref">ISO 29481-1 Use Case Structure</span>
      </div>
    </div>
  );
};

export default HeaderPanel;
