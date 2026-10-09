# hanabi-discord — the site's Discord bot

Slash commands that use the site's own data, answered by a Cloudflare Worker through
Discord's **HTTP interactions** (no gateway connection, nothing running between
commands, nothing to keep awake):

| Command | 中文名稱 | What it does |
| --- | --- | --- |
| `/quiz` | 單字測驗 | Language → level or topic (autocomplete) → 5–30 multiple-choice questions on 4 buttons, then a score card. Japanese kanji words ask for the reading, everything else for the meaning (Chinese lists: the English meaning). |
| `/grammar` | 文法 | A random point of a grammar level: pattern, form, explanation and one practice question; the answer shows the full sentence, a common mistake and an example. |
| `/dictionary` | 字典 | The site's word lists (checked Chinese meaning), Wiktionary (English definitions) and Tatoeba (examples with a Chinese translation). |

Replies are private (ephemeral) unless `public` is set; on a public quiz only the person
who started it can answer. Nothing is stored: each button carries its quiz in its
`custom_id` and the question is rebuilt from a seed (see `src/quiz.js`).

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
2. **General Information**: copy the **Application ID** and the **Public Key**.
   Put the public key in `wrangler.jsonc` (`DISCORD_PUBLIC_KEY`, public by design).
3. **Bot** → **Reset Token** → copy it. It is only needed to register the commands and
   stays on this computer, in the git-ignored `.dev.vars`:
   ```
   DISCORD_APPLICATION_ID=…
   DISCORD_BOT_TOKEN=…
   ```
4. Deploy the Worker: `npx wrangler deploy` (from this folder) → it prints
   `https://hanabi-discord.<account>.workers.dev`.
5. **General Information → Interactions Endpoint URL**: that address. Discord checks it
   with a signed PING when you save — it only saves if the public key is right.
6. Register the commands: `node register.mjs`.
7. **Installation**: tick *Guild Install* (scope `applications.commands`) and, if wanted,
   *User Install*; open the install link to add it to a server. No bot permissions and
   no privileged intents are needed.

## Testing locally

`node test.mjs "<path to wrangler>"` starts `wrangler dev` with a throw-away key pair,
serves this repo's `data/` as the site and stands in for Discord, then plays a whole
quiz, grammar rounds and dictionary look-ups and prints every reply. The dictionary
part needs the internet (Wiktionary, Tatoeba).
