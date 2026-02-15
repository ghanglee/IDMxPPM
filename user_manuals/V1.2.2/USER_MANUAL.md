# IDMxPPM neo-Seoul User Manual

**Version 1.2.2**

An Information Delivery Manual (IDM) Authoring Tool compliant with ISO 29481-1 and ISO 29481-3

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Main Interface](#3-main-interface)
4. [Creating a New Project](#4-creating-a-new-project)
5. [BPMN Process Editor](#5-bpmn-process-editor)
6. [Task Detail Panel](#6-task-detail-panel)
7. [Basic Information (Specification)](#7-basic-information-specification)
8. [Use Case Editor](#8-use-case-editor)
9. [Exchange Requirements](#9-exchange-requirements)
10. [Information Units](#10-information-units)
11. [External Element Mapping](#11-external-element-mapping)
12. [Sub-ERs](#12-sub-ers)
13. [Saving and Exporting](#13-saving-and-exporting)
14. [Server Connection](#14-server-connection)
15. [Server Browser](#15-server-browser)
16. [Validation](#16-validation)
17. [Importing Existing Files](#17-importing-existing-files)
18. [Keyboard Shortcuts](#18-keyboard-shortcuts)
19. [Troubleshooting](#19-troubleshooting)

---

## 1. Introduction

### What is IDMxPPM?

IDMxPPM (eXtended Process to Product Modeling) neo-Seoul is a desktop application for authoring Information Delivery Manuals (IDMs) according to ISO 29481 standards. It enables you to:

- Define BIM exchange requirements using BPMN 2.0 process diagrams
- Specify detailed information requirements for each data exchange
- Map requirements to external standards (IFC, bSDD, CityGML, etc.)
- Export specifications in ISO 29481-3 compliant idmXML format
- Collaborate via an optional self-hosted server with multi-user access

### What's New in v1.2.2

| Feature | Description |
|---------|-------------|
| **Task Detail Panel** | Click any BPMN task to edit its name and documentation in a side panel |
| **Actor-to-BPMN Linking** | Visual badges link actors to BPMN Pools/Lanes with bidirectional name sync |
| **Automatic Lane Creation** | Adding sub-actors to a Pool-linked actor automatically creates BPMN Lanes |
| **Actor Merge** | Link an actor to an already-linked Pool to merge actors together |
| **xPPM Full Import** | Complete legacy xPPM import including external BPMN diagrams and images |
| **idmXML v1.0 External References** | Auto-loads external BPMN and images when importing v1.0 idmXML files |
| **Sub-Actor Roles** | Sub-actors now support role fields, exported/imported via idmXML |
| **ER Import/Export** | Import and export individual ERs from the ER Hierarchy toolbar |
| **Example Figures** | Image upload support for the Examples field in Information Units |
| **idmXSD v2.0 Only Export** | Simplified export — all idmXML exports now use idmXSD v2.0 exclusively |
| **ISO Namespace** | Updated XML namespace to the official ISO URI |
| **Recursive ER Validation** | Validation now checks sub-ERs recursively; leaf ERs require at least one IU |
| **Unsaved Changes Prompt** | Users are prompted before navigating away from unsaved ER detail edits |
| **Improved bSDD Search UX** | Rotating hourglass with status message, better error handling |
| **OS Save Dialogs** | All export formats in Electron now use native OS save dialogs |

### Standards Compliance

| Standard | Description |
|----------|-------------|
| ISO 29481-1 | IDM Methodology and format |
| ISO 29481-3 | Data schema (idmXML / idmXSD 2.0) |
| ISO/IEC 19510 | Business Process Model and Notation (BPMN) |

### Supported Platforms

| Platform | File | Notes |
|----------|------|-------|
| macOS (Apple Silicon) | `IDMxPPM - Neo Seoul-arm64.dmg` | M1/M2/M3/M4 Macs |
| macOS (Intel) | `IDMxPPM - Neo Seoul-x64.dmg` | Intel-based Macs |
| Windows | `IDMxPPM - Neo Seoul Setup x.x.x.exe` | 64-bit Windows |
| Linux | `IDMxPPM - Neo Seoul-x.x.x.AppImage` | 64-bit Linux |

---

## 2. Getting Started

### Launching the Application

When you launch IDMxPPM, you'll see the **Startup Screen** with the following options:

| Option | Description |
|--------|-------------|
| **Blank Project** | Start with an empty BPMN canvas |
| **Sample Project** | Start with a pre-configured sample IDM specification |
| **Open Project** | Open an existing project file (.idm, .xml, .xppm, .bpmn) |
| **Open from Server** | Browse and load a spec from the connected server (visible when connected) |

### Supported File Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| IDMxPPM Project | `.idm` | Full project with BPMN diagram and all ER data |
| idmXML | `.xml` | ISO 29481-3 compliant export (includes embedded BPMN) |
| HTML Document | `.html` | Self-contained HTML with embedded images and BPMN (SVG) |
| ZIP Bundle | `.zip` | Archive containing idmXML, BPMN, images, and project data |
| Legacy xPPM | `.xppm` | Import from previous xPPM tool (header, ERs, use case, BPMN, images) |
| BPMN Diagram | `.bpmn` | BPMN 2.0 XML format (diagram only) |
| Exchange Requirement | `.erxml` | Individual ER for import/export |
| Server | (cloud) | Save/load specs to/from connected MongoDB server |

---

## 3. Main Interface

The main interface consists of several key areas:

### Interface Components

```
+------------------------------------------------------------------+
|  [Spec Name Bar]                              [Theme Toggle]     |
+----+-------------------------------------------------------------+
|    |                                                             |
| V  |  Content Pane    |   BPMN Editor      |   ER Panel /       |
| E  |  (toggleable)    |   (main workspace) |   Task Detail      |
| R  |                  |                    |   (on selection)   |
| T  |  - Specification |   BPMN canvas      |                    |
| I  |  - Use Case      |   with toolbar     |   ER details or    |
| C  |  - ER List       |                    |   Task properties  |
| A  |                  |                    |                    |
| L  |                  |                    |                    |
|    |                  |                    |                    |
| M  |                  |                    |                    |
| E  |                  |                    |                    |
| N  |                  |                    |                    |
| U  |                  |                    |                    |
+----+-------------------------------------------------------------+
| Status: [File Path] [ERs: N] [Library: N] [Server] [Validation] |
+------------------------------------------------------------------+
```

### Vertical Menu Bar

The left sidebar provides access to main functions:

| Icon | Function | Description |
|------|----------|-------------|
| Document | Specification | Open Basic Information panel |
| Flowchart | Use Case | Open Use Case editor |
| Data | Exchange Req | Open ER list panel |
| Check | Validate | Run project validation |
| Save | Save & Export | Export project to various formats |
| Server | Server | Open server connection modal |
| X | Close Project | Close current project |

The server icon shows a **green dot** when connected and authenticated.

### Theme Toggle

Click the sun/moon icon in the top-right corner to switch between **Light** and **Dark** themes.

### Status Bar

The status bar at the bottom shows:
- **File Path**: Current project file location
- **Dirty Indicator**: Asterisk (*) when unsaved changes exist
- **ER Count**: Number of Exchange Requirements
- **Library Count**: Number of library items
- **Server Badge**: "Server" when connected; "Server (synced)" when current spec is from server
- **Validation Status**: Shows "Valid" or error count

---

## 4. Creating a New Project

### Blank Project

1. Click **Blank Project** on the Startup Screen
2. An empty BPMN canvas appears with a start event
3. The Specification panel opens automatically

### Sample Project (GDE-IDM)

1. Click **Sample Project** on the Startup Screen
2. The **Graphical Data Exchange IDM** (GDE-IDM) sample loads
3. Pre-configured BPMN diagram with multiple actors and data objects
4. Complete header data and Exchange Requirements included
5. Use this as a reference for creating your own IDM specifications

### Open from Server

1. Connect to a server first (see [Section 14: Server Connection](#14-server-connection))
2. Click **Open from Server** on the Startup Screen
3. The Server Browser opens (see [Section 15: Server Browser](#15-server-browser))
4. Select a specification and click **Open**

---

## 5. BPMN Process Editor

The BPMN editor is the main workspace where you create your process map.

### Adding Elements

1. Use the palette on the left side of the canvas
2. Click an element type, then click on the canvas to place it
3. Or drag elements from the palette to the canvas

### Common BPMN Elements

| Element | Usage in IDM |
|---------|--------------|
| **Pool/Lane** | Represents actors (Sender, Receiver) |
| **Task** | Process activities (click to edit name and documentation) |
| **Data Object** | Exchange Requirements (double-click to edit) |
| **Gateway** | Decision points |
| **Message Flow** | Communication between pools |

### Working with Data Objects

Data Objects represent Exchange Requirements in IDM:

1. Add a Data Object from the palette
2. **Double-click** on the Data Object to open the ER Panel
3. Define the exchange requirement details

### Working with Tasks

Tasks represent process activities in the BPMN diagram:

1. Add a Task from the palette (Task, User Task, Service Task, etc.)
2. **Click** on the Task to open the Task Detail Panel on the right
3. Edit the task name and documentation
4. See [Section 6: Task Detail Panel](#6-task-detail-panel) for details

### Editor Toolbar

Located at the bottom of the BPMN editor:

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

---

## 6. Task Detail Panel

The Task Detail Panel allows you to edit the name and documentation (description) of BPMN tasks directly from the UI.

### Opening the Task Detail Panel

Click on any BPMN task element to open the panel on the right side of the interface. Supported task types:

| Task Type | Description |
|-----------|-------------|
| Task | Generic task |
| User Task | Task performed by a human |
| Service Task | Task performed by a service |
| Send Task | Task that sends a message |
| Receive Task | Task that receives a message |
| Manual Task | Task performed without automation |
| Business Rule Task | Task governed by business rules |
| Script Task | Task executed by a script |
| Call Activity | Reusable activity reference |
| Sub Process | Embedded sub-process |

### Editing Task Properties

The panel displays:
- **Task Type**: Shown as a label below the header (e.g., "UserTask", "ServiceTask")
- **Name**: Text input for the task name (also updates the label on the BPMN canvas)
- **Documentation**: Text area for a detailed task description

### Saving Changes

- Click the **Save** button to apply changes
- Use **Ctrl/Cmd + Enter** as a keyboard shortcut to save
- An "Unsaved" badge appears when changes are pending
- The Save button is disabled when there are no changes

### Panel Behavior

- **Mutual Exclusivity**: The Task Detail Panel and the ER Panel cannot be open at the same time. Opening one automatically closes the other.
- **Switching Tasks**: Click a different task while the panel is open to switch to that task's details.
- **Closing**: Click the **X** button or click on an empty area of the canvas to close the panel.

### Data Persistence

Task name and documentation are stored as standard BPMN 2.0 properties in the BPMN XML. They are automatically preserved through all save and export operations:
- IDM Project (.idm)
- idmXML (.xml)
- ZIP Bundle (.zip)
- BPMN Only (.bpmn)
- Server save

---

## 7. Basic Information (Specification)

Click the **Specification** icon in the vertical menu to open this panel.

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

### Revision History

Track document revisions:
1. **Creation Date**: Set automatically or manually
2. **Modification History**: Add entries with date and description

---

## 8. Use Case Editor

Click the **Use Case** icon to open this panel.

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

Actors represent the parties involved in the information exchange and are associated with BPMN swimlanes (Pools/Lanes).

#### Two-Line Layout

Each actor is displayed in a two-line layout:
- **Line 1**: Actor Name + Swimlane Badge + Remove button
- **Line 2**: Role (full-width text area)

#### Swimlane Badges

Each actor displays a badge indicating its BPMN association:

| Badge | Color | Meaning |
|-------|-------|---------|
| **Swimlane (Pool)** | Green | Actor is linked to a BPMN Pool |
| **Swimlane (Lane)** | Green | Sub-actor is linked to a BPMN Lane |
| **Manual** | Gray | Actor is not linked to any BPMN element (click to link) |

#### Linking Actors to BPMN Elements

To link an actor to a BPMN Pool or Lane:

1. Click the **Manual** badge on an unlinked actor
2. A **Link Modal** appears showing all available BPMN Pools and Lanes
3. Already-linked elements are grayed out with a "linked to..." label
4. Click on an available Pool or Lane to establish the link

#### Actor Merge

If you link an actor to a Pool that is already linked to another actor:

1. A **Merge Confirmation** dialog appears
2. **Merge**: The source actor is deleted, and its data (role, sub-actors) is merged into the target actor linked to that Pool
3. **Cancel**: The link operation is cancelled

#### Automatic Lane Creation

When you add sub-actors to an actor that is linked to a BPMN Pool:

- The first sub-actor addition splits the Pool into Lanes (one per sub-actor)
- Subsequent additions add new Lanes at the bottom of the Pool
- Lane names are automatically synced with sub-actor names

#### Bidirectional Name Sync

Actor names and BPMN element names stay in sync:

- Renaming an actor in the Use Case panel updates the Pool/Lane name on the BPMN canvas
- Renaming a Pool/Lane on the BPMN canvas updates the actor name in the Use Case panel
- Deleting a Pool from BPMN removes the linked actor (with confirmation dialog)
- Deleting a Lane from BPMN removes the linked sub-actor

#### Sub-Actor Roles

Sub-actors (associated with BPMN Lanes) can have their own role fields, just like main actors. Sub-actor roles are exported and imported via the `<subActor><classification>` element in idmXML.

### Target Project Phases

Select applicable project phases:
- **ISO 22263** stages (required): Inception, Brief, Design, Production, Handover, Operation, End-of-life
- **AIA B101** phases (optional)
- **RIBA Plan of Work** stages (optional)

### Additional Fields

- Language (ISO 639-1 codes)
- Benefits (with figure support)
- Limitations (with figure support)
- Keywords
- References
- Additional Description
- Preconditions
- Postconditions
- Triggering Events

---

## 9. Exchange Requirements

### ER Hierarchy

Click the **Exchange Req** icon to see the ER hierarchy in the Content Pane:

- **Single root ER** at the top level (enforced by the ER-first architecture)
- All other ERs are nested as sub-ERs
- Click an ER in the hierarchy to view it in the Individual ER pane

#### ER Hierarchy Toolbar

The ER Hierarchy in the Content Pane provides toolbar buttons:

| Button | Function |
|--------|----------|
| **Import ER** | Import an ER from an erXML file into the hierarchy |
| **Export ER** | Export the selected ER to an erXML file |

### Individual ER Pane

When an ER is selected, the Individual ER pane shows:
- The ER name and description
- Information Units in a tree table view
- Sub-ERs nested within

The root ER itself appears as the first row in the tree table and can be selected to edit its properties in the Detail Panel.

### ER Table Columns

| Column | Description |
|--------|-------------|
| Name | ER/IU name with tree indentation and icons |
| Data Type | Information Unit data type (dropdown) |
| Definition | IU definition (truncated in table, full in detail) |
| Mandatory | IU mandatory flag (checkbox) |
| Examples | IU examples (truncated) |
| Constraints | IU constraints indicator |
| Ext. Elm. | External element mapping count badge |

### ER Toolbar

| Button | Function |
|--------|----------|
| +ER | Add a new sub-ER |
| -ER | Delete selected ER |
| >ER | Nest ER as sub-ER of sibling above |
| Expand All | Expand all tree nodes |
| Collapse All | Collapse all tree nodes |
| Toggle BPMN | Hide/show BPMN editor to maximize ER workspace |

### ER Detail Panel

The Detail Panel at the bottom of the ER pane shows the properties of the selected item (ER, Sub-ER, or IU). The panel height is proportional (default 70% of the ER pane) and can be resized by dragging the resize handle.

### ER Examples

The root ER detail panel includes an **Examples** field with:
- Text area for example descriptions
- Image upload support for example figures

### Auto-Save

Changes are automatically saved as you type:
- **Saved**: All changes saved
- **Saving...**: Currently saving
- **Unsaved**: Pending changes

### Unsaved Changes Prompt

When you have unsaved changes in the ER Detail Panel and click on a different item in the tree table, a prompt appears asking whether to apply or discard the pending changes.

---

## 10. Information Units

Information Units define the specific data items required in an exchange.

### Adding Information Units

1. Click **+ IU** in the ER Panel toolbar
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
| Example Images | No | Upload reference images for examples |
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

### Example Images

Information Units support image uploads in the Examples field:
1. Click the **Upload** button in the Examples section of the IU detail panel
2. Select an image file (PNG, JPG, GIF, etc.)
3. The image appears as a thumbnail below the examples text
4. Images are embedded as base64 and exported with the project

---

## 11. External Element Mapping

Map information units to external standards and schemas.

### Adding Mappings

1. Click **+ Add Mapping** in an Information Unit
2. The default schema is **bSDD** (buildingSMART Data Dictionary)
3. Select a different schema from the dropdown if needed
4. Search or enter the element name

### Supported Schemas

| Schema | Search | Description |
|--------|--------|-------------|
| **bSDD** | Yes (API) | buildingSMART Data Dictionary — IFC 4.3 (default) |
| IFC 2x3 | Yes | Industry Foundation Classes 2x3 |
| IFC 4x3 ADD2 | Yes | IFC 4.3 Addendum 2 (current) |
| CityGML | Yes | City Geography Markup Language |
| UniFormat | Yes | Classification system |
| OmniClass | Yes | Classification system |
| MasterFormat | Yes | Classification system |
| Other | No | Custom schema (manual entry) |

### Search Mode

For searchable schemas:
1. Click the search button or type in the field
2. Results appear automatically as you type (debounced 300ms)
3. Select **Exact Match** or **Semantic Match**
4. Click a result to add the mapping
5. If an error occurs (e.g., timeout or network issue), an error message is displayed

#### bSDD Search UX

When searching the bSDD API:
- A rotating hourglass with "Connecting to bSDD server..." appears on the first search
- Timeout errors and cancellation errors are displayed with distinct messages
- Non-JSON API responses are handled gracefully

### Manual Entry (Other Schema)

For custom or unsupported schemas:
1. Select **Other** from the dropdown
2. Enter the **Standard name** (e.g., "COBie", "NBIMS")
3. Enter the **Element name**

---

## 12. Sub-ERs

Link related Exchange Requirements as Sub-ERs.

### Adding Sub-ERs

Click the **+ER** button in the ER toolbar:

### From Current IDM

1. Select the **Current IDM** tab
2. Choose an existing ER from the list
3. The ER is **moved** to become a sub-ER of the selected ER

### Import from erXML

1. Select the **Import erXML** tab
2. Click **Browse Files**
3. Select an `.erxml` or `.xml` file
4. The imported ER is added as a Sub-ER

---

## 13. Saving and Exporting

### Save & Export Dialog

Click the **Save & Export** icon in the vertical menu:

### Export Formats

| Format | Description |
|--------|-------------|
| **IDM Project (.idm)** | Full project file with all data and ER library |
| **idmXML (.xml)** | ISO 29481-3 compliant XML (idmXSD v2.0) with embedded BPMN and images |
| **HTML Document (.html)** | Self-contained HTML with embedded images and SVG BPMN |
| **ZIP Bundle (.zip)** | Archive with idmXML, BPMN, images, and project data |
| **BPMN Only (.bpmn)** | Process diagram only |
| **Save to Server** | Save/update spec on the connected server (requires authentication) |
| **XSLT Template** | Download default stylesheet for customization |

### idmXML Export

The idmXML format is fully compliant with ISO 29481-3 (idmXSD v2.0):
- Uses the official ISO namespace (`standards.iso.org/iso/29481/-3/ed-2/en`)
- BPMN diagram embedded in CDATA section
- Images (figures, examples) embedded as base64
- Persistent GUIDs for all elements (validated before export)
- Complete header, use case, and ER data
- Sub-actor roles preserved via `<classification>` elements

> **Note**: As of v1.2.2, only idmXSD v2.0 export is supported. The v1.0 export option has been removed. Import still supports both v1.0 and v2.0 with automatic version detection.

### HTML Export

Self-contained HTML document ideal for sharing and printing:
- BPMN diagram rendered as inline SVG (vector graphics)
- All images embedded as base64
- Printable to PDF via browser (Ctrl/Cmd + P)
- Supports custom XSLT stylesheets for formatting
- Download the default XSLT template to create custom styles
- Correctly renders v2.0 elements: author/person structure, change log dates, sub-ERs

### ZIP Bundle Export

Complete archive containing:
- `idmXML.xml` - ISO 29481-3 compliant XML
- `process-map.bpmn` - BPMN 2.0 diagram file
- `project.json` - Full project data
- `manifest.json` - Bundle metadata
- `images/` folder - All referenced images

### Save to Server

Save your IDM specification directly to the connected server:
1. Ensure you are connected and authenticated (see [Section 14](#14-server-connection))
2. Click **Save to Server** in the export dialog
3. The spec is created or updated on the server (tracked via `serverSpecId`)
4. The status bar shows "Server (synced)" after saving

### OS Save Dialogs (Electron)

In the desktop application, all export formats now use native OS save dialogs:
- You can choose the save location and filename
- Overwrite prompts are handled by the OS
- The default filename is based on the project's Short Title

### Quick Export

Use the toolbar buttons at the bottom of the BPMN editor:
- **SVG**: Vector image of the diagram
- **BPMN**: BPMN 2.0 XML file
- **PNG**: Raster image of the diagram

### Close with Save

When closing a project with unsaved changes:
1. A confirmation dialog appears with options: **Save**, **Don't Save**, **Cancel**
2. Choosing **Save** opens the Save & Export dialog
3. After the export completes, the project closes automatically

---

## 14. Server Connection

IDMxPPM can optionally connect to a self-hosted server for centralized spec storage and multi-user collaboration. The server is **fully optional** — the app works 100% offline with local file save/load.

### Prerequisites

Before connecting to a server, the server must be deployed. This requires:

| Prerequisite | Requirement | Notes |
|-------------|-------------|-------|
| **Docker Desktop** | v4.0+ (Engine 20+, Compose v2+) | Download from [docker.com](https://www.docker.com/products/docker-desktop/). Includes Docker Engine and Docker Compose. |
| **Operating System** | Linux, macOS, or Windows | Any OS that supports Docker |
| **RAM** | 1 GB minimum (2 GB recommended) | For MongoDB and the API server |
| **Disk** | 1 GB minimum | Plus storage for specifications |
| **Network** | HTTP/HTTPS access between client and server | Clients must be able to reach the server (same LAN, VPN, or public URL) |

> **Note:** If you prefer not to use Docker, you can install the server manually. This requires **Node.js 20+** and **MongoDB 7+** installed on the host machine. See the [API User Manual](../../docs/API_User_Manual.md) for manual deployment instructions.

### Connecting to a Server

1. Click the **Server** icon in the vertical menu bar
2. The **Server Connection Modal** opens

### Connection States

The modal has three states:

#### State 1: Not Connected

- Enter the **Server URL** (e.g., `http://localhost:3001`)
- Click **Connect**
- The app checks the server's health endpoint

#### State 2: Connected, Not Authenticated

After connecting, you'll see login and registration tabs:

**Login Tab:**
1. Enter your **Email** and **Password**
2. Click **Login**

**Register Tab:**
1. Enter **Email**, **Password**, **Given Name**, **Family Name**
2. Optionally enter **Organization**
3. Click **Register**
4. The first registered user automatically becomes an **admin**

#### State 3: Connected and Authenticated

Once logged in, the modal shows:
- **User avatar** (initials-based)
- **Name**, **Email**, **Organization**, and **Role**
- **Logout** button
- **Disconnect** button

### Connection Indicators

| Location | Indicator |
|----------|-----------|
| Vertical Menu Bar | Green dot on the server icon |
| Status Bar | "Server" badge; "Server (synced)" when current spec is from server |
| Startup Screen | "Open from Server" button appears |

### Auto-Reconnect

- The app performs a health check every 60 seconds
- Connection state is persisted in localStorage
- On app restart, the previous session is restored automatically

### User Roles

| Role | Description |
|------|-------------|
| **Admin** | Full access — can update and delete any spec. First registered user becomes admin. |
| **Editor** | Can create specs, update/delete own specs. Cannot modify others' specs. |
| **Viewer** | Can browse and open any spec. Can create and manage own specs. Cannot modify others'. |

---

## 15. Server Browser

The Server Browser lets you browse, search, and open IDM specifications stored on the server.

### Opening the Server Browser

- Click **Open from Server** on the Startup Screen, or
- Click **Browse Server** in the server connection modal

### Search and Filter

- **Full-text search**: Type in the search box to search by title or short title
- **Status filter**: Filter by document status (NP, WD, CD, DIS, IS)

### Sortable Columns

Click any column header to sort:

| Column | Description |
|--------|-------------|
| Title | Specification title |
| Status | Document status with color-coded badge |
| Version | Specification version |
| ERs | Number of Exchange Requirements |
| Author | Spec owner's name |
| Modified | Last modification date |

### Pagination

- 15 specs per page
- Navigate with Previous/Next buttons
- Page indicator shows current position

### Actions

| Action | Description |
|--------|-------------|
| **Open** | Load the spec into the local editor |
| **Delete** | Delete the spec from the server (owner or admin only) |

### Status Badges

| Status | Color | Meaning |
|--------|-------|---------|
| NP | Gray | New Proposal |
| WD | Blue | Working Draft |
| CD | Orange | Committee Draft |
| DIS | Purple | Draft International Standard |
| IS | Green | International Standard |

---

## 16. Validation

Validate your project against ISO 29481 requirements.

### Running Validation

1. Click the **Validate** icon in the vertical menu
2. The validation panel appears with results

### Validation Checks

The validator checks:
- Required header fields (title, status, etc.)
- ER definitions and structure
- Information unit requirements
- BPMN diagram structure
- **Recursive sub-ER validation** — Sub-ERs are validated recursively through the entire hierarchy
- **Leaf ER rule** — Only ERs without sub-ERs (leaf ERs) must have at least one Information Unit. ERs that compose sub-ERs are valid per ISO 29481-3 Clause 10.

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

## 17. Importing Existing Files

### Opening Files

1. Click **Open Project** on the Startup Screen, or
2. Use the **Open Project** option from the vertical menu (when no project is open)

### Supported Import Formats

| Format | What's Imported |
|--------|-----------------|
| `.idm` | Full project (BPMN + all data + ER library) |
| `.xml` (idmXML) | Header, Use Case, ERs, embedded BPMN, images |
| `.zip` (ZIP Bundle) | Complete project with all assets |
| `.xppm` (Legacy xPPM) | Header, Use Case, ERs, BPMN diagram, images |
| `.bpmn` | BPMN diagram only |

### xPPM Import (Legacy Format)

xPPM is the legacy format from a previous version of the IDM authoring tool. When importing xPPM:
- Header data (title, authors, version) is converted
- Use Case data (summary, aim/scope, actors with roles) is imported
- Exchange Requirements with Information Units are converted
- Actor roles are preserved from `<classification>` elements
- **BPMN diagram**: Automatically loaded from the `Diagram/` folder adjacent to the `.xppm` file (Electron only)
- **Images**: Automatically loaded from the `Image/` folder adjacent to the `.xppm` file and converted to embedded base64 (Electron only)
- **ER description figures**: Extracted from all `<description><image>` elements
- **IU example images**: Extracted from all `<description><image>` elements within `<examples>`
- Multiple top-level ERs trigger the Root ER Selection dialog

> **Note**: In the browser version, BPMN diagrams and images stored as separate files are not automatically loaded. Use the Electron desktop app for full xPPM import support.

### idmXML Import

When importing idmXML:
- Header data is restored
- Exchange Requirements are restored (including sub-actor roles)
- **Embedded BPMN** is automatically restored (if present)
- Base64-encoded images are extracted
- Supports both idmXSD v1.0 and v2.0 with automatic version detection
- If no BPMN is embedded, a default diagram is created
- **External references (v1.0)**: When importing v1.0 files that reference external BPMN diagrams and images (instead of embedding them), the app automatically attempts to load these files from the adjacent folders (Electron only)
- Auto-generated placeholder Information Units (for schema compliance) are skipped during import
- Multiple `<description>` elements are merged, and all images across descriptions are extracted

### ZIP Bundle Import

When importing a ZIP bundle:
- Project data is restored from `project.json`
- BPMN diagram loaded from multiple sources (project.json, .bpmn file, or embedded in idmXML)
- All images are restored from the `images/` folder
- ER library is preserved

---

## 18. Keyboard Shortcuts

### BPMN Editor

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Space + Drag | Pan the canvas |
| Scroll | Zoom in/out |
| Delete | Delete selected element |

### Task Detail Panel

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + Enter | Save task details |

### General

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + S | Save project (Electron only) |
| Escape | Close current modal/panel |

---

## 19. Troubleshooting

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
- Check your internet connection — bSDD API requires network access to `https://api.bsdd.buildingsmart.org`
- If you see a timeout error, try again after a few moments
- Ensure search terms are at least 2 characters long
- The app uses two bSDD endpoints with automatic fallback

#### Cannot Connect to Server

**Problem**: The server connection fails or times out.

**Solution**:
- Verify the server URL is correct (e.g., `http://localhost:3001`)
- Ensure the server is running (check with `docker-compose ps` or `curl http://your-server:3001/api/health`)
- Check that your network allows access to the server port
- If using Docker, ensure both MongoDB and the API containers are running

#### Login Fails

**Problem**: Cannot log in to the server.

**Solution**:
- Verify your email and password are correct
- If you forgot your password, contact your server administrator
- Check that the server is reachable (green connection status)
- If the server was recently restarted, your JWT token may have expired — try logging in again

#### Save to Server Fails

**Problem**: Cannot save a specification to the server.

**Solution**:
- Ensure you are authenticated (check for green dot on server icon)
- Verify you have the correct role permissions (editors and admins can save)
- If updating an existing spec, ensure you are the owner or an admin
- Check your network connection

#### xPPM Import Missing BPMN or Images

**Problem**: After importing an xPPM file, the BPMN diagram is empty or images are missing.

**Solution**:
- Use the Electron desktop app (not the browser version) for full xPPM import support
- Ensure the `Diagram/` and `Image/` folders are in the same directory as the `.xppm` file
- Check that the BPMN file referenced in the xPPM exists in the `Diagram/` folder
- Images should be in the `Image/` folder with the filenames referenced in the xPPM

#### Task Detail Panel Not Appearing

**Problem**: Clicking on a task does not open the Task Detail Panel.

**Solution**:
- Ensure you are clicking on a task element (not a gateway, event, or annotation)
- If the ER Panel is open, click on the task again — the ER Panel will close and the Task Detail Panel will open
- Check that the element is one of the supported task types (Task, User Task, Service Task, etc.)

#### Pasted Text Looks Different

**Problem**: Text pasted from external sources has different fonts.

**Solution**:
- The application strips font formatting from pasted text
- If issues persist, try pasting as plain text (Ctrl/Cmd + Shift + V)

### Getting Help

- **Issues**: [github.com/ghanglee/IDMxPPM/issues](https://github.com/ghanglee/IDMxPPM/issues)
- **Contact**: glee@yonsei.ac.kr
- **Server Documentation**: [API User Manual](../../docs/API_User_Manual.md)

---

## Appendix A: ISO 29481 Quick Reference

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

## Appendix B: Server Deployment Quick Reference

### Prerequisites

- **Docker Desktop** (v4.0+) — download from [docker.com](https://www.docker.com/products/docker-desktop/)
  - Includes Docker Engine and Docker Compose
  - Available for Linux, macOS, and Windows
- **Alternative (manual):** Node.js 20+ and MongoDB 7+ installed on the host machine

### Docker Deployment (Recommended)

```bash
cd server
cp .env.example .env    # Edit with your settings
docker-compose up -d    # Starts MongoDB + API server
```

To verify the server is running:

```bash
docker-compose ps                          # Check container status
curl http://localhost:3001/api/health      # Check health endpoint
```

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `MONGODB_URI` | `mongodb://localhost:27017/idmxppm` | Database connection |
| `JWT_SECRET` | `dev-secret-change-in-production` | Token signing (change in production!) |
| `JWT_EXPIRES_IN` | `7d` | Token expiration |
| `PORT` | `3001` | API server port |
| `CORS_ORIGINS` | `*` | Allowed origins |
| `ALLOW_OPEN_REGISTRATION` | `true` | Enable open registration |

For detailed server setup, see the [API User Manual](../../docs/API_User_Manual.md).

---

*IDMxPPM neo-Seoul is developed by Ghang Lee at the Building Informatics Group, Yonsei University.*

*BPMN Editor powered by [bpmn.io](https://bpmn.io)*
