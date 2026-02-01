import React, { useState } from 'react';
import './ValidationPanel.css';

/**
 * Validation Panel Component
 * Displays validation results with navigation
 */
const ValidationPanel = ({
  results,
  onNavigate,
  onClose
}) => {
  const [expandedCategories, setExpandedCategories] = useState({
    header: true,
    er: true,
    informationUnit: true,
    diagram: true
  });

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  if (!results) return null;

  const { errors, isValid, summary } = results;

  // Group errors by category
  const groupedErrors = {
    header: errors.filter(e => e.category === 'header'),
    diagram: errors.filter(e => e.category === 'diagram'),
    er: errors.filter(e => e.category === 'er'),
    informationUnit: errors.filter(e => e.category === 'informationUnit')
  };

  const categoryLabels = {
    header: 'Header / Metadata',
    diagram: 'Process Map',
    er: 'Exchange Requirements',
    informationUnit: 'Information Units'
  };

  const categoryIcons = {
    header: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
    diagram: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="9" y1="21" x2="9" y2="9"/>
      </svg>
    ),
    er: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>
    ),
    informationUnit: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    )
  };

  return (
    <div className="validation-panel">
      <div className="validation-header">
        <div className="validation-title">
          <span className={`validation-icon ${isValid ? 'valid' : 'invalid'}`}>
            {isValid ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            )}
          </span>
          <div>
            <h3>Validation Results</h3>
            <p className="validation-summary">
              {isValid ? (
                summary.warnings > 0
                  ? `Valid with ${summary.warnings} warning(s)`
                  : 'All checks passed'
              ) : (
                `${summary.errors} error(s), ${summary.warnings} warning(s)`
              )}
            </p>
          </div>
        </div>
        <button className="validation-close-btn" onClick={onClose} title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="validation-content">
        {/* Summary Stats */}
        <div className="validation-stats">
          <div className={`stat-item ${summary.errors > 0 ? 'has-errors' : ''}`}>
            <span className="stat-value">{summary.errors}</span>
            <span className="stat-label">Errors</span>
          </div>
          <div className={`stat-item ${summary.warnings > 0 ? 'has-warnings' : ''}`}>
            <span className="stat-value">{summary.warnings}</span>
            <span className="stat-label">Warnings</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{summary.total}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>

        {/* Grouped Errors */}
        <div className="validation-groups">
          {Object.entries(groupedErrors).map(([category, categoryErrors]) => {
            if (categoryErrors.length === 0) return null;

            const isExpanded = expandedCategories[category];
            const errorCount = categoryErrors.filter(e => e.severity === 'error').length;
            const warningCount = categoryErrors.filter(e => e.severity === 'warning').length;

            return (
              <div key={category} className="validation-group">
                <div
                  className="validation-group-header"
                  onClick={() => toggleCategory(category)}
                >
                  <span className={`group-chevron ${isExpanded ? 'expanded' : ''}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </span>
                  <span className="group-icon">{categoryIcons[category]}</span>
                  <span className="group-label">{categoryLabels[category]}</span>
                  <span className="group-counts">
                    {errorCount > 0 && (
                      <span className="count-badge error">{errorCount}</span>
                    )}
                    {warningCount > 0 && (
                      <span className="count-badge warning">{warningCount}</span>
                    )}
                  </span>
                </div>

                {isExpanded && (
                  <div className="validation-group-items">
                    {categoryErrors.map((error, index) => (
                      <div
                        key={`${error.path}-${index}`}
                        className={`validation-item ${error.severity}`}
                        onClick={() => onNavigate && onNavigate(error.path)}
                      >
                        <span className="item-icon">
                          {error.severity === 'error' ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="15" y1="9" x2="9" y2="15"/>
                              <line x1="9" y1="9" x2="15" y2="15"/>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                              <line x1="12" y1="9" x2="12" y2="13"/>
                              <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                          )}
                        </span>
                        <div className="item-content">
                          <span className="item-message">{error.message}</span>
                          <span className="item-path">{error.path}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {errors.length === 0 && (
            <div className="validation-empty">
              <span className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </span>
              <p>All validation checks passed!</p>
              <span className="empty-hint">Your IDM specification is ready for export.</span>
            </div>
          )}
        </div>
      </div>

      <div className="validation-footer">
        <span className="validation-iso-ref">ISO 29481-3 Compliance Check</span>
      </div>
    </div>
  );
};

export default ValidationPanel;
