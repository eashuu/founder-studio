// Small file the data client polls: when `version` changes it downloads the bundle and checks `sha256`.
import { createHash } from 'node:crypto';
import { DATA_SCHEMA, bundleText, meta, slots } from '../../lib/data.js';

export function GET() {
  const text = bundleText();
  const sha256 = createHash('sha256').update(text, 'utf8').digest('hex');
  const body = { schema: DATA_SCHEMA, version: sha256.slice(0, 16), built: meta.built, slots: slots.length, bundle: 'bundle.json', bytes: Buffer.byteLength(text), sha256 };
  return new Response(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/json' } });
}
