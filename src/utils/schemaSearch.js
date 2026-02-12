/**
 * Schema Search Utility
 * Provides exact and semantic search for external schemas
 */

import SCHEMA_INFO from '../schemas/schemaData';

/**
 * Calculate similarity score between two strings (for semantic matching)
 * Uses Levenshtein distance and keyword matching
 */
const calculateSimilarity = (str1, str2) => {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Exact match
  if (s1 === s2) return 1;

  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Word overlap
  const words1 = s1.split(/\W+/).filter(w => w.length > 2);
  const words2 = s2.split(/\W+/).filter(w => w.length > 2);
  const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
  if (commonWords.length > 0) {
    return 0.5 + (commonWords.length / Math.max(words1.length, words2.length)) * 0.3;
  }

  // Character-based similarity (simple)
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1;

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length * 0.4;
};

/**
 * Normalize schema result to ensure consistent field structure
 * @param {Object} item - Raw schema item
 * @param {string} schemaName - Schema name for fallback category
 * @returns {Object} Normalized result
 */
const normalizeSchemaItem = (item, schemaName = 'Unknown') => {
  if (!item) return null;

  return {
    name: item.name || item.code || 'Unknown',
    code: item.code || item.name || '',
    description: item.description || '',
    category: item.category || schemaName,
    uri: item.uri || '',
    score: item.score || 1,
    matchType: item.matchType || 'exact'
  };
};

/**
 * Search schema data with exact or semantic matching
 * @param {string} schema - Schema name (e.g., 'IFC 2x3', 'CityGML')
 * @param {string} query - Search query
 * @param {string} matchType - 'exact' or 'semantic'
 * @param {number} limit - Maximum results to return
 * @returns {Array} Search results
 */
export const searchSchema = (schema, query, matchType = 'exact', limit = 20) => {
  try {
    // Defensive check for SCHEMA_INFO
    if (!SCHEMA_INFO || typeof SCHEMA_INFO !== 'object') {
      console.error('SCHEMA_INFO not loaded properly');
      return [];
    }

    const schemaInfo = SCHEMA_INFO[schema];

    if (!schemaInfo) {
      console.warn(`Schema '${schema}' not found in SCHEMA_INFO`);
      return [];
    }

    if (!schemaInfo.searchable) {
      console.warn(`Schema '${schema}' is not searchable`);
      return [];
    }

    const data = schemaInfo.data;
    if (!data || !Array.isArray(data)) {
      console.warn(`Schema '${schema}' has no data array`);
      return [];
    }

    if (data.length === 0) {
      // Schema may use API instead of local data (like bSDD)
      if (schemaInfo.apiEnabled) {
        console.info(`Schema '${schema}' uses API, no local data available`);
      }
      return [];
    }

    const queryLower = (query || '').toLowerCase().trim();
    if (!queryLower) {
      // Return first N items if no query
      return data
        .slice(0, limit)
        .map(item => normalizeSchemaItem(item, schema))
        .filter(item => item !== null);
    }

    let results = [];

    if (matchType === 'exact') {
      // Exact match - name or code starts with or contains query
      results = data.filter(item => {
        if (!item) return false;
        const name = (item.name || '').toLowerCase();
        const code = (item.code || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        return name.includes(queryLower) || code.includes(queryLower) || description.includes(queryLower);
      }).map(item => normalizeSchemaItem({
        ...item,
        score: 1,
        matchType: 'exact'
      }, schema));
    } else {
      // Semantic match - also search in descriptions and calculate relevance
      results = data.filter(item => item).map(item => {
        const name = item.name || '';
        const code = item.code || '';
        const description = item.description || '';
        const category = item.category || '';

        // Calculate scores for different fields
        const nameScore = calculateSimilarity(name, query);
        const codeScore = calculateSimilarity(code, query);
        const descScore = calculateSimilarity(description, query);
        const categoryScore = calculateSimilarity(category, query);

        // Weighted average (code gets extra weight for classification systems)
        const score = Math.max(nameScore, codeScore) * 0.5 + descScore * 0.3 + categoryScore * 0.2;

        return normalizeSchemaItem({
          ...item,
          score,
          matchType: 'semantic'
        }, schema);
      }).filter(item => item && item.score > 0.2)
        .sort((a, b) => b.score - a.score);
    }

    // Filter out any null results and return
    return results.filter(item => item !== null).slice(0, limit);
  } catch (error) {
    console.error('searchSchema error:', error);
    return [];
  }
};

// bSDD API configuration
// Search endpoints are unsecured (no auth required), only need User-Agent header
const BSDD_API_BASE = 'https://api.bsdd.buildingsmart.org';
const BSDD_IFC_DICTIONARY_URI = 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3';
const BSDD_USER_AGENT = 'IDMxPPM-NeoSeoul/1.1';
const BSDD_TIMEOUT = 15000; // 15 seconds (bSDD API can have cold-start latency)

/**
 * Helper: make a bSDD API request with timeout and error handling.
 * Accepts an external AbortSignal so callers can cancel in-flight requests.
 */
const bsddFetch = async (url, externalSignal) => {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => { timedOut = true; controller.abort(); }, BSDD_TIMEOUT);

  // If the caller's signal is already aborted, abort immediately
  if (externalSignal?.aborted) {
    clearTimeout(timeoutId);
    throw new DOMException('Aborted', 'AbortError');
  }

  // Link the external signal to our internal controller
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': BSDD_USER_AGENT
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`bSDD API error: ${response.status} ${response.statusText}`);
    }
    try {
      return await response.json();
    } catch (jsonError) {
      throw new Error('bSDD API returned an invalid response. The server may be experiencing issues.');
    }
  } catch (error) {
    clearTimeout(timeoutId);
    // Distinguish external cancellation from internal timeout
    if (error.name === 'AbortError') {
      if (externalSignal?.aborted) {
        throw error; // Re-throw as AbortError for cancellation
      }
      if (timedOut) {
        throw new Error('bSDD server is not responding. Please try again later.');
      }
    }
    throw error;
  } finally {
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
};

/**
 * Map bSDD class items to our result format
 */
const mapBsddResults = (classes, matchType, defaultCategory = 'bSDD (IFC 4.3)') => {
  if (!Array.isArray(classes)) return [];
  const results = [];
  for (const item of classes) {
    if (!item) continue;
    const name = item.name || item.Name || '';
    if (!name) continue;
    // referenceCode is the IFC entity name (e.g. "IfcDoor", "IfcWall")
    const code = item.referenceCode || item.code || item.Code || name;
    results.push({
      name: code !== name ? `${code} (${name})` : name,
      code,
      description: item.definition || item.Definition || item.description || item.Description || '',
      category: item.dictionaryName || item.DictionaryName || defaultCategory,
      uri: item.uri || item.Uri || '',
      score: matchType === 'exact' ? 1 : 0.8,
      matchType
    });
  }
  return results;
};

/**
 * Search bSDD API for IFC elements
 * Uses SearchInDictionary/v1 (primary) with Class/Search/v1 fallback
 *
 * API docs: https://github.com/buildingSMART/bSDD/blob/master/Documentation/bSDD%20API.md
 *
 * @param {string} query - Search query (min 2 characters)
 * @param {string} matchType - 'exact' or 'semantic'
 * @param {AbortSignal} [signal] - Optional AbortSignal to cancel the request
 * @returns {Promise<Array>} Search results
 */
export const searchBsdd = async (query, matchType = 'exact', signal) => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchText = query.trim();

  // Primary: SearchInDictionary/v1 — searches within IFC 4.3 dictionary
  try {
    const params = new URLSearchParams({
      SearchText: searchText,
      DictionaryUri: BSDD_IFC_DICTIONARY_URI,
      Offset: '0',
      Limit: '25'
    });

    const data = await bsddFetch(`${BSDD_API_BASE}/api/SearchInDictionary/v1?${params}`, signal);
    // SearchInDictionary/v1 nests classes under data.dictionary.classes
    const classes = data?.dictionary?.classes || data?.classes || data?.Classes || [];

    if (classes.length > 0) {
      return mapBsddResults(classes, matchType);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error; // Re-throw so caller knows it was cancelled
    }
    console.warn('bSDD SearchInDictionary failed, trying Class/Search fallback:', error.message);
  }

  // Fallback: Class/Search/v1 — class-specific search filtered to IFC
  try {
    const params = new URLSearchParams({
      SearchText: searchText,
      DictionaryUris: BSDD_IFC_DICTIONARY_URI,
      Offset: '0',
      Limit: '25'
    });

    const data = await bsddFetch(`${BSDD_API_BASE}/api/Class/Search/v1?${params}`, signal);
    const classes = data?.classes || data?.Classes || [];
    return mapBsddResults(classes, matchType);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error; // Re-throw so caller knows it was cancelled
    }
    console.error('bSDD Class/Search also failed:', error.message);
    return [];
  }
};

/**
 * Get all available schemas
 * @returns {Array} List of schema options
 */
export const getAvailableSchemas = () => {
  return Object.keys(SCHEMA_INFO).map(key => ({
    value: key,
    label: SCHEMA_INFO[key].name,
    description: SCHEMA_INFO[key].description,
    searchable: SCHEMA_INFO[key].searchable,
    apiEnabled: SCHEMA_INFO[key].apiEnabled || false
  }));
};

/**
 * Check if schema supports search
 * @param {string} schema - Schema name
 * @returns {boolean}
 */
export const isSchemaSearchable = (schema) => {
  return SCHEMA_INFO[schema]?.searchable || false;
};

export default {
  searchSchema,
  searchBsdd,
  getAvailableSchemas,
  isSchemaSearchable
};
