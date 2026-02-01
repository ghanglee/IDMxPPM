/**
 * External Schema Data for IDMxPPM
 * Contains common elements from IFC, CityGML, UniFormat, OmniClass, and MasterFormat
 */

// IFC 2x3 Common Entities
export const IFC2X3_ENTITIES = [
  // Actor and Organization
  { name: 'IfcActor', description: 'Person or organization involved in the project', category: 'Actor' },
  { name: 'IfcActorRole', description: 'Role played by an actor', category: 'Actor' },
  { name: 'IfcPerson', description: 'Individual person', category: 'Actor' },
  { name: 'IfcOrganization', description: 'Organization or company', category: 'Actor' },
  { name: 'IfcPersonAndOrganization', description: 'Person with organizational affiliation', category: 'Actor' },
  // Building Elements
  { name: 'IfcWall', description: 'Vertical construction element', category: 'Building Element' },
  { name: 'IfcWallStandardCase', description: 'Standard wall with single material layer', category: 'Building Element' },
  { name: 'IfcSlab', description: 'Horizontal construction element (floor, roof)', category: 'Building Element' },
  { name: 'IfcBeam', description: 'Horizontal structural member', category: 'Structural Element' },
  { name: 'IfcColumn', description: 'Vertical structural member', category: 'Structural Element' },
  { name: 'IfcDoor', description: 'Door element', category: 'Opening Element' },
  { name: 'IfcWindow', description: 'Window element', category: 'Opening Element' },
  { name: 'IfcRoof', description: 'Roof construction', category: 'Building Element' },
  { name: 'IfcStair', description: 'Stair construction', category: 'Building Element' },
  { name: 'IfcRamp', description: 'Ramp construction', category: 'Building Element' },
  { name: 'IfcCurtainWall', description: 'Non-load bearing exterior wall', category: 'Building Element' },
  { name: 'IfcRailing', description: 'Railing or guardrail', category: 'Building Element' },
  { name: 'IfcCovering', description: 'Covering element (ceiling, flooring)', category: 'Covering' },
  { name: 'IfcPlate', description: 'Planar structural element', category: 'Structural Element' },
  { name: 'IfcMember', description: 'Structural member element', category: 'Structural Element' },
  { name: 'IfcFooting', description: 'Foundation footing element', category: 'Structural Element' },
  { name: 'IfcPile', description: 'Foundation pile element', category: 'Structural Element' },
  // Spatial Elements
  { name: 'IfcSpace', description: 'Area or volume bounded by elements', category: 'Spatial Element' },
  { name: 'IfcBuildingStorey', description: 'Floor level of a building', category: 'Spatial Element' },
  { name: 'IfcBuilding', description: 'Building structure', category: 'Spatial Element' },
  { name: 'IfcSite', description: 'Land area for construction', category: 'Spatial Element' },
  { name: 'IfcProject', description: 'Root element of IFC model', category: 'Project' },
  { name: 'IfcZone', description: 'Grouping of spaces', category: 'Spatial Element' },
  // Materials
  { name: 'IfcMaterial', description: 'Material definition', category: 'Material' },
  { name: 'IfcMaterialLayer', description: 'Layer of material in composite', category: 'Material' },
  { name: 'IfcMaterialLayerSet', description: 'Set of material layers', category: 'Material' },
  { name: 'IfcMaterialList', description: 'List of materials', category: 'Material' },
  // Properties
  { name: 'IfcPropertySet', description: 'Set of properties', category: 'Property' },
  { name: 'IfcPropertySingleValue', description: 'Single value property', category: 'Property' },
  { name: 'IfcPropertyEnumeratedValue', description: 'Enumerated value property', category: 'Property' },
  { name: 'IfcPropertyBoundedValue', description: 'Bounded value property with min/max', category: 'Property' },
  { name: 'IfcPropertyTableValue', description: 'Table of property values', category: 'Property' },
  { name: 'IfcElementQuantity', description: 'Set of element quantities', category: 'Quantity' },
  { name: 'IfcQuantityLength', description: 'Length quantity', category: 'Quantity' },
  { name: 'IfcQuantityArea', description: 'Area quantity', category: 'Quantity' },
  { name: 'IfcQuantityVolume', description: 'Volume quantity', category: 'Quantity' },
  { name: 'IfcQuantityCount', description: 'Count quantity', category: 'Quantity' },
  { name: 'IfcQuantityWeight', description: 'Weight quantity', category: 'Quantity' },
  // Relationships
  { name: 'IfcRelDefinesByProperties', description: 'Property assignment relation', category: 'Relationship' },
  { name: 'IfcRelContainedInSpatialStructure', description: 'Spatial containment relation', category: 'Relationship' },
  { name: 'IfcRelAggregates', description: 'Aggregation relation', category: 'Relationship' },
  { name: 'IfcRelAssociatesMaterial', description: 'Material association relation', category: 'Relationship' },
  { name: 'IfcRelConnectsElements', description: 'Element connection relation', category: 'Relationship' },
  { name: 'IfcRelAssignsToActor', description: 'Assignment to actor relation', category: 'Relationship' },
  { name: 'IfcRelAssignsToGroup', description: 'Assignment to group relation', category: 'Relationship' },
  // Opening Elements
  { name: 'IfcOpeningElement', description: 'Opening in building element', category: 'Opening Element' },
  // Furnishing
  { name: 'IfcFurnishingElement', description: 'Furniture and equipment', category: 'Furnishing' },
  { name: 'IfcFurniture', description: 'Movable furniture item', category: 'Furnishing' },
  { name: 'IfcSystemFurnitureElement', description: 'System furniture element', category: 'Furnishing' },
  // MEP
  { name: 'IfcDistributionElement', description: 'MEP distribution element', category: 'MEP' },
  { name: 'IfcFlowTerminal', description: 'End point of flow system', category: 'MEP' },
  { name: 'IfcFlowSegment', description: 'Segment of flow system (pipe, duct)', category: 'MEP' },
  { name: 'IfcFlowFitting', description: 'Connection fitting for flow systems', category: 'MEP' },
  { name: 'IfcFlowController', description: 'Flow controller (valve, damper)', category: 'MEP' },
  { name: 'IfcFlowMovingDevice', description: 'Moving device (pump, fan)', category: 'MEP' },
  { name: 'IfcFlowStorageDevice', description: 'Storage device (tank)', category: 'MEP' },
  { name: 'IfcFlowTreatmentDevice', description: 'Treatment device (filter)', category: 'MEP' },
  { name: 'IfcEnergyConversionDevice', description: 'Energy conversion device (boiler, chiller)', category: 'MEP' },
  { name: 'IfcDistributionControlElement', description: 'Control element (sensor, actuator)', category: 'MEP' },
  // Annotations
  { name: 'IfcAnnotation', description: 'Annotation element', category: 'Annotation' },
  { name: 'IfcGrid', description: 'Grid system', category: 'Annotation' },
  // Classification
  { name: 'IfcClassification', description: 'Classification system', category: 'Classification' },
  { name: 'IfcClassificationReference', description: 'Reference to classification item', category: 'Classification' },
  // Document
  { name: 'IfcDocumentInformation', description: 'Document information', category: 'Document' },
  { name: 'IfcDocumentReference', description: 'Reference to external document', category: 'Document' },
  // Common Property Sets
  { name: 'Pset_WallCommon', description: 'Common wall properties', category: 'Property Set' },
  { name: 'Pset_SlabCommon', description: 'Common slab properties', category: 'Property Set' },
  { name: 'Pset_BeamCommon', description: 'Common beam properties', category: 'Property Set' },
  { name: 'Pset_ColumnCommon', description: 'Common column properties', category: 'Property Set' },
  { name: 'Pset_DoorCommon', description: 'Common door properties', category: 'Property Set' },
  { name: 'Pset_WindowCommon', description: 'Common window properties', category: 'Property Set' },
  { name: 'Pset_SpaceCommon', description: 'Common space properties', category: 'Property Set' },
  { name: 'Pset_BuildingCommon', description: 'Common building properties', category: 'Property Set' },
  { name: 'Pset_SiteCommon', description: 'Common site properties', category: 'Property Set' },
];

// IFC 4x3 Additional Entities (includes all IFC2x3 plus new ones)
export const IFC4X3_ENTITIES = [
  ...IFC2X3_ENTITIES,
  { name: 'IfcAlignment', description: 'Linear alignment for infrastructure', category: 'Infrastructure' },
  { name: 'IfcRoad', description: 'Road facility', category: 'Infrastructure' },
  { name: 'IfcRailway', description: 'Railway facility', category: 'Infrastructure' },
  { name: 'IfcBridge', description: 'Bridge structure', category: 'Infrastructure' },
  { name: 'IfcMarineFacility', description: 'Marine/port facility', category: 'Infrastructure' },
  { name: 'IfcFacility', description: 'General facility', category: 'Infrastructure' },
  { name: 'IfcFacilityPart', description: 'Part of a facility', category: 'Infrastructure' },
  { name: 'IfcCourse', description: 'Earthwork course layer', category: 'Earthwork' },
  { name: 'IfcEarthworksCut', description: 'Excavation element', category: 'Earthwork' },
  { name: 'IfcEarthworksFill', description: 'Fill element', category: 'Earthwork' },
  { name: 'IfcPavement', description: 'Pavement structure', category: 'Infrastructure' },
  { name: 'IfcKerb', description: 'Kerb/curb element', category: 'Infrastructure' },
  { name: 'IfcSignal', description: 'Traffic signal', category: 'Infrastructure' },
  { name: 'IfcSign', description: 'Traffic or informational sign', category: 'Infrastructure' },
  { name: 'IfcGeotechnicalStratum', description: 'Soil/rock layer', category: 'Geotechnical' },
  { name: 'IfcBorehole', description: 'Borehole for soil investigation', category: 'Geotechnical' },
  { name: 'IfcPositioningElement', description: 'Element for positioning', category: 'Positioning' },
  { name: 'IfcLinearPositioningElement', description: 'Linear positioning reference', category: 'Positioning' },
];

// CityGML 3.0 Elements
export const CITYGML_ELEMENTS = [
  { name: 'Building', description: 'Building feature', category: 'Building' },
  { name: 'BuildingPart', description: 'Part of a building', category: 'Building' },
  { name: 'BuildingRoom', description: 'Room within building', category: 'Building' },
  { name: 'BuildingStorey', description: 'Floor level', category: 'Building' },
  { name: 'BuildingUnit', description: 'Unit within building', category: 'Building' },
  { name: 'BuildingInstallation', description: 'Building installation element', category: 'Building' },
  { name: 'Door', description: 'Door feature', category: 'Opening' },
  { name: 'Window', description: 'Window feature', category: 'Opening' },
  { name: 'RoofSurface', description: 'Roof surface', category: 'Surface' },
  { name: 'WallSurface', description: 'Wall surface', category: 'Surface' },
  { name: 'GroundSurface', description: 'Ground-touching surface', category: 'Surface' },
  { name: 'CeilingSurface', description: 'Ceiling surface', category: 'Surface' },
  { name: 'FloorSurface', description: 'Floor surface', category: 'Surface' },
  { name: 'OuterCeilingSurface', description: 'Exterior ceiling', category: 'Surface' },
  { name: 'OuterFloorSurface', description: 'Exterior floor', category: 'Surface' },
  { name: 'Road', description: 'Road feature', category: 'Transportation' },
  { name: 'Railway', description: 'Railway feature', category: 'Transportation' },
  { name: 'Track', description: 'Track/path', category: 'Transportation' },
  { name: 'Square', description: 'Plaza/square', category: 'Transportation' },
  { name: 'Bridge', description: 'Bridge structure', category: 'Bridge' },
  { name: 'BridgeConstructiveElement', description: 'Bridge structural element', category: 'Bridge' },
  { name: 'Tunnel', description: 'Tunnel structure', category: 'Tunnel' },
  { name: 'TunnelPart', description: 'Part of tunnel', category: 'Tunnel' },
  { name: 'CityFurniture', description: 'Urban furniture', category: 'City Furniture' },
  { name: 'LandUse', description: 'Land use zone', category: 'Land Use' },
  { name: 'PlantCover', description: 'Vegetation area', category: 'Vegetation' },
  { name: 'SolitaryVegetationObject', description: 'Individual plant/tree', category: 'Vegetation' },
  { name: 'WaterBody', description: 'Water feature', category: 'Water Body' },
  { name: 'ReliefFeature', description: 'Terrain feature', category: 'Relief' },
  { name: 'TINRelief', description: 'TIN terrain model', category: 'Relief' },
  { name: 'GenericCityObject', description: 'Generic city object', category: 'Generic' },
];

// UniFormat Classification (Level 2 - Major Group Elements)
export const UNIFORMAT_ELEMENTS = [
  // A - Substructure
  { code: 'A10', name: 'Foundations', description: 'Building foundations', category: 'A - Substructure' },
  { code: 'A1010', name: 'Standard Foundations', description: 'Spread and continuous footings', category: 'A - Substructure' },
  { code: 'A1020', name: 'Special Foundations', description: 'Piles, caissons, grade beams', category: 'A - Substructure' },
  { code: 'A20', name: 'Basement Construction', description: 'Basement walls and structure', category: 'A - Substructure' },
  // B - Shell
  { code: 'B10', name: 'Superstructure', description: 'Floor and roof structure', category: 'B - Shell' },
  { code: 'B1010', name: 'Floor Construction', description: 'Structural floors', category: 'B - Shell' },
  { code: 'B1020', name: 'Roof Construction', description: 'Structural roof', category: 'B - Shell' },
  { code: 'B20', name: 'Exterior Enclosure', description: 'Exterior walls and glazing', category: 'B - Shell' },
  { code: 'B2010', name: 'Exterior Walls', description: 'Exterior wall assemblies', category: 'B - Shell' },
  { code: 'B2020', name: 'Exterior Windows', description: 'Windows and curtain walls', category: 'B - Shell' },
  { code: 'B2030', name: 'Exterior Doors', description: 'Exterior door assemblies', category: 'B - Shell' },
  { code: 'B30', name: 'Roofing', description: 'Roof coverings and accessories', category: 'B - Shell' },
  // C - Interiors
  { code: 'C10', name: 'Interior Construction', description: 'Interior partitions and doors', category: 'C - Interiors' },
  { code: 'C1010', name: 'Partitions', description: 'Interior partitions', category: 'C - Interiors' },
  { code: 'C1020', name: 'Interior Doors', description: 'Interior door assemblies', category: 'C - Interiors' },
  { code: 'C1030', name: 'Fittings', description: 'Fixed interior fittings', category: 'C - Interiors' },
  { code: 'C20', name: 'Stairs', description: 'Stair construction', category: 'C - Interiors' },
  { code: 'C30', name: 'Interior Finishes', description: 'Wall, floor, ceiling finishes', category: 'C - Interiors' },
  // D - Services
  { code: 'D10', name: 'Conveying', description: 'Elevators, escalators', category: 'D - Services' },
  { code: 'D20', name: 'Plumbing', description: 'Plumbing systems', category: 'D - Services' },
  { code: 'D30', name: 'HVAC', description: 'Heating, ventilation, AC', category: 'D - Services' },
  { code: 'D40', name: 'Fire Protection', description: 'Fire suppression systems', category: 'D - Services' },
  { code: 'D50', name: 'Electrical', description: 'Electrical systems', category: 'D - Services' },
  // E - Equipment & Furnishings
  { code: 'E10', name: 'Equipment', description: 'Fixed equipment', category: 'E - Equipment & Furnishings' },
  { code: 'E20', name: 'Furnishings', description: 'Fixed furnishings', category: 'E - Equipment & Furnishings' },
  // F - Special Construction
  { code: 'F10', name: 'Special Construction', description: 'Special structures', category: 'F - Special Construction' },
  { code: 'F20', name: 'Selective Building Demolition', description: 'Demolition work', category: 'F - Special Construction' },
  // G - Building Sitework
  { code: 'G10', name: 'Site Preparation', description: 'Clearing, grading', category: 'G - Building Sitework' },
  { code: 'G20', name: 'Site Improvements', description: 'Paving, landscaping', category: 'G - Building Sitework' },
  { code: 'G30', name: 'Site Mechanical Utilities', description: 'Site utilities', category: 'G - Building Sitework' },
  { code: 'G40', name: 'Site Electrical Utilities', description: 'Site electrical', category: 'G - Building Sitework' },
];

// OmniClass Table 21 - Elements
export const OMNICLASS_ELEMENTS = [
  { code: '21-01', name: 'Substructure', description: 'Below-grade elements', category: 'Major Group' },
  { code: '21-01 10', name: 'Foundations', description: 'Foundation systems', category: 'Substructure' },
  { code: '21-01 20', name: 'Basement Construction', description: 'Basement elements', category: 'Substructure' },
  { code: '21-02', name: 'Shell', description: 'Building enclosure', category: 'Major Group' },
  { code: '21-02 10', name: 'Superstructure', description: 'Primary structure', category: 'Shell' },
  { code: '21-02 20', name: 'Exterior Vertical Enclosures', description: 'Exterior walls', category: 'Shell' },
  { code: '21-02 30', name: 'Exterior Horizontal Enclosures', description: 'Roofing', category: 'Shell' },
  { code: '21-03', name: 'Interiors', description: 'Interior construction', category: 'Major Group' },
  { code: '21-03 10', name: 'Interior Construction', description: 'Partitions, doors', category: 'Interiors' },
  { code: '21-03 20', name: 'Interior Finishes', description: 'Finish materials', category: 'Interiors' },
  { code: '21-04', name: 'Services', description: 'Building services', category: 'Major Group' },
  { code: '21-04 10', name: 'Conveying', description: 'Vertical transportation', category: 'Services' },
  { code: '21-04 20', name: 'Plumbing', description: 'Plumbing systems', category: 'Services' },
  { code: '21-04 30', name: 'HVAC', description: 'Climate control', category: 'Services' },
  { code: '21-04 40', name: 'Fire Protection', description: 'Fire systems', category: 'Services' },
  { code: '21-04 50', name: 'Electrical', description: 'Electrical systems', category: 'Services' },
  { code: '21-04 60', name: 'Communications', description: 'Telecom/data', category: 'Services' },
  { code: '21-04 70', name: 'Electronic Safety and Security', description: 'Security systems', category: 'Services' },
  { code: '21-05', name: 'Equipment and Furnishings', description: 'Equipment', category: 'Major Group' },
  { code: '21-06', name: 'Special Construction and Demolition', description: 'Special work', category: 'Major Group' },
  { code: '21-07', name: 'Sitework', description: 'Site construction', category: 'Major Group' },
];

// MasterFormat 2020 Divisions
export const MASTERFORMAT_ELEMENTS = [
  // Division 01 - General Requirements
  { code: '01', name: 'General Requirements', description: 'Administrative requirements', category: 'Procurement/Contracting' },
  // Division 02 - Existing Conditions
  { code: '02', name: 'Existing Conditions', description: 'Surveys, demolition', category: 'Existing Conditions' },
  { code: '02 41 00', name: 'Demolition', description: 'Demolition work', category: 'Existing Conditions' },
  // Division 03 - Concrete
  { code: '03', name: 'Concrete', description: 'Concrete work', category: 'Concrete' },
  { code: '03 30 00', name: 'Cast-in-Place Concrete', description: 'Site-cast concrete', category: 'Concrete' },
  { code: '03 40 00', name: 'Precast Concrete', description: 'Precast elements', category: 'Concrete' },
  // Division 04 - Masonry
  { code: '04', name: 'Masonry', description: 'Masonry work', category: 'Masonry' },
  { code: '04 20 00', name: 'Unit Masonry', description: 'Brick, block work', category: 'Masonry' },
  // Division 05 - Metals
  { code: '05', name: 'Metals', description: 'Structural/misc metals', category: 'Metals' },
  { code: '05 12 00', name: 'Structural Steel Framing', description: 'Steel structure', category: 'Metals' },
  { code: '05 50 00', name: 'Metal Fabrications', description: 'Misc metal items', category: 'Metals' },
  // Division 06 - Wood, Plastics, Composites
  { code: '06', name: 'Wood, Plastics, and Composites', description: 'Wood and plastic materials', category: 'Wood/Plastics' },
  { code: '06 10 00', name: 'Rough Carpentry', description: 'Framing, blocking', category: 'Wood/Plastics' },
  { code: '06 20 00', name: 'Finish Carpentry', description: 'Millwork, trim', category: 'Wood/Plastics' },
  // Division 07 - Thermal and Moisture Protection
  { code: '07', name: 'Thermal and Moisture Protection', description: 'Waterproofing, insulation, roofing', category: 'Thermal/Moisture' },
  { code: '07 20 00', name: 'Thermal Protection', description: 'Insulation', category: 'Thermal/Moisture' },
  { code: '07 50 00', name: 'Membrane Roofing', description: 'Roofing membranes', category: 'Thermal/Moisture' },
  // Division 08 - Openings
  { code: '08', name: 'Openings', description: 'Doors, windows, glazing', category: 'Openings' },
  { code: '08 10 00', name: 'Doors and Frames', description: 'Door assemblies', category: 'Openings' },
  { code: '08 50 00', name: 'Windows', description: 'Window assemblies', category: 'Openings' },
  { code: '08 44 00', name: 'Curtain Wall and Glazed Assemblies', description: 'Curtain walls', category: 'Openings' },
  // Division 09 - Finishes
  { code: '09', name: 'Finishes', description: 'Interior finishes', category: 'Finishes' },
  { code: '09 20 00', name: 'Plaster and Gypsum Board', description: 'Drywall, plaster', category: 'Finishes' },
  { code: '09 30 00', name: 'Tiling', description: 'Ceramic, stone tile', category: 'Finishes' },
  { code: '09 60 00', name: 'Flooring', description: 'Floor finishes', category: 'Finishes' },
  { code: '09 90 00', name: 'Painting and Coating', description: 'Paint finishes', category: 'Finishes' },
  // Divisions 10-14 - Specialties through Conveying
  { code: '10', name: 'Specialties', description: 'Specialty items', category: 'Specialties' },
  { code: '11', name: 'Equipment', description: 'Built-in equipment', category: 'Equipment' },
  { code: '12', name: 'Furnishings', description: 'Furniture, fixtures', category: 'Furnishings' },
  { code: '13', name: 'Special Construction', description: 'Special structures', category: 'Special Construction' },
  { code: '14', name: 'Conveying Equipment', description: 'Elevators, escalators', category: 'Conveying' },
  // Divisions 21-28 - Facility Services
  { code: '21', name: 'Fire Suppression', description: 'Fire protection systems', category: 'Fire Protection' },
  { code: '22', name: 'Plumbing', description: 'Plumbing systems', category: 'Plumbing' },
  { code: '23', name: 'HVAC', description: 'Heating, ventilation, AC', category: 'HVAC' },
  { code: '26', name: 'Electrical', description: 'Electrical systems', category: 'Electrical' },
  { code: '27', name: 'Communications', description: 'Communications systems', category: 'Communications' },
  { code: '28', name: 'Electronic Safety and Security', description: 'Security systems', category: 'Security' },
  // Divisions 31-35 - Site and Infrastructure
  { code: '31', name: 'Earthwork', description: 'Grading, excavation', category: 'Sitework' },
  { code: '32', name: 'Exterior Improvements', description: 'Paving, landscaping', category: 'Sitework' },
  { code: '33', name: 'Utilities', description: 'Site utilities', category: 'Sitework' },
  { code: '34', name: 'Transportation', description: 'Roads, parking', category: 'Transportation' },
  { code: '35', name: 'Waterway and Marine Construction', description: 'Marine work', category: 'Marine' },
];

// Schema metadata
export const SCHEMA_INFO = {
  'IFC 2x3': {
    name: 'IFC 2x3',
    description: 'Industry Foundation Classes version 2x3 (ISO 16739:2013)',
    data: IFC2X3_ENTITIES,
    searchable: true
  },
  'IFC 4x3 ADD2': {
    name: 'IFC 4x3 ADD2',
    description: 'Industry Foundation Classes version 4.3 ADD2 (ISO 16739-1:2024)',
    data: IFC4X3_ENTITIES,
    searchable: true
  },
  'CityGML': {
    name: 'CityGML',
    description: 'City Geography Markup Language 3.0 (OGC)',
    data: CITYGML_ELEMENTS,
    searchable: true
  },
  'UniFormat': {
    name: 'UniFormat',
    description: 'ASTM E1557 Uniformat II Classification',
    data: UNIFORMAT_ELEMENTS,
    searchable: true
  },
  'OmniClass': {
    name: 'OmniClass',
    description: 'OmniClass Table 21 - Elements',
    data: OMNICLASS_ELEMENTS,
    searchable: true
  },
  'MasterFormat': {
    name: 'MasterFormat',
    description: 'CSI MasterFormat 2020',
    data: MASTERFORMAT_ELEMENTS,
    searchable: true
  },
  'bSDD': {
    name: 'bSDD',
    description: 'buildingSMART Data Dictionary (API-based)',
    data: [],
    searchable: true,
    apiEnabled: true
  },
  'Other': {
    name: 'Other',
    description: 'Other external schema (manual entry)',
    data: [],
    searchable: false
  }
};

export default SCHEMA_INFO;
