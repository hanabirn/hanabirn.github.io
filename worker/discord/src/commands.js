/* The slash commands, as registered with Discord by register.mjs. English names
   with Traditional / Simplified Chinese localisations; the bot answers in
   Traditional Chinese. integration_types 0 + 1: usable in a server and, once a
   user adds the app to their account, anywhere (contexts 0 server, 1 bot DM, 2 other DMs). */

import { LANGS } from './sets.js';
import { QUIZ_MIN, QUIZ_MAX, QUIZ_DEFAULT } from './quiz.js';

const LANG_EN = { ja: 'Japanese', ko: 'Korean', en: 'English', zh: 'Chinese', fr: 'French', ru: 'Russian', es: 'Spanish', de: 'German' };
const langChoices = Object.keys(LANGS).map(id => ({ name: LANG_EN[id], value: id, name_localizations: { 'zh-TW': LANGS[id], 'zh-CN': LANGS[id] } }));
const where = { integration_types: [0, 1], contexts: [0, 1, 2] };
const tw = (zhTW, zhCN) => ({ 'zh-TW': zhTW, 'zh-CN': zhCN || zhTW });

const publicOption = {
    type: 5, name: 'public', name_localizations: tw('公開', '公开'),
    description: 'Show it to everyone in the channel (default: only you)',
    description_localizations: tw('讓頻道裡的人都看得到（預設只有你看得到）', '让频道里的人都看得到（默认只有你看得到）')
};

export const COMMANDS = [
    {
        name: 'quiz', name_localizations: tw('單字測驗', '单词测验'), ...where,
        description: 'Vocabulary quiz from the word lists of hanabirn.xyz',
        description_localizations: tw('用 Hanabiの小天地 的單字庫出選擇題', '用 Hanabiの小天地 的单词库出选择题'),
        options: [
            { type: 3, name: 'language', name_localizations: tw('語言', '语言'), required: true, choices: langChoices,
                description: 'Language', description_localizations: tw('要練習的語言', '要练习的语言') },
            { type: 3, name: 'set', name_localizations: tw('單字庫', '单词库'), autocomplete: true,
                description: 'Level or topic (default: the easiest)', description_localizations: tw('檢定等級或生活主題（預設最簡單的）', '检定等级或生活主题（默认最简单的）') },
            { type: 4, name: 'count', name_localizations: tw('題數', '题数'), min_value: QUIZ_MIN, max_value: QUIZ_MAX,
                description: `Number of questions (default ${QUIZ_DEFAULT})`, description_localizations: tw(`幾題（預設 ${QUIZ_DEFAULT}）`, `几题（默认 ${QUIZ_DEFAULT}）`) },
            publicOption
        ]
    },
    {
        name: 'grammar', name_localizations: tw('文法', '语法'), ...where,
        description: 'A grammar point with a practice question',
        description_localizations: tw('隨機一個文法：說明＋小測驗', '随机一个语法：说明＋小测验'),
        options: [
            { type: 3, name: 'level', name_localizations: tw('等級', '等级'), required: true, autocomplete: true,
                description: 'Language and level, e.g. Japanese N5', description_localizations: tw('語言和等級，例如 日文 N5', '语言和等级，例如 日文 N5') },
            publicOption
        ]
    },
    {
        name: 'dictionary', name_localizations: tw('字典', '字典'), ...where,
        description: 'Look up a word: meanings and example sentences',
        description_localizations: tw('查單字：意思和例句', '查单词：意思和例句'),
        options: [
            { type: 3, name: 'word', name_localizations: tw('單字', '单词'), required: true, max_length: 60,
                description: 'The word', description_localizations: tw('要查的字', '要查的字') },
            { type: 3, name: 'language', name_localizations: tw('語言', '语言'), choices: langChoices,
                description: 'Its language (guessed when left out)', description_localizations: tw('這個字的語言（不選會自動判斷）', '这个字的语言（不选会自动判断）') },
            publicOption
        ]
    }
];
