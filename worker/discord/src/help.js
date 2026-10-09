/* /help: what the bot can do, in the visitor's language, naming each command the way
   their Discord shows it (/單字測驗 for Traditional Chinese, /単語クイズ for Japanese…). */

import { COMMANDS } from './commands.js';
import { COLOR, SITE_URL, linkButton, row } from './ui.js';

const LOCALE = { zh: 'zh-TW', zhs: 'zh-CN', ja: 'ja', ko: 'ko', ru: 'ru', fr: 'fr', es: 'es-ES', de: 'de' };

const H = {
    zh: {
        title: '🌸 小花火能做什麼？', intro: '我是 **Hanabiの小天地** 的學習小幫手，用網站上的單字庫和文法，陪你練習日文、韓文、英文、中文、法文、俄文、西班牙文和德文！',
        quiz: '選語言和等級（或生活主題），用按鈕作答的單字選擇題，最後看分數。', grammar: '隨機一個文法：說明＋填空小測驗，答完看常見錯誤和例句。',
        dictionary: '查單字：網站單字庫的意思、英文釋義和例句。', language: '選擇我回覆你的語言（9 種）。', help: '顯示這個說明。',
        tip: '💡 題目和結果預設只有你看得到；想讓頻道的人一起看，把「公開」設成 True。', site: '到 Hanabiの小天地 網站'
    },
    zhs: {
        title: '🌸 小花火能做什么？', intro: '我是 **Hanabiの小天地** 的学习小帮手，用网站上的单词库和语法，陪你练习日语、韩语、英语、中文、法语、俄语、西班牙语和德语！',
        quiz: '选语言和等级（或生活主题），用按钮作答的单词选择题，最后看分数。', grammar: '随机一个语法：说明＋填空小测验，答完看常见错误和例句。',
        dictionary: '查单词：网站单词库的意思、英文释义和例句。', language: '选择我回复你的语言（9 种）。', help: '显示这个说明。',
        tip: '💡 题目和结果默认只有你看得到；想让频道里的人一起看，把“公开”设为 True。', site: '去 Hanabiの小天地 网站'
    },
    en: {
        title: '🌸 What can 小花火 do?', intro: "I'm the study buddy of **Hanabiの小天地**. With the site's word lists and grammar lessons I help you practise Japanese, Korean, English, Chinese, French, Russian, Spanish and German!",
        quiz: 'Pick a language and a level (or an everyday topic) for a multiple-choice word quiz with buttons and a score at the end.', grammar: 'A random grammar point: explanation + fill-in-the-blank question, then a common mistake and an example.',
        dictionary: "Look up a word: the site's meaning, English definitions and example sentences.", language: 'Choose the language I reply to you in (9 languages).', help: 'Show this help.',
        tip: '💡 Questions and results are only visible to you by default; set "public" to True to share them with the channel.', site: 'Visit Hanabiの小天地'
    },
    ja: {
        title: '🌸 小花火にできること', intro: '**Hanabiの小天地** の学習アシスタントです。サイトの単語リストと文法で、日本語・韓国語・英語・中国語・フランス語・ロシア語・スペイン語・ドイツ語の練習をお手伝いします！',
        quiz: '言語とレベル（または生活テーマ）を選んで、ボタンで答える単語クイズ。最後にスコアが出ます。', grammar: 'ランダムな文法：説明＋穴埋め問題。答えたあとによくあるまちがいと例文も。',
        dictionary: '単語を調べる：サイトの意味、英語の定義、例文。', language: '返信の言語を選ぶ（9 言語）。', help: 'このヘルプを表示。',
        tip: '💡 問題と結果は通常あなたにだけ表示されます。チャンネルのみんなに見せたいときは「公開」を True に。', site: 'Hanabiの小天地 を見る'
    },
    ko: {
        title: '🌸 小花火가 할 수 있는 것', intro: '저는 **Hanabiの小天地**의 학습 도우미예요. 사이트의 단어장과 문법으로 일본어, 한국어, 영어, 중국어, 프랑스어, 러시아어, 스페인어, 독일어 연습을 도와드려요!',
        quiz: '언어와 수준(또는 생활 주제)을 골라 버튼으로 답하는 단어 퀴즈, 마지막에 점수를 보여 줘요.', grammar: '무작위 문법: 설명 + 빈칸 문제, 답한 뒤에 자주 하는 실수와 예문까지.',
        dictionary: '단어 찾기: 사이트의 뜻, 영어 뜻풀이, 예문.', language: '제가 답할 언어를 골라요 (9개 언어).', help: '이 도움말을 보여 줘요.',
        tip: '💡 문제와 결과는 기본적으로 나만 볼 수 있어요. 채널 사람들과 함께 보려면 「공개」를 True로 설정하세요.', site: 'Hanabiの小天地 가기'
    },
    ru: {
        title: '🌸 Что умеет 小花火?', intro: 'Я помощник по учёбе сайта **Hanabiの小天地**. По спискам слов и урокам грамматики сайта помогаю практиковать японский, корейский, английский, китайский, французский, русский, испанский и немецкий!',
        quiz: 'Выберите язык и уровень (или тему) — тест на слова с кнопками и счётом в конце.', grammar: 'Случайная тема грамматики: объяснение и вопрос с пропуском, затем частая ошибка и пример.',
        dictionary: 'Найти слово: значение с сайта, определения на английском и примеры.', language: 'Выбрать язык моих ответов (9 языков).', help: 'Показать эту справку.',
        tip: '💡 Вопросы и результаты по умолчанию видны только вам; чтобы показать их каналу, укажите «для_всех» = True.', site: 'Открыть Hanabiの小天地'
    },
    fr: {
        title: '🌸 Que sait faire 小花火 ?', intro: 'Je suis l’assistante d’étude de **Hanabiの小天地**. Avec les listes de mots et la grammaire du site, je t’aide à pratiquer le japonais, le coréen, l’anglais, le chinois, le français, le russe, l’espagnol et l’allemand !',
        quiz: 'Choisis une langue et un niveau (ou un thème) : quiz de vocabulaire à boutons, avec ton score à la fin.', grammar: 'Un point de grammaire au hasard : explication + phrase à trous, puis une erreur fréquente et un exemple.',
        dictionary: 'Chercher un mot : le sens du site, les définitions en anglais et des exemples.', language: 'Choisir la langue de mes réponses (9 langues).', help: 'Afficher cette aide.',
        tip: '💡 Par défaut, toi seul vois les questions et résultats ; mets « public » à True pour les partager avec le salon.', site: 'Aller sur Hanabiの小天地'
    },
    es: {
        title: '🌸 ¿Qué puede hacer 小花火?', intro: 'Soy la ayudante de estudio de **Hanabiの小天地**. Con las listas de palabras y la gramática de la web te ayudo a practicar japonés, coreano, inglés, chino, francés, ruso, español y alemán.',
        quiz: 'Elige un idioma y un nivel (o un tema): quiz de vocabulario con botones y tu puntuación al final.', grammar: 'Un punto de gramática al azar: explicación + frase para completar, y después un error frecuente y un ejemplo.',
        dictionary: 'Buscar una palabra: el significado de la web, definiciones en inglés y ejemplos.', language: 'Elegir el idioma de mis respuestas (9 idiomas).', help: 'Mostrar esta ayuda.',
        tip: '💡 Por defecto, solo tú ves las preguntas y los resultados; pon «público» en True para compartirlos con el canal.', site: 'Ir a Hanabiの小天地'
    },
    de: {
        title: '🌸 Was kann 小花火?', intro: 'Ich bin die Lernhilfe von **Hanabiの小天地**. Mit den Wortlisten und Grammatiklektionen der Website helfe ich dir beim Üben von Japanisch, Koreanisch, Englisch, Chinesisch, Französisch, Russisch, Spanisch und Deutsch!',
        quiz: 'Wähle Sprache und Stufe (oder ein Alltagsthema): Vokabelquiz mit Buttons und Punktestand am Ende.', grammar: 'Ein zufälliger Grammatikpunkt: Erklärung + Lückensatz, danach ein häufiger Fehler und ein Beispiel.',
        dictionary: 'Ein Wort nachschlagen: Bedeutung von der Website, englische Definitionen und Beispielsätze.', language: 'Die Sprache meiner Antworten wählen (9 Sprachen).', help: 'Diese Hilfe anzeigen.',
        tip: '💡 Fragen und Ergebnisse siehst standardmäßig nur du; setze „öffentlich“ auf True, um sie mit dem Kanal zu teilen.', site: 'Zu Hanabiの小天地'
    }
};

/* the command's name as this visitor's Discord shows it */
function shownName(name, ui) {
    const c = COMMANDS.find(x => x.name === name);
    return (c && LOCALE[ui] && c.name_localizations[LOCALE[ui]]) || name;
}

export function helpMessage(ui) {
    const h = H[ui] || H.en;
    const line = name => `**/${shownName(name, ui)}**\n${h[name]}`;
    return {
        embeds: [{
            color: COLOR, title: h.title,
            description: [h.intro, '', ...['quiz', 'grammar', 'dictionary', 'language', 'help'].map(line).join('\n\n').split('\n'), '', h.tip].join('\n')
        }],
        components: [row([linkButton(SITE_URL, h.site)])]
    };
}
