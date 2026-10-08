# Hanabiの小天地

**https://hanabirn.xyz/** — 一個免費、免安裝、不用註冊就能用的語言學習小網站，專門用來背單字和複習。
A free language-learning site for vocabulary review: no install, no sign-up needed.

網站介面支援 9 種語言：繁體中文、简体中文、English、日本語、한국어、Русский、Français、Español、Deutsch。

## 可以做什麼 / What you can do

| | |
|---|---|
| 📚 **單字（主題）** | 日文、韓文、英文、中文各 10 個生活主題（打招呼、吃飯、居家生活、購物、交通、旅行……），每個主題 40 個字 |
| 🎓 **檢定單字** | JLPT N5–N1、TOPIK 1–4、HSK 1–9（3.0 版）、台灣國中／高中 7000 單、多益、托福、法文與俄文 CEFR A1–C1 |
| 🗺️ **學習路徑** | 每關 10 個字：先看單字、再測驗，答對 80% 解鎖下一關 |
| 🔁 **間隔複習** | 答過的字會自動排進複習（1／3／7／14／30 天） |
| 📕 **錯題本** | 答錯的字自動收集，連續答對兩次就算「修好」 |
| 🃏 **閃卡** | 滑動翻卡，分成「會了／還不熟」 |
| 🎧 **聽力** | 聽發音選答案或打字作答，可放慢速度 |
| 🔊 **真人般的發音** | 日、韓、中、法、俄文單字和字母表都有預先錄好的自然語音 |
| 🔤 **字母表** | 英文、平假名、片假名、韓文、注音、俄文、法文、德文、西班牙文，附例字和發音 |
| 📖 **字典** | 查單字的意思、詞性和例句（Wiktionary、Tatoeba） |
| 🌸 **小花火** | 網站的看板娘：AI 學習小幫手，寬螢幕上也會站在旁邊陪你 |
| ☁️ **帳號同步（可選）** | 用 Google 或 Email 登入就能在不同裝置同步進度；不登入也能完整使用 |
| 📱 **App** | 可以「加到主畫面」當 App 用，離線也能複習 |

## 技術 / How it's built

純 HTML + CSS + JavaScript，沒有框架、沒有建置步驟，直接由 **GitHub Pages** 從 `main` 分支提供。
Plain HTML/CSS/JS with no framework and no build step, served by GitHub Pages straight from `main`.

- `index.html`：整個網站是一個單頁應用，各個「頁面」用 `display` 切換
- `js/`、`css/`：依功能拆開的程式和樣式
- `i18n/`：9 種語言的介面文字
- `data/vocab/`：單字庫（由 `tools/build_vocab.py` 產生）
- `data/audio/`：預先錄好的發音（由 `tools/build_audio.py` 用 Google Cloud Text-to-Speech 產生）
- `worker/assistant/`：AI 小幫手用的 Cloudflare Worker（Gemini）

在本機執行 / Run locally:

```sh
python -m http.server 8000
# open http://localhost:8000/
```

## 資料來源與授權 / Data sources

單字表各自的來源和授權寫在 [`data/vocab/README.md`](data/vocab/README.md)（大考中心、TSL、ECDICT、HSK 3.0、FLELex、Kelly、Wiktionary……），錄音的說明在 [`data/audio/README.md`](data/audio/README.md)。法文（FLELex）和俄文（Kelly）的單字表是 CC BY-NC-SA，只能非商業使用。

Word-list sources and licences are listed in [`data/vocab/README.md`](data/vocab/README.md); some lists are CC BY-NC-SA (non-commercial only).

小花火的角色圖是站長 Hanabi 自己畫的，請勿另作他用。
The mascot artwork is the site owner's own drawing — please don't reuse it.

## 隱私 / Privacy

不登入時，所有學習紀錄都只存在你自己的瀏覽器裡。詳見網站的 [隱私權政策](https://hanabirn.xyz/privacy.html)。
