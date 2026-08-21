# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Hanabiの小天地" — a static, single-page personal website (vocabulary quiz app, guestbook, about page) in Traditional Chinese with 8-language i18n (zh/en/ja/ko/ru/fr/es/de), focused on vocabulary review and language learning. No framework, no build step, no bundler, no package.json. Plain HTML/CSS/JS served directly.

## Running / deploying

There is no build or test command — this is deployed as-is to Netlify.

- `netlify.toml` publishes the repo root (`.`) and functions from `netlify/functions`, but the site is actually deployed via GitHub Pages, not Netlify — the `netlify/functions` directory is currently empty (the osu! beatmap collection feature that used to live here was split out into its own site, `osu-花火網頁`).
- There is no linter or test suite configured.

## Architecture

**Single-page app shell**: `index.html` contains every "page" (`#page-quiz`, `#page-about`, `#page-guestbook`, `#page-guide`, `#page-rhythm`) as sibling `<div>`s toggled via `display: none/block`. `switchPage(page, el)` in `js/quiz.js` handles navigation — no router, no URL state. All CSS is split by feature into `css/*.css` and all linked individually in `<head>` (no bundling), and `js/*.js` files are loaded as plain `<script>` tags in a specific dependency order at the bottom of `<body>` (theme → PapaParse CDN → `js/i18n.js` → the 8 `i18n/<lang>.js` dictionary files → quiz → seasons → guestbook → widgets). New JS files must be added to that script list, to `service-worker.js`'s `ASSETS` cache list, and CSS files to both `<head>` and `ASSETS`.

**i18n (`js/i18n.js` + `i18n/<lang>.js`)**: `js/i18n.js` only declares `const I18N = {}` plus the shared logic (`applyLang`, `setSiteLang`, `t`); the actual translations live in one file per language — `i18n/zh.js`, `i18n/en.js`, `i18n/ja.js`, `i18n/ko.js`, `i18n/ru.js`, `i18n/fr.js`, `i18n/es.js`, `i18n/de.js` — each just assigning a flat dict to `I18N.<lang>` (e.g. `I18N.en = {...}`). These must load as `<script>` tags *after* `js/i18n.js` (which declares `I18N`) and *before* any script that calls `t()`/`applyLang()` at top level. `applyLang(lang)` walks all `[data-i18n]` / `[data-i18n-placeholder]` elements and swaps text/placeholders; `t(key, params)` is used for dynamically-generated strings (e.g. `t('load_success', {n: 5})`, using `{n}`-style placeholder substitution). Adding UI text means adding the key to **all 8** `i18n/<lang>.js` files. `setSiteLang()`/`applyLang()` persists choice to `localStorage['site_lang']` and calls `refreshDynamicContent()` (in `js/quiz.js`) so already-rendered dynamic content (quiz menus) re-renders in the new language.

**Vocabulary quiz (`js/quiz.js`, the largest file)**: Word lists are loaded live from public Google Sheets published as CSV (`SHEETS` constant maps `jp/kr/fr/en/zh` to sheet export URLs) via PapaParse (loaded from CDN in `index.html`). Each language has its own `parseX(rows)` function because sheet column layout differs per language (fixed-width row "stride" parsing — e.g. Japanese reads columns in groups of 6, with a second sheet gid for JP variants — see `parseJapanese`/`parseJapanese2`). Quiz state (mode, current word, score, shuffled order) lives in module-level `let` variables, not a framework state store. Mistakes, quiz history, and flashcard "known" words persist to `localStorage` (`quiz_mistakes`, `quiz_records`, `flashcard_known`). Score-card sharing renders a `<canvas>` and exports as an image.

**Rhythm/game satellite sites (`#page-rhythm`, styled by `css/rhythm.css`)**: The "遊戲區" section links out to separate standalone sites in the same family (`世界計畫-花火網頁`, `鳴潮-花火網頁`, `osu-花火網頁`), each its own repo/Netlify deploy — this site only hosts outbound cards to them, not their code.

**Guestbook (`js/guestbook.js`)**: Reads/writes go to a Google Apps Script Web App URL (`GUESTBOOK_API`) acting as a simple JSON store backed by a Google Sheet. POSTs use `mode: 'no-cors'`, so submission success is assumed optimistically (the new message is appended to local state immediately rather than re-fetched).

**Widgets (`js/widgets.js`)**: Self-contained, DOMContentLoaded-initialized features unrelated to the SPA nav: BGM vinyl player (rotating playlist of external mp3 URLs), click-particle effects, clock + geolocation-based weather (Open-Meteo API), and guide-page pagination.

**Theming (`js/theme.js`)**: Dark/light theme toggled via `data-theme` attribute on `<html>`, persisted to `localStorage['theme']`, applied synchronously before `DOMContentLoaded` to avoid flash. Both themes share a "Dark Neon Cherry Blossom" palette (deep violet/neon pink, glassmorphism cards) defined as CSS custom properties in `css/theme.css` — components reference the variable names, not literal colors, so retuning the palette only requires editing that one file. Background decoration is always-on (no user-facing switch): static falling sakura petals (`css/sakura.css`), a twinkling star layer in dark mode only (`css/stars.css`), and a drifting neon particle canvas (`js/particles.js` + `css/particles.css`).

**PWA**: `manifest.json` + `service-worker.js` (network-first-with-cache-fallback strategy — `fetch` always hits the network and updates the cache, only falling back to cache when offline). Bumping `CACHE_NAME` is necessary when changing the `ASSETS` list, since a stale cached list would keep serving old files to offline visitors.

## Conventions worth knowing

- No JS framework/module system — everything is global functions/variables attached via plain `<script>` tags, and `onclick="..."` attributes in HTML call these global functions directly.
- Chinese (Traditional) is the default/fallback language throughout (`I18N.zh` is the fallback in `t()`).
- HTML entities (`&#x...;`) are used for CJK/emoji text directly in `index.html` markup instead of raw UTF-8 characters in many places (legacy from earlier edits) — matching surrounding style when editing those sections is fine, but new text can be written as plain UTF-8.
