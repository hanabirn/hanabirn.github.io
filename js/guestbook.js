/* ===== Guestbook (留言板) — Cloudflare Worker backend =====
   Messages are kept by the hanabi-assistant Worker (worker/assistant/src/guestbook.js)
   in Cloudflare KV, which only the Worker can write. Posting needs a site account
   (js/account.js): the Worker checks the Firebase ID token, allows one message per
   account (email accounts must have verified their address) and has Gemini refuse
   violence, politics, sexual content, hate, spam and personal data. The small word
   list below only saves a round trip for the obvious cases. */
const GUESTBOOK_API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? 'http://localhost:8787/guestbook'
    : 'https://hanabi-assistant.osu-collection-hanabi.workers.dev/guestbook';

const GUESTBOOK_BLOCKED_WORDS = [
    'nigger', 'nigga', 'faggot', 'retard', 'kill yourself', 'kys',
    'porn', 'onlyfans', 'nude pics',
    '死全家', '去死', '賤人', '婊子', '智障', '支那',
    'viagra', 'casino', 'forex signal', '博彩', '賭博網', '加賴',
];
function containsBlockedContent(text) {
    if (/https?:\/\/|www\.[a-z0-9-]+\.[a-z]{2,}/i.test(text)) return true;
    const normalized = text.toLowerCase().replace(/[\s._\-*]/g, '');
    return GUESTBOOK_BLOCKED_WORDS.some(w => normalized.includes(w.toLowerCase().replace(/[\s._\-*]/g, '')));
}

let guestbookMessages = [];
let guestbookMine = null;          // this account already posted (null: unknown)
let guestbookNotice = '';          // the line under the form (errors, "sent")
let guestbookVerifySent = false;
const GUESTBOOK_PAGE_SIZE = 10;
const GUESTBOOK_CACHE_KEY = 'guestbook_cache_v2';
let guestbookVisibleCount = GUESTBOOK_PAGE_SIZE;

function guestbookUser() {
    return typeof acctUser !== 'undefined' ? acctUser : null;
}

// Google accounts are verified; email + password ones must confirm their address
function guestbookNeedsVerify(user) {
    return !!user && !user.emailVerified && !(user.providerData || []).some(p => p.providerId === 'google.com');
}

async function guestbookAuthHeader() {
    const user = guestbookUser();
    if (!user) return {};
    try { return { Authorization: 'Bearer ' + await user.getIdToken() }; } catch { return {}; }
}

async function loadGuestbookMessages() {
    guestbookVisibleCount = GUESTBOOK_PAGE_SIZE;
    const container = document.getElementById('guestbook-local');
    // a device that was signed in: load Firebase so the form knows who is writing
    try {
        if (!guestbookUser() && localStorage.getItem('acct_signed_in') && typeof acctLoadSdk === 'function') acctLoadSdk().catch(() => {});
    } catch {}
    renderGuestbookGate();

    // cached messages at once, the fresh list when it arrives
    let cached = null;
    try { cached = localStorage.getItem(GUESTBOOK_CACHE_KEY); } catch {}
    if (cached) {
        try { guestbookMessages = JSON.parse(cached); renderGuestbookMessages(); } catch { guestbookMessages = []; }
    } else {
        container.innerHTML = `<div class="guestbook-loading">${escapeHtml(t('guestbook_loading'))}</div>`;
    }

    try {
        const res = await fetch(GUESTBOOK_API, { headers: await guestbookAuthHeader() });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.messages)) throw new Error(data.error || res.status);
        guestbookMessages = data.messages;
        if (typeof data.mine === 'boolean') guestbookMine = data.mine;
        try { localStorage.setItem(GUESTBOOK_CACHE_KEY, JSON.stringify(guestbookMessages)); } catch {}
    } catch (e) {
        console.error('Guestbook load failed:', e);
        if (!cached) guestbookMessages = [];
    }
    renderGuestbookMessages();
    renderGuestbookGate();
}

/* account.js calls this when someone signs in or out. */
function guestbookOnUser() {
    guestbookMine = null;
    guestbookNotice = '';
    guestbookVerifySent = false;
    const page = document.getElementById('page-guestbook');
    if (page && page.style.display !== 'none') loadGuestbookMessages();
}

/* What the visitor can do: sign in / verify the email / write / already wrote. */
function renderGuestbookGate() {
    const gate = document.getElementById('guestbook-gate');
    const form = document.querySelector('#page-guestbook .guestbook-form');
    const note = document.getElementById('guestbook-notice');
    if (!gate || !form) return;
    const user = guestbookUser();
    let html = '', showForm = false;
    if (!user) {
        html = `<p>${escapeHtml(t('guestbook_signin_hint'))}</p>
            <button type="button" class="btn next-btn" onclick="openAccount()">${escapeHtml(t('guestbook_signin_btn'))}</button>`;
    } else if (guestbookNeedsVerify(user)) {
        html = `<p>${escapeHtml(t(guestbookVerifySent ? 'guestbook_verify_sent' : 'guestbook_verify_hint', { email: user.email || '' }))}</p>
            <div class="guestbook-gate-btns">
                <button type="button" class="btn next-btn" onclick="guestbookSendVerify()">${escapeHtml(t('guestbook_verify_send'))}</button>
                <button type="button" class="btn back-btn" onclick="guestbookCheckVerified()">${escapeHtml(t('guestbook_verify_done'))}</button>
            </div>`;
    } else if (guestbookMine) {
        html = `<p>✦ ${escapeHtml(t('guestbook_already'))}</p>`;
    } else {
        html = `<p class="guestbook-rule">${escapeHtml(t('guestbook_rule'))}</p>`;
        showForm = true;
    }
    gate.innerHTML = html;
    form.style.display = showForm ? '' : 'none';
    if (note) {
        note.textContent = guestbookNotice;
        note.hidden = !guestbookNotice;
    }
}

async function guestbookSendVerify() {
    const user = guestbookUser();
    if (!user || typeof acctLoadSdk !== 'function') return;
    try {
        const fb = await acctLoadSdk();
        await fb.mod.sendEmailVerification(user);
        guestbookVerifySent = true;
        guestbookNotice = '';
    } catch (e) {
        console.warn('[guestbook] verify', e);
        guestbookNotice = typeof acctErrorText === 'function' ? acctErrorText(e) : t('guestbook_error');
    }
    renderGuestbookGate();
}

async function guestbookCheckVerified() {
    const user = guestbookUser();
    if (!user) return;
    try {
        await user.reload();
        await user.getIdToken(true);
    } catch {}
    guestbookNotice = guestbookNeedsVerify(user) ? t('guestbook_verify_not_yet') : '';
    renderGuestbookGate();
}

function renderGuestbookMessages() {
    const container = document.getElementById('guestbook-local');
    if (guestbookMessages.length === 0) {
        container.innerHTML = `<div class="guestbook-empty">${escapeHtml(t('guestbook_empty'))}</div>`;
        return;
    }

    const visible = guestbookMessages.slice(0, guestbookVisibleCount);
    let html = visible.map(m => {
        const d = new Date(m.time);
        const timeStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `<div class="guestbook-msg-item">
            <div class="guestbook-msg-name">${escapeHtml(m.name)}</div>
            <div class="guestbook-msg-text">${escapeHtml(m.message)}</div>
            <div class="guestbook-msg-time">${timeStr}</div>
        </div>`;
    }).join('');

    if (guestbookMessages.length > guestbookVisibleCount) {
        html += `<button class="guestbook-load-more" onclick="loadMoreGuestbookMessages()">${escapeHtml(t('guestbook_load_more'))}</button>`;
    }

    container.innerHTML = html;
}

function loadMoreGuestbookMessages() {
    guestbookVisibleCount += GUESTBOOK_PAGE_SIZE;
    renderGuestbookMessages();
}

const GUESTBOOK_ERRORS = {
    blocked: 'guestbook_blocked', moderation_busy: 'guestbook_mod_busy', busy: 'guestbook_busy',
    signin: 'guestbook_signin_hint', verify_email: 'guestbook_verify_hint', bad_request: 'guestbook_error'
};

async function handleGuestbookSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.elements.name.value.trim();
    const message = form.elements.message.value.trim();
    if (!name || !message) return false;
    guestbookNotice = '';

    // bots fill the hidden field: pretend it worked
    if (form.elements.website && form.elements.website.value) {
        form.reset();
        return false;
    }
    if (containsBlockedContent(name) || containsBlockedContent(message)) {
        guestbookNotice = t('guestbook_blocked');
        renderGuestbookGate();
        return false;
    }

    const submitBtn = form.querySelector('.guestbook-submit');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    try {
        const res = await fetch(GUESTBOOK_API, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, await guestbookAuthHeader()),
            body: JSON.stringify({ name, message })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.item) {
            guestbookMessages.unshift(data.item);
            try { localStorage.setItem(GUESTBOOK_CACHE_KEY, JSON.stringify(guestbookMessages)); } catch {}
            guestbookMine = true;
            form.reset();
            const ok = document.getElementById('guestbook-success');
            ok.style.display = 'block';
            setTimeout(() => { ok.style.display = 'none'; }, 4000);
            renderGuestbookMessages();
        } else if (data.error === 'already') {
            guestbookMine = true;
        } else {
            guestbookNotice = t(GUESTBOOK_ERRORS[data.error] || 'guestbook_error', { email: (guestbookUser() || {}).email || '' });
        }
    } catch (e) {
        console.error('Guestbook submit failed:', e);
        guestbookNotice = t('guestbook_error');
    }
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    renderGuestbookGate();
    return false;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}
