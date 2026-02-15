/**
 * File Path & Embedded Data Utilities
 *
 * Centralized module for:
 * - OS-agnostic file path normalization (Windows ↔ Unix)
 * - Detection of embedded (Base64/CDATA) vs external file references
 * - MIME type mapping
 * - Path resolution candidates for IDM file structure conventions
 *
 * Pure JavaScript — no Node.js dependencies. Safe for both browser and renderer.
 *
 * References:
 * - idmXSD v2.0 <diagram>: @diagramFilePath (external) or <diagramContent> (embedded CDATA)
 * - idmXSD v2.0 <image>: @filePath (external) or @encoding="base64" + text content (embedded)
 */

// ============================================================
// Section 1: MIME Type Constants & Functions
// ============================================================

/**
 * Map of file extensions (lowercase, no dot) to MIME types.
 * Covers image formats used in IDM specifications.
 */
export const EXT_TO_MIME = Object.freeze({
  'png':  'image/png',
  'jpg':  'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif':  'image/gif',
  'svg':  'image/svg+xml',
  'bmp':  'image/bmp',
  'webp': 'image/webp'
});

/**
 * Map of MIME types to preferred file extensions (lowercase, no dot).
 */
export const MIME_TO_EXT = Object.freeze({
  'image/png':     'png',
  'image/jpeg':    'jpg',
  'image/jpg':     'jpg',
  'image/gif':     'gif',
  'image/svg+xml': 'svg',
  'image/bmp':     'bmp',
  'image/webp':    'webp'
});

/**
 * Get the MIME type for a file extension or filename.
 * Accepts bare extension ('png'), dotted ('.png'), or full filename ('photo.PNG').
 * Returns 'image/png' as default if extension is unrecognized.
 *
 * @param {string} extensionOrFilename
 * @returns {string} MIME type string
 */
export const getMimeType = (extensionOrFilename) => {
  if (!extensionOrFilename || typeof extensionOrFilename !== 'string') return 'image/png';
  let ext = extensionOrFilename.replace(/^\./, '');
  if (ext.includes('.')) {
    ext = extname(ext);
  }
  return EXT_TO_MIME[ext.toLowerCase()] || 'image/png';
};

/**
 * Get the preferred file extension for a MIME type.
 * Returns 'png' as default if MIME type is unrecognized.
 *
 * @param {string} mimeType
 * @returns {string} File extension without dot
 */
export const getExtension = (mimeType) => {
  if (!mimeType || typeof mimeType !== 'string') return 'png';
  return MIME_TO_EXT[mimeType.toLowerCase()] || 'png';
};

// ============================================================
// Section 2: Path Normalization
// ============================================================

/**
 * Normalize a file path to use forward slashes (canonical internal format).
 * Handles Windows backslash paths, mixed separators, and null/undefined input.
 *
 * @param {string} filePath
 * @returns {string} Path with all backslashes converted to forward slashes
 */
export const normalizePath = (filePath) => {
  if (!filePath || typeof filePath !== 'string') return '';
  return filePath.replace(/\\/g, '/');
};

/**
 * Convert a canonical (forward-slash) path to OS-appropriate format for display.
 * Uses window.electronAPI.platform if available, otherwise defaults to forward slashes.
 *
 * @param {string} filePath - Canonical internal path (forward slashes)
 * @returns {string} Path formatted for the current OS
 */
export const toDisplayPath = (filePath) => {
  if (!filePath || typeof filePath !== 'string') return '';
  const isWindows = typeof window !== 'undefined'
    && window.electronAPI?.platform === 'win32';
  return isWindows ? filePath.replace(/\//g, '\\') : filePath;
};

/**
 * Extract the filename (basename) from a path with mixed separators.
 *
 * @param {string} filePath - File path (may use any separator style)
 * @returns {string} The last path segment (filename with extension)
 */
export const basename = (filePath) => {
  if (!filePath || typeof filePath !== 'string') return '';
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || '';
};

/**
 * Extract the directory portion of a path (everything before the last separator).
 *
 * @param {string} filePath
 * @returns {string} The directory portion, or '' if no separator is found
 */
export const dirname = (filePath) => {
  if (!filePath || typeof filePath !== 'string') return '';
  const normalized = normalizePath(filePath);
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash <= 0) return lastSlash === 0 ? '/' : '';
  return normalized.slice(0, lastSlash);
};

/**
 * Join path segments using forward slashes (canonical internal format).
 * Removes duplicate separators but does not resolve '..' or '.'.
 *
 * @param {...string} segments - Path segments to join
 * @returns {string} Joined path with forward slashes
 */
export const joinPath = (...segments) => {
  return segments
    .filter(s => s != null && s !== '')
    .map(s => normalizePath(String(s)))
    .join('/')
    .replace(/\/{2,}/g, '/');
};

/**
 * Extract the file extension from a filename or path, without the leading dot.
 * Returns lowercase extension.
 *
 * @param {string} filePath
 * @returns {string} Lowercase extension without dot, or '' if none
 */
export const extname = (filePath) => {
  const name = basename(filePath);
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex <= 0) return ''; // No dot, or dotfile like ".gitignore"
  return name.slice(dotIndex + 1).toLowerCase();
};

// ============================================================
// Section 3: Embedded vs External Detection
// ============================================================

/**
 * Check if a string is a base64 data URI (e.g., "data:image/png;base64,iVBOR...").
 *
 * @param {string} value
 * @returns {boolean}
 */
export const isDataUri = (value) => {
  return typeof value === 'string' && value.startsWith('data:');
};

/**
 * Check if an XML encoding attribute indicates embedded base64 content.
 *
 * @param {string|null} encoding - The encoding attribute value from XML
 * @returns {boolean}
 */
export const isBase64Encoding = (encoding) => {
  return typeof encoding === 'string' && encoding.toLowerCase() === 'base64';
};

/**
 * Construct a data URI from MIME type and base64 payload.
 *
 * @param {string} mimeType - e.g., 'image/png'
 * @param {string} base64Data - Raw base64-encoded data (without the data: prefix)
 * @returns {string} Complete data URI string
 */
export const buildDataUri = (mimeType, base64Data) => {
  return `data:${mimeType};base64,${base64Data}`;
};

/**
 * Parse a data URI into its components.
 *
 * @param {string} dataUri - e.g., 'data:image/png;base64,iVBOR...'
 * @returns {{ mimeType: string, base64Data: string } | null}
 */
export const parseDataUri = (dataUri) => {
  if (!isDataUri(dataUri)) return null;
  const match = dataUri.match(/^data:([^;]+);base64,(.*)$/s);
  if (!match) return null;
  return { mimeType: match[1], base64Data: match[2] };
};

/**
 * Classify a content reference as either embedded data or an external file path.
 *
 * Priority: data URI > base64-encoded XML content > file path > none.
 *
 * @param {Object} params
 * @param {string} [params.data] - Data URI string (for images/figures already loaded)
 * @param {string} [params.encoding] - XML encoding attribute ('base64' for embedded)
 * @param {string} [params.filePath] - External file path reference
 * @param {string} [params.textContent] - Raw text/base64 content from XML element
 * @param {string} [params.mimeType] - MIME type (used when constructing data URI from base64)
 * @returns {{ type: 'embedded', dataUri: string } | { type: 'external', filePath: string } | { type: 'none' }}
 */
export const classifyContent = ({ data, encoding, filePath, textContent, mimeType } = {}) => {
  // Priority 1: Already a data URI
  if (isDataUri(data)) {
    return { type: 'embedded', dataUri: data };
  }
  // Priority 2: XML element with base64 encoding attribute
  if (isBase64Encoding(encoding) && textContent) {
    const mime = mimeType || 'image/png';
    return { type: 'embedded', dataUri: buildDataUri(mime, textContent.trim()) };
  }
  // Priority 3: External file path
  if (filePath) {
    return { type: 'external', filePath: normalizePath(filePath) };
  }
  return { type: 'none' };
};

// ============================================================
// Section 4: Path Resolution Candidates
// ============================================================

/**
 * Generate candidate paths for resolving a BPMN diagram file.
 * Returns the original (normalized) path plus fallback locations
 * per the IDM file structure convention (Diagram/ subfolder).
 * Results are deduplicated.
 *
 * @param {string} originalPath - The original file path from idmXML or xPPM
 * @returns {string[]} Candidate paths to try, in priority order
 */
export const bpmnCandidates = (originalPath) => {
  const normalized = normalizePath(originalPath);
  const name = basename(normalized);
  if (!name) return normalized ? [normalized] : [];
  return [...new Set([
    normalized,
    `./Diagram/${name}`,
    `Diagram/${name}`
  ])];
};

/**
 * Generate candidate paths for resolving an image file.
 * Returns the original (normalized) path plus fallback locations
 * per the IDM file structure convention (Image/ subfolder).
 * Results are deduplicated.
 *
 * @param {string} originalPath - The original file path from idmXML or xPPM
 * @returns {string[]} Candidate paths to try, in priority order
 */
export const imageCandidates = (originalPath) => {
  const normalized = normalizePath(originalPath);
  const name = basename(normalized);
  if (!name) return normalized ? [normalized] : [];
  return [...new Set([
    normalized,
    `./Image/${name}`,
    `Image/${name}`
  ])];
};

export default {
  // MIME
  EXT_TO_MIME, MIME_TO_EXT, getMimeType, getExtension,
  // Path
  normalizePath, toDisplayPath, basename, dirname, joinPath, extname,
  // Embedded detection
  isDataUri, isBase64Encoding, buildDataUri, parseDataUri, classifyContent,
  // Resolution candidates
  bpmnCandidates, imageCandidates
};
