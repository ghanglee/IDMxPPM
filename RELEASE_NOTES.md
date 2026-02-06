# IDMxPPM neo-Seoul — Release Notes

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
