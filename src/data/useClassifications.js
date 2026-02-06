/**
 * (Information) Use Classifications for IDM Specification
 *
 * This file contains standardized use classifications that can be referenced
 * when defining the Use field in an IDM specification.
 *
 * Default classification: NBIMS-US V4 BIM Use
 */

// NBIMS-US Version 4.0 BIM Uses
// https://www.nibs.org/nbims-us
export const NBIMS_US_V4_BIM_USE = {
  id: 'nbims-us-v4',
  name: 'NBIMS-US V4 BIM Use',
  fullName: 'National BIM Standard - United States Version 4.0',
  organization: 'National Institute of Building Sciences (NIBS)',
  uses: [
    { id: 'analyze-design', name: 'Analyze Design', description: 'Examine and evaluate a built environment asset design to assess its functionality, and compliance with various criteria and requirements.' },
    { id: 'author-design', name: 'Author Design', description: 'Develop a design using BIM authoring software with 3D and attribute information for a built environment asset/site leveraging an object library of parametric elements.' },
    { id: 'author-temporary-work', name: 'Author Temporary Work', description: 'Generate the design of non-permanent elements in a model necessary to construct a project.' },
    { id: 'capture-conditions', name: 'Capture Conditions', description: 'Collect current information about the built environment to include in a model.' },
    { id: 'compile-record-deliverables', name: 'Compile Record Deliverables', description: 'Capture and document project and asset information for the purpose of communicating the work performed, progress made, and compliance with requirements at project completion.' },
    { id: 'coordinate-design-construction', name: 'Coordinate Design and Construction', description: 'Verify the design layout and spatial arrangement of systems by applying construction means and methods and additional spatial constraints (such as code requirements, maintenance access and clearances) to validate the constructability of the project.' },
    { id: 'establish-project-requirements', name: 'Establish Project Requirements', description: 'Capture and monitor key project aspects and scope such as area, spatial, functional, asset, deliverable, code, end user, organizational, and other stakeholder requirements.' },
    { id: 'generate-estimates', name: 'Generate Estimates', description: 'Extract project, site, and asset quantity information from model(s) to support the development of project and/or life-cycle cost estimates.' },
    { id: 'generate-fabrication-details', name: 'Generate Fabrication Details', description: 'Generate the manufacturing and/or construction details in a model necessary to fabricate elements of a project.' },
    { id: 'layout-construction', name: 'Layout Construction', description: 'Establish and mark features of work on a construction project using real-time positioning supported by model data.' },
    { id: 'manage-assets', name: 'Manage Assets', description: 'Track asset performance and ensure proper maintenance to ensure longevity and optimal functionality.' },
    { id: 'manage-space', name: 'Manage Space', description: 'Allocate, organize, and optimize the use of the physical space of a built environment asset.' },
    { id: 'monitor-performance', name: 'Monitor Performance', description: 'Assess and evaluate the performance of a built environment asset to ensure it operates efficiently, effectively, and with performance standards.' },
    { id: 'produce-construction-documents', name: 'Produce Construction Documents', description: 'Generate documentation to communicate design intent and construction details which may include plans, elevations, sections, renderings, data schedules, 3D diagrams, or specifications.' },
    { id: 'review-design', name: 'Review Design', description: 'Validate the design intent and construction details based on the project requirements and stakeholder expectations (such as validating project design quality, and model/data quality). Note, this BIM Use is not limited to the design phase.' },
    { id: 'sequence-construction', name: 'Sequence Construction', description: 'Visualize the timing and/or sequencing of construction activities graphically using a model.' }
  ]
};

// All available classifications
export const USE_CLASSIFICATIONS = [
  NBIMS_US_V4_BIM_USE
];

// Default classification
export const DEFAULT_USE_CLASSIFICATION = NBIMS_US_V4_BIM_USE;

/**
 * Get a classification by ID
 */
export const getClassificationById = (id) => {
  return USE_CLASSIFICATIONS.find(c => c.id === id);
};
