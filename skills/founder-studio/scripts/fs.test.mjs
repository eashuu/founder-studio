// Data client checks: the three modes, the hash gate, the fallbacks and the profile filters. Run: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FS = fileURLToPath(new URL('./fs.mjs', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'fs-test-'));

const slot = (slug, extra = {}) => ({
  slug, slot: slug, track: 'ship', stage: 'ship', order: 1, alts: [{ name: 'Alt' }], candidates: [{ name: 'Alt', verdict: 'runner-up', why: 'long text' }],
  pick: { name: `${slug} pick`, cost: 'Paid', checked: '2026-10-01', what: 'thing' }, best_free: { name: 'Free one' },
  region_notes: { US: 'us note', India: 'india note' }, os_notes: { Windows: 'win note', macOS: 'mac note' }, verify: { verdict: 'ok' }, ...extra,
});
const bundleOf = (version, slots) => JSON.stringify({ schema: 1, built: '2026-10-28', stages: [{ key: 'ship', name: 'Ship' }], tracks: [{ key: 'ship', name: 'Ship', stage: 'ship' }], decisions: [], notes: [], phases: [], unverified: [], slots, v: version });
const manifestOf = (text, over = {}) => ({ schema: 1, version: createHash('sha256').update(text).digest('hex').slice(0, 16), built: '2026-10-28', bundle: 'bundle.json', sha256: createHash('sha256').update(text).digest('hex'), ...over });

// The "published" data the server hands out; tests swap it.
let served = {};
const write = (dir, text, manifest) => { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'bundle.json'), text); writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest)); };

const snapDir = join(tmp, 'snapshot');
const snapText = bundleOf('snap', [slot('snap-slot')]);
write(snapDir, snapText, manifestOf(snapText));

let server, base;
before(async () => {
  server = createServer((req, res) => {
    const body = served[req.url.split('?')[0].replace('/data/', '')];
    if (body === undefined) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': 'application/json' }).end(body);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/data/`;
});
after(() => { server.close(); rmSync(tmp, { recursive: true, force: true }); });

let n = 0;
function run(args, { cache = join(tmp, `cache-${++n}`), source = base, mode } = {}) {
  const env = { ...process.env, FS_SNAPSHOT_DIR: snapDir, FS_CACHE_DIR: cache, FS_SOURCE: source, FS_TODAY: '2026-10-29', FS_TIMEOUT_MS: '1500' };
  delete env.FS_MODE;
  if (mode) env.FS_MODE = mode;
  return new Promise((resolve) => execFile(process.execPath, [FS, ...args], { env, cwd: tmp }, (err, stdout, stderr) =>
    resolve({ code: err ? err.code : 0, json: stdout ? JSON.parse(stdout) : null, stderr })));
}

const publish = (slots) => { const text = bundleOf('net', slots); served = { 'manifest.json': JSON.stringify(manifestOf(text)), 'bundle.json': text }; return text; };

test('offline reads the snapshot and never the network', async () => {
  served = {};
  const r = await run(['list'], { mode: 'offline' });
  assert.equal(r.code, 0);
  assert.equal(r.json.data.origin, 'snapshot');
  assert.deepEqual(r.json.slots.map((s) => s.slug), ['snap-slot']);
});

test('online downloads, verifies and caches; a second run reuses the cache', async () => {
  publish([slot('net-slot')]);
  const cache = join(tmp, 'cache-online');
  const a = await run(['list'], { mode: 'online', cache });
  assert.equal(a.code, 0, a.stderr);
  assert.equal(a.json.data.origin, 'network');
  assert.deepEqual(a.json.slots.map((s) => s.slug), ['net-slot']);
  served['bundle.json'] = 'would fail the hash if fetched again';
  const b = await run(['list'], { mode: 'online', cache });
  assert.equal(b.json.data.origin, 'network (cache current)');
});

test('online fails clearly when the source is unreachable', async () => {
  const r = await run(['status'], { mode: 'online', source: 'http://127.0.0.1:9/data/' });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /online mode cannot load/);
});

test('a bundle that does not match its manifest hash is rejected', async () => {
  const text = publish([slot('net-slot')]);
  served['bundle.json'] = text.replace('net-slot', 'evil-slot');
  const r = await run(['list'], { mode: 'online' });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /hash does not match/);
});

test('an unknown schema is refused', async () => {
  const text = bundleOf('net', [slot('x')]);
  served = { 'manifest.json': JSON.stringify(manifestOf(text, { schema: 2 })), 'bundle.json': text };
  const r = await run(['list'], { mode: 'online' });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /schema 2/);
});

test('hybrid falls back to the cache, then to the snapshot, with a warning', async () => {
  publish([slot('cached-slot')]);
  const cache = join(tmp, 'cache-hybrid');
  assert.equal((await run(['list'], { cache })).json.data.origin, 'network');
  const down = 'http://127.0.0.1:9/data/';
  const fromCache = await run(['list'], { cache, source: down });
  assert.equal(fromCache.json.data.origin, 'cache');
  assert.match(fromCache.json.data.warning, /unreachable/);
  assert.deepEqual(fromCache.json.slots.map((s) => s.slug), ['cached-slot']);
  const fromSnap = await run(['list'], { source: down });
  assert.equal(fromSnap.json.data.origin, 'snapshot');
});

test('get keeps only the profile region and OS notes, and flags stale picks', async () => {
  publish([slot('fresh'), slot('old', { pick: { name: 'Old', checked: '2026-01-01' } })]);
  const r = await run(['get', 'fresh', 'old', '--region', 'in', '--os', 'win']);
  assert.equal(r.code, 0, r.stderr);
  const [fresh, old] = r.json.slots;
  assert.deepEqual(fresh.region_notes, { India: 'india note' });
  assert.deepEqual(fresh.os_notes, { Windows: 'win note' });
  assert.deepEqual(fresh.candidates, [{ name: 'Alt', verdict: 'runner-up' }]);
  assert.equal(fresh.stale, false);
  assert.equal(old.stale, true);
});

test('list filters by words; unknown slugs and regions are errors', async () => {
  publish([slot('payments-mor'), slot('hosting')]);
  assert.deepEqual((await run(['list', '--q', 'payments'])).json.slots.map((s) => s.slug), ['payments-mor']);
  assert.match((await run(['get', 'nope'])).stderr, /unknown slug: nope/);
  assert.match((await run(['get', 'hosting', '--region', 'mars'])).stderr, /unknown region/);
});

test('get --brief keeps what a stack row needs and drops the rest', async () => {
  publish([slot('fresh', { details: 'long prose', alts: [{ name: 'Alt', why: 'wins when', cost: 'Free', install: 'x', free_limits: 'y' }] })]);
  const [s] = (await run(['get', 'fresh', '--brief', '--region', 'US'])).json.slots;
  assert.equal(s.details, undefined);
  assert.equal(s.candidates, undefined);
  assert.deepEqual(s.alts, [{ name: 'Alt', why: 'wins when', cost: 'Free' }]);
  assert.deepEqual(s.region_notes, { US: 'us note' });
  assert.equal(s.verdict, 'ok');
});
