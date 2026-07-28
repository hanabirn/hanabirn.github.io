# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Hanabiの小天地" — a static, single-page personal website (vocabulary quiz app, osu! beatmap collection, music player, guestbook, about page) in Traditional Chinese with 8-language i18n (zh/en/ja/ko/ru/fr/es/de). No framework, no build step, no bundler, no package.json. Plain HTML/CSS/JS served directly.

## Running / deploying

There is no build or test command — this is deployed as-is to Netlify.

- `netlify.toml` publishes the repo root (`.`) and functions from `netlify/functions`.
- To develop locally with working serverless functions (needed for the osu! tab), run `netlify dev` (Netlify CLI) from the repo root. Opening `index.html` directly in a browser works for everything except `/.netlify/functions/osu`.
- There is no linter or test suite configured.

## Architecture

**Single-page app shell**: `index.html` contains every "page" (`#page-quiz`, `#page-music`, `#page-osu`, `#page-about`, `#page-guestbook`, `#page-guide`) as sibling `<div>`s toggled via `display: none/block`. `switchPage(page, el)` in `js/quiz.js` handles navigation — no router, no URL state. All CSS is split by feature into `css/*.css` and all linked individually in `<head>` (no bundling), and `js/*.js` files are loaded as plain `<script>` tags in a specific dependency order at the bottom of `<body>` (theme → PapaParse CDN → i18n → quiz → osu → seasons → guestbook → widgets). New JS files must be added to that script list, to `service-worker.js`'s `ASSETS` cache list, and CSS files to both `<head>` and `ASSETS`.

**i18n (`js/i18n.js`)**: A single `I18N` object keyed by language code (`zh`, `en`, `ja`, `ko`, `ru`, `fr`, `es`, `de`), each a flat dict of translation keys. `applyLang(lang)` walks all `[data-i18n]` / `[data-i18n-placeholder]` elements and swaps text/placeholders; `t(key, params)` is used for dynamically-generated strings (e.g. `t('load_success', {n: 5})`, using `{n}`-style placeholder substitution). Adding UI text means adding the key to **all 8** language blocks. `setSiteLang()`/`applyLang()` persists choice to `localStorage['site_lang']` and calls `refreshDynamicContent()` (in `js/quiz.js`) so already-rendered dynamic content (quiz menus, osu cards) re-renders in the new language.

**Vocabulary quiz (`js/quiz.js`, the largest file)**: Word lists are loaded live from public Google Sheets published as CSV (`SHEETS` constant maps `jp/kr/fr/en/zh` to sheet export URLs) via PapaParse (loaded from CDN in `index.html`). Each language has its own `parseX(rows)` function because sheet column layout differs per language (fixed-width row "stride" parsing — e.g. Japanese reads columns in groups of 6, with a second sheet gid for JP variants — see `parseJapanese`/`parseJapanese2`). Quiz state (mode, current word, score, shuffled order) lives in module-level `let` variables, not a framework state store. Mistakes, quiz history, and flashcard "known" words persist to `localStorage` (`quiz_mistakes`, `quiz_records`, `flashcard_known`). Score-card sharing renders a `<canvas>` and exports as an image.

**osu! collection (`js/osu.js` + `netlify/functions/osu.js`)**: Client calls `/.netlify/functions/osu?...` (never the osu! API directly) so the serverless function can attach the API key server-side. The function proxies to osu! API v1 (`get_beatmaps` / `get_user` / `get_user_recent`) based on which query params are present. Collected beatmaps, favorites, and an optional password-hash gate are stored in `localStorage` (`osu_collection`, `osu_favorites`, `osu_password_hash`) — this is a personal collection with no real auth, just a client-side SHA-256 password check gating destructive actions in the UI.

**Guestbook (`js/guestbook.js`)**: Reads/writes go to a Google Apps Script Web App URL (`GUESTBOOK_API`) acting as a simple JSON store backed by a Google Sheet. POSTs use `mode: 'no-cors'`, so submission success is assumed optimistically (the new message is appended to local state immediately rather than re-fetched).

**Widgets (`js/widgets.js`)**: Self-contained, DOMContentLoaded-initialized features unrelated to the SPA nav: BGM vinyl player (rotating playlist of external mp3 URLs), click-particle effects, clock + geolocation-based weather (Open-Meteo API), and guide-page pagination.

**Theming (`js/theme.js`)**: Dark/light theme toggled via `data-theme` attribute on `<html>`, persisted to `localStorage['theme']`, applied synchronously before `DOMContentLoaded` to avoid flash. Seasonal background particle effects (`js/seasons.js`) are a separate, independent `data-season` attribute/localStorage system (spring/summer/autumn/winter), not tied to light/dark theme.

**PWA**: `manifest.json` + `service-worker.js` (cache-first-with-network-update strategy, cache name `hanabi-v1`). Bumping the cache name is necessary when changing the `ASSETS` list to force clients to refetch.

## Conventions worth knowing

- No JS framework/module system — everything is global functions/variables attached via plain `<script>` tags, and `onclick="..."` attributes in HTML call these global functions directly.
- Chinese (Traditional) is the default/fallback language throughout (`I18N.zh` is the fallback in `t()`).
- HTML entities (`&#x...;`) are used for CJK/emoji text directly in `index.html` markup instead of raw UTF-8 characters in many places (legacy from earlier edits) — matching surrounding style when editing those sections is fine, but new text can be written as plain UTF-8.
