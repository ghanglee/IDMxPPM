import React, { useState, useRef, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import './BusinessRulesPane.css';
import { CloseIcon } from '../icons';
import {
  flattenIUs,
  flattenERs,
  iuNameMap,
  collectConstraints,
  nextConstraintId,
  nextBusinessRuleId,
  tokensToDisplay,
  displayToTokens,
  iuDisplayToken,
  resolveIuTokens,
  pruneBusinessRuleRefs,
  validateConstraintModel,
  checkEmbeddedXml,
  newExpression,
  FORMAL_LANGUAGES,
  EXPRESSION_FORMS
} from '../../utils/constraintUtils';

/**
 * Text field that keeps a local draft and commits on blur, so typing does not
 * re-render the whole application on every keystroke.
 * Exposes insertAtCursor(text) for the "Insert IU reference" helper.
 */
const DraftField = forwardRef(({ value, onCommit, multiline = false, className = '', placeholder, rows = 3, toDisplay, fromDisplay }, ref) => {
  const shown = toDisplay ? toDisplay(value ?? '') : (value ?? '');
  const [draft, setDraftState] = useState(shown);
  const latest = useRef(shown);
  const focused = useRef(false);
  const el = useRef(null);
  const setDraft = (v) => { latest.current = v; setDraftState(v); };

  // Follow external changes (also IU renames, which change the displayed text)
  useEffect(() => {
    if (!focused.current) setDraft(shown);
  }, [shown]);

  useImperativeHandle(ref, () => ({
    insertAtCursor(text) {
      const node = el.current;
      const current = latest.current;
      const start = node?.selectionStart ?? current.length;
      const end = node?.selectionEnd ?? start;
      const next = current.slice(0, start) + text + current.slice(end);
      setDraft(next);
      onCommit(fromDisplay ? fromDisplay(next) : next);
      requestAnimationFrame(() => {
        if (!node) return;
        node.focus();
        const pos = start + text.length;
        node.setSelectionRange(pos, pos);
      });
    }
  }));

  const commit = () => {
    focused.current = false;
    if (latest.current !== shown) onCommit(fromDisplay ? fromDisplay(latest.current) : latest.current);
  };

  const common = {
    ref: el,
    value: draft,
    placeholder,
    className,
    onFocus: () => { focused.current = true; },
    onChange: (e) => setDraft(e.target.value),
    onBlur: commit
  };
  return multiline ? <textarea rows={rows} {...common} /> : <input type="text" {...common} />;
});

const mapEr = (ers, erId, fn) => (ers || []).map(er => {
  if (er.id === erId) return fn(er);
  return er.subERs && er.subERs.length > 0 ? { ...er, subERs: mapEr(er.subERs, erId, fn) } : er;
});

const BusinessRulesPane = ({
  businessRules = [],
  onBusinessRulesChange,
  erHierarchy = [],
  onReplaceErHierarchy,
  selectedErId = null,
  initialIuId = null,
  onClose
}) => {
  const [brFilter, setBrFilter] = useState('all'); // 'all' | 'unlinked' | business rule id
  const [iuFilter, setIuFilter] = useState(initialIuId);
  const [selectedKey, setSelectedKey] = useState(null); // `${erId}::${constraintId}`
  const [showIuPicker, setShowIuPicker] = useState(false);
  const [iuSearch, setIuSearch] = useState('');
  const descRef = useRef(null);
  const exprRefs = useRef({});

  const allIUs = useMemo(() => flattenIUs(erHierarchy), [erHierarchy]);
  const allERs = useMemo(() => flattenERs(erHierarchy), [erHierarchy]);
  const names = useMemo(() => iuNameMap(erHierarchy), [erHierarchy]);
  const allConstraints = useMemo(() => collectConstraints(erHierarchy), [erHierarchy]);
  const issues = useMemo(() => validateConstraintModel(erHierarchy, businessRules), [erHierarchy, businessRules]);
  const iuById = useMemo(() => {
    const map = {};
    allIUs.forEach(iu => { map[iu.id] = iu; });
    return map;
  }, [allIUs]);

  // Editor shows [[IU: name]] for stored {{IU:id}} tokens; linked IUs win when names repeat
  const makeFromDisplay = (constraint) => (text) => {
    const linked = (constraint.informationUnitIds || []).map(id => iuById[id]).filter(Boolean);
    return displayToTokens(text, [...linked, ...allIUs]);
  };
  const toDisplay = (text) => tokensToDisplay(text, names);

  const handleClose = useCallback(() => {
    // Make sure a focused field commits its draft before the pane unmounts
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  const keyOf = (erId, cId) => `${erId}::${cId}`;

  // ── Filtering ────────────────────────────────────────────────────────────
  const visibleConstraints = useMemo(() => allConstraints.filter(({ constraint }) => {
    if (iuFilter && !(constraint.informationUnitIds || []).includes(iuFilter)) return false;
    if (brFilter === 'all') return true;
    if (brFilter === 'unlinked') return !(constraint.businessRuleIds || []).length;
    return (constraint.businessRuleIds || []).includes(brFilter);
  }), [allConstraints, brFilter, iuFilter]);

  const selected = useMemo(
    () => allConstraints.find(({ constraint, erId }) => keyOf(erId, constraint.id) === selectedKey) || null,
    [allConstraints, selectedKey]
  );

  const countFor = (brId) => allConstraints.filter(({ constraint }) => (constraint.businessRuleIds || []).includes(brId)).length;
  const unlinkedCount = allConstraints.filter(({ constraint }) => !(constraint.businessRuleIds || []).length).length;

  // ── Mutations ────────────────────────────────────────────────────────────
  const patchConstraint = (erId, cId, patch) => {
    onReplaceErHierarchy(mapEr(erHierarchy, erId, er => ({
      ...er,
      constraints: (er.constraints || []).map(c => (c.id === cId ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c))
    })));
  };

  const addConstraint = () => {
    if (allERs.length === 0) return;
    let ownerErId = null;
    if (iuFilter && iuById[iuFilter]) ownerErId = iuById[iuFilter].erId;
    if (!ownerErId && selectedErId && allERs.some(e => e.id === selectedErId)) ownerErId = selectedErId;
    if (!ownerErId) ownerErId = allERs[0].id;
    const constraint = {
      id: nextConstraintId(erHierarchy),
      businessRuleIds: brFilter !== 'all' && brFilter !== 'unlinked' ? [brFilter] : [],
      informationUnitIds: iuFilter ? [iuFilter] : [],
      description: '',
      expressions: []
    };
    onReplaceErHierarchy(mapEr(erHierarchy, ownerErId, er => ({ ...er, constraints: [...(er.constraints || []), constraint] })));
    setSelectedKey(keyOf(ownerErId, constraint.id));
  };

  const deleteConstraint = (erId, cId) => {
    if (!window.confirm(`Delete constraint ${cId}?`)) return;
    onReplaceErHierarchy(mapEr(erHierarchy, erId, er => ({ ...er, constraints: (er.constraints || []).filter(c => c.id !== cId) })));
    setSelectedKey(null);
  };

  const moveConstraint = (fromErId, cId, toErId) => {
    if (fromErId === toErId) return;
    const found = allConstraints.find(x => x.erId === fromErId && x.constraint.id === cId);
    if (!found) return;
    // Constraint ids only need to be unique within an ER; keep the id unless it clashes
    const target = allConstraints.filter(x => x.erId === toErId).map(x => x.constraint.id);
    const moved = target.includes(cId) ? { ...found.constraint, id: nextConstraintId(erHierarchy) } : found.constraint;
    let next = mapEr(erHierarchy, fromErId, er => ({ ...er, constraints: (er.constraints || []).filter(c => c.id !== cId) }));
    next = mapEr(next, toErId, er => ({ ...er, constraints: [...(er.constraints || []), moved] }));
    onReplaceErHierarchy(next);
    setSelectedKey(keyOf(toErId, moved.id));
  };

  const addBusinessRule = () => {
    const id = nextBusinessRuleId(businessRules);
    onBusinessRulesChange([...businessRules, { id, name: `Business rule ${id.replace('BR-', '')}`, description: '', reference: '' }]);
    setBrFilter(id);
  };

  const patchBusinessRule = (id, patch) => {
    onBusinessRulesChange(businessRules.map(b => (b.id === id ? { ...b, ...patch } : b)));
  };

  const deleteBusinessRule = (id) => {
    const used = countFor(id);
    const msg = used > 0
      ? `Delete this business rule? ${used} constraint(s) reference it; the link will be removed from them.`
      : 'Delete this business rule?';
    if (!window.confirm(msg)) return;
    if (used > 0) {
      const pruned = pruneBusinessRuleRefs(erHierarchy, new Set([id]));
      if (pruned.changed) onReplaceErHierarchy(pruned.erHierarchy);
    }
    onBusinessRulesChange(businessRules.filter(b => b.id !== id));
    setBrFilter('all');
  };

  const toggleIu = (constraint, erId, iuId) => {
    const ids = constraint.informationUnitIds || [];
    patchConstraint(erId, constraint.id, {
      informationUnitIds: ids.includes(iuId) ? ids.filter(x => x !== iuId) : [...ids, iuId]
    });
  };

  const patchExpression = (constraint, erId, exprId, patch) => {
    patchConstraint(erId, constraint.id, {
      expressions: (constraint.expressions || []).map(x => (x.id === exprId ? { ...x, ...patch } : x))
    });
  };

  const patchExpressionLanguage = (constraint, erId, expr, langPatch) => {
    patchExpression(constraint, erId, expr.id, { language: { ...expr.language, ...langPatch } });
  };

  const chooseLanguagePreset = (constraint, erId, expr, presetName) => {
    const preset = FORMAL_LANGUAGES.find(l => l.name === presetName);
    if (!preset) return;
    patchExpression(constraint, erId, expr.id, {
      language: {
        name: preset.name === 'Other' ? '' : preset.name,
        version: preset.version,
        publicationYear: preset.publicationYear,
        uri: preset.uri
      },
      form: expr.form === 'external' ? 'external' : preset.form
    });
  };

  // ── Render helpers ───────────────────────────────────────────────────────
  const selectedBr = businessRules.find(b => b.id === brFilter) || null;
  const filterIuName = iuFilter ? (names[iuFilter] ?? iuFilter) : '';
  const selectedIssues = selected
    ? issues.filter(i => i.message.startsWith(`Constraint ${selected.constraint.id}`))
    : [];

  const filteredPickerIUs = allIUs.filter(iu => {
    const q = iuSearch.trim().toLowerCase();
    if (!q) return true;
    return (iu.name || '').toLowerCase().includes(q) || (iu.erName || '').toLowerCase().includes(q);
  });

  const renderIuInsert = (getTarget, constraint) => {
    const linked = (constraint.informationUnitIds || []).filter(id => iuById[id]);
    return (
      <select
        className="brp-select brp-insert-select"
        value=""
        disabled={linked.length === 0}
        title={linked.length === 0 ? 'Associate information units first' : 'Insert a reference to an associated information unit'}
        onChange={(e) => {
          if (e.target.value) getTarget()?.insertAtCursor(iuDisplayToken(names[e.target.value], e.target.value));
        }}
      >
        <option value="">Insert IU reference…</option>
        {linked.map(id => <option key={id} value={id}>{names[id] || id}</option>)}
      </select>
    );
  };

  const renderConstraintEditor = () => {
    if (!selected) {
      return <div className="brp-empty">Select a constraint, or add a new one.</div>;
    }
    const { constraint, erId } = selected;
    const linkedBrIds = constraint.businessRuleIds || [];
    const unlinkedBrs = businessRules.filter(b => !linkedBrIds.includes(b.id));

    return (
      <div className="brp-editor" key={keyOf(erId, constraint.id)}>
        <div className="brp-editor-head">
          <h4>Constraint {constraint.id}</h4>
          <button className="brp-btn brp-btn-danger" onClick={() => deleteConstraint(erId, constraint.id)}>Delete</button>
        </div>

        {selectedIssues.length > 0 && (
          <ul className="brp-issues">
            {selectedIssues.map((i, idx) => (
              <li key={idx} className={i.severity === 'error' ? 'brp-issue-error' : 'brp-issue-warning'}>{i.message}</li>
            ))}
          </ul>
        )}

        <div className="brp-field">
          <label>Defined in ER</label>
          <select className="brp-select" value={erId} onChange={(e) => moveConstraint(erId, constraint.id, e.target.value)}>
            {allERs.map(er => <option key={er.id} value={er.id}>{'  '.repeat(er.depth)}{er.name}</option>)}
          </select>
        </div>

        <div className="brp-field">
          <label>Business rule(s)</label>
          <div className="brp-chips">
            {linkedBrIds.map(id => {
              const br = businessRules.find(b => b.id === id);
              return (
                <span key={id} className={`brp-chip ${br ? '' : 'brp-chip-missing'}`}>
                  {br ? br.name : `(missing) ${id}`}
                  <button onClick={() => patchConstraint(erId, constraint.id, { businessRuleIds: linkedBrIds.filter(x => x !== id) })} title="Remove link">×</button>
                </span>
              );
            })}
            {unlinkedBrs.length > 0 && (
              <select
                className="brp-select brp-add-select"
                value=""
                onChange={(e) => {
                  if (e.target.value) patchConstraint(erId, constraint.id, { businessRuleIds: [...linkedBrIds, e.target.value] });
                }}
              >
                <option value="">+ Link business rule…</option>
                {unlinkedBrs.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            {businessRules.length === 0 && <span className="brp-hint">No business rules defined yet — add one in the left column.</span>}
          </div>
        </div>

        <div className="brp-field">
          <label>Associated information units</label>
          <div className="brp-chips">
            {(constraint.informationUnitIds || []).map(id => {
              const iu = iuById[id];
              return (
                <span key={id} className={`brp-chip ${iu ? '' : 'brp-chip-missing'}`} title={iu ? iu.erPath.join(' › ') : 'This information unit no longer exists'}>
                  {iu ? iu.name || '(unnamed)' : `(missing) ${id}`}
                  <button onClick={() => toggleIu(constraint, erId, id)} title="Remove link">×</button>
                </span>
              );
            })}
            <button className="brp-btn" onClick={() => setShowIuPicker(v => !v)}>{showIuPicker ? 'Done' : '+ Select IUs…'}</button>
          </div>
          {showIuPicker && (
            <div className="brp-picker">
              <input
                type="text"
                className="brp-input"
                placeholder="Search information units or ERs…"
                value={iuSearch}
                onChange={(e) => setIuSearch(e.target.value)}
              />
              <div className="brp-picker-list">
                {filteredPickerIUs.length === 0 && <div className="brp-hint">No matching information units.</div>}
                {filteredPickerIUs.map((iu, idx) => {
                  const showEr = idx === 0 || filteredPickerIUs[idx - 1].erId !== iu.erId;
                  return (
                    <React.Fragment key={iu.id}>
                      {showEr && <div className="brp-picker-er">{iu.erPath.join(' › ')}</div>}
                      <label className="brp-picker-item" style={{ paddingLeft: 12 + iu.depth * 16 }}>
                        <input
                          type="checkbox"
                          checked={(constraint.informationUnitIds || []).includes(iu.id)}
                          onChange={() => toggleIu(constraint, erId, iu.id)}
                        />
                        <span>{iu.name || '(unnamed)'}</span>
                        {iu.dataType && <span className="brp-picker-type">{iu.dataType}</span>}
                      </label>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="brp-field">
          <div className="brp-field-head">
            <label>Description (informal statement)</label>
            {renderIuInsert(() => descRef.current, constraint)}
          </div>
          <DraftField
            ref={descRef}
            multiline
            rows={3}
            className="brp-input brp-textarea"
            value={constraint.description || ''}
            toDisplay={toDisplay}
            fromDisplay={makeFromDisplay(constraint)}
            placeholder="e.g. Fire rating ≥ 2 h where the wall is load-bearing and the building has more than 12 storeys"
            onCommit={(v) => patchConstraint(erId, constraint.id, { description: v })}
          />
        </div>

        <div className="brp-field">
          <div className="brp-field-head">
            <label>Formal expressions</label>
            <select
              className="brp-select brp-add-select"
              value=""
              onChange={(e) => {
                const preset = FORMAL_LANGUAGES.find(l => l.name === e.target.value);
                if (preset) patchConstraint(erId, constraint.id, { expressions: [...(constraint.expressions || []), newExpression(preset)] });
              }}
            >
              <option value="">+ Add expression…</option>
              {FORMAL_LANGUAGES.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
            </select>
          </div>
          {(constraint.expressions || []).length === 0 && <div className="brp-hint">No formal expressions. Equivalent formal statements of the same restriction belong in one constraint.</div>}
          {(constraint.expressions || []).map((expr, idx) => {
            const presetName = FORMAL_LANGUAGES.some(l => l.name === expr.language?.name) ? expr.language.name : 'Other';
            const xmlError = expr.form === 'xml' ? checkEmbeddedXml(expr.body) : '';
            return (
              <div className="brp-expr" key={expr.id}>
                <div className="brp-expr-head">
                  <strong>Expression {idx + 1}</strong>
                  <select className="brp-select" value={presetName} onChange={(e) => chooseLanguagePreset(constraint, erId, expr, e.target.value)}>
                    {FORMAL_LANGUAGES.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
                  </select>
                  <select className="brp-select" value={expr.form} onChange={(e) => patchExpression(constraint, erId, expr.id, { form: e.target.value })}>
                    {EXPRESSION_FORMS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <button
                    className="brp-icon-btn"
                    title="Remove expression"
                    onClick={() => patchConstraint(erId, constraint.id, { expressions: constraint.expressions.filter(x => x.id !== expr.id) })}
                  >×</button>
                </div>
                <div className="brp-expr-lang">
                  <DraftField className="brp-input" placeholder="Language name *" value={expr.language?.name || ''}
                    onCommit={(v) => patchExpressionLanguage(constraint, erId, expr, { name: v })} />
                  <DraftField className="brp-input" placeholder="Version" value={expr.language?.version || ''}
                    onCommit={(v) => patchExpressionLanguage(constraint, erId, expr, { version: v })} />
                  <DraftField className="brp-input" placeholder="Year" value={expr.language?.publicationYear || ''}
                    onCommit={(v) => patchExpressionLanguage(constraint, erId, expr, { publicationYear: v })} />
                  <DraftField className="brp-input" placeholder="Language URI" value={expr.language?.uri || ''}
                    onCommit={(v) => patchExpressionLanguage(constraint, erId, expr, { uri: v })} />
                </div>
                {expr.form === 'external' ? (
                  <DraftField className="brp-input" placeholder="Path or URI of the rule file, e.g. rules/BR-07.shacl.ttl"
                    value={expr.uri || ''} onCommit={(v) => patchExpression(constraint, erId, expr.id, { uri: v })} />
                ) : (
                  <>
                    <div className="brp-field-head">
                      <span className="brp-hint">
                        {expr.form === 'xml' ? 'Markup in its own namespace (e.g. RuleML, LegalRuleML)' : 'Rule text (stored as CDATA)'}
                      </span>
                      {renderIuInsert(() => exprRefs.current[expr.id], constraint)}
                    </div>
                    <DraftField
                      ref={(r) => { exprRefs.current[expr.id] = r; }}
                      multiline
                      rows={6}
                      className="brp-input brp-textarea brp-mono"
                      placeholder={expr.form === 'xml' ? '<Implies xmlns="http://ruleml.org/spec">…</Implies>' : 'ASK { … }'}
                      value={expr.body || ''}
                      toDisplay={toDisplay}
                      fromDisplay={makeFromDisplay(constraint)}
                      onCommit={(v) => patchExpression(constraint, erId, expr.id, { body: v })}
                    />
                    {xmlError && <div className="brp-issue-error brp-inline-issue">{xmlError}</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="brp-overlay" onClick={handleClose}>
      <div className="brp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="brp-header">
          <h3>Business Rules &amp; Constraints</h3>
          <button className="er-close-btn" onClick={handleClose} title="Close"><CloseIcon size={16} /></button>
        </div>

        <div className="brp-body">
          {/* Column 1: business rules */}
          <div className="brp-col brp-col-rules">
            <div className="brp-col-head">
              <span>Business rules</span>
              <button className="brp-btn" onClick={addBusinessRule}>+ Add</button>
            </div>
            <div className="brp-list">
              <div className={`brp-list-item ${brFilter === 'all' ? 'active' : ''}`} onClick={() => setBrFilter('all')}>
                <span>All constraints</span><span className="brp-count">{allConstraints.length}</span>
              </div>
              <div className={`brp-list-item ${brFilter === 'unlinked' ? 'active' : ''}`} onClick={() => setBrFilter('unlinked')}>
                <span>Not linked to a rule</span><span className="brp-count">{unlinkedCount}</span>
              </div>
              {businessRules.map(br => (
                <div key={br.id} className={`brp-list-item ${brFilter === br.id ? 'active' : ''}`} onClick={() => setBrFilter(br.id)}>
                  <span className="brp-ellipsis" title={br.name}>{br.name || '(unnamed)'}</span>
                  <span className="brp-count">{countFor(br.id)}</span>
                </div>
              ))}
            </div>
            {selectedBr && (
              <div className="brp-rule-form" key={selectedBr.id}>
                <div className="brp-field">
                  <label>Name *</label>
                  <DraftField className="brp-input" value={selectedBr.name} onCommit={(v) => patchBusinessRule(selectedBr.id, { name: v })} />
                </div>
                <div className="brp-field">
                  <label>Statement</label>
                  <DraftField multiline rows={4} className="brp-input brp-textarea" value={selectedBr.description}
                    placeholder="The business rule as stated in the source, e.g. a legal clause"
                    onCommit={(v) => patchBusinessRule(selectedBr.id, { description: v })} />
                </div>
                <div className="brp-field">
                  <label>Reference (one per line)</label>
                  <DraftField multiline rows={2} className="brp-input brp-textarea" value={selectedBr.reference}
                    placeholder="e.g. Building Act Enforcement Decree, Art. 56(1)"
                    onCommit={(v) => patchBusinessRule(selectedBr.id, { reference: v })} />
                </div>
                <button className="brp-btn brp-btn-danger" onClick={() => deleteBusinessRule(selectedBr.id)}>Delete business rule</button>
              </div>
            )}
          </div>

          {/* Column 2: constraints */}
          <div className="brp-col brp-col-constraints">
            <div className="brp-col-head">
              <span>Constraints</span>
              <button className="brp-btn" onClick={addConstraint} disabled={allERs.length === 0}>+ Add</button>
            </div>
            {iuFilter && (
              <div className="brp-filter-chip">
                Information unit: <strong>{filterIuName}</strong>
                <button onClick={() => setIuFilter(null)} title="Clear filter">×</button>
              </div>
            )}
            <div className="brp-list">
              {visibleConstraints.length === 0 && <div className="brp-hint brp-pad">No constraints here yet.</div>}
              {visibleConstraints.map(({ constraint, erId, erName }) => {
                const key = keyOf(erId, constraint.id);
                const text = resolveIuTokens(constraint.description || '', names);
                const hasError = issues.some(i => i.severity === 'error' && i.message.startsWith(`Constraint ${constraint.id}`));
                return (
                  <div key={key} className={`brp-list-item brp-constraint-item ${selectedKey === key ? 'active' : ''}`} onClick={() => { setSelectedKey(key); setShowIuPicker(false); }}>
                    <div className="brp-constraint-top">
                      <strong>{constraint.id}</strong>
                      <span className="brp-meta">
                        {(constraint.informationUnitIds || []).length} IU · {(constraint.expressions || []).length} expr
                        {hasError && <span className="brp-flag" title="Has errors">⚠</span>}
                      </span>
                    </div>
                    <div className="brp-constraint-text">{text || <em>(no description)</em>}</div>
                    <div className="brp-constraint-er">{erName}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 3: constraint editor */}
          <div className="brp-col brp-col-editor">{renderConstraintEditor()}</div>
        </div>
      </div>
    </div>
  );
};

export default BusinessRulesPane;
