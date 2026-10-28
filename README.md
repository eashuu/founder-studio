# Founder Studio

Every tool a solo AI founder needs, from problem to paid, on free tiers: 245 slots, each with a pick, two runners-up, every option compared, and an independent verification against primary sources.

A static Astro site. Content lives in `src/data/`:

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
