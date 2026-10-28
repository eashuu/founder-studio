// Search index for the command palette, fetched on first open instead of inlined in every page.
import { slots, track, shortName } from '../lib/data.js';

export function GET() {
  const rows = slots.map((s) => ({
    u: `/tools/${s.slug}/`, n: shortName(s.pick.name), s: s.slot, t: track(s.track).name,
    h: [s.slot, s.pick.name, ...s.alts.map((a) => a.name), ...s.candidates.map((c) => c.name)].join(' ').toLowerCase(),
  }));
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
}
