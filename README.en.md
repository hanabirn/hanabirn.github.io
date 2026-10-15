# Hanabiの小天地

[繁體中文](README.md) | **English**

**https://hanabirn.xyz/** — a free language-learning site you can use with no install and no sign-up: vocabulary, grammar, reading and listening.

The interface comes in 9 languages: Traditional Chinese, Simplified Chinese, English, Japanese, Korean, Russian, French, Spanish and German.

## What you can do

### Vocabulary

| | |
|---|---|
| 📚 **Topic words** | 10 everyday topics (greetings, food, home, shopping, transport, travel, weather, school, work, health) of 40 words each, in Japanese, Korean, English, Chinese, French, Russian, Spanish and German |
| 🎓 **Exam word lists** | JLPT N5–N1, TOPIK 1–4, HSK 1–9 (3.0), Taiwan's junior / senior high school 7000 words, TOEIC, TOEFL, and CEFR A1–C1 for French, Russian, Spanish and German |
| 🗺️ **Learning path** | 10 words a level: look at them, then take a quiz — 80% unlocks the next level |
| 🔁 **Spaced repetition** | Every word you answer is scheduled for review (after 1 / 3 / 7 / 14 / 30 days) |
| 📕 **Mistake book** | Words you miss are collected automatically; two right answers in a row mark one as fixed |
| 🃏 **Flashcards** | Swipe cards into "know it" and "still learning" |
| 🎧 **Listening quiz** | Hear a word and pick or type the answer, with a slow-down button |

### Learning

| | |
|---|---|
| ✏️ **Grammar** | Japanese N5–N3, Korean TOPIK I–II, Chinese HSK 1–3, French and Russian A1–A2 — over 450 grammar points, each with its form, an explanation, notes, common mistakes, recorded examples and a short quiz |
| 📖 **Reading** | 8 original short texts in each of 8 languages: furigana for Japanese, Traditional / Simplified and pinyin / zhuyin for Chinese, stress marks for Russian; tap a sentence to hear it and a word to see its meaning, then take a quiz and review the new words |
| 👂 **Listening** | JLPT-style listening for Japanese N5 to N1: practice sets and mock exams that run like the real test, voiced by a man, a woman and a narrator — all original |

### Tools

| | |
|---|---|
| 🔊 **Natural pronunciation** | Pre-recorded speech for the words, examples and alphabets of Japanese, Korean, Chinese, French, Russian, Spanish and German; Chinese in a Taiwan or Mainland accent, as you choose |
| 🔤 **Alphabet charts** | English, hiragana, katakana, Korean, zhuyin, Russian, French, German and Spanish, with example words and sound |
| 📖 **Dictionary** | Meanings, parts of speech and example sentences (Wiktionary, Tatoeba) |
| 🌸 **小花火 (Hanabi)** | The site's mascot and AI study helper, who also stands beside the page on wide screens |
| 💬 **Guestbook** | Signed-in visitors can leave a message, checked by AI first |
| 🤖 **Discord bot** | Practise in Discord with `/quiz`, `/grammar` and `/dictionary` ([details](worker/discord/README.md)) |
| ☁️ **Account sync (optional)** | Sign in with Google or email to sync your progress across devices; everything works without an account too |
| 📱 **App** | Add it to your home screen to use it as an app, offline too |

## How it's built

Plain HTML + CSS + JavaScript with no framework and no build step, served by **GitHub Pages** straight from the `main` branch.

- `index.html`: the whole site is a single-page app whose "pages" are shown and hidden with `display`
- `js/`, `css/`: code and styles, one file per feature
- `i18n/`: interface text in 9 languages
- `data/vocab/`: word lists (made by `tools/build_vocab.py`)
- `data/grammar/`, `data/reading/`, `data/listening/`: grammar, reading and listening content (sources under `tools/`, checked and built by `tools/build_*.py`)
- `data/audio/`: pre-recorded speech (made by `tools/build_audio.py` with Google Cloud Text-to-Speech and Gemini TTS)
- `worker/assistant/`: the Cloudflare Worker behind the AI helper and the guestbook (Gemini)
- `worker/discord/`: the Cloudflare Worker behind the Discord bot

Run it locally:

```sh
python -m http.server 8000
# open http://localhost:8000/
```

## Data sources and licences

The sources and licences of the word lists are listed in [`data/vocab/README.md`](data/vocab/README.md) (CEEC, TSL, ECDICT, HSK 3.0, FLELex, ELELex, DAFlex, Kelly, Wiktionary…), and the recordings are described in [`data/audio/README.md`](data/audio/README.md). Some lists (such as FLELex and Kelly) are CC BY-NC-SA, for non-commercial use only.

The grammar explanations, example sentences, reading texts and listening questions are original content.

The mascot artwork is the site owner's own drawing — please don't reuse it.

## Privacy

Without an account, all your progress stays in your own browser. See the site's [privacy policy](https://hanabirn.xyz/privacy.html).
