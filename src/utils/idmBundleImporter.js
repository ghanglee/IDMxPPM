/**
 * IDM Bundle Importer
 * Imports IDM specification from a ZIP bundle
 * Handles loading of idmXML, BPMN, images, and project data
 */

import JSZip from 'jszip';
import { parseIdmXml } from './idmXmlParser';
import { getMimeType, buildDataUri } from './filePathUtils.js';

/**
 * Import an IDM bundle from a ZIP file
 * @param {File|Blob|ArrayBuffer} zipData - The ZIP file data
 * @returns {Promise<Object>} Parsed project data
 */
// ZIP paths always use forward slashes; idmXML 1.0 files produced on Windows
// store paths with backslashes — normalize before any zip.file() lookup.
const normalizeZipPath = (p) => p.replace(/\\/g, '/');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp']);
const isImagePath = (p) => IMAGE_EXTENSIONS.has(p.slice(p.lastIndexOf('.')).toLowerCase());

export const importIdmBundle = async (zipData) => {
  try {
    const zip = await JSZip.loadAsync(zipData);

    const result = {
      headerData: {},
      bpmnXml: null,
      erHierarchy: [],
      dataObjectErMap: {},
      erDataMap: {},
      erLibrary: [],
      images: {}
    };

    // Build a flat list of all entries for fallback scanning
    const allEntries = [];
    zip.forEach((relativePath, file) => {
      if (!file.dir) allEntries.push({ path: relativePath, file });
    });

    // Try to read manifest first
    let manifest = null;
    const manifestFile = zip.file('manifest.json');
    if (manifestFile) {
      try {
        const manifestContent = await manifestFile.async('string');
        manifest = JSON.parse(manifestContent);
      } catch (err) {
        console.warn('Failed to parse manifest.json:', err);
      }
    }

    // Try to read project.json for full project data (preferred)
    const projectFile = zip.file('project.json');
    if (projectFile) {
      try {
        const projectContent = await projectFile.async('string');
        const projectData = JSON.parse(projectContent);

        if (projectData.headerData) result.headerData = projectData.headerData;
        if (projectData.erHierarchy) result.erHierarchy = projectData.erHierarchy;
        if (projectData.dataObjectErMap) result.dataObjectErMap = projectData.dataObjectErMap;
        if (projectData.erDataMap) result.erDataMap = projectData.erDataMap;
        if (projectData.erLibrary) result.erLibrary = projectData.erLibrary;
        if (projectData.bpmnXml) result.bpmnXml = projectData.bpmnXml;
      } catch (err) {
        console.warn('Failed to parse project.json:', err);
      }
    }

    // Read BPMN file — try manifest path and known names first, then scan all entries
    const bpmnPaths = [
      manifest?.files?.processMap,
      'process-map.bpmn',
      'diagram.bpmn',
      'bpmn.xml'
    ].filter(Boolean);

    for (const bpmnPath of bpmnPaths) {
      const bpmnFile = zip.file(bpmnPath);
      if (bpmnFile) {
        try {
          const bpmnContent = await bpmnFile.async('string');
          if (bpmnContent && bpmnContent.trim()) {
            result.bpmnXml = bpmnContent;
            console.info(`Loaded BPMN from: ${bpmnPath}`);
          }
          break;
        } catch (err) {
          console.warn(`Failed to read BPMN file ${bpmnPath}:`, err);
        }
      }
    }

    // Parse idmXML — try manifest/known paths first, then scan for any .xml file
    const knownXmlPaths = [
      manifest?.files?.specification,
      'idm-specification.xml',
      'specification.xml',
      'idm.xml'
    ].filter(Boolean);

    // Fall back to the first .xml file found in the archive (idmXML 1.0 bundles
    // name the file after the IDM title rather than using a fixed filename)
    const xmlEntry =
      knownXmlPaths.map(p => zip.file(p)).find(Boolean) ||
      allEntries.find(({ path }) =>
        path.endsWith('.xml') &&
        !path.toLowerCase().endsWith('.xsd') &&
        !path.toLowerCase().includes('xslt')
      )?.file;

    if (xmlEntry) {
      try {
        const xmlContent = await xmlEntry.async('string');
        const idmData = parseIdmXml(xmlContent);

        if (!result.headerData || Object.keys(result.headerData).length === 0) {
          result.headerData = idmData.headerData;
        }
        if (!result.erHierarchy || result.erHierarchy.length === 0) {
          if (idmData.erHierarchy) result.erHierarchy = idmData.erHierarchy;
        }
        if (!result.erDataMap || Object.keys(result.erDataMap).length === 0) {
          result.erDataMap = idmData.erDataMap;
        }

        // Try to load BPMN from the path stored in idmXML (<diagram filePath="...">)
        // Normalize backslashes — idmXML 1.0 files from Windows use backslash separators
        if (!result.bpmnXml && idmData.bpmnFilePath) {
          const normalizedPath = normalizeZipPath(idmData.bpmnFilePath);
          const bpmnFromPath = zip.file(normalizedPath);
          if (bpmnFromPath) {
            try {
              const bpmnContent = await bpmnFromPath.async('string');
              if (bpmnContent && bpmnContent.trim()) {
                result.bpmnXml = bpmnContent;
                console.info(`Loaded BPMN from idmXML path: ${normalizedPath}`);
              }
            } catch (bpmnErr) {
              console.warn(`Failed to load BPMN from path ${normalizedPath}:`, bpmnErr);
            }
          }
        }

        // Fallback: scan all entries for a .bpmn file
        if (!result.bpmnXml) {
          const bpmnEntry = allEntries.find(({ path }) => path.endsWith('.bpmn'));
          if (bpmnEntry) {
            try {
              const bpmnContent = await bpmnEntry.file.async('string');
              if (bpmnContent && bpmnContent.trim()) {
                result.bpmnXml = bpmnContent;
                console.info(`Loaded BPMN by scan: ${bpmnEntry.path}`);
              }
            } catch (bpmnErr) {
              console.warn(`Failed to read scanned BPMN ${bpmnEntry.path}:`, bpmnErr);
            }
          }
        }

        // Last resort: embedded BPMN content inside the idmXML itself
        if (!result.bpmnXml && idmData.bpmnXml) {
          result.bpmnXml = idmData.bpmnXml;
        }
      } catch (err) {
        console.warn('Failed to parse idmXML file:', err);
      }
    }

    // Load all image files — scan every entry (covers both 'images/' and 'Diagram/'
    // folders used by idmXML 1.0 bundles, as well as any other location)
    for (const { path, file } of allEntries) {
      if (!isImagePath(path)) continue;
      try {
        const data = await file.async('base64');
        const mimeType = getMimeType(path);
        const dataUri = buildDataUri(mimeType, data);
        // Store under both the original path and the forward-slash-normalized path
        // so that lookups work regardless of which separator the idmXML used.
        result.images[path] = dataUri;
        const normalized = normalizeZipPath(path);
        if (normalized !== path) result.images[normalized] = dataUri;
      } catch (err) {
        console.warn(`Failed to load image ${path}:`, err);
      }
    }

    // Restore image data back into ER and header structures
    restoreImageData(result.erDataMap, result.images);
    restoreErHierarchyImageData(result.erHierarchy, result.images);
    restoreHeaderImageData(result.headerData, result.images);

    // Apply GUIDs from manifest if available
    if (manifest?.guids) {
      result.headerData = { ...result.headerData, ...manifest.guids };
    }

    // Auto-map data objects to ERs by name for any entries not already mapped
    if (result.bpmnXml && result.erHierarchy.length > 0) {
      result.dataObjectErMap = autoMapDataObjectsToERs(
        result.bpmnXml, result.erHierarchy, result.dataObjectErMap
      );
    }

    return result;
  } catch (error) {
    console.error('Error importing IDM bundle:', error);
    throw new Error('Failed to import IDM bundle: ' + error.message);
  }
};


/**
 * Auto-map BPMN data object references to ERs by matching names.
 * Only adds entries not already present in existingMap — existing links are preserved.
 * Matching is case-insensitive and whitespace-trimmed.
 * @param {string} bpmnXml - BPMN XML string
 * @param {Array} erHierarchy - ER hierarchy (nested)
 * @param {Object} [existingMap={}] - existing dataObjectErMap entries to preserve
 * @returns {Object} merged map with auto-matched entries added
 */
export const autoMapDataObjectsToERs = (bpmnXml, erHierarchy, existingMap = {}) => {
  if (!bpmnXml || !erHierarchy || erHierarchy.length === 0) return { ...existingMap };

  // Flatten the ER hierarchy recursively
  const allERs = [];
  const flatten = (ers) => {
    ers.forEach(er => {
      allERs.push(er);
      if (er.subERs && er.subERs.length > 0) flatten(er.subERs);
    });
  };
  flatten(erHierarchy);

  // Build normalized-name → ER lookup (first match wins)
  const erByName = new Map();
  allERs.forEach(er => {
    [er.name, er.shortTitle, er.fullTitle].forEach(n => {
      if (n) {
        const key = n.trim().toLowerCase();
        if (!erByName.has(key)) erByName.set(key, er);
      }
    });
  });

  // Parse BPMN XML and extract all DataObjectReference id/name pairs
  let bpmnDoc;
  try {
    bpmnDoc = new DOMParser().parseFromString(bpmnXml, 'text/xml');
    if (bpmnDoc.querySelector('parsererror')) return { ...existingMap };
  } catch {
    return { ...existingMap };
  }

  const result = { ...existingMap };
  const allEls = bpmnDoc.getElementsByTagName('*');
  for (let i = 0; i < allEls.length; i++) {
    const el = allEls[i];
    if (el.localName !== 'dataObjectReference') continue;
    const id = el.getAttribute('id');
    const name = el.getAttribute('name');
    if (!id || !name || result[id]) continue; // skip unmapped or already mapped
    const matched = erByName.get(name.trim().toLowerCase());
    if (matched) result[id] = matched.id;
  }
  return result;
};

/**
 * Restore base64 image data in ER data map from extracted images
 */
const restoreImageData = (erDataMap, images) => {
  if (!erDataMap || !images) return;

  Object.values(erDataMap).forEach(er => {
    // Restore ER description figures
    if (er.descriptionFigures && er.descriptionFigures.length > 0) {
      er.descriptionFigures = er.descriptionFigures.map(img => {
        if (img.filePath && images[img.filePath]) {
          return { ...img, data: images[img.filePath] };
        }
        return img;
      });
    }

    if (!er.informationUnits) return;

    const processUnit = (unit) => {
      // Restore IU definition figures
      if (unit.definitionFigures && unit.definitionFigures.length > 0) {
        unit.definitionFigures = unit.definitionFigures.map(img => {
          if (img.filePath && images[img.filePath]) {
            return { ...img, data: images[img.filePath] };
          }
          return img;
        });
      }
      // Restore IU example images
      if (unit.exampleImages && unit.exampleImages.length > 0) {
        unit.exampleImages = unit.exampleImages.map(img => {
          if (img.filePath && images[img.filePath]) {
            return { ...img, data: images[img.filePath] };
          }
          return img;
        });
      }

      if (unit.subInformationUnits && unit.subInformationUnits.length > 0) {
        unit.subInformationUnits.forEach(processUnit);
      }
    };

    er.informationUnits.forEach(processUnit);
  });
};

/**
 * Restore base64 image data in ER hierarchy (recursive) from extracted images
 */
const restoreErHierarchyImageData = (erHierarchy, images) => {
  if (!erHierarchy || !images) return;

  const restoreErImages = (er) => {
    if (!er) return;

    // Restore ER description figures
    if (er.descriptionFigures && er.descriptionFigures.length > 0) {
      er.descriptionFigures = er.descriptionFigures.map(img => {
        if (img.filePath && images[img.filePath]) {
          return { ...img, data: images[img.filePath] };
        }
        return img;
      });
    }

    if (er.informationUnits) {
      const processUnit = (unit) => {
        // Restore IU definition figures
        if (unit.definitionFigures && unit.definitionFigures.length > 0) {
          unit.definitionFigures = unit.definitionFigures.map(img => {
            if (img.filePath && images[img.filePath]) {
              return { ...img, data: images[img.filePath] };
            }
            return img;
          });
        }
        // Restore IU example images
        if (unit.exampleImages && unit.exampleImages.length > 0) {
          unit.exampleImages = unit.exampleImages.map(img => {
            if (img.filePath && images[img.filePath]) {
              return { ...img, data: images[img.filePath] };
            }
            return img;
          });
        }
        if (unit.subInformationUnits && unit.subInformationUnits.length > 0) {
          unit.subInformationUnits.forEach(processUnit);
        }
      };
      er.informationUnits.forEach(processUnit);
    }

    // Recurse into subERs
    if (er.subERs && er.subERs.length > 0) {
      er.subERs.forEach(restoreErImages);
    }
  };

  erHierarchy.forEach(restoreErImages);
};

/**
 * Restore base64 image data in header data from extracted images
 */
const restoreHeaderImageData = (headerData, images) => {
  if (!headerData || !images) return;

  const figureSections = [
    'aimAndScopeFigures',
    'summaryFigures',
    'benefitsFigures',
    'limitationsFigures',
    'propositionsFigures'
  ];

  figureSections.forEach(section => {
    if (headerData[section] && headerData[section].length > 0) {
      headerData[section] = headerData[section].map(fig => {
        if (fig.filePath && images[fig.filePath]) {
          return {
            ...fig,
            data: images[fig.filePath]
          };
        }
        return fig;
      });
    }
  });
};

/**
 * Check if a file appears to be a ZIP bundle
 * @param {File} file - The file to check
 * @returns {boolean}
 */
export const isZipBundle = (file) => {
  if (!file) return false;

  const name = file.name?.toLowerCase() || '';
  const type = file.type?.toLowerCase() || '';

  return name.endsWith('.zip') ||
         name.endsWith('.idmx') ||
         type === 'application/zip' ||
         type === 'application/x-zip-compressed';
};

export default {
  importIdmBundle,
  isZipBundle
};
