/**
 * Helpers for idmXSD v2.0 Revisions 13-14 (ISO 29481-1:2025 terminology).
 *
 * - Project phases: ISO 22263 defines six standard project phases. Older
 *   projects may contain the app's former extra values (handover, operation,
 *   end-of-life); they are mapped to the nearest ISO 22263 phase.
 * - Corresponding exchange view definitions (EVDs, formerly MVDs) of an ER.
 */

export const ISO_22263_PHASES = ['inception', 'brief', 'design', 'production', 'maintenance', 'demolition'];

const PHASE_ALIASES = {
  handover: 'production',
  construction: 'production',
  operation: 'maintenance',
  'end-of-life': 'demolition',
  endoflife: 'demolition',
  concept: 'inception',
  feasibility: 'brief'
};

/** Map a stored phase value to an ISO 22263 phase name, or null if unknown. */
export const normalizeIso22263Phase = (value) => {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return null;
  if (ISO_22263_PHASES.includes(v)) return v;
  return PHASE_ALIASES[v] || PHASE_ALIASES[v.replace(/\s+/g, '')] || null;
};

/** Normalize a list of phase values: ISO 22263 names only, no duplicates, in ISO order. */
export const normalizeIso22263Phases = (values) => {
  const set = new Set((Array.isArray(values) ? values : []).map(normalizeIso22263Phase).filter(Boolean));
  return ISO_22263_PHASES.filter(p => set.has(p));
};

/**
 * Corresponding EVDs of an ER as an array of { basis, name, description? }.
 * Projects created before Rev 14 store them in er.correspondingMvd (object or array).
 */
export const getCorrespondingEvds = (er) => {
  if (!er) return [];
  if (Array.isArray(er.correspondingEvds)) return er.correspondingEvds.filter(Boolean);
  const legacy = er.correspondingMvd;
  if (Array.isArray(legacy)) return legacy.filter(Boolean);
  if (legacy && typeof legacy === 'object' && (legacy.name || legacy.basis)) return [legacy];
  return [];
};
