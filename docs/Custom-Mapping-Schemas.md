# Custom mapping schemas (external element mapping list)

Status: implemented 2026-11-20 (uncommitted). Files: `src/utils/mappingSchemas.js`,
`src/components/ERPanel/MappingSchemaModal.jsx` + `.css`, changes in `ERPanel.jsx` and `App.jsx`.

## Problem

An information unit (IU) mapping (`correspondingExternalElement/@basis`, `@name`) can only use the
built-in schemas bSDD, IFC 2x3, IFC 4x3 ADD2, CityGML, UniFormat, OmniClass, MasterFormat, or *Other*
with a free-text standard name. Consequences:

- A basis that came from idmXML and is not built in (e.g. `BCF 3.0` in the Fire Safety and Defect
  Management samples) was shown as *bSDD*: the `<select>` fell back to its first option. Editing the
  row could silently turn it into bSDD.
- *Other* has to be retyped for every mapping, has no metadata (version, URI) and no element names, so
  it cannot be searched or checked for typos.

## What is needed (analysis)

| Need | Where in the code |
|---|---|
| One list of schema options that can grow | `SCHEMA_OPTIONS` was a module constant in `ERPanel.jsx`, used by two mapping editors (IU card, IU detail), two search dialogs, `executeSearch` and `normalizeSchema` |
| Keep idmXML unchanged | The generator writes `mapping.basis` (or `customBasis` for *Other*); the schema name must stay the basis string. No schema change in idmXSD |
| Project portability | `.idm` saves the whole `headerData`, so project metadata can live in `headerData.mappingSchemas` |
| Reuse across projects | No app-settings store exists; `localStorage` works in the browser and in Electron |
| Imports | Mappings from idmXML/IDS/LOIN may carry any basis; `normalizeMappingBases` (App.jsx) keeps unknown bases unchanged |
| Search and suggestions | `executeSearch` dispatches by schema; local schemas need a local search over an element list |
| Exporters | IDS/LOIN exporters key on IFC/bSDD names only, so custom bases are ignored there as before |

## Design

**Schema object** (what is stored):
`{ value, label, version?, uri?, description?, placeholder?, elements?: [{ name, description? }] }`.
`value` is the basis string written to idmXML.

**Four sources**, merged by `mergeSchemaOptions()` in this order (de-duplicated case- and
whitespace-insensitively): built-in → project → library → detected, with *Other* last.

| Source | Stored in | Purpose |
|---|---|---|
| built-in | code (`BUILTIN_SCHEMAS`) | unchanged behaviour, incl. bSDD API and IFC search |
| project | `headerData.mappingSchemas` → `.idm` | the schemas a project uses, with metadata and elements |
| library | `localStorage` key `xppm-neo-seoul.mappingSchemaLibrary.v1` | the user's own schemas, offered in every project |
| detected | derived from the ER hierarchy (`detectCustomBases`) | any non-built-in basis already used, e.g. after an idmXML import; no storage needed |

Choosing a library schema in a mapping row copies it into the project, so an `.idm` is self-contained.
A mapping stored as *Other* + `customBasis` = a known custom schema is shown as that schema
(`resolveMappingBasis`); export output is identical.

**UI**

- Every basis selector ends with *Other* and **+ Add schema…**. The latter opens *Add mapping schema*:
  start from a preset (BCF 3.0 with 120 element paths generated from the official BCF-XML 3.0 XSDs) or
  empty; name (validated against built-in and existing names), version, URI, description, element-name
  hint; an element list (one per line, `path | description`), which can be filled with
  **Import from XSD…** (`elementsFromXsd`: walks global elements, named/anonymous complex types,
  extensions, attribute refs and groups); option *Also save in my schema library*.
- The same dialog lists the custom schemas with their source, element count and usage count, with
  *Remove* (project), *Remove from library*, and *Describe…* for detected schemas.
- A custom schema with elements is searchable (local search in the existing search dialog, labelled
  *(custom)*) and the mapping name field offers its element names (`<datalist>`); picking a listed
  element copies its description.

**Not changed**: idmXSD/idmXML, parser, generator, IDS/LOIN exporters, existing built-in behaviour.

## Tests done

- Unit (Node + jsdom): `elementsFromXsd` on BCF markup/visinfo and idmXSD 2.0 (462 paths), search,
  name validation, merge order, element-list parsing, detection/usage on the Defect Management sample.
- UI (Chromium): detected `BCF 3.0` shown as such; add BCF 3.0 from preset; search and apply an element;
  save `.idm` (schema with 120 elements saved) and idmXML (basis `BCF 3.0`, valid against Rev 14);
  reopen `.idm` with an empty library (schema restored from project); XSD import; `vite build`.

## Possible next steps

- Edit an existing custom schema in the dialog (now: remove and add again).
- Warn on mapping names that are not in the element list of their schema (validation panel).
- Ship more presets (e.g. COBie 2.4 columns, LOIN, CityGML ADEs) from `src/data/schemas/`.
