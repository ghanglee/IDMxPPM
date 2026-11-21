import React, { useMemo, useRef, useState } from 'react';
import {
  SCHEMA_PRESETS, makeCustomSchema, parseElementList, formatElementList, validateSchemaName,
  elementsFromXsd, schemaKey
} from '../../utils/mappingSchemas';
import './MappingSchemaModal.css';

/**
 * Dialog to add a custom mapping schema (e.g. BCF 3.0) to the list of external element schemas,
 * and to manage the custom schemas of the project and of the user's library.
 *
 * Props:
 *  - options: current schema options (from mergeSchemaOptions)
 *  - usageCount(name): number of mappings that use a schema
 *  - onAdd(schema, { saveToLibrary }): add a schema; returns nothing
 *  - onRemove(name, scope): scope 'project' | 'library'
 *  - onClose()
 */
const MappingSchemaModal = ({ options = [], usageCount = () => 0, onAdd, onRemove, onClose }) => {
  const [form, setForm] = useState({ value: '', version: '', uri: '', description: '', placeholder: '', elementsText: '' });
  const [preset, setPreset] = useState('');
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [touched, setTouched] = useState(false);
  const [xsdNote, setXsdNote] = useState(null);
  const fileRef = useRef(null);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const custom = options.filter(o => o.custom);
  const error = validateSchemaName(form.value, options);
  const elements = useMemo(() => parseElementList(form.elementsText), [form.elementsText]);

  const applyPreset = (name) => {
    setPreset(name);
    const p = SCHEMA_PRESETS.find(s => s.value === name);
    if (!p) return;
    setForm({
      value: p.value, version: p.version || '', uri: p.uri || '', description: p.description || '',
      placeholder: p.placeholder || '', elementsText: formatElementList(p.elements)
    });
  };

  const importXsd = async (files) => {
    if (!files || !files.length) return;
    try {
      const texts = await Promise.all(Array.from(files).map(f => f.text()));
      const found = elementsFromXsd(texts);
      const merged = parseElementList(form.elementsText);
      const have = new Set(merged.map(e => e.name));
      found.forEach(e => { if (!have.has(e.name)) merged.push(e); });
      set('elementsText', formatElementList(merged));
      setXsdNote(`${found.length} element and attribute paths read from ${files.length} file(s).`);
    } catch (err) {
      setXsdNote(`Could not read the XSD: ${err.message}`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = () => {
    setTouched(true);
    if (error) return;
    onAdd?.(makeCustomSchema({ ...form, elements }), { saveToLibrary });
  };

  const sourceLabel = { project: 'Project', library: 'My library', detected: 'Used in mappings' };

  return (
    <div className="er-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="er-modal msm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Add mapping schema">
        <div className="er-modal-header">
          <h3>Add mapping schema</h3>
          <button className="er-close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="er-modal-body msm-body">
          <p className="msm-hint">
            Add a schema that is not built in, such as BCF 3.0 or COBie, so that information units can be mapped to
            its elements. The schema name is written as the mapping basis in idmXML.
          </p>

          <div className="msm-row">
            <label className="msm-label" htmlFor="msm-preset">Start from</label>
            <select id="msm-preset" className="er-select" value={preset} onChange={(e) => applyPreset(e.target.value)}>
              <option value="">Empty schema</option>
              {SCHEMA_PRESETS.map(p => (
                <option key={p.value} value={p.value} disabled={options.some(o => o.custom && o.source !== 'detected' && schemaKey(o.value) === schemaKey(p.value))}>
                  {p.value} (preset, {p.elements.length} elements)
                </option>
              ))}
            </select>
          </div>

          <div className="msm-grid">
            <div className="msm-field msm-span2">
              <label className="msm-label" htmlFor="msm-name">Name *</label>
              <input id="msm-name" className="er-input" value={form.value} placeholder="e.g. BCF 3.0" autoFocus
                onChange={(e) => set('value', e.target.value)} onBlur={() => setTouched(true)} />
              {touched && error && <div className="msm-error">{error}</div>}
            </div>
            <div className="msm-field">
              <label className="msm-label" htmlFor="msm-version">Version</label>
              <input id="msm-version" className="er-input" value={form.version} placeholder="e.g. 3.0" onChange={(e) => set('version', e.target.value)} />
            </div>
            <div className="msm-field msm-span3">
              <label className="msm-label" htmlFor="msm-uri">URI</label>
              <input id="msm-uri" className="er-input" value={form.uri} placeholder="Specification or namespace URI" onChange={(e) => set('uri', e.target.value)} />
            </div>
            <div className="msm-field msm-span3">
              <label className="msm-label" htmlFor="msm-desc">Description</label>
              <input id="msm-desc" className="er-input" value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div className="msm-field msm-span3">
              <label className="msm-label" htmlFor="msm-ph">Element name hint</label>
              <input id="msm-ph" className="er-input" value={form.placeholder} placeholder="Shown in empty mapping fields, e.g. Markup/Topic/Title"
                onChange={(e) => set('placeholder', e.target.value)} />
            </div>
          </div>

          <div className="msm-field">
            <div className="msm-label-row">
              <label className="msm-label" htmlFor="msm-elements">Elements (optional) · {elements.length}</label>
              <button type="button" className="er-link-btn" onClick={() => fileRef.current?.click()}>Import from XSD…</button>
              <input ref={fileRef} type="file" accept=".xsd,.xml" multiple style={{ display: 'none' }} onChange={(e) => importXsd(e.target.files)} />
            </div>
            <textarea id="msm-elements" className="er-input msm-elements" value={form.elementsText} spellCheck={false}
              placeholder={'One element per line, optionally with a description:\nMarkup/Topic/Title | Title of the topic\nMarkup/Topic/@TopicStatus'}
              onChange={(e) => set('elementsText', e.target.value)} />
            <div className="msm-hint">With elements, the schema can be searched and mapping fields suggest element names.{xsdNote ? ` ${xsdNote}` : ''}</div>
          </div>

          <label className="msm-check">
            <input type="checkbox" checked={saveToLibrary} onChange={(e) => setSaveToLibrary(e.target.checked)} />
            Also save in my schema library (offered in all projects on this computer)
          </label>

          {custom.length > 0 && (
            <div className="msm-existing">
              <div className="msm-label">Custom schemas</div>
              <table>
                <tbody>
                  {custom.map(o => {
                    const used = usageCount(o.value);
                    return (
                      <tr key={o.source + o.value}>
                        <td className="msm-name">{o.value}{o.version && o.version !== o.value.split(' ').pop() ? ` (${o.version})` : ''}</td>
                        <td>{sourceLabel[o.source] || o.source}</td>
                        <td>{(o.elements || []).length ? `${o.elements.length} elements` : 'no element list'}</td>
                        <td>{used} mapping{used === 1 ? '' : 's'}</td>
                        <td className="msm-actions">
                          {o.source === 'project' && (
                            <button type="button" className="er-link-btn" title={used ? 'The mappings keep their basis; the schema stays listed as used in mappings' : 'Remove from this project'}
                              onClick={() => onRemove?.(o.value, 'project')}>Remove</button>
                          )}
                          {o.source === 'library' && (
                            <button type="button" className="er-link-btn" onClick={() => onRemove?.(o.value, 'library')}>Remove from library</button>
                          )}
                          {o.source === 'detected' && (
                            <button type="button" className="er-link-btn" title="Add name, URI and element list for this schema"
                              onClick={() => { setPreset(SCHEMA_PRESETS.some(p => schemaKey(p.value) === schemaKey(o.value)) ? o.value : ''); const p = SCHEMA_PRESETS.find(p => schemaKey(p.value) === schemaKey(o.value)); setForm(p ? { value: p.value, version: p.version || '', uri: p.uri || '', description: p.description || '', placeholder: p.placeholder || '', elementsText: formatElementList(p.elements) } : { ...form, value: o.value }); }}>
                              Describe…
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="msm-footer">
          <button className="er-action-btn" onClick={onClose}>Cancel</button>
          <button className="er-action-btn er-action-btn-primary" onClick={submit} disabled={touched && !!error}>Add schema</button>
        </div>
      </div>
    </div>
  );
};

export default MappingSchemaModal;
