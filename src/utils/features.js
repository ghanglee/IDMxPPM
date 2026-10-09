/**
 * Feature switches.
 *
 * mvdXML import/export is still under development and is switched off. Set `mvdXml` to true to
 * bring it back (also flip MVDXML_ENABLED in electron/main.js, which cannot import this module).
 */
export const FEATURES = {
  mvdXml: false
};

export const MVDXML_DISABLED_MESSAGE =
  'mvdXML import/export is temporarily disabled while it is under development.';
