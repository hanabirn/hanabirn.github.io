/* The bot's own text in the site's 9 languages. Codes are short because they ride in
   button custom_ids: zh (Traditional), zhs (Simplified), en, ja, ko, ru, fr, es, de.
   Word-set / topic / language names come from the site (site-strings.js). The word
   meanings exist only in Chinese and English, so the other languages get the English
   ones (contentLang); the grammar lessons come in all nine (grammar.js). */

import { SITE_STRINGS } from './site-strings.js';

export const UI_LANGS = ['zh', 'zhs', 'en', 'ja', 'ko', 'ru', 'fr', 'es', 'de'];
export const UI_NAMES = { zh: '繁體中文', zhs: '简体中文', en: 'English', ja: '日本語', ko: '한국어', ru: 'Русский', fr: 'Français', es: 'Español', de: 'Deutsch' };

/* Discord client locale -> bot language */
export function fromLocale(locale) {
    const l = String(locale || '');
    if (l === 'zh-TW') return 'zh';
    if (l === 'zh-CN') return 'zhs';
    const base = l.split('-')[0];
    return UI_LANGS.includes(base) && base !== 'zh' ? base : 'en';
}

export const isUiLang = l => UI_LANGS.includes(l);

/* which language the meanings / explanations are shown in: 'zh', 'zhs' or 'en' */
export const contentLang = l => (l === 'zh' || l === 'zhs' ? l : 'en');

const S = {
    zh: {
        q_title: '{set}・第 {i} / {n} 題', q_reading: '選出正確的讀音', q_meaning: '選出正確的意思', q_score: '目前 {n} 分',
        q_end: '結束測驗', right: '✅ **答對了！**', wrong: '❌ 答錯了，正確答案是：**{a}**', meaning: '意思：{m}', simplified: '簡體：{w}',
        q_tally: '{s} / {n} 題答對', q_next: '下一題 ➡️', q_results: '看結果 🎉', r_title: '🎯 {set}・測驗結果', r_accuracy: '答對率 **{p}%**',
        r_none: '下次再來挑戰吧！', r_100: '全對！太厲害了 🎆', r_80: '很棒，繼續保持！', r_60: '不錯喔，再多練幾次！', r_low: '別灰心，多練習就會進步的！',
        r_footer: '想照關卡一步步學、看錯題本，就到網站練習吧', practice_site: '到 Hanabiの小天地 練習',
        not_live: '「{set}」還沒有上線，換一個試試看。', load_failed: '這個單字庫暫時讀不到，稍後再試。',
        g_title: '📚 {level} 文法', g_form: '接續：{f}', g_quiz: '📝 小測驗：選出填進空格的答案', g_mistake: '⚠️ 常見錯誤', g_example: '💬 例句',
        g_footer: '完整說明、注意事項和有發音的例句都在網站的「文法」頁', g_next: '下一個文法 ➡️', g_site: '到網站看完整說明', g_end: '結束',
        g_ended: '文法練習結束，下次見！👋', g_levels: '{name}（{n} 個文法）', g_no_level: '找不到這個文法等級，換一個試試看。', g_load_failed: '這個文法等級暫時讀不到，稍後再試。',
        d_enter: '請輸入要查的字。', d_site: '📘 網站單字庫', d_wk: '📖 英文釋義（Wiktionary）', d_wk_down: '暫時連不上 Wiktionary，稍後再試。',
        d_ex: '💬 例句（Tatoeba）', d_none_title: '找不到', d_none: '查不到「{w}」（{lang}）。拼字對嗎？也可以在指令裡指定語言。',
        not_yours: '這是別人的題目喔！用 {quiz} 或 {grammar} 開一個你自己的 😊', unknown: '不認得這個指令。', error: '出了點問題，請再試一次 🙏',
        lang_set: '好的！之後我會用**{lang}**回覆你。', lang_auto: '好的！之後我會跟著你的 Discord 語言回覆（現在是**{lang}**）。',
        lang_note: '單字的意思目前只有中文和英文，所以會用英文顯示；文法有你的語言。',
        expired: '這個按鈕已經過期了，請重新輸入 {quiz} 或 {grammar} 😊', g_no_lang: '這個語言的文法還在準備中。', g_why: '💡 為什麼', g_q_n: '📝 第 {i} / {n} 題：選出填進空格的答案', gs_title: '📚 {level}・第 {i} / {n} 個文法', g_resumed: '從上次的地方繼續', g_next_q: '下一題 ➡️', g_point_score: '這個文法答對 {s} / {n} 題', g_point_ok: '學會了！🎉', g_point_again: '再練一次會更熟喔', g_level_done: '🎊 這個等級全部看完了！下一個會從第一個重新開始。', g_retry: '再練一次 🔁', g_saved: '進度已記住，下次用 /grammar study 會從這裡繼續', gq_title: '📝 {level}・文法測驗 {i} / {n}', gq_results: '🎯 {level}・文法測驗結果', gq_missed: '❌ 答錯的題目', gq_all_right: '全部答對！🎆', p_prev: '⬅️ 上一頁', p_next: '下一頁 ➡️', p_page: '第 {p} / {m} 頁', r_words: '📋 答對 {r} 個・答錯 {w} 個'
    },
    zhs: {
        q_title: '{set}・第 {i} / {n} 题', q_reading: '选出正确的读音', q_meaning: '选出正确的意思', q_score: '目前 {n} 分',
        q_end: '结束测验', right: '✅ **答对了！**', wrong: '❌ 答错了，正确答案是：**{a}**', meaning: '意思：{m}', simplified: '简体：{w}',
        q_tally: '答对 {s} / {n} 题', q_next: '下一题 ➡️', q_results: '看结果 🎉', r_title: '🎯 {set}・测验结果', r_accuracy: '正确率 **{p}%**',
        r_none: '下次再来挑战吧！', r_100: '全对！太厉害了 🎆', r_80: '很棒，继续保持！', r_60: '不错哦，再多练几次！', r_low: '别灰心，多练习就会进步的！',
        r_footer: '想按关卡一步步学、看错题本，就到网站练习吧', practice_site: '到 Hanabiの小天地 练习',
        not_live: '“{set}”还没有上线，换一个试试看。', load_failed: '这个单词库暂时读不到，稍后再试。',
        g_title: '📚 {level} 语法', g_form: '接续：{f}', g_quiz: '📝 小测验：选出填进空格的答案', g_mistake: '⚠️ 常见错误', g_example: '💬 例句',
        g_footer: '完整说明、注意事项和带发音的例句都在网站的“语法”页', g_next: '下一个语法 ➡️', g_site: '到网站看完整说明', g_end: '结束',
        g_ended: '语法练习结束，下次见！👋', g_levels: '{name}（{n} 个语法）', g_no_level: '找不到这个语法等级，换一个试试看。', g_load_failed: '这个语法等级暂时读不到，稍后再试。',
        d_enter: '请输入要查的词。', d_site: '📘 网站单词库', d_wk: '📖 英文释义（Wiktionary）', d_wk_down: '暂时连不上 Wiktionary，稍后再试。',
        d_ex: '💬 例句（Tatoeba）', d_none_title: '找不到', d_none: '查不到“{w}”（{lang}）。拼写对吗？也可以在指令里指定语言。',
        not_yours: '这是别人的题目哦！用 {quiz} 或 {grammar} 开一个你自己的 😊', unknown: '不认识这个指令。', error: '出了点问题，请再试一次 🙏',
        lang_set: '好的！之后我会用**{lang}**回复你。', lang_auto: '好的！之后我会跟着你的 Discord 语言回复（现在是**{lang}**）。',
        lang_note: '单词的意思目前只有中文和英文，所以会用英文显示；语法有你的语言。',
        expired: '这个按钮已经过期了，请重新输入 {quiz} 或 {grammar} 😊', g_no_lang: '这个语言的语法还在准备中。', g_why: '💡 为什么', g_q_n: '📝 第 {i} / {n} 题：选出填进空格的答案', gs_title: '📚 {level}・第 {i} / {n} 个语法', g_resumed: '从上次的地方继续', g_next_q: '下一题 ➡️', g_point_score: '这个语法答对 {s} / {n} 题', g_point_ok: '学会了！🎉', g_point_again: '再练一次会更熟哦', g_level_done: '🎊 这个等级全部看完了！下一个会从第一个重新开始。', g_retry: '再练一次 🔁', g_saved: '进度已记住，下次用 /grammar study 会从这里继续', gq_title: '📝 {level}・语法测验 {i} / {n}', gq_results: '🎯 {level}・语法测验结果', gq_missed: '❌ 答错的题目', gq_all_right: '全部答对！🎆', p_prev: '⬅️ 上一页', p_next: '下一页 ➡️', p_page: '第 {p} / {m} 页', r_words: '📋 答对 {r} 个・答错 {w} 个'
    },
    en: {
        q_title: '{set} · Question {i} / {n}', q_reading: 'Choose the right reading', q_meaning: 'Choose the right meaning', q_score: '{n} points so far',
        q_end: 'End quiz', right: '✅ **Correct!**', wrong: '❌ Not quite — the answer is **{a}**', meaning: 'Meaning: {m}', simplified: 'Simplified: {w}',
        q_tally: '{s} / {n} correct', q_next: 'Next ➡️', q_results: 'See results 🎉', r_title: '🎯 {set} · Results', r_accuracy: 'Accuracy **{p}%**',
        r_none: 'Come back for another try!', r_100: 'All correct — amazing! 🎆', r_80: 'Great job, keep it up!', r_60: 'Not bad — a few more rounds!', r_low: "Don't give up — practice makes progress!",
        r_footer: 'Learn level by level and review your mistakes on the website', practice_site: 'Practise on Hanabiの小天地',
        not_live: '“{set}” isn\'t online yet — try another one.', load_failed: "Couldn't load this word list right now. Please try again later.",
        g_title: '📚 {level} grammar', g_form: 'Form: {f}', g_quiz: '📝 Quick check: what goes in the blank?', g_mistake: '⚠️ Common mistake', g_example: '💬 Example',
        g_footer: 'Full explanation, notes and spoken examples are on the website’s Grammar page', g_next: 'Next point ➡️', g_site: 'Full explanation on the website', g_end: 'Finish',
        g_ended: 'Grammar practice finished — see you next time! 👋', g_levels: '{name} ({n} points)', g_no_level: "Couldn't find that grammar level — try another one.", g_load_failed: "Couldn't load this grammar level right now. Please try again later.",
        d_enter: 'Please enter a word.', d_site: '📘 Site word lists', d_wk: '📖 Definitions (Wiktionary)', d_wk_down: "Couldn't reach Wiktionary right now. Please try again later.",
        d_ex: '💬 Examples (Tatoeba)', d_none_title: 'Not found', d_none: 'Nothing found for “{w}” ({lang}). Is the spelling right? You can also pick the language in the command.',
        not_yours: 'This one belongs to someone else! Start your own with {quiz} or {grammar} 😊', unknown: "I don't know that command.", error: 'Something went wrong — please try again 🙏',
        lang_set: "OK! I'll reply to you in **{lang}** from now on.", lang_auto: "OK! I'll follow your Discord language (currently **{lang}**).",
        lang_note: 'Word meanings exist only in Chinese and English, so you will see English there; grammar comes in your language.',
        expired: 'This button has expired — start again with {quiz} or {grammar} 😊', g_no_lang: 'Grammar for this language is coming soon.', g_why: '💡 Why', g_q_n: '📝 Question {i} / {n}: choose what fills the blank', gs_title: '📚 {level} · point {i} / {n}', g_resumed: 'Picking up where you left off', g_next_q: 'Next question ➡️', g_point_score: '{s} / {n} right on this point', g_point_ok: 'Learned! 🎉', g_point_again: 'Another round will make it stick', g_level_done: '🎊 You have been through the whole level! Next time it starts again from the first point.', g_retry: 'Practise again 🔁', g_saved: 'Progress saved — /grammar study carries on from here', gq_title: '📝 {level} · grammar quiz {i} / {n}', gq_results: '🎯 {level} · grammar quiz results', gq_missed: '❌ Missed questions', gq_all_right: 'All correct! 🎆', p_prev: '⬅️ Previous', p_next: 'Next ➡️', p_page: 'Page {p} / {m}', r_words: '📋 {r} right · {w} wrong'
    },
    ja: {
        q_title: '{set}・第 {i} / {n} 問', q_reading: '正しい読み方を選んでください', q_meaning: '正しい意味を選んでください', q_score: '現在 {n} 点',
        q_end: 'クイズを終える', right: '✅ **正解！**', wrong: '❌ 残念、正解は **{a}**', meaning: '意味：{m}', simplified: '簡体字：{w}',
        q_tally: '{n} 問中 {s} 問正解', q_next: '次へ ➡️', q_results: '結果を見る 🎉', r_title: '🎯 {set}・結果', r_accuracy: '正答率 **{p}%**',
        r_none: 'また挑戦してね！', r_100: '全問正解！すごい 🎆', r_80: 'よくできました、その調子！', r_60: 'いい感じ、もう少し練習しよう！', r_low: 'くじけないで、練習すれば上達するよ！',
        r_footer: 'レベル別の学習やまちがいノートはサイトでどうぞ', practice_site: 'Hanabiの小天地 で練習する',
        not_live: '「{set}」はまだ公開されていません。ほかのものを選んでください。', load_failed: 'この単語リストを今は読み込めません。あとでもう一度お試しください。',
        g_title: '📚 {level} 文法', g_form: '接続：{f}', g_quiz: '📝 ミニテスト：空欄に入るものは？', g_mistake: '⚠️ よくあるまちがい', g_example: '💬 例文',
        g_footer: '詳しい説明・注意点・音声つき例文はサイトの「文法」ページへ', g_next: '次の文法 ➡️', g_site: 'サイトで詳しく見る', g_end: '終わる',
        g_ended: '文法の練習はここまで。またね！👋', g_levels: '{name}（{n} 項目）', g_no_level: 'この文法レベルが見つかりません。ほかのものを選んでください。', g_load_failed: 'この文法レベルを今は読み込めません。あとでもう一度お試しください。',
        d_enter: '調べたい言葉を入力してください。', d_site: '📘 サイトの単語リスト', d_wk: '📖 英語の定義（Wiktionary）', d_wk_down: '今は Wiktionary につながりません。あとでもう一度お試しください。',
        d_ex: '💬 例文（Tatoeba）', d_none_title: '見つかりません', d_none: '「{w}」（{lang}）は見つかりませんでした。つづりは合っていますか？コマンドで言語を指定することもできます。',
        not_yours: 'これはほかの人の問題です！{quiz} か {grammar} で自分の問題を始めてね 😊', unknown: 'そのコマンドはわかりません。', error: '問題が起きました。もう一度お試しください 🙏',
        lang_set: 'わかりました！これからは**{lang}**で返信します。', lang_auto: 'わかりました！Discord の言語に合わせて返信します（今は**{lang}**）。',
        lang_note: '単語の意味は中国語と英語しかないので英語で表示します。文法はあなたの言語で読めます。',
        expired: 'このボタンは期限切れです。{quiz} か {grammar} でもう一度どうぞ 😊', g_no_lang: 'この言語の文法は準備中です。', g_why: '💡 なぜ？', g_q_n: '📝 第 {i} / {n} 問：空欄に入るものを選んでください', gs_title: '📚 {level}・{i} / {n} 番目の文法', g_resumed: '前回の続きから', g_next_q: '次の問題 ➡️', g_point_score: 'この文法は {s} / {n} 問正解', g_point_ok: '覚えました！🎉', g_point_again: 'もう一回やるとしっかり身につきます', g_level_done: '🎊 このレベルを全部終えました！次は最初からになります。', g_retry: 'もう一度 🔁', g_saved: '進み具合を保存しました。/grammar study でここから続けられます', gq_title: '📝 {level}・文法テスト {i} / {n}', gq_results: '🎯 {level}・文法テストの結果', gq_missed: '❌ 間違えた問題', gq_all_right: '全問正解！🎆', p_prev: '⬅️ 前へ', p_next: '次へ ➡️', p_page: '{p} / {m} ページ', r_words: '📋 正解 {r}・不正解 {w}'
    },
    ko: {
        q_title: '{set} · {i} / {n}번', q_reading: '올바른 읽는 법을 고르세요', q_meaning: '올바른 뜻을 고르세요', q_score: '현재 {n}점',
        q_end: '퀴즈 끝내기', right: '✅ **정답!**', wrong: '❌ 아쉬워요, 정답은 **{a}**', meaning: '뜻: {m}', simplified: '간체자: {w}',
        q_tally: '{n}문제 중 {s}개 정답', q_next: '다음 ➡️', q_results: '결과 보기 🎉', r_title: '🎯 {set} · 결과', r_accuracy: '정답률 **{p}%**',
        r_none: '다음에 또 도전해요!', r_100: '모두 정답! 대단해요 🎆', r_80: '잘했어요, 계속 이렇게!', r_60: '좋아요, 조금만 더 연습해요!', r_low: '포기하지 마요, 연습하면 늘어요!',
        r_footer: '단계별 학습과 오답 노트는 웹사이트에서 할 수 있어요', practice_site: 'Hanabiの小天地에서 연습하기',
        not_live: '「{set}」은(는) 아직 공개되지 않았어요. 다른 것을 골라 보세요.', load_failed: '지금은 이 단어장을 불러올 수 없어요. 잠시 후 다시 시도해 주세요.',
        g_title: '📚 {level} 문법', g_form: '형태: {f}', g_quiz: '📝 미니 테스트: 빈칸에 들어갈 말은?', g_mistake: '⚠️ 자주 하는 실수', g_example: '💬 예문',
        g_footer: '자세한 설명, 주의할 점, 음성 예문은 웹사이트의 「문법」 페이지에 있어요', g_next: '다음 문법 ➡️', g_site: '웹사이트에서 자세히 보기', g_end: '끝내기',
        g_ended: '문법 연습 끝! 다음에 또 만나요 👋', g_levels: '{name} ({n}개 문법)', g_no_level: '이 문법 수준을 찾을 수 없어요. 다른 것을 골라 보세요.', g_load_failed: '지금은 이 문법 수준을 불러올 수 없어요. 잠시 후 다시 시도해 주세요.',
        d_enter: '찾을 단어를 입력해 주세요.', d_site: '📘 사이트 단어장', d_wk: '📖 영어 뜻풀이 (Wiktionary)', d_wk_down: '지금은 Wiktionary에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.',
        d_ex: '💬 예문 (Tatoeba)', d_none_title: '찾을 수 없음', d_none: '「{w}」({lang})을(를) 찾지 못했어요. 철자가 맞나요? 명령어에서 언어를 지정할 수도 있어요.',
        not_yours: '다른 사람의 문제예요! {quiz}나 {grammar}로 내 문제를 시작해 보세요 😊', unknown: '모르는 명령어예요.', error: '문제가 생겼어요. 다시 시도해 주세요 🙏',
        lang_set: '좋아요! 앞으로 **{lang}**(으)로 답할게요.', lang_auto: '좋아요! Discord 언어에 맞춰 답할게요 (지금은 **{lang}**).',
        lang_note: '단어 뜻은 중국어와 영어로만 있어서 영어로 보여요. 문법은 당신의 언어로 볼 수 있어요.',
        expired: '이 버튼은 만료됐어요. {quiz} 또는 {grammar}로 다시 시작해 주세요 😊', g_no_lang: '이 언어의 문법은 준비 중이에요.', g_why: '💡 왜?', g_q_n: '📝 {i} / {n}번: 빈칸에 들어갈 것을 고르세요', gs_title: '📚 {level}・{i} / {n}번째 문법', g_resumed: '지난번 이어서', g_next_q: '다음 문제 ➡️', g_point_score: '이 문법 {s} / {n}문제 정답', g_point_ok: '익혔어요! 🎉', g_point_again: '한 번 더 하면 더 잘 기억할 거예요', g_level_done: '🎊 이 레벨을 다 봤어요! 다음에는 처음부터 다시 시작해요.', g_retry: '다시 연습 🔁', g_saved: '진도를 저장했어요. /grammar study로 여기서부터 이어서 할 수 있어요', gq_title: '📝 {level}・문법 테스트 {i} / {n}', gq_results: '🎯 {level}・문법 테스트 결과', gq_missed: '❌ 틀린 문제', gq_all_right: '모두 정답! 🎆', p_prev: '⬅️ 이전', p_next: '다음 ➡️', p_page: '{p} / {m} 페이지', r_words: '📋 정답 {r}개・오답 {w}개'
    },
    ru: {
        q_title: '{set} · вопрос {i} / {n}', q_reading: 'Выберите правильное чтение', q_meaning: 'Выберите правильное значение', q_score: 'Пока {n} очк.',
        q_end: 'Закончить тест', right: '✅ **Верно!**', wrong: '❌ Неверно — правильный ответ: **{a}**', meaning: 'Значение: {m}', simplified: 'Упрощённо: {w}',
        q_tally: 'Верно {s} из {n}', q_next: 'Дальше ➡️', q_results: 'Результаты 🎉', r_title: '🎯 {set} · результаты', r_accuracy: 'Точность **{p}%**',
        r_none: 'Возвращайтесь ещё!', r_100: 'Всё верно — потрясающе! 🎆', r_80: 'Отлично, так держать!', r_60: 'Неплохо — ещё пара раундов!', r_low: 'Не сдавайтесь — практика даёт результат!',
        r_footer: 'Учитесь по уровням и повторяйте ошибки на сайте', practice_site: 'Заниматься на Hanabiの小天地',
        not_live: '«{set}» пока недоступен — выберите другой.', load_failed: 'Не удалось загрузить этот список слов. Попробуйте позже.',
        g_title: '📚 {level}: грамматика', g_form: 'Форма: {f}', g_quiz: '📝 Проверка: что вставить в пропуск?', g_mistake: '⚠️ Частая ошибка', g_example: '💬 Пример',
        g_footer: 'Полное объяснение, советы и озвученные примеры — на странице «Грамматика» на сайте', g_next: 'Следующая тема ➡️', g_site: 'Подробнее на сайте', g_end: 'Закончить',
        g_ended: 'Практика грамматики окончена — до встречи! 👋', g_levels: '{name} (тем: {n})', g_no_level: 'Такой уровень грамматики не найден — выберите другой.', g_load_failed: 'Не удалось загрузить этот уровень. Попробуйте позже.',
        d_enter: 'Введите слово.', d_site: '📘 Списки слов сайта', d_wk: '📖 Определения на английском (Wiktionary)', d_wk_down: 'Сейчас не удаётся связаться с Wiktionary. Попробуйте позже.',
        d_ex: '💬 Примеры (Tatoeba)', d_none_title: 'Не найдено', d_none: 'По запросу «{w}» ({lang}) ничего не найдено. Проверьте написание или укажите язык в команде.',
        not_yours: 'Это чужой тест! Начните свой: {quiz} или {grammar} 😊', unknown: 'Я не знаю такой команды.', error: 'Что-то пошло не так — попробуйте ещё раз 🙏',
        lang_set: 'Хорошо! Теперь я буду отвечать вам на языке: **{lang}**.', lang_auto: 'Хорошо! Буду отвечать на языке вашего Discord (сейчас: **{lang}**).',
        lang_note: 'Значения слов есть только на китайском и английском, поэтому там будет английский; грамматика — на вашем языке.',
        expired: 'Эта кнопка устарела — начните заново с {quiz} или {grammar} 😊', g_no_lang: 'Грамматика для этого языка скоро появится.', g_why: '💡 Почему', g_q_n: '📝 Вопрос {i} / {n}: выберите, что вставить в пропуск', gs_title: '📚 {level} · тема {i} / {n}', g_resumed: 'Продолжаем с того места, где вы остановились', g_next_q: 'Следующий вопрос ➡️', g_point_score: 'По этой теме: {s} / {n}', g_point_ok: 'Освоено! 🎉', g_point_again: 'Ещё один круг — и запомнится', g_level_done: '🎊 Вы прошли весь уровень! В следующий раз начнём с первой темы.', g_retry: 'Ещё раз 🔁', g_saved: 'Прогресс сохранён — /grammar study продолжит отсюда', gq_title: '📝 {level} · тест по грамматике {i} / {n}', gq_results: '🎯 {level} · результаты теста', gq_missed: '❌ Ошибки', gq_all_right: 'Всё верно! 🎆', p_prev: '⬅️ Назад', p_next: 'Дальше ➡️', p_page: 'Стр. {p} / {m}', r_words: '📋 Верно: {r} · неверно: {w}'
    },
    fr: {
        q_title: '{set} · question {i} / {n}', q_reading: 'Choisis la bonne lecture', q_meaning: 'Choisis le bon sens', q_score: '{n} points pour l’instant',
        q_end: 'Terminer le quiz', right: '✅ **Bonne réponse !**', wrong: '❌ Raté — la bonne réponse est **{a}**', meaning: 'Sens : {m}', simplified: 'Simplifié : {w}',
        q_tally: '{s} / {n} bonnes réponses', q_next: 'Suivant ➡️', q_results: 'Voir les résultats 🎉', r_title: '🎯 {set} · résultats', r_accuracy: 'Réussite **{p} %**',
        r_none: 'Reviens tenter ta chance !', r_100: 'Tout juste, bravo ! 🎆', r_80: 'Très bien, continue comme ça !', r_60: 'Pas mal, encore quelques tours !', r_low: 'Courage, c’est en pratiquant qu’on progresse !',
        r_footer: 'Apprends niveau par niveau et revois tes erreurs sur le site', practice_site: 'S’entraîner sur Hanabiの小天地',
        not_live: '« {set} » n’est pas encore en ligne — essaie une autre liste.', load_failed: 'Impossible de charger cette liste pour le moment. Réessaie plus tard.',
        g_title: '📚 Grammaire {level}', g_form: 'Construction : {f}', g_quiz: '📝 Petit test : que faut-il dans le blanc ?', g_mistake: '⚠️ Erreur fréquente', g_example: '💬 Exemple',
        g_footer: 'Explication complète, remarques et exemples audio sur la page Grammaire du site', g_next: 'Point suivant ➡️', g_site: 'Explication complète sur le site', g_end: 'Terminer',
        g_ended: 'Fin de la grammaire — à bientôt ! 👋', g_levels: '{name} ({n} points)', g_no_level: 'Niveau de grammaire introuvable — essaie un autre.', g_load_failed: 'Impossible de charger ce niveau pour le moment. Réessaie plus tard.',
        d_enter: 'Saisis un mot.', d_site: '📘 Listes de mots du site', d_wk: '📖 Définitions en anglais (Wiktionary)', d_wk_down: 'Wiktionary est injoignable pour le moment. Réessaie plus tard.',
        d_ex: '💬 Exemples (Tatoeba)', d_none_title: 'Introuvable', d_none: 'Rien trouvé pour « {w} » ({lang}). L’orthographe est-elle bonne ? Tu peux aussi choisir la langue dans la commande.',
        not_yours: 'Ce quiz appartient à quelqu’un d’autre ! Lance le tien avec {quiz} ou {grammar} 😊', unknown: 'Je ne connais pas cette commande.', error: 'Un problème est survenu — réessaie 🙏',
        lang_set: 'D’accord ! Je te répondrai désormais en **{lang}**.', lang_auto: 'D’accord ! Je suivrai la langue de ton Discord (actuellement **{lang}**).',
        lang_note: 'Les sens des mots n’existent qu’en chinois et en anglais, donc tu les verras en anglais ; la grammaire est dans ta langue.',
        expired: 'Ce bouton a expiré — recommence avec {quiz} ou {grammar} 😊', g_no_lang: 'La grammaire de cette langue arrive bientôt.', g_why: '💡 Pourquoi', g_q_n: '📝 Question {i} / {n} : choisis ce qui complète le blanc', gs_title: '📚 {level} · point {i} / {n}', g_resumed: 'On reprend où tu t’es arrêté', g_next_q: 'Question suivante ➡️', g_point_score: '{s} / {n} bonnes réponses sur ce point', g_point_ok: 'Acquis ! 🎉', g_point_again: 'Un tour de plus et ce sera acquis', g_level_done: '🎊 Tu as fait tout le niveau ! La prochaine fois, on repart du premier point.', g_retry: 'Recommencer 🔁', g_saved: 'Progression enregistrée — /grammar study reprendra ici', gq_title: '📝 {level} · quiz de grammaire {i} / {n}', gq_results: '🎯 {level} · résultats du quiz', gq_missed: '❌ Questions manquées', gq_all_right: 'Tout est juste ! 🎆', p_prev: '⬅️ Précédent', p_next: 'Suivant ➡️', p_page: 'Page {p} / {m}', r_words: '📋 {r} juste(s) · {w} faux'
    },
    es: {
        q_title: '{set} · pregunta {i} / {n}', q_reading: 'Elige la lectura correcta', q_meaning: 'Elige el significado correcto', q_score: '{n} puntos por ahora',
        q_end: 'Terminar', right: '✅ **¡Correcto!**', wrong: '❌ Casi — la respuesta es **{a}**', meaning: 'Significado: {m}', simplified: 'Simplificado: {w}',
        q_tally: '{s} / {n} correctas', q_next: 'Siguiente ➡️', q_results: 'Ver resultados 🎉', r_title: '🎯 {set} · resultados', r_accuracy: 'Aciertos **{p} %**',
        r_none: '¡Vuelve a intentarlo otro día!', r_100: '¡Todas bien, increíble! 🎆', r_80: '¡Muy bien, sigue así!', r_60: '¡Nada mal, unas rondas más!', r_low: '¡Ánimo, practicando se mejora!',
        r_footer: 'Aprende nivel a nivel y repasa tus errores en la web', practice_site: 'Practicar en Hanabiの小天地',
        not_live: '«{set}» aún no está disponible — prueba con otra.', load_failed: 'No se pudo cargar esta lista ahora. Inténtalo más tarde.',
        g_title: '📚 Gramática {level}', g_form: 'Estructura: {f}', g_quiz: '📝 Prueba rápida: ¿qué va en el hueco?', g_mistake: '⚠️ Error frecuente', g_example: '💬 Ejemplo',
        g_footer: 'La explicación completa, notas y ejemplos con audio están en la página Gramática de la web', g_next: 'Siguiente punto ➡️', g_site: 'Explicación completa en la web', g_end: 'Terminar',
        g_ended: 'Fin de la práctica de gramática — ¡hasta pronto! 👋', g_levels: '{name} ({n} puntos)', g_no_level: 'No se encontró ese nivel de gramática — prueba con otro.', g_load_failed: 'No se pudo cargar este nivel ahora. Inténtalo más tarde.',
        d_enter: 'Escribe una palabra.', d_site: '📘 Listas de la web', d_wk: '📖 Definiciones en inglés (Wiktionary)', d_wk_down: 'Ahora no se puede conectar con Wiktionary. Inténtalo más tarde.',
        d_ex: '💬 Ejemplos (Tatoeba)', d_none_title: 'Sin resultados', d_none: 'No se encontró «{w}» ({lang}). ¿Está bien escrito? También puedes elegir el idioma en el comando.',
        not_yours: '¡Esta es de otra persona! Empieza la tuya con {quiz} o {grammar} 😊', unknown: 'No conozco ese comando.', error: 'Algo salió mal — inténtalo de nuevo 🙏',
        lang_set: '¡Vale! A partir de ahora te responderé en **{lang}**.', lang_auto: '¡Vale! Seguiré el idioma de tu Discord (ahora **{lang}**).',
        lang_note: 'Los significados de las palabras solo están en chino e inglés, así que los verás en inglés; la gramática está en tu idioma.',
        expired: 'Este botón ha caducado: vuelve a empezar con {quiz} o {grammar} 😊', g_no_lang: 'La gramática de este idioma llegará pronto.', g_why: '💡 Por qué', g_q_n: '📝 Pregunta {i} / {n}: elige lo que completa el hueco', gs_title: '📚 {level} · punto {i} / {n}', g_resumed: 'Seguimos donde lo dejaste', g_next_q: 'Siguiente pregunta ➡️', g_point_score: '{s} / {n} bien en este punto', g_point_ok: '¡Aprendido! 🎉', g_point_again: 'Una vuelta más y se te quedará', g_level_done: '🎊 ¡Has visto todo el nivel! La próxima vez empieza de nuevo desde el primer punto.', g_retry: 'Practicar otra vez 🔁', g_saved: 'Progreso guardado: /grammar study seguirá desde aquí', gq_title: '📝 {level} · prueba de gramática {i} / {n}', gq_results: '🎯 {level} · resultados de la prueba', gq_missed: '❌ Preguntas falladas', gq_all_right: '¡Todo correcto! 🎆', p_prev: '⬅️ Anterior', p_next: 'Siguiente ➡️', p_page: 'Página {p} / {m}', r_words: '📋 {r} bien · {w} mal'
    },
    de: {
        q_title: '{set} · Frage {i} / {n}', q_reading: 'Wähle die richtige Lesung', q_meaning: 'Wähle die richtige Bedeutung', q_score: 'Bisher {n} Punkte',
        q_end: 'Quiz beenden', right: '✅ **Richtig!**', wrong: '❌ Leider falsch — richtig ist **{a}**', meaning: 'Bedeutung: {m}', simplified: 'Vereinfacht: {w}',
        q_tally: '{s} / {n} richtig', q_next: 'Weiter ➡️', q_results: 'Ergebnis ansehen 🎉', r_title: '🎯 {set} · Ergebnis', r_accuracy: 'Trefferquote **{p} %**',
        r_none: 'Versuch es bald wieder!', r_100: 'Alles richtig – großartig! 🎆', r_80: 'Sehr gut, weiter so!', r_60: 'Nicht schlecht – noch ein paar Runden!', r_low: 'Nicht aufgeben – Übung macht den Meister!',
        r_footer: 'Stufe für Stufe lernen und Fehler wiederholen: auf der Website', practice_site: 'Auf Hanabiの小天地 üben',
        not_live: '„{set}“ ist noch nicht online – probier eine andere Liste.', load_failed: 'Diese Wortliste lässt sich gerade nicht laden. Bitte später erneut versuchen.',
        g_title: '📚 Grammatik {level}', g_form: 'Bildung: {f}', g_quiz: '📝 Kurztest: Was gehört in die Lücke?', g_mistake: '⚠️ Häufiger Fehler', g_example: '💬 Beispiel',
        g_footer: 'Ausführliche Erklärung, Hinweise und vertonte Beispiele auf der Grammatik-Seite der Website', g_next: 'Nächster Punkt ➡️', g_site: 'Ausführlich auf der Website', g_end: 'Beenden',
        g_ended: 'Grammatikübung beendet – bis bald! 👋', g_levels: '{name} ({n} Punkte)', g_no_level: 'Diese Grammatikstufe gibt es nicht – probier eine andere.', g_load_failed: 'Diese Stufe lässt sich gerade nicht laden. Bitte später erneut versuchen.',
        d_enter: 'Bitte ein Wort eingeben.', d_site: '📘 Wortlisten der Website', d_wk: '📖 Englische Definitionen (Wiktionary)', d_wk_down: 'Wiktionary ist gerade nicht erreichbar. Bitte später erneut versuchen.',
        d_ex: '💬 Beispiele (Tatoeba)', d_none_title: 'Nicht gefunden', d_none: 'Zu „{w}“ ({lang}) nichts gefunden. Stimmt die Schreibweise? Du kannst die Sprache auch im Befehl wählen.',
        not_yours: 'Das gehört jemand anderem! Starte dein eigenes mit {quiz} oder {grammar} 😊', unknown: 'Diesen Befehl kenne ich nicht.', error: 'Da ist etwas schiefgelaufen – bitte noch einmal versuchen 🙏',
        lang_set: 'Alles klar! Ich antworte dir ab jetzt auf **{lang}**.', lang_auto: 'Alles klar! Ich richte mich nach deiner Discord-Sprache (gerade **{lang}**).',
        lang_note: 'Wortbedeutungen gibt es nur auf Chinesisch und Englisch, daher siehst du dort Englisch; die Grammatik ist in deiner Sprache.',
        expired: 'Dieser Button ist abgelaufen – starte neu mit {quiz} oder {grammar} 😊', g_no_lang: 'Grammatik für diese Sprache kommt bald.', g_why: '💡 Warum', g_q_n: '📝 Frage {i} / {n}: Was gehört in die Lücke?', gs_title: '📚 {level} · Punkt {i} / {n}', g_resumed: 'Es geht dort weiter, wo du aufgehört hast', g_next_q: 'Nächste Frage ➡️', g_point_score: '{s} / {n} richtig bei diesem Punkt', g_point_ok: 'Gelernt! 🎉', g_point_again: 'Noch eine Runde, dann sitzt es', g_level_done: '🎊 Du hast die ganze Stufe durch! Beim nächsten Mal geht es wieder beim ersten Punkt los.', g_retry: 'Nochmal üben 🔁', g_saved: 'Fortschritt gespeichert – /grammar study macht hier weiter', gq_title: '📝 {level} · Grammatiktest {i} / {n}', gq_results: '🎯 {level} · Testergebnis', gq_missed: '❌ Falsch beantwortet', gq_all_right: 'Alles richtig! 🎆', p_prev: '⬅️ Zurück', p_next: 'Weiter ➡️', p_page: 'Seite {p} / {m}', r_words: '📋 {r} richtig · {w} falsch'
    }
};

/* t('zh', 'q_title', {set, i, n}); every {name} is replaced */
export function t(lang, key, params = {}) {
    const text = (S[lang] && S[lang][key]) || S.en[key] || S.zh[key] || key;
    return text.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
}

/* a site string (set / topic / language names) in the bot language */
export function siteT(lang, key) {
    return (SITE_STRINGS[lang] && SITE_STRINGS[lang][key]) || SITE_STRINGS.en[key] || key;
}
