/* /help: what the bot can do, in the visitor's language, with each command as a
   clickable mention that their Discord names in its own language. */

import { COMMANDS } from './commands.js';
import { COMMAND_IDS } from './command-ids.js';
import { COLOR, SITE_URL, linkButton, row } from './ui.js';

const LOCALE = { zh: 'zh-TW', zhs: 'zh-CN', ja: 'ja', ko: 'ko', ru: 'ru', fr: 'fr', es: 'es-ES', de: 'de' };

/* One line per command, in two groups (2026-10-17: the help used to be one long text) */
const H = {
    zh: {
        title: '🌸 小花火能做什麼？', intro: '我是 **Hanabiの小天地** 的學習小幫手，陪你練日、韓、英、中、法、俄、西、德 8 種語言！',
        practice: '📚 練習', other: '💬 其他',
        quiz: '單字選擇題，結束後看每個字的對錯；不選語言就接著上次的單字庫', grammar_study: '照順序學文法：先看說明再練習，下次接著學', grammar_quiz: '整個等級隨機抽題，最後解釋答錯的題目', dictionary: '查單字：意思、英文釋義、例句和發音',
        ask: '問小花火任何問題，按「繼續問」接著聊', language: '換我回覆的語言（9 種）',
        tip: '💡 結果預設只有你看得到；「{opt}」設成 True 就能分享到頻道', site: '到 Hanabiの小天地 網站'
    },
    zhs: {
        title: '🌸 小花火能做什么？', intro: '我是 **Hanabiの小天地** 的学习小帮手，陪你练日、韩、英、中、法、俄、西、德 8 种语言！',
        practice: '📚 练习', other: '💬 其他',
        quiz: '单词选择题，结束后看每个词的对错；不选语言就接着上次的单词库', grammar_study: '按顺序学语法：先看说明再练习，下次接着学', grammar_quiz: '整个等级随机抽题，最后解释答错的题目', dictionary: '查单词：意思、英文释义、例句和发音',
        ask: '问小花火任何问题，按“继续问”接着聊', language: '换我回复的语言（9 种）',
        tip: '💡 结果默认只有你看得到；把“{opt}”设为 True 就能分享到频道', site: '去 Hanabiの小天地 网站'
    },
    en: {
        title: '🌸 What can 小花火 do?', intro: "I'm the study buddy of **Hanabiの小天地** — let's practise 8 languages together!",
        practice: '📚 Practice', other: '💬 More',
        quiz: 'Multiple-choice word quiz, every word right or wrong at the end; no language picks up your last list', grammar_study: 'Grammar in order: read the point, then practise; carries on next time', grammar_quiz: 'Random questions from a whole level, the misses explained', dictionary: 'Look up a word: meaning, English definitions, examples and audio',
        ask: 'Ask 小花火 anything; "Ask more" keeps talking', language: 'Change the language I reply in (9 languages)',
        tip: '💡 Results are only visible to you; set "{opt}" to True to share them with the channel', site: 'Visit Hanabiの小天地'
    },
    ja: {
        title: '🌸 小花火にできること', intro: '**Hanabiの小天地** の学習アシスタントです。8 つの言語の練習をお手伝いします！',
        practice: '📚 練習', other: '💬 その他',
        quiz: '単語の選択クイズ。最後に各単語の正誤。言語を選ばなければ前回の続き', grammar_study: '文法を順番に：説明を読んでから練習、次回は続きから', grammar_quiz: 'レベル全体からランダム出題、間違いを解説', dictionary: '単語を調べる：意味・英語の定義・例文・発音',
        ask: '小花火になんでも質問。「続けて質問」で会話を続ける', language: '返信の言語を変える（9 言語）',
        tip: '💡 結果は通常あなたにだけ表示。「{opt}」を True にするとチャンネルに共有', site: 'Hanabiの小天地 を見る'
    },
    ko: {
        title: '🌸 小花火가 할 수 있는 것', intro: '저는 **Hanabiの小天地**의 학습 도우미예요. 8개 언어 연습을 함께해요!',
        practice: '📚 연습', other: '💬 기타',
        quiz: '단어 객관식 퀴즈, 마지막에 단어별 정답·오답. 언어를 안 고르면 지난번에 이어서', grammar_study: '문법을 순서대로: 설명을 읽고 연습, 다음에 이어서', grammar_quiz: '레벨 전체에서 무작위 출제, 틀린 문제 해설', dictionary: '단어 찾기: 뜻, 영어 뜻풀이, 예문, 발음',
        ask: '小花火에게 무엇이든 질문, 「계속 질문」으로 대화 이어 가기', language: '제가 답할 언어 바꾸기 (9개 언어)',
        tip: '💡 결과는 기본적으로 나만 볼 수 있어요. 「{opt}」를 True로 하면 채널에 공유', site: 'Hanabiの小天地 가기'
    },
    ru: {
        title: '🌸 Что умеет 小花火?', intro: 'Я помощник по учёбе сайта **Hanabiの小天地** — практикуем 8 языков вместе!',
        practice: '📚 Практика', other: '💬 Другое',
        quiz: 'Тест на слова с вариантами, в конце — все слова с отметкой; без языка — прошлый список', grammar_study: 'Грамматика по порядку: сначала объяснение, потом практика; дальше с того же места', grammar_quiz: 'Случайные вопросы по уровню, ошибки с разбором', dictionary: 'Найти слово: значение, английские определения, примеры и произношение',
        ask: 'Спросите 小花火 о чём угодно; «Спросить ещё» продолжит разговор', language: 'Сменить язык моих ответов (9 языков)',
        tip: '💡 Результаты видны только вам; укажите «{opt}» = True, чтобы показать каналу', site: 'Открыть Hanabiの小天地'
    },
    fr: {
        title: '🌸 Que sait faire 小花火 ?', intro: 'Je suis l’assistante d’étude de **Hanabiの小天地** — pratiquons 8 langues ensemble !',
        practice: '📚 S’entraîner', other: '💬 Autres',
        quiz: 'Quiz de vocabulaire à choix, chaque mot juste ou faux à la fin ; sans langue, ta dernière liste', grammar_study: 'La grammaire dans l’ordre : l’explication, puis l’entraînement ; ça reprend la fois suivante', grammar_quiz: 'Des questions au hasard sur un niveau, les erreurs expliquées', dictionary: 'Chercher un mot : sens, définitions en anglais, exemples et prononciation',
        ask: 'Pose n’importe quelle question à 小花火 ; « Demander encore » pour continuer', language: 'Changer la langue de mes réponses (9 langues)',
        tip: '💡 Toi seul vois les résultats ; mets « {opt} » à True pour les partager avec le salon', site: 'Aller sur Hanabiの小天地'
    },
    es: {
        title: '🌸 ¿Qué puede hacer 小花火?', intro: 'Soy la ayudante de estudio de **Hanabiの小天地**: ¡practiquemos 8 idiomas juntos!',
        practice: '📚 Practicar', other: '💬 Más',
        quiz: 'Quiz de vocabulario de opciones, cada palabra bien o mal al final; sin idioma, tu última lista', grammar_study: 'La gramática en orden: la explicación y luego la práctica; sigue la próxima vez', grammar_quiz: 'Preguntas al azar de un nivel, con los fallos explicados', dictionary: 'Buscar una palabra: significado, definiciones en inglés, ejemplos y audio',
        ask: 'Pregúntale lo que quieras a 小花火; «Preguntar más» para seguir', language: 'Cambiar el idioma de mis respuestas (9 idiomas)',
        tip: '💡 Solo tú ves los resultados; pon «{opt}» en True para compartirlos con el canal', site: 'Ir a Hanabiの小天地'
    },
    de: {
        title: '🌸 Was kann 小花火?', intro: 'Ich bin die Lernhilfe von **Hanabiの小天地** – lass uns 8 Sprachen üben!',
        practice: '📚 Üben', other: '💬 Sonstiges',
        quiz: 'Vokabelquiz mit Auswahl, am Ende jedes Wort richtig oder falsch; ohne Sprache geht es mit der letzten Liste weiter', grammar_study: 'Grammatik der Reihe nach: erst die Erklärung, dann üben; beim nächsten Mal geht es weiter', grammar_quiz: 'Zufällige Fragen aus einer Stufe, Fehler erklärt', dictionary: 'Ein Wort nachschlagen: Bedeutung, englische Definitionen, Beispiele und Aussprache',
        ask: 'Frag 小花火 alles; mit „Weiter fragen“ geht es weiter', language: 'Die Sprache meiner Antworten ändern (9 Sprachen)',
        tip: '💡 Ergebnisse siehst nur du; setze „{opt}“ auf True, um sie mit dem Kanal zu teilen', site: 'Zu Hanabiの小天地'
    }
};

/* A command as a clickable mention, </quiz:id>: Discord shows it in the reader's own
   client language (which can differ from the bot's reply language — a visitor may use
   an English Discord and Chinese replies) and clicking it fills the command in. Without
   an id (before register.mjs ran) the name as the reply language's Discord shows it. */
export function mention(name, ui) {
    // a subcommand ("grammar study") is mentioned as </grammar study:id>, with the command's id
    const [base, sub] = name.split(' ');
    if (COMMAND_IDS[base]) return `</${name}:${COMMAND_IDS[base]}>`;
    const c = COMMANDS.find(x => x.name === base);
    const s = sub && c && (c.options || []).find(o => o.name === sub);
    const local = x => (x && LOCALE[ui] && x.name_localizations[LOCALE[ui]]) || (x && x.name);
    return '/' + (local(c) || base) + (sub ? ' ' + (local(s) || sub) : '');
}

/* the "public" option as the reader's Discord (locale e.g. "en-US", "zh-TW") names it —
   unlike a command, an option can't be a mention */
function publicOptionName(locale) {
    const opt = COMMANDS[0].options.find(o => o.name === 'public');
    return (opt.name_localizations && opt.name_localizations[locale]) || opt.name;
}

/* ui: the reply language; locale: the Discord client's (it.locale) */
export function helpMessage(ui, locale) {
    const h = H[ui] || H.en;
    const lines = names => names.map(([cmd, key]) => `${mention(cmd, ui)}　${h[key]}`).join('\n');
    return {
        embeds: [{
            color: COLOR, title: h.title, description: h.intro,
            fields: [
                { name: h.practice, value: lines([['quiz', 'quiz'], ['grammar study', 'grammar_study'], ['grammar quiz', 'grammar_quiz'], ['dictionary', 'dictionary']]) },
                { name: h.other, value: lines([['ask', 'ask'], ['language', 'language']]) }
            ],
            footer: { text: h.tip.replace('{opt}', publicOptionName(locale)) }
        }],
        components: [row([linkButton(SITE_URL, h.site)])]
    };
}
