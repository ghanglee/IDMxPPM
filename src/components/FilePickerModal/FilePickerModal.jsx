import React, { useRef } from 'react';
import './FilePickerModal.css';

/**
 * File Picker Modal for Browser Mode
 * Shows individual file format options instead of "Custom Files"
 */
const FilePickerModal = ({ isOpen, onClose, onFileSelected }) => {
  const fileInputRef = useRef(null);
  const selectedFormatRef = useRef(null);

  const fileFormats = [
    {
      id: 'idm',
      name: 'IDMxPPM Project',
      extension: '.idm',
      accept: '.idm,.json',
      description: 'Full project file with all data and ER library'
    },
    {
      id: 'idmxml',
      name: 'idmXML - ISO 29481-3',
      extension: '.xml',
      accept: '.xml',
      description: 'ISO 29481-3 compliant XML file'
    },
    {
      id: 'zip',
      name: 'ZIP Bundle',
      extension: '.zip',
      accept: '.zip,.idmx',
      description: 'Archive with idmXML, BPMN, and images'
    },
    {
      id: 'bpmn',
      name: 'BPMN Diagram',
      extension: '.bpmn',
      accept: '.bpmn',
      description: 'BPMN 2.0 XML process diagram'
    },
    {
      id: 'all',
      name: 'All Supported Formats',
      extension: '.*',
      accept: '.idm,.json,.xml,.zip,.idmx,.bpmn',
      description: 'Show all supported file types'
    }
  ];

  const handleFormatClick = (format) => {
    selectedFormatRef.current = format;
    if (fileInputRef.current) {
      fileInputRef.current.accept = format.accept;
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file, selectedFormatRef.current);
      onClose();
    }
    // Reset for next use
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="file-picker-modal-overlay" onClick={onClose}>
      <div className="file-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="file-picker-header">
          <h2>Open Project</h2>
          <button className="file-picker-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>

        <div className="file-picker-content">
          <p className="file-picker-subtitle">Select a file format to open:</p>

          <div className="file-format-list">
            {fileFormats.map((format) => (
              <button
                key={format.id}
                className="file-format-item"
                onClick={() => handleFormatClick(format)}
              >
                <div className="file-format-icon">
                  {format.id === 'idm' && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                    </svg>
                  )}
                  {format.id === 'idmxml' && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.89 3l1.96 3.4 3.93.56-2.85 2.78.67 3.92L13 12l-3.6 1.89.67-3.92-2.85-2.78 3.93-.56L12.89 3zM12 2L9.5 7 4 7.8l4 3.9-.95 5.5 5.45-2.86L18 17.2l-.95-5.5 4-3.9L15.5 7 12 2z"/>
                      <path d="M5 19h14v2H5z"/>
                    </svg>
                  )}
                  {format.id === 'zip' && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 10h-2v-2h2v2zm0-4h-2V8h2v4z"/>
                    </svg>
                  )}
                  {format.id === 'bpmn' && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3h7zM7 9H4V5h3v4zm10 6h3v4h-3v-4zm0-10h3v4h-3V5z"/>
                    </svg>
                  )}
                  {format.id === 'all' && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2 6H0v5h.01L0 20c0 1.1.9 2 2 2h18v-2H2V6zm20-2h-8l-2-2H6c-1.1 0-1.99.9-1.99 2L4 16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 12H6V4h5.17l2 2H22v10z"/>
                    </svg>
                  )}
                </div>
                <div className="file-format-info">
                  <span className="file-format-name">{format.name}</span>
                  <span className="file-format-ext">{format.extension}</span>
                  <span className="file-format-desc">{format.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default FilePickerModal;
