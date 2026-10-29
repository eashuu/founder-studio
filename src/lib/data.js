import meta from '../data/meta.json';

const mods = import.meta.glob('../data/slots/*.json', { eager: true });
export const slots = Object.values(mods).map((m) => m.default).sort((a, b) => a.order - b.order);
export { meta };

export const REPO = 'https://github.com/eashuu/founder-studio';
// The repo is public, so source and suggest-edit links are shown.
export const REPO_LIVE = true;
export const editUrl = (slug) => `${REPO}/edit/main/src/data/slots/${slug}.json`;

export const track = (key) => meta.tracks.find((t) => t.key === key);
export const stage = (key) => meta.stages.find((s) => s.key === key);
export const slotsIn = (key) => slots.filter((s) => s.track === key);

export function costKey(c = '') {
  c = c.toLowerCase();
  if (c.startsWith('owned')) return 'owned';
  if (c.startsWith('paid')) return 'paid';
  if (c.startsWith('freemium')) return 'freemium';
  return 'free';
}

export const verdictLabel = (v) =>
  ({ ok: 'Verified', fixed: 'Verified', doubt: 'Doubt', stale: 'Stale', wrong_pick: 'Disputed' })[v] || 'Unchecked';

// Seeded PRNG so every torn edge is unique but stable between builds.
function seeded(str) {
  let h = 2166136261;
  for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Escape text and allow line breaks after slashes ("PDF/DOCX/PPTX" wraps cleanly instead of mid-word).
export const wbr = (t = '') => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]).replace(/\//g, '/<wbr>');

// Distinct short pick names in a track, for previews.
export const topPicks = (key, n) => [...new Set(slotsIn(key).map((s) => shortName(s.pick.name)))].slice(0, n);

// Short display name: "Expo (React Native, ...) + Expo Router" -> "Expo"
export const shortName = (n) => n.split(/\s[(+/:]|\s\+|,\s|;\s| via | with /)[0].trim();

// clip-path polygon for a torn paper scrap: jagged on every side, stable per seed.
export function tornPolygon(seed, jag = 2.2, n = 9) {
  const r = seeded(seed);
  const pts = [];
  const j = () => (r() * jag).toFixed(2);
  for (let i = 0; i <= n; i++) pts.push(`${((i / n) * 100).toFixed(1)}% ${j()}%`);
  for (let i = 1; i <= n; i++) pts.push(`${(100 - +j()).toFixed(2)}% ${((i / n) * 100).toFixed(1)}%`);
  for (let i = n - 1; i >= 0; i--) pts.push(`${((i / n) * 100).toFixed(1)}% ${(100 - +j()).toFixed(2)}%`);
  for (let i = n - 1; i >= 1; i--) pts.push(`${j()}% ${((i / n) * 100).toFixed(1)}%`);
  return `polygon(${pts.join(', ')})`;
}

// SVG path for a torn paper edge in a 100 x 8 viewBox. side "top": paper below the tear; "bottom": paper above.
export function tearPath(seed, side = 'bottom', n = 34) {
  const r = seeded(seed);
  let y = 4;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    y = Math.min(7, Math.max(1, y + (r() - 0.5) * 3.2));
    pts.push(`${((i / n) * 100).toFixed(2)},${y.toFixed(2)}`);
  }
  const base = side === 'top' ? 8 : 0;
  return `M0,${base} L${pts.join(' L')} L100,${base} Z`;
}

// clip-path polygon torn along the top and bottom only, `depth` px deep, so tall and short blocks tear alike.
export function tornStrip(seed, depth = 9, n = 28, top = true) {
  const r = seeded(seed);
  const y = () => (r() * depth).toFixed(1);
  const xs = Array.from({ length: n + 1 }, (_, i) => ((i / n) * 100).toFixed(2));
  const t = top ? xs.map((x) => `${x}% ${y()}px`) : ['0 0', '100% 0'];
  const b = xs.reverse().map((x) => `${x}% calc(100% - ${y()}px)`);
  return `polygon(${[...t, ...b].join(', ')})`;
}

// The same tear left open (no top line): stroke it to outline a ripped bottom edge.
export const tearLine = (seed, n = 34) => tearPath(seed, 'bottom', n).replace(/ Z$/, '');

// Published data for the Founder Studio skills: one bundle plus a manifest that carries its hash.
// The skill's data client checks the hash, so both endpoints must serialise the bundle identically.
export const DATA_SCHEMA = 1;
let bundleCache;
export const bundleText = () => (bundleCache ??= JSON.stringify({ schema: DATA_SCHEMA, built: meta.built, ...meta, slots }));
