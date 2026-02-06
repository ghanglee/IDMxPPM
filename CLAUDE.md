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
| **BPMN Editor** | Visible | Collapsible via ER Panel toolbar when editing ERs |

### Collapsible BPMN Editor
When the ER Panel is open, users can toggle BPMN visibility:
- **Toggle Button**: Located in ER Panel toolbar ("Hide BPMN" / "Show BPMN")
- **Expanded Mode**: When BPMN is hidden, ER Panel expands to fill available width
- **Use Case**: Maximize workspace when focusing on Information Units and Sub-ERs

## Key Functionalities

### BPMN Process Editor
- **Library:** bpmn-js (MIT licensed by Camunda/bpmn.io)
- **Requirement:** bpmn.io watermark must remain visible (license compliance)
- Full BPMN 2.0 element palette, drag-and-drop, Pools/Lanes, auto-routing

### Header Panel (IDM Metadata)
Required: Full Title, Short Title, Status
Displayed by default (optional): Version
Optional: Sub-Title, Local Code, Copyright, License

### Exchange Requirement (ER) Panel - Table-Based Tree View
- **Hierarchical Tree Table** - ERs and Information Units displayed in a table with tree structure
- **Table Columns**: Name (with tree indent), Data Type, Definition, Mandatory, Examples, Constraints, Ext. Elm.
- **ERToolbar** - Actions: +ER, -ER, >ER (nest as sub-ER), Expand All, Collapse All, Toggle BPMN
- **ERDetailPanel** - Form panel below table for editing selected item
- **Collapsible BPMN** - BPMN editor can be hidden to maximize ER workspace
- Double-click Data Object to open with that ER selected
- Components: id, name, definition, informationUnits, constraints, correspondingMvd, subEr

#### ER Table Columns
| Column | Description |
|--------|-------------|
| Name | ER/IU name with tree indentation and icons |
| Data Type | Information Unit data type (dropdown) |
| Definition | IU definition (truncated in table, full in detail) |
| Mandatory | IU mandatory flag (checkbox) |
| Examples | IU examples (truncated) |
| Constraints | IU constraints indicator |
| Ext. Elm. | External element mapping count badge |

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

#### Exchange Requirement (ER) Editor - Table-Based Tree View
- **Hierarchical Tree Table** - ERs and Information Units in spreadsheet-like view
- **Table Columns**: Name (with tree), Data Type, Definition, Mandatory, Examples, Constraints, Ext. Elm.
- **ERToolbar** - +ER (add), -ER (delete), >ER (nest as sub-ER), Expand/Collapse All, Toggle BPMN
- **ERDetailPanel** - Form below table for editing selected item (ER or IU)
- **Collapsible BPMN** - Hide BPMN editor to maximize ER workspace
- **Tree Structure**: ERs as folder icons, Sub-ERs nested, Information Units as document icons
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
- **xPPM Import** - Import from legacy xPPM format with full data conversion:
  - Header data (title, authors, version, status)
  - Use Case information (summary, aim & scope, actors, project phases)
  - Exchange Requirements with Information Units
  - BPMN diagram path detection (auto-detects Diagram folder reference)
  - Image references parsed (displayed as placeholders until loaded)
  - Data object to ER mappings preserved
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

#### idmXML Generation (idmXSD v2.0 Compliant)
- Full **idmXSD v2.0** compliant XML generation (namespace: `idmXML/2.0`)
- **Version Detection** - Automatic detection of idmXSD v1.0 vs v2.0 files on import
- **BPMN Embedding** - BPMN diagram XML is embedded directly in idmXML within CDATA section
- **BPMN Restoration** - Embedded BPMN is automatically restored when loading idmXML files
- **Image Embedding** - Base64 encoded images for section figures and examples
- **Figure Support** - Images for Summary, Aim & Scope, Benefits, Limitations sections
- Proper XML escaping and UUID generation (persistent GUIDs)
- Support for all IDM elements: UC, BCM, PM, ER, IU

#### idmXSD v2.0 Structure Compliance
- **authoring** element with `copyright` attribute (required)
- **changeLog** elements under authoring (with `id`, `changeDateTime`, `changeSummary`, `changedBy`)
- **author** elements with `id` attribute containing `<person>` or `<organization>` children
- **standardProjectStage** (v2.0) instead of standardProjectPhase (v1.0)
- **localProjectStage** (v2.0) instead of localProjectPhase (v1.0)
- **classification** elements with required `id` and `name` attributes

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
| E  |  (toggled)     |    (collapsible)    |  (table tree view)  |
| R  |                |                     |                     |
| T  |  - Basic Info  |     BPMN canvas     |  [+ER][-ER][>ER]    |
| I  |  - Use Case    |     with toolbar    |  [Expand][Collapse] |
| C  |  - ER List     |     in footer       |  [Toggle BPMN]      |
| A  |                |                     |  ─────────────────  |
| L  | New / Open     |     Zoom, Pan       |  Tree Table View    |
|    | (no project)   |     Export          |  ─────────────────  |
| M  |                |                     |  Detail Panel       |
| E  | Spec / UC / ER |                     |  (edit selected)    |
| N  | Validate       |                     |                     |
| U  | Save & Export  |                     |                     |
|    | Close Project  |                     |                     |
+----+-------------------------------------------------------------+
| Status: [File Path] [Dirty*] | ERs: N | Library: N | [Valid]    |
+------------------------------------------------------------------+
```

**BPMN Hidden Mode (ER Expanded)**:
```
+------------------------------------------------------------------+
|  [Spec Name]                                    [Theme Toggle]   |
+----+-------------------------------------------------------------+
|    |                                                             |
| V  |  ContentPane   |           ERPanel (expanded)               |
| E  |  (toggled)     |  [+ER][-ER][>ER] [Expand][Collapse] [BPMN] |
| R  |                |  ───────────────────────────────────────── |
| T  |  - Basic Info  |  Name         |Type  |Def    |Req|Ex |Ext |
| I  |  - Use Case    |  ▶ er_Name    |      |       |   |   |    |
| C  |  - ER List     |    ▶ subER    |      |       |   |   |    |
| A  |                |      ◦ IU_1   |String|Desc...|☑  |Yes| 2  |
| L  | New / Open     |      ◦ IU_2   |Bool  |...    |☐  |-  | -  |
|    | (no project)   |  ───────────────────────────────────────── |
| M  |                |  Detail Panel: [Edit Information Unit]     |
| E  | Spec / UC / ER |  Name: [____] DataType: [▼] Definition:    |
| N  | Validate       |  [________________] Mandatory: [☑]         |
| U  | Save & Export  |  Examples: [____] External Mappings: [+]   |
|    | Close Project  |                                             |
+----+-------------------------------------------------------------+
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

---

## ER-First Architecture: UI Design & Development Checklist

### Core Concept
The ER-first architecture uses `erHierarchy` as the single source of truth for all Exchange Requirements, replacing the old `dataObjectErMap` approach. BPMN Data Objects can optionally be associated with ERs via `dataObjectErMap`.

### Three-Pane Design

| Pane | Location | Purpose |
|------|----------|---------|
| **ER Hierarchy** | ContentPane (left sidebar) | Navigation - shows full ER tree structure |
| **Individual ER** | ERPanel (center/right) | Shows selected ER's content (IUs, Sub-ERs) |
| **Detail Panel** | Bottom of ERPanel | Edit details of clicked item (ER, Sub-ER, or IU) |

### Design Rules

#### Rule 1: ER Hierarchy as Navigation
- The ER Hierarchy in ContentPane shows the complete tree of all ERs
- Clicking an ER in the hierarchy **changes** which ER is displayed in the Individual ER pane
- This is the **only** way to change which ER is being viewed/edited

#### Rule 2: Single Top-Level ER (Root ER)
- Only **ONE** top-level ER is allowed in `erHierarchy`
- All other ERs must be nested as Sub-ERs
- **On import**: If multiple top-level ERs exist, prompt users to:
  - Select one as the root ER (others consolidated under it), OR
  - Create a new top-level ER named "er_" + ShortTitle (others become sub-ERs)
  - The hierarchy of the ERs should be preserved
- **Multiple BPMN Data Objects**: Same prompt behavior as import
- **Root Switch via Outdent**: When outdenting a second-level ER, prompt:
  > "Do you want to make '[ER Name]' the new Root ER?"
  - **Option A: New Root (Dissolve Old)**: Old root is deleted. Its children (excluding new root) are promoted/merged as children of the new root.
  - **Option B: New Root (Keep Old)**: Old root becomes a sub-ER of the new root.
  - **Cancel**: The outdent action is cancelled.

#### Rule 3: Individual ER Pane Shows Selected ER's Tree
- Displays the currently selected ER in the ER Hierarchy pane and its contents:
  - Information Units (IUs)
  - Sub-ERs (and their IUs/Sub-ERs recursively)
- Title shows "Individual ER" with the selected ER's name

#### Rule 4: Clicking in Individual ER Pane Does NOT Change Displayed ER
- Clicking an item (ER, Sub-ER, or IU) in the Individual ER pane:
  - ✅ Shows that item's details in the bottom Detail Panel
  - ❌ Does NOT navigate to a different ER (no drill-down)
- Users can only change the displayed ER via the ER Hierarchy

#### Rule 5: Detail Panel Shows Clicked Item
- When any row is clicked in Individual ER pane, its details appear in the bottom panel
- Works for: Root ER, Sub-ERs, Information Units
- Enables editing of the selected item's properties

#### Rule 6: Top-Level ER Editable
- The top-level (root) ER can be clicked in ER Hierarchy
- Its details appear in the Detail Panel for editing
- Users can specify name, description, etc.

#### Rule 7: Sub-ER Adding
- When "+ER" is clicked in the Individual ER pane, Sub-ERs can be added from:
  1. **Current IDM** - Select from existing ERs (**Move operation**: moves ER from current location to here)
  2. **Import erXML** - Import from external erXML file
- Added Sub-ERs become children of the currently selected ER in the Individual ER pane
- The details of the added Sub-ERs are displayed in the Detail Panel for editing

### Data Structures

```javascript
// Source of truth
erHierarchy = [
  {
    id: 'root-er-id',
    name: 'Root ER',
    description: '...',
    informationUnits: [...],
    subERs: [
      {
        id: 'sub-er-1',
        name: 'Sub-ER 1',
        informationUnits: [...],
        subERs: [...]  // Recursive
      }
    ]
  }
  // Only ONE top-level ER allowed (Rule 2)
]

// Optional BPMN association
dataObjectErMap = {
  'DataObject_xyz': 'er-id-123'  // Maps BPMN element to ER
}
```

### Key Callbacks

| Callback | Purpose |
|----------|---------|
| `onSelectER(erId)` | Change which ER is displayed (ER Hierarchy only) |
| `onUpdateER(erId, updatedData)` | Update an ER's data |
| `onAddER()` | Add new root ER (blocked if one exists) |
| `onDeleteER(erId)` | Delete an ER |
| `onIndent(erId)` | Make ER a sub-ER of sibling above |
| `onOutdent(erId)` | Promote sub-ER (intercepted if targeting level-2 ER to trigger Root Switch) |

### Empty States

| State | Message |
|-------|---------|
| No ER selected | "No ER selected" / "Select an ER from the ER Hierarchy" |
| ER selected but empty | "ER is empty" / "Add Information Units using the toolbar" |
| No ERs in project | "No ERs in project" |

### Implementation Checklist

- [x] `erHierarchy` as source of truth
- [x] ER Hierarchy navigation in ContentPane
- [x] Individual ER pane shows selected ER's tree
- [x] Click in Individual ER → Detail Panel only (no drill-down)
- [x] Top-level ER clickable and editable
- [x] Sub-ER adding via erXML import
- [x] Updated empty state messages
- [x] Header title "Individual ER"
- [x] Single top-level ER enforcement with user prompt (Rule 2)
- [x] Root Selection Modal for import/multiple data objects
- [x] Root Switch Modal for outdent-to-root scenarios
- [x] Sub-ER adding from current IDM as **Move** operation
- [x] Auto-select added Sub-ER in Detail Panel
