# Founder Studio skills

Agent skills that pick verified, current tools for a project from the Founder Studio index and, as the pack grows, set them up. Built for Claude Code.

| Skill | What it does |
|---|---|
| `founder-studio` | The hub: answers "what should I use for X", holds the data client and the data mode. Install it with any other skill. |
| `fs-stack` | Profiles a project and writes `STACK.md`: every job it needs, the tool, why, cost, region and OS notes, sources and checked dates. |

Install:

```bash
npx skills add eashuu/founder-studio --skill founder-studio --skill fs-stack
```

## Data modes

`founder-studio/scripts/fs.mjs` reads the index (Node 20+, no dependencies). Set the mode per project in `.founder-studio/config.json`:

- `hybrid` (default): the published data when reachable, else the last cached copy, else the snapshot bundled in the skill.
- `online`: always the published data; fails when offline.
- `offline`: only the bundled snapshot.

Published data: `https://eashuu.github.io/founder-studio/data/manifest.json` and `bundle.json`. The client downloads the bundle only when the manifest version changes and rejects it unless its SHA-256 matches. Format: [docs/DATA.md](../docs/DATA.md).

## Develop

`npm run build` refreshes the bundled snapshot; `npm test` runs the data client tests.
