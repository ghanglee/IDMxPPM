# IDMxPPM neo-Seoul User Manual

**Version 0.1.0**

An Information Delivery Manual (IDM) Authoring Tool compliant with ISO 29481-1 and ISO 29481-3

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Main Interface](#3-main-interface)
4. [Creating a New Project](#4-creating-a-new-project)
5. [BPMN Process Editor](#5-bpmn-process-editor)
6. [Basic Information (Specification)](#6-basic-information-specification)
7. [Use Case Editor](#7-use-case-editor)
8. [Exchange Requirements](#8-exchange-requirements)
9. [Information Units](#9-information-units)
10. [External Element Mapping](#10-external-element-mapping)
11. [Sub-ERs](#11-sub-ers)
12. [Saving and Exporting](#12-saving-and-exporting)
13. [Validation](#13-validation)
14. [Importing Existing Files](#14-importing-existing-files)
15. [Keyboard Shortcuts](#15-keyboard-shortcuts)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Introduction

### What is IDMxPPM?

IDMxPPM (eXtended Process to Product Modeling) neo-Seoul is a desktop application for authoring Information Delivery Manuals (IDMs) according to ISO 29481 standards. It enables you to:

- Define BIM exchange requirements using BPMN 2.0 process diagrams
- Specify detailed information requirements for each data exchange
- Map requirements to external standards (IFC, bSDD, CityGML, etc.)
- Export specifications in ISO 29481-3 compliant idmXML format

### Standards Compliance

| Standard | Description |
|----------|-------------|
| ISO 29481-1 | IDM Methodology and format |
| ISO 29481-2 | Interaction framework (BPMN representation) |
| ISO 29481-3 | Data schema (idmXML) |

---

## 2. Getting Started

### Launching the Application

When you launch IDMxPPM, you'll see the **Startup Screen** with three options:

<!-- SCREENSHOT: startup-screen.png -->
<!-- Caption: The Startup Screen showing three project options -->

| Option | Description |
|--------|-------------|
| **Blank Project** | Start with an empty BPMN canvas |
| **Sample Project** | Start with a pre-configured sample IDM specification |
| **Open Project** | Open an existing project file (.json, .idm, .xml, .bpmn) |

### Supported File Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| IDMxPPM Project | `.json` or `.idm` | Full project with BPMN diagram and all ER data |
| idmXML | `.xml` | ISO 29481-3 compliant export (includes embedded BPMN) |
| BPMN Diagram | `.bpmn` | BPMN 2.0 XML format (diagram only) |
| Exchange Requirement | `.erxml` | Individual ER for import/export |

---

## 3. Main Interface

The main interface consists of several key areas:

<!-- SCREENSHOT: main-interface.png -->
<!-- Caption: Main interface layout with labeled areas -->

### Interface Components

```
+------------------------------------------------------------------+
|  [Spec Name Bar]                              [Theme Toggle]     |
+----+-------------------------------------------------------------+
|    |                                                             |
| V  |  Content Pane    |   BPMN Editor      |   ER Panel         |
| E  |  (toggleable)    |   (main workspace) |   (on selection)   |
| R  |                  |                    |                    |
| T  |  - Specification |   BPMN canvas      |   ER details       |
| I  |  - Use Case      |   with toolbar     |   Info Units       |
| C  |  - ER List       |                    |   Sub-ERs          |
| A  |                  |                    |                    |
| L  |                  |                    |                    |
|    |                  |                    |                    |
| M  |                  |                    |                    |
| E  |                  |                    |                    |
| N  |                  |                    |                    |
| U  |                  |                    |                    |
+----+-------------------------------------------------------------+
| Status Bar: [File Path] [ERs: N] [Library: N] [Validation]       |
+------------------------------------------------------------------+
```

### Vertical Menu Bar

The left sidebar provides access to main functions:

<!-- SCREENSHOT: vertical-menu.png -->
<!-- Caption: Vertical Menu Bar icons -->

| Icon | Function | Description |
|------|----------|-------------|
| Document | Specification | Open Basic Information panel |
| Flowchart | Use Case | Open Use Case editor |
| Data | Exchange Req | Open ER list panel |
| Check | Validate | Run project validation |
| Save | Save & Export | Export project to various formats |
| X | Close Project | Close current project |

### Theme Toggle

Click the sun/moon icon in the top-right corner to switch between **Light** and **Dark** themes.

---

## 4. Creating a New Project

### Blank Project

1. Click **Blank Project** on the Startup Screen
2. An empty BPMN canvas appears with a start event
3. The Specification panel opens automatically

<!-- SCREENSHOT: blank-project.png -->
<!-- Caption: A new blank project with empty BPMN canvas -->

### Sample Project

1. Click **Sample Project** on the Startup Screen
2. A pre-configured diagram with two pools (Sender/Receiver) appears
3. Sample header data is pre-filled

<!-- SCREENSHOT: sample-project.png -->
<!-- Caption: Sample project with pre-configured BPMN diagram -->

---

## 5. BPMN Process Editor

The BPMN editor is the main workspace where you create your process map.

<!-- SCREENSHOT: bpmn-editor.png -->
<!-- Caption: BPMN Editor with palette and diagram -->

### Adding Elements

1. Use the palette on the left side of the canvas
2. Click an element type, then click on the canvas to place it
3. Or drag elements from the palette to the canvas

### Common BPMN Elements

| Element | Usage in IDM |
|---------|--------------|
| **Pool/Lane** | Represents actors (Sender, Receiver) |
| **Task** | Process activities |
| **Data Object** | Exchange Requirements (double-click to edit) |
| **Gateway** | Decision points |
| **Message Flow** | Communication between pools |

### Working with Data Objects

Data Objects represent Exchange Requirements in IDM:

1. Add a Data Object from the palette
2. **Double-click** on the Data Object to open the ER Panel
3. Define the exchange requirement details

<!-- SCREENSHOT: data-object-tooltip.png -->
<!-- Caption: Hovering over a Data Object shows the tooltip -->

### Editor Toolbar

Located at the bottom of the BPMN editor:

<!-- SCREENSHOT: bpmn-toolbar.png -->
<!-- Caption: BPMN Editor toolbar -->

| Button | Function |
|--------|----------|
| Undo/Redo | Undo or redo changes |
| Zoom In/Out | Adjust zoom level |
| Fit to View | Fit diagram to viewport |
| Pan Mode | Toggle pan mode (Space+Drag) |
| Auto Layout | Automatically arrange overlapping elements |
| Export SVG | Export diagram as SVG |
| Export BPMN | Export as BPMN XML |
| Export PNG | Export as PNG image |

### Actor Synchronization

Named Pools and Lanes are automatically synchronized to the Actor Roles list in the Use Case panel.

---

## 6. Basic Information (Specification)

Click the **Specification** icon in the vertical menu to open this panel.

<!-- SCREENSHOT: specification-panel.png -->
<!-- Caption: Basic Information (Specification) panel -->

### Required Fields

| Field | Description |
|-------|-------------|
| **Full Title** | Complete title of the IDM specification |
| **Short Title** | Abbreviated title |
| **Status** | Document status (NP, WD, CD, DIS, FDIS, IS) |

### Optional Fields

- **Version** (displayed by default)
- Sub-Title
- Local Code
- Copyright
- License

Click the eye icon next to optional fields to show/hide them.

### Authors Section

Add authors as either:
- **Person**: Given Name, Family Name, URI, Affiliation
- **Organization**: Name, URI

<!-- SCREENSHOT: authors-section.png -->
<!-- Caption: Adding authors to the specification -->

### Revision History

Track document revisions:
1. **Creation Date**: Set automatically or manually
2. **Modification History**: Add entries with date and description

---

## 7. Use Case Editor

Click the **Use Case** icon to open this panel.

<!-- SCREENSHOT: use-case-panel.png -->
<!-- Caption: Use Case editor panel -->

### Required Fields

| Field | Description |
|-------|-------------|
| **Aim and Scope** | Purpose and coverage of the IDM |
| **Summary** | Brief description of the use case |

### Use (BIM Use)

Define the use case in **Verb + Noun** format:
- Example: "Coordinate Design Models"
- Reference: BIM Use Library

### Actor Roles

Actors are automatically populated from BPMN swimlanes (Pools/Lanes):

<!-- SCREENSHOT: actor-roles.png -->
<!-- Caption: Actor Roles list with BPMN-synced actors -->

- Named swimlanes appear automatically
- Manually add additional actors with the **+ Add Actor** button
- Each actor has a Name and Role field

### Target Project Phases

Select applicable project phases:
- **ISO 22263** stages (required): Inception, Brief, Design, Production, Handover, Operation, End-of-life
- **AIA B101** phases (optional)
- **RIBA Plan of Work** stages (optional)

### Additional Fields

- Language (ISO 639-1 codes)
- Benefits
- Limitations
- Keywords
- References
- Additional Description

---

## 8. Exchange Requirements

### ER List

Click the **Exchange Req** icon to see all ERs in the project:

<!-- SCREENSHOT: er-list.png -->
<!-- Caption: Exchange Requirements list -->

Each ER is associated with a Data Object in the BPMN diagram.

### ER Panel

Double-click a Data Object or select from the ER list to open the individual ER panel:

<!-- SCREENSHOT: er-panel.png -->
<!-- Caption: Individual ER Panel for editing -->

### ER Fields

| Field | Description |
|-------|-------------|
| **ER Name** | Name of the exchange requirement |
| **Description** | Detailed description |
| **Information Units** | List of required information items |
| **Sub-ERs** | Linked sub-exchange requirements |

### Auto-Save

Changes are automatically saved as you type:
- **Saved**: All changes saved
- **Saving...**: Currently saving
- **Unsaved**: Pending changes

The save status indicator appears in the ER Panel header.

---

## 9. Information Units

Information Units define the specific data items required in an exchange.

<!-- SCREENSHOT: information-unit.png -->
<!-- Caption: Information Unit editor -->

### Adding Information Units

1. Click **+ Add Unit** in the ER Panel
2. Fill in the required fields
3. Add sub-units for hierarchical structure

### Information Unit Fields

| Field | Required | Description |
|-------|----------|-------------|
| Name | Yes | Name of the information item |
| Data Type | Yes | Type of data (see below) |
| Mandatory | No | Whether the item is required |
| Definition | Yes | Description of the item |
| Examples | No | Example values |
| Example Images | No | Upload reference images |
| External Mappings | No | Links to external standards |

### Data Types

- String / Text
- Numeric
- Boolean
- Date / Time
- Image
- Audio
- Video
- 2D Vector Drawing
- 3D Model
- Document (PDF, DOCX, etc.)
- Structured (list, graph, table, JSON)
- Other (specify custom type)

### Hierarchical Structure

Create nested information units:
1. Click the **+** button on a parent unit
2. A sub-unit is added beneath it
3. Collapse/expand with the chevron icon

---

## 10. External Element Mapping

Map information units to external standards and schemas.

<!-- SCREENSHOT: external-mapping.png -->
<!-- Caption: External Element Mapping interface -->

### Adding Mappings

1. Click **+ Add Mapping** in an Information Unit
2. Select a schema from the dropdown
3. Search or enter the element name

### Supported Schemas

| Schema | Search | Description |
|--------|--------|-------------|
| IFC 2x3 | Yes | Industry Foundation Classes 2x3 |
| IFC 4x3 ADD2 | Yes | IFC 4.3 Addendum 2 (current) |
| bSDD | Yes (API) | buildingSMART Data Dictionary |
| CityGML | Yes | City Geography Markup Language |
| UniFormat | Yes | Classification system |
| OmniClass | Yes | Classification system |
| MasterFormat | Yes | Classification system |
| Other | No | Custom schema (manual entry) |

### Search Mode

For searchable schemas:
1. Click the search button or type in the field
2. Results appear automatically as you type
3. Select **Exact Match** or **Semantic Match**
4. Click a result to add the mapping

<!-- SCREENSHOT: schema-search.png -->
<!-- Caption: Searching for IFC elements -->

### Manual Entry (Other Schema)

For custom or unsupported schemas:
1. Select **Other** from the dropdown
2. Enter the **Standard name** (e.g., "COBie", "NBIMS")
3. Enter the **Element name**

---

## 11. Sub-ERs

Link related Exchange Requirements as Sub-ERs.

<!-- SCREENSHOT: sub-er-section.png -->
<!-- Caption: Sub-ER section in ER Panel -->

### Adding Sub-ERs

Click the **+** button in the Sub-ERs section:

<!-- SCREENSHOT: sub-er-modal.png -->
<!-- Caption: Add Sub-ER modal -->

### From Current IDM

1. Select the **Current IDM** tab
2. Choose an existing ER from the list
3. The ER is linked as a Sub-ER

### Import from erXML

1. Select the **Import erXML** tab
2. Click **Browse Files**
3. Select an `.erxml` or `.xml` file
4. The imported ER is added as a Sub-ER

---

## 12. Saving and Exporting

### Save & Export Dialog

Click the **Save & Export** icon in the vertical menu:

<!-- SCREENSHOT: export-dialog.png -->
<!-- Caption: Save & Export dialog -->

### Export Formats

| Format | Description |
|--------|-------------|
| **idmXML (.xml)** | ISO 29481-3 compliant XML with embedded BPMN |
| **IDM Project (.idm)** | Full project file with all data |
| **Archive Bundle (.json)** | Separate files bundled together |
| **BPMN Only (.bpmn)** | Process diagram only |

### idmXML Options

- **Include embedded BPMN diagram**: Embed the BPMN XML in the idmXML file
- **Include XSLT stylesheet reference**: Add stylesheet for viewing

### Quick Export

Use the toolbar buttons at the bottom of the BPMN editor:
- **SVG**: Vector image of the diagram
- **BPMN**: BPMN 2.0 XML file
- **PNG**: Raster image of the diagram

---

## 13. Validation

Validate your project against ISO 29481 requirements.

### Running Validation

1. Click the **Validate** icon in the vertical menu
2. The validation panel appears with results

<!-- SCREENSHOT: validation-panel.png -->
<!-- Caption: Validation results panel -->

### Validation Checks

The validator checks:
- Required header fields (title, status, etc.)
- ER definitions
- Information unit requirements
- BPMN diagram structure

### Navigating Errors

Click on a validation error to navigate to the relevant section:
- Header errors open the Specification panel
- ER errors open the Exchange Requirements panel
- Diagram errors focus the BPMN editor

### Saving with Validation Errors

You can save incomplete work even with validation errors. This allows you to:
- Save work-in-progress
- Continue editing later
- Share drafts for review

---

## 14. Importing Existing Files

### Opening Files

1. Click **Open Project** on the Startup Screen, or
2. Use the **Open Project** option from the vertical menu (when no project is open)

### Supported Import Formats

| Format | What's Imported |
|--------|-----------------|
| `.json` / `.idm` | Full project (BPMN + all data) |
| `.xml` (idmXML) | Header, Use Case, ERs, embedded BPMN |
| `.bpmn` | BPMN diagram only |

### idmXML Import

When importing idmXML:
- Header data is restored
- Exchange Requirements are restored
- **Embedded BPMN** is automatically restored (if present)
- If no BPMN is embedded, a default diagram is created

---

## 15. Keyboard Shortcuts

### BPMN Editor

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Space + Drag | Pan the canvas |
| Scroll | Zoom in/out |
| Delete | Delete selected element |

### General

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + S | Save project (Electron only) |
| Escape | Close current modal/panel |

---

## 16. Troubleshooting

### Common Issues

#### ER List is Empty After Loading

**Problem**: After loading a project, the ER list shows no items.

**Solution**:
- Ensure the BPMN diagram contains Data Objects
- For idmXML files, check that BPMN is embedded
- Try the Sample Project to verify functionality

#### Cannot Add Data Objects

**Problem**: Data Objects don't appear on the canvas.

**Solution**:
- Ensure you have a Pool/Lane on the canvas first
- Data Objects must be placed inside a Pool
- Try using the Auto Layout feature

#### bSDD Search Not Working

**Problem**: bSDD API search returns no results or errors.

**Solution**:
- Check your internet connection
- bSDD API requires network access
- Try again after a few moments (rate limiting)

#### Pasted Text Looks Different

**Problem**: Text pasted from external sources has different fonts.

**Solution**:
- The application now strips font formatting from pasted text
- If issues persist, try pasting as plain text (Ctrl/Cmd + Shift + V)

### Getting Help

- **Issues**: [github.com/ghanglee/IDMxPPM/issues](https://github.com/ghanglee/IDMxPPM/issues)
- **Contact**: glee@yonsei.ac.kr

---

## Appendix: ISO 29481 Quick Reference

### Document Status Codes

| Code | Status |
|------|--------|
| NP | New Proposal |
| WD | Working Draft |
| CD | Committee Draft |
| DIS | Draft International Standard |
| FDIS | Final Draft International Standard |
| IS | International Standard |

### ISO 22263 Project Stages

| Stage | Description |
|-------|-------------|
| Inception | Project initiation |
| Brief | Requirements definition |
| Design | Design development |
| Production | Construction |
| Handover | Project completion |
| Operation | Facility management |
| End-of-life | Demolition/disposal |

---

*IDMxPPM neo-Seoul is developed by Ghang Lee at the Building Informatics Group, Yonsei University.*

*BPMN Editor powered by [bpmn.io](https://bpmn.io)*
