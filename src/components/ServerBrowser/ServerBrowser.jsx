import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/apiClient';
import './ServerBrowser.css';

const STATUS_LABELS = {
  'NP': 'New Proposal',
  'WD': 'Working Draft',
  'CD': 'Committee Draft',
  'DIS': 'Draft Intl Std',
  'IS': 'Intl Standard'
};

const ServerBrowser = ({ isOpen, onClose, onOpenSpec }) => {
  const [specs, setSpecs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const LIMIT = 15;

  const loadSpecs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.listSpecs({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        limit: LIMIT,
        sort: sortField,
        order: sortOrder
      });
      setSpecs(result.specs || []);
      setTotal(result.total || 0);
      setPages(result.pages || 1);
    } catch (err) {
      setError(err.message);
      setSpecs([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, page, sortField, sortOrder]);

  useEffect(() => {
    if (isOpen) {
      loadSpecs();
    }
  }, [isOpen, loadSpecs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handleOpen = async (specId) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.getSpec(specId);
      if (result.spec?.projectData) {
        onOpenSpec(result.spec._id, result.spec.projectData);
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (specId) => {
    if (deletingId) return;
    setDeletingId(specId);
    setError(null);
    try {
      await api.deleteSpec(specId);
      loadSpecs();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortIndicator = (field) => {
    if (sortField !== field) return '';
    return sortOrder === 'asc' ? ' \u25B2' : ' \u25BC';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="browser-overlay" onClick={onClose}>
      <div className="browser-modal" onClick={e => e.stopPropagation()}>
        <div className="browser-header">
          <h2>Server Specifications</h2>
          <button className="browser-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="browser-filters">
          <div className="browser-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search specifications..."
              autoFocus
            />
          </div>
          <select
            className="browser-status-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="NP">New Proposal</option>
            <option value="WD">Working Draft</option>
            <option value="CD">Committee Draft</option>
            <option value="DIS">Draft Intl Std</option>
            <option value="IS">Intl Standard</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="browser-error">
            {error}
            <button onClick={() => setError(null)}>&times;</button>
          </div>
        )}

        {/* Table */}
        <div className="browser-table-container">
          {isLoading && specs.length === 0 ? (
            <div className="browser-loading">Loading specifications...</div>
          ) : specs.length === 0 ? (
            <div className="browser-empty">
              {search || statusFilter
                ? 'No specifications match your search'
                : 'No specifications on the server yet'}
            </div>
          ) : (
            <table className="browser-table">
              <thead>
                <tr>
                  <th className="browser-th-title" onClick={() => handleSort('title')}>
                    Title{sortIndicator('title')}
                  </th>
                  <th onClick={() => handleSort('status')}>Status{sortIndicator('status')}</th>
                  <th>Version</th>
                  <th>ERs</th>
                  <th>Author</th>
                  <th onClick={() => handleSort('updatedAt')}>Modified{sortIndicator('updatedAt')}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {specs.map(spec => (
                  <tr key={spec._id}>
                    <td className="browser-td-title">
                      <span className="browser-spec-title">{spec.title || spec.shortTitle || 'Untitled'}</span>
                      {spec.shortTitle && spec.title && (
                        <span className="browser-spec-short">{spec.shortTitle}</span>
                      )}
                    </td>
                    <td>
                      <span className={`browser-status browser-status-${(spec.status || 'np').toLowerCase()}`}>
                        {STATUS_LABELS[spec.status] || spec.status || 'NP'}
                      </span>
                    </td>
                    <td>{spec.version || '-'}</td>
                    <td>{spec.erCount || 0}</td>
                    <td className="browser-td-author">
                      {spec.owner?.name
                        ? `${spec.owner.name.givenName} ${spec.owner.name.familyName}`
                        : '-'}
                    </td>
                    <td>{formatDate(spec.updatedAt)}</td>
                    <td className="browser-td-actions">
                      <button
                        className="browser-btn-open"
                        onClick={() => handleOpen(spec._id)}
                        disabled={isLoading}
                      >
                        Open
                      </button>
                      <button
                        className="browser-btn-delete"
                        onClick={() => handleDelete(spec._id)}
                        disabled={deletingId === spec._id}
                      >
                        {deletingId === spec._id ? '...' : '\u00D7'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="browser-pagination">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </button>
            <span>Page {page} of {pages} ({total} total)</span>
            <button
              disabled={page >= pages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerBrowser;
