/* ===================== 閱讀: exam-style rounds (TOPIK, 2026-10-18) =====================
   A reading level may hold "sets" besides its passages (tools/build_reading.py): practice
   rounds and mock exams in the exam's own format — many short texts, each with 1–3
   four-option questions under the exam's instruction (READING_ASK_KO, in Korean, with
   reading_ask_<key> as the translation). Text types: text (plain; __x__ underlines,
   （　） a blank, ㉠–㉣ insertion points), notice (a card: title, rows, lines, foot),
   chart (bars), order ((가)–(라) sentences), insert (a text and the 〈보기〉 sentence),
   headline (a newspaper headline). Practice shows the answer and its explanation once
   picked; a mock exam is timed (set.minutes, from the moment it starts, submitted when
   time runs out), answers can change until it is handed in, then a sheet of answers
   opens each question in review. READING_PASS of a set right marks it done in
   reading_progress ("<level>:set:<set>", synced). Answers count toward daily_activity.
   A practice round left halfway is kept in study_resume (resumeSave, js/quiz.js) and
   picked up next time; a mock exam is not (2026-10-22). Computers show the text on
   the left and its questions on the right. */

const READING_ASK_KO = {
    topic: '무엇에 대한 내용입니까? 알맞은 것을 고르십시오.',
    blank: '（　　）에 들어갈 가장 알맞은 것을 고르십시오.',
    wrong: '다음을 읽고 맞지 않는 것을 고르십시오.',
    match: '다음을 읽고 내용과 같은 것을 고르십시오.',
    main: '다음을 읽고 중심 생각을 고르십시오.',
    order: '다음을 순서대로 맞게 나열한 것을 고르십시오.',
    insert: '다음 글에서 〈보기〉의 문장이 들어가기에 가장 알맞은 곳을 고르십시오.',
    purpose: '이 글을 쓴 목적을 고르십시오.',
    about: '다음은 무엇에 대한 글인지 고르십시오.',
    similar: '밑줄 친 부분과 의미가 가장 비슷한 것을 고르십시오.',
    headline: '다음 신문 기사의 제목을 가장 잘 설명한 것을 고르십시오.',
    feeling: '밑줄 친 부분에 나타난 인물의 심정으로 가장 알맞은 것을 고르십시오.',
    attitude: '필자의 태도로 가장 알맞은 것을 고르십시오.',
    subject: '이 글의 주제로 가장 알맞은 것을 고르십시오.',
    inference: '이 글의 내용으로 알 수 있는 것을 고르십시오.'
};
// JLPT (2026-10-24): the instructions as the paper words them (N5 in hiragana, with spaces)
const READING_ASK_JA = {
    ja_short: 'つぎの　ぶんしょうを　よんで、しつもんに　こたえて　ください。こたえは、1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。',
    ja_mid: 'つぎの　ぶんしょうを　よんで、しつもんに　こたえて　ください。こたえは、1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。',
    ja_info: 'つぎの　ページを　見て、しつもんに　こたえて　ください。こたえは、1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。'
};
const READING_ASK_ALL = { ko: READING_ASK_KO, ja: READING_ASK_JA };
const READING_ASK_MULTI = { ko: '다음을 읽고 물음에 답하십시오.', ja: 'つぎの　ぶんしょうを　よんで、しつもんに　こたえて　ください。' };
const READING_OPT_MARKS = ['①', '②', '③', '④'];
const READING_OPT_NUMS = ['1', '2', '3', '4'];     // the JLPT numbers its options

function readingExLang() {
    const set = readingSets[readingSetId];
    return (set && set.lang) || 'ko';
}
function readingAskText(key) {
    const lang = readingExLang();
    return (READING_ASK_ALL[lang] || READING_ASK_KO)[key] || '';
}

/* Japanese rounds: furigana on the kanji above the level only, unless the visitor asks for all
   (reading_exam_furi = 'all'; owner's pick A1) */
function readingExFuriAll() { return readingPref('reading_exam_furi', 'level') === 'all'; }
function readingExFuriToggle() {
    readingSetPref('reading_exam_furi', readingExFuriAll() ? 'level' : 'all');
    renderReading();
}

/* segments [text, furigana, glossary, known] (tools/build_reading.py ja_segs) as HTML */
function readingExSegs(segs) {
    const all = readingExFuriAll();
    return (segs || []).map(([text, ruby, _g, known]) => ruby && (all || !known)
        ? `<ruby>${escHtml(text)}<rt>${escHtml(ruby)}</rt></ruby>` : escHtml(text)).join('');
}

/* a field shown with its marks (__underline__, （　） blanks, ㉠–㉣): Japanese from its segments */
function readingExMark(html) {
    return html
        .replace(/__(.+?)__/g, '<u>$1</u>')
        .replace(/（\s*）|（　+）/g, m => `<span class="rdx-blank">${m}</span>`)
        .replace(/([㉠㉡㉢㉣])/g, '<b class="rdx-mark">$1</b>')
        .replace(/\n/g, '<br>');
}
function readingExField(plain, segs) {
    return segs ? readingExMark(readingExSegs(segs)) : readingExText(plain);
}

let readingExam = null;   // { si, key, qs: [{ item, q, n }], qi (item on screen), picks [], start, base, mock, done, reviewing, resumed, tick }

function readingSetKey(set, st) { return set.id + ':set:' + st.id; }

function readingSetName(set, st) {
    const same = set.sets.filter(x => !!x.mock === !!st.mock);
    return st.mock ? t('listening_mock_n', { n: same.indexOf(st) + 1 }) : t('listening_set', { n: same.indexOf(st) + 1 });
}

/* the level's rounds above its passages (readingListHtml) */
function readingSetsHtml(set) {
    if (!set.sets || !set.sets.length) return '';
    const prog = readingProgress();
    const card = (st, i) => {
        const best = prog[readingSetKey(set, st)];
        const ok = best && best.best / best.of >= READING_PASS;
        const half = !st.mock && resumeGet('reading|' + readingSetKey(set, st));
        const halfN = half && Array.isArray(half.picks) ? half.picks.filter(p => p !== -1).length : 0;
        const meta = st.mock ? t('reading_exam_meta', { n: st.count, m: st.minutes }) : t('reading_set_meta', { n: st.count });
        return `<li><button type="button" class="grammar-item${ok ? ' learned' : ''}${st.mock ? ' ls-mock-item' : ''}" onclick="readingExamStart(${i})">
            <span class="grammar-num">${st.mock ? '📝' : set.sets.filter(x => !x.mock).indexOf(st) + 1}</span>
            <span class="grammar-item-text">
                <span class="grammar-pattern">${escHtml(readingSetName(set, st))}</span>
                <span class="rd-meta">${escHtml(meta)}</span>
            </span>
            <span class="grammar-state">${halfN ? `<span class="rd-half">${escHtml(t('reading_half', { n: halfN, m: st.count }))}</span>` : best ? (ok ? '✓ ' : '') + best.best + '/' + best.of : '›'}</span>
        </button></li>`;
    };
    const mocks = set.sets.filter(st => st.mock);
    const practice = set.sets.filter(st => !st.mock);
    return `${mocks.length ? `<div class="ls-mock">
            <div class="ls-mock-head">📝 <b>${escHtml(t('listening_mock'))}</b></div>
            <p class="ls-mock-hint">${escHtml(t('reading_mock_hint', { n: mocks[0].count, m: mocks[0].minutes }))}</p>
            <ol class="grammar-list learn-list-grid">${mocks.map(st => card(st, set.sets.indexOf(st))).join('')}</ol>
        </div>` : ''}
        ${practice.length ? `<h4 class="grammar-sub rdx-head">${escHtml(t('reading_sets_head'))}</h4>
        <ol class="grammar-list learn-list-grid">${practice.map(st => card(st, set.sets.indexOf(st))).join('')}</ol>` : ''}
        ${set.passages.length ? `<h4 class="grammar-sub rdx-head">${escHtml(t('reading_short_head'))}</h4>` : ''}`;
}

let readingMockNote = -1;   // the mock set whose notice is on screen (readingView 'mocknote')

/* fresh: a practice round from the start; go: past the mock exam's notice */
function readingExamStart(si, fresh, go) {
    const set = readingSets[readingSetId];
    const st = set && set.sets[si];
    if (!st) return;
    if (st.mock && !go) {
        readingMockNote = si;
        readingGo('mocknote');
        return;
    }
    const qs = [];
    st.items.forEach((item, ii) => item.questions.forEach((q, k) => qs.push({ item, ii, k, q, n: st.start + qs.length })));
    readingExamStopClock();
    const key = 'reading|' + readingSetKey(set, st);
    if (fresh) resumeClear(key);
    const r = st.mock || fresh ? null : resumeGet(key);
    const ok = !!r && Array.isArray(r.picks) && r.picks.length === qs.length;
    readingExam = { si, key, qs, qi: ok ? Math.min(r.qi || 0, qs.length - 1) : 0, picks: ok ? r.picks.slice() : qs.map(() => -1),
                    start: Date.now(), base: ok ? r.secs || 0 : 0, mock: st.mock, done: false, reviewing: false,
                    resumed: ok && r.picks.some(p => p !== -1) };
    readingView = 'exam';
    if (st.mock) readingExam.tick = setInterval(readingExamClock, 1000);
    renderReading();
    window.scrollTo({ top: 0 });
}

function readingMockNoteHtml(set) {
    const st = set.sets[readingMockNote];
    return mockNoteHtml(readingSetName(set, st), [t('mock_note_reading', { n: st.count, m: st.minutes })],
        `readingExamStart(${readingMockNote}, false, true)`, "readingGo('list')");
}

function readingExamStopClock() {
    if (readingExam && readingExam.tick) clearInterval(readingExam.tick);
    if (readingExam) readingExam.tick = null;
}

/* a practice round's answers and place so far (never a mock exam's) */
function readingExamSave() {
    const z = readingExam;
    if (!z || z.mock || z.done || z.reviewing || !z.picks.some(p => p !== -1)) return;
    resumeSave(z.key, { picks: z.picks, qi: z.qi, secs: z.base + Math.round((Date.now() - z.start) / 1000) });
}

/* seconds left in a mock exam */
function readingExamLeft() {
    const st = readingSets[readingSetId].sets[readingExam.si];
    return Math.max(0, Math.round(st.minutes * 60 - (Date.now() - readingExam.start) / 1000));
}

function readingExamClock() {
    const z = readingExam;
    if (!z || z.done || readingView !== 'exam') { readingExamStopClock(); return; }
    const left = readingExamLeft();
    const el = document.getElementById('rdx-clock');
    if (el) {
        el.textContent = t('reading_time_left', { t: readingClock(left) });
        el.classList.toggle('low', left <= 300);
    }
    if (left <= 0) readingExamFinish(true);
}

/* the questions of the item on screen (the item of question qi) */
function readingExamItemQs() {
    const z = readingExam;
    const ii = z.qs[z.qi].ii;
    return z.qs.map((x, i) => ({ x, i })).filter(o => o.x.ii === ii);
}

/* a text with its marks: __underline__, （　） blanks, ㉠–㉣ */
function readingExText(s) {
    return readingExMark(escHtml(s));
}

function readingExBodyHtml(item) {
    const lang = readingExLang();
    if (item.type === 'notice') {
        const n = item.notice;
        const nt = item.notice_t;       // Japanese: the same fields as segments
        const f = (plain, segs) => nt ? readingExSegs(segs) : escHtml(plain);
        return `<div class="rdx-notice" lang="${lang}">
            ${n.title ? `<div class="rdx-notice-title">${f(n.title, nt && nt.title)}</div>` : ''}
            ${(n.rows || []).length ? `<dl>${n.rows.map((r, i) => `<dt>${f(r[0], nt && nt.rows[i][0])}</dt><dd>${f(r[1], nt && nt.rows[i][1])}</dd>`).join('')}</dl>` : ''}
            ${(n.lines || []).map((l, i) => `<p>${f(l, nt && nt.lines[i])}</p>`).join('')}
            ${n.foot ? `<div class="rdx-notice-foot">${f(n.foot, nt && nt.foot)}</div>` : ''}
        </div>`;
    }
    if (item.type === 'chart') {
        const c = item.chart;
        const max = Math.max(...c.bars.map(b => b[1]), 1);
        return `<figure class="rdx-chart" lang="${lang}">
            ${c.title ? `<figcaption>${escHtml(c.title)}</figcaption>` : ''}
            ${c.bars.map(b => `<div class="rdx-bar"><span class="rdx-bar-label">${escHtml(b[0])}</span>
                <span class="rdx-bar-track"><i style="width:${Math.round(b[1] / max * 100)}%"></i></span>
                <span class="rdx-bar-val">${b[1]}${escHtml(c.unit || '')}</span></div>`).join('')}
        </figure>`;
    }
    if (item.type === 'order') {
        return `<ul class="rdx-parts" lang="${lang}">${item.parts.map(p => `<li>${readingExText(p)}</li>`).join('')}</ul>`;
    }
    if (item.type === 'headline') {
        return `<div class="rdx-headline" lang="${lang}">${readingExText(item.text)}</div>`;
    }
    const box = item.type === 'insert' && item.box ? `<div class="rdx-box" lang="${lang}"><b>〈보기〉</b> ${readingExText(item.box)}</div>` : '';
    const body = item.text_t ? item.text_t.map(line => readingExMark(readingExSegs(line))).join('<br>') : readingExText(item.text || '');
    return `${box}<div class="rdx-text" lang="${lang}">${item.title ? `<b>${escHtml(item.title)}</b><br>` : ''}${body}</div>`;
}

function readingExamHtml(set) {
    const z = readingExam;
    const st = set.sets[z.si];
    const own = readingExamItemQs();
    const item = own[0].x.item;
    const asks = [...new Set(own.map(o => o.x.q.ask))];
    const answered = own.every(o => z.picks[o.i] !== -1);
    const lang = readingExLang();
    const marks = lang === 'ja' ? READING_OPT_NUMS : READING_OPT_MARKS;
    // computers (2026-10-24): an item's questions one at a time beside its text, so the screen
    // needs no scrolling; phones keep them all under the text (.rdx-q-off is only hidden ≥1024px)
    const sub = Math.max(0, own.findIndex(o => o.i === z.qi));
    const qHtml = own.map((o, j) => {
        const q = o.x.q;
        const pick = z.picks[o.i];
        const reveal = z.reviewing || (!z.mock && pick !== -1);   // review shows unanswered ones too
        const opts = q.options.map((op, k) => {
            const cls = reveal ? (k === q.answer ? ' correct-choice' : k === pick ? ' wrong-choice' : '') : (k === pick ? ' rdx-picked' : '');
            return `<button type="button" class="option-btn rdx-opt${cls}" lang="${lang}" onclick="readingExamPick(${o.i}, ${k})"${reveal ? ' disabled' : ''}>
                <span class="rdx-opt-n">${marks[k]}</span><span class="rdx-opt-t">${readingExField(op, q.options_t && q.options_t[k])}</span></button>`;
        }).join('');
        const short = q.options.every(op => op.length <= (READING_CHAR_LANGS.includes(lang) ? 12 : 22));
        const subNext = own.length > 1 && j < own.length - 1 && (reveal || pick !== -1)
            ? `<p class="rdx-sub-next"><button type="button" class="btn back-btn" onclick="readingExamSub(${own[j + 1].i})">${escHtml(t('rdx_next_sub', { n: own[j + 1].x.n }))}</button></p>` : '';
        return `<div class="rdx-q${j === sub ? '' : ' rdx-q-off'}">
            ${own.length > 1 || q.q ? `<div class="rdx-qhead"><span class="rdx-no">${o.x.n}.</span>${own.length > 1 && asks.length > 1 ? `<span lang="${lang}">${escHtml(readingAskText(q.ask))}</span>` : ''}${q.q ? `<span lang="${lang}">${readingExField(q.q, q.q_t)}</span>` : ''}</div>` : ''}
            <div class="rdx-opts${short ? ' rdx-opts-2' : ''}">${opts}</div>
            ${reveal ? `<p class="grammar-feedback ${pick === q.answer ? 'ok' : 'no'}">${escHtml(pick === q.answer ? t('correct') : t('listening_wrong', { n: q.answer + 1 }))}</p>
                <div class="ls-why">${escHtml(readingTx(set, q))}</div>` : ''}
            ${subNext}
        </div>`;
    }).join('');
    const subTabs = own.length > 1 ? `<div class="rdx-subtabs" role="tablist">${own.map((o, j) => {
        const p = z.picks[o.i];
        const state = p === -1 ? '' : z.mock && !z.reviewing ? ' done' : p === o.x.q.answer ? ' ok' : ' no';
        return `<button type="button" role="tab" class="rdx-subtab${state}${j === sub ? ' now' : ''}" aria-selected="${j === sub}" onclick="readingExamSub(${o.i})">${o.x.n}</button>`;
    }).join('')}</div>` : '';
    // the furigana switch heads the questions' column (above the columns it pushed the text down)
    const tools = lang === 'ja' ? `<p class="rdx-tools"><button type="button" class="mode-btn${readingExFuriAll() ? ' mode-btn-active' : ''}" aria-pressed="${readingExFuriAll()}" onclick="readingExFuriToggle()">${escHtml(t('rdx_furi_all'))}</button>
            <span class="rd-meta">${escHtml(t(readingExFuriAll() ? 'rdx_furi_all_on' : 'rdx_furi_level', { lv: set.level }))}</span></p>` : '';
    const firstQ = own[0].i;
    const lastQ = own[own.length - 1].i;
    const atEnd = lastQ >= z.qs.length - 1;
    const dots = z.qs.map((x, i) => {
        const p = z.picks[i];
        const state = i >= firstQ && i <= lastQ ? 'now' : p === -1 ? '' : z.mock && !z.reviewing ? 'done' : p === x.q.answer ? 'ok' : 'no';
        return `<span class="ls-dot ${state}"></span>`;
    }).join('');
    const unanswered = z.picks.filter(p => p === -1).length;
    const next = z.reviewing
        ? (atEnd ? `<button type="button" class="btn next-btn" onclick="readingGo('examresult')">${escHtml(t('listening_back_result'))}</button>`
                 : `<button type="button" class="btn next-btn" onclick="readingExamMove(1)">${escHtml(t('grammar_next_q'))}</button>`)
        : z.mock
            ? (atEnd ? `<button type="button" class="btn next-btn" onclick="readingExamSubmit()">${escHtml(t('reading_submit'))}</button>`
                     : `<button type="button" class="btn next-btn" onclick="readingExamMove(1)">${escHtml(t('grammar_next_q'))}</button>`)
            : (atEnd ? `<button type="button" class="btn next-btn" onclick="readingExamFinish()"${answered ? '' : ' disabled'}>${escHtml(t('grammar_see_result'))}</button>`
                     : `<button type="button" class="btn next-btn" onclick="readingExamMove(1)"${answered ? '' : ' disabled'}>${escHtml(t('grammar_next_q'))}</button>`);
    return `<div class="grammar-top">
            <button type="button" class="btn back-btn grammar-back" onclick="${z.reviewing ? "readingGo('examresult')" : 'readingExamQuit()'}">${escHtml(t(z.reviewing ? 'listening_back_result' : 'listening_back_list'))}</button>
            <span class="ls-dots" aria-hidden="true">${dots}</span>
            ${z.mock && !z.reviewing ? `<span class="rdx-clock" id="rdx-clock">${escHtml(t('reading_time_left', { t: readingClock(readingExamLeft()) }))}</span>`
                : `<span class="grammar-count">${escHtml(t('grammar_q_n', { n: firstQ + 1, m: z.qs.length }))}</span>`}
        </div>
        ${z.mock ? `<div class="ls-mock-tag">📝 ${escHtml(readingSetName(set, st))}${z.reviewing ? '・' + escHtml(t('listening_mock_review')) : ''}</div>` : ''}
        <div class="rdx-ask">${item.mondai ? `<span class="rdx-mondai" lang="${lang}">もんだい${item.mondai}</span>` : ''}<span lang="${lang}">${own.length > 1 ? `<b>[${own[0].x.n}～${own[own.length - 1].x.n}]</b> ` : ''}${escHtml(asks.length === 1 ? readingAskText(asks[0]) : (READING_ASK_MULTI[lang] || READING_ASK_MULTI.ko))}</span>
            <span class="rdx-ask-tr">${escHtml(asks.length === 1 ? t('reading_ask_' + asks[0]) : t('reading_ask_multi'))}</span></div>
        ${z.resumed && !z.mock ? `<p class="rd-note">${escHtml(t('reading_resumed', { n: z.picks.filter(p => p !== -1).length, m: z.qs.length }))} <button type="button" class="rd-link" onclick="readingExamStart(${z.si}, true)">${escHtml(t('reading_restart'))}</button></p>` : ''}
        <div class="rdx-cols">
            <div class="rdx-col-text">
                <div class="rdx-item">
                    <div class="rdx-item-label"><span class="rdx-no">${own.length > 1 ? own[0].x.n + '～' + own[own.length - 1].x.n : own[0].x.n + '.'}</span>${escHtml(t('reading_passage_label'))}</div>
                    ${readingExBodyHtml(item)}
                </div>
                ${z.reviewing || (!z.mock && answered) ? `<details class="rdx-tr"><summary>${escHtml(t('reading_show_tr'))}</summary><p>${escHtml(readingTx(set, item.tr))}</p></details>` : ''}
            </div>
            <div class="rdx-col-q">${tools}${subTabs}${qHtml}</div>
        </div>
        <div class="grammar-nav">
            <button type="button" class="btn back-btn" onclick="readingExamMove(-1)"${firstQ === 0 ? ' disabled' : ''}>${escHtml(t('listening_prev_q'))}</button>
            ${next}
        </div>
        ${z.mock && !z.reviewing && !atEnd ? `<p class="rdx-submit-row"><button type="button" class="btn back-btn" onclick="readingExamSubmit()">${escHtml(t('reading_submit'))}</button>
            <span class="rd-meta">${escHtml(t('reading_answered', { n: z.qs.length - unanswered, m: z.qs.length }))}</span></p>` : ''}`;
}

function readingExamPick(i, k) {
    const z = readingExam;
    if (!z || z.done && !z.reviewing) return;
    if (z.reviewing) return;
    if (!z.mock && z.picks[i] !== -1) return;   // practice: the first pick counts
    z.picks[i] = k;
    if (!z.mock && typeof logDailyActivity === 'function') logDailyActivity(1);
    readingExamSave();
    renderReading();
}

/* computers: another question of the same item */
function readingExamSub(i) {
    readingExam.qi = i;
    readingExamSave();
    renderReading();
}

/* to the previous / next item (an item may hold several questions) */
function readingExamMove(d) {
    const z = readingExam;
    const own = readingExamItemQs();
    const target = d > 0 ? own[own.length - 1].i + 1 : own[0].i - 1;
    if (target < 0 || target >= z.qs.length) return;
    z.qi = target;
    readingExamSave();
    renderReading();
    window.scrollTo({ top: 0 });
}

function readingExamQuit() {
    readingExamSave();
    readingExamStopClock();
    readingExam = null;
    readingGo('list');
}

function readingExamSubmit() {
    const left = readingExam.picks.filter(p => p === -1).length;
    if (left && !confirm(t('reading_submit_confirm', { n: left }))) return;
    readingExamFinish();
}

function readingExamFinish(timeUp) {
    const z = readingExam;
    if (!z || z.done) return;
    readingExamStopClock();
    z.done = true;
    z.timeUp = !!timeUp;
    z.secs = z.base + Math.round((Date.now() - z.start) / 1000);
    if (!z.mock) resumeClear(z.key);
    const set = readingSets[readingSetId];
    const st = set.sets[z.si];
    const right = z.qs.filter((x, i) => z.picks[i] === x.q.answer).length;
    z.right = right;
    const prog = readingProgress();
    const key = readingSetKey(set, st);
    const prev = prog[key];
    if (!prev || right / z.qs.length > prev.best / prev.of) {
        prog[key] = { best: right, of: z.qs.length, at: Date.now(), secs: z.secs };
        if (typeof storeSet === 'function') storeSet('reading_progress', JSON.stringify(prog));
    }
    if (z.mock && typeof logDailyActivity === 'function') logDailyActivity(z.picks.filter(p => p !== -1).length);
    readingGo('examresult');
}

function readingExamResultHtml(set) {
    const z = readingExam;
    const st = set.sets[z.si];
    const total = z.qs.length;
    const pass = z.right / total >= READING_PASS;
    const sheet = `<div class="ls-sheet">${z.qs.map((x, i) => {
        const ok = z.picks[i] === x.q.answer;
        return `<button type="button" class="ls-sheet-cell ${ok ? 'ok' : 'no'}" onclick="readingExamReview(${i})" title="${escHtml(t('reading_ask_' + x.q.ask))}">${x.n}<i>${ok ? '○' : '×'}</i></button>`;
    }).join('')}</div>`;
    return `<div class="grammar-top">
            <button type="button" class="btn back-btn grammar-back" onclick="readingExamQuit()">${escHtml(t('listening_back_list'))}</button>
            <span class="grammar-count">${escHtml(readingSetName(set, st))}</span>
        </div>
        <div class="grammar-result">
            ${z.timeUp ? `<p class="rd-help">${escHtml(t('reading_time_up'))}</p>` : ''}
            <p class="grammar-score">${escHtml(t('grammar_result', { n: z.right, m: total }))}</p>
            <p class="grammar-result-msg">${escHtml(t(st.mock ? (pass ? 'listening_mock_pass' : 'listening_mock_fail') : (pass ? 'reading_set_pass' : 'reading_set_fail')))}</p>
            <p class="rd-meta">${escHtml(t('reading_time', { t: readingClock(z.secs) }))}</p>
            <p class="rd-help">${escHtml(t('reading_sheet_hint'))}</p>
            ${sheet}
            <div class="grammar-nav">
                <button type="button" class="btn back-btn" onclick="readingExamStart(${z.si}, true)">${escHtml(t('reading_set_again'))}</button>
                <button type="button" class="btn next-btn" onclick="readingExamQuit()">${escHtml(t('listening_back_list'))}</button>
            </div>
        </div>`;
}

/* a question from the answer sheet, with the answers shown */
function readingExamReview(i) {
    readingExam.reviewing = true;
    readingExam.qi = i;
    readingView = 'exam';
    renderReading();
    window.scrollTo({ top: 0 });
}
