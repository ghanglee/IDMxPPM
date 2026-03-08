/**
 * HTML Exporter for IDM Specifications
 * Generates self-contained HTML with embedded images and BPMN diagrams
 */

import { defaultIdmXslt } from './defaultIdmXslt';
import { getRegionName } from './idmXmlParser';
import { getReviewUIStyles, getReviewUIScript } from './reviewCommentingUI';

/**
 * Generate self-contained HTML from IDM data
 * @param {Object} params
 * @param {Object} params.headerData - IDM header metadata
 * @param {Object} params.erDataMap - Exchange requirements data
 * @param {string} params.bpmnSvg - BPMN diagram as SVG string
 * @param {string|null} params.customXsltContent - Custom XSLT content
 * @param {string} params.idmXmlContent - Generated idmXML content
 * @returns {string} Complete HTML document
 */
export const generateHtmlDocument = ({
  headerData,
  erDataMap,
  bpmnSvg,
  customXsltContent,
  idmXmlContent
}) => {
  // Use custom XSLT or default
  const xsltContent = customXsltContent || defaultIdmXslt;

  // First, transform XML using XSLT
  let htmlContent = transformXmlWithXslt(idmXmlContent, xsltContent);

  // Now enhance the HTML with BPMN diagram and images
  htmlContent = enhanceHtmlWithBpmn(htmlContent, bpmnSvg);
  htmlContent = enhanceHtmlWithImages(htmlContent, erDataMap);

  return htmlContent;
};

/**
 * Transform XML using XSLT stylesheet
 */
const transformXmlWithXslt = (xmlContent, xsltContent) => {
  const parser = new DOMParser();

  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  const xmlError = xmlDoc.querySelector('parsererror');
  if (xmlError) {
    throw new Error('Invalid XML: ' + xmlError.textContent);
  }

  const xsltDoc = parser.parseFromString(xsltContent, 'text/xml');
  const xsltError = xsltDoc.querySelector('parsererror');
  if (xsltError) {
    throw new Error('Invalid XSLT: ' + xsltError.textContent);
  }

  const xsltProcessor = new XSLTProcessor();
  xsltProcessor.importStylesheet(xsltDoc);

  const resultDoc = xsltProcessor.transformToDocument(xmlDoc);
  const serializer = new XMLSerializer();
  return serializer.serializeToString(resultDoc);
};

/**
 * Enhance HTML with BPMN diagram
 */
const enhanceHtmlWithBpmn = (htmlContent, bpmnSvg) => {
  if (!bpmnSvg) return htmlContent;

  // Create BPMN section HTML
  const bpmnSection = `
    <div class="bpmn-section">
      <h2>Process Map (BPMN)</h2>
      <div class="bpmn-diagram">
        ${bpmnSvg}
      </div>
    </div>
  `;

  // Add BPMN styles
  const bpmnStyles = `
    .bpmn-section {
      margin: 30px 0;
      page-break-inside: avoid;
    }
    .bpmn-diagram {
      background: #fafafa;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 20px;
      overflow: auto;
      max-width: 100%;
    }
    .bpmn-diagram svg {
      max-width: 100%;
      height: auto;
    }
  `;

  // Insert BPMN section after Use Case section (before Exchange Requirements)
  // Look for the Exchange Requirements heading
  const erHeadingMatch = htmlContent.match(/<h2[^>]*>Exchange Requirements<\/h2>/i);
  if (erHeadingMatch) {
    const insertIndex = htmlContent.indexOf(erHeadingMatch[0]);
    htmlContent = htmlContent.slice(0, insertIndex) + bpmnSection + htmlContent.slice(insertIndex);
  } else {
    // If no ER section, insert before closing body tag
    htmlContent = htmlContent.replace('</body>', bpmnSection + '</body>');
  }

  // Add styles to head
  htmlContent = htmlContent.replace('</style>', bpmnStyles + '</style>');

  return htmlContent;
};

/**
 * Enhance HTML with embedded images from ERs
 */
const enhanceHtmlWithImages = (htmlContent, erDataMap) => {
  if (!erDataMap) return htmlContent;

  // Collect all images from ERs
  const allImages = [];
  Object.values(erDataMap).forEach(er => {
    if (er.informationUnits) {
      collectImagesFromUnits(er.informationUnits, allImages, er.name);
    }
  });

  if (allImages.length === 0) return htmlContent;

  // Add image gallery styles
  const imageStyles = `
    .example-images {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin: 15px 0;
    }
    .example-image {
      flex: 0 1 300px;
      text-align: center;
    }
    .example-image img {
      max-width: 100%;
      max-height: 250px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .example-image .caption {
      font-size: 11px;
      color: #666;
      margin-top: 8px;
    }
  `;

  htmlContent = htmlContent.replace('</style>', imageStyles + '</style>');

  // For each ER section, add its images
  // This is a simplified approach - in a full implementation,
  // we'd parse the HTML and inject images into the correct ER sections

  return htmlContent;
};

/**
 * Recursively collect images from information units
 */
const collectImagesFromUnits = (units, images, erName) => {
  units.forEach(unit => {
    if (unit.exampleImages && unit.exampleImages.length > 0) {
      unit.exampleImages.forEach(img => {
        images.push({
          ...img,
          erName,
          unitName: unit.name
        });
      });
    }
    if (unit.subInformationUnits) {
      collectImagesFromUnits(unit.subInformationUnits, images, erName);
    }
  });
};

/**
 * Generate complete standalone HTML with all assets embedded
 * @param {Object} params
 * @param {Object} params.headerData - IDM header metadata
 * @param {Object} params.erDataMap - Exchange requirements data
 * @param {string} params.bpmnSvg - BPMN diagram as SVG string
 * @param {string|null} params.customXsltContent - Custom XSLT content
 * @returns {string} Complete HTML document
 */
export const generateStandaloneHtml = ({
  headerData,
  erDataMap,
  erHierarchy,
  bpmnSvg,
  customXsltContent,
  dataObjectErMap,
  bpmnElements,
  projectData,
  enableReview
}) => {
  const title = headerData?.title || headerData?.shortTitle || 'IDM Specification';
  const shortTitle = headerData?.shortTitle || title;
  const version = headerData?.version || '1.0';
  const status = headerData?.status || 'WD';
  const author = formatAuthors(headerData?.authors);
  const creationDate = headerData?.creationDate || new Date().toISOString().split('T')[0];

  // Build complete HTML document
  const html = `<!DOCTYPE html>
<html lang="${headerData?.language || 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
      background: white;
    }

    h1 {
      font-size: 22pt;
      color: #1a1a1a;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }

    h2 {
      font-size: 14pt;
      color: #0066cc;
      border-bottom: 1px solid #ccc;
      padding-bottom: 6px;
      margin-top: 30px;
      margin-bottom: 16px;
    }

    h3 {
      font-size: 12pt;
      color: #333;
      margin-top: 24px;
      margin-bottom: 12px;
    }

    h4 {
      font-size: 11pt;
      color: #555;
      margin-top: 18px;
      margin-bottom: 10px;
    }

    .header-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #f5f7fa;
      padding: 18px;
      border-radius: 6px;
      margin-bottom: 28px;
      font-size: 10pt;
    }

    .header-meta dt {
      font-weight: 600;
      color: #555;
    }

    .header-meta dd {
      margin: 0 0 10px 0;
      color: #333;
    }

    .section {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }

    .description {
      background: #fafafa;
      padding: 14px;
      border-left: 4px solid #0066cc;
      margin: 12px 0;
    }

    .bpmn-section {
      margin: 35px 0;
      page-break-before: always;
    }

    .bpmn-diagram {
      background: #fafafa;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 20px;
      overflow: auto;
      text-align: center;
    }

    .bpmn-diagram svg {
      max-width: 100%;
      height: auto;
    }

    .bpmn-hint {
      font-size: 9pt;
      color: #888;
      font-style: italic;
      margin-bottom: 8px;
    }

    .bpmn-diagram [onclick]:hover .djs-visual > rect,
    .bpmn-diagram [onclick]:hover .djs-visual > path,
    .bpmn-diagram [onclick]:hover .djs-visual > polygon {
      stroke: #0066cc;
      stroke-width: 2px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 10pt;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 10px 12px;
      text-align: left;
    }

    th {
      background: #0066cc;
      color: white;
      font-weight: 600;
    }

    tr:nth-child(even) {
      background: #f9f9f9;
    }

    .er-section {
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 18px;
      margin: 18px 0;
      page-break-inside: avoid;
    }

    .er-title {
      font-size: 13pt;
      color: #0066cc;
      margin: 0 0 12px 0;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }

    .info-unit {
      background: #f9f9f9;
      padding: 12px;
      margin: 12px 0;
      border-radius: 5px;
    }

    .info-unit-name {
      font-weight: 600;
      color: #333;
    }

    .mandatory {
      color: #cc0000;
      font-weight: 600;
    }

    .optional {
      color: #666;
    }

    .tag {
      display: inline-block;
      background: #e8e8e8;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 9pt;
      margin: 3px;
    }

    .tag.small {
      padding: 2px 6px;
      font-size: 8pt;
    }

    .actors-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 10pt;
    }

    .actors-table th,
    .actors-table td {
      border: 1px solid #ddd;
      padding: 10px 12px;
      text-align: left;
    }

    .actors-table th {
      background: #0066cc;
      color: white;
      font-weight: 600;
    }

    .actors-table tr:nth-child(even) {
      background: #f9f9f9;
    }

    .sub-actor-row {
      background: #f5f5f5 !important;
    }

    .sub-actor-row td:first-child {
      color: #666;
    }

    .external-mapping {
      font-size: 9pt;
      color: #666;
      margin-top: 6px;
    }

    .external-mapping .basis {
      font-weight: 600;
      color: #0066cc;
    }

    .task-list-section {
      margin: 35px 0;
    }

    .task-list-section h3 {
      font-size: 11pt;
      font-weight: 600;
      color: #555;
      margin: 18px 0 10px 0;
      padding-bottom: 4px;
      border-bottom: 1px solid #eee;
    }

    .task-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 10pt;
    }

    .task-table th {
      background: #0066cc;
      color: white;
      font-weight: 600;
      padding: 8px 10px;
      text-align: left;
      white-space: nowrap;
    }

    .task-table td {
      border: 1px solid #ddd;
      padding: 8px 10px;
      vertical-align: top;
    }

    .task-table tr:nth-child(even) {
      background: #f9f9f9;
    }

    .task-table tr:hover {
      background: #eef4ff;
    }

    .task-name-link {
      color: #0066cc;
      text-decoration: none;
      font-weight: 600;
      cursor: pointer;
    }

    .task-name-link:hover {
      text-decoration: underline;
    }

    .task-type-badge {
      display: inline-block;
      background: #e8f0fe;
      color: #1a73e8;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 8pt;
      font-weight: 500;
      white-space: nowrap;
    }

    .task-doc {
      color: #555;
      font-size: 9pt;
      white-space: pre-wrap;
      max-width: 260px;
    }

    .task-no-doc {
      color: #bbb;
      font-size: 9pt;
      font-style: italic;
    }

    .task-er-link {
      font-size: 9pt;
      color: #0066cc;
      text-decoration: none;
    }

    .task-er-link:hover {
      text-decoration: underline;
    }

    .task-lane {
      font-size: 9pt;
      color: #666;
    }

    .example-images {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin: 15px 0;
    }

    .example-image {
      flex: 0 1 280px;
      text-align: center;
    }

    .example-image img {
      max-width: 100%;
      max-height: 220px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .example-image .caption {
      font-size: 10px;
      color: #666;
      margin-top: 8px;
    }

    .section-figures {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin: 15px 0;
    }

    .section-figure {
      flex: 0 1 350px;
      text-align: center;
    }

    .section-figure img {
      max-width: 100%;
      max-height: 300px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .figure-caption {
      font-size: 10pt;
      color: #555;
      margin-top: 10px;
      font-style: italic;
    }

    .iu-figures-row td {
      padding: 4px 12px 12px !important;
      background: #f8f9fa;
    }
    .iu-figures {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .iu-figures-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .iu-figures-label {
      font-size: 9pt;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .iu-figures-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .iu-figure-item {
      flex: 0 1 280px;
      text-align: center;
    }
    .iu-figure-item img {
      max-width: 100%;
      max-height: 220px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .footer {
      margin-top: 50px;
      padding-top: 18px;
      border-top: 1px solid #ccc;
      font-size: 9pt;
      color: #666;
      text-align: center;
    }

    @media print {
      body {
        padding: 0;
      }
      .er-section {
        page-break-inside: avoid;
      }
      h2 {
        page-break-after: avoid;
      }
      .bpmn-section {
        page-break-before: always;
      }
    }
    ${enableReview ? getReviewUIStyles() : ''}
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>

  <!-- Header Metadata -->
  <div class="header-meta">
    <dl>
      <dt>Short Title</dt>
      <dd>${escapeHtml(shortTitle)}</dd>
      <dt>IDM Code</dt>
      <dd>${escapeHtml(headerData?.idmCode || 'N/A')}</dd>
      <dt>Version</dt>
      <dd>${escapeHtml(version)}</dd>
      <dt>Status</dt>
      <dd>${escapeHtml(getStatusLabel(status))}</dd>
    </dl>
    <dl>
      <dt>Author(s)</dt>
      <dd>${escapeHtml(author)}</dd>
      <dt>Creation Date</dt>
      <dd>${escapeHtml(creationDate)}</dd>
      <dt>Language</dt>
      <dd>${escapeHtml(headerData?.language || 'EN')}</dd>
    </dl>
  </div>

  <!-- Use Case -->
  <h2>Use Case</h2>

  ${headerData?.summary || (headerData?.summaryFigures && headerData.summaryFigures.length > 0) ? `
  <div class="section">
    <h3>Summary</h3>
    ${headerData?.summary ? `<div class="description">${escapeHtml(headerData.summary)}</div>` : ''}
    ${generateFiguresHtml(headerData?.summaryFigures)}
  </div>
  ` : ''}

  ${headerData?.aimAndScope || headerData?.objectives || (headerData?.aimAndScopeFigures && headerData.aimAndScopeFigures.length > 0) ? `
  <div class="section">
    <h3>Aim and Scope</h3>
    ${(headerData?.aimAndScope || headerData?.objectives) ? `<div class="description">${escapeHtml(headerData.aimAndScope || headerData.objectives)}</div>` : ''}
    ${generateFiguresHtml(headerData?.aimAndScopeFigures)}
  </div>
  ` : ''}

  ${generateUsesSection(headerData?.uses || headerData?.useCategories)}
  ${generateStagesSection(headerData?.projectStagesIso || headerData?.projectStages)}
  ${generateRegionsSection(headerData?.regions)}
  ${generateActorsSection(headerData?.actorsList)}

  ${headerData?.benefits || (headerData?.benefitsFigures && headerData.benefitsFigures.length > 0) ? `
  <div class="section">
    <h3>Benefits</h3>
    ${headerData?.benefits ? `<div class="description">${escapeHtml(headerData.benefits)}</div>` : ''}
    ${generateFiguresHtml(headerData?.benefitsFigures)}
  </div>
  ` : ''}

  ${headerData?.limitations || (headerData?.limitationsFigures && headerData.limitationsFigures.length > 0) ? `
  <div class="section">
    <h3>Limitations</h3>
    ${headerData?.limitations ? `<div class="description">${escapeHtml(headerData.limitations)}</div>` : ''}
    ${generateFiguresHtml(headerData?.limitationsFigures)}
  </div>
  ` : ''}

  ${headerData?.preconditions ? `
  <div class="section">
    <h3>Preconditions</h3>
    <div class="description">${escapeHtml(headerData.preconditions)}</div>
  </div>
  ` : ''}

  ${headerData?.postconditions ? `
  <div class="section">
    <h3>Postconditions</h3>
    <div class="description">${escapeHtml(headerData.postconditions)}</div>
  </div>
  ` : ''}

  <!-- BPMN Diagram -->
  ${bpmnSvg ? `
  <div class="bpmn-section" id="bpmn-process-map">
    <h2>Process Map (BPMN)</h2>
    <p class="bpmn-hint">Click on elements to jump to their descriptions. Data objects link to Exchange Requirements.</p>
    <div class="bpmn-diagram">
      ${addClickableActivities(addClickableDataObjects(bpmnSvg, dataObjectErMap), bpmnElements, dataObjectErMap)}
    </div>
  </div>
  ` : ''}

  <!-- BPMN Activities -->
  ${generateActivitiesSection(bpmnElements)}

  <!-- Exchange Requirements -->
  ${generateERsSection(erDataMap, erHierarchy)}

  <div class="footer">
    Generated from IDMxPPM neo-Seoul | ISO 29481-3 (idmXML) Compliant
  </div>
  ${enableReview ? generateReviewBlocks(projectData) : ''}
</body>
</html>`;

  return html;
};

/**
 * Add onclick handlers to data object SVG elements so they link to ER sections.
 * bpmn-js SVG output uses data-element-id attributes on <g> groups.
 */
const addClickableDataObjects = (svgContent, dataObjectErMap) => {
  if (!svgContent || !dataObjectErMap || Object.keys(dataObjectErMap).length === 0) {
    return svgContent || '';
  }

  let result = svgContent;
  for (const [doId, erId] of Object.entries(dataObjectErMap)) {
    const sectionId = `er-${erId}`;
    // Match the data-element-id attribute and add click behavior + cursor styling
    const pattern = new RegExp(`data-element-id="${doId}"`, 'g');
    result = result.replace(pattern,
      `data-element-id="${doId}" style="cursor:pointer" onclick="document.getElementById('${sectionId}')?.scrollIntoView({behavior:'smooth',block:'start'})"`
    );
  }
  return result;
};

/**
 * Add onclick handlers to BPMN activity SVG elements so they link to activity descriptions.
 * Skips data objects (already handled by addClickableDataObjects).
 */
const addClickableActivities = (svgContent, bpmnElements, dataObjectErMap) => {
  if (!svgContent || !bpmnElements || bpmnElements.length === 0) {
    return svgContent || '';
  }

  const dataObjectIds = new Set(Object.keys(dataObjectErMap || {}));
  let result = svgContent;

  for (const el of bpmnElements) {
    // Skip elements without names or that are data objects (already linked to ERs)
    if (!el.name || dataObjectIds.has(el.id)) continue;
    // Skip if already has onclick (from addClickableDataObjects)
    const checkPattern = new RegExp(`data-element-id="${el.id}"[^>]*onclick`);
    if (checkPattern.test(result)) continue;

    const sectionId = `activity-${el.id}`;
    const pattern = new RegExp(`data-element-id="${el.id}"`, 'g');
    result = result.replace(pattern,
      `data-element-id="${el.id}" style="cursor:pointer" onclick="document.getElementById('${sectionId}')?.scrollIntoView({behavior:'smooth',block:'start'})"`
    );
  }
  return result;
};

/**
 * Human-readable type labels for BPMN elements.
 */
const ACTIVITY_TYPE_LABELS = {
  'bpmn:Task': 'Task',
  'bpmn:UserTask': 'User Task',
  'bpmn:ServiceTask': 'Service Task',
  'bpmn:SendTask': 'Send Task',
  'bpmn:ReceiveTask': 'Receive Task',
  'bpmn:ManualTask': 'Manual Task',
  'bpmn:BusinessRuleTask': 'Business Rule Task',
  'bpmn:ScriptTask': 'Script Task',
  'bpmn:CallActivity': 'Call Activity',
  'bpmn:SubProcess': 'Sub-Process',
  'bpmn:ExclusiveGateway': 'Exclusive Gateway (XOR)',
  'bpmn:ParallelGateway': 'Parallel Gateway (AND)',
  'bpmn:InclusiveGateway': 'Inclusive Gateway (OR)',
  'bpmn:EventBasedGateway': 'Event-Based Gateway',
  'bpmn:ComplexGateway': 'Complex Gateway',
  'bpmn:StartEvent': 'Start Event',
  'bpmn:EndEvent': 'End Event',
  'bpmn:IntermediateCatchEvent': 'Intermediate Catch Event',
  'bpmn:IntermediateThrowEvent': 'Intermediate Throw Event',
  'bpmn:BoundaryEvent': 'Boundary Event',
  'bpmn:SequenceFlow': 'Sequence Flow'
};

/**
 * Group BPMN element types into categories.
 */
const getTypeCategory = (type) => {
  if (type.includes('Task') || type.includes('Activity') || type.includes('SubProcess') || type === 'bpmn:Task') return 'Tasks';
  if (type.includes('Gateway')) return 'Gateways';
  if (type.includes('Event')) return 'Events';
  if (type.includes('Flow')) return 'Flows';
  return 'Other';
};

/**
 * Generate a table for a category of BPMN elements.
 * Each row links back to the BPMN diagram and optionally to linked ERs.
 */
const generateCategoryTable = (elements, showLane) => {
  let html = `
  <table class="task-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Type</th>
        ${showLane ? '<th>Lane / Pool</th>' : ''}
        <th>Documentation</th>
        <th>Linked ER</th>
      </tr>
    </thead>
    <tbody>`;

  elements.forEach((el, idx) => {
    const typeLabel = ACTIVITY_TYPE_LABELS[el.type] || el.type.replace('bpmn:', '');
    const rowId = `activity-${el.id}`;

    // Lane / Pool column
    const lanePool = [el.lane, el.pool].filter(Boolean).join(' / ');

    // Linked ERs column
    const linkedERs = el.linkedERs || [];
    const erLinks = linkedERs.map(er =>
      `<a class="task-er-link" href="#er-${er.erId}">${escapeHtml(er.name)}</a>`
    ).join(', ');

    html += `
      <tr id="${rowId}">
        <td>${idx + 1}</td>
        <td><a class="task-name-link" href="#" onclick="document.querySelector('[data-element-id=\\'${el.id}\\']')?.scrollIntoView({behavior:'smooth',block:'center'}); return false;">${escapeHtml(el.name)}</a></td>
        <td><span class="task-type-badge">${escapeHtml(typeLabel)}</span></td>
        ${showLane ? `<td><span class="task-lane">${escapeHtml(lanePool || '-')}</span></td>` : ''}
        <td>${el.documentation
          ? `<span class="task-doc">${escapeHtml(el.documentation)}</span>`
          : `<span class="task-no-doc">-</span>`
        }</td>
        <td>${erLinks || '-'}</td>
      </tr>`;
  });

  html += '</tbody></table>';
  return html;
};

/**
 * Generate the BPMN Activities section HTML as tables grouped by category.
 */
const generateActivitiesSection = (bpmnElements) => {
  if (!bpmnElements || bpmnElements.length === 0) return '';

  // Only include elements with names
  const named = bpmnElements.filter(el => el.name);
  if (named.length === 0) return '';

  // Check if any element has lane/pool info
  const showLane = named.some(el => el.lane || el.pool);

  // Group by category
  const groups = {};
  const categoryOrder = ['Tasks', 'Gateways', 'Events', 'Flows', 'Other'];
  for (const el of named) {
    const cat = getTypeCategory(el.type);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(el);
  }

  let html = '<div class="task-list-section"><h2>BPMN Activities</h2>';
  html += '<p style="font-size:9pt;color:#888;font-style:italic;margin-bottom:12px;">Click a name to highlight the element in the diagram above. Click an element in the diagram to jump to its row below.</p>';

  for (const cat of categoryOrder) {
    const items = groups[cat];
    if (!items || items.length === 0) continue;

    html += `<h3>${escapeHtml(cat)}</h3>`;
    html += generateCategoryTable(items, showLane);
  }

  html += '</div>';
  return html;
};

/**
 * Generate embedded project data and review UI script blocks for review mode.
 */
const generateReviewBlocks = (projectData) => {
  const safeJson = (obj) => JSON.stringify(obj).replace(/<\//g, '<\\/');
  const projectJson = projectData ? safeJson(projectData) : '{}';
  const commentsJson = safeJson({ comments: [], metadata: { exportedAt: new Date().toISOString(), commentCount: 0 } });

  return `
  <script type="application/json" id="idmxppm-project-data">${projectJson}</script>
  <script type="application/json" id="idmxppm-comments">${commentsJson}</script>
  ${getReviewUIScript()}
  `;
};

/**
 * Helper functions
 */
const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Generate HTML for section figures
 */
const generateFiguresHtml = (figures) => {
  if (!figures || !Array.isArray(figures) || figures.length === 0) {
    return '';
  }

  return `
    <div class="section-figures">
      ${figures.map(fig => {
        const caption = fig.caption || fig.name || 'Figure';
        const imgSrc = fig.data || '';
        if (!imgSrc) return '';
        return `
          <div class="section-figure">
            <img src="${imgSrc}" alt="${escapeHtml(caption)}"/>
            <div class="figure-caption">${escapeHtml(caption)}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

const formatAuthors = (authors) => {
  if (!authors || !Array.isArray(authors) || authors.length === 0) {
    return 'Not specified';
  }
  return authors.map(author => {
    if (typeof author === 'string') return author;
    if (author.type === 'person') {
      const parts = [author.givenName, author.familyName].filter(Boolean);
      return parts.join(' ');
    }
    if (author.type === 'organization') {
      return author.name || author.organizationName;
    }
    return author.name || '';
  }).filter(Boolean).join(', ');
};

const getStatusLabel = (status) => {
  const labels = {
    'NP': 'New Project',
    'WD': 'Working Draft',
    'CD': 'Committee Draft',
    'DIS': 'Draft International Standard',
    'FDIS': 'Final Draft',
    'PUB': 'Published',
    'WDRL': 'Withdrawn'
  };
  return labels[status] || status;
};

const generateUsesSection = (uses) => {
  if (!uses || uses.length === 0) return '';

  const useStrings = uses.map(use => {
    if (typeof use === 'string') return use;
    if (use.verb && use.noun) return `${use.verb} ${use.noun}`;
    return '';
  }).filter(Boolean);

  if (useStrings.length === 0) return '';

  return `
  <div class="section">
    <h3>Uses</h3>
    ${useStrings.map(u => `<span class="tag">${escapeHtml(u)}</span>`).join('')}
  </div>
  `;
};

const generateStagesSection = (stages) => {
  if (!stages || stages.length === 0) return '';

  return `
  <div class="section">
    <h3>Project Stages (ISO 22263)</h3>
    ${stages.map(s => `<span class="tag">${escapeHtml(s)}</span>`).join('')}
  </div>
  `;
};

const generateRegionsSection = (regions) => {
  if (!regions || regions.length === 0) return '';

  return `
  <div class="section">
    <h3>Regions</h3>
    ${regions.map(r => `<span class="tag">${escapeHtml(getRegionName(r))}</span>`).join('')}
  </div>
  `;
};

const generateActorsSection = (actors) => {
  if (!actors || actors.length === 0) return '';

  return `
  <div class="section">
    <h3>Actors</h3>
    <table class="actors-table">
      <thead>
        <tr>
          <th>Actor Name</th>
          <th>Type</th>
          <th>BPMN Shape</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        ${actors.map(actor => {
          const actorType = actor.actorType || 'group';
          const actorTypeLabel = actorType === 'group' ? 'Organization' : 'Individual';
          const bpmnShape = actor.bpmnShapeName || actor.bpmnId || '-';
          const role = actor.role || '-';
          const subActors = actor.subActors || [];

          let rows = `
            <tr>
              <td><strong>${escapeHtml(actor.name)}</strong></td>
              <td><span class="tag">${escapeHtml(actorTypeLabel)}</span></td>
              <td>${escapeHtml(bpmnShape)}</td>
              <td>${escapeHtml(role)}</td>
            </tr>
          `;

          // Add sub-actors (lanes) if present
          if (subActors.length > 0) {
            rows += subActors.map(sub => `
              <tr class="sub-actor-row">
                <td>&nbsp;&nbsp;&nbsp;&nbsp;└ ${escapeHtml(sub.name)}</td>
                <td><span class="tag small">Lane</span></td>
                <td>${escapeHtml(sub.bpmnShapeName || '-')}</td>
                <td>-</td>
              </tr>
            `).join('');
          }

          return rows;
        }).join('')}
      </tbody>
    </table>
  </div>
  `;
};

/**
 * Generate HTML for a single ER (recursive for subERs)
 */
const generateErHtml = (er, level = 3) => {
  const headingTag = `h${Math.min(level, 6)}`;
  const sectionId = `er-${er.id || er.guid || ''}`;
  let html = `
  <div class="er-section" id="${sectionId}">
    <${headingTag} class="er-title">${escapeHtml(er.name || 'Unnamed ER')}</${headingTag}>

    ${er.description ? `<div class="description">${escapeHtml(er.description)}</div>` : ''}
    ${generateFiguresHtml(er.descriptionFigures)}

    ${er.informationUnits && er.informationUnits.length > 0 ? `
      <h${Math.min(level + 1, 6)}>Information Units</h${Math.min(level + 1, 6)}>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Data Type</th>
            <th>Required</th>
            <th>Definition</th>
          </tr>
        </thead>
        <tbody>
          ${er.informationUnits.map(iu => generateInfoUnitRow(iu)).join('')}
        </tbody>
      </table>
    ` : ''}

    ${er.subERs && er.subERs.length > 0 ? er.subERs.map(subEr => generateErHtml(subEr, level + 1)).join('') : ''}
  </div>
  `;
  return html;
};

const generateERsSection = (erDataMap, erHierarchy) => {
  // Prefer erHierarchy (ER-first architecture) over legacy erDataMap
  if (erHierarchy && erHierarchy.length > 0) {
    let html = '<h2>Exchange Requirements</h2>';
    erHierarchy.forEach(er => {
      html += generateErHtml(er, 3);
    });
    return html;
  }

  if (!erDataMap || Object.keys(erDataMap).length === 0) {
    return '<p><em>No Exchange Requirements defined.</em></p>';
  }

  let html = '<h2>Exchange Requirements</h2>';

  Object.entries(erDataMap).forEach(([dataObjectId, er]) => {
    html += generateErHtml(er, 3);
  });

  return html;
};

const generateInfoUnitRow = (unit, level = 0) => {
  const indent = level > 0 ? '&nbsp;'.repeat(level * 4) + '└ ' : '';
  const defFigures = (unit.definitionFigures || []).filter(f => f.data);
  const exFigures = (unit.exampleImages || []).filter(f => f.data);
  const hasFigures = defFigures.length > 0 || exFigures.length > 0;

  let rows = `
    <tr>
      <td>
        ${indent}<span class="info-unit-name">${escapeHtml(unit.name)}</span>
        ${unit.correspondingExternalElements && unit.correspondingExternalElements.length > 0 ? `
          <div class="external-mapping">
            ${unit.correspondingExternalElements.map(cee =>
              `<span class="basis">${escapeHtml(cee.basis)}</span>: ${escapeHtml(cee.name)}`
            ).join(', ')}
          </div>
        ` : ''}
      </td>
      <td>${escapeHtml(unit.dataType || 'String')}</td>
      <td><span class="${unit.isMandatory ? 'mandatory' : 'optional'}">${unit.isMandatory ? 'Yes' : 'No'}</span></td>
      <td>${escapeHtml(unit.definition || '')}</td>
    </tr>
  `;

  // Render figures in a full-width row directly under this IU
  if (hasFigures) {
    rows += `<tr class="iu-figures-row"><td colspan="4"><div class="iu-figures">`;
    if (defFigures.length > 0) {
      rows += `<div class="iu-figures-group"><span class="iu-figures-label">Definition Figures</span><div class="iu-figures-list">`;
      rows += defFigures.map(f => `
        <div class="iu-figure-item">
          <img src="${f.data}" alt="${escapeHtml(f.caption || f.name || '')}"/>
          ${f.caption ? `<div class="figure-caption">${escapeHtml(f.caption)}</div>` : ''}
        </div>
      `).join('');
      rows += `</div></div>`;
    }
    if (exFigures.length > 0) {
      rows += `<div class="iu-figures-group"><span class="iu-figures-label">Examples</span><div class="iu-figures-list">`;
      rows += exFigures.map(f => `
        <div class="iu-figure-item">
          <img src="${f.data}" alt="${escapeHtml(f.caption || f.name || '')}"/>
          ${f.caption ? `<div class="figure-caption">${escapeHtml(f.caption)}</div>` : ''}
        </div>
      `).join('');
      rows += `</div></div>`;
    }
    rows += `</div></td></tr>`;
  }

  // Add sub-units recursively
  if (unit.subInformationUnits && unit.subInformationUnits.length > 0) {
    unit.subInformationUnits.forEach(sub => {
      rows += generateInfoUnitRow(sub, level + 1);
    });
  }

  return rows;
};


/**
 * Export HTML document to file
 */
export const downloadHtmlDocument = (htmlContent, filename) => {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default {
  generateHtmlDocument,
  generateStandaloneHtml,
  downloadHtmlDocument
};
