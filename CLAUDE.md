# IDMxPPM neo-Seoul Project Instructions

## Project Overview

**IDMxPPM neo-Seoul** is an Information Delivery Manual (IDM) authoring tool compliant with **ISO 29481-1** (Methodology and format) and **ISO 29481-3** (Data schema - idmXML).

- **IDM** = Information Delivery Manual
- **xPPM** = eXtended Process to Product Modeling

The IDM authoring process begins with **process modeling** (use case specification), then **Exchange Requirements (ERs)** are defined for the specified use-case process.

### Project Goals
1. Develop cross-platform (Mac & Windows) desktop application
2. Greatly improve user-friendliness compared to existing tools
3. Maintain full ISO 29481 compliance
4. Enable rapid "vibe coding" development approach

## Technical Architecture

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | Electron | Cross-platform desktop app |
| **UI Library** | React | Component-based UI |
| **Build Tool** | Vite | Fast development & bundling |
| **BPMN Editor** | bpmn-js (bpmn.io) | BPMN 2.0 compliant diagrams |
| **Styling** | CSS Variables | Dark/Light theme support |

## Reference Standards

Before development, study these specifications:

| Standard | Title | Key Content |
|----------|-------|-------------|
| **ISO 29481-1** | IDM Methodology and format | Use case structure, exchange requirements, information units |
| **ISO 29481-3** | IDM Data schema (idmXML) | XML schema definition (idmXSD), element structures |
| **idmXSD 2.0** | XML Schema Definition | Detailed element/attribute specifications |
| **ISO 29481-2 / ISO 19510** | BPMN representation | Process map notation standards |

## Core Concept: BPMN-First Workflow

1. **Process Map as Primary Workspace** - Users start by drawing BPMN diagrams
2. **Data Objects as ER Containers** - Double-click Data Objects to define ERs
3. **Contextual Relationships** - Visual association between Tasks and Data Objects

## IDM Structure (per ISO 29481-3)

```
IDM Specification
├── Use Case (UC)
│   ├── Header Information (title, author, status, version)
│   ├── Target Phases
│   ├── Summary & Objectives
│   ├── Actors
│   ├── Benefits, Limitations
│   └── Sub Use Cases (optional)
├── Business Context Map
│   ├── Process Map (PM) - BPMN diagrams
│   │   ├── Diagram (notation, file path)
│   │   └── dataObjectAndEr (links Data Objects to ERs)
│   ├── Interaction Map (IM) - optional (not implemented)
│   └── Transaction Map (TM) - optional (not implemented)
└── Exchange Requirement (ER)
    ├── Metadata (id, name, definition)
    ├── Information Units
    │   ├── name, dataType, isMandatory
    │   ├── definition, examples
    │   ├── Corresponding External Elements (IFC, bSDD, etc.)
    │   └── Sub Information Units (recursive)
    ├── Constraints
    ├── Corresponding MVD (optional)
    └── Sub ERs (recursive)
```

## UI/UX Design Principles

1. **Simplicity First** - Hide optional elements by default
2. **Context-Sensitive** - ER editing within process map context
3. **Progressive Disclosure** - Show advanced options only when needed
4. **Visual Feedback** - Highlight selected Data Objects, show validation status

## Main Interface Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Toolbar [ Header ] [ ER List ] [ Validate ] [ Export ]   File Edit│
├─────────────────────────────────────────┬───────────────────────────┤
│                                         │                           │
│        BPMN Editor (bpmn-js)            │      ER Panel             │
│                                         │      (Hidden by default)  │
│                                         │                           │
│   bpmn.io watermark (must be visible)   │                           │
│                                         │                           │
├─────────────────────────────────────────┴───────────────────────────┤
│  Status Bar: [Project Path] [Validation Status] [ER Count]         │
└─────────────────────────────────────────────────────────────────────┘
```

## Panel Behavior

| Panel | Default State | How to Open |
|-------|---------------|-------------|
| **Header Panel** | Hidden | Click "Header" button in toolbar |
| **ER Panel** | Hidden | Click "ER List" button OR double-click Data Object |
| **BPMN Editor** | Visible | Always visible (main workspace) |

## Key Functionalities

### BPMN Process Editor
- **Library:** bpmn-js (MIT licensed by Camunda/bpmn.io)
- **Requirement:** bpmn.io watermark must remain visible (license compliance)
- Full BPMN 2.0 element palette, drag-and-drop, Pools/Lanes, auto-routing

### Header Panel (IDM Metadata)
Required: Full Title, Short Title, Status
Displayed by default (optional): Version
Optional: Sub-Title, Local Code, Copyright, License

### Exchange Requirement (ER) Panel
- ER List View and ER Detail View
- Double-click Data Object to open with that ER selected
- Components: id, name, definition, informationUnits, constraints, correspondingMvd, subEr

### Information Unit Components
Required: id, name, dataType, isMandatory, definition
Optional: examples, correspondingExternalElement, subInformationUnits

### External Element Mapping
Supported schemas with search: IFC 2x3, IFC 4x3 ADD2, CityGML, bSDD
Classification systems: UniFormat, OmniClass, MasterFormat
Other schemas: Manual entry

**Note:** IFC 5 has been removed as IFC 4.3 ADD2 is the latest official release.

### File Formats (Export Order)
| Format | Extension | Purpose |
|--------|-----------|---------|
| IDM Project | `.idm` | Full project file with all data and ER library |
| idmXML | `.xml` | ISO 29481-3 compliant export with embedded BPMN and images (base64) |
| HTML Document | `.html` | Self-contained HTML with embedded images and BPMN diagram (SVG); printable via browser |
| ZIP Bundle | `.zip` | idmXML + BPMN + images + project data in one archive |
| BPMN Only | `.bpmn` | BPMN 2.0 XML format (process map only) |
| Exchange Requirement | `.erxml` | Individual ER export/import |

### Export Features
- **Customizable Filename**: Default from Short Title, user can modify before export
- **XSLT Styling**: HTML export supports custom XSLT stylesheets for customization
- **XSLT Template Download**: Users can download the default XSLT template and modify it to create custom stylesheets
- **Embedded Images**: idmXML and HTML include base64-encoded figures
- **BPMN as SVG**: HTML export converts BPMN to inline SVG vector graphics
- **Section Figures**: Support for images attached to Summary, Aim & Scope, Benefits, Limitations
- **Print to PDF**: Users can print the HTML export to PDF via browser print dialog (Ctrl/Cmd+P)

## Repository Structure

```
idmxppm-neo-seoul/
├── electron/              # Electron main process
│   ├── main.js
│   └── preload.js
├── src/
│   ├── components/
│   │   ├── BPMNEditor/    # bpmn-js integration
│   │   ├── ERPanel/       # ER list and detail editor
│   │   └── HeaderPanel/   # IDM metadata editor
│   ├── styles/
│   ├── App.jsx
│   └── main.jsx
├── package.json
├── vite.config.js
└── index.html
```

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server
npm run electron:dev # Start Electron app (development)
npm run build        # Build for production
npm run build:mac    # Build macOS .dmg
npm run build:win    # Build Windows .exe
npm run build:all    # Build both platforms
```

## License Compliance

- **bpmn-js**: MIT License (bpmn.io)
  - Watermark must remain visible
  - Include copyright notice in distribution

## idmXSD Naming Conventions

- Use **camelCase** for element names
- Plural form for collections: `benefits`, `limitations`, `informationUnits`
- Abbreviations: `idm`, `uc`, `er`, `pm`, `im`, `tm`, `id`

## Related Standards

| Standard | Description |
|----------|-------------|
| **ISO 16739-1** (IFC) | Industry Foundation Classes |
| **ISO 12006-3** | Taxonomy/data dictionaries |
| **ISO 19650 series** | Information management |
| **ISO 7817-1** | Level of Information Need |
| **bSDD** | buildingSMART Data Dictionary |
| **CityGML** | City Geography Markup Language |

---

## Implementation Status & Achievements

### Completed Features

#### UI/UX Implementation
- **VS Code-inspired vertical menu bar** with progressive disclosure
- **Theme system** (Dark/Light) with localStorage persistence
- **Spec Name Bar** displaying project title with theme toggle
- **Content Pane** for Basic Information, Use Case, and Exchange Requirements views
- **Status bar** showing file path, dirty indicator, ER count, library count, and validation status

#### BPMN Editor
- Full **bpmn-js integration** with custom toolbar
- **Zoom controls** (slider, buttons, fit-to-view)
- **Auto-layout** feature to resolve element overlapping
- **Export options**: SVG, BPMN XML, PNG
- **Pan mode** and **Undo/Redo** support
- **Data Object tooltip** showing "Double-click to specify this Exchange Requirement"
- Fixed default diagram to avoid overlapping elements

#### Exchange Requirement (ER) Editor
- **Individual ER Panel** (right side) for detailed editing
- **ER name display** in panel header (instead of Data Object UID)
- **ER List** in Content Pane showing all ERs in project
- **Information Units** with hierarchical support (sub-units)
- **Flexible data types**: String/Text, Numeric, Boolean, Date/Time, Image, Audio, Video, 2D Vector Drawing, 3D Model, Document, Structured (list, graph, table, JSON), or custom
- **External Element Mapping** with schema search:
  - IFC 2x3, IFC 4x3 ADD2 (with extended entity list including IfcActor)
  - bSDD API integration (SearchInDictionary endpoint with client_id authentication)
  - CityGML, UniFormat, OmniClass, MasterFormat
  - Exact and semantic matching modes
  - **Debounced auto-search** - Results appear automatically as user types
- **Auto-save** - ER changes are automatically saved with visual status indicator (Saved/Saving/Unsaved)
- **Export ER** - Export individual ER to erXML file
- **Import ER** - Import ER from erXML file
- **Example Images** upload and management
- **Mandatory/Optional** field indicators per ISO 29481
- **Auto-cleanup** of deleted data objects from internal data structure

#### Sub-ER Functionality
- **Add Sub-ER** modal with two options:
  1. Select from existing ERs in current IDM specification
  2. Import external ER from erXML file
- erXML parsing supporting both JSON and XML formats

#### Basic Information (Specification / IDM Header)
- Required fields:
  - Full Title (with auto-generated IDM Code)
  - Short Title
  - Status (IDM workflow status)
- Displayed by default: Version
- Optional fields:
  - Sub-Title, Local Code, Copyright, License
- **Auto-detection** - Optional fields with existing data are automatically shown on project load
- Authors section:
  - Person (Given Name, Family Name, URI, Affiliation)
  - Organization (Name, URI)
- Revision History:
  - Creation Date
  - Modification History entries

#### Use Case Editor
- **Aim and Scope** (required) - Purpose and coverage of the IDM specification
- **Use** (Verb + Noun format) with examples reference to BIM Use Library
- **Summary** (required) - Description with figure upload support
- **Actor Roles** - List of actors with roles; named BPMN swimlanes (Pools/Lanes) are automatically added as actors
- **Target Project Phases**:
  - ISO 22263 project stages (mandatory)
  - Optional additional classifications: AIA B101, RIBA Plan of Work
- **Language** - Full ISO 639-1 language codes list
- Optional fields: Benefits, Limitations, Keywords, References, Additional Description

#### Project Management
- **New Project** - Creates blank project with default BPMN diagram
- **Open Project** - Browser file input fallback (Electron IPC support)
- **Import Formats** - IDM project (.idm), idmXML (.xml), ZIP bundle (.zip), legacy xPPM (.xppm), BPMN (.bpmn)
- **xPPM Import** - Import from legacy xPPM format with header, use case, and ER conversion
- **Close Project** - Proper cleanup with unsaved changes confirmation
- **Save/Export** - Multiple format export with customizable filename (default from Short Title)
- **Dirty state tracking** with visual indicator

#### Validation
- Project validation against ISO 29481 requirements (including idmXSD compliance)
- Visual validation panel with error details
- Validation runs but does not block saving (users can save incomplete work)

#### Export Formats
- **IDM Project (.idm)** - Full project file with all data and library
- **idmXML (.xml)** - ISO 29481-3 compliant with embedded BPMN and images (base64)
- **HTML (.html)** - Self-contained document with embedded images and BPMN (SVG); printable to PDF via browser
- **ZIP Bundle (.zip)** - Archive with all project files and images
- **BPMN Only (.bpmn)** - Process map diagram export
- **XSLT Template Download** - Download default stylesheet for customization

#### idmXML Generation
- Full ISO 29481-3 compliant XML generation
- **BPMN Embedding** - BPMN diagram XML is embedded directly in idmXML within CDATA section
- **BPMN Restoration** - Embedded BPMN is automatically restored when loading idmXML files
- **Image Embedding** - Base64 encoded images for section figures and examples
- **Figure Support** - Images for Summary, Aim & Scope, Benefits, Limitations sections
- Proper XML escaping and UUID generation (persistent GUIDs)
- Support for all IDM elements: UC, BCM, PM, ER, IU

### Architecture

```
src/
├── App.jsx                     # Main app with state management
├── hooks/
│   └── useTheme.js             # Theme context with persistence
├── components/
│   ├── BPMNEditor/
│   │   ├── BPMNEditor.jsx      # bpmn-js integration
│   │   ├── BPMNEditor.css
│   │   └── defaultDiagram.js   # Default BPMN template
│   ├── ContentPane/
│   │   ├── ContentPane.jsx     # Left content area
│   │   └── ContentPane.css
│   ├── ERPanel/
│   │   ├── ERPanel.jsx         # ER detail editor
│   │   └── ERPanel.css
│   ├── HeaderPanel/
│   │   ├── HeaderPanel.jsx     # IDM metadata (legacy)
│   │   └── HeaderPanel.css
│   ├── SpecNameBar/
│   │   ├── SpecNameBar.jsx     # Top bar
│   │   └── SpecNameBar.css
│   ├── ValidationPanel/
│   │   ├── ValidationPanel.jsx
│   │   └── ValidationPanel.css
│   ├── VerticalMenuBar/
│   │   ├── VerticalMenuBar.jsx # Left navigation
│   │   └── VerticalMenuBar.css
│   └── icons/
│       └── index.jsx           # SVG icon components
├── utils/
│   ├── idmXmlGenerator.js      # idmXML 2.0 generation with embedded images
│   ├── idmXmlParser.js         # idmXML import with figure parsing
│   ├── idmBundleExporter.js    # ZIP bundle export with JSZip
│   ├── idmBundleImporter.js    # ZIP bundle import with JSZip
│   ├── xppmImporter.js         # Legacy xPPM format import
│   ├── htmlExporter.js         # Self-contained HTML export with XSLT transformation
│   ├── pdfExporter.js          # XSLT transformation utilities
│   ├── defaultIdmXslt.js       # Default XSLT stylesheet for HTML export (downloadable)
│   ├── schemaSearch.js         # Schema search + bSDD API
│   └── validation.js           # Project validation (including idmXSD compliance)
└── schemas/
    └── schemaData.js           # Local schema data
```

### Current UI Layout

```
+------------------------------------------------------------------+
|  [Spec Name]                                    [Theme Toggle]   |
+----+-------------------------------------------------------------+
|    |                                                             |
| V  |  ContentPane   |     BPMNEditor      |      ERPanel        |
| E  |  (toggled)     |     (always)        |      (on select)    |
| R  |                |                     |                     |
| T  |  - Basic Info  |     BPMN canvas     |      ER details     |
| I  |  - Use Case    |     with toolbar    |      Info Units     |
| C  |  - ER List     |     in footer       |      Sub-ERs        |
| A  |                |                     |                     |
| L  | New / Open     |     Zoom, Pan       |                     |
|    | (no project)   |     Export          |                     |
| M  |                |                     |                     |
| E  | Spec / UC / ER |                     |                     |
| N  | Validate       |                     |                     |
| U  | Save & Export  |                     |                     |
|    | Close Project  |                     |                     |
+----+-------------------------------------------------------------+
| Status: [File Path] [Dirty*] | ERs: N | Library: N | [Valid]    |
+------------------------------------------------------------------+
```

### UI/Branding
- **IDMxPPM branding** in bottom-left corner (replaces "BIG Yonsei")
- Click to open **About dialog** with project information
- Tooltip shows "IDMxPPM is powered by BIG Yonsei"

### Known Issues / Future Work

1. **Electron-specific features** not fully tested in browser-only mode
2. **ER Library** persistence across sessions needs implementation
3. **Import idmXML** - Implemented with embedded BPMN restoration
4. **Interaction Map (IM)** and **Transaction Map (TM)** not implemented
5. **MVD linking** not implemented
6. **Multi-language support** for UI (currently English only)
7. **Actor sync with BPMN swimlanes** - bidirectional sync needs implementation (actors can be manually added/managed but not auto-synced with BPMN lanes)
