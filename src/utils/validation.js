/**
 * Validation Utility
 * Validates IDM data against ISO 29481-3 requirements
 */

/**
 * Validation result object
 * @typedef {Object} ValidationError
 * @property {string} category - 'header' | 'er' | 'informationUnit' | 'diagram'
 * @property {string} field - Field name that has the error
 * @property {string} path - Full path to the field (e.g., 'header.title', 'er.ER-123.name')
 * @property {string} message - Human-readable error message
 * @property {string} severity - 'error' | 'warning'
 */

/**
 * Validate header data
 * @param {Object} headerData
 * @returns {ValidationError[]}
 */
export const validateHeader = (headerData) => {
  const errors = [];

  // Required fields per ISO 29481-1 (string fields)
  const requiredStringFields = [
    { field: 'title', label: 'IDM Title' },
    { field: 'version', label: 'Version' },
    { field: 'status', label: 'Status' },
    { field: 'language', label: 'Language' }
  ];

  requiredStringFields.forEach(({ field, label }) => {
    if (!headerData?.[field] || headerData[field].trim() === '') {
      errors.push({
        category: 'header',
        field,
        path: `header.${field}`,
        message: `${label} is required`,
        severity: 'error'
      });
    }
  });

  // Validate authors (array field) - support both new 'authors' and legacy 'author'
  const authors = headerData?.authors;
  const legacyAuthor = headerData?.author;
  const hasAuthors = (Array.isArray(authors) && authors.length > 0) ||
                     (typeof legacyAuthor === 'string' && legacyAuthor.trim() !== '');

  if (!hasAuthors) {
    errors.push({
      category: 'header',
      field: 'authors',
      path: 'header.authors',
      message: 'At least one author is required',
      severity: 'error'
    });
  }

  // Validate status value (per ISO 29481-1 document lifecycle)
  const validStatuses = ['NP', 'WD', 'CD', 'DIS', 'FDIS', 'PUB', 'WDRL'];
  if (headerData?.status && !validStatuses.includes(headerData.status)) {
    errors.push({
      category: 'header',
      field: 'status',
      path: 'header.status',
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      severity: 'error'
    });
  }

  return errors;
};

/**
 * Validate Information Unit
 * @param {Object} unit
 * @param {string} erPath - Path to parent ER
 * @returns {ValidationError[]}
 */
export const validateInformationUnit = (unit, erPath) => {
  const errors = [];
  const unitPath = `${erPath}.informationUnit.${unit.id}`;

  // Required fields per ISO 29481-3
  if (!unit.name || unit.name.trim() === '') {
    errors.push({
      category: 'informationUnit',
      field: 'name',
      path: `${unitPath}.name`,
      message: `Information Unit name is required`,
      severity: 'error'
    });
  }

  if (!unit.dataType || unit.dataType.trim() === '') {
    errors.push({
      category: 'informationUnit',
      field: 'dataType',
      path: `${unitPath}.dataType`,
      message: `Data type is required for "${unit.name || 'unnamed unit'}"`,
      severity: 'error'
    });
  }

  if (unit.isMandatory === undefined || unit.isMandatory === null) {
    errors.push({
      category: 'informationUnit',
      field: 'isMandatory',
      path: `${unitPath}.isMandatory`,
      message: `Mandatory flag is required for "${unit.name || 'unnamed unit'}"`,
      severity: 'error'
    });
  }

  if (!unit.definition || unit.definition.trim() === '') {
    errors.push({
      category: 'informationUnit',
      field: 'definition',
      path: `${unitPath}.definition`,
      message: `Definition is required for "${unit.name || 'unnamed unit'}"`,
      severity: 'warning'
    });
  }

  // Validate sub-units recursively
  if (unit.subInformationUnits && unit.subInformationUnits.length > 0) {
    unit.subInformationUnits.forEach(subUnit => {
      errors.push(...validateInformationUnit(subUnit, unitPath));
    });
  }

  return errors;
};

/**
 * Validate Exchange Requirement
 * @param {Object} er
 * @param {string} dataObjectId
 * @returns {ValidationError[]}
 */
export const validateER = (er, dataObjectId) => {
  const errors = [];
  const erPath = `er.${dataObjectId}`;

  // Required fields
  if (!er.name || er.name.trim() === '') {
    errors.push({
      category: 'er',
      field: 'name',
      path: `${erPath}.name`,
      message: 'ER name is required',
      severity: 'error'
    });
  }

  if (!er.description || er.description.trim() === '') {
    errors.push({
      category: 'er',
      field: 'description',
      path: `${erPath}.description`,
      message: `Description is recommended for ER "${er.name || 'unnamed'}"`,
      severity: 'warning'
    });
  }

  // ISO 29481-3 Clause 10: ER shall have at least one information unit
  if (!er.informationUnits || er.informationUnits.length === 0) {
    errors.push({
      category: 'er',
      field: 'informationUnits',
      path: `${erPath}.informationUnits`,
      message: `ER "${er.name || 'unnamed'}" must have at least one Information Unit`,
      severity: 'error'
    });
  } else {
    // Validate each information unit
    er.informationUnits.forEach(unit => {
      errors.push(...validateInformationUnit(unit, erPath));
    });
  }

  return errors;
};

/**
 * Validate BPMN diagram structure
 * @param {string} bpmnXml
 * @returns {ValidationError[]}
 */
export const validateDiagram = (bpmnXml) => {
  const errors = [];

  if (!bpmnXml || bpmnXml.trim() === '') {
    errors.push({
      category: 'diagram',
      field: 'bpmnXml',
      path: 'diagram',
      message: 'BPMN diagram is empty',
      severity: 'error'
    });
    return errors;
  }

  // Check for data objects
  const hasDataObject = bpmnXml.includes('bpmn:dataObjectReference') ||
                        bpmnXml.includes('bpmn:DataObjectReference') ||
                        bpmnXml.includes('dataObjectReference');

  if (!hasDataObject) {
    errors.push({
      category: 'diagram',
      field: 'dataObjects',
      path: 'diagram.dataObjects',
      message: 'Process map should contain at least one Data Object for ER definition',
      severity: 'warning'
    });
  }

  return errors;
};

/**
 * Validate complete project
 * @param {Object} params
 * @param {Object} params.headerData
 * @param {string} params.bpmnXml
 * @param {Object} params.erDataMap
 * @returns {Object} { errors: ValidationError[], isValid: boolean, summary: Object }
 */
export const validateProject = ({ headerData, bpmnXml, erDataMap }) => {
  const errors = [];

  // Validate header
  errors.push(...validateHeader(headerData));

  // Validate diagram
  errors.push(...validateDiagram(bpmnXml));

  // Validate ERs
  if (erDataMap && Object.keys(erDataMap).length > 0) {
    Object.entries(erDataMap).forEach(([dataObjectId, er]) => {
      errors.push(...validateER(er, dataObjectId));
    });
  } else {
    errors.push({
      category: 'er',
      field: 'erDataMap',
      path: 'er',
      message: 'No Exchange Requirements defined. Add ERs by double-clicking Data Objects.',
      severity: 'warning'
    });
  }

  // Calculate summary
  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  const summary = {
    total: errors.length,
    errors: errorCount,
    warnings: warningCount,
    byCategory: {
      header: errors.filter(e => e.category === 'header').length,
      er: errors.filter(e => e.category === 'er').length,
      informationUnit: errors.filter(e => e.category === 'informationUnit').length,
      diagram: errors.filter(e => e.category === 'diagram').length
    }
  };

  return {
    errors,
    isValid: errorCount === 0,
    summary
  };
};

/**
 * Get validation status label
 * @param {Object} validationResult
 * @returns {string}
 */
export const getValidationStatusLabel = (validationResult) => {
  if (!validationResult) return 'Not validated';

  const { isValid, summary } = validationResult;

  if (isValid && summary.warnings === 0) {
    return 'Valid';
  } else if (isValid) {
    return `Valid (${summary.warnings} warning${summary.warnings > 1 ? 's' : ''})`;
  } else {
    return `${summary.errors} error${summary.errors > 1 ? 's' : ''}, ${summary.warnings} warning${summary.warnings > 1 ? 's' : ''}`;
  }
};

export default {
  validateHeader,
  validateER,
  validateInformationUnit,
  validateDiagram,
  validateProject,
  getValidationStatusLabel
};
