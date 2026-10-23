/* ===== 每日提醒 (push reminders, owner's plan item 20, 2026-10-24) =====
   The 設定 panel's 🔔 section turns reminders on for this device: the browser asks for
   permission, gives a push subscription, and the hanabi-assistant Worker
   (worker/assistant/src/push.js) keeps it with the hour picked (19–22, default 20), the
   time zone and the site language. logDailyActivity() calls pushActivity(), which tells the
   Worker once a day that this device practised; the Worker's hourly cron reminds devices
   that haven't. Signed in, the subscription also carries the account, so a friend's 🔔
   nudge (js/friends.js) arrives as a notification. The service worker shows them
   (service-worker.js "push" / "notificationclick"). iPhone: only the home-screen app. */
const PUSH_API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? 'http://localhost:8787/push'
    : 'https://hanabi-assistant.osu-collection-hanabi.workers.dev/push';
// the VAPID public key (the private half is the Worker's secret VAPID_PRIVATE)
const PUSH_VAPID_PUBLIC = 'BJXqJi8syeubno1nPig5nWT5c3QiN9_yvediOPquDp6HURTqgvvox-WzGIwWPydzhQHjwQr21_21LTp27czTxHk';
const PUSH_HOURS = [19, 20, 21, 22];

let pushNote = '';          // an i18n key shown under the switch (sent, denied, error …)

function pushStore(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} }
function pushRead(k) { try { return localStorage.getItem(k) || ''; } catch { return ''; } }
function pushOn() { return pushRead('push_on') === '1'; }
function pushHour() { const h = parseInt(pushRead('push_hour'), 10); return PUSH_HOURS.includes(h) ? h : 20; }

function pushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function pushIsIos() {
    return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function pushKey() {
    const s = PUSH_VAPID_PUBLIC.replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(s + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
}

function pushToday() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function pushNumbers() {
    const act = typeof getDailyActivity === 'function' ? getDailyActivity() : {};
    return {
        streak: typeof calcStreak === 'function' ? calcStreak(getQuizRecords()) : 0,
        practised: (act[activityDayKey(Date.now())] || 0) > 0,
        day: pushToday(),
        lang: typeof siteLang !== 'undefined' ? siteLang : 'zh'
    };
}

async function pushCall(action, sub, extra) {
    const headers = { 'Content-Type': 'application/json' };
    // signed in: the Worker links this device to the account, for friends' nudges
    const user = typeof acctUser !== 'undefined' ? acctUser : null;
    if (user && action === 'subscribe') {
        try { headers.Authorization = 'Bearer ' + await user.getIdToken(); } catch {}
    }
    const res = await fetch(PUSH_API, { method: 'POST', headers, body: JSON.stringify(Object.assign({ action, sub }, extra || {})) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || String(res.status));
    return data;
}

async function pushSubscription(create) {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub && create) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: pushKey() });
    return sub;
}

async function pushEnable() {
    pushNote = '';
    if (!pushSupported()) { pushNote = pushIsIos() ? 'push_ios_hint' : 'push_unsupported'; renderPushSettings(); return; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { pushNote = 'push_denied'; renderPushSettings(); return; }
    try {
        const sub = await pushSubscription(true);
        await pushCall('subscribe', sub.toJSON(), Object.assign({ hour: pushHour(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone }, pushNumbers()));
        pushStore('push_on', '1');
        pushStore('push_last_day', pushNumbers().practised ? pushToday() : null);
        pushNote = 'push_on_done';
    } catch (e) {
        pushNote = 'push_error';
    }
    renderPushSettings();
}

async function pushDisable() {
    pushNote = '';
    try {
        const sub = await pushSubscription(false);
        if (sub) {
            await pushCall('unsubscribe', sub.toJSON()).catch(() => {});
            await sub.unsubscribe();
        }
    } catch {}
    pushStore('push_on', null);
    renderPushSettings();
}

async function pushSetHour(h) {
    pushStore('push_hour', String(h));
    if (pushOn()) await pushEnable();      // the same subscription, the new hour
    else renderPushSettings();
}

async function pushTest() {
    pushNote = '';
    try {
        const sub = await pushSubscription(false);
        if (!sub) throw new Error('no sub');
        await pushCall('test', sub.toJSON());
        pushNote = 'push_test_sent';
    } catch (e) {
        pushNote = e.message === 'busy' ? 'push_test_busy' : 'push_error';
    }
    renderPushSettings();
}

/* logDailyActivity() (js/quiz.js): once a day, "this device practised" (and on sign-in
   changes the subscription is sent again, so it knows the account) */
function pushActivity() {
    if (!pushOn() || pushRead('push_last_day') === pushToday()) return;
    pushStore('push_last_day', pushToday());
    pushSubscription(false).then(sub => sub && pushCall('practised', sub.toJSON(), pushNumbers())).catch(() => pushStore('push_last_day', null));
}

function pushOnUser() {
    if (!pushOn() || !pushSupported()) return;
    pushSubscription(false).then(sub => sub && pushCall('subscribe', sub.toJSON(),
        Object.assign({ hour: pushHour(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone }, pushNumbers()))).catch(() => {});
}

/* the 設定 panel's section (toggleTabSettings calls it) */
function renderPushSettings() {
    const box = document.getElementById('push-settings');
    if (!box) return;
    const on = pushOn();
    const iosBrowser = pushIsIos() && !(typeof isStandaloneApp === 'function' && isStandaloneApp());
    const hours = PUSH_HOURS.map(h => `<button type="button" class="pc-chip${h === pushHour() ? ' on' : ''}" aria-pressed="${h === pushHour()}" onclick="pushSetHour(${h})">${h}:00</button>`).join('');
    box.innerHTML = `<p class="tab-settings-desc">${escHtml(t('push_desc'))}</p>
        <label class="push-toggle"><input type="checkbox" ${on ? 'checked' : ''} ${iosBrowser || !pushSupported() ? 'disabled' : ''}
            onchange="this.checked ? pushEnable() : pushDisable()"><span>${escHtml(t('push_switch'))}</span></label>
        <div class="push-hours"><span class="pc-label">${escHtml(t('push_time'))}</span>${hours}</div>
        ${on ? `<button type="button" class="tab-settings-reset" onclick="pushTest()">${escHtml(t('push_test'))}</button>` : ''}
        ${iosBrowser ? `<p class="push-note">${escHtml(t('push_ios_hint'))}</p>` : !pushSupported() ? `<p class="push-note">${escHtml(t('push_unsupported'))}</p>` : ''}
        ${pushNote ? `<p class="push-note" role="status">${escHtml(t(pushNote))}</p>` : ''}`;
}
