# nodeterm.dev — landing page

Static landing page for [nodeterm.dev](https://nodeterm.dev). No build step — plain
HTML/CSS/JS. Deploy the contents of this folder to any static host (Netlify, Cloudflare
Pages, GitHub Pages, S3, Nginx, …).

```
site/
  index.html          landing page
  styles.css          page layout only — the palette lives in cli-mono/
  cli-mono/           the oem-ui design system, vendored (tokens, base, components)
  cli-mono.js         oem-ui runtime (theme toggle)
  cli-mono-theme-guard.js   FOUC guard — first node in <head>, never move it
  assets/             logo + hero illustration
  announcements.json  → served at /announcements.json (the in-app news feed)
  updates/            → served at /updates/ (the auto-update feed; binaries go here)
```

## Built on oem-ui

This page is a consumer of [oem-ui](https://github.com/omiinaya/oem-ui), the design
system every oem site is built on. `scripts/check-design-sync.sh` in that repo keeps
the vendored copy byte-identical to the library, so a fix made once lands everywhere.

What the library owns here, and what it replaced:

- **The palette.** `styles.css` used to open with its own `:root` block of eight colour
  literals. It now opens with only the two values no library token can carry — the
  hero gradient — and everything else reads `--bg`, `--panel`, `--line`, `--ink`,
  `--ink-dim` from `cli-mono/tokens.css`. (The old `--text` name had to go: `--text` is
  the library's *font-size* token, so keeping it would have clobbered the body size.)
- **A light theme, which this page did not have at all.** `cli-mono-theme-guard.js`
  is the first node in `<head>` and the runtime's `[data-cm-theme-toggle]` button in
  the nav is the only writer of the stored choice. Everything theme-dependent is a
  token, so the whole page flips: MEASURED in WebKit at 390/375/1280, body
  `rgb(10,10,10)` ↔ `rgb(250,250,250)`, and the `theme-color` meta follows.
- **The 44px tap floor.** base.css gives every `a` and `button` `min-height: var(--tap)`
  under `@media (pointer: coarse)`. MEASURED on a phone viewport: the nav's "Download"
  went 37.5 → 44px and "Star" 33.5 → 44px; on desktop they are unchanged.
- **The wrap, not a clip.** The old header never wrapped: MEASURED at 390x844 and
  375x667 it ran to `scrollWidth` 441 and its "Download" CTA sat 51–66px OUTSIDE the
  viewport, hidden by `overflow-x: hidden`. `.nav-links` now wraps and the brand is
  `flex: 0 0 auto`, so at 390 the wordmark keeps its 106px and nothing is lost.

## Updating the design system

Never hand-edit `cli-mono/` or the two runtime files — they are a verbatim copy and
editing one is how a consumer ends up carrying a fix nobody else has:

```bash
/root/projects/oem-ui/scripts/install.sh "$(pwd)" --flat
bash /root/projects/oem-ui/scripts/check-design-sync.sh "$(git rev-parse --show-toplevel)"
```

## How the download buttons work

`index.html` fetches `/updates/latest-mac.yml` on load, reads the version and the `.dmg`
filenames, and points the buttons at the latest build. If the feed isn't reachable yet, the
buttons fall back to the GitHub Releases page. So once you deploy a release to `/updates/`,
the download buttons update themselves — no edit needed.

## Two feeds this site serves

- **`/announcements.json`** — the in-app news banner reads this. Edit it to post news; see
  the schema in [`../docs/announcements.example.json`](../docs/announcements.example.json).
- **`/updates/`** — the app's auto-updater reads `latest-mac.yml` here. Populated per
  release (see [`updates/README.md`](./updates/README.md)).

## Local preview

```bash
cd site && python3 -m http.server 8080 --bind 0.0.0.0   # → http://<lan-ip>:8080
```
