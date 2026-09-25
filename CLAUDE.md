# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Hanabiの小天地" — a static, single-page personal website (vocabulary quiz app, guestbook, about page) in Traditional Chinese with 8-language i18n (zh/en/ja/ko/ru/fr/es/de), focused on vocabulary review and language learning. No framework, no build step, no bundler, no package.json. Plain HTML/CSS/JS served directly.

## Running / deploying

There is no build or test command — the repo root is served as-is by **GitHub Pages**.

- The remote is `github.com/hanabirn/hanabirn.github.io` (a GitHub Pages *user site*), served at the custom domain **`https://hanabirn.xyz/`** straight from the `main` branch root. Pushing to `main` is the deploy — there is no CI workflow, no build step, and no `.github/` directory.
- The custom domain is set by the `CNAME` file at the repo root — don't delete or rename it, or GitHub Pages drops the domain. `hanabirn.github.io` 301-redirects to `hanabirn.xyz`, so old links still work. DNS lives in Cloudflare (GitHub's four apex A + four AAAA records) with the **proxy deliberately off**: behind Cloudflare's orange cloud GitHub can't complete its HTTPS certificate challenge.
- Absolute URLs that name the host — the canonical link and OG/Twitter meta tags in `index.html`, `sitemap.xml`, `robots.txt` — use `https://hanabirn.xyz/`. Use that domain (not `hanabirn.github.io`) for any new absolute URL.
- Because the site is served from the domain root, absolute paths (`/icons/...`, `manifest.json`'s `start_url: "/"`) work as-is; no base-path rewriting is needed.
- The site used to be on Netlify (`hanabirn.netlify.app`), which is now paused for exceeding its free usage limits. All Netlify config (`netlify.toml`, the empty `netlify/functions` dir, the local `.netlify` CLI cache) was removed in the 2026-09-24 cleanup, along with the stale `hanabirn.netlify.app` URLs in `index.html`'s OG/Twitter meta tags. Don't reintroduce Netlify-specific files or URLs.
- There is no linter or test suite configured.

## Architecture

**Single-page app shell**: `index.html` contains every "page" (`#page-quiz`, `#page-about`, `#page-guestbook`, `#page-guide`) as sibling `<div>`s toggled via `display: none/block`. `switchPage(page, el)` in `js/quiz.js` handles navigation — no router, no URL state. All CSS is split by feature into `css/*.css` and all linked individually in `<head>` (no bundling), and `js/*.js` files are loaded as plain `<script>` tags in a specific dependency order at the bottom of `<body>` (theme → PapaParse CDN → `js/i18n.js` → the 8 `i18n/<lang>.js` dictionary files → quiz → seasons → guestbook → widgets). New JS files must be added to that script list, to `service-worker.js`'s `ASSETS` cache list, and CSS files to both `<head>` and `ASSETS`.

**i18n (`js/i18n.js` + `i18n/<lang>.js`)**: `js/i18n.js` only declares `const I18N = {}` plus the shared logic (`applyLang`, `setSiteLang`, `t`); the actual translations live in one file per language — `i18n/zh.js`, `i18n/en.js`, `i18n/ja.js`, `i18n/ko.js`, `i18n/ru.js`, `i18n/fr.js`, `i18n/es.js`, `i18n/de.js` — each just assigning a flat dict to `I18N.<lang>` (e.g. `I18N.en = {...}`). These must load as `<script>` tags *after* `js/i18n.js` (which declares `I18N`) and *before* any script that calls `t()`/`applyLang()` at top level. `applyLang(lang)` walks all `[data-i18n]` / `[data-i18n-placeholder]` elements and swaps text/placeholders; `t(key, params)` is used for dynamically-generated strings (e.g. `t('load_success', {n: 5})`, using `{n}`-style placeholder substitution). Adding UI text means adding the key to **all 8** `i18n/<lang>.js` files. `setSiteLang()`/`applyLang()` persists choice to `localStorage['site_lang']` and calls `refreshDynamicContent()` (in `js/quiz.js`) so already-rendered dynamic content (quiz menus) re-renders in the new language.

**Vocabulary quiz (`js/quiz.js`, the largest file)**: Word lists are loaded live from public Google Sheets published as CSV (`SHEETS` constant maps `jp/kr/fr/en/zh` to sheet export URLs) via PapaParse (loaded from CDN in `index.html`). Each language has its own `parseX(rows)` function because sheet column layout differs per language (fixed-width row "stride" parsing — e.g. Japanese reads columns in groups of 6, with a second sheet gid for JP variants — see `parseJapanese`/`parseJapanese2`). Quiz state (mode, current word, score, shuffled order) lives in module-level `let` variables, not a framework state store. Mistakes, quiz history, and flashcard "known" words persist to `localStorage` (`quiz_mistakes`, `quiz_records`, `flashcard_known`). Score-card sharing renders a `<canvas>` and exports as an image.

**Satellite sites (no longer linked from here)**: `世界計畫-花火網頁`, `鳴潮-花火網頁`, and `osu-花火網頁` are separate standalone sites/repos in the same family. This site used to host an outbound-links page ("遊戲區") pointing to them, but that page was removed to keep the site focused on vocabulary review and language learning — the satellite sites and their repos are unaffected and still deployed independently.

**Guestbook (`js/guestbook.js`)**: Reads/writes go to a Google Apps Script Web App URL (`GUESTBOOK_API`) acting as a simple JSON store backed by a Google Sheet. POSTs use `mode: 'no-cors'`, so submission success is assumed optimistically (the new message is appended to local state immediately rather than re-fetched).

**Widgets (`js/widgets.js`)**: Self-contained, DOMContentLoaded-initialized features unrelated to the SPA nav: BGM vinyl player (rotating playlist of external mp3 URLs), click-particle effects, clock + geolocation-based weather (Open-Meteo API), and guide-page pagination.

**Theming (`js/theme.js`)**: Dark/light theme toggled via `data-theme` attribute on `<html>`, persisted to `localStorage['theme']`, applied synchronously before `DOMContentLoaded` to avoid flash. Both themes share a "Dark Neon Cherry Blossom" palette (deep violet/neon pink, glassmorphism cards) defined as CSS custom properties in `css/theme.css` — components reference the variable names, not literal colors, so retuning the palette only requires editing that one file. Background decoration is always-on (no user-facing switch): static falling sakura petals (`css/sakura.css`), a twinkling star layer in dark mode only (`css/stars.css`), and a drifting neon particle canvas (`js/particles.js` + `css/particles.css`).

**PWA**: `manifest.json` + `service-worker.js` (network-first-with-cache-fallback strategy — `fetch` always hits the network and updates the cache, only falling back to cache when offline). Bumping `CACHE_NAME` is necessary when changing the `ASSETS` list, since a stale cached list would keep serving old files to offline visitors.

## Conventions worth knowing

- No JS framework/module system — everything is global functions/variables attached via plain `<script>` tags, and `onclick="..."` attributes in HTML call these global functions directly.
- Chinese (Traditional) is the default/fallback language throughout (`I18N.zh` is the fallback in `t()`).
- HTML entities (`&#x...;`) are used for CJK/emoji text directly in `index.html` markup instead of raw UTF-8 characters in many places (legacy from earlier edits) — matching surrounding style when editing those sections is fine, but new text can be written as plain UTF-8.

## Workflow for feature/dev requests

For any non-trivial dev request, work through these stages in order:

1. **UI/design pass** (only if the request touches the front end): match the existing "Dark Neon Cherry Blossom" theme — glassmorphism cards, the CSS custom properties in `css/theme.css` (don't hardcode colors), and the existing per-feature `css/*.css` split. There's no React/Tailwind/v0 in this project — new UI is plain HTML + CSS, written by hand.
2. **Implementation**: wire up the HTML/CSS/JS following the conventions above (global functions, `onclick=` handlers, i18n keys added to all 8 `i18n/<lang>.js` files, new files registered in `index.html`'s script/link tags and `service-worker.js`'s `ASSETS`).
3. **Verification** (this project has no test suite or build step, so "testing" means): check the changed files for obvious syntax errors, then actually load the change in a browser (e.g. `python -m http.server` from the repo root) and click through the affected feature before calling it done — per the top-level guidance to verify UI changes in a real browser rather than assuming they work.
4. **Final report**: once verified, and after committing/pushing per the user's request, give a short summary of what changed — don't pad it with restated context.
