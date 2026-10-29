// Rewrites root-absolute paths in dist/ so the site works under a sub-path (GitHub Pages project site).
// Usage: node scripts/pages-base.mjs https://eashuu.github.io/founder-studio
// ponytail: string rewrite of the built output; switch to Astro `base` + BASE_URL in source if paths multiply.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import config from '../astro.config.mjs';

const url = new URL(process.argv[2] ?? '');
const site = url.href.replace(/\/$/, '');
const base = url.pathname.replace(/\/$/, '');

const rules = [
  [new RegExp(config.site.replace(/\/$/, '').replace(/[.]/g, '\\.'), 'g'), site], // canonical, og:image, sitemap, robots
  [/(href|src)="\/(?!\/)/g, `$1="${base}/`], // HTML attributes and the stack drawer template
  [/"u":"\//g, `"u":"${base}/`], // search.json entries
  [/fetch\(`\/search\.json`\)/g, `fetch(\`${base}/search.json\`)`],
  [/location\.origin\}\//g, `location.origin}${base}/`], // Markdown stack export
  [/location\.pathname === '\/'/g, `location.pathname === '${base}/'`], // one-per-visit intro on the landing page
];

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
// dist/data is hashed by its manifest, so it is published byte for byte.
for (const f of walk('dist').filter((f) => /\.(html|js|json|xml|txt)$/.test(f) && !/^[\\/]data[\\/]/.test(f.slice(4)))) {
  const src = readFileSync(f, 'utf8');
  const out = rules.reduce((s, [re, to]) => s.replace(re, to), src);
  if (out !== src) writeFileSync(f, out);
}
