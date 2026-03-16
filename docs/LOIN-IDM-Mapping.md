# LOIN–IDM Mapping Reference

Bi-directional mapping between **LOIN** (Level of Information Need, EN 17412 / ISO 7817-1) and **IDM** (Information Delivery Manual, ISO 29481).

---

## 1. Overview

LOIN specifies **what information** is needed for specific object types at specific project milestones. IDM specifies **when, who, and why** information is exchanged through process models and exchange requirements. The two standards are complementary:

| Aspect | IDM (ISO 29481) | LOIN (EN 17412 / ISO 7817-1) |
|--------|-----------------|------------------------------|
| Focus | Process & exchange workflow | Information requirements per object type |
| Scope | Who sends what to whom, when, and why | What properties and geometry are needed |
| Deliverable | Process map (BPMN) + Exchange Requirements | Object-type specifications with properties |
| Granularity | Use-case level | Object-type level |

IDMxPPM supports bi-directional conversion between these formats, enabling users to start from either a process perspective (IDM) or an information requirements perspective (LOIN).

---

## 2. Supported LOIN Schema Variants

The LOIN standard has evolved through several editions, resulting in different XML schema variants in use across the industry. IDMxPPM's importer and exporter are designed to handle any LOIN XML file, regardless of which schema variant it follows. The three known variants are:

| Variant | Root Element | Namespace | Key Differences |
|---------|-------------|-----------|-----------------|
| **CEN 17412 (early draft)** | `<LOINSpecification>` | None | Inline properties with `<propertySet>` and `<property>` elements. Used in early implementations and tooling. |
| **EN 17412-3 (European standard)** | `<loin:LevelOfInformationNeed>` | `https://iso.org/2022/LOIN` | Uses `<Specification>`, `<SpecificationPerObjectType>`, `dt:` namespace for typed names/definitions. Inline object types and alphanumerical information. |
| **ISO 7817-3 (international standard)** | `<loin:LevelOfInformationNeed>` | `https://iso.org/2024/LOIN` | Same structure as EN 17412-3 but introduces external definition sections (`<ObjectTypes>`, `<AlphanumericalInformation>`) with cross-references resolved via `nodeID` attributes. This supports reuse of object type and property definitions across multiple specifications. |

The importer auto-detects the variant based on the root element:

- `<LOINSpecification>` → CEN 17412 parser
- `<LevelOfInformationNeed>` → EN 17412-3 / ISO 7817-3 parser (automatically resolves `nodeID` references when external definition sections are present)

The exporter generates LOIN XML in the CEN 17412 format (`<LOINSpecification>`), which is the most widely supported by existing tools.

---

## 3. Export: IDM → LOIN

### 3.1 Element Mapping

| IDM Element | LOIN Element | Mapping Notes |
|-------------|-------------|---------------|
| `headerData.idmGuid` | `LOINSpecification @globalId` | Direct — IDM GUID becomes LOIN specification ID |
| `headerData.shortTitle` | `LOINSpecification @name` | Direct |
| `headerData.fullTitle` | `<description>` | Direct |
| `useCaseData.actors[0].name` | `context @sendingActor` | First actor = sending actor |
| `useCaseData.actors[1].name` | `context @receivingActor` | Second actor = receiving actor |
| `useCaseData.aimScope` | `context @purpose` | Direct |
| `useCaseData.targetPhases.iso22263` | `context @informationDeliveryMileStone` | Selected phases joined with comma |
| Parent IUs (Structured) grouped by IFC entity | `<specificationPerObjectTypeList>` | One entry per distinct object type |
| IFC entity name (e.g., IfcDoor) | `objectType @name`, `@refToDataModelType` | From parent IU's external element mapping |
| IFC entity URL | `objectType @refToClassification` | Auto-generated from entity name |
| IFC parent (e.g., IfcBuildingElement) | `objectType > subTypeOf` | Looked up from `IFC_PARENT_MAP` |
| Sub-IU with Pset mapping | `propertySet > property` | Pset name from "Pset_X.PropName" format |
| Sub-IU without Pset mapping | Standalone `<property>` | Under `<properties>` (not in a propertySet) |
| `subIU.name` | `property @name` | Direct |
| `subIU.dataType` | `<dataType>` | Mapped via `DATA_TYPE_MAP` (see Section 5) |
| `subIU.correspondingExternalElements[].description` | `property @refToClassification` | bSDD or classification reference |

### 3.2 Grouping Algorithm

The export maps parent IUs (Structured) to LOIN object types and their sub-IUs to LOIN properties:

```
1. Walk erHierarchy recursively → collect parent IUs (dataType: Structured)
2. Each parent IU maps to one <specificationPerObjectType>:
   a. Parent IU name/external mapping → objectType
   b. Each sub-IU → property entry
   c. Sub-IUs with Pset external mappings → under <propertySet name="Pset_X">
   d. Sub-IUs without Pset mappings → standalone <property>
3. Non-Structured IUs with correspondingExternalElements → grouped by entity as before
4. IUs with NO external element mappings → skipped (count reported)
5. Generate one <specificationPerObjectTypeList> per entity group
```

### 3.3 Schema-Agnostic Support

LOIN is not bound to IFC. The exporter accepts external element mappings from any schema:

| Schema | objectType Naming | Notes |
|--------|------------------|-------|
| IFC 2x3 / IFC 4x3 ADD2 | Entity name (e.g., `IfcDoor`) | Includes `refToDataModelType` and `subTypeOf` |
| bSDD | Class name from API | Treated as IFC-adjacent |
| CityGML | Element name (e.g., `Building`) | No `refToDataModelType` |
| UniFormat / OmniClass / MasterFormat | Classification code + name | Stored in `objectType @name` |
| Other (custom) | Custom element name | Manual schema entry |

### 3.4 Edge Cases

| Case | Behavior |
|------|----------|
| No IUs have external mappings | Export context only + alert with skip count |
| IU has multiple external mappings | Property entry created under each mapped entity |
| Same entity from different ERs | Merged into single `specificationPerObjectType` |
| No actors defined | `sendingActor`/`receivingActor` attributes omitted |
| Multiple project phases selected | Joined with comma (e.g., "Design, Production") |
| Pset-mapped IU without known entity | Grouped under inferred entity from `PSET_ENTITY_MAP` or `IfcElement` |

---

## 4. Import: LOIN → IDM

### 4.1 Element Mapping

| LOIN Element | IDM Element | Mapping Notes |
|-------------|-------------|---------------|
| `LOINSpecification @name` | `headerData.shortTitle` | Direct |
| `LOINSpecification @globalId` | `headerData.idmGuid` | Direct |
| `<description>` | `headerData.fullTitle`, `headerData.summary` | Direct |
| `context @purpose` | `useCaseData.aimScope` | Direct |
| `context @informationDeliveryMileStone` | `useCaseData.targetPhases.iso22263` | Parsed via phase name mapping |
| `context @sendingActor` | `useCaseData.actors[0]` | Created with role "Sending Actor" |
| `context @receivingActor` | `useCaseData.actors[1]` | Created with role "Receiving Actor" |
| `<specificationPerObjectType>` | Parent IU (dataType: Structured) under root ER | One parent IU per object type |
| `objectType @name` | Parent IU name | e.g., "Door", "IfcDoor", "Wing Wall" |
| `objectType @refToDataModelType` | Parent IU external element mapping basis | Used to determine schema (IFC 2x3/4x3) |
| `objectType @refToClassification` | Parent IU external element mapping description | URL reference preserved |
| `propertySet @name` | Part of sub-IU external element mapping name | Stored as "PsetName.PropertyName" |
| `property @name` | `subIU.name` | Direct |
| `property > <dataType>` | `subIU.dataType` | Reverse-mapped via `REVERSE_DATA_TYPE_MAP` |
| `property > <unit>` | `subIU.definition` | Stored as "Unit: X" in definition |
| `property @refToClassification` | `subIU.correspondingExternalElements[].description` | bSDD/classification reference |
| `<geometricSpecification>` | Parent IU definition | Appended as "Geometric Information: ..." |
| `<Documentation> <RequiredDocument>` | Parent IU definition | Appended as "Required Documents: ..." |

### 4.2 ER Hierarchy Structure

The import creates a structured ER hierarchy from the flat LOIN specification. Each `specificationPerObjectType` maps to a **parent IU with dataType "Structured"** under a single root ER. Each LOIN property becomes a **sub-IU** nested under the parent IU.

```
Root ER: "er_{LOINSpecification.name}"
  ├── IU: "{objectType.name}" (Structured)  ← parent IU, one per specificationPerObjectType
  │     ├── Sub-IU: "{property.name}"       ← from propertySet properties
  │     │     └── External Mapping: "{PsetName}.{PropertyName}" (basis: IFC/bSDD/Other)
  │     ├── Sub-IU: "{property.name}"       ← from standalone properties
  │     │     └── External Mapping: "{objectTypeName}" (basis: IFC/bSDD/Other)
  │     └── ...
  ├── IU: "{objectType.name}" (Structured)
  │     └── ...
  └── ...
```

### 4.3 External Element Mapping Preservation

Each sub-IU created during import includes `correspondingExternalElements` entries that enable round-trip export:

```javascript
// Parent IU (Structured) — represents the object type
{
  name: "IfcDoor",
  dataType: "Structured",
  correspondingExternalElements: [{
    basis: "IFC 4x3 ADD2",
    name: "IfcDoor",
    description: "http://..."
  }],
  subInformationUnits: [
    // Sub-IU — represents a property
    {
      name: "Width",
      dataType: "Numeric",
      correspondingExternalElements: [{
        basis: "IFC 4x3 ADD2",
        name: "Pset_DoorCommon.Width",
        description: "http://bsdd.../..."
      }]
    }
  ]
}
```

This ensures that re-exporting to LOIN will correctly map parent IUs back to object types and sub-IUs back to their properties and property sets.

### 4.4 Milestone-to-Phase Mapping

| LOIN Milestone | ISO 22263 Phase |
|---------------|----------------|
| Inception | inception |
| Brief | brief |
| Design, Preliminary Design, Detailed Design | design |
| Production, Construction | production |
| Handover | handover |
| Operation, Operation and Maintenance | operation |
| End-of-life, Demolition | endOfLife |

### 4.5 ISO 7817-3 nodeID Resolution

The ISO 7817-3 format uses `nodeID` references to external definitions. The importer resolves these in three passes:

1. **ObjectTypes**: Build `nodeID → { name, definition }` map from `<ObjectTypes>` section
2. **Properties**: Build `nodeID → { name, definition, dataType, unit, ref }` map from `<AlphanumericalInformation> > <Property>` elements
3. **SetOfProperties**: Build `nodeID → { name, properties[] }` map, resolving each `dt:Property` reference to the property map

These maps are then used when parsing `<SpecificationPerObjectType>` entries that contain `dt:Object`, `dt:SetOfProperties`, or `dt:Property` references via `nodeID`.

---

## 5. Data Type Mapping

### IDM → LOIN (Export)

| IDM Data Type | LOIN Data Type |
|---------------|----------------|
| String, Text | String |
| Numeric | Real |
| Boolean | Boolean |
| Date, Date/Time | DateTime |
| Integer | Integer |
| Image, Audio, Video, Document | String |
| 2D Vector Drawing, 3D Model | String |
| Structured | String |

### LOIN → IDM (Import)

| LOIN Data Type | IDM Data Type |
|----------------|---------------|
| String, Text | String |
| Real, Double, Float | Numeric |
| Integer, Int | Numeric |
| Boolean, Logical | Boolean |
| DateTime, Date | Date/Time |
| Other/Unknown | String (default) |

---

## 6. Round-Trip Fidelity

### IDM → LOIN → IDM

| Data | Preserved? | Notes |
|------|-----------|-------|
| Header (title, short title) | Yes | Via description and name attributes |
| Actors (first two) | Yes | sendingActor/receivingActor round-trip |
| Additional actors | No | LOIN only supports two actors |
| Target phases | Partial | Mapped to/from ISO 22263 stage names |
| ER hierarchy | Partial | Flattened to object-type grouping, then reconstructed as parent IUs (Structured) with sub-IUs |
| IU name, dataType | Yes | Direct mapping both directions |
| IU external mappings | Yes | Stored as refToClassification / Pset.Property format |
| IU isMandatory | No | LOIN has no mandatory flag; defaults to true on import |
| IU definition | Partial | Unit info preserved; free-text definitions not round-tripped |
| BPMN diagram | No | LOIN has no process model; blank diagram on import |
| Geometric information | Import only | Stored in ER description text |
| Documentation specs | Import only | Stored in ER description text |

### LOIN → IDM → LOIN

| Data | Preserved? | Notes |
|------|-----------|-------|
| Specification name/GUID | Yes | Mapped to headerData, then back to LOIN attributes |
| Context (purpose, milestone, actors) | Yes | Full round-trip via useCaseData |
| Object types | Yes | Parent IU names map back to objectType |
| Property sets | Yes | Preserved in sub-IU external element mapping as "Pset_X.PropName" |
| Properties (name, dataType) | Yes | Sub-IU name/dataType round-trip |
| Property unit | Partial | Stored in sub-IU definition; may need manual extraction |
| Property refToClassification | Yes | Preserved in correspondingExternalElements[].description |
| Geometric specification | No | Stored as text in parent IU definition; not exported back to LOIN |
| Documentation specification | No | Stored as text in parent IU definition; not exported back to LOIN |

---

## 7. Limitations

1. **Actor count**: LOIN supports exactly two actors (sending/receiving). IDM can have any number of actors. Only the first two are exported.

2. **Geometric information**: LOIN's geometric specification (detail level, dimensionality, location, appearance, parametric behaviour) has no direct IDM equivalent. On import, it is stored as descriptive text in the parent IU definition. It is not exported back to LOIN.

3. **Documentation specification**: LOIN's required documents (type, purpose, content) have no direct IDM equivalent. On import, they are stored as descriptive text in the parent IU definition. They are not exported back.

4. **Unmapped IUs**: IUs without `correspondingExternalElements` cannot be placed in LOIN, which is inherently object-type-centric. These IUs are skipped during export with a count reported to the user.

5. **BPMN process map**: LOIN has no process model. Importing LOIN creates a blank BPMN canvas. The user must create the process map manually.

6. **IU mandatory flag**: LOIN assumes all listed properties are required. The `isMandatory` field defaults to `true` on import and is not exported.

---

*This document describes the LOIN–IDM mapping as implemented in IDMxPPM neo-Seoul v1.3.1.*
