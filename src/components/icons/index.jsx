import React from 'react';

// Base icon wrapper with consistent styling
const Icon = ({ children, size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`icon ${className}`}
    {...props}
  >
    {children}
  </svg>
);

// ============================================================================
// LEFT SIDEBAR ICONS
// ============================================================================

// New Project - Document with plus sign
export const NewProjectIcon = (props) => (
  <Icon {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="12" x2="12" y2="18" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </Icon>
);

// Open Project - Folder with upload arrow
export const OpenIcon = (props) => (
  <Icon {...props}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <polyline points="9 14 12 11 15 14" />
  </Icon>
);

// Specification - ID Card style with photo placeholder and text lines
// Represents IDM metadata (Spec IDs, Summary, Authoring)
export const SpecificationIcon = (props) => (
  <Icon {...props}>
    {/* Card body with rounded corners */}
    <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
    {/* Photo/image placeholder (small square in top-left) */}
    <rect x="4" y="6" width="6" height="5" rx="1" />
    {/* Text lines on right of photo */}
    <line x1="12" y1="7" x2="20" y2="7" />
    <line x1="12" y1="10" x2="18" y2="10" />
    {/* Text lines below */}
    <line x1="4" y1="14" x2="20" y2="14" />
    <line x1="4" y1="17" x2="16" y2="17" />
  </Icon>
);

// Use Case - Two persons with bidirectional arrows
// Represents actor interaction/collaboration
export const UseCaseIcon = (props) => (
  <Icon {...props}>
    {/* Left person - head */}
    <circle cx="6" cy="6" r="2.5" />
    {/* Left person - body */}
    <path d="M6 8.5c-2.5 0-4 1.5-4 4v1.5h8v-1.5c0-2.5-1.5-4-4-4z" />
    {/* Right person - head */}
    <circle cx="18" cy="6" r="2.5" />
    {/* Right person - body */}
    <path d="M18 8.5c-2.5 0-4 1.5-4 4v1.5h8v-1.5c0-2.5-1.5-4-4-4z" />
    {/* Bidirectional arrows */}
    <line x1="9" y1="18" x2="15" y2="18" />
    <polyline points="13 16 15 18 13 20" />
    <line x1="15" y1="21" x2="9" y2="21" />
    <polyline points="11 19 9 21 11 23" />
  </Icon>
);

// Exchange Requirements - Data object with arrow to checklist
// Represents ER specification with requirements checklist
export const ExchangeReqIcon = (props) => (
  <Icon {...props}>
    {/* Left: Data object (rounded rectangle like BPMN) */}
    <rect x="2" y="8" width="6" height="8" rx="1" />
    {/* Arrow from data object to checklist */}
    <line x1="8" y1="12" x2="12" y2="12" />
    <polyline points="10 10 12 12 10 14" />
    {/* Right: Checklist document with checkmark */}
    <rect x="12" y="4" width="10" height="16" rx="1" />
    {/* Checkmark circle at top */}
    <circle cx="17" cy="7" r="2" />
    <polyline points="15.5 7 16.5 8 18.5 6" />
    {/* List items with bullets */}
    <circle cx="14.5" cy="12" r="0.5" fill="currentColor" />
    <line x1="16" y1="12" x2="20" y2="12" />
    <circle cx="14.5" cy="15" r="0.5" fill="currentColor" />
    <line x1="16" y1="15" x2="20" y2="15" />
    <circle cx="14.5" cy="18" r="0.5" fill="currentColor" />
    <line x1="16" y1="18" x2="19" y2="18" />
  </Icon>
);

// Validate - Checkmark in circle
export const ValidateIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="8 12 11 15 16 9" />
  </Icon>
);

// Save & Export - Download arrow with document
export const SaveExportIcon = (props) => (
  <Icon {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </Icon>
);

// ============================================================================
// THEME ICONS
// ============================================================================

export const SunIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
    <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
    <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
  </Icon>
);

export const MoonIcon = (props) => (
  <Icon {...props}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Icon>
);

// ============================================================================
// BPMN EDITOR TOOLBAR ICONS
// ============================================================================

export const ZoomInIcon = (props) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </Icon>
);

export const ZoomOutIcon = (props) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </Icon>
);

export const ZoomFitIcon = (props) => (
  <Icon {...props}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    <rect x="8" y="8" width="8" height="8" rx="1" />
  </Icon>
);

export const PanIcon = (props) => (
  <Icon {...props}>
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </Icon>
);

export const UndoIcon = (props) => (
  <Icon {...props}>
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </Icon>
);

export const RedoIcon = (props) => (
  <Icon {...props}>
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </Icon>
);

// Export icons
export const ExportSVGIcon = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 14.5l2.5 2.5 2.5-2.5" />
    <path d="M12 11.5l2.5 2.5 2.5-2.5" />
    <circle cx="8" cy="9" r="1.5" />
  </Icon>
);

export const ExportBPMNIcon = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    {/* BPMN elements: start event, task, end event */}
    <circle cx="7" cy="12" r="2" />
    <rect x="11" y="10" width="4" height="4" rx="0.5" />
    <circle cx="19" cy="12" r="2" />
    <circle cx="19" cy="12" r="1" />
    {/* Flow arrows */}
    <line x1="9" y1="12" x2="11" y2="12" />
    <line x1="15" y1="12" x2="17" y2="12" />
  </Icon>
);

export const ExportPNGIcon = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </Icon>
);

// Auto Layout - Grid/arrange icon
export const AutoLayoutIcon = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <line x1="10" y1="6.5" x2="14" y2="6.5" />
    <line x1="6.5" y1="10" x2="6.5" y2="14" />
    <line x1="17.5" y1="10" x2="17.5" y2="14" />
  </Icon>
);

// ============================================================================
// ER EDITOR ICONS
// ============================================================================

// Data Object - BPMN data object shape (folded corner)
export const DataObjectIcon = (props) => (
  <Icon {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
    <path d="M14 2v6h6" />
  </Icon>
);

// Information Unit - List/properties icon
export const InfoUnitIcon = (props) => (
  <Icon {...props}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <line x1="8" y1="9" x2="16" y2="9" />
    <line x1="8" y1="13" x2="14" y2="13" />
    <line x1="8" y1="17" x2="12" y2="17" />
  </Icon>
);

// Add - Plus icon
export const AddIcon = (props) => (
  <Icon {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Icon>
);

// Add Circle - Plus in circle
export const AddCircleIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </Icon>
);

// Save - Floppy disk icon
export const SaveIcon = (props) => (
  <Icon {...props}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </Icon>
);

// Delete - Trash icon
export const DeleteIcon = (props) => (
  <Icon {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </Icon>
);

// Library - Stacked books/documents
export const LibraryIcon = (props) => (
  <Icon {...props}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <line x1="8" y1="7" x2="16" y2="7" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </Icon>
);

// Import - Upload arrow
export const ImportIcon = (props) => (
  <Icon {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </Icon>
);

// Search - Magnifying glass
export const SearchIcon = (props) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Icon>
);

// Link - Chain link for external mapping
export const LinkIcon = (props) => (
  <Icon {...props}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </Icon>
);

// Edit - Pencil icon
export const EditIcon = (props) => (
  <Icon {...props}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </Icon>
);

// Copy - Duplicate icon
export const CopyIcon = (props) => (
  <Icon {...props}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icon>
);

// ============================================================================
// UTILITY ICONS
// ============================================================================

export const CloseIcon = (props) => (
  <Icon {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Icon>
);

export const ChevronRightIcon = (props) => (
  <Icon {...props}>
    <polyline points="9 18 15 12 9 6" />
  </Icon>
);

export const ChevronDownIcon = (props) => (
  <Icon {...props}>
    <polyline points="6 9 12 15 18 9" />
  </Icon>
);

export const ChevronUpIcon = (props) => (
  <Icon {...props}>
    <polyline points="18 15 12 9 6 15" />
  </Icon>
);

export const ChevronLeftIcon = (props) => (
  <Icon {...props}>
    <polyline points="15 18 9 12 15 6" />
  </Icon>
);

export const MoreIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="19" cy="12" r="1" fill="currentColor" />
    <circle cx="5" cy="12" r="1" fill="currentColor" />
  </Icon>
);

export const SettingsIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Icon>
);

// Warning/Alert icon
export const AlertIcon = (props) => (
  <Icon {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <circle cx="12" cy="17" r="0.5" fill="currentColor" />
  </Icon>
);

// Check/Success icon
export const CheckIcon = (props) => (
  <Icon {...props}>
    <polyline points="20 6 9 17 4 12" />
  </Icon>
);

// Help icon - Question mark in circle
export const HelpIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <circle cx="12" cy="17" r="0.5" fill="currentColor" />
  </Icon>
);

export default {
  // Sidebar
  NewProjectIcon,
  OpenIcon,
  SpecificationIcon,
  UseCaseIcon,
  ExchangeReqIcon,
  ValidateIcon,
  SaveExportIcon,
  // Theme
  SunIcon,
  MoonIcon,
  // BPMN toolbar
  ZoomInIcon,
  ZoomOutIcon,
  ZoomFitIcon,
  PanIcon,
  UndoIcon,
  RedoIcon,
  ExportSVGIcon,
  ExportBPMNIcon,
  ExportPNGIcon,
  AutoLayoutIcon,
  // ER Editor
  DataObjectIcon,
  InfoUnitIcon,
  AddIcon,
  AddCircleIcon,
  SaveIcon,
  DeleteIcon,
  LibraryIcon,
  ImportIcon,
  SearchIcon,
  LinkIcon,
  EditIcon,
  CopyIcon,
  // Utility
  CloseIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  MoreIcon,
  SettingsIcon,
  AlertIcon,
  CheckIcon,
  HelpIcon
};
