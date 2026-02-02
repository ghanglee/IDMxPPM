# idmXSD 2.0 Reference - ISO 29481-3

This document provides a quick reference for the idmXML schema (ISO 29481-3).
For the complete XSD schema, see [idmXSD2.0.xsd](./idmXSD2.0.xsd).

## Schema Structure Overview

```
idm (root)
├── specId (required)
├── authoring (required)
├── uc (required) - Use Case
│   ├── specId (required)
│   ├── authoring (required)
│   ├── summary (required)
│   ├── aimAndScope (required)
│   ├── language (required)
│   ├── use (required, 1..*)
│   ├── region (required, 1..*)
│   ├── standardProjectStage (required, 1..*)
│   ├── actor (optional, 0..*)
│   ├── benefits (optional)
│   ├── limitations (optional)
│   └── ...
├── businessContextMap (optional, 0..*)
│   ├── specId (required)
│   ├── authoring (required)
│   └── pm | im (required, 1..*)
│       ├── diagram (required)
│       └── dataObjectAndEr (optional, 0..*)
└── er (optional, 0..*) - Exchange Requirement
    ├── specId (required)
    ├── authoring (required)
    ├── description (optional)
    └── informationUnit | subEr (required, 1..*)
```

## Key Elements

### specId (Specification Identifier)

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| guid | uuid | Yes | Unique identifier (36 chars, lowercase) |
| shortTitle | string | Yes | Short title for the specification |
| fullTitle | string | Yes | Full title |
| idmCode | string | Yes | IDM code identifier |
| documentStatus | string | Yes | Status: NP, WD, CD, DIS, FDIS, PUB, WDRL |
| version | string | No | Version number |
| subTitle | string | No | Subtitle |
| localCode | string | No | Local code |

### authoring

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| author | string | Yes | Author name(s) |
| creationDate | date | Yes | Creation date (YYYY-MM-DD) |
| modificationDate | date | No | Last modification date |

### use (Use element)

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Use name (Verb + Noun format recommended) |

### region

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| value | string | Yes | Region value |

Child element:
- `type`: continent | country | USR (default: USR)

### standardProjectStage

Child element:
- `name`: inception | brief | design | production | handover | operation | end-of-life

### actor

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Actor identifier |
| name | string | Yes | Actor name |

### informationUnit

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Information unit identifier |
| name | string | Yes | Name |
| dataType | string | Yes | Data type |
| isMandatory | boolean | Yes | Whether mandatory (true/false) |
| definition | string | Yes | Definition text |

Child elements:
- `examples` (optional)
- `correspondingExternalElement` (optional, 0..*)
- `subInformationUnit` (optional, 0..*)

### correspondingExternalElement

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| basis | string | Yes | Schema basis (e.g., "IFC 4x3 ADD2", "bSDD") |
| name | string | Yes | Element name in that schema |

### diagram

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Diagram identifier |
| name | string | Yes | Diagram name |
| notation | string | Yes | Notation type (e.g., "BPMN 2.0") |
| diagramFilePath | string | Yes | Path to diagram file |
| imageFilePath | string | No | Path to image representation |

## UUID Format

UUIDs must be 36 characters in lowercase:
```
[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}
```

Example: `550e8400-e29b-41d4-a716-446655440000`

## ISO 29481-3 Clause 10

> An ER shall not be empty and shall have at least one information unit or a sub-ER.

This means every `<er>` element must contain either:
- At least one `<informationUnit>`, OR
- At least one `<subEr>`

## Example idmXML Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<idm xmlns="https://standards.buildingsmart.org/IDM/idmXML/0.2">
  <specId
    guid="550e8400-e29b-41d4-a716-446655440000"
    shortTitle="Sample IDM"
    fullTitle="Sample Information Delivery Manual"
    idmCode="IDM-2026-001"
    documentStatus="WD"
    version="1.0"/>

  <authoring
    author="John Smith"
    creationDate="2026-01-15"/>

  <uc>
    <specId
      guid="660e8400-e29b-41d4-a716-446655440001"
      shortTitle="Sample Use Case"
      fullTitle="Sample Use Case"
      idmCode="UC-2026-001"
      documentStatus="WD"/>

    <authoring author="John Smith" creationDate="2026-01-15"/>

    <summary>
      <description>This IDM defines exchange requirements for...</description>
    </summary>

    <aimAndScope>
      <description>The purpose of this IDM is to...</description>
    </aimAndScope>

    <language>EN</language>

    <use name="Coordinate Design Model"/>

    <region value="international">
      <type>USR</type>
    </region>

    <standardProjectStage>
      <name>design</name>
    </standardProjectStage>

    <actor id="actor-1" name="Architect"/>
    <actor id="actor-2" name="Structural Engineer"/>
  </uc>

  <businessContextMap>
    <specId
      guid="770e8400-e29b-41d4-a716-446655440002"
      shortTitle="Process Map"
      fullTitle="Business Context Map"
      idmCode="BCM-2026-001"
      documentStatus="WD"/>

    <authoring author="John Smith" creationDate="2026-01-15"/>

    <pm>
      <diagram
        id="PM-1"
        name="Process Map"
        notation="BPMN 2.0"
        diagramFilePath="process-map.bpmn"/>

      <dataObjectAndEr id="DOER-1">
        <associatedDataObject>DataObject_1</associatedDataObject>
        <associatedEr>ER-001</associatedEr>
      </dataObjectAndEr>
    </pm>
  </businessContextMap>

  <er>
    <specId
      guid="880e8400-e29b-41d4-a716-446655440003"
      shortTitle="Design Data"
      fullTitle="Design Data Exchange"
      idmCode="ER-001"
      documentStatus="WD"/>

    <authoring author="John Smith" creationDate="2026-01-15"/>

    <description>Exchange requirements for design data...</description>

    <informationUnit
      id="IU-001"
      name="Building Model"
      dataType="3D Model"
      isMandatory="true"
      definition="A BIM model representing the building design">

      <correspondingExternalElement basis="IFC 4x3 ADD2" name="IfcBuilding"/>
    </informationUnit>
  </er>
</idm>
```

## Related Standards

| Standard | Description |
|----------|-------------|
| ISO 29481-1 | IDM Methodology and format |
| ISO 29481-2 | Interaction framework (BPMN representation) |
| ISO 29481-3 | IDM Data schema (idmXML) - this schema |
| ISO 16739-1 | Industry Foundation Classes (IFC) |
| ISO 12006-3 | Framework for object-oriented information |
| ISO 19650 | Information management using BIM |
