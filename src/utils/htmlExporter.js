/**
 * HTML Exporter for IDM Specifications
 * Generates self-contained HTML with embedded images and BPMN diagrams
 */

import { defaultIdmXslt } from './defaultIdmXslt';
import { getRegionName } from './idmXmlParser';

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
  bpmnSvg,
  customXsltContent
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
  <div class="bpmn-section">
    <h2>Process Map (BPMN)</h2>
    <div class="bpmn-diagram">
      ${bpmnSvg}
    </div>
  </div>
  ` : ''}

  <!-- Exchange Requirements -->
  ${generateERsSection(erDataMap)}

  <div class="footer">
    Generated from IDMxPPM neo-Seoul | ISO 29481-3 (idmXML) Compliant
  </div>
</body>
</html>`;

  return html;
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

const generateERsSection = (erDataMap) => {
  if (!erDataMap || Object.keys(erDataMap).length === 0) {
    return '<p><em>No Exchange Requirements defined.</em></p>';
  }

  let html = '<h2>Exchange Requirements</h2>';

  Object.entries(erDataMap).forEach(([dataObjectId, er]) => {
    html += `
    <div class="er-section">
      <h3 class="er-title">${escapeHtml(er.name || dataObjectId)}</h3>

      ${er.description ? `<div class="description">${escapeHtml(er.description)}</div>` : ''}
      ${generateFiguresHtml(er.descriptionFigures)}

      ${er.informationUnits && er.informationUnits.length > 0 ? `
        <h4>Information Units</h4>
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
        ${generateInfoUnitImages(er.informationUnits)}
      ` : ''}
    </div>
    `;
  });

  return html;
};

const generateInfoUnitRow = (unit, level = 0) => {
  const indent = level > 0 ? '&nbsp;'.repeat(level * 4) + '└ ' : '';

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
      <td>
        ${escapeHtml(unit.definition || '')}
        ${unit.definitionFigures && unit.definitionFigures.length > 0 ? `
          <div class="section-figures" style="margin-top:4px;">
            ${unit.definitionFigures.filter(f => f.data).map(f => `
              <div class="section-figure" style="display:inline-block;max-width:120px;margin:2px;">
                <img src="${f.data}" alt="${escapeHtml(f.caption || f.name || '')}" style="max-width:100%;"/>
                ${f.caption ? `<div class="figure-caption" style="font-size:0.75em;">${escapeHtml(f.caption)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </td>
    </tr>
  `;

  // Add sub-units recursively
  if (unit.subInformationUnits && unit.subInformationUnits.length > 0) {
    unit.subInformationUnits.forEach(sub => {
      rows += generateInfoUnitRow(sub, level + 1);
    });
  }

  return rows;
};

const generateInfoUnitImages = (units) => {
  const images = [];
  collectAllImages(units, images);

  if (images.length === 0) return '';

  return `
    <div class="example-images">
      ${images.map(img => `
        <div class="example-image">
          <img src="${img.data || ''}" alt="${escapeHtml(img.caption || img.name || 'Example image')}"/>
          <div class="caption">${escapeHtml(img.caption || img.name || '')}</div>
        </div>
      `).join('')}
    </div>
  `;
};

const collectAllImages = (units, images) => {
  units.forEach(unit => {
    if (unit.exampleImages && unit.exampleImages.length > 0) {
      unit.exampleImages.forEach(img => {
        if (img.data) {
          images.push(img);
        }
      });
    }
    if (unit.subInformationUnits) {
      collectAllImages(unit.subInformationUnits, images);
    }
  });
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
