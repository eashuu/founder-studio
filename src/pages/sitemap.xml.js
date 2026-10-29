// Minimal sitemap without an extra dependency.
import { slots, meta } from '../lib/data.js';

export function GET({ site }) {
  const paths = ['/', '/tracks/', '/playbook/', '/decisions/', '/method/', '/skills/', ...meta.tracks.map((t) => `/tracks/${t.key}/`), ...slots.map((s) => `/tools/${s.slug}/`)];
  const urls = paths.map((p) => `<url><loc>${new URL(p, site)}</loc><lastmod>${meta.built}</lastmod></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
}
