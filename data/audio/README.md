# Recorded pronunciations

Pre-rendered word audio played by `js/speech.js` instead of the browser voice.
Generated with Google Cloud Text-to-Speech and, for Chinese, the Google Gemini TTS model (`gemini-3.8-flash-tts`, AI-generated speech) by `tools/build_audio.py` — do not edit by hand; see that script and CLAUDE.md. `index.json` lists under `"g"` the files made by Gemini.

| Folder | Voice | Covers |
|---|---|---|
| `ja/` | ja-JP-Chirp3-HD-Erinome (single kana: ja-JP-Neural2-B) | JLPT N5–N1, hiragana/katakana chart, sample |
| `ko/` | ko-KR-Chirp3-HD-Kore (single syllables: ko-KR-Neural2-A) | TOPIK 1–4, hangul chart, sample |
| `zh-CN/` | cmn-CN-Chirp3-HD-Leda; Gemini voice Kore, Mainland Mandarin (閱讀 in Simplified) | HSK 1–7 (simplified mode), 閱讀 passages in Simplified, sample |
| `zh-TW/` | Gemini voice Aoede, Taiwan accent (閱讀, 文法); cmn-TW-Wavenet-A (the rest) | 閱讀 passages, 文法 examples, HSK 1–7 (traditional mode), zhuyin chart, sample |
| `fr/` | fr-FR-Chirp3-HD-Kore (backup: fr-FR-Neural2-F) | French A1–C1 (with the article: "le chat"), French alphabet tab, sample |
| `ru/` | ru-RU-Chirp3-HD-Kore (backup: ru-RU-Wavenet-C) | Russian A1–C1, Russian alphabet tab, sample |
| `de/` | de-DE-Chirp3-HD-Kore (backup: de-DE-Neural2-G) | German alphabet tab, sample |
| `es/` | es-ES-Chirp3-HD-Kore (backup: es-ES-Neural2-H) | Spanish alphabet tab, sample |
