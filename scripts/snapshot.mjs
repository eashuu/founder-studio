// Copies the published data into the founder-studio skill, so offline mode and the hybrid fallback ship with it.
import { copyFileSync, mkdirSync } from 'node:fs';

const to = new URL('../skills/founder-studio/data/', import.meta.url);
mkdirSync(to, { recursive: true });
for (const f of ['manifest.json', 'bundle.json']) copyFileSync(new URL(`../dist/data/${f}`, import.meta.url), new URL(f, to));
console.log('snapshot: skills/founder-studio/data updated');
