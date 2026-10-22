/* ===================== 小花火 AI assistant =====================
   A floating 小花火 (js/mascot.js) opens a chat panel. Messages go to the hanabi-assistant Cloudflare Worker
   (worker/assistant/), which holds the Gemini key and 小花火's persona — the
   static site itself can't keep a secret. The conversation lives only in
   sessionStorage and only its last turns are sent. */

const ASSISTANT_API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? 'http://localhost:8787/chat'
    : 'https://hanabi-assistant.osu-collection-hanabi.workers.dev/chat';
const ASSISTANT_SUGGESTIONS = ['ai_s1', 'ai_s2', 'ai_s3', 'ai_s4'];

let assistantLog = [];        // [{ role: 'user' | 'model', text, err? }] — err: our own error notice, never sent
let assistantBusy = false;
let assistantStreaming = false;   // the reply is arriving: show it instead of the typing dots

function assistantLoad() {
    try {
        const v = JSON.parse(sessionStorage.getItem('assistant_chat'));
        if (Array.isArray(v)) assistantLog = v.filter(m => m && typeof m.text === 'string').slice(-40);
    } catch {}
}

function assistantSave() {
    try { sessionStorage.setItem('assistant_chat', JSON.stringify(assistantLog.slice(-40))); } catch {}
}

/* Replies use a little markdown: **bold**, `code` and "- " bullets (indented
   ones are sub-points, e.g. the examples under a rule). */
function assistantFormat(text) {
    return escHtml(text)
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^[ \t]{2,}[-*•][ \t]+/gm, '<span class="assistant-sub">◦</span> ')
        .replace(/^[ \t]*[-*•][ \t]+/gm, '• ')
        .replace(/\n/g, '<br>');
}

function renderAssistant() {
    const log = document.getElementById('assistant-log');
    if (!log) return;
    const hello = `<div class="assistant-msg model">${assistantFormat(t('ai_hello'))}</div>`;
    log.innerHTML = hello + assistantLog.map(m =>
        `<div class="assistant-msg ${m.role}">${m.role === 'model' ? assistantFormat(m.text) : escHtml(m.text).replace(/\n/g, '<br>')}</div>`
    ).join('') + (assistantBusy && !assistantStreaming ? '<div class="assistant-msg model typing" aria-label="…"><i></i><i></i><i></i></div>' : '');
    const chips = document.getElementById('assistant-chips');
    chips.innerHTML = assistantLog.length ? '' : ASSISTANT_SUGGESTIONS.map(k =>
        `<button type="button" class="assistant-chip" onclick="assistantAsk(this.textContent)">${escHtml(t(k))}</button>`).join('');
    log.scrollTop = log.scrollHeight;
    document.getElementById('assistant-send').disabled = assistantBusy;
}

function toggleAssistant(open) {
    const panel = document.getElementById('assistant-panel');
    if (!panel) return;
    // the click that ends a drag of the button doesn't open the chat
    if (typeof open !== 'boolean' && fabSwallowClick) { fabSwallowClick = false; return; }
    const show = typeof open === 'boolean' ? open : !panel.classList.contains('show');
    if (show) fabPlacePanel();
    panel.classList.toggle('show', show);
    document.getElementById('assistant-fab').setAttribute('aria-expanded', String(show));
    if (show) {
        try { localStorage.setItem('assistant_seen', '1'); } catch {}
        document.getElementById('assistant-hint').hidden = true;
        renderAssistant();
        setTimeout(() => document.getElementById('assistant-input').focus(), 50);
    }
}

function assistantClear() {
    assistantLog = [];
    assistantSave();
    renderAssistant();
}

function assistantSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('assistant-input');
    const text = input.value.trim();
    if (!text || assistantBusy) return false;
    input.value = '';
    assistantAsk(text);
    return false;
}

/* The reply streams in (the Worker answers text/plain while Gemini writes it), so the
   first words show after about a second; an older Worker's JSON reply still works.
   While words arrive the "typing" dots give way to the growing message and
   小花火's mouth keeps moving. */
async function assistantAsk(text) {
    if (assistantBusy || !text) return;
    const question = { role: 'user', text: text.slice(0, 600) };
    assistantLog.push(question);
    assistantBusy = true;
    renderAssistant();
    const face = () => document.querySelector('.assistant-head-face');
    let reply = '', err = true, errKey = 'ai_error';
    try {
        const res = await fetch(ASSISTANT_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: assistantLog.filter(m => !m.err).slice(-12), lang: siteLang, page: document.body.dataset.page || 'home', stream: true })
        });
        const type = res.headers.get('Content-Type') || '';
        if (res.ok && type.startsWith('text/plain') && res.body) {
            const msg = { role: 'model', text: '' };
            assistantLog.push(msg);
            assistantStreaming = true;
            let frame = 0;
            const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                msg.text += value;
                if (typeof mascotTalk === 'function') mascotTalk(face(), 700);
                if (!frame) frame = requestAnimationFrame(() => { frame = 0; renderAssistant(); });
            }
            assistantLog.pop();   // re-added below, whole
            reply = msg.text.trim();
            err = !reply;
        } else {
            const data = await res.json().catch(() => ({}));
            err = !(res.ok && data.reply);
            if (err && data.error === 'busy') errKey = 'ai_busy';
            reply = err ? '' : data.reply;
            if (!err && typeof mascotTalk === 'function') mascotTalk(face(), 600 + reply.length * 40);
        }
    } catch {
        // a dropped connection mid-answer keeps what already arrived
        const partial = assistantStreaming && assistantLog[assistantLog.length - 1] !== question
            ? assistantLog.pop().text.trim() : '';
        if (partial) { reply = partial + ' …'; err = false; }
    }
    assistantBusy = false;
    assistantStreaming = false;
    // a failed question isn't sent again either, so turns keep alternating
    if (err) question.err = true;
    assistantLog.push(err ? { role: 'model', text: t(errKey), err: true } : { role: 'model', text: reply });
    assistantSave();
    renderAssistant();
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') toggleAssistant(false);
});

/* Phones: the button sits over the content in the bottom-left corner, so it slides
   away while the page is scrolled down and comes back on scrolling up or ~1 s after
   the scrolling stops — always there again to tap. Not while the chat is open. */
const FAB_BACK_MS = 1000;
let fabLastY = 0;
let fabTimer = 0;
const fabPhone = window.matchMedia('(max-width: 768px)');

function assistantFabTuck(tuck) {
    const fab = document.getElementById('assistant-fab');
    const hint = document.getElementById('assistant-hint');
    if (fab) fab.classList.toggle('fab-tucked', tuck);
    if (hint) hint.classList.toggle('fab-tucked', tuck);
}

window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const down = y > fabLastY + 4;
    const up = y < fabLastY - 4;
    if (down || up) fabLastY = y;
    const panel = document.getElementById('assistant-panel');
    if (!fabPhone.matches || (panel && panel.classList.contains('show'))) return;
    if (down && y > 60) assistantFabTuck(true);
    else if (up) assistantFabTuck(false);
    clearTimeout(fabTimer);
    fabTimer = setTimeout(() => assistantFabTuck(false), FAB_BACK_MS);
}, { passive: true });

/* Computers: 小花火 can be dragged anywhere (owner's request 2026-10-22). The place is
   kept per device in assistant_fab_pos ({ x, y }: her top-left corner as a share of
   the window, so it survives a resize), a press without moving still opens the chat,
   and the chat opens beside wherever she is. Phones keep their fixed corner. */
const fabDesktop = window.matchMedia('(min-width: 769px) and (pointer: fine)');
const FAB_DRAG_PX = 6;          // a press that moves less than this is a click
let fabDrag = null;
let fabSwallowClick = false;

function fabPos() {
    try {
        const p = JSON.parse(localStorage.getItem('assistant_fab_pos'));
        return p && typeof p.x === 'number' && typeof p.y === 'number' ? p : null;
    } catch { return null; }
}

const fabClamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function fabMoveTo(fab, left, top) {
    fab.style.left = fabClamp(left, 8, innerWidth - fab.offsetWidth - 8) + 'px';
    fab.style.top = fabClamp(top, 8, innerHeight - fab.offsetHeight - 8) + 'px';
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
}

function fabSavePos(fab) {
    try { localStorage.setItem('assistant_fab_pos', JSON.stringify({ x: fab.offsetLeft / innerWidth, y: fab.offsetTop / innerHeight })); } catch {}
}

/* where she stands: the saved place on computers, the CSS corner otherwise */
function fabApply() {
    const fab = document.getElementById('assistant-fab');
    if (!fab) return;
    const p = fabDesktop.matches ? fabPos() : null;
    if (!p) {
        fab.style.left = fab.style.top = fab.style.right = fab.style.bottom = '';
    } else {
        fabMoveTo(fab, p.x * innerWidth, p.y * innerHeight);
        const hint = document.getElementById('assistant-hint');
        if (hint) hint.hidden = true;            // it points at the corner
    }
    fabPlacePanel();
}

/* the chat beside her: on her left when she is on the right half, else on her right */
function fabPlacePanel() {
    const panel = document.getElementById('assistant-panel');
    const fab = document.getElementById('assistant-fab');
    if (!panel || !fab) return;
    if (!fabDesktop.matches || !fabPos()) {
        panel.style.left = panel.style.top = panel.style.right = panel.style.bottom = panel.style.transformOrigin = '';
        return;
    }
    const r = fab.getBoundingClientRect();
    const pw = panel.offsetWidth, ph = panel.offsetHeight;
    const onRight = r.left + r.width / 2 > innerWidth / 2;
    panel.style.left = fabClamp(onRight ? r.left - pw - 14 : r.right + 14, 8, innerWidth - pw - 8) + 'px';
    panel.style.top = fabClamp(r.bottom - ph, 8, innerHeight - ph - 8) + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.transformOrigin = (onRight ? 'right' : 'left') + ' bottom';
}

function fabDragStart(e) {
    if (!fabDesktop.matches || e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    fabDrag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
    // held from the press on, so a quick drag that leaves the button is still hers
    // (a press without moving still ends in a click on the button)
    e.currentTarget.setPointerCapture(e.pointerId);
}

function fabDragMove(e) {
    if (!fabDrag || e.pointerId !== fabDrag.id) return;
    const fab = e.currentTarget;
    const dx = e.clientX - fabDrag.sx, dy = e.clientY - fabDrag.sy;
    if (!fabDrag.moved) {
        if (Math.hypot(dx, dy) < FAB_DRAG_PX) return;
        fabDrag.moved = true;
        fab.classList.add('dragging');
    }
    fabMoveTo(fab, fabDrag.ox + dx, fabDrag.oy + dy);
    const panel = document.getElementById('assistant-panel');
    if (panel && panel.classList.contains('show')) { fabSavePos(fab); fabPlacePanel(); }
}

function fabDragEnd(e) {
    if (!fabDrag || e.pointerId !== fabDrag.id) return;
    const fab = e.currentTarget;
    if (fabDrag.moved) {
        fab.classList.remove('dragging');
        fabSavePos(fab);
        fabSwallowClick = true;                  // the click that follows the drag
        setTimeout(() => { fabSwallowClick = false; }, 0);
        fabApply();
    }
    fabDrag = null;
}

window.addEventListener('resize', fabApply);
fabDesktop.addEventListener('change', fabApply);

document.addEventListener('DOMContentLoaded', () => {
    assistantLoad();
    const fab = document.getElementById('assistant-fab');
    if (fab && typeof mascotHtml === 'function') {
        fab.querySelector('.assistant-fab-face').innerHTML = mascotHtml('bust');
        document.querySelector('.assistant-head-face').innerHTML = mascotHtml('bust');
    }
    let seen = false;
    try { seen = !!localStorage.getItem('assistant_seen'); } catch {}
    const hint = document.getElementById('assistant-hint');
    if (hint) hint.hidden = seen;
    if (fab) {
        fab.addEventListener('pointerdown', fabDragStart);
        fab.addEventListener('pointermove', fabDragMove);
        fab.addEventListener('pointerup', fabDragEnd);
        fab.addEventListener('pointercancel', fabDragEnd);
        fabApply();
    }
    // Enter sends, Shift+Enter makes a new line
    const input = document.getElementById('assistant-input');
    if (input) input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            document.getElementById('assistant-form').requestSubmit();
        }
    });
});
