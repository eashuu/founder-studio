# Founder Studio

Every tool a solo AI founder needs, from problem to paid, on free tiers: 245 slots, each with a pick, two runners-up, every option compared, and an independent verification against primary sources.

A static Astro site in an "Index Brutal" style: archive-index typography (Tanker, General Sans, IBM Plex Mono), concrete paper, one Klein blue, torn-paper collage, split-flap counters, a scroll-speed marquee, a command palette (Ctrl+K or /) and a stack drawer that exports Markdown. Motion: Lenis smooth scroll; a torn halftone curtain between pages that shows the destination and rips apart on arrival (all browsers; skipped for back/forward); a one-per-visit landing intro; native CSS scroll-driven animations (parallax collage, masked section titles, dealt covers, filling numbers, reading-progress line); a cursor follower with context labels, magnetic buttons, cover tilt, tape and stamp feedback; Android haptics. Everything falls back to static with prefers-reduced-motion. Lenis is the only runtime dependency.

Content lives in `src/data/`:

- `slots/<slug>.json`: one file per slot (pick, alternatives, candidates, decision, verification).
- `meta.json`: stages, tracks, decisions, security notes, playbook phases, open questions.

## Run locally

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # validates data (scripts/check-data.mjs), then builds to dist/
```

## Deploy (Cloudflare Workers static assets, free plan)

```sh
npx wrangler login
npm run deploy
```

Set `site` in `astro.config.mjs` to your real domain first.

## Contributing

Prices and free tiers change. To fix a slot, edit its JSON file (every tool page has a "Suggest an edit" link) and include a source URL in the pull request. `npm run build` fails if a slot is missing required fields.

Tax and legal content is research, not advice.
