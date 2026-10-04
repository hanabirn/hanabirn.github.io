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
    const show = typeof open === 'boolean' ? open : !panel.classList.contains('show');
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
    // Enter sends, Shift+Enter makes a new line
    const input = document.getElementById('assistant-input');
    if (input) input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            document.getElementById('assistant-form').requestSubmit();
        }
    });
});
