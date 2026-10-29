# Founder Studio data contract

The site publishes its data for the Founder Studio skills. Sources live in `src/data/` (one JSON file per slot plus `meta.json`); the build publishes two files.

| URL | What |
|---|---|
| `/data/manifest.json` | `schema`, `version` (first 16 hex of the bundle hash), `built`, `slots`, `bundle`, `bytes`, `sha256`. Small; clients poll it. |
| `/data/bundle.json` | `{ schema, built, stages, tracks, decisions, notes, phases, unverified, slots }`. Clients download it only when `version` changes and reject it unless its SHA-256 equals the manifest's. |

Live: `https://eashuu.github.io/founder-studio/data/manifest.json`. `scripts/pages-base.mjs` skips `dist/data/`, so the hashed bytes are published unchanged. Bump `DATA_SCHEMA` in `src/lib/data.js` on any breaking change to the shape below; clients refuse a schema they do not know.

## Slot

`slug`, `slot` (the job), `track`, `stage`, `order`, `pick`, `best_free` (null when the pick is free), `alts`, `candidates`, `decision`, `note`, `details`, `region_notes` (`US`/`EU`/`UK`/`India`, only where the answer differs), `os_notes` (`macOS`/`Windows`/`Linux`), `verify` (`verdict`: ok, fixed, doubt, stale, wrong_pick; `note`).

A pick (`pick`, `best_free`, each alt) has `name`, `url`, `what`, `why`, `cost`, `free_limits`, `commercial_ok`, `license`, `platforms`, `maintained`, `install` (free text), `source_url`, `checked` (YYYY-MM-DD).

## Planned fields (optional until the setup research pass fills them)

`setup` on a pick, so tools can be installed and configured without reading prose:

```json
"setup": {
  "kind": "plugin | mcp | skill | cli | package | app | saas",
  "steps": [{ "os": "any | macOS | Windows | Linux", "run": "command", "scope": "project | user | system" }],
  "config": { "file": ".mcp.json", "snippet": {} },
  "env": [{ "name": "STRIPE_SECRET_KEY", "where": "https://dashboard.stripe.com/apikeys", "secret": true }],
  "account": "https://signup-url or null",
  "docs": "https://...",
  "verify": "command that proves it is installed"
}
```

`applies` on a slot, so a project profile selects slots without guessing:

```json
"applies": {
  "shapes": ["web", "mobile", "desktop", "api", "cli", "ai-agent", "mcp-server", "extension", "any"],
  "customers": ["b2c", "b2b-smb", "enterprise", "internal", "services", "any"],
  "company": true
}
```

`company: true` marks slots only a business needs (entity, tax, contracts, sales tooling).
