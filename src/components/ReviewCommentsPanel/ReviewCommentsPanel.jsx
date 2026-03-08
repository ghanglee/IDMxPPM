import React, { useMemo } from 'react';
import './ReviewCommentsPanel.css';

const ReviewCommentsPanel = ({ comments = [], onMarkAddressed, onRemove }) => {
  // Group comments by targetName
  const grouped = useMemo(() => {
    const groups = {};
    comments.forEach(c => {
      const key = c.targetName || 'General';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }, [comments]);

  const unresolvedCount = comments.filter(c => !c.resolved).length;

  if (comments.length === 0) {
    return (
      <div className="review-comments-panel">
        <div className="review-comments-empty">
          <p>No review comments.</p>
          <p className="review-comments-hint">
            Export HTML with Review Mode enabled, share with reviewers, then import the reviewed file to see comments here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="review-comments-panel">
      <div className="review-comments-summary">
        <span className="review-comments-count">{unresolvedCount} unresolved</span>
        <span className="review-comments-total"> / {comments.length} total</span>
      </div>

      {Object.entries(grouped).map(([targetName, targetComments]) => (
        <div key={targetName} className="review-comment-group">
          <div className="review-comment-group-header">
            <span className="review-comment-group-name">{targetName}</span>
            <span className="review-comment-group-count">{targetComments.length}</span>
          </div>

          {targetComments.map(comment => (
            <div
              key={comment.id}
              className={`review-comment-item ${comment.resolved ? 'resolved' : ''}`}
            >
              <div className="review-comment-meta">
                <strong>{comment.author || 'Anonymous'}</strong>
                <span className="review-comment-time">
                  {formatTime(comment.timestamp)}
                </span>
                {comment.resolved && (
                  <span className="review-comment-resolved-badge">Resolved</span>
                )}
              </div>
              <div className="review-comment-text">{comment.text}</div>
              <div className="review-comment-actions">
                {!comment.resolved && onMarkAddressed && (
                  <button
                    className="review-action-btn"
                    onClick={() => onMarkAddressed(comment.id)}
                  >
                    Mark Addressed
                  </button>
                )}
                {onRemove && (
                  <button
                    className="review-action-btn review-action-remove"
                    onClick={() => onRemove(comment.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const formatTime = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso || '';
  }
};

export default ReviewCommentsPanel;
