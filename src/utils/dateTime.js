/**
 * Date-time helpers for ISO 8601-1 compliance.
 *
 * ISO 8601-1 requires the date and time to be joined by the letter 'T'
 * (yyyy-MM-ddTHH:mm:ss). Legacy xPPM files and older exports used a space
 * separator (yyyy-MM-dd HH:mm:ss). These helpers normalize to the ISO form on
 * both import and export so round-tripped data stays compliant.
 */

/**
 * Normalize a date-time string to ISO 8601-1 form (yyyy-MM-ddTHH:mm:ss).
 * Converts the single space between the date and time into 'T'. Values that
 * already use 'T', pure dates (yyyy-MM-dd), and empty/undefined values are
 * returned unchanged.
 *
 * @param {*} value
 * @returns {*} the normalized string, or the original value when not a date-time
 */
export const toIso8601DateTime = (value) => {
  if (!value) return value;
  return String(value).replace(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(?::\d{2})?)/,
    '$1T$2'
  );
};

/**
 * True when the string carries a time component (contains HH:mm).
 * @param {*} value
 * @returns {boolean}
 */
export const hasTimeComponent = (value) => /\d{2}:\d{2}/.test(String(value || ''));
