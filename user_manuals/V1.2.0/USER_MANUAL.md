# IDMxPPM neo-Seoul User Manual

**Version 1.2.0**

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
13. [Server Connection](#13-server-connection)
14. [Server Browser](#14-server-browser)
15. [Validation](#15-validation)
16. [Importing Existing Files](#16-importing-existing-files)
17. [Keyboard Shortcuts](#17-keyboard-shortcuts)
18. [Troubleshooting](#18-troubleshooting)

---

## 1. Introduction

### What is IDMxPPM?

IDMxPPM (eXtended Process to Product Modeling) neo-Seoul is a desktop application for authoring Information Delivery Manuals (IDMs) according to ISO 29481 standards. It enables you to:

- Define BIM exchange requirements using BPMN 2.0 process diagrams
- Specify detailed information requirements for each data exchange
- Map requirements to external standards (IFC, bSDD, CityGML, etc.)
- Export specifications in ISO 29481-3 compliant idmXML format
- Collaborate via an optional self-hosted server with multi-user access

### What's New in v1.2.0

| Feature | Description |
|---------|-------------|
| **Server Backend** | Optional self-hosted Express.js + MongoDB server for centralized spec storage |
| **Multi-User Collaboration** | JWT-based authentication with role-based access control (viewer, editor, admin) |
| **Server Browser** | Searchable, sortable, paginated table for browsing specs from the server |
| **Save to Server** | Save/update IDM specifications directly to the connected server |
| **Open from Server** | Browse and load any spec from the server into the local editor |
| **Docker Deployment** | One-command server deployment with Docker Compose |
| **Linux Support** | Added AppImage build target for 64-bit Linux |

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
| Legacy xPPM | `.xppm` | Import from previous xPPM tool (header, ERs, use case) |
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

1. Connect to a server first (see [Section 13: Server Connection](#13-server-connection))
2. Click **Open from Server** on the Startup Screen
3. The Server Browser opens (see [Section 14: Server Browser](#14-server-browser))
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
| **Task** | Process activities |
| **Data Object** | Exchange Requirements (double-click to edit) |
| **Gateway** | Decision points |
| **Message Flow** | Communication between pools |

### Working with Data Objects

Data Objects represent Exchange Requirements in IDM:

1. Add a Data Object from the palette
2. **Double-click** on the Data Object to open the ER Panel
3. Define the exchange requirement details

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

## 6. Basic Information (Specification)

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

## 7. Use Case Editor

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

Actors are associated with BPMN swimlanes (Pools/Lanes):

- Named swimlanes appear automatically as actors
- Add actors with the **+ Add Actor** button
- Each actor has a Name and Role field

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

## 8. Exchange Requirements

### ER Hierarchy

Click the **Exchange Req** icon to see the ER hierarchy in the Content Pane:

- **Single root ER** at the top level (enforced by the ER-first architecture)
- All other ERs are nested as sub-ERs
- Click an ER in the hierarchy to view it in the Individual ER pane

### Individual ER Pane

When an ER is selected, the Individual ER pane shows:
- The ER name and description
- Information Units in a tree table view
- Sub-ERs nested within

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

### Auto-Save

Changes are automatically saved as you type:
- **Saved**: All changes saved
- **Saving...**: Currently saving
- **Unsaved**: Pending changes

---

## 9. Information Units

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

### Manual Entry (Other Schema)

For custom or unsupported schemas:
1. Select **Other** from the dropdown
2. Enter the **Standard name** (e.g., "COBie", "NBIMS")
3. Enter the **Element name**

---

## 11. Sub-ERs

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

## 12. Saving and Exporting

### Save & Export Dialog

Click the **Save & Export** icon in the vertical menu:

### Export Formats

| Format | Description |
|--------|-------------|
| **IDM Project (.idm)** | Full project file with all data and ER library |
| **idmXML (.xml)** | ISO 29481-3 compliant XML with embedded BPMN and images |
| **HTML Document (.html)** | Self-contained HTML with embedded images and SVG BPMN |
| **ZIP Bundle (.zip)** | Archive with idmXML, BPMN, images, and project data |
| **BPMN Only (.bpmn)** | Process diagram only |
| **Save to Server** | Save/update spec on the connected server (requires authentication) |
| **XSLT Template** | Download default stylesheet for customization |

### idmXML Export

The idmXML format is fully compliant with ISO 29481-3:
- BPMN diagram embedded in CDATA section
- Images (figures, examples) embedded as base64
- Persistent GUIDs for all elements
- Complete header, use case, and ER data

### HTML Export

Self-contained HTML document ideal for sharing and printing:
- BPMN diagram rendered as inline SVG (vector graphics)
- All images embedded as base64
- Printable to PDF via browser (Ctrl/Cmd + P)
- Supports custom XSLT stylesheets for formatting
- Download the default XSLT template to create custom styles

### ZIP Bundle Export

Complete archive containing:
- `idmXML.xml` - ISO 29481-3 compliant XML
- `process-map.bpmn` - BPMN 2.0 diagram file
- `project.json` - Full project data
- `manifest.json` - Bundle metadata
- `images/` folder - All referenced images

### Save to Server

Save your IDM specification directly to the connected server:
1. Ensure you are connected and authenticated (see [Section 13](#13-server-connection))
2. Click **Save to Server** in the export dialog
3. The spec is created or updated on the server (tracked via `serverSpecId`)
4. The status bar shows "Server (synced)" after saving

### Quick Export

Use the toolbar buttons at the bottom of the BPMN editor:
- **SVG**: Vector image of the diagram
- **BPMN**: BPMN 2.0 XML file
- **PNG**: Raster image of the diagram

---

## 13. Server Connection

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

## 14. Server Browser

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

## 15. Validation

Validate your project against ISO 29481 requirements.

### Running Validation

1. Click the **Validate** icon in the vertical menu
2. The validation panel appears with results

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

## 16. Importing Existing Files

### Opening Files

1. Click **Open Project** on the Startup Screen, or
2. Use the **Open Project** option from the vertical menu (when no project is open)

### Supported Import Formats

| Format | What's Imported |
|--------|-----------------|
| `.idm` | Full project (BPMN + all data + ER library) |
| `.xml` (idmXML) | Header, Use Case, ERs, embedded BPMN |
| `.zip` (ZIP Bundle) | Complete project with all assets |
| `.xppm` (Legacy xPPM) | Header, Use Case, ERs from legacy xPPM format |
| `.bpmn` | BPMN diagram only |

### xPPM Import (Legacy Format)

xPPM is the legacy format from a previous version of the IDM authoring tool. When importing xPPM:
- Header data (title, authors, version) is converted
- Use Case data (summary, aim/scope, actors) is imported
- Exchange Requirements with Information Units are converted
- **Note**: BPMN diagrams are stored separately in xPPM. If available, load the `.bpmn` file from the `Diagram/` folder after importing.

### idmXML Import

When importing idmXML:
- Header data is restored
- Exchange Requirements are restored
- **Embedded BPMN** is automatically restored (if present)
- Base64-encoded images are extracted
- Supports both idmXSD v1.0 and v2.0 with automatic version detection
- If no BPMN is embedded, a default diagram is created

### ZIP Bundle Import

When importing a ZIP bundle:
- Project data is restored from `project.json`
- BPMN diagram loaded from multiple sources (project.json, .bpmn file, or embedded in idmXML)
- All images are restored from the `images/` folder
- ER library is preserved

---

## 17. Keyboard Shortcuts

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

## 18. Troubleshooting

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
