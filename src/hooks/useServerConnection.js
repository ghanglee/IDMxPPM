import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/apiClient';

const HEALTH_CHECK_INTERVAL = 60000; // 60 seconds

/**
 * React hook for managing server connection state
 *
 * Provides reactive state for:
 * - Server configuration (URL)
 * - Connection status (reachable/unreachable)
 * - Authentication (logged in/out, user info)
 */
export function useServerConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [serverUrl, setServerUrl] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);
  const healthCheckRef = useRef(null);

  // Check server reachability
  const checkConnection = useCallback(async (url) => {
    if (!url) {
      setIsConnected(false);
      return false;
    }
    setIsChecking(true);
    setError(null);
    try {
      const ok = await api.ping();
      setIsConnected(ok);
      if (!ok) {
        setError('Server unreachable');
      }
      return ok;
    } catch {
      setIsConnected(false);
      setError('Server unreachable');
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // On mount, restore saved state
  useEffect(() => {
    const savedUrl = api.getServerUrl();
    const savedUser = api.getUser();
    if (savedUrl) {
      setServerUrl(savedUrl);
      if (savedUser && api.isAuthenticated()) {
        setUser(savedUser);
        setIsAuthenticated(true);
      }
      checkConnection(savedUrl);
    }
  }, [checkConnection]);

  // Periodic health check — only update state when value actually changes
  const isConnectedRef = useRef(isConnected);
  isConnectedRef.current = isConnected;
  const errorRef = useRef(error);
  errorRef.current = error;

  useEffect(() => {
    if (serverUrl && isAuthenticated) {
      healthCheckRef.current = setInterval(() => {
        api.ping().then(ok => {
          if (ok !== isConnectedRef.current) setIsConnected(ok);
          const newError = ok ? null : 'Server connection lost';
          if (newError !== errorRef.current) setError(newError);
        });
      }, HEALTH_CHECK_INTERVAL);
    }
    return () => {
      if (healthCheckRef.current) {
        clearInterval(healthCheckRef.current);
        healthCheckRef.current = null;
      }
    };
  }, [serverUrl, isAuthenticated]);

  // Configure server URL
  const configure = useCallback(async (url) => {
    api.configure(url);
    setServerUrl(url);
    setError(null);
    const ok = await checkConnection(url);
    return ok;
  }, [checkConnection]);

  // Login
  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const result = await api.login(email, password);
      setUser(result.user);
      setIsAuthenticated(true);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Register
  const register = useCallback(async (data) => {
    setError(null);
    try {
      const result = await api.register(data);
      setUser(result.user);
      setIsAuthenticated(true);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    api.logout();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  // Disconnect from server entirely
  const disconnect = useCallback(() => {
    api.disconnect();
    setServerUrl('');
    setUser(null);
    setIsConnected(false);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  return {
    isConnected,
    isAuthenticated,
    user,
    serverUrl,
    isChecking,
    error,
    configure,
    login,
    register,
    logout,
    disconnect,
    checkConnection: () => checkConnection(serverUrl)
  };
}

export default useServerConnection;
