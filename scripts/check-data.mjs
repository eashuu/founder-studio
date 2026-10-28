// Fails the build when a slot is missing what a tool page needs.
import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('../src/data/slots/', import.meta.url);
const meta = JSON.parse(readFileSync(new URL('../src/data/meta.json', import.meta.url), 'utf8'));
const tracks = new Set(meta.tracks.map((t) => t.key));
const errors = [];
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

for (const f of files) {
  let s;
  try { s = JSON.parse(readFileSync(new URL(f, dir), 'utf8')); } catch (e) { errors.push(`${f}: invalid JSON (${e.message})`); continue; }
  const need = (cond, msg) => cond || errors.push(`${f}: ${msg}`);
  need(s.slug === f.replace(/\.json$/, ''), 'slug must match file name');
  need(s.slot, 'missing slot');
  need(tracks.has(s.track), `unknown track "${s.track}"`);
  need(s.pick?.name, 'missing pick.name');
  need(/^https?:\/\//.test(s.pick?.source_url || ''), 'pick.source_url must be a URL');
  need(Array.isArray(s.alts), 'alts must be a list (empty for guidance-only slots)');
  for (const a of s.alts || []) need(a.name, 'alternative without a name');
}

if (errors.length) {
  console.error(`check:data failed (${errors.length})\n` + errors.join('\n'));
  process.exit(1);
}
console.log(`check:data ok: ${files.length} slots`);
