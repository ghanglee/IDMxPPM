# mvdXML–IDM Mapping Reference

Bi-directional mapping between **mvdXML 1.1** (Model View Definition, buildingSMART) and **IDM** (Information Delivery Manual, ISO 29481).

---

## 1. Overview

mvdXML and IDM both define information exchange requirements for IFC-based BIM workflows, but they serve different purposes and operate at different levels of abstraction:

| Aspect | IDM (ISO 29481) | mvdXML 1.1 (buildingSMART) |
|--------|-----------------|---------------------------|
| Focus | Process & exchange workflow | IFC model validation rules |
| Scope | Who sends what to whom, when, and why | Which IFC entities and properties must be present, with what values |
| Deliverable | Process map (BPMN) + Exchange Requirements | Machine-readable MVD for IFC model checkers |
| Granularity | Use-case level with Information Units | Per-entity ConceptTemplates with TemplateRules and predicate constraints |
| IFC binding | Optional (via external element mappings) | Strictly IFC-bound with entity/attribute paths |
| Value constraints | Free-text in IU constraints field | Structured: `[Size]`, `[Exists]`, `[Type]`, `[Value]`, regex, comparison operators |
| Cardinality | Not structured | `[Size] == 1`, `[Size] >= 1`, etc. per rule |
| Conjunctive binding | No formal mechanism | Single `ConceptRoot` binds all `Concepts` against one root entity (AND semantics) |
| Reuse | Sub-ERs, ER import/export | `SubTemplates` for reusable rule fragments |

IDMxPPM supports bi-directional conversion: importing mvdXML creates a structured IDM skeleton, and exporting IDM to mvdXML produces a valid mvdXML 1.1 file. A faithful **round-trip** (import → export) preserves the original mvdXML structure verbatim via stored raw XML blobs.

---

## 2. mvdXML 1.1 Schema Structure

mvdXML uses the buildingSMART namespace `http://buildingsmart-tech.org/mvd/XML/1.1`:

```
mvdXML  (@uuid, @name, @version, @status, @copyright, @author)
├── Templates
│   └── ConceptTemplate[]  (@uuid, @name, @applicableSchema, @applicableEntity)
│       ├── Definitions → Definition → Body (lang="en")
│       ├── Rules
│       │   └── AttributeRule[]  (@RuleID, @AttributeName)
│       │       └── EntityRules
│       │           └── EntityRule[]  (@RuleID, @EntityName)
│       │               ├── AttributeRules
│       │               │   └── AttributeRule[]  (recursive)
│       │               └── References
│       │                   └── Template[]  (@ref)  ← inline sub-template
│       └── SubTemplates
│           └── ConceptTemplate[]  (recursive)
└── Views
    └── ModelView  (@uuid, @name, @applicableSchema, @version, @status, @author)
        ├── Definitions → Definition → Body
        ├── ExchangeRequirements
        │   └── ExchangeRequirement[]  (@uuid, @name, @applicability)
        │       └── Definitions → Definition → Body
        └── Roots
            └── ConceptRoot[]  (@uuid, @name, @applicableRootEntity)
                ├── Definitions → Definition → Body
                └── Concepts
                    └── Concept[]  (@uuid, @name)
                        ├── Definitions → Definition → Body
                        ├── Template  (@ref)  ← references ConceptTemplate uuid
                        ├── TemplateRules  (@operator)
                        │   ├── TemplateRule[]  (@Parameters)
                        │   └── TemplateRules[]  (nested, recursive)
                        └── Requirements
                            └── Requirement[]
                                (@applicability, @requirement, @exchangeRequirement)
```

### TemplateRule Parameters Syntax

Parameters are a space-separated conjunction of predicates:

| Qualifier | Example | Meaning |
|-----------|---------|---------|
| `[Value]='...'` | `PsetName[Value]='Pset_WallCommon'` | Exact string match |
| `[Exists]=TRUE` | `Material[Exists]=TRUE` | Element must exist |
| `[Size] == N` | `HasProperties[Size] == 1` | Exactly N occurrences |
| `[Size] >= N` | `Items[Size] >= 1` | At least N occurrences |
| `[Type]=IfcX` | `NominalValue[Type]=IfcBoolean` | Type assertion |
| `[Value] > 'N'` | `NominalValue[Value] > '0.0'` | Numeric comparison |
| `=reg'...'` | `Name=reg'RAL.*'` | Regular expression |

---

## 3. idmXML 2.0 Schema Structure

idmXML uses the ISO namespace `https://standards.iso.org/iso/29481/-3/ed-2/en`:

```
idm  (@xmlns)
├── specId  (@guid, @shortTitle, @fullTitle, @idmCode, @documentStatus, @version)
├── authoring  (@copyright)
│   ├── changeLog[]  (@id, @changeDateTime, @changeSummary, @changedBy)
│   └── author[]  (@id)
│       ├── person  (@firstName, @lastName, @emailAddress, @affiliation)
│       └── organization  (@name, @uri)
├── uc  (Use Case)
│   ├── specId  (@guid, @shortTitle, @fullTitle, @idmCode, @documentStatus, @version)
│   ├── authoring
│   ├── summary
│   ├── aimAndScope
│   ├── language
│   ├── use  (@verb, @noun)
│   ├── actors → actor[]  (@name, @role, @uri)
│   └── targetPhases
│       ├── standardProjectStage[]
│       └── localProjectStage[]
├── bcm  (Business Context Map)
│   └── processMap  (@guid)
│       ├── diagram  (@notation, @filePath)
│       └── dataObjectAndEr[]  (@dataObjectId, @erRef)
└── er[]  (Exchange Requirement)  ← recursive tree
    ├── specId  (@guid, @name, @definition)
    ├── informationUnits
    │   └── informationUnit[]
    │       ├── @name, @dataType, @isMandatory, @definition
    │       ├── @examples, @constraints
    │       ├── correspondingExternalElements
    │       │   └── correspondingExternalElement[]  (@basis, @name, @description, @uri)
    │       └── subInformationUnits
    │           └── informationUnit[]  (recursive)
    ├── constraints
    ├── correspondingMvd  (@basis, @name)
    └── subEr[]  (recursive)
```

---

## 4. Import: mvdXML → IDM

### 4.1 Document-Level Mapping

| mvdXML Element / Attribute | IDM Element | Notes |
|---------------------------|-------------|-------|
| `mvdXML @uuid` | `headerData.idmGuid` | Direct |
| `mvdXML @name` | `headerData.shortTitle` | Direct |
| `mvdXML @copyright` | `headerData.copyright` | Direct |
| `mvdXML @version` | `headerData.version` | Direct |
| `mvdXML @author` | `headerData.authors[0]` | Parsed as "Family, Given (Org)" |
| `ModelView @uuid` | `headerData.ucGuid` | Per ISO 29481 correspondence |
| `ModelView @name` | `headerData.fullTitle`, `headerData.title` | Direct |
| `ModelView @version` | `headerData.version` (fallback) | When `mvdXML @version` absent |
| `ModelView @author` | `headerData.authors[1]` (deduplicated) | Added if different from `mvdXML @author` |
| `ModelView > Definitions > Body` | `headerData.aimAndScope`, `headerData.summary` | Direct |
| `ModelView @applicableSchema` | Determines `basis` for all IU ext. element mappings | via `SCHEMA_TO_BASIS` map |

### 4.2 Schema to IFC Basis Mapping

| mvdXML `@applicableSchema` | IDM External Element Basis |
|---------------------------|---------------------------|
| `IFC2X3` | `IFC 2x3` |
| `IFC4` | `IFC 4` |
| `IFC4X1` | `IFC 4x1` |
| `IFC4X2` | `IFC 4x2` |
| `IFC4X3`, `IFC4X3_ADD2` | `IFC 4x3 ADD2` |

### 4.3 Exchange Requirements → Metadata

`ExchangeRequirement` elements are **not** mapped to structural sub-ERs. They are preserved as metadata for round-trip fidelity:

| mvdXML Element | Stored in IDM | Notes |
|---------------|---------------|-------|
| `ExchangeRequirement @uuid` | `headerData._mvdExchangeRequirements[].uuid` | Verbatim for re-emission |
| `ExchangeRequirement @name` | `headerData._mvdExchangeRequirements[].name` | Verbatim |
| `ExchangeRequirement @applicability` | `headerData._mvdExchangeRequirements[].applicability` | `import`, `export`, or `both` |
| `ExchangeRequirement > Definitions > Body` | `headerData._mvdExchangeRequirements[].body` | Verbatim |
| *(count)* | `totalERs` (returned by importer) | Count of `ExchangeRequirement` elements |

### 4.4 ConceptRoot → ER Hierarchy

| mvdXML Element | IDM Element | Notes |
|---------------|-------------|-------|
| `ConceptRoot @uuid` | Root ER `guid` | Persistent across save/load |
| `ConceptRoot @name` | Root ER `name` (`er_${rootName}`) | `er_` prefix added |
| `ConceptRoot @applicableRootEntity` | Root ER `correspondingExternalElements[0].name` | `description: 'IFC Entity'` — signals exporter to reconstruct as ConceptRoot |
| `ConceptRoot > Definitions > Body` | Root ER `description` | Direct |
| Single `ConceptRoot` | Root ER = the `ConceptRoot` ER directly | No wrapper |
| Multiple `ConceptRoots` | Wrapped under a `ModelView` ER as sub-ERs | Wrapper name = `er_${viewName}` |

### 4.5 Concept → Sub-ER

Each `Concept` within a `ConceptRoot` becomes a sub-ER of the ConceptRoot ER:

| mvdXML Element | IDM Element | Notes |
|---------------|-------------|-------|
| `Concept @uuid` | Sub-ER `guid` | Persistent |
| `Concept @name` | Sub-ER `name` | Direct |
| `Concept > Definitions > Body` | Sub-ER `description` | With optional `DataType:` trailer stripped |
| `Concept > Template @ref` | Sub-ER `_mvdTemplateRef` | ConceptTemplate UUID for round-trip |
| `Concept > TemplateRules @operator` | Sub-ER `_mvdTopOperator` | `and` or `or` |
| `Concept > TemplateRules` (raw XML) | Sub-ER `_mvdTemplateRulesXml` | Verbatim for faithful round-trip |
| `Requirement @exchangeRequirement` | Sub-ER `_mvdExchangeRequirementUuid` | Links back to ExchangeRequirement |
| `Requirement @applicability` | Sub-ER `_mvdApplicability` | `import`, `export`, or `both` |
| `Requirement @requirement` | Sub-ER `isMandatory` | `mandatory` → `true` |

### 4.6 TemplateRules → Information Units

Each `TemplateRule @Parameters` string is parsed into one or more Information Units. The nesting of `<TemplateRules>` blocks is preserved via `subInformationUnits` of the preceding leaf IU ("attach to preceding leaf" rule):

| Parameter Pattern | IU Fields | Example |
|------------------|-----------|---------|
| `PsetName[Value]='X'` + `PropName[Value]='Y'` | `name = Y`, ext.elm = `X.Y` (IFC Property) | `PsetName[Value]='Pset_WallCommon' and PropName[Value]='FireRating'` |
| `NominalValue[Value] > 'N'` | `constraints = '> N'` | `NominalValue[Value] > '0.0'` |
| `NominalValue[Value] = 'X'` | `examples = 'X'` | `NominalValue[Value]='Concrete'` |
| `Key[Exists]=TRUE` | `isMandatory = true`, no constraint text | Existence check |
| `Key[Size] op N` | `constraints = 'count op N'` | `Items[Size] == 1` |
| `Key[Type]=IfcX` | `constraints = 'is IfcX'` | `NominalValue[Type]=IfcBoolean` |
| `Key=reg'...'` | `constraints = 'Pattern: ...'` | `Name=reg'RAL.*'` |
| `Entity.Attribute` (via `RuleID` → path map) | ext.elm = `Entity.Attribute` (IFC Attribute) | `IfcMaterial.Name` |
| Nested `<TemplateRules>` | `subInformationUnits` of preceding leaf IU | Conjunctive sub-condition |

### 4.7 Templates → Stored Verbatim

The entire `<Templates>...</Templates>` block is captured as a raw string:

| mvdXML Element | Stored in IDM | Purpose |
|---------------|---------------|---------|
| `<Templates>...</Templates>` | `headerData._mvdTemplatesSection` | Verbatim re-emission on export |
| `ConceptTemplate @uuid` | Referenced by `Concept._mvdTemplateRef` | Template-to-Concept linkage |
| `ConceptTemplate > Rules` (full tree) | Traversed to build `RuleID → IFC path` map | Resolves RuleIDs to IFC attribute paths |

---

## 5. Export: IDM → mvdXML

### 5.1 Three Export Modes

The exporter selects one of three modes based on the presence of round-trip metadata:

| Condition | Mode | Behavior |
|-----------|------|---------|
| `headerData._mvdTemplatesSection` exists AND `headerData._mvdExchangeRequirements.length > 0` | **New reconstructive** | Verbatim re-emission of Templates + ExchangeRequirements; ConceptRoots rebuilt from ER hierarchy with verbatim `_mvdTemplateRulesXml` |
| `headerData._mvdTemplatesSection` exists, no `_mvdExchangeRequirements` | **Old reconstructive** | Verbatim Templates; ExchangeRequirements reconstructed from sub-ERs; Concepts from sub-sub-ERs |
| Neither present | **Synthetic** | Generates Templates and ConceptRoots from IFC external element mappings on IUs |

### 5.2 Document-Level Mapping

| IDM Element | mvdXML Element | Notes |
|-------------|---------------|-------|
| `headerData.idmGuid` | `mvdXML @uuid` | Direct |
| `headerData.shortTitle` | `mvdXML @name`, `ModelView @name` | Direct |
| `headerData.copyright` | `mvdXML @copyright` | Omitted if empty |
| `headerData.version` | `mvdXML @version` | Omitted if empty |
| `headerData.status` | `mvdXML @status`, `ModelView @status` | IDM→mvdXML: NP→sample, WD/CD→proposal, DIS→recommended, IS→mandatory |
| `headerData.authors[0]` | `mvdXML @author` | Formatted as "FamilyName, GivenName (Affiliation)" |
| `headerData.ucGuid` | `ModelView @uuid` | Direct |
| `headerData.aimAndScope` | `ModelView > Definitions > Body` | Fallback: `aimScope`, `summary`, `fullTitle` |
| IFC basis from IU mappings | `ModelView @applicableSchema`, all template `@applicableSchema` | Most-voted schema wins |

### 5.3 ExchangeRequirements in Export

| Export Mode | ExchangeRequirements Source |
|------------|----------------------------|
| New reconstructive | Verbatim from `headerData._mvdExchangeRequirements[]` — UUIDs, names, applicability, bodies all preserved exactly |
| Old reconstructive / Synthetic | Derived from sub-ERs in the hierarchy: sub-ER `name` → `@name`, `description` → `Body`, `_mvdApplicability` → `@applicability`, sub-ER UUID → `@uuid` |

### 5.4 Round-Trip Export: ConceptRoot Reconstruction

| IDM Element | mvdXML Output | Trigger |
|-------------|--------------|---------|
| Root ER with entity ext.elm (`description: 'IFC Entity'`) | `ConceptRoot @applicableRootEntity` | Entity ext.elm present on ER |
| Root ER `name` (with `er_` prefix stripped) | `ConceptRoot @name` | `rName = er.name.replace(/^er_/, '')` |
| Root ER `guid` | `ConceptRoot @uuid` | Direct |
| Sub-ER `_mvdTemplateRulesXml` | `<TemplateRules>` (verbatim) | When field present; else reconstructed from IUs |
| Sub-ER `_mvdTemplateRef` | `<Template @ref>` | ConceptTemplate UUID |
| Sub-ER `_mvdExchangeRequirementUuid` | `<Requirement @exchangeRequirement>` | Links to ExchangeRequirement |
| Sub-ER `_mvdApplicability` | `<Requirement @applicability>` | Direct |
| `headerData._mvdTemplatesSection` | `<Templates>` (verbatim) | Entire block re-emitted, preserving all template nesting, RuleIDs, SubTemplates |

### 5.5 Synthetic Export: Template Generation

When no round-trip metadata exists, the exporter generates ConceptTemplates from IU external element mappings:

| IU Mapping Pattern | Generated ConceptTemplate | TemplateRule |
|-------------------|--------------------------|-------------|
| `Pset_X.PropName` (IFC property) | Single shared "Property Set Value" template (stable UUID `b1000001-...`) | `PsetName[Value]='Pset_X' and PropName[Value]='PropName'` |
| `Entity.Attribute` (IFC attribute) | One template per unique attribute name: `"{Attr} Attribute"` | No TemplateRules needed (attr baked into `AttributeRule`) |
| `IfcEntity` (entity only) | Used as `ConceptRoot @applicableRootEntity` (no Concept) | — |

The shared Pset template traversal path:
```
IsDefinedBy → IfcRelDefinesByProperties → RelatingPropertyDefinition
→ IfcPropertySet (PsetName) → HasProperties
→ IfcPropertySingleValue (PropName, NominalValue)
```

> **Warning — Synthetic Export Limitations**
>
> Synthetic output is semantically lossy compared to the original mvdXML in three ways:
>
> 1. **Wrong IFC traversal path**: The synthetic template always uses `IsDefinedBy → IfcRelDefinesByProperties → IfcPropertySet`. If the original file used a different path (e.g., `IfcMaterial.HasProperties → IfcMaterialProperties`), the synthetic output will fail IFC models that satisfy the original.
>
> 2. **No cardinality or existence constraints**: Original TemplateRules often include `[Size] == 1` or `[Exists]=TRUE` predicates. Synthetic mode emits only `PsetName[Value]='X' and PropName[Value]='Y'` — a looser check that accepts extra occurrences.
>
> 3. **No value predicates**: Constraints like `NominalValue[Value] > '0.0'` stored in IU `constraints` fields are re-emitted in synthetic mode, but complex predicates that were not captured in the original import (e.g., nested type checks, multi-level `[Size]` checks) are silently dropped.
>
> 4. **Independent ConceptRoots**: If the original file used a single ConceptRoot binding multiple Concepts conjunctively against one root entity, synthetic mode may produce multiple independent ConceptRoots (one per entity) — weakening the binding semantics.
>
> For complex validation rules, author mvdXML directly and import it into IDM for round-trip preservation.

---

## 6. Round-Trip Fidelity

When an mvdXML file is imported with IDMxPPM v1.4.0+ and then re-exported to mvdXML, the following are preserved verbatim:

| Element | Preserved? | Mechanism |
|---------|:----------:|-----------|
| `ConceptTemplate` tree (all nesting, RuleIDs, SubTemplates) | Yes | `_mvdTemplatesSection` raw string re-emitted |
| `ExchangeRequirement` UUIDs, names, applicability | Yes | `_mvdExchangeRequirements` array re-emitted |
| `ConceptRoot` UUID, name, `applicableRootEntity` | Yes | Root ER `guid`, entity ext.elm |
| `Concept` UUID, name | Yes | Sub-ER `guid`, `name` |
| `TemplateRules` block (operator, nesting, all Parameters) | Yes | `_mvdTemplateRulesXml` verbatim string |
| `Requirement @applicability` and `@exchangeRequirement` | Yes | `_mvdApplicability`, `_mvdExchangeRequirementUuid` |
| `Concept > Definitions > Body` | Yes | Sub-ER `description` |
| `ConceptRoot > Definitions > Body` | Yes | Root ER `description` |
| IFC traversal paths (attribute chain depth, entity names) | Yes | `_mvdTemplatesSection` + `_mvdTemplateRulesXml` |
| Cardinality predicates (`[Size]`) | Yes | Verbatim in `_mvdTemplateRulesXml` |
| Value predicates (`[Value] > '0.0'`) | Yes | Verbatim in `_mvdTemplateRulesXml` |
| Type assertions (`[Type]=IfcBoolean`) | Yes | Verbatim in `_mvdTemplateRulesXml` |
| Regex patterns (`=reg'...'`) | Yes | Verbatim in `_mvdTemplateRulesXml` |
| Conjunctive binding (single ConceptRoot scope) | Yes | Root ER structure preserved |

**Not preserved (intentional):**

| Element | Why not preserved |
|---------|------------------|
| XML whitespace / indentation in Templates | Reformatted on re-emission |
| Namespace declarations in `_mvdTemplateRulesXml` | Stripped by regex to avoid duplicate declarations |
| `mvdXML @status` vocabulary | Re-mapped from IDM status; semantically equivalent |
| BPMN process map | IDM-specific; not representable in mvdXML |
| IDM Use Case actors, project phases | IDM-specific; stored in `.idm` only |
| IDM Information Unit `dataType` | Stored in Concept Body as `DataType: X` for partial recovery |

---

## 7. Structural Differences Requiring Design Decisions

### 7.1 ExchangeRequirement vs. Sub-ER

In mvdXML, `ExchangeRequirement` is a flat metadata list (sender/receiver delivery context). In IDM, sub-ERs are structural containers for IUs. IDMxPPM stores ExchangeRequirements as metadata (`_mvdExchangeRequirements`) rather than structural sub-ERs to avoid conflating two different hierarchies.

### 7.2 ConceptTemplate Reuse

mvdXML ConceptTemplates are designed for reuse across multiple Concepts and ConceptRoots via `@ref`. IDM has no equivalent reuse mechanism — each Concept is self-contained in its sub-ER. On import, template reuse is reflected in multiple sub-ERs sharing the same `_mvdTemplateRef`; on export, the verbatim `_mvdTemplatesSection` preserves the original template definition.

### 7.3 Nested TemplateRules

Nested `<TemplateRules>` (e.g., an outer `and` group containing inner `or` sub-groups) represent conjunctive/disjunctive predicate trees. IDM Information Units are a flat list with optional `subInformationUnits`. The importer uses the "attach to preceding leaf" rule: a nested `<TemplateRules>` block attaches its IUs as `subInformationUnits` of the last leaf IU in the enclosing group. This preserves the nesting depth in the IDM view; verbatim `_mvdTemplateRulesXml` ensures exact reconstruction on export.

### 7.4 Single ConceptRoot Rule

IDMxPPM enforces a single top-level ER per idmXML specification. When an mvdXML file has multiple `ConceptRoot` elements, the importer wraps them under a `ModelView` ER (named `er_${modelViewName}`). On re-export, this wrapper ER contains sub-ERs with entity ext.elms, which the exporter identifies as ConceptRoot ERs and emits as separate `<ConceptRoot>` elements.

---

## 8. Internal IDM Fields Used for Round-Trip

These fields are stored in IDM project data (`.idm` file) but have no idmXML 2.0 representation. They are prefixed with `_mvd` to distinguish them from standard IDM data:

| Field | Location | Purpose |
|-------|----------|---------|
| `_mvdTemplatesSection` | `headerData` | Raw `<Templates>...</Templates>` XML block |
| `_mvdExchangeRequirements` | `headerData` | Array of `{uuid, name, applicability, body}` |
| `_mvdTemplateRef` | Sub-ER | ConceptTemplate UUID referenced by this Concept |
| `_mvdTopOperator` | Sub-ER | Top-level TemplateRules `@operator` (`and` or `or`) |
| `_mvdTemplateRulesXml` | Sub-ER | Raw `<TemplateRules>...</TemplateRules>` XML block |
| `_mvdExchangeRequirementUuid` | Sub-ER | UUID of the ExchangeRequirement this Concept links to |
| `_mvdApplicability` | Sub-ER | Concept's `@applicability` value |
| `_mvdParams` | Information Unit | Original `@Parameters` string from the `TemplateRule` |

> **Note:** These fields are only present in `.idm` project files saved after v1.4.0. Loading an `.idm` file saved with an earlier version will fall back to synthetic export mode.

---

## 9. Comparison: mvdXML vs. IDS Import

Both mvdXML and IDS can be imported into IDM as model-validation-focused formats, but they differ significantly:

| Aspect | mvdXML Import | IDS Import |
|--------|--------------|-----------|
| Source standard | buildingSMART mvdXML 1.1 | buildingSMART IDS 1.0 |
| Round-trip fidelity | Full (verbatim Templates + TemplateRules) | No (one-directional) |
| Template reuse | Yes (`ConceptTemplate`, `SubTemplates`) | No |
| Constraint types | `[Size]`, `[Exists]`, `[Type]`, `[Value]`, `=reg'...'`, comparison operators | patterns, enumerations, ranges via XML Schema restrictions |
| IU hierarchy | From nested `TemplateRules` ("attach to preceding leaf") | From requirement types under each specification |
| ER structure | ConceptRoot → Concept → IUs (3-level) | Specification → Requirement → IUs (3-level) |
| ExchangeRequirements | Preserved as metadata | Not applicable |
| BPMN process map | Not provided (blank canvas) | Not provided (blank canvas) |

---

*This document describes the mvdXML–IDM mapping as implemented in IDMxPPM neo-Seoul v1.4.0.*
