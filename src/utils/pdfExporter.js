/**
 * PDF Exporter for IDM Specifications
 * Transforms idmXML using XSLT and generates printable output
 */

import { defaultIdmXslt } from './defaultIdmXslt';

/**
 * Transform XML using XSLT stylesheet
 * @param {string} xmlContent - The XML content to transform
 * @param {string} xsltContent - The XSLT stylesheet content
 * @returns {string} Transformed HTML content
 */
export const transformXmlWithXslt = (xmlContent, xsltContent) => {
  const parser = new DOMParser();

  // Parse XML
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  const xmlError = xmlDoc.querySelector('parsererror');
  if (xmlError) {
    throw new Error('Invalid XML: ' + xmlError.textContent);
  }

  // Parse XSLT
  const xsltDoc = parser.parseFromString(xsltContent, 'text/xml');
  const xsltError = xsltDoc.querySelector('parsererror');
  if (xsltError) {
    throw new Error('Invalid XSLT: ' + xsltError.textContent);
  }

  // Create XSLT processor and transform
  const xsltProcessor = new XSLTProcessor();
  xsltProcessor.importStylesheet(xsltDoc);

  const resultDoc = xsltProcessor.transformToDocument(xmlDoc);

  // Serialize result to string
  const serializer = new XMLSerializer();
  return serializer.serializeToString(resultDoc);
};

/**
 * Export idmXML as PDF using XSLT transformation
 * Opens a new window with the transformed HTML and triggers print dialog
 * @param {string} idmXmlContent - The idmXML content
 * @param {string|null} customXsltContent - Custom XSLT content (optional)
 * @param {string} filename - The filename for the PDF
 */
export const exportToPdf = async (idmXmlContent, customXsltContent = null, filename = 'idm-specification') => {
  try {
    // Use custom XSLT or default
    const xsltContent = customXsltContent || defaultIdmXslt;

    // Transform XML to HTML
    const htmlContent = transformXmlWithXslt(idmXmlContent, xsltContent);

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (!printWindow) {
      throw new Error('Pop-up blocked. Please allow pop-ups for this site to export PDF.');
    }

    // Write the HTML content
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Set the document title for PDF filename
    printWindow.document.title = filename;

    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      // Small delay to ensure styles are applied
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };

    // Fallback if onload doesn't fire
    setTimeout(() => {
      if (printWindow && !printWindow.closed) {
        printWindow.print();
      }
    }, 1000);

    return true;
  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
};

/**
 * Read file content as text
 * @param {File} file - The file to read
 * @returns {Promise<string>} File content as string
 */
export const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

export default {
  transformXmlWithXslt,
  exportToPdf,
  readFileAsText
};
