---
paths:
  - "tools/content_i18n.py"
  - "tools/translations/**"
  - "js/grammar.js"
  - "js/reading.js"
  - "js/listening.js"
---

# Translating the learning content (grammar, reading, listening) into 6 more languages

(Moved verbatim from CLAUDE.md on 2026-10-24; keep it up to date when changing these files.)

**學習 pages' picker and translations (2026-10-15)**: 文法, 閱讀 and 聽解 open with `learnPickerHtml()` (js/grammar.js): the learning language's levels (from the header pill, see below — the pages had their own language menu until 2026-10-17) with how many items are passed (`learnDoneCount` over the page's progress store) — an even grid of equal buttons (`.learn-level-grid`, `--cols`: up to 5 in a row, more in two even rows; nothing when the language has one level). Each page picks its level with `learnSetId(index, current, page)` (the current one if it is in the learning language, else the last one used in that language — `learn_last_levels`, set by `learnRememberLevel()` — else the first) and shows `learnEmptyHtml()` when the language has nothing there yet. Their {zh, en} texts are also in ja / ko / ru / fr / es / de, machine-translated by Gemini (owner's choice) with `python tools/content_i18n.py [--only grammar|reading|listening]` — grammar with gemini-3.8-flash at `thinkingLevel: low` (the right grammar terms; thinking doubled the cost), reading and listening with gemini-3.1-flash-lite — and stored, keyed by a hash of the zh + en text, in the **tracked** `tools/translations/<lang>.json` (fix a bad translation there; a changed source text gets a new key and is translated again on the next run). The build scripts call `fill()` so a rebuild keeps them offline. No lesson is translated into its own language (that UI reads the English, like the Chinese lessons in a Chinese UI). `gText()` / `readingTx()` pick `obj[siteLang]`. A run never replaces a stored translation (a text with the same zh + en can be shared by grammar, reading and listening of different languages; since 2026-10-24 it only adds the languages a key lacks), but it rewrites every data file — check `git status` for grammar / reading files after a listening run. Uses the paid key in tools/.gemini-tts.env.
