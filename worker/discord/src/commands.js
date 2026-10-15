/* The slash commands, as registered with Discord by register.mjs. English names and
   texts, localised for the site's other languages (Discord shows them in the client's
   language). integration_types 0 + 1: usable in a server and, once a user adds the app
   to their account, anywhere (contexts 0 server, 1 bot DM, 2 other DMs). */

import { STUDY_LANGS } from './sets.js';
import { UI_LANGS, UI_NAMES, siteT } from './i18n.js';
import { QUIZ_MIN, QUIZ_MAX, QUIZ_DEFAULT } from './quiz.js';
import { GQ_MIN, GQ_MAX, GQ_DEFAULT } from './grammar.js';

/* bot language -> Discord locales */
const LOCALES = { zh: ['zh-TW'], zhs: ['zh-CN'], ja: ['ja'], ko: ['ko'], ru: ['ru'], fr: ['fr'], es: ['es-ES', 'es-419'], de: ['de'] };

/* {zh: '…', ja: '…', …} -> Discord's *_localizations (English is the default text) */
function loc(texts) {
    const out = {};
    for (const [ui, text] of Object.entries(texts)) for (const l of LOCALES[ui] || []) out[l] = text;
    return out;
}

/* name + description (+ localisations) in one go: L(['quiz', {zh: '單字測驗'}], ['Vocabulary quiz', {zh: '…'}]) */
const L = ([name, names], [description, descriptions]) => ({
    name, name_localizations: loc(names || {}), description, description_localizations: loc(descriptions || {})
});

const where = { integration_types: [0, 1], contexts: [0, 1, 2] };

const studyChoices = STUDY_LANGS.map(id => {
    const names = {};
    for (const ui of UI_LANGS) if (ui !== 'en') names[ui] = siteT(ui, 'dict_lang_' + id);
    return { name: siteT('en', 'dict_lang_' + id), value: id, name_localizations: loc(names) };
});

const languageOption = (required, desc) => ({
    type: 3, required, choices: studyChoices,
    ...L(['language', { zh: '語言', zhs: '语言', ja: '言語', ko: '언어', ru: 'язык', fr: 'langue', es: 'idioma', de: 'sprache' }], desc)
});

const publicOption = {
    type: 5,
    ...L(['public', { zh: '公開', zhs: '公开', ja: '公開', ko: '공개', ru: 'для_всех', fr: 'public', es: 'público', de: 'öffentlich' }],
        ['Show it to everyone in the channel (default: only you)', {
            zh: '讓頻道裡的人都看得到（預設只有你看得到）', zhs: '让频道里的人都看得到（默认只有你看得到）',
            ja: 'チャンネルの全員に表示する（通常は自分だけ）', ko: '채널의 모든 사람에게 보이기 (기본: 나만 보기)',
            ru: 'Показать всем в канале (по умолчанию — только вам)', fr: 'Afficher pour tout le salon (par défaut : toi seul)',
            es: 'Mostrarlo a todo el canal (por defecto: solo a ti)', de: 'Für alle im Kanal anzeigen (Standard: nur für dich)' }])
};

/* /grammar: the languages that have grammar lessons on the site (data/grammar/index.json).
   Discord keeps choices from registration — add a language here and run register.mjs
   again when the site gets its grammar. */
const GRAMMAR_LANGS = ['ja', 'ko', 'zh', 'fr', 'ru'];
const grammarLanguage = {
    type: 3, required: true, choices: studyChoices.filter(c => GRAMMAR_LANGS.includes(c.value)),
    ...L(['language', { zh: '語言', zhs: '语言', ja: '言語', ko: '언어', ru: 'язык', fr: 'langue', es: 'idioma', de: 'sprache' }],
        ['The language to study', { zh: '要學的語言', zhs: '要学的语言', ja: '学ぶ言語', ko: '공부할 언어', ru: 'Язык для изучения',
            fr: 'La langue à étudier', es: 'El idioma que quieres estudiar', de: 'Die Sprache, die du lernen willst' }])
};
const grammarLevel = {
    type: 3, autocomplete: true,
    ...L(['level', { zh: '等級', zhs: '等级', ja: 'レベル', ko: '수준', ru: 'уровень', fr: 'niveau', es: 'nivel', de: 'stufe' }],
        ['The level (default: where you left off, else the easiest)', { zh: '等級（預設：上次的地方，或最簡單的）', zhs: '等级（默认：上次的地方，或最简单的）',
            ja: 'レベル（通常は前回の続き、なければいちばん易しいもの）', ko: '수준 (기본: 지난번 이어서, 없으면 가장 쉬운 것)',
            ru: 'Уровень (по умолчанию — где вы остановились, иначе самый простой)', fr: 'Le niveau (par défaut : où tu t’es arrêté, sinon le plus facile)',
            es: 'El nivel (por defecto: donde lo dejaste, si no el más fácil)', de: 'Die Stufe (Standard: wo du aufgehört hast, sonst die leichteste)' }])
};

export const COMMANDS = [
    {
        ...where,
        ...L(['quiz', { zh: '單字測驗', zhs: '单词测验', ja: '単語クイズ', ko: '단어퀴즈', ru: 'тест' }],
            ['Vocabulary quiz from the word lists of hanabirn.xyz', {
                zh: '用 Hanabiの小天地 的單字庫出選擇題', zhs: '用 Hanabiの小天地 的单词库出选择题', ja: 'Hanabiの小天地 の単語リストで選択クイズ',
                ko: 'Hanabiの小天地 단어장으로 객관식 퀴즈', ru: 'Тест по спискам слов Hanabiの小天地', fr: 'Quiz de vocabulaire avec les listes de Hanabiの小天地',
                es: 'Quiz de vocabulario con las listas de Hanabiの小天地', de: 'Vokabelquiz mit den Wortlisten von Hanabiの小天地' }]),
        options: [
            languageOption(true, ['The language to practise', { zh: '要練習的語言', zhs: '要练习的语言', ja: '練習する言語', ko: '연습할 언어',
                ru: 'Язык для практики', fr: 'La langue à travailler', es: 'El idioma que quieres practicar', de: 'Die Sprache, die du üben willst' }]),
            { type: 3, autocomplete: true,
                ...L(['set', { zh: '單字庫', zhs: '单词库', ja: '単語リスト', ko: '단어장', ru: 'список', fr: 'liste', es: 'lista', de: 'liste' }],
                    ['Level or topic (default: the easiest)', { zh: '檢定等級或生活主題（預設最簡單的）', zhs: '检定等级或生活主题（默认最简单的）',
                        ja: 'レベルまたはテーマ（通常はいちばん易しいもの）', ko: '수준 또는 주제 (기본: 가장 쉬운 것)', ru: 'Уровень или тема (по умолчанию — самый простой)',
                        fr: 'Niveau ou thème (par défaut : le plus facile)', es: 'Nivel o tema (por defecto: el más fácil)', de: 'Stufe oder Thema (Standard: die leichteste)' }]) },
            { type: 4, min_value: QUIZ_MIN, max_value: QUIZ_MAX,
                ...L(['count', { zh: '題數', zhs: '题数', ja: '問題数', ko: '문제수', ru: 'вопросов', fr: 'questions', es: 'preguntas', de: 'fragen' }],
                    [`Number of questions (default ${QUIZ_DEFAULT})`, { zh: `幾題（預設 ${QUIZ_DEFAULT}）`, zhs: `几题（默认 ${QUIZ_DEFAULT}）`,
                        ja: `問題の数（通常 ${QUIZ_DEFAULT}）`, ko: `문제 수 (기본 ${QUIZ_DEFAULT})`, ru: `Сколько вопросов (по умолчанию ${QUIZ_DEFAULT})`,
                        fr: `Nombre de questions (par défaut ${QUIZ_DEFAULT})`, es: `Número de preguntas (por defecto ${QUIZ_DEFAULT})`, de: `Anzahl der Fragen (Standard ${QUIZ_DEFAULT})` }]) },
            publicOption
        ]
    },
    {
        ...where,
        ...L(['grammar', { zh: '文法', zhs: '语法', ja: '文法', ko: '문법', ru: 'грамматика', fr: 'grammaire', es: 'gramática', de: 'grammatik' }],
            ['Grammar lessons and quizzes from hanabirn.xyz', { zh: 'Hanabiの小天地 的文法：學習或測驗', zhs: 'Hanabiの小天地 的语法：学习或测验',
                ja: 'Hanabiの小天地 の文法：学習またはテスト', ko: 'Hanabiの小天地 문법: 학습 또는 테스트', ru: 'Грамматика Hanabiの小天地: уроки и тесты',
                fr: 'La grammaire de Hanabiの小天地 : leçons et quiz', es: 'La gramática de Hanabiの小天地: lecciones y pruebas',
                de: 'Grammatik von Hanabiの小天地: Lektionen und Tests' }]),
        options: [
            { type: 1,
                ...L(['study', { zh: '學習', zhs: '学习', ja: '学習', ko: '학습', ru: 'учить', fr: 'apprendre', es: 'estudiar', de: 'lernen' }],
                    ['The points of a level in order, three questions each; picks up where you left off', {
                        zh: '照順序學一個等級的文法，每個 3 題；會從上次的地方繼續', zhs: '按顺序学一个等级的语法，每个 3 题；会从上次的地方继续',
                        ja: 'レベルの文法を順番に、各 3 問。前回の続きから', ko: '레벨의 문법을 순서대로, 각 3문제. 지난번 이어서',
                        ru: 'Темы уровня по порядку, по 3 вопроса; с того места, где вы остановились',
                        fr: 'Les points d’un niveau dans l’ordre, 3 questions chacun ; reprend où tu t’es arrêté',
                        es: 'Los puntos de un nivel en orden, 3 preguntas cada uno; sigue donde lo dejaste',
                        de: 'Die Punkte einer Stufe der Reihe nach, je 3 Fragen; macht dort weiter, wo du aufgehört hast' }]),
                options: [grammarLanguage, grammarLevel, publicOption] },
            { type: 1,
                ...L(['quiz', { zh: '測驗', zhs: '测验', ja: 'テスト', ko: '테스트', ru: 'тест', fr: 'quiz', es: 'prueba', de: 'test' }],
                    ['Random questions from a whole level; the missed ones explained at the end', {
                        zh: '從整個等級隨機抽題；最後列出答錯的題目和解釋', zhs: '从整个等级随机抽题；最后列出答错的题目和解释',
                        ja: 'レベル全体からランダムに出題。最後に間違えた問題を解説', ko: '레벨 전체에서 무작위 출제. 마지막에 틀린 문제 해설',
                        ru: 'Случайные вопросы по всему уровню; в конце — разбор ошибок',
                        fr: 'Questions au hasard sur tout un niveau ; les erreurs expliquées à la fin',
                        es: 'Preguntas al azar de todo un nivel; al final, los fallos explicados',
                        de: 'Zufällige Fragen aus einer ganzen Stufe; am Ende die Fehler erklärt' }]),
                options: [grammarLanguage, grammarLevel,
                    { type: 4, min_value: GQ_MIN, max_value: GQ_MAX,
                        ...L(['count', { zh: '題數', zhs: '题数', ja: '問題数', ko: '문제수', ru: 'вопросов', fr: 'questions', es: 'preguntas', de: 'fragen' }],
                            [`Number of questions (default ${GQ_DEFAULT})`, { zh: `幾題（預設 ${GQ_DEFAULT}）`, zhs: `几题（默认 ${GQ_DEFAULT}）`,
                                ja: `問題の数（通常 ${GQ_DEFAULT}）`, ko: `문제 수 (기본 ${GQ_DEFAULT})`, ru: `Сколько вопросов (по умолчанию ${GQ_DEFAULT})`,
                                fr: `Nombre de questions (par défaut ${GQ_DEFAULT})`, es: `Número de preguntas (por defecto ${GQ_DEFAULT})`, de: `Anzahl der Fragen (Standard ${GQ_DEFAULT})` }]) },
                    publicOption] }
        ]
    },
    {
        ...where,
        ...L(['dictionary', { zh: '字典', zhs: '词典', ja: '辞書', ko: '사전', ru: 'словарь', fr: 'dictionnaire', es: 'diccionario', de: 'wörterbuch' }],
            ['Look up a word: meanings and example sentences', { zh: '查單字：意思和例句', zhs: '查单词：意思和例句', ja: '単語を調べる：意味と例文',
                ko: '단어 찾기: 뜻과 예문', ru: 'Найти слово: значения и примеры', fr: 'Chercher un mot : sens et exemples',
                es: 'Buscar una palabra: significados y ejemplos', de: 'Ein Wort nachschlagen: Bedeutungen und Beispiele' }]),
        options: [
            { type: 3, required: true, max_length: 60,
                ...L(['word', { zh: '單字', zhs: '单词', ja: '単語', ko: '단어', ru: 'слово', fr: 'mot', es: 'palabra', de: 'wort' }],
                    ['The word to look up', { zh: '要查的字', zhs: '要查的词', ja: '調べたい言葉', ko: '찾을 단어', ru: 'Слово для поиска',
                        fr: 'Le mot à chercher', es: 'La palabra que buscas', de: 'Das gesuchte Wort' }]) },
            languageOption(false, ['Its language (guessed when left out)', { zh: '這個字的語言（不選會自動判斷）', zhs: '这个词的语言（不选会自动判断）',
                ja: 'その言葉の言語（選ばなければ自動判定）', ko: '단어의 언어 (선택하지 않으면 자동 판단)', ru: 'Язык слова (если не указать — определится сам)',
                fr: 'Sa langue (devinée si vide)', es: 'Su idioma (se adivina si lo dejas vacío)', de: 'Seine Sprache (wird sonst erraten)' }]),
            publicOption
        ]
    },
    {
        ...where,
        ...L(['language', { zh: '語言設定', zhs: '语言设置', ja: '言語設定', ko: '언어설정', ru: 'язык', fr: 'langue', es: 'idioma', de: 'sprache' }],
            ['Choose the language the bot replies to you in', { zh: '選擇機器人回覆你的語言', zhs: '选择机器人回复你的语言', ja: 'ボットが返信する言語を選ぶ',
                ko: '봇이 답할 언어 선택', ru: 'Выбрать язык ответов бота', fr: 'Choisir la langue des réponses du bot',
                es: 'Elegir el idioma en que te responde el bot', de: 'Die Sprache der Antworten wählen' }]),
        options: [
            { type: 3, required: true,
                choices: [{ name: 'Follow my Discord language', value: 'auto', name_localizations: loc({ zh: '跟著我的 Discord 語言', zhs: '跟随我的 Discord 语言',
                    ja: 'Discord の言語に合わせる', ko: '내 Discord 언어 따르기', ru: 'Как в моём Discord', fr: 'Comme mon Discord', es: 'Como mi Discord', de: 'Wie mein Discord' }) }]
                    .concat(UI_LANGS.map(ui => ({ name: UI_NAMES[ui], value: ui }))),
                ...L(['reply_language', { zh: '回覆語言', zhs: '回复语言', ja: '返信の言語', ko: '답변언어', ru: 'язык_ответов', fr: 'langue_des_réponses', es: 'idioma_respuestas', de: 'antwortsprache' }],
                    ['Language of buttons, messages and translations', { zh: '按鈕、訊息和翻譯的語言', zhs: '按钮、消息和翻译的语言', ja: 'ボタン・メッセージ・訳の言語',
                        ko: '버튼, 메시지, 번역의 언어', ru: 'Язык кнопок, сообщений и переводов', fr: 'Langue des boutons, messages et traductions',
                        es: 'Idioma de botones, mensajes y traducciones', de: 'Sprache von Buttons, Nachrichten und Übersetzungen' }]) }
        ]
    },
    {
        ...where,
        ...L(['help', { zh: '說明', zhs: '帮助', ja: 'ヘルプ', ko: '도움말', ru: 'помощь', fr: 'aide', es: 'ayuda', de: 'hilfe' }],
            ['What this bot can do', { zh: '看看這個機器人能做什麼', zhs: '看看这个机器人能做什么', ja: 'このボットにできること',
                ko: '이 봇이 할 수 있는 것', ru: 'Что умеет этот бот', fr: 'Ce que ce bot sait faire', es: 'Lo que puede hacer este bot', de: 'Was dieser Bot kann' }])
    }
];
