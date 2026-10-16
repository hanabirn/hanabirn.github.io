# hanabi-discord — the site's Discord bot

Slash commands that use the site's own data, answered by a Cloudflare Worker through
Discord's **HTTP interactions** (no gateway connection, nothing running between
commands, nothing to keep awake):

| Command | 中文名稱 | What it does |
| --- | --- | --- |
| `/quiz` | 單字測驗 | Language → level or topic (autocomplete) → 5–30 multiple-choice questions on 4 buttons, then a score card listing every word asked, right or wrong, with its meaning (10 a page). Japanese kanji words ask for the reading, everything else for the meaning (Chinese lists: the English meaning). |
| `/grammar study` | 文法・學習 | Language → level: the level's points in order, each with its form, explanation, an example and its three practice questions; a wrong answer says why that option doesn't fit and the answer does. Where the visitor got to is kept per language in KV `PREFS` (`g:<user>:<lang>`), and the next `/grammar study` picks up there. |
| `/grammar quiz` | 文法・測驗 | Language → level → 5–30 questions drawn from the whole level; the result lists the missed ones with the why of the picked option and of the answer. |
| `/ask` | 問小花火 | 小花火 answers anything (everyday life, how things work, languages, the site); 繼續問 opens a box for the next question and the conversation (last 8 messages) is kept in KV for 6 hours. Free only: the bot's own Gemini key from a project with **no billing** (`GEMINI_API_KEY`, a secret) tries `ASK_MODELS` in order — each has its own small daily quota, a 429 skips a model for an hour (`spent:<model>`) — then Cloudflare Workers AI (`@cf/qwen/qwen3-30b-a3b-fp8`, its free daily allowance), then "come back tomorrow". 20 questions per person a day (`ASK_PER_DAY`). |
| `/dictionary` | 字典 | The site's word lists (checked Chinese meaning), Wiktionary (English definitions) and Tatoeba (examples with a Chinese translation). |

| `/language` | 語言設定 | The language the bot replies in, saved per user (KV `PREFS`); "auto" follows the Discord client. |

**Languages**: replies (buttons, titles, messages, set / topic names, Tatoeba translations)
come in the site's 9 languages — the visitor's `/language` choice, else their Discord
client's locale — and the commands are localised in Discord's own menu. The word
meanings exist only in Chinese and English: Simplified is converted character by
character (`src/zhconv.js`), the other 6 languages get English. The grammar texts come in
all 9 (the site's `tools/content_i18n.py`), and each practice question carries one line
per option on why it is right or wrong (`tools/grammar_why.py`) — both read from the live site.
`src/i18n.js` holds the bot's text; `src/site-strings.js` and `src/zhconv.js` are generated
by `python build_strings.py` (re-run when the site's set or topic names change). Buttons
carry the language in their `custom_id` (`va:<lang>:…`), so pressing one needs no lookup.

Replies are private (ephemeral) unless `public` is set; on a public quiz only the person
who started it can answer (the owner is always the third field of a `custom_id`). Apart
from the grammar place, nothing is stored: each button carries its quiz in its
`custom_id` — the options picked so far as digits — and the questions are rebuilt from
a seed (see the top of `src/quiz.js` and `src/grammar.js`). Buttons of the older format
(`qa` `qn` `qe` `ga` `gn`, before 2026-10-15) answer that they have expired.

Data is read from `SITE` (`https://hanabirn.xyz`): `data/vocab/<set>.json` and
`data/grammar/<level>.json`, cached at Cloudflare's edge for an hour. A set the site
doesn't have yet (e.g. before a push) answers "還沒有上線".

## Files

- `src/index.js` — checks Discord's Ed25519 signature, answers PING / autocomplete,
  defers commands and buttons ("thinking…") and writes the real reply through the
  interaction webhook (`ctx.waitUntil`).
- `src/quiz.js`, `src/grammar.js`, `src/dictionary.js` — the three commands.
- `src/sets.js` — the word-set catalogue (mirrors `WORD_SET_FAMILIES` in `js/quiz.js`;
  add new sets there too), row → card, the seeded random numbers.
- `src/commands.js` — the command definitions; `register.mjs` sends them to Discord.
- `test.mjs` — local end-to-end test (below).

## Setting up the Discord app (once)

1. <https://discord.com/developers/applications> → **New Application** (name, e.g. 小花火).
2. **General Information**: copy the **Application ID** and the **Public Key** into
   `wrangler.jsonc` (`DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY` — both public by design).
3. **Bot** → **Reset Token** → copy it. It is only needed to register the commands and
   stays on this computer, in the git-ignored `.dev.vars` (one line):
   ```
   DISCORD_BOT_TOKEN=…
   ```
4. Deploy the Worker: `npx wrangler deploy` (from this folder) → it prints
   `https://hanabi-discord.<account>.workers.dev`.
5. **General Information → Interactions Endpoint URL**: that address. Discord checks it
   with a signed PING when you save — it only saves if the public key is right.
6. Register the commands: `node register.mjs`. For `/language`, create the KV store once
   (`npx wrangler kv namespace create PREFS`) and put its id in `wrangler.jsonc`.
7. **Installation**: tick *Guild Install* (scope `applications.commands`) and, if wanted,
   *User Install*; open the install link to add it to a server. No bot permissions and
   no privileged intents are needed.

## Testing locally

`node test.mjs "<path to wrangler>"` starts `wrangler dev` with a throw-away key pair,
serves this repo's `data/` as the site and stands in for Discord, then plays a whole
quiz, grammar rounds and dictionary look-ups and prints every reply. The dictionary
part needs the internet (Wiktionary, Tatoeba).
