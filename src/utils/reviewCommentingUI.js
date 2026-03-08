/**
 * Self-contained Review Commenting UI for IDMxPPM HTML exports.
 * Returns JavaScript and CSS as strings to be embedded in exported HTML.
 * Reviewers can add/resolve/delete comments and download the annotated file.
 */

/**
 * Returns the CSS styles for the review UI as a string to embed in <style>.
 */
export const getReviewUIStyles = () => `
/* ===== IDMxPPM Review Mode Styles ===== */
#review-toolbar {
  position: sticky; top: 0; z-index: 1000;
  background: #1a1a2e; color: #eee;
  padding: 10px 20px; font-size: 13px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.review-toolbar-inner {
  display: flex; justify-content: space-between;
  align-items: center; max-width: 210mm; margin: 0 auto;
  flex-wrap: wrap; gap: 8px;
}
.review-toolbar-left, .review-toolbar-right {
  display: flex; align-items: center; gap: 12px;
}
.review-toolbar-badge {
  background: #0066cc; color: white; padding: 4px 12px;
  border-radius: 4px; font-weight: 600; font-size: 11px; text-transform: uppercase;
  letter-spacing: 0.5px;
}
#reviewer-name-input {
  padding: 5px 10px; border: 1px solid #555; border-radius: 4px;
  background: #2a2a3e; color: #eee; font-size: 12px; width: 150px;
}
#reviewer-name-input:focus { border-color: #0066cc; outline: none; }
.review-comment-count { font-size: 12px; color: #aaa; }
.review-download-btn {
  background: #0066cc; color: white; border: none;
  padding: 7px 18px; border-radius: 4px; cursor: pointer;
  font-size: 12px; font-weight: 600;
}
.review-download-btn:hover { background: #0052a3; }
.review-toggle-label { font-size: 12px; color: #ccc; cursor: pointer; display: flex; align-items: center; gap: 4px; }

.add-comment-btn {
  position: absolute; top: 6px; right: 6px;
  background: #f0f4ff; border: 1px solid #bcd;
  color: #0066cc; padding: 3px 10px; border-radius: 4px;
  font-size: 11px; font-weight: 500; cursor: pointer;
}
.add-comment-btn:hover { background: #dde4ff; }

.comment-form {
  background: #f5f7fa; border: 1px solid #ccd;
  border-radius: 6px; padding: 14px; margin-top: 10px;
  position: relative; z-index: 10;
}
.comment-form-header { font-size: 12px; margin-bottom: 8px; color: #555; }
.comment-form textarea {
  width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #ccc;
  border-radius: 4px; font-size: 13px; font-family: inherit; resize: vertical;
  min-height: 60px;
}
.comment-form textarea:focus { border-color: #0066cc; outline: none; }
.comment-form-actions { display: flex; gap: 8px; margin-top: 10px; }
.comment-submit-btn {
  background: #0066cc; color: white; border: none;
  padding: 6px 16px; border-radius: 4px; cursor: pointer;
  font-size: 12px; font-weight: 500;
}
.comment-submit-btn:hover { background: #0052a3; }
.comment-cancel-btn {
  background: #eee; color: #333; border: 1px solid #ccc;
  padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 12px;
}
.comment-cancel-btn:hover { background: #ddd; }

.comment-thread {
  margin-top: 14px; border-left: 3px solid #0066cc;
  padding-left: 14px;
}
.comment-item {
  background: #fafbfd; border: 1px solid #e0e0e0;
  border-radius: 6px; padding: 12px; margin: 8px 0; font-size: 13px;
}
.comment-item.resolved { opacity: 0.55; border-color: #ccc; }
.comment-meta {
  display: flex; gap: 10px; align-items: center;
  margin-bottom: 6px; font-size: 12px;
}
.comment-meta strong { color: #333; }
.comment-time { color: #888; font-size: 11px; }
.comment-resolved-badge {
  background: #d4edda; color: #155724; padding: 2px 8px;
  border-radius: 3px; font-size: 10px; font-weight: 500;
}
.comment-text { color: #333; line-height: 1.6; white-space: pre-wrap; }
.comment-actions { margin-top: 8px; display: flex; gap: 12px; }
.comment-actions button {
  background: none; border: none; color: #0066cc;
  cursor: pointer; font-size: 11px; padding: 0;
}
.comment-actions button:hover { text-decoration: underline; }
.delete-comment-btn { color: #cc0000 !important; }

@media print {
  #review-toolbar { display: none !important; }
  .add-comment-btn { display: none !important; }
  .comment-form { display: none !important; }
  .comment-thread { border-left-color: #999; }
  .comment-item { break-inside: avoid; }
}
`;

/**
 * Returns the self-contained JavaScript for the review UI as a <script> block.
 */
export const getReviewUIScript = () => `
<script>
(function() {
  'use strict';

  var comments = [];
  var reviewerName = localStorage.getItem('idmxppm-reviewer') || '';
  var showResolved = false;

  function init() {
    loadComments();
    createReviewToolbar();
    attachCommentButtons();
    renderAllComments();
  }

  function loadComments() {
    try {
      var el = document.getElementById('idmxppm-comments');
      if (el) {
        var data = JSON.parse(el.textContent);
        comments = data.comments || [];
      }
    } catch (e) { comments = []; }
  }

  function saveComments() {
    var el = document.getElementById('idmxppm-comments');
    if (el) {
      el.textContent = JSON.stringify({
        comments: comments,
        metadata: {
          exportedAt: new Date().toISOString(),
          lastReviewer: reviewerName,
          commentCount: comments.length
        }
      });
    }
  }

  function createReviewToolbar() {
    var toolbar = document.createElement('div');
    toolbar.id = 'review-toolbar';
    toolbar.innerHTML =
      '<div class="review-toolbar-inner">' +
        '<div class="review-toolbar-left">' +
          '<span class="review-toolbar-badge">Review Mode</span>' +
          '<label style="display:flex;align-items:center;gap:6px;color:#ccc;font-size:12px;">' +
            'Reviewer: ' +
            '<input type="text" id="reviewer-name-input" value="' + escapeAttr(reviewerName) + '" placeholder="Your name" />' +
          '</label>' +
          '<span id="comment-count" class="review-comment-count"></span>' +
        '</div>' +
        '<div class="review-toolbar-right">' +
          '<label class="review-toggle-label">' +
            '<input type="checkbox" id="show-resolved-toggle" /> Show resolved' +
          '</label>' +
          '<button id="download-with-comments-btn" class="review-download-btn">' +
            'Download with Comments' +
          '</button>' +
        '</div>' +
      '</div>';
    document.body.insertBefore(toolbar, document.body.firstChild);

    document.getElementById('reviewer-name-input').addEventListener('input', function(e) {
      reviewerName = e.target.value;
      localStorage.setItem('idmxppm-reviewer', reviewerName);
    });
    document.getElementById('show-resolved-toggle').addEventListener('change', function(e) {
      showResolved = e.target.checked;
      renderAllComments();
    });
    document.getElementById('download-with-comments-btn').addEventListener('click', downloadWithComments);
    updateCommentCount();
  }

  function attachCommentButtons() {
    var erSections = document.querySelectorAll('.er-section[id]');
    for (var i = 0; i < erSections.length; i++) {
      var section = erSections[i];
      var title = section.querySelector('.er-title');
      addCommentButton(section, section.id, 'er', title ? title.textContent : 'ER');
    }

    var sections = document.querySelectorAll('.section');
    for (var j = 0; j < sections.length; j++) {
      var sec = sections[j];
      var heading = sec.querySelector('h3');
      if (heading) {
        var sectionId = sec.id || ('section-' + heading.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
        sec.id = sectionId;
        addCommentButton(sec, sectionId, 'section', heading.textContent);
      }
    }

    var bpmnSection = document.querySelector('.bpmn-section');
    if (bpmnSection) {
      bpmnSection.id = bpmnSection.id || 'bpmn-process-map';
      addCommentButton(bpmnSection, bpmnSection.id, 'section', 'Process Map (BPMN)');
    }
  }

  function addCommentButton(element, targetId, targetType, targetName) {
    var btn = document.createElement('button');
    btn.className = 'add-comment-btn';
    btn.textContent = '+ Comment';
    btn.title = 'Add a review comment';
    btn.onclick = function(e) {
      e.stopPropagation();
      showCommentForm(targetId, targetType, targetName);
    };
    if (!element.style.position || element.style.position === 'static') {
      element.style.position = 'relative';
    }
    element.appendChild(btn);
  }

  function showCommentForm(targetId, targetType, targetName) {
    var existing = document.getElementById('comment-form-active');
    if (existing) existing.remove();

    var target = document.getElementById(targetId);
    if (!target) return;

    var form = document.createElement('div');
    form.id = 'comment-form-active';
    form.className = 'comment-form';
    form.innerHTML =
      '<div class="comment-form-header"><strong>Comment on:</strong> ' + escapeHtml(targetName) + '</div>' +
      '<textarea id="comment-text-input" rows="3" placeholder="Type your comment..."></textarea>' +
      '<div class="comment-form-actions">' +
        '<button class="comment-submit-btn" id="comment-submit">Submit</button>' +
        '<button class="comment-cancel-btn" id="comment-cancel">Cancel</button>' +
      '</div>';
    target.appendChild(form);

    document.getElementById('comment-submit').onclick = function() {
      var text = document.getElementById('comment-text-input').value.trim();
      if (!text) return;
      if (!reviewerName.trim()) {
        alert('Please enter your name in the Review toolbar.');
        document.getElementById('reviewer-name-input').focus();
        return;
      }
      addComment(targetId, targetType, targetName, text);
      form.remove();
    };
    document.getElementById('comment-cancel').onclick = function() { form.remove(); };
    document.getElementById('comment-text-input').focus();
  }

  function addComment(targetId, targetType, targetName, text) {
    comments.push({
      id: generateUUID(),
      targetId: targetId,
      targetType: targetType,
      targetName: targetName,
      author: reviewerName,
      timestamp: new Date().toISOString(),
      text: text,
      resolved: false
    });
    saveComments();
    renderCommentsForTarget(targetId);
    updateCommentCount();
  }

  function renderAllComments() {
    var threads = document.querySelectorAll('.comment-thread');
    for (var i = 0; i < threads.length; i++) threads[i].remove();

    var byTarget = {};
    for (var j = 0; j < comments.length; j++) {
      var c = comments[j];
      if (!byTarget[c.targetId]) byTarget[c.targetId] = [];
      byTarget[c.targetId].push(c);
    }

    var keys = Object.keys(byTarget);
    for (var k = 0; k < keys.length; k++) {
      renderCommentsForTarget(keys[k], byTarget[keys[k]]);
    }
    updateCommentCount();
  }

  function renderCommentsForTarget(targetId, targetComments) {
    var target = document.getElementById(targetId);
    if (!target) return;

    var existing = target.querySelector('.comment-thread');
    if (existing) existing.remove();

    if (!targetComments) {
      targetComments = comments.filter(function(c) { return c.targetId === targetId; });
    }

    var visible = showResolved
      ? targetComments
      : targetComments.filter(function(c) { return !c.resolved; });

    if (visible.length === 0) return;

    var thread = document.createElement('div');
    thread.className = 'comment-thread';

    for (var i = 0; i < visible.length; i++) {
      var comment = visible[i];
      var div = document.createElement('div');
      div.className = 'comment-item' + (comment.resolved ? ' resolved' : '');
      div.innerHTML =
        '<div class="comment-meta">' +
          '<strong>' + escapeHtml(comment.author) + '</strong>' +
          '<span class="comment-time">' + formatTime(comment.timestamp) + '</span>' +
          (comment.resolved ? '<span class="comment-resolved-badge">Resolved</span>' : '') +
        '</div>' +
        '<div class="comment-text">' + escapeHtml(comment.text) + '</div>' +
        '<div class="comment-actions">' +
          (!comment.resolved ? '<button class="resolve-btn" data-id="' + comment.id + '">Resolve</button>' : '') +
          '<button class="delete-comment-btn" data-id="' + comment.id + '">Delete</button>' +
        '</div>';
      thread.appendChild(div);
    }

    target.appendChild(thread);

    var resolveBtns = thread.querySelectorAll('.resolve-btn');
    for (var r = 0; r < resolveBtns.length; r++) {
      resolveBtns[r].onclick = function() { resolveComment(this.getAttribute('data-id')); };
    }
    var deleteBtns = thread.querySelectorAll('.delete-comment-btn');
    for (var d = 0; d < deleteBtns.length; d++) {
      deleteBtns[d].onclick = function() { deleteComment(this.getAttribute('data-id')); };
    }
  }

  function resolveComment(commentId) {
    for (var i = 0; i < comments.length; i++) {
      if (comments[i].id === commentId) {
        comments[i].resolved = true;
        comments[i].resolvedBy = reviewerName;
        comments[i].resolvedAt = new Date().toISOString();
        break;
      }
    }
    saveComments();
    renderAllComments();
  }

  function deleteComment(commentId) {
    if (!confirm('Delete this comment?')) return;
    comments = comments.filter(function(c) { return c.id !== commentId; });
    saveComments();
    renderAllComments();
  }

  function updateCommentCount() {
    var el = document.getElementById('comment-count');
    if (el) {
      var unresolved = comments.filter(function(c) { return !c.resolved; }).length;
      el.textContent = unresolved + ' unresolved / ' + comments.length + ' total';
    }
  }

  function downloadWithComments() {
    saveComments();
    var html = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    var titleEl = document.querySelector('title');
    var title = titleEl ? titleEl.textContent : 'idm-review';
    a.download = title.replace(/[^a-zA-Z0-9_\\-]/g, '_') + '-reviewed.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escapeAttr(str) { return escapeHtml(str); }
  function formatTime(iso) {
    try { return new Date(iso).toLocaleString(); } catch(e) { return iso; }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
<\/script>
`;
