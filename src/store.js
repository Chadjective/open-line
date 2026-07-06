// Local-only persistence: saved articles, "called about" log, theme.
// No account, no server. Keys are namespaced by instance so multiple instances
// served from the same origin (e.g. a Pages domain) never collide.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

let ns = 'openline';

export function initStore(instanceId) {
  if (instanceId) ns = `openline:${instanceId}`;
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(`${ns}:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(`${ns}:${key}`, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — degrade silently */
  }
}

// --- Saved ----------------------------------------------------------------
export function getSaved() {
  return read('saved', []);
}
export function isSaved(id) {
  return getSaved().includes(id);
}
export function toggleSaved(id) {
  const saved = getSaved();
  const next = saved.includes(id) ? saved.filter((x) => x !== id) : [id, ...saved];
  write('saved', next);
  return next.includes(id);
}

// --- Called about ---------------------------------------------------------
// Stored as { [articleId]: isoTimestamp } so we can compute "this week".
export function getCalled() {
  return read('called', {});
}
export function isCalled(id) {
  return Boolean(getCalled()[id]);
}
export function toggleCalled(id) {
  const called = getCalled();
  if (called[id]) delete called[id];
  else called[id] = new Date().toISOString();
  write('called', called);
  return Boolean(called[id]);
}
export function calledThisWeek() {
  const cutoff = Date.now() - WEEK_MS;
  return Object.values(getCalled()).filter((iso) => {
    const t = Date.parse(iso);
    return Number.isFinite(t) && t >= cutoff;
  }).length;
}

// --- Theme ----------------------------------------------------------------
export function getTheme() {
  return read('theme', 'dark');
}
export function setTheme(theme) {
  write('theme', theme);
}
