IDMxPPM neo-Seoul System Architecture
This is a desktop application built with Electron for creating and managing Information Delivery Manuals (IDM) compliant with ISO 29481-3. The architecture follows a two-process model separating the UI from system-level operations.

Electron Renderer Process (Chromium / React UI)
The frontend runs in Chromium's renderer process, providing a modern React-based interface.
React Application (Frontend UI)
ComponentDescriptionVerticalMenuBarNavigation sidebar providing access to different sections of the application (projects, settings, export options). Handles routing and workspace switching.SpecNameBarDisplays and allows editing of the current specification's metadata—name, version, author, and status. Acts as a header for the active document.ContentPaneMain content area rendering basic project information and use case lists. Serves as the container for viewing and managing IDM use cases and their properties.App.jsx (Global State/Store)Central state management hub using React Context or a state library. Coordinates data flow between all components, manages application-wide settings, and handles undo/redo functionality.BPMNEditorVisual diagram editor for creating process maps. Contains the bpmn-js Library from bpmn.io—an open-source toolkit for rendering and editing BPMN 2.0 diagrams. Supports drag-and-drop modeling, element properties editing, and diagram validation.ValidationPanelDisplays real-time validation results and compliance checks. Shows errors, warnings, and suggestions based on ISO rules, helping users ensure their specifications meet standards.ERPanel (Exchange Requirement Editor)Interface for defining and editing Exchange Requirements—the data specifications that describe what information must be exchanged at each process step.

Logic & Utility Modules (src/utils/)
Backend logic separated from UI components for maintainability and testing.
ModuleDescriptionvalidation.js (ISO Rules Engine)Implements validation logic based on ISO 29481 standards. Checks completeness of exchange requirements, verifies BPMN diagram consistency, validates data types, and ensures proper linking between process maps and data definitions.idmXmlGenerator.jsHandles serialization and parsing of IDM documents. Generates ISO 29481-3 compliant XML files, embeds BPMN diagrams within the IDM structure, and parses existing .idmxml files for editing. Manages namespace declarations and schema validation.schemaSearch.js (External Mapping Logic)Interfaces with external data dictionaries to map exchange requirements to standardized property definitions. Queries the bSDD API, caches results, and helps users link their requirements to IFC properties and classification systems.schemaData.js (Local Static Schemas)Contains bundled reference data including UniFormat classification codes, common property sets, and predefined templates. Provides offline access to frequently used schemas without requiring API calls.

External APIs
ServiceDescriptionbSDD API (buildingSMART Data Dictionary)Cloud-based API providing access to standardized construction industry definitions. Returns property definitions, classification systems (IFC, UniFormat, OmniClass), and data type specifications. Enables semantic interoperability by linking local requirements to globally recognized standards.

Electron Main Process (Node.js Runtime)
The backend process handles system-level operations that require Node.js capabilities.
ModuleDescriptionNative Window ManagementControls application windows—creation, resizing, minimizing, and multi-window support. Manages system tray integration and window state persistence across sessions.Application LifecycleHandles startup initialization, graceful shutdown, auto-updates, and crash reporting. Manages single-instance locking to prevent duplicate processes.File I/O Handlers (fs)Manages all file system operations using Node's fs module. Handles reading, writing, and watching project files. Implements file dialogs for open/save operations and manages recent files list.

Local OS File System
The application works with four file formats:
FormatDescription.json (Project)Application-specific project files storing workspace settings, UI state, and file references. Not standardized but enables quick save/load of work sessions..idmxml (ISO 29481-3)The primary output format—standardized XML following ISO 29481-3 for Information Delivery Manuals. Contains process maps, exchange requirements, and metadata in an interoperable format..bpmn (Diagram)Native BPMN 2.0 XML files for process diagrams. Can be imported/exported independently for use with other BPMN tools..erxml (Exchange Requirement)Standalone exchange requirement definitions that can be reused across multiple IDM projects or shared between teams.

Data Flow Summary

Users interact with React components in the Renderer Process
App.jsx coordinates state changes and triggers utility functions
Utility modules process data, validate content, and query external APIs
IPC (Inter-Process Communication) bridges the renderer and main processes
Main Process handles file I/O operations with the local file system
Files are persisted in standardized formats for interoperability
