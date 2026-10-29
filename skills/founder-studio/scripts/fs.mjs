#!/usr/bin/env node
// Founder Studio data client. Node 20+, no dependencies. Prints JSON on stdout; errors go to stderr with exit 1.
//
//   node fs.mjs status | sync | tracks | decisions
//   node fs.mjs list [--track key] [--stage key] [--q "words"]
//   node fs.mjs get <slug>... [--region US|EU|UK|India] [--os macOS|Windows|Linux] [--brief]
//
// Data modes (flag --mode, env FS_MODE, or .founder-studio/config.json "mode"; default hybrid):
//   offline  the snapshot bundled with this skill, never the network
//   online   the published data; fails when it cannot be reached
//   hybrid   the published data when reachable, else the last cached copy, else the snapshot
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA = 1;
const DEFAULT_SOURCE = 'https://eashuu.github.io/founder-studio/data/';
const MODES = ['offline', 'online', 'hybrid'];

const die = (msg) => { process.stderr.write(`founder-studio: ${msg}\n`); process.exit(1); };

// ---------- args and config ----------
const argv = process.argv.slice(2);
const cmd = argv[0];
const pos = [];
const flags = {};
for (let i = 1; i < argv.length; i++) {
  if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
  else pos.push(argv[i]);
}
const project = flags.project || process.cwd();
const cfgFile = join(project, '.founder-studio', 'config.json');
let cfg = {};
if (existsSync(cfgFile)) {
  try { cfg = JSON.parse(readFileSync(cfgFile, 'utf8')); } catch (e) { die(`${cfgFile} is not valid JSON (${e.message})`); }
}
const mode = flags.mode || process.env.FS_MODE || cfg.mode || 'hybrid';
if (!MODES.includes(mode)) die(`unknown mode "${mode}"; use offline, online or hybrid`);
const source = (flags.source || process.env.FS_SOURCE || cfg.source || DEFAULT_SOURCE).replace(/\/?$/, '/');
const maxAge = Number(flags['max-age'] || cfg.max_age_days || 90);
const timeout = Number(process.env.FS_TIMEOUT_MS || (mode === 'online' ? 15000 : 4000));

const here = dirname(fileURLToPath(import.meta.url));
const snapshotDir = process.env.FS_SNAPSHOT_DIR || join(here, '..', 'data');
const cacheDir = process.env.FS_CACHE_DIR
  || (process.platform === 'win32' ? join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'founder-studio')
    : join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'founder-studio'));

// ---------- loading ----------
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

// A bundle is trusted only when its bytes hash to its manifest's sha256 and its schema is one this client reads.
function verified(manifest, buf, where) {
  if (manifest.schema !== SCHEMA) throw new Error(`${where}: data schema ${manifest.schema}, this client reads ${SCHEMA}; update the skill`);
  if (sha(buf) !== manifest.sha256) throw new Error(`${where}: bundle hash does not match its manifest`);
  return JSON.parse(buf.toString('utf8'));
}

function readLocal(dir, origin) {
  const m = join(dir, 'manifest.json'), b = join(dir, 'bundle.json');
  if (!existsSync(m) || !existsSync(b)) return null;
  const manifest = JSON.parse(readFileSync(m, 'utf8'));
  return { manifest, bundle: verified(manifest, readFileSync(b), origin), origin };
}

async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeout), headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Fetch the manifest; download the bundle only when the cached copy is a different version.
async function fromNetwork() {
  const manifest = JSON.parse((await get(source + 'manifest.json')).toString('utf8'));
  const cached = (() => { try { return readLocal(cacheDir, 'cache'); } catch { return null; } })();
  if (cached && cached.manifest.version === manifest.version) return { ...cached, origin: 'network (cache current)' };
  const buf = await get(source + (manifest.bundle || 'bundle.json'));
  const bundle = verified(manifest, buf, source);
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(join(cacheDir, 'bundle.json'), buf);
  writeFileSync(join(cacheDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { manifest, bundle, origin: 'network' };
}

async function load() {
  if (mode === 'offline') return readLocal(snapshotDir, 'snapshot') || die(`no snapshot in ${snapshotDir}; reinstall the skill or use hybrid`);
  try {
    return await fromNetwork();
  } catch (e) {
    if (mode === 'online') die(`online mode cannot load ${source} (${e.message}). Check the network, or switch to hybrid or offline.`);
    for (const [dir, origin] of [[cacheDir, 'cache'], [snapshotDir, 'snapshot']]) {
      try { const d = readLocal(dir, origin); if (d) return { ...d, warning: `published data unreachable (${e.message}); using the ${origin}` }; } catch {}
    }
    die(`no data: ${e.message}, and no cache or snapshot to fall back on`);
  }
}

// ---------- shaping ----------
const REGIONS = { us: 'US', usa: 'US', eu: 'EU', europe: 'EU', uk: 'UK', gb: 'UK', in: 'India', india: 'India' };
const OSES = { macos: 'macOS', mac: 'macOS', darwin: 'macOS', windows: 'Windows', win: 'Windows', win32: 'Windows', linux: 'Linux' };
const pickKey = (map, v, what) => { if (!v) return null; const k = map[String(v).toLowerCase()]; if (!k) die(`unknown ${what} "${v}"; use ${[...new Set(Object.values(map))].join(', ')}`); return k; };
const region = pickKey(REGIONS, flags.region, 'region');
const os = pickKey(OSES, flags.os, 'os');

const today = new Date(process.env.FS_TODAY || Date.now());
const ageDays = (d) => (d && !Number.isNaN(Date.parse(d)) ? Math.floor((today - Date.parse(d)) / 864e5) : null);
const stale = (p) => { const a = ageDays(p?.checked); return a === null || a > maxAge; };
const costKey = (c = '') => (/^paid/i.test(c) ? 'paid' : /^freemium/i.test(c) ? 'freemium' : /^owned/i.test(c) ? 'owned' : 'free');

const row = (s) => ({
  slug: s.slug, job: s.slot, track: s.track, stage: s.stage,
  pick: s.pick.name, cost: costKey(s.pick.cost), free: s.best_free?.name || null,
  checked: s.pick.checked || null, verdict: s.verify?.verdict || null, stale: stale(s.pick),
});

// --brief: what a stack table needs, a fraction of the full slot.
const PICK_FIELDS = ['name', 'url', 'why', 'cost', 'free_limits', 'commercial_ok', 'install', 'source_url', 'checked'];
const trim = (p, keys) => p && Object.fromEntries(keys.filter((k) => p[k] !== undefined).map((k) => [k, p[k]]));

// Full slot for the chosen profile: only the matching region and OS notes, candidates trimmed to their verdicts.
function detail(s) {
  const notes = (obj, key) => (obj && key ? (obj[key] ? { [key]: obj[key] } : {}) : obj || {});
  return {
    ...s,
    region_notes: notes(s.region_notes, region),
    os_notes: notes(s.os_notes, os),
    candidates: (s.candidates || []).map((c) => ({ name: c.name, verdict: c.verdict })),
    stale: stale(s.pick),
    age_days: ageDays(s.pick.checked),
  };
}
const brief = (s) => {
  const d = detail(s);
  return {
    slug: d.slug, job: d.slot, track: d.track, stage: d.stage, decision: d.decision, note: d.note,
    pick: trim(d.pick, PICK_FIELDS), best_free: trim(d.best_free, PICK_FIELDS), alts: d.alts.map((a) => trim(a, ['name', 'why', 'cost'])),
    region_notes: d.region_notes, os_notes: d.os_notes, verdict: d.verify?.verdict || null, stale: d.stale, age_days: d.age_days,
  };
};

// ---------- commands ----------
const out = (body, d) => {
  const data = { mode, origin: d.origin, version: d.manifest.version, built: d.manifest.built, source: d.origin.startsWith('network') ? source : undefined, max_age_days: maxAge };
  if (d.warning) data.warning = d.warning;
  process.stdout.write(JSON.stringify({ data, ...body }, null, 1) + '\n');
};

const USAGE = 'usage: fs.mjs status | sync | tracks | decisions | list [--track k] [--stage k] [--q words] | get <slug>... [--region r] [--os o] [--brief]';
if (!cmd || cmd === 'help' || cmd === '--help') { process.stdout.write(USAGE + '\n'); process.exit(0); }

const d = await load();
const { bundle } = d;
const slots = bundle.slots;

switch (cmd) {
  case 'status':
  case 'sync':
    out({ slots: slots.length, tracks: bundle.tracks.length, stale: slots.filter((s) => stale(s.pick)).length, cache: cacheDir, snapshot: snapshotDir }, d);
    break;
  case 'tracks':
    out({ stages: bundle.stages.map((st) => ({ ...st, tracks: bundle.tracks.filter((t) => t.stage === st.key).map((t) => ({ key: t.key, name: t.name, blurb: t.blurb, slots: slots.filter((s) => s.track === t.key).length })) })) }, d);
    break;
  case 'decisions':
    out({ decisions: bundle.decisions, security_notes: bundle.notes }, d);
    break;
  case 'list': {
    const words = (flags.q || '').toLowerCase().split(/\s+/).filter(Boolean);
    const hay = (s) => [s.slot, s.pick.name, s.pick.what, s.best_free?.name, ...s.alts.map((a) => a.name)].join(' ').toLowerCase();
    const hits = slots.filter((s) => (!flags.track || s.track === flags.track) && (!flags.stage || s.stage === flags.stage) && words.every((w) => hay(s).includes(w)));
    out({ count: hits.length, slots: hits.map(row) }, d);
    break;
  }
  case 'get': {
    if (!pos.length) die('get needs at least one slug (find them with list)');
    const bySlug = new Map(slots.map((s) => [s.slug, s]));
    const missing = pos.filter((p) => !bySlug.has(p));
    if (missing.length) die(`unknown slug: ${missing.join(', ')}`);
    out({ region, os, slots: pos.map((p) => (flags.brief ? brief : detail)(bySlug.get(p))) }, d);
    break;
  }
  default:
    die(`unknown command "${cmd}"\n${USAGE}`);
}
