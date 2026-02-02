import React from 'react';
import './StartupScreen.css';

/**
 * Startup Screen Component
 *
 * Shows when no project is open, giving users three options:
 * 1. Blank Project - Start with an empty canvas
 * 2. Sample Project - Start with a sample IDM specification
 * 3. Open Project - Open an existing project file
 */
const StartupScreen = ({ onNewBlank, onNewSample, onOpen }) => {
  return (
    <div className="startup-screen">
      <div className="startup-content">
        <div className="startup-header">
          <div className="startup-logo">
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </div>
          <h1 className="startup-title">IDMxPPM neo-Seoul</h1>
          <p className="startup-subtitle">Information Delivery Manual Authoring Tool</p>
          <p className="startup-compliance">ISO 29481-1 / ISO 29481-3 Compliant</p>
        </div>

        <div className="startup-options">
          <h2 className="startup-options-title">Start a Project</h2>

          <button className="startup-option" onClick={onNewBlank}>
            <div className="startup-option-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div className="startup-option-text">
              <span className="startup-option-title">Blank Project</span>
              <span className="startup-option-desc">Start with an empty canvas and create your own process map</span>
            </div>
          </button>

          <button className="startup-option" onClick={onNewSample}>
            <div className="startup-option-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="8" y1="10" x2="16" y2="10" />
                <line x1="8" y1="14" x2="14" y2="14" />
                <rect x="8" y="16" width="4" height="3" rx="0.5" />
              </svg>
            </div>
            <div className="startup-option-text">
              <span className="startup-option-title">Sample Project</span>
              <span className="startup-option-desc">Start with a sample IDM specification for design coordination</span>
            </div>
          </button>

          <button className="startup-option" onClick={onOpen}>
            <div className="startup-option-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <path d="M12 11v6" />
                <path d="M9 14l3-3 3 3" />
              </svg>
            </div>
            <div className="startup-option-text">
              <span className="startup-option-title">Open Project</span>
              <span className="startup-option-desc">Open an existing IDM project, idmXML, or BPMN file</span>
            </div>
          </button>
        </div>

        <div className="startup-footer">
          <p>Powered by <a href="http://big.yonsei.ac.kr/" target="_blank" rel="noopener noreferrer">BIG Yonsei</a></p>
        </div>
      </div>
    </div>
  );
};

export default StartupScreen;
