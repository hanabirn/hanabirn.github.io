/* ===================== 小花火 AI assistant =====================
   A floating 小花火 (a stand-in until the owner draws the character) opens a
   chat panel. Messages go to the hanabi-assistant Cloudflare Worker
   (worker/assistant/), which holds the Gemini key and 小花火's persona — the
   static site itself can't keep a secret. The conversation lives only in
   sessionStorage and only its last turns are sent. */

const ASSISTANT_API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? 'http://localhost:8787/chat'
    : 'https://hanabi-assistant.osu-collection-hanabi.workers.dev/chat';
const ASSISTANT_SUGGESTIONS = ['ai_s1', 'ai_s2', 'ai_s3', 'ai_s4'];

let assistantLog = [];        // [{ role: 'user' | 'model', text, err? }] — err: our own error notice, never sent
let assistantBusy = false;

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
    ).join('') + (assistantBusy ? '<div class="assistant-msg model typing" aria-label="…"><i></i><i></i><i></i></div>' : '');
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

async function assistantAsk(text) {
    if (assistantBusy || !text) return;
    assistantLog.push({ role: 'user', text: text.slice(0, 600) });
    assistantBusy = true;
    renderAssistant();
    let reply, err = true;
    try {
        const res = await fetch(ASSISTANT_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: assistantLog.filter(m => !m.err).slice(-12), lang: siteLang, page: document.body.dataset.page || 'home' })
        });
        const data = await res.json().catch(() => ({}));
        err = !(res.ok && data.reply);
        reply = err ? t(data.error === 'busy' ? 'ai_busy' : 'ai_error') : data.reply;
    } catch {
        reply = t('ai_error');
    }
    assistantBusy = false;
    // a failed question isn't sent again either, so turns keep alternating
    if (err) assistantLog[assistantLog.length - 1].err = true;
    assistantLog.push(err ? { role: 'model', text: reply, err: true } : { role: 'model', text: reply });
    assistantSave();
    renderAssistant();
    // 小花火 "says" the answer: the mouth moves for about as long as it takes to read the start
    if (!err && typeof mascotTalk === 'function') mascotTalk(document.querySelector('.assistant-head-face'), 600 + reply.length * 40);
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
