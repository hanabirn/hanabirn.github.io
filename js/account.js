/* ===================== Accounts & cloud sync (Firebase) =====================
   Optional sign-in (Google or email + password) that keeps the learning progress in
   localStorage in step across devices. Nothing changes for visitors who never sign in:
   the Firebase Auth SDK (~260 KB from gstatic) is only loaded when someone opens the
   account dialog, or on page load when this device was signed in before
   (localStorage.acct_signed_in).

   Data lives in Firestore as users/{uid}/data/{key} = { v: <the localStorage string> },
   one document per key in SYNC_KEYS (a document may hold 1 MiB; srs_quiz is the largest
   at a few hundred KB). It is read and written through the Firestore REST API with the
   user's ID token instead of the 680 KB Firestore SDK; the security rules (users may
   only touch users/{their uid}/**) are applied the same way.

   Sync: on sign-in every key is merged local + cloud with its own rule (never one side
   overwriting the other), written back to both, and the screens re-rendered. After that,
   any localStorage.setItem of a synced key (caught by wrapping Storage.prototype.setItem)
   marks it dirty; dirty keys are merged with the cloud copy and uploaded
   SYNC_DEBOUNCE_MS after the last change, and when the page is hidden. 記事本 (notes) and
   the word-list caches are deliberately not synced. */

const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyChjmEw7zDVPf3QqLvlvEmSDZ9DFat2yVE',
    authDomain: 'hanabi-site.firebaseapp.com',
    projectId: 'hanabi-site',
    storageBucket: 'hanabi-site.firebasestorage.app',
    messagingSenderId: '5570587035',
    appId: '1:5570587035:web:768d73c6f0d43b7f1e993e'
};
const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
const FIRESTORE_DOCS = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;
const SYNC_DEBOUNCE_MS = 15000;
const ACCT_RECENT_LOGIN_MS = 4 * 60 * 1000;   // Firebase wants a fresh sign-in to delete an account

/* ----- merge rules, one per synced key (a = this device, b = the cloud) ----- */
function syncParse(s, empty) {
    if (s == null) return empty;
    try { const v = JSON.parse(s); return v == null ? empty : v; } catch { return empty; }
}
const unionList = (a, b) => [...new Set([].concat(a || [], b || []))];
const SYNC_KEYS = {
    // the newer entry of each word, with the higher miss count
    quiz_mistakes: { empty: [], merge: (a, b) => {
        const m = new Map();
        [].concat(a, b).forEach(x => {
            if (!x || !x.id) return;
            const p = m.get(x.id);
            if (!p) { m.set(x.id, x); return; }
            const newer = (x.last || 0) >= (p.last || 0) ? x : p;
            m.set(x.id, Object.assign({}, newer, { count: Math.max(p.count || 1, x.count || 1) }));
        });
        return [...m.values()];
    } },
    // the card answered most recently
    srs_quiz: { empty: {}, merge: (a, b) => {
        const o = Object.assign({}, a);
        Object.entries(b).forEach(([k, c]) => { if (c && (!o[k] || (c.seen || 0) > (o[k].seen || 0))) o[k] = c; });
        return o;
    } },
    quiz_records: { empty: [], merge: (a, b) => {
        const m = new Map();
        [].concat(a, b).forEach(r => { if (r && r.date) m.set(r.date + '|' + r.lang, r); });
        return [...m.values()].sort((x, y) => x.date - y.date).slice(-200);
    } },
    daily_activity: { empty: {}, merge: (a, b) => {
        const o = Object.assign({}, a);
        Object.entries(b).forEach(([d, n]) => { o[d] = Math.max(o[d] || 0, n || 0); });
        return o;
    } },
    path_progress_v2: { empty: {}, merge: (a, b) => {
        const o = Object.assign({}, a);
        Object.entries(b).forEach(([set, p]) => {
            const q = o[set];
            if (!q) { o[set] = p; return; }
            const best = Object.assign({}, q.best);
            Object.entries((p && p.best) || {}).forEach(([i, v]) => { best[i] = Math.max(best[i] || 0, v || 0); });
            o[set] = { done: Math.max(q.done || 0, (p && p.done) || 0), best };
        });
        return o;
    } },
    flashcard_known: { empty: [], merge: unionList },
    flashcard_unknown: { empty: [], merge: unionList },
    quiz_achievements: { empty: [], merge: unionList },
    // plain strings: this device's choice wins, the cloud fills in a missing one
    daily_goal: { raw: true },
    last_quiz_set: { raw: true }
};

/* The merged localStorage string of a key, or null when neither side has it. */
function syncMerge(key, local, cloud) {
    const rule = SYNC_KEYS[key];
    if (rule.raw) return local != null ? local : cloud;
    if (local == null) return cloud;
    if (cloud == null) return local;
    return JSON.stringify(rule.merge(syncParse(local, rule.empty), syncParse(cloud, rule.empty)));
}

/* ----- state ----- */
let fbAuth = null;           // { auth, mod } once the SDK is loaded
let fbLoading = null;
let acctUser = null;
let acctStatus = 'idle';     // 'idle' | 'syncing' | 'ok' | 'error'
let acctLastSync = 0;
let acctError = '';          // the message under the sign-in form
let acctMode = 'signin';     // the email form: 'signin' | 'signup'
let acctApplying = false;    // our own localStorage writes don't count as changes
const acctDirty = new Set();
let acctTimer = 0;

/* Every write to a synced key schedules an upload while someone is signed in. */
(function watchLocalStorage() {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
        set.call(this, k, v);
        if (this === window.localStorage && !acctApplying && SYNC_KEYS[k] && acctUser) acctMarkDirty(k);
    };
})();

function acctMarkDirty(key) {
    acctDirty.add(key);
    clearTimeout(acctTimer);
    acctTimer = setTimeout(acctFlush, SYNC_DEBOUNCE_MS);
}

function acctApplyLocal(key, value) {
    acctApplying = true;
    try { localStorage.setItem(key, value); } catch {} finally { acctApplying = false; }
}

/* ----- Firestore REST ----- */
async function fsRequest(method, path, body) {
    const token = await acctUser.getIdToken();
    const res = await fetch(FIRESTORE_DOCS + '/users/' + encodeURIComponent(acctUser.uid) + path, {
        method,
        headers: Object.assign({ Authorization: 'Bearer ' + token }, body ? { 'Content-Type': 'application/json' } : {}),
        body: body ? JSON.stringify(body) : undefined
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('firestore ' + res.status);
    return method === 'DELETE' ? true : res.json();
}

async function fsList() {
    const out = {};
    let page = '';
    do {
        const data = await fsRequest('GET', '/data?pageSize=50' + (page ? '&pageToken=' + encodeURIComponent(page) : ''));
        ((data && data.documents) || []).forEach(d => {
            const key = d.name.split('/').pop();
            if (SYNC_KEYS[key] && d.fields && d.fields.v) out[key] = d.fields.v.stringValue;
        });
        page = data && data.nextPageToken;
    } while (page);
    return out;
}

async function fsGet(key) {
    const d = await fsRequest('GET', '/data/' + key);
    return d && d.fields && d.fields.v ? d.fields.v.stringValue : null;
}

function fsPut(key, value) {
    return fsRequest('PATCH', '/data/' + key, {
        fields: { v: { stringValue: value }, at: { timestampValue: new Date().toISOString() } }
    });
}

/* ----- syncing ----- */
function acctSetStatus(s) {
    acctStatus = s;
    if (s === 'ok') acctLastSync = Date.now();
    renderAccount();
}

/* Sign-in: merge every key both ways, then redraw whatever is on screen. */
async function acctFullSync() {
    if (!acctUser) return;
    acctSetStatus('syncing');
    try {
        const cloud = await fsList();
        for (const key of Object.keys(SYNC_KEYS)) {
            const local = localStorage.getItem(key);
            const merged = syncMerge(key, local, cloud[key] != null ? cloud[key] : null);
            if (merged == null) continue;
            if (merged !== local) acctApplyLocal(key, merged);
            if (merged !== cloud[key]) await fsPut(key, merged);
        }
        acctTidyFlashcards();
        acctDirty.clear();
        acctSetStatus('ok');
        acctRefreshScreens();
    } catch (e) {
        console.warn('[account] sync failed', e);
        acctSetStatus('error');
    }
}

/* A word marked 會了 on one device and 還不熟 on another counts as 會了. */
function acctTidyFlashcards() {
    const known = new Set(syncParse(localStorage.getItem('flashcard_known'), []));
    const unknown = syncParse(localStorage.getItem('flashcard_unknown'), []);
    const kept = unknown.filter(k => !known.has(k));
    if (kept.length !== unknown.length) acctApplyLocal('flashcard_unknown', JSON.stringify(kept));
    if (typeof flashcardKnownSet !== 'undefined') {
        flashcardKnownSet = known;
        flashcardUnknownSet = new Set(kept);
    }
}

/* The changes since the last upload: each merged with the cloud copy first, so a
   second device's newer answers are kept. */
async function acctFlush() {
    clearTimeout(acctTimer);
    if (!acctUser || !acctDirty.size) return;
    const keys = [...acctDirty];
    acctDirty.clear();
    acctSetStatus('syncing');
    try {
        let changed = false;
        for (const key of keys) {
            const local = localStorage.getItem(key);
            const cloud = await fsGet(key);
            const merged = syncMerge(key, local, cloud);
            if (merged == null) continue;
            if (merged !== local) { acctApplyLocal(key, merged); changed = true; }
            if (merged !== cloud) await fsPut(key, merged);
        }
        acctSetStatus('ok');
        if (changed) acctRefreshScreens();
    } catch (e) {
        console.warn('[account] upload failed', e);
        keys.forEach(k => acctDirty.add(k));
        acctSetStatus('error');
        acctTimer = setTimeout(acctFlush, SYNC_DEBOUNCE_MS * 4);
    }
}

function acctRefreshScreens() {
    if (typeof refreshDynamicContent === 'function') refreshDynamicContent();
    if (typeof updateStreakBadge === 'function') updateStreakBadge();
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') acctFlush(); });

/* ----- Firebase Auth ----- */
function acctLoadSdk() {
    if (fbAuth) return Promise.resolve(fbAuth);
    if (!fbLoading) {
        fbLoading = Promise.all([import(FIREBASE_SDK + 'firebase-app.js'), import(FIREBASE_SDK + 'firebase-auth.js')])
            .then(([appMod, mod]) => {
                const auth = mod.getAuth(appMod.initializeApp(FIREBASE_CONFIG));
                fbAuth = { auth, mod };
                mod.onAuthStateChanged(auth, acctOnUser);
                return fbAuth;
            })
            .catch(e => { fbLoading = null; throw e; });
    }
    return fbLoading;
}

function acctOnUser(user) {
    const was = acctUser && acctUser.uid;
    acctUser = user;
    try {
        if (user) localStorage.setItem('acct_signed_in', '1');
        else localStorage.removeItem('acct_signed_in');
    } catch {}
    if (user && user.uid !== was) {
        acctError = '';
        acctFullSync();
    }
    if (!user) { acctStatus = 'idle'; acctDirty.clear(); }
    renderAccount();
    if ((user && user.uid) !== was && typeof guestbookOnUser === 'function') guestbookOnUser();
}

const ACCT_AUTH_LANG = { zh: 'zh-TW', 'zh-Hans': 'zh-CN', en: 'en', ja: 'ja', ko: 'ko', ru: 'ru', fr: 'fr', es: 'es', de: 'de' };

/* Firebase error codes → what to tell the visitor ('' = say nothing, e.g. a closed popup). */
function acctErrorText(e) {
    const code = (e && e.code) || '';
    if (/popup-closed-by-user|cancelled-popup-request/.test(code)) return '';
    if (/popup-blocked|operation-not-supported|web-storage-unsupported/.test(code)) return t('acct_err_popup');
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(code)) return t('acct_err_credentials');
    if (/invalid-email|missing-email/.test(code)) return t('acct_err_email');
    if (/email-already-in-use/.test(code)) return t('acct_err_exists');
    if (/weak-password|missing-password/.test(code)) return t('acct_err_weak');
    if (/too-many-requests/.test(code)) return t('acct_err_many');
    if (/network-request-failed/.test(code) || (e && /Failed to fetch|import/i.test(e.message || ''))) return t('acct_err_network');
    if (/requires-recent-login/.test(code)) return t('acct_err_recent');
    return t('acct_err_generic', { code: code || (e && e.message) || '?' });
}

async function acctRun(task) {
    acctError = '';
    const box = document.getElementById('account-overlay');
    if (box) box.classList.add('busy');
    try {
        const fb = await acctLoadSdk();
        fb.auth.languageCode = ACCT_AUTH_LANG[siteLang] || 'zh-TW';
        await task(fb);
    } catch (e) {
        console.warn('[account]', e);
        acctError = acctErrorText(e);
    } finally {
        if (box) box.classList.remove('busy');
        renderAccount();
    }
}

function acctGoogle() {
    acctRun(fb => fb.mod.signInWithPopup(fb.auth, new fb.mod.GoogleAuthProvider()));
}

function acctEmailForm() {
    return {
        email: (document.getElementById('acct-email') || {}).value || '',
        password: (document.getElementById('acct-password') || {}).value || ''
    };
}

function acctEmailSubmit(e) {
    if (e) e.preventDefault();
    const { email, password } = acctEmailForm();
    acctRun(fb => acctMode === 'signup'
        ? fb.mod.createUserWithEmailAndPassword(fb.auth, email.trim(), password)
        : fb.mod.signInWithEmailAndPassword(fb.auth, email.trim(), password));
}

function acctSetMode(mode) {
    const { email } = acctEmailForm();
    acctMode = mode;
    acctError = '';
    renderAccount();
    const input = document.getElementById('acct-email');
    if (input) input.value = email;
}

function acctResetPassword() {
    const { email } = acctEmailForm();
    if (!email.trim()) { acctError = t('acct_err_email'); renderAccount(); return; }
    acctRun(async fb => {
        await fb.mod.sendPasswordResetEmail(fb.auth, email.trim());
        showShareToast(t('acct_reset_sent'));
    });
}

async function acctSignOut() {
    await acctFlush();
    acctRun(fb => fb.mod.signOut(fb.auth));
}

function acctSyncNow() {
    if (acctUser) acctFullSync();
}

/* Deleting: the cloud copy first (it needs the account's token), then the account.
   Firebase only deletes an account signed in to a few minutes ago, so check that
   before touching anything. This device's own progress stays. */
function acctDelete() {
    if (!acctUser) return;
    const last = Date.parse(acctUser.metadata && acctUser.metadata.lastSignInTime) || 0;
    if (Date.now() - last > ACCT_RECENT_LOGIN_MS) { acctError = t('acct_err_recent'); renderAccount(); return; }
    if (!confirm(t('acct_delete_confirm'))) return;
    acctRun(async fb => {
        clearTimeout(acctTimer);
        acctDirty.clear();
        for (const key of Object.keys(SYNC_KEYS)) await fsRequest('DELETE', '/data/' + key);
        await fb.mod.deleteUser(fb.auth.currentUser);
        showShareToast(t('acct_deleted'));
    });
}

/* ----- UI: header button, More item, home card, dialog ----- */
function openAccount() {
    const overlay = document.getElementById('account-overlay');
    if (!overlay) return;
    overlay.classList.add('show');
    renderAccount();
    acctLoadSdk().then(() => renderAccount()).catch(() => { acctError = t('acct_err_network'); renderAccount(); });
}

function closeAccount() {
    const overlay = document.getElementById('account-overlay');
    if (overlay) overlay.classList.remove('show');
}

function acctName(u) {
    return (u && (u.displayName || (u.email || '').split('@')[0])) || '';
}

function acctStatusText() {
    if (acctStatus === 'syncing') return t('acct_syncing');
    if (acctStatus === 'error') return t('acct_sync_error');
    if (acctStatus === 'ok' && acctLastSync) {
        const d = new Date(acctLastSync);
        return t('acct_synced', { time: String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') });
    }
    return '';
}

function renderAccount() {
    const signedIn = !!acctUser;
    // header button + More item
    document.querySelectorAll('.account-entry-label').forEach(el => {
        el.textContent = signedIn ? acctName(acctUser) : t('acct_signin');
    });
    document.querySelectorAll('.account-entry').forEach(el => el.classList.toggle('signed-in', signedIn));
    // home card
    const card = document.getElementById('home-account-card');
    if (card) card.hidden = signedIn;

    const box = document.getElementById('account-body');
    const overlay = document.getElementById('account-overlay');
    if (!box || !overlay || !overlay.classList.contains('show')) return;
    const err = acctError ? `<p class="acct-error" role="alert">${escHtml(acctError)}</p>` : '';

    if (signedIn) {
        const u = acctUser;
        const pic = u.photoURL
            ? `<img class="acct-avatar" src="${escHtml(u.photoURL)}" alt="" referrerpolicy="no-referrer">`
            : `<span class="acct-avatar acct-initial">${escHtml(acctName(u).slice(0, 1).toUpperCase())}</span>`;
        box.innerHTML = `
            <div class="acct-who">${pic}<div><b>${escHtml(acctName(u))}</b><small>${escHtml(u.email || '')}</small></div></div>
            <div class="acct-sync acct-st-${acctStatus}">
                <span>☁️ ${escHtml(acctStatusText() || t('acct_sync_on'))}</span>
                <button type="button" class="back-btn" onclick="acctSyncNow()"${acctStatus === 'syncing' ? ' disabled' : ''}>${escHtml(t('acct_sync_now'))}</button>
            </div>
            <p class="acct-note">${escHtml(t('acct_sync_what'))}</p>
            ${err}
            <button type="button" class="back-btn acct-wide" onclick="acctSignOut()">${escHtml(t('acct_signout'))}</button>
            <button type="button" class="acct-danger" onclick="acctDelete()">${escHtml(t('acct_delete'))}</button>`;
        return;
    }

    const signup = acctMode === 'signup';
    box.innerHTML = `
        <p class="acct-intro">${escHtml(t('acct_intro'))}</p>
        <button type="button" class="back-btn acct-google acct-wide" onclick="acctGoogle()">
            <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            ${escHtml(t('acct_google'))}
        </button>
        <div class="acct-or"><span>${escHtml(t('acct_or_email'))}</span></div>
        <form class="acct-form" onsubmit="acctEmailSubmit(event)">
            <input type="email" id="acct-email" autocomplete="email" required placeholder="${escHtml(t('acct_email'))}" aria-label="${escHtml(t('acct_email'))}">
            <input type="password" id="acct-password" autocomplete="${signup ? 'new-password' : 'current-password'}" required minlength="6" placeholder="${escHtml(t(signup ? 'acct_password_new' : 'acct_password'))}" aria-label="${escHtml(t('acct_password'))}">
            ${err}
            <button type="submit" class="next-btn acct-wide">${escHtml(t(signup ? 'acct_signup' : 'acct_signin'))}</button>
        </form>
        <div class="acct-links">
            ${signup
                ? `<button type="button" class="pc-link" onclick="acctSetMode('signin')">${escHtml(t('acct_have_account'))}</button>`
                : `<button type="button" class="pc-link" onclick="acctSetMode('signup')">${escHtml(t('acct_new_account'))}</button>
                   <button type="button" class="pc-link" onclick="acctResetPassword()">${escHtml(t('acct_forgot'))}</button>`}
        </div>
        <p class="acct-note">${escHtml(t('acct_privacy_note'))} <a href="privacy.html" target="_blank" rel="noopener">${escHtml(t('acct_privacy_link'))}</a></p>`;
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAccount(); });

document.addEventListener('DOMContentLoaded', () => {
    renderAccount();
    // signed in on this device before: restore the session (and sync) in the background
    let was = false;
    try { was = !!localStorage.getItem('acct_signed_in'); } catch {}
    if (was) acctLoadSdk().catch(e => console.warn('[account] SDK did not load', e));
});
