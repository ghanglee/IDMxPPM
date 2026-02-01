# IDMxPPM neo-Seoul Project

## Project Overview

**IDMxPPM neo-Seoul** is an Information Delivery Manual (IDM) authoring tool compliant with **ISO 29481-1** (Methodology and format) and **ISO 29481-3** (Data schema - idmXML). 

### What is IDMxPPM?
- **IDM** = Information Delivery Manual
- **xPPM** = eXtended Process to Product Modeling

This tool inherits the philosophy of **Process-to-Product Modeling**, meaning the IDM authoring process begins with **process modeling** (use case specification), and then **Exchange Requirements (ERs, information requirements)** required by the specified use-case process are defined.

### Project Goals
1. Develop cross-platform (Mac & Windows) desktop application
2. Greatly improve user-friendliness compared to existing tools
3. Maintain full ISO 29481 compliance
4. Enable rapid "vibe coding" development approach

---

## Software Development Steps

### 1) Planning
**Objective:** Define project scope and deliverables.

**Deliverables:**
- Cross-platform desktop application (Electron-based)
- ISO 29481-1 & ISO 29481-3 compliant
- BPMN-first workflow for intuitive authoring
- Export to idmXML format

---

### 2) Analysis (Requirements Gathering)

#### Reference Standards (Must Study Before Development)
Before beginning development, thoroughly study these specifications:

| Standard | Title | Key Content |
|----------|-------|-------------|
| **ISO 29481-1** | IDM Methodology and format | Use case structure, exchange requirements, information units |
| **ISO 29481-3** | IDM Data schema (idmXML) | XML schema definition (idmXSD), element structures |
| **idmXSD 2.0** | XML Schema Definition | Detailed element/attribute specifications |
| **ISO 29481-2 / ISO 19510** | BPMN representation | Process map notation standards |

#### Core Concept: BPMN-First Workflow
The main innovation is **defining Exchange Requirements in context**:

1. **Process Map as Primary Workspace** - Users start by drawing BPMN diagrams
2. **Data Objects as ER Containers** - Double-click Data Objects to define ERs
3. **Contextual Relationships** - Visual association between Tasks and Data Objects

#### IDM Structure (per ISO 29481-3)
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

---

### 3) Design

#### Technical Architecture
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | Electron | Cross-platform desktop app |
| **UI Library** | React | Component-based UI |
| **Build Tool** | Vite | Fast development & bundling |
| **BPMN Editor** | bpmn-js (bpmn.io) | BPMN 2.0 compliant diagrams |
| **Styling** | CSS Variables | Dark/Light theme support |

#### UI/UX Design Principles
1. **Simplicity First** - Hide optional elements by default
2. **Context-Sensitive** - ER editing within process map context
3. **Progressive Disclosure** - Show advanced options only when needed
4. **Visual Feedback** - Highlight selected Data Objects, show validation status

#### Main Interface Layout
```
┌─────────────────────────────────────────────────────────────────────┐
│  Toolbar [ Header ] [ ER List ] [ Validate ] [ Export ]   File Edit│
├─────────────────────────────────────────┬───────────────────────────┤
│                                         │                           │
│        BPMN Editor (bpmn-js)            │      ER Panel             │
│                                         │      (Hidden by default)  │
│   ┌──────────┐      ┌──────────┐       │                           │
│   │   Pool   │─────▶│   Task   │       │   When opened:            │
│   │ (Actor)  │      └────┬─────┘       │   ┌─────────────────────┐ │
│   └──────────┘           │             │   │ ER List View        │ │
│                     ┌────▼─────┐       │   │ - ER 1              │ │
│                     │   Data   │◀══════│   │ - ER 2              │ │
│                     │  Object  │ Click │   │ - ER 3 (selected)   │ │
│                     └──────────┘       │   └─────────────────────┘ │
│                                         │   ┌─────────────────────┐ │
│   bpmn.io watermark (must be visible)   │   │ ER Detail Editor    │ │
│                                         │   │ - Name, Definition  │ │
│                                         │   │ - Information Units │ │
│                                         │   │ - External Mappings │ │
│                                         │   └─────────────────────┘ │
├─────────────────────────────────────────┴───────────────────────────┤
│  Status Bar: [Project Path] [Validation Status] [ER Count]         │
└─────────────────────────────────────────────────────────────────────┘
```

#### Panel Behavior

| Panel | Default State | How to Open |
|-------|---------------|-------------|
| **Header Panel** | Hidden | Click "Header" button in toolbar |
| **ER Panel** | Hidden | Click "ER List" button OR double-click Data Object |
| **BPMN Editor** | Visible | Always visible (main workspace) |

#### Initial State on Launch
- BPMN Editor displays a **simple example diagram** (Sender → Task → Data Object → Receiver)
- Header Panel is hidden (click to reveal IDM metadata: title, author, version, etc.)
- ER Panel is hidden (click to reveal ER list and editor)

---

### 4) Main Functionalities

#### 4.1 BPMN Process Editor
- **Library:** bpmn-js (MIT licensed by Camunda/bpmn.io)
- **Requirement:** bpmn.io watermark must remain visible (license compliance)
- **Features:**
  - Full BPMN 2.0 element palette
  - Drag-and-drop Tasks, Gateways, Events, Data Objects
  - Pools and Lanes for Actor representation
  - Auto-routing connections
  - Zoom, pan, fit-to-screen

#### 4.2 Header Panel (IDM Metadata)
Contains Use Case information per ISO 29481-1:

| Field | Required | Description |
|-------|----------|-------------|
| IDM Title | Yes | Name of the IDM specification |
| Author | Yes | Author or committee name |
| Version | Yes | Version number |
| Status | Yes | NP, WD, PUB, WDRL |
| Language | Yes | ISO 639-1 code (EN, KR, etc.) |
| Target Phases | No | Project phases covered |
| Summary | No | Brief description |
| Objectives | No | Goals of this IDM |
| Benefits | No | Expected benefits |
| Limitations | No | Known limitations |

#### 4.3 Exchange Requirement (ER) Panel

##### ER Panel Views
1. **ER List View** - Shows all ERs in the current project
2. **ER Detail View** - Shows/edits individual ER when selected

##### Opening ER Panel
| Action | Result |
|--------|--------|
| Click "ER List" button | Opens ER Panel showing all ERs in project |
| Double-click Data Object | Opens ER Panel with that Data Object's ER selected |

##### ER Detail View Behavior
- If Data Object has linked ER → Display existing ER data
- If Data Object has no linked ER → Display empty ER form

##### ER Components (per idmXSD)
| Element | Required | Description |
|---------|----------|-------------|
| `id` | Yes | Unique identifier (auto-generated) |
| `name` | Yes | ER name |
| `definition` | Yes | Detailed description |
| `informationUnits` | Yes | List of information requirements |
| `constraints` | No | Data type rules, restrictions |
| `correspondingMvd` | No | Link to Model View Definition |
| `subEr` | No | Nested sub-ERs (recursive) |

##### Information Unit Components
| Attribute | Required | Description |
|-----------|----------|-------------|
| `id` | Yes | Unique identifier |
| `name` | Yes | Information unit name |
| `dataType` | Yes | String, Integer, Real, Boolean, etc. |
| `isMandatory` | Yes | Required or optional |
| `definition` | Yes | Description |
| `examples` | No | Example values, images |
| `correspondingExternalElement` | No | External schema mappings |
| `subInformationUnits` | No | Nested units (recursive) |

#### 4.4 Adding ERs to Project
Users can add ERs in two ways:

| Method | Description |
|--------|-------------|
| **From Current Project** | Select existing ER from project's ER library |
| **Import from File** | Import ER from external `.erxml` file |

#### 4.5 External Element Mapping (correspondingExternalElement)

##### Supported External Schemas
| Schema | Search Support | Notes |
|--------|----------------|-------|
| IFC 2x3 | ✅ Exact + Semantic | Study IFC schema |
| IFC 4 | ✅ Exact + Semantic | Study IFC schema |
| IFC 4x1 | ✅ Exact + Semantic | Study IFC schema |
| IFC 4x2 | ✅ Exact + Semantic | Study IFC schema |
| IFC 4x3 | ✅ Exact + Semantic | Study IFC schema |
| IFC 5 | ✅ Exact + Semantic | Study IFC schema |
| CityGML | ✅ Exact + Semantic | Study CityGML schema |
| bSDD | ✅ Exact + Semantic | Use bSDD API |
| Other | ❌ Manual entry | User specifies element/attribute |

##### Search Options
| Option | Description |
|--------|-------------|
| **Exact Match** | Find elements with exact name match |
| **Semantic Match** | Find elements with similar meaning/purpose |

##### UI Flow for External Mapping
1. User clicks "Add External Mapping" in Information Unit
2. Select external schema from dropdown (IFC 4, bSDD, etc.)
3. If supported schema → Show search bar with Exact/Semantic options
4. If other schema → Show manual text input for element/attribute name
5. Select or enter element → Save mapping

#### 4.6 Optional Elements Visibility
- **Default:** Hide optional elements for interface simplicity
- **Toggle:** "Show Advanced Options" button reveals optional fields
- **Visual Indicator:** Optional fields marked with different styling (e.g., lighter color, dashed border)

#### 4.7 File Operations

##### Save/Open Formats
| Format | Extension | Purpose |
|--------|-----------|---------|
| IDMxPPM Project | `.json` | Full project with BPMN + all ERs |
| BPMN Diagram | `.bpmn` | BPMN 2.0 XML format |
| Exchange Requirement | `.erxml` | Individual ER export/import |
| idmXML | `.xml` | ISO 29481-3 compliant export |

##### Import Capabilities
- Import BPMN files from other tools
- Import ERs from other IDMxPPM projects (`.erxml`)
- Import sub-ERs from ER library

#### 4.8 Export Options

##### idmXML Export
- Full ISO 29481-3 compliant XML output
- Include all Use Case, Process Map, and ER data

##### Preview/Documentation
- HTML preview with default XML stylesheet
- PDF export option for documentation

#### 4.9 ER Reuse Features
| Feature | Description |
|---------|-------------|
| **ER Library** | Save ERs for reuse across projects |
| **Sub-ER Loading** | Import existing ER as sub-ER (recursive) |
| **Save As** | Duplicate ER with new name |

#### 4.10 Validation
- **Check idmXML validity** against ISO 29481-3 schema
- **Highlight missing mandatory elements** and attributes
- **Visual indicators** for incomplete sections (red outline, warning icon)
- **Validation report** before export

---

### 5) Testing

#### Unit Tests
- idmXML generation logic
- ER data structure validation
- BPMN ↔ ER linking

#### Integration Tests
- Full workflow: Create → Edit → Save → Export
- Import/Export round-trip verification

#### Manual Testing Scenario
1. Launch app → Verify example BPMN diagram displayed
2. Open Header Panel → Enter IDM metadata
3. Draw process: Actor A → Task → Data Object → Actor B
4. Double-click Data Object → Verify ER Panel opens
5. Define ER with Information Units
6. Add external mapping (select IFC 4, search for "IfcWall")
7. Save project (`.json`)
8. Export to idmXML (`.xml`)
9. Validate against ISO 29481-3 schema

---

### 6) Deployment

#### Platform Requirements
| Platform | Format | Requirements |
|----------|--------|--------------|
| **macOS** | `.dmg` | macOS 10.15+ (Catalina or later) |
| **Windows** | `.exe` (NSIS installer) | Windows 10/11 64-bit |

#### Installation Goals
- **Easy installation** - Standard installer workflow
- **No dependencies** - Electron bundles everything needed
- **Auto-update** - Future: implement update mechanism

#### Build Commands
```bash
npm run build:mac    # Build macOS .dmg
npm run build:win    # Build Windows .exe
npm run build:all    # Build both platforms
```

---

### 7) Maintenance

#### Ongoing Support
- Bug fixes and patches
- User feedback incorporation
- ISO standard updates compliance

#### Future Enhancements
- Cloud sync for ER library
- Team collaboration features
- Integration with BIM authoring tools
- MVD (Model View Definition) linking

---

## Quick Reference

### Key Terminology
| Term | Definition |
|------|------------|
| **IDM** | Information Delivery Manual |
| **UC** | Use Case |
| **ER** | Exchange Requirement |
| **PM** | Process Map |
| **IM** | Interaction Map (not implemented) |
| **TM** | Transaction Map (not implemented) |
| **IU** | Information Unit |
| **idmXSD** | IDM XML Schema Definition |

### idmXSD Naming Conventions
- Use **camelCase** for element names
- Plural form for collections: `benefits`, `limitations`, `informationUnits`
- Abbreviations: `idm`, `uc`, `er`, `pm`, `im`, `tm`, `id`

### Related Standards
| Standard | Description |
|----------|-------------|
| **ISO 16739-1** (IFC) | Industry Foundation Classes |
| **ISO 12006-3** | Taxonomy/data dictionaries |
| **ISO 19650 series** | Information management |
| **ISO 7817-1** | Level of Information Need |
| **bSDD** | buildingSMART Data Dictionary |
| **CityGML** | City Geography Markup Language |

---

## Development Resources

### Project Repository Structure
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

### Development Commands
```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server
npm run electron:dev # Start Electron app (development)
npm run build        # Build for production
```

### License Compliance
- **bpmn-js**: MIT License (bpmn.io)
  - ⚠️ Watermark must remain visible
  - Include copyright notice in distribution
