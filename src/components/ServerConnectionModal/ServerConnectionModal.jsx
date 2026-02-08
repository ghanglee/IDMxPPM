import React, { useState } from 'react';
import './ServerConnectionModal.css';

/**
 * Server Connection Modal
 *
 * Three states:
 * 1. Configure - Enter server URL and test connection
 * 2. Login/Register - Authenticate after successful connection
 * 3. Connected - Show user info with disconnect option
 */
const ServerConnectionModal = ({
  isOpen,
  onClose,
  serverConnection // useServerConnection() hook return value
}) => {
  const {
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
    disconnect
  } = serverConnection;

  const [urlInput, setUrlInput] = useState(serverUrl || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [organization, setOrganization] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!urlInput.trim()) return;
    setLocalError(null);
    const ok = await configure(urlInput.trim());
    if (!ok) {
      setLocalError('Could not reach the server. Check the URL and ensure the server is running.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    setLocalError(null);
    try {
      await login(email, password);
      setEmail('');
      setPassword('');
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password || !givenName || !familyName) return;
    setIsSubmitting(true);
    setLocalError(null);
    try {
      await register({
        email,
        password,
        name: { givenName, familyName },
        organization
      });
      setEmail('');
      setPassword('');
      setGivenName('');
      setFamilyName('');
      setOrganization('');
      setIsRegistering(false);
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setUrlInput('');
    setLocalError(null);
  };

  const handleLogout = () => {
    logout();
    setLocalError(null);
  };

  const displayError = localError || error;

  return (
    <div className="server-modal-overlay" onClick={onClose}>
      <div className="server-modal" onClick={e => e.stopPropagation()}>
        <div className="server-modal-header">
          <h2>Server Connection</h2>
          <button className="server-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="server-modal-content">
          {/* Connected & Authenticated */}
          {isConnected && isAuthenticated && user ? (
            <div className="server-connected">
              <div className="server-status-badge server-status-connected">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Connected
              </div>

              <div className="server-user-info">
                <div className="server-user-avatar">
                  {user.name?.givenName?.[0] || '?'}{user.name?.familyName?.[0] || ''}
                </div>
                <div className="server-user-details">
                  <span className="server-user-name">{user.name?.givenName} {user.name?.familyName}</span>
                  <span className="server-user-email">{user.email}</span>
                  {user.organization && <span className="server-user-org">{user.organization}</span>}
                  <span className="server-user-role">{user.role}</span>
                </div>
              </div>

              <div className="server-url-display">
                <span className="server-url-label">Server</span>
                <span className="server-url-value">{serverUrl}</span>
              </div>

              <div className="server-actions">
                <button className="server-btn server-btn-secondary" onClick={handleLogout}>
                  Log Out
                </button>
                <button className="server-btn server-btn-danger" onClick={handleDisconnect}>
                  Disconnect
                </button>
              </div>
            </div>
          ) : isConnected && !isAuthenticated ? (
            /* Connected but not logged in */
            <div className="server-auth">
              <div className="server-status-badge server-status-connected">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Connected to {serverUrl}
              </div>

              {!isRegistering ? (
                <form onSubmit={handleLogin} className="server-form">
                  <h3>Log In</h3>
                  <div className="server-field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@organization.com"
                      autoFocus
                    />
                  </div>
                  <div className="server-field">
                    <label>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                  </div>
                  {displayError && <div className="server-error">{displayError}</div>}
                  <button type="submit" className="server-btn server-btn-primary" disabled={isSubmitting || !email || !password}>
                    {isSubmitting ? 'Logging in...' : 'Log In'}
                  </button>
                  <p className="server-switch-auth">
                    Don't have an account?{' '}
                    <button type="button" className="server-link" onClick={() => { setIsRegistering(true); setLocalError(null); }}>
                      Register
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="server-form">
                  <h3>Create Account</h3>
                  <div className="server-field-row">
                    <div className="server-field">
                      <label>Given Name</label>
                      <input
                        type="text"
                        value={givenName}
                        onChange={e => setGivenName(e.target.value)}
                        placeholder="Given name"
                        autoFocus
                      />
                    </div>
                    <div className="server-field">
                      <label>Family Name</label>
                      <input
                        type="text"
                        value={familyName}
                        onChange={e => setFamilyName(e.target.value)}
                        placeholder="Family name"
                      />
                    </div>
                  </div>
                  <div className="server-field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@organization.com"
                    />
                  </div>
                  <div className="server-field">
                    <label>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                    />
                  </div>
                  <div className="server-field">
                    <label>Organization (optional)</label>
                    <input
                      type="text"
                      value={organization}
                      onChange={e => setOrganization(e.target.value)}
                      placeholder="Your organization"
                    />
                  </div>
                  {displayError && <div className="server-error">{displayError}</div>}
                  <button type="submit" className="server-btn server-btn-primary" disabled={isSubmitting || !email || !password || !givenName || !familyName}>
                    {isSubmitting ? 'Creating account...' : 'Create Account'}
                  </button>
                  <p className="server-switch-auth">
                    Already have an account?{' '}
                    <button type="button" className="server-link" onClick={() => { setIsRegistering(false); setLocalError(null); }}>
                      Log in
                    </button>
                  </p>
                </form>
              )}

              <button className="server-btn server-btn-secondary server-btn-disconnect" onClick={handleDisconnect}>
                Disconnect
              </button>
            </div>
          ) : (
            /* Not connected - configure server URL */
            <div className="server-configure">
              <div className="server-status-badge server-status-disconnected">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                Not connected
              </div>

              <p className="server-description">
                Connect to an IDMxPPM server to browse and manage IDM specifications from a central database.
              </p>

              <div className="server-field">
                <label>Server URL</label>
                <div className="server-url-input-group">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="http://192.168.1.100:3001"
                    onKeyDown={e => e.key === 'Enter' && handleTestConnection()}
                    autoFocus
                  />
                  <button
                    className="server-btn server-btn-primary"
                    onClick={handleTestConnection}
                    disabled={isChecking || !urlInput.trim()}
                  >
                    {isChecking ? 'Testing...' : 'Connect'}
                  </button>
                </div>
              </div>

              {displayError && <div className="server-error">{displayError}</div>}

              <div className="server-help">
                <p>The server should be running at the specified URL. Default port is <code>3001</code>.</p>
                <p>Ask your system administrator for the server address.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServerConnectionModal;
