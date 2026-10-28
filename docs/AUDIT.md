# Founder Studio: UI/UX and frontend audit

Date: 2026-10-28. Build: commit 7f856f9.
Method: headless Chrome (no real input) at 1440 px and 400 px, in light and dark mode. Checks covered:
- axe-core 4.10 on 8 page types
- a keyboard walk
- the command palette and stack drawer
- view transitions
- font loading
- page weight
- an overflow sweep of all 263 pages

## Critical

| # | Finding | Evidence | Fix |
|---|---|---|---|
| C1 | **No navigation on phones.** The header nav is `display:none` below 860 px and nothing replaces it, so Tracks, Playbook, Decisions and Method can't be reached on mobile. | All 4 nav links report hidden at 400 px. | Add a "Menu" button that opens a full-screen sheet with the 4 links, the 5 stages and search. Keep Search and Stack in the bar. |
| C2 | **The body font never loads.** Fontshare's CSS API returns only one family per URL, so General Sans is dropped and all body text renders in Arial or Helvetica. | `curl` of the combined URL returns only `Tanker`, and the document fonts list has no General Sans. | Use a separate `<link>` per family, or self-host both WOFF2 files under `/fonts` with `font-display: swap` and preload Tanker. |

## High

| # | Finding | Evidence | Fix |
|---|---|---|---|
| H1 | **The stack drawer isn't accessible.** It has no dialog role and no focus move or trap, the page behind still scrolls, and focus falls to `<body>` on close. Adding a tool auto-opens it while focus stays on the button behind the shade. | `role`/`aria-modal` null; focus after close is `BODY`; body overflow `visible`. | Make it a `<dialog>` (modal) like the palette. Focus the heading on open, return focus to the trigger on close, and lock scrolling. Don't auto-open on add: pulse the Stack counter and show a small "Added: Expo · View stack" toast. |
| H2 | **The palette doesn't follow listbox semantics.** Options have no `role="option"`, the input isn't a combobox, and mouse hover doesn't move the highlight. | Roles `[listbox, null, null]`; the highlight stays on row 0 after hover. | Use `role="combobox"` + `aria-controls` + `aria-activedescendant` on the input and `role="option"` on rows. Sync the highlight on `mousemove`. Announce the result count with `aria-live`. |
| H3 | **The index matrix's top picks only show on hover,** so touch users never see them. | `.cell ul` max-height is 0 without hover. | Always show the top 2 picks in small type; on hover or focus, expand to 3 with the black inversion. |
| H4 | **The page-rip transition tears the header too,** so navigation visibly disappears and reappears on every page change. | `.bar` has no `view-transition-name`. | Give `.bar` its own name (`view-transition-name: site-bar`) with no animation, so only the content rips. Do the same for the footer if it looks jarring. |
| H5 | **The hero's blue line fails contrast** (Klein blue on near-black is about 2.4:1). | axe `color-contrast` (serious) on `h1 > .b`, desktop and mobile. | Use a lighter blue for the hero line only (around #5866ff, at least 3:1 for large text), or outline the line in blue. |
| H6 | **The ticker can't be paused.** It is auto-moving content longer than 5 s with no pause (WCAG 2.2.2). | No pause control. | Pause on hover and focus, and add a small pause/play button at its right end. Reduced motion already stops it. |
| H7 | **The playbook hides 3 of 7 phases on desktop** with no sign there is more; the scrollbar is thin. | 4 of 7 columns visible at 1440 px. | Use a 4 + 3 wrapped grid on desktop. Or keep the rail but add previous/next buttons, an edge fade and "Phase 3 of 7" status. |

## Medium

| # | Finding | Fix |
|---|---|---|
| M1 | Tool pages highlight no nav item, so you can't tell where you are. | Mark **Tracks** as current on `/tracks/*` and `/tools/*`. |
| M2 | Breadcrumb stage names ("Build", "Run") aren't links, and the header has no Index link besides the logo. | Link stages to `/#<stage>`, give matrix columns ids, and add "Index" to the nav. |
| M3 | External links (Website, Source, runners-up, evidence) open in the same tab and take people off the site. | Open them in a new tab with `rel="noopener"` and keep the ↗ marker as the cue. |
| M4 | The previous/next pager wraps silently (the first tool's "previous" is the track's last). | Stop at the ends, or label the wrap ("Back to the start of App stacks"). |
| M5 | "Copy Markdown" gives no feedback, and items in the drawer aren't links. | Change the label to "Copied" for 1.5 s and link each drawer item to its tool page. |
| M6 | The scramble hover rewrites the link's text node, so the accessible name is garbage mid-hover ("TrF\G\"). | Render the scramble into an `aria-hidden` overlay span, or add `aria-label` and leave the text node alone. Limit it to the logo or nav only. |
| M7 | Each page inlines the full search index, about 60 KB of the 92 KB per page across all 263 pages. | Emit `/search.json` at build and fetch it the first time the palette opens. |
| M8 | The 404 page has no `<h1>`, and the tool page's `<aside>` is a nested complementary landmark. | Make the 404 numeral an `h1`; change the aside to a `div` with `aria-label="Key facts"`. |
| M9 | There is no skip link. | Add a "Skip to content" link targeting `main#main`. |
| M10 | "Suggest an edit" and the GitHub footer links lead to a 404 until the repo is pushed. | Push the repo, or hide the links behind a flag until it exists. |
| M11 | The Stack button label "Stack 0" is ambiguous. | Change it to "Your stack (0)", visually "Stack 0", with an `aria-label`. |

## Low / polish

- **SEO:** no sitemap, robots.txt or OG image, and the canonical uses a placeholder domain. Add `@astrojs/sitemap`, `robots.txt` and one generated OG card per tool using the cover style.
- **Favicon:** it's still the v1 paper-slip icon. Redraw it as the "F/" mark.
- **Shortcut hint:** "Ctrl K" shows on Mac too. Detect the platform and show ⌘K.
- **Shareable filters:** track filters aren't in the URL. Mirror them to `?cost=free&check=verified`.
- **Cover index text:** the "No. 000" index on covers is low contrast on the ink and blue covers. Give it the cover's text colour at 70%.
- **Style tells (optional):** the skill flags these generated-page habits, which are fine as a deliberate brutal choice. Two of them are worth trimming:
  - Use sentence case for long descriptive captions; keep caps only for short metadata.
  - Drop the "→" from in-sentence links.

## Navigation tests (added during fixing)

| # | Finding | Fix |
|---|---|---|
| N1 | URLs without a trailing slash (`/playbook`, `/tracks/money`) returned 404. | `trailingSlash: 'ignore'`. Cloudflare's default `auto-trailing-slash` handles it in production too. |
| N2 | Every click took about 1.1 s to settle because the 0.75 s rip played on every navigation, Back and Forward included. | The rip is now 0.5 s and is skipped for Back/Forward and reload: about 720 ms per click, about 80 ms per Back. |
| N3 | Stage anchors (`/#build`) didn't exist. | Index columns now carry stage ids, and the breadcrumbs and the mobile menu link to them. |
| N4 | On touch, tapping an index cell jumped straight to the track, so the hover preview was never seen. | Top picks are always visible (see H3). |
| N5 | The index preview repeated picks (Cloudflare Workers ×2, Dodo Payments ×2). | Picks are de-duplicated per track. |
| N6 | Slash-joined text broke mid-word ("images/au dio"). | A line break is now allowed after each slash in tool text. |

## Verification after fixes (2026-10-28)

Automated suite (`verify_fixes.py`, headless Chrome): **34/34 pass**. It covers every Critical, High and Medium item, plus N1–N3, filters in the URL, page weight and the sitemap, robots.txt and share image.

- Overflow sweep: 263/263 pages clean at 400 px, 0 console errors.
- Internal links: 10,277 checked, 0 broken.
- axe-core: 0 violations in light mode at 1440 and 400 px on all 8 page types. Dark mode has 0 real violations: the one remaining flag (the hero blue line) is a false positive because axe can't see `mix-blend-mode`. Sampling the rendered pixels measures #3D45E6 on #ECEBE6 at **5.51:1**.
- Page weight: 92 KB down to 21 KB per page. The search index is now `/search.json`, loaded on the first search.

Not changed, by choice:
- Caps-heavy mono captions and the ↗ / ← → markers stay as part of the brutalist voice.
- The canonical domain stays a placeholder until there is a real domain.
- GitHub edit links are hidden until `REPO_LIVE` is set to true in `src/lib/data.js`.
