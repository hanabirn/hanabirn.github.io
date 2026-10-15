# Hanabiの小天地

**繁體中文** | [English](README.en.md)

**https://hanabirn.xyz/** — 一個免費、免安裝、不用註冊就能用的語言學習網站：背單字、學文法、讀短文、練聽力。

網站介面支援 9 種語言：繁體中文、简体中文、English、日本語、한국어、Русский、Français、Español、Deutsch。

## 可以做什麼

### 單字

| | |
|---|---|
| 📚 **主題單字** | 日、韓、英、中、法、俄、西、德文各 10 個生活主題（打招呼、吃飯、居家、購物、交通、旅行、天氣、學校、工作、健康），每個主題 40 個字 |
| 🎓 **檢定單字** | JLPT N5–N1、TOPIK 1–4、HSK 1–9（3.0 版）、台灣國中／高中 7000 單、多益、托福，以及法、俄、西、德文 CEFR A1–C1 |
| 🗺️ **學習路徑** | 每關 10 個字：先看單字、再測驗，答對 80% 解鎖下一關 |
| 🔁 **間隔複習** | 答過的字會自動排進複習（1／3／7／14／30 天） |
| 📕 **錯題本** | 答錯的字自動收集，連續答對兩次就算「修好」 |
| 🃏 **閃卡** | 滑動翻卡，分成「會了／還不熟」 |
| 🎧 **聽力測驗** | 聽發音選答案或打字作答，可以放慢速度 |

### 學習

| | |
|---|---|
| ✏️ **文法** | 日文 N5–N3、韓文 TOPIK I–II、中文 HSK 1–3、法文與俄文 A1–A2，共 450 多個文法點；每個都有接續、說明、注意事項、常見錯誤、附錄音的例句和小測驗 |
| 📖 **閱讀** | 8 種語言各 8 篇原創短文：日文有假名標音、中文可切換繁簡和拼音／注音、俄文有重音；點句子聽錄音、點生詞看意思，讀完有測驗和生詞複習 |
| 👂 **聽解** | 照 JLPT 聽解題型出題，日文 N5–N1 都有練習回和照正式流程的模擬考，男、女、旁白三種聲音，全部原創 |

### 工具

| | |
|---|---|
| 🔊 **自然的發音** | 日、韓、中、法、俄、西、德文的單字、例句和字母表都有預先錄好的語音；中文可以自己選台灣或中國大陸口音 |
| 🔤 **字母表** | 英文、平假名、片假名、韓文、注音、俄文、法文、德文、西班牙文，附例字和發音 |
| 📖 **字典** | 查單字的意思、詞性和例句（Wiktionary、Tatoeba） |
| 🌸 **小花火** | 網站的看板娘：AI 學習小幫手，寬螢幕上也會站在旁邊陪你 |
| 💬 **留言板** | 登入後可以留言，由 AI 先審核內容 |
| 🤖 **Discord bot** | 在 Discord 用 `/quiz`、`/grammar`、`/dictionary` 練習（[說明](worker/discord/README.md)） |
| ☁️ **帳號同步（可選）** | 用 Google 或 Email 登入，就能在不同裝置同步進度；不登入也能完整使用 |
| 📱 **App** | 可以「加到主畫面」當 App 用，離線也能複習 |

## 技術

純 HTML + CSS + JavaScript，沒有框架、沒有建置步驟，直接由 **GitHub Pages** 從 `main` 分支提供。

- `index.html`：整個網站是一個單頁應用，各個「頁面」用 `display` 切換
- `js/`、`css/`：依功能拆開的程式和樣式
- `i18n/`：9 種語言的介面文字
- `data/vocab/`：單字庫（由 `tools/build_vocab.py` 產生）
- `data/grammar/`、`data/reading/`、`data/listening/`：文法、閱讀、聽解的內容（原稿在 `tools/` 底下，由 `tools/build_*.py` 檢查後產生）
- `data/audio/`：預先錄好的發音（由 `tools/build_audio.py` 用 Google Cloud Text-to-Speech 和 Gemini TTS 產生）
- `worker/assistant/`：AI 小幫手和留言板用的 Cloudflare Worker（Gemini）
- `worker/discord/`：Discord bot 用的 Cloudflare Worker

在本機執行：

```sh
python -m http.server 8000
# 打開 http://localhost:8000/
```

## 資料來源與授權

單字表各自的來源和授權寫在 [`data/vocab/README.md`](data/vocab/README.md)（大考中心、TSL、ECDICT、HSK 3.0、FLELex、ELELex、DAFlex、Kelly、Wiktionary……），錄音的說明在 [`data/audio/README.md`](data/audio/README.md)。部分單字表（例如 FLELex、Kelly）是 CC BY-NC-SA，只能非商業使用。

文法說明、例句、閱讀短文和聽解題目都是原創內容。

小花火的角色圖是站長 Hanabi 自己畫的，請勿另作他用。

## 隱私

不登入時，所有學習紀錄都只存在你自己的瀏覽器裡。詳見網站的[隱私權政策](https://hanabirn.xyz/privacy.html)。
