# IDMxPPM neo-Seoul — Release Notes

## v1.2.2 (2026-02-13)

### Highlights

- **idmXSD v2.0 Only** — Removed v1.0 export support; all exports now use idmXSD v2.0 exclusively
- **ISO Namespace** — Updated XML namespace to the official ISO URI (`standards.iso.org/iso/29481/-3/ed-2/en`)
- **XSLT v2.0 Compliance** — Fixed HTML/PDF export stylesheet to correctly render v2.0 elements
- **Parser Fixes** — Fixed multiple import issues including shapeActorMap ordering, subActor parsing, and `ref` attribute handling

---

### Changes

#### Export: v1.0 Removed, v2.0 Standardized
- Removed the idmXML v1.0 export option from the Save & Export dialog
- Simplified export UI to show a single "idmXML (.xml)" option (always idmXSD 2.0)
- Removed `idmXsdVersion` parameter from `generateIdmXml()` — the function now always generates v2.0
- Updated XML namespace from `buildingsmart.org/IDM/idmXML/2.0` to `standards.iso.org/iso/29481/-3/ed-2/en`

#### UUID Validation
- Added `ensureUUID()` helper that validates existing GUIDs against the idmXSD uuid pattern before using them
- Invalid or missing GUIDs are automatically replaced with newly generated UUIDs
- Prevents malformed GUIDs from being written to exported idmXML files

#### XSLT Stylesheet (HTML Export)
- Updated namespace binding to `standards.iso.org/iso/29481/-3/ed-2/en` to match v2.0 output
- Fixed author section to read from nested `<author><person>` / `<organization>` child elements (v2.0 structure)
- Fixed creation date to read from `<changeLog @changeDateTime>` instead of removed `@creationDate`
- Fixed description selectors (Summary, Aim & Scope, Benefits, Limitations, ER) to use `@title` attribute
- Added sub-ER recursive rendering in the HTML output
- Removed preconditions/postconditions templates (not in idmXSD v2.0)

#### Parser Improvements (Import)
- Fixed `subActor` parsing: v2.0 uses direct attributes on `<subActor id="..." name="..."/>`, with legacy `<subActor><actor>` fallback
- Fixed `shapeActorMap` ordering bug: actor-to-BPMN-shape mappings were parsed after BCM but applied inside the UC block (which runs earlier), so they were never applied
- Fixed `shapeAndActor` link parsing: now reads `ref` attribute with `textContent` fallback for backward compatibility
- Fixed `dataObjectAndEr` link parsing: same `ref` attribute + `textContent` fallback
- Updated `isIdmXml()` to detect the new ISO namespace (`standards.iso.org/iso/29481`)
- Updated `detectIdmXmlVersion()` to recognize both old (`buildingsmart.org`) and new (`iso.org`) namespace URIs

---

### Compatibility

- **Import** — Both idmXSD v1.0 and v2.0 files are accepted (auto-detected)
- **Export** — idmXSD v2.0 only (v1.0 export removed)

---

## v1.2.1 (2026-02-13)

### Highlights

- **ER Import/Export in Hierarchy** — Import and export individual ERs directly from the ER Hierarchy toolbar
- **bSDD Search UX** — Improved feedback with rotating hourglass, "Connecting to bSDD server..." message, and better error handling
- **Example Figures** — Image upload support for the Examples field in Information Unit detail panel
- **Unsaved Changes Prompt** — Users are prompted to apply unsaved detail panel changes before navigating to a different item

---

### New Features

- Added Import ER and Export ER buttons to the ER Hierarchy toolbar in ContentPane
- Added figure support (exampleImages) to the Examples field in IU detail panel
- Improved bSDD search UX with rotating hourglass animation and "Connecting to bSDD server..." message on first search
- Distinguished timeout vs cancellation errors in bSDD search results
- Added guard against non-JSON API responses and non-iterable data from bSDD
- Added snapshot-based detection to prompt users to apply unsaved detail panel changes before navigating

---

## v1.2.0 (2026-02-09)

### Highlights

- **Server Backend** — Optional self-hosted Express.js + MongoDB server for centralized IDM specification storage
- **Multi-User Collaboration** — JWT-based authentication with role-based access control (viewer, editor, admin)
- **Server Browser** — Searchable, sortable, paginated table for browsing and opening specs from the server
- **Docker Deployment** — One-command deployment with Docker Compose (MongoDB 7 + Node.js 20)
- **Linux Support** — Added AppImage build target for 64-bit Linux

---

### New Features

#### Server Backend (`server/`)
- Express.js RESTful API with MongoDB 7 (Mongoose) for persistent spec storage
- JWT-based authentication with bcrypt password hashing (salt: 12)
- Role-based access control: viewer, editor, admin (first registered user becomes admin)
- Full CRUD for IDM specifications with auto-extracted metadata (title, status, version, ER count, language, tags)
- Full-text search on title/shortTitle, status filtering, pagination, and sorting
- Security: Helmet.js headers, CORS, rate limiting (200 req/15min general, 20 req/15min auth)
- 50MB JSON payload limit for base64-encoded images in projectData
- Docker multi-stage build (Node 20 Alpine) with Docker Compose for MongoDB + API
- Health check endpoint (`/api/health`) with database status monitoring
- MongoDB connection retry logic (max 5 retries, 3s delays)

#### Server Connection UI
- **ServerConnectionModal** — Three-state modal:
  1. Not connected: configure server URL
  2. Connected, not authenticated: login or register (tabbed)
  3. Connected and authenticated: view user info (avatar, name, email, org, role), logout, disconnect
- **ServerBrowser** — Full-featured spec browser modal:
  - Full-text search and status filter (NP, WD, CD, DIS, IS)
  - Sortable columns: Title, Status, Version, ER Count, Author, Modified Date
  - 15 specs per page with pagination
  - Open and delete actions per spec
  - Color-coded status badges
- **Connection Indicators**:
  - Green dot in Vertical Menu Bar when connected and authenticated
  - "Server" badge in status bar; "Server (synced)" when current spec is from server
  - "Open from Server" button on Startup Screen when connected

#### Client-Side Infrastructure
- **apiClient.js** — Centralized HTTP client with JWT auth, 30/60s timeouts, `ApiError`/`AuthError` classes, auto-clear token on 401
- **useServerConnection.js** — React hook managing connection state, auth, periodic health checks (60s), localStorage persistence for session restore
- **Save to Server** — New export format option; creates or updates spec on server (tracked via `serverSpecId`)
- **Open from Server** — Browse and load any spec from the server into the local editor

#### Documentation
- **API User Manual** (`docs/API_User_Manual.md`) — Comprehensive guide covering Docker/manual deployment, environment configuration, desktop app workflow, REST API reference, role permissions, security recommendations, backup/restore, and troubleshooting
- **Versioned User Manuals** — Moved to `user_manuals/V1.1.0/` with tutorial series

#### Build & Platform
- **Linux build** — Added `npm run build:linux` for AppImage output
- **macOS** — Continues to build both x64 (Intel) and arm64 (Apple Silicon) DMG/ZIP installers

---

### Technical Changes

#### Updated File Structure
```
src/
├── components/
│   ├── ServerBrowser/              (NEW)
│   └── ServerConnectionModal/      (NEW)
├── hooks/
│   └── useServerConnection.js      (NEW)
├── utils/
│   └── apiClient.js                (NEW)

server/                             (NEW - entire directory)
├── src/
│   ├── config/                     (db.js, env.js)
│   ├── controllers/                (authController.js, specsController.js)
│   ├── middleware/                  (auth.js, errorHandler.js)
│   ├── models/                     (User.js, IdmSpec.js)
│   ├── routes/                     (auth.js, specs.js, health.js)
│   └── index.js
├── Dockerfile
├── docker-compose.yml
└── package.json

docs/
└── API_User_Manual.md              (NEW)
user_manuals/V1.1.0/                (MOVED from docs/)
samples/xPPM-neo/                   (MOVED from xPPM/)
```

#### Configuration Changes
- `vite.config.js` — Added API proxy configuration for development
- `index.html` / `src/index.html` — Updated CSP `connect-src` for server API connectivity
- `electron/main.js` — Added IPC support for server-related operations
- `electron/preload.js` — Exposed additional APIs for server connectivity
- `package.json` — Updated dependencies

---

### Compatibility

- **Server** — Node.js 20+, MongoDB 7 (Docker recommended)
- **Desktop** — macOS (x64, arm64), Windows (x64), Linux (AppImage)
- **Server is fully optional** — The app works 100% offline with local file save/load; server adds collaborative features

---

### Known Issues

- Server real-time collaboration not yet implemented (single-user save/load only)
- Server spec versioning / diff tracking not yet available
- ER Library persistence across sessions not yet implemented
- Interaction Map (IM) and Transaction Map (TM) not implemented (ISO 29481-2)
- MVD linking not implemented
- Bidirectional actor sync with BPMN swimlanes not yet implemented

---

## v1.1.0 (2026-02-06)

### Highlights

- **ER-First Hierarchical Architecture** — Single root ER with unlimited nesting of sub-ERs, replacing the flat data-object-mapped model
- **Legacy xPPM Import** — Full import support for `.xppm` files from the previous xPPM authoring tool
- **Namespace-Safe idmXML Parser** — Complete rewrite of the XML parser to handle namespaced documents reliably
- **Enhanced Use Case Editor** — Project phase classifications, actor management, and section figures
- **bSDD API Integration** — Live search against the buildingSMART Data Dictionary for IFC 4.3 elements, now the default external mapping schema
- **Build-Time Version Injection** — App version sourced from `package.json` via Vite `define`, eliminating hardcoded version strings

---

### New Features

#### ER-First Architecture
- `erHierarchy` is now the single source of truth for all Exchange Requirements
- Single top-level (root) ER enforced per specification (ISO 29481-3 compliant)
- Unlimited nesting of sub-ERs with drag/indent/outdent operations
- BPMN Data Objects are optionally associated with ERs via `dataObjectErMap`
- Root ER's own Information Units are now correctly exported and saved

#### New UI Components
- **DataObjectERSelectModal** — When placing a Data Object on the BPMN canvas, users can select an existing ER or create a new one
- **RootERSelectionModal** — On import of projects with multiple top-level ERs, users choose a root ER or create one; preserves existing hierarchy
- **RootSwitchModal** — When outdenting a second-level ER, users can promote it to root (dissolve old root or keep it as a sub-ER)
- **FilePickerModal** — Improved file open dialog showing individual format options (IDM, idmXML, ZIP, xPPM, BPMN, erXML)

#### Legacy xPPM Import
- Full import of `.xppm` project files from the previous xPPM authoring tool
- Converts header data, authors, version history, use case information, and Exchange Requirements
- Parses BPMN diagram path references and maps data objects to ERs
- Handles image references and BOM-encoded XML files

#### Use Case Editor Enhancements
- **Project Phase Classifications** — ISO 22263 standard project stages (mandatory), with optional AIA B101 and RIBA Plan of Work classifications via `useClassifications.js`
- **Actor Roles** with automatic detection from BPMN swimlane names
- **Section Figures** — Image upload support for Summary, Aim & Scope, Benefits, and Limitations sections
- **Language** selection from full ISO 639-1 code list
- Optional fields: Keywords, References, Additional Description, Preconditions, Postconditions, Triggering Events

#### ER Panel Improvements
- Enter key triggers search in External Mapping name inputs
- Button label changed from "IU" to "+ IU" for clarity
- Sub-ER adding from current IDM specification (move operation) or external erXML import
- Auto-select of newly added sub-ERs in the Detail Panel

#### bSDD API Integration
- **bSDD is now the default** external mapping schema when adding new mappings
- Live search using `SearchInDictionary/v1` (primary) with `Class/Search/v1` fallback
- Results display IFC entity reference codes (e.g., "IfcDoor", "IfcWall") alongside descriptive names
- Error messages are shown in the search modal instead of crashing on failures (timeout, network errors)
- Content Security Policy (CSP) updated to allow `connect-src` to `https://api.bsdd.buildingsmart.org`

#### Build-Time Version Injection
- App version is sourced from `package.json` at build time via Vite `define`
- Build date is automatically generated as `YYYY-MM-DD` at build time
- Eliminates hardcoded version strings across StartupScreen, About dialog, and bundle exporter
- Single source of truth: change version only in `package.json`

#### Export Enhancements
- idmXML generator uses `erHierarchy` directly, preserving root ER Information Units
- ZIP bundle exporter updated to pass `erHierarchy` through to the XML generator
- HTML exporter improvements for embedded images and BPMN SVG rendering

---

### Bug Fixes

- **Fixed author/person name not loading from idmXML** — `querySelector` calls failed silently on namespaced XML documents; replaced with namespace-safe `localName`-based traversal throughout the entire parser
- **Fixed root ER Information Units lost on export** — Generator now reads directly from `erHierarchy[0]` instead of synthesizing a root ER from `dataObjectErMap`
- **Fixed change log not loading from idmXML** — Authoring section parsing converted to namespace-safe helpers
- **Fixed `localProjectStage` not parsed (v2.0)** — Added parsing for `localProjectStage` alongside legacy `localProjectPhase` (v1.0)
- **Fixed file picker not showing xPPM files** — Updated file filter to include `.xppm` extension
- **Fixed bSDD search returning no results** — `SearchInDictionary/v1` response path corrected from `data.classes` to `data.dictionary.classes`; dead `TextSearch/v2` fallback replaced with working `Class/Search/v1`
- **Fixed bSDD search blocked by CSP** — Added `connect-src https://api.bsdd.buildingsmart.org` to Content Security Policy in both `index.html` files
- **Fixed external mapping search crash on no results** — Added `mappingSearchError` state with graceful error display instead of component crash
- **Fixed version mismatch** — Startup screen and About dialog showed hardcoded `1.0.0` while `package.json` was `1.1.0`; now all use build-time injection

---

### Technical Changes

#### Namespace-Safe XML Parser (idmXmlParser.js)
The entire idmXML parser was rewritten to eliminate all `querySelector`/`querySelectorAll` calls (except for `parsererror` detection). This resolves a fundamental issue where Chromium's CSS selector engine fails on XML documents with default namespace declarations (`xmlns="idmXML/2.0"`).

New helper functions:
- `getFirstChild(parent, tagName)` — Find first direct child by `localName`
- `getDirectChildren(parent, tagName)` — Find all direct children by `localName`
- `findDescendant(parent, tagName)` — Recursive depth-first search for first match
- `findAllDescendants(parent, tagName)` — Recursive collection of all matches

Root element discovery changed from `xmlDoc.querySelector('idm')` to `xmlDoc.documentElement` with `localName` validation.

#### Updated File Structure
```
src/
├── components/
│   ├── DataObjectERSelectModal/   (NEW)
│   ├── FilePickerModal/           (NEW)
│   ├── RootERSelectionModal/      (NEW)
│   └── RootSwitchModal/           (NEW)
├── data/
│   └── useClassifications.js      (NEW)
├── utils/
│   ├── idmXmlParser.js            (MAJOR REFACTOR)
│   ├── idmXmlGenerator.js         (UPDATED)
│   ├── idmBundleExporter.js       (UPDATED)
│   ├── htmlExporter.js            (UPDATED)
│   └── xppmImporter.js            (NEW)
references/
└── idm schemas/                   (NEW - idmXSD v1.0 & v2.0 schemas)
```

#### Build Configuration
- `vite.config.js` — Added `define` block to inject `__APP_VERSION__` and `__BUILD_DATE__` from `package.json` at build time

#### Electron & Preload Updates
- `electron/main.js` — New IPC handlers for file system operations used by FilePickerModal and xPPM import
- `electron/preload.js` — Exposed additional file system APIs to the renderer process

---

### Compatibility

- **idmXSD v1.0** (namespace `idmXML/0.2`) — Import supported with automatic version detection
- **idmXSD v2.0** (namespace `idmXML/2.0`) — Full import and export support
- **xPPM format** (`.xppm`) — Import only (one-way conversion)
- **Platforms** — macOS (x64, arm64), Windows (x64)

---

### Known Issues

- ER Library persistence across sessions not yet implemented
- Interaction Map (IM) and Transaction Map (TM) not implemented
- MVD linking not implemented
- Bidirectional actor sync with BPMN swimlanes not yet implemented
