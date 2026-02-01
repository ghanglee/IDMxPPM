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

// bSDD API Client ID for authenticated access
const BSDD_CLIENT_ID = 'b222e220-1f71-4962-9184-05e0481a390d';

/**
 * Search bSDD API for elements
 * Based on buildingSMART API documentation:
 * https://technical.buildingsmart.org/services/bsdd/using-the-bsdd-api/
 *
 * @param {string} query - Search query
 * @param {string} matchType - 'exact' or 'semantic'
 * @returns {Promise<Array>} Search results
 */
export const searchBsdd = async (query, matchType = 'exact') => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    // bSDD API v1 SearchInDictionary endpoint
    // API documentation: https://app.swaggerhub.com/apis/buildingSMART/Dictionaries/v1
    const baseUrl = 'https://api.bsdd.buildingsmart.org/api/SearchInDictionary/v1';

    // Search specifically in IFC dictionary for better results
    const params = new URLSearchParams({
      SearchText: query.trim(),
      DictionaryUri: 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3',
      Offset: '0',
      Limit: '25'
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${baseUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-User-Agent': 'IDMxPPM-NeoSeoul/1.0',
        'X-Client-Id': BSDD_CLIENT_ID
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('bSDD API error:', response.status, response.statusText);
      // Try alternative SearchList endpoint
      return await searchBsddAlternative(query, matchType);
    }

    const data = await response.json();

    // Map bSDD results to our format with defensive null checks
    const classes = data?.classes || data?.Classes || [];
    const results = [];

    for (const item of classes) {
      if (!item) continue;

      const name = item.name || item.Name || item.code || item.Code || '';
      if (!name) continue; // Skip items with no name

      results.push({
        name,
        code: item.code || item.Code || name,
        description: item.definition || item.Definition || item.description || item.Description || '',
        category: item.dictionaryName || item.DictionaryName || 'bSDD (IFC 4.3)',
        uri: item.uri || item.Uri || '',
        score: matchType === 'exact' ? 1 : 0.8,
        matchType
      });
    }

    return results;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('bSDD API request timed out');
      return [];
    }
    console.error('bSDD search error:', error);
    // Try alternative endpoint
    try {
      return await searchBsddAlternative(query, matchType);
    } catch (altError) {
      console.error('bSDD alternative search also failed:', altError);
      return [];
    }
  }
};

/**
 * Alternative bSDD search using general SearchList endpoint
 */
const searchBsddAlternative = async (query, matchType = 'exact') => {
  try {
    const baseUrl = 'https://api.bsdd.buildingsmart.org/api/SearchList/v1';
    const params = new URLSearchParams({
      SearchText: query.trim(),
      Offset: '0',
      Limit: '25'
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${baseUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-User-Agent': 'IDMxPPM-NeoSeoul/1.0',
        'X-Client-Id': BSDD_CLIENT_ID
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('bSDD SearchList API error:', response.status);
      return [];
    }

    const data = await response.json();

    // Handle both camelCase and PascalCase responses with defensive null checks
    const dictionaries = data?.dictionaries || data?.Dictionaries || [];
    const results = [];

    for (const dict of dictionaries) {
      if (!dict) continue;

      const classes = dict.classes || dict.Classes || [];
      const dictName = dict.name || dict.Name || 'bSDD';

      for (const item of classes) {
        if (!item) continue;

        const name = item.name || item.Name || '';
        if (!name) continue; // Skip items with no name

        results.push({
          name,
          code: item.code || item.Code || name,
          description: item.definition || item.Definition || '',
          category: dictName,
          uri: item.uri || item.Uri || '',
          score: matchType === 'exact' ? 1 : 0.8,
          matchType
        });
      }
    }

    return results.slice(0, 25);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('bSDD SearchList API request timed out');
    } else {
      console.error('bSDD alternative search error:', error);
    }
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
