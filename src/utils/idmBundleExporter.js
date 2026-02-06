/**
 * IDM Bundle Exporter
 * Exports IDM specification as a ZIP bundle with images
 * ISO 29481-3 compliant with proper file references
 */

import JSZip from 'jszip';
import { generateIdmXml } from './idmXmlGenerator';

/**
 * Extract images from ER data and prepare them for bundle
 * @param {Object} erDataMap - Map of data object IDs to ER data
 * @param {Object} headerData - Header data with figure images
 * @returns {Object} { images: Array, erDataMapWithPaths: Object, headerDataWithPaths: Object }
 */
const extractImages = (erDataMap, headerData) => {
  const images = [];
  let imageCounter = 0;

  // Deep clone to avoid mutating original data
  const erDataMapWithPaths = JSON.parse(JSON.stringify(erDataMap || {}));
  const headerDataWithPaths = JSON.parse(JSON.stringify(headerData || {}));

  // Extract images from ER information units
  Object.entries(erDataMapWithPaths).forEach(([dataObjectId, er]) => {
    if (!er.informationUnits) return;

    const processUnit = (unit, path) => {
      if (unit.exampleImages && unit.exampleImages.length > 0) {
        unit.exampleImages = unit.exampleImages.map((img, imgIndex) => {
          if (img.data && img.data.startsWith('data:')) {
            imageCounter++;
            const ext = getExtensionFromMimeType(img.type || 'image/png');
            const fileName = `images/er_${sanitizeFilename(er.id || dataObjectId)}_iu${path}_img${imgIndex}.${ext}`;

            images.push({
              fileName,
              data: img.data,
              type: img.type || 'image/png',
              caption: img.caption || img.name
            });

            return {
              ...img,
              filePath: fileName,
              // Remove base64 data from exported structure
              data: undefined
            };
          }
          return img;
        });
      }

      // Process sub information units recursively
      if (unit.subInformationUnits && unit.subInformationUnits.length > 0) {
        unit.subInformationUnits.forEach((subUnit, subIndex) => {
          processUnit(subUnit, `${path}_sub${subIndex}`);
        });
      }
    };

    er.informationUnits.forEach((unit, unitIndex) => {
      processUnit(unit, `${unitIndex}`);
    });
  });

  // Extract images from Use Case figures
  const figureSections = [
    'aimAndScopeFigures',
    'summaryFigures',
    'benefitsFigures',
    'limitationsFigures',
    'propositionsFigures'
  ];

  figureSections.forEach(section => {
    if (headerDataWithPaths[section] && headerDataWithPaths[section].length > 0) {
      headerDataWithPaths[section] = headerDataWithPaths[section].map((fig, figIndex) => {
        if (fig.data && fig.data.startsWith('data:')) {
          imageCounter++;
          const ext = getExtensionFromMimeType(fig.type || 'image/png');
          const fileName = `images/uc_${section}_fig${figIndex}.${ext}`;

          images.push({
            fileName,
            data: fig.data,
            type: fig.type || 'image/png',
            caption: fig.caption || fig.name
          });

          return {
            ...fig,
            filePath: fileName,
            data: undefined
          };
        }
        return fig;
      });
    }
  });

  return {
    images,
    erDataMapWithPaths,
    headerDataWithPaths
  };
};

/**
 * Get file extension from MIME type
 */
const getExtensionFromMimeType = (mimeType) => {
  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp'
  };
  return map[mimeType] || 'png';
};

/**
 * Sanitize filename for use in paths
 */
const sanitizeFilename = (name) => {
  return String(name || 'unnamed')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50);
};

/**
 * Convert base64 data URL to binary array buffer
 */
const base64ToArrayBuffer = (dataUrl) => {
  // Extract base64 data after the comma
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Export IDM specification as a ZIP bundle
 *
 * @param {Object} params
 * @param {Object} params.headerData - IDM header/metadata
 * @param {string} params.bpmnXml - BPMN XML content
 * @param {Object} params.erDataMap - Map of dataObjectId to ER data
 * @param {Array} params.dataObjects - List of data objects from BPMN
 * @param {Object} params.erLibrary - ER library data
 * @returns {Promise<Blob>} ZIP file as Blob
 */
export const exportIdmBundle = async ({
  headerData,
  bpmnXml,
  erDataMap,
  erHierarchy,
  dataObjects = [],
  erLibrary = []
}) => {
  const zip = new JSZip();

  // Extract images and get modified data with file paths
  const { images, erDataMapWithPaths, headerDataWithPaths } = extractImages(erDataMap, headerData);

  // Generate idmXML with file paths for images
  const result = generateIdmXml({
    headerData: headerDataWithPaths,
    bpmnXml: null, // BPMN will be in separate file
    erDataMap: erDataMapWithPaths,
    erHierarchy,
    dataObjects
  });

  // Add idmXML specification
  zip.file('idm-specification.xml', result.xml);

  // Add BPMN diagram as separate file
  if (bpmnXml) {
    zip.file('process-map.bpmn', bpmnXml);
  }

  // Add images
  if (images.length > 0) {
    const imagesFolder = zip.folder('images');
    images.forEach(img => {
      try {
        const arrayBuffer = base64ToArrayBuffer(img.data);
        // Remove 'images/' prefix since we're already in the folder
        const fileName = img.fileName.replace('images/', '');
        imagesFolder.file(fileName, arrayBuffer);
      } catch (err) {
        console.warn(`Failed to add image ${img.fileName}:`, err);
      }
    });
  }

  // Add manifest file
  const manifest = {
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0',
    format: 'idm-bundle',
    schemaVersion: 'idmXML 2.0',
    createdBy: 'IDMxPPM neo-Seoul',
    createdAt: new Date().toISOString(),
    files: {
      specification: 'idm-specification.xml',
      processMap: bpmnXml ? 'process-map.bpmn' : null,
      images: images.map(img => img.fileName)
    },
    guids: result.guids
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Add project data for round-trip support (includes bpmnXml for reliability)
  const projectData = {
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0',
    format: 'idm-bundle-project',
    headerData: { ...headerDataWithPaths, ...result.guids },
    erDataMap: erDataMapWithPaths,
    erLibrary,
    bpmnXml: bpmnXml || null // Include BPMN in project.json as backup
  };
  zip.file('project.json', JSON.stringify(projectData, null, 2));

  // Generate ZIP blob
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return blob;
};

/**
 * Download IDM bundle as ZIP file
 */
export const downloadIdmBundle = async (params, filename = 'idm-bundle.zip') => {
  const blob = await exportIdmBundle(params);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return blob;
};

export default {
  exportIdmBundle,
  downloadIdmBundle
};
