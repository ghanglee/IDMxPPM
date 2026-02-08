/**
 * API Client for IDMxPPM Server
 * Handles all communication with the central database server
 */

const STORAGE_KEYS = {
  SERVER_URL: 'idmxppm-server-url',
  AUTH_TOKEN: 'idmxppm-auth-token',
  USER_DATA: 'idmxppm-user-data'
};

const API_TIMEOUT = 30000; // 30 seconds (large payloads)

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Core fetch wrapper with JWT auth headers and timeout
 */
async function apiFetch(path, options = {}) {
  const serverUrl = localStorage.getItem(STORAGE_KEYS.SERVER_URL);
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

  if (!serverUrl) {
    throw new ApiError('No server configured', 0);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || API_TIMEOUT);

  try {
    const response = await fetch(`${serverUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      clearAuthState();
      throw new AuthError('Session expired. Please log in again.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(error.message || `Server error: ${response.status}`, response.status);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out', 0);
    }
    if (error instanceof AuthError || error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Connection failed: ${error.message}`, 0);
  }
}

function clearAuthState() {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER_DATA);
}

// --- Public API ---

export const api = {
  // Auth
  login: async (email, password) => {
    const result = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.token);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
    return result;
  },

  register: async (data) => {
    const result = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.token);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
    return result;
  },

  getMe: () => apiFetch('/api/auth/me'),

  // Specs
  listSpecs: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, value);
      }
    }
    const qs = query.toString();
    return apiFetch(`/api/specs${qs ? `?${qs}` : ''}`);
  },

  getSpec: (id) => apiFetch(`/api/specs/${id}`),

  createSpec: (projectData) => apiFetch('/api/specs', {
    method: 'POST',
    body: JSON.stringify({ projectData }),
    timeout: 60000 // 60s for large payloads
  }),

  updateSpec: (id, projectData) => apiFetch(`/api/specs/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ projectData }),
    timeout: 60000
  }),

  deleteSpec: (id) => apiFetch(`/api/specs/${id}`, { method: 'DELETE' }),

  // Connection
  ping: async () => {
    const serverUrl = localStorage.getItem(STORAGE_KEYS.SERVER_URL);
    if (!serverUrl) return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${serverUrl}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) return false;
      const data = await response.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  },

  // Helpers
  isConfigured: () => !!localStorage.getItem(STORAGE_KEYS.SERVER_URL),
  isAuthenticated: () => !!localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
  getServerUrl: () => localStorage.getItem(STORAGE_KEYS.SERVER_URL) || '',
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_DATA) || 'null');
    } catch {
      return null;
    }
  },

  configure: (url) => {
    // Normalize: strip trailing slash
    const normalized = url.replace(/\/+$/, '');
    localStorage.setItem(STORAGE_KEYS.SERVER_URL, normalized);
  },

  disconnect: () => {
    localStorage.removeItem(STORAGE_KEYS.SERVER_URL);
    clearAuthState();
  },

  logout: () => {
    clearAuthState();
  }
};

export { AuthError, ApiError, STORAGE_KEYS };
export default api;
