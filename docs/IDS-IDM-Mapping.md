# IDS–IDM Mapping Reference

Mapping between **IDS** (Information Delivery Specification, buildingSMART) and **IDM** (Information Delivery Manual, ISO 29481).

---

## 1. Overview

IDS and IDM are complementary buildingSMART/ISO standards for defining information exchange requirements in the AEC industry:

| Aspect | IDM (ISO 29481) | IDS (buildingSMART) |
|--------|-----------------|---------------------|
| Focus | Process & exchange workflow | Model validation requirements |
| Scope | Who sends what to whom, when, and why | What properties, attributes, and classifications must be present in an IFC model |
| Deliverable | Process map (BPMN) + Exchange Requirements | Machine-readable validation rules |
| Granularity | Use-case level with Information Units | Per-entity specification with property/attribute requirements |
| Relationship to IFC | References IFC entities via external mappings | Directly targets IFC entities and versions |

IDMxPPM supports importing IDS files to create a skeleton IDM specification, providing a bridge from validation-focused IDS to process-focused IDM authoring.

---

## 2. IDS Schema Structure

IDS follows the buildingSMART schema at `http://standards.buildingsmart.org/IDS/1.0/ids.xsd`:

```
ids:ids
├── ids:info
│   ├── ids:title
│   ├── ids:description
│   ├── ids:copyright
│   ├── ids:date
│   ├── ids:milestone
│   └── ids:author
└── ids:specifications
    └── ids:specification[]  (@ifcVersion, @name, @instructions)
        ├── ids:applicability  (@minOccurs, @maxOccurs)
        │   ├── ids:entity → ids:name → ids:simpleValue
        │   ├── ids:predefinedType
        │   ├── ids:material
        │   └── ids:classification
        └── ids:requirements
            ├── ids:property  (@dataType, @uri)
            │   ├── ids:propertySet → ids:simpleValue
            │   ├── ids:baseName → ids:simpleValue
            │   └── ids:value → simpleValue | xs:restriction
            ├── ids:attribute
            │   ├── ids:name → ids:simpleValue
            │   └── ids:value
            ├── ids:classification
            │   ├── ids:value
            │   └── ids:system
            ├── ids:material
            │   └── ids:value
            └── ids:partOf  (@relation)
                └── ids:entity
```

### Value Constraints

IDS values support multiple constraint types via XML Schema restrictions:

| Constraint Type | XML Element | Example |
|----------------|-------------|---------|
| Simple value | `<ids:simpleValue>` | `"30"` |
| Pattern (regex) | `<xs:pattern>` | `"RAL.*"` |
| Enumeration | `<xs:enumeration>` | `"DIN Links"`, `"DIN Rechts"` |
| Range | `<xs:minExclusive>`, `<xs:maxExclusive>` | `> 0.5 and < 2.1` |
| Documentation | `<xs:annotation><xs:documentation>` | Human-readable explanation |

---

## 3. Import: IDS → IDM

### 3.1 Element Mapping

| IDS Element | IDM Element | Mapping Notes |
|-------------|-------------|---------------|
| `info > title` | `headerData.fullTitle`, `headerData.shortTitle` | Direct |
| `info > description` | `headerData.summary`, `useCaseData.aimScope` | Direct |
| `info > copyright` | `headerData.copyright` | Direct |
| `info > date` | `headerData.creationDate` | Direct |
| `info > milestone` | `useCaseData.targetPhases.iso22263` | Keyword-matched to ISO 22263 stages |
| `info > author` | `useCaseData.actors[0]` | Added as actor with role "Author" |
| `specification` | **Parent IU** (dataType: Structured) under root ER | One parent IU per IDS specification |
| `specification @name` | Parent IU name | Direct (e.g., "Structural safety") |
| `specification @instructions` | Parent IU definition | Direct |
| `specification @ifcVersion` | IU external element mapping basis | Mapped via `IFC_VERSION_MAP` |
| `applicability > entity` | Parent IU definition | "Applies to: IfcBeam" |
| `applicability > predefinedType` | Parent IU definition | "PredefinedType: GIRDER" |
| `applicability > material` | Parent IU definition | Applicability context |
| `applicability > classification` | Parent IU definition | Applicability context |

### 3.2 Requirement Types → Information Units

Each requirement type in IDS maps to an Information Unit:

#### Property Requirements

| IDS Element | IDM Element | Notes |
|-------------|-------------|-------|
| `property > propertySet > simpleValue` | IU external mapping (Pset part) | e.g., "Pset_WallCommon" |
| `property > baseName > simpleValue` | IU name | e.g., "FireRating" |
| `property @dataType` | IU dataType | Mapped via `IFC_DATA_TYPE_MAP` |
| `property @uri` | IU external mapping description | bSDD/IFC reference URI |
| `property > value (simple)` | IU examples | Simple expected value |
| `property > value (pattern)` | IU constraints | "Pattern: RAL.*" |
| `property > value (enumeration)` | IU constraints | "Allowed values: DIN Links, DIN Rechts" |
| `property > value (range)` | IU constraints | "Range: > 0.5 and < 2.1" |
| `property > value > annotation` | IU constraints | Human-readable documentation appended |

External element mapping format: `{basis}.{Pset_Name}.{PropertyName}` (e.g., `IFC 4x3 ADD2 / Pset_ConcreteElementGeneral.ExposureClass`)

#### Attribute Requirements

| IDS Element | IDM Element | Notes |
|-------------|-------------|-------|
| `attribute > name` | IU name | e.g., "Name" |
| `attribute > value` | IU examples/constraints | Value restrictions |

External mapping: `{EntityName}.{AttributeName}` with description "IFC Attribute"

#### Classification Requirements

| IDS Element | IDM Element | Notes |
|-------------|-------------|-------|
| `classification > system` | IU name | "Classification ({system})" |
| `classification > value` | IU examples/constraints | Classification code |

External mapping: basis "Other", name = system name

#### Material Requirements

| IDS Element | IDM Element | Notes |
|-------------|-------------|-------|
| `material > value` | IU name "Material" | Material requirement |
| `material > value` | IU examples/constraints | Material name or pattern |

External mapping: `{EntityName}.Material`

#### PartOf Requirements

| IDS Element | IDM Element | Notes |
|-------------|-------------|-------|
| `partOf @relation` | IU name | "PartOf ({parent entity})" |
| `partOf > entity` | IU definition | "Must be part of {parent}" |

External mapping: parent entity name with relation description

### 3.3 ER Hierarchy Structure

Each IDS `<specification>` maps to a **parent IU with dataType "Structured"** under a single root ER. The parent IU represents the IFC entity/object type from the specification's applicability, and each requirement becomes a **sub-IU** nested under that parent.

```
Root ER: "er_{IDS title}"
  ├── IU: "{specification @name}" (Structured)  ← parent IU, one per IDS specification
  │     ├── Sub-IU: "{baseName}"                ← from property requirement
  │     │     ├── dataType: mapped from @dataType
  │     │     ├── constraints: from value restrictions
  │     │     └── External Mapping: "{Pset}.{Property}" (basis: IFC 2x3/4x3)
  │     ├── Sub-IU: "{attribute name}"          ← from attribute requirement
  │     ├── Sub-IU: "Classification ({system})" ← from classification requirement
  │     ├── Sub-IU: "Material"                  ← from material requirement
  │     └── Sub-IU: "PartOf ({parent})"         ← from partOf requirement
  ├── IU: "{specification @name}" (Structured)
  │     └── ...
  └── ...
```

### 3.4 IFC Version Mapping

| IDS ifcVersion | IDM External Element Basis |
|---------------|---------------------------|
| `IFC2X3` | IFC 2x3 |
| `IFC4` | IFC 4x3 ADD2 |
| `IFC4X3` | IFC 4x3 ADD2 |
| `IFC4X3_ADD2` | IFC 4x3 ADD2 |
| `IFC4X3_ADD1` | IFC 4x3 ADD2 |
| Multiple (e.g., `IFC2X3 IFC4`) | Highest version used |

### 3.5 IFC Data Type Mapping

| IFC Data Type | IDM Data Type |
|--------------|---------------|
| IFCTEXT, IFCLABEL, IFCIDENTIFIER | String |
| IFCINTEGER, IFCCOUNTMEASURE | Numeric |
| IFCREAL, IFCLENGTHMEASURE, IFCAREAMEASURE | Numeric |
| IFCVOLUMEMEASURE, IFCMASSMEASURE | Numeric |
| IFCTHERMALTRANSMITTANCEMEASURE | Numeric |
| IFCPOSITIVELENGTHMEASURE, IFCPLANEANGLEMEASURE | Numeric |
| IFCFORCEMEASURE, IFCPRESSUREMEASURE | Numeric |
| IFCBOOLEAN, IFCLOGICAL | Boolean |
| IFCDATETIME, IFCDATE, IFCTIME, IFCTIMESTAMP | Date/Time |
| Other/Unknown | String (default) |

### 3.6 Milestone Mapping

| IDS Milestone Keyword | ISO 22263 Phase |
|----------------------|----------------|
| inception | inception |
| brief | brief |
| design, preliminary | design |
| production, construction, manufact | production |
| handover | handover |
| operation, maintenance | operation |
| end-of-life, demolition | endOfLife |

Keywords are matched case-insensitively against the milestone text.

---

## 4. Export: IDM → IDS

IDM to IDS export is supported via the existing IDS exporter (`src/utils/idsExporter.js`). The export generates IDS XML from the ER hierarchy:

| IDM Element | IDS Element | Notes |
|-------------|-------------|-------|
| `headerData.shortTitle` | `info > title` | Direct |
| `headerData.fullTitle` | `info > description` | Direct |
| Parent IU (Structured) with IFC external mapping | `specification` | One per parent IU (object type) |
| Sub-IU name | `property > baseName` | Direct |
| Sub-IU external mapping (Pset.Property) | `property > propertySet` + `baseName` | Split on "." |
| Sub-IU dataType | `property @dataType` | Reverse-mapped to IFC types |
| Sub-IU constraints | `property > value` | Exported as `simpleValue` |

---

## 5. Comparison: IDS vs LOIN Import

Both IDS and LOIN can be imported into IDM, but they serve different purposes:

| Aspect | IDS Import | LOIN Import |
|--------|-----------|-------------|
| Source standard | buildingSMART IDS | EN 17412 / ISO 7817-1 |
| Primary purpose | Model validation rules | Information need specification |
| IFC binding | Strictly IFC-bound | Schema-agnostic |
| Object types | From `applicability > entity` | From `specificationPerObjectType > objectType` |
| Properties | From `requirements > property` | From `alphanumericInformationSpecification > property` |
| Value constraints | Rich (patterns, enums, ranges) | None |
| Geometric info | Not applicable | Detail level, dimensionality, appearance |
| Documentation | Not applicable | Required documents |
| ER naming | From `specification @name` | From `objectType @name` |
| IU mandatory | Always true (all requirements are mandatory) | Always true (all listed = required) |

---

## 6. Limitations

1. **IDS is IFC-only**: All IDS specifications target IFC entities. Non-IFC data cannot be represented in IDS.

2. **No round-trip for IDS import**: Unlike LOIN (which supports bi-directional round-trip), IDS import is primarily one-directional. The IDS export function generates IDS from IDM data but does not guarantee identical output to the original imported IDS.

3. **Applicability conditions**: IDS applicability conditions (material filters, classification filters, property-based filters) are captured as descriptive text in the parent IU definition. They are not structured data in IDM and cannot be exported back to IDS applicability rules.

4. **Value constraints**: IDS value restrictions (patterns, enumerations, ranges) are stored as text in IU constraints. They are preserved for documentation but not exported back as structured XML Schema restrictions.

5. **PartOf relationships**: IDS `partOf` requirements (spatial containment, aggregation) have no direct IDM equivalent. They are imported as descriptive IUs.

6. **minOccurs / maxOccurs**: IDS applicability cardinality (`minOccurs="0"` for optional vs `minOccurs="1"` for required) is noted in the description but not mapped to a specific IDM field.

7. **BPMN process map**: IDS has no process model. Importing IDS creates a blank BPMN canvas.

---

*This document describes the IDS–IDM mapping as implemented in IDMxPPM neo-Seoul v1.3.1.*
