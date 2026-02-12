/**
 * IDM Bundle Importer
 * Imports IDM specification from a ZIP bundle
 * Handles loading of idmXML, BPMN, images, and project data
 */

import JSZip from 'jszip';
import { parseIdmXml } from './idmXmlParser';

/**
 * Import an IDM bundle from a ZIP file
 * @param {File|Blob|ArrayBuffer} zipData - The ZIP file data
 * @returns {Promise<Object>} Parsed project data
 */
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

        if (projectData.headerData) {
          result.headerData = projectData.headerData;
        }
        if (projectData.erHierarchy) {
          result.erHierarchy = projectData.erHierarchy;
        }
        if (projectData.dataObjectErMap) {
          result.dataObjectErMap = projectData.dataObjectErMap;
        }
        if (projectData.erDataMap) {
          result.erDataMap = projectData.erDataMap;
        }
        if (projectData.erLibrary) {
          result.erLibrary = projectData.erLibrary;
        }
        // Get BPMN from project.json if available (backup)
        if (projectData.bpmnXml) {
          result.bpmnXml = projectData.bpmnXml;
        }
      } catch (err) {
        console.warn('Failed to parse project.json:', err);
      }
    }

    // Read BPMN file from separate file (overrides project.json if found)
    // Try manifest path first, then common file names
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

    // Also parse idmXML to get any additional data (even if we have project.json)
    const xmlPaths = [
      manifest?.files?.specification,
      'idm-specification.xml',
      'specification.xml',
      'idm.xml'
    ].filter(Boolean);

    for (const xmlPath of xmlPaths) {
      const xmlFile = zip.file(xmlPath);
      if (xmlFile) {
        try {
          const xmlContent = await xmlFile.async('string');
          const idmData = parseIdmXml(xmlContent);

          // Merge parsed data (project.json takes precedence if available)
          if (!result.headerData || Object.keys(result.headerData).length === 0) {
            result.headerData = idmData.headerData;
          }
          if (!result.erHierarchy || result.erHierarchy.length === 0) {
            if (idmData.erHierarchy) {
              result.erHierarchy = idmData.erHierarchy;
            }
          }
          if (!result.erDataMap || Object.keys(result.erDataMap).length === 0) {
            result.erDataMap = idmData.erDataMap;
          }

          // Try to load BPMN from the file path specified in idmXML
          if (!result.bpmnXml && idmData.bpmnFilePath) {
            const bpmnFromPath = zip.file(idmData.bpmnFilePath);
            if (bpmnFromPath) {
              try {
                const bpmnContent = await bpmnFromPath.async('string');
                if (bpmnContent && bpmnContent.trim()) {
                  result.bpmnXml = bpmnContent;
                  console.info(`Loaded BPMN from idmXML path: ${idmData.bpmnFilePath}`);
                }
              } catch (bpmnErr) {
                console.warn(`Failed to load BPMN from path ${idmData.bpmnFilePath}:`, bpmnErr);
              }
            }
          }

          // Fallback: use embedded BPMN from idmXML if still no BPMN
          if (!result.bpmnXml && idmData.bpmnXml) {
            result.bpmnXml = idmData.bpmnXml;
          }
          break;
        } catch (err) {
          console.warn(`Failed to parse idmXML file ${xmlPath}:`, err);
        }
      }
    }

    // Load images from the images folder
    const imagesFolder = zip.folder('images');
    if (imagesFolder) {
      const imageFiles = [];
      imagesFolder.forEach((relativePath, file) => {
        if (!file.dir) {
          imageFiles.push({ path: `images/${relativePath}`, file });
        }
      });

      for (const { path, file } of imageFiles) {
        try {
          const data = await file.async('base64');
          const ext = path.split('.').pop()?.toLowerCase();
          const mimeType = getMimeTypeFromExtension(ext);
          result.images[path] = `data:${mimeType};base64,${data}`;
        } catch (err) {
          console.warn(`Failed to load image ${path}:`, err);
        }
      }

      // Restore image data in ERs and headerData
      restoreImageData(result.erDataMap, result.images);
      restoreErHierarchyImageData(result.erHierarchy, result.images);
      restoreHeaderImageData(result.headerData, result.images);
    }

    // Apply GUIDs from manifest if available
    if (manifest?.guids) {
      result.headerData = {
        ...result.headerData,
        ...manifest.guids
      };
    }

    return result;
  } catch (error) {
    console.error('Error importing IDM bundle:', error);
    throw new Error('Failed to import IDM bundle: ' + error.message);
  }
};

/**
 * Get MIME type from file extension
 */
const getMimeTypeFromExtension = (ext) => {
  const map = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp'
  };
  return map[ext] || 'image/png';
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
