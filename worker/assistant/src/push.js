/* 每日提醒 — Web Push (owner's plan, item 20, 2026-10-24).
 *
 * A device that turns reminders on (the 設定 panel, js/push.js) gives its push subscription,
 * the hour it wants (19–22), its time zone and language; it reports "practised today" once a
 * day. Every hour the cron (index.js scheduled) sends a reminder to devices whose hour it is,
 * that haven't practised today and haven't been reminded today. A friend's 🔔 nudge
 * (src/friends.js) is pushed at once to the friend's devices (subscriptions sent with a
 * Firebase ID token carry the uid).
 *
 *   POST /push { action, sub: {endpoint, keys: {p256dh, auth}}, ... }   (Authorization optional)
 *     subscribe  { sub, hour, tz, lang, streak, practised, day }
 *     practised  { sub, day, streak, lang }        once a day after practice
 *     unsubscribe{ sub }
 *     test       { sub }                           a test notification now (3 an hour)
 *
 * Stored in D1 (FRIENDS, table push_subs, schema.sql). Sending follows RFC 8291 (aes128gcm)
 * and RFC 8292 (VAPID): VAPID_PUBLIC (a var, also in js/push.js) and VAPID_PRIVATE (a secret,
 * the raw 32-byte private key, base64url). No packages — only WebCrypto.
 */
import { firebaseUser, bearer } from './guestbook.js';
import { PUSH_TEXT } from './push_text.js';

const HOURS = [19, 20, 21, 22];
const LANGS = Object.keys(PUSH_TEXT);
const TEST_PER_HOUR = 3;

const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const concat = (...parts) => {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let i = 0;
    for (const p of parts) { out.set(p, i); i += p.length; }
    return out;
};

async function sha(s) {
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function hkdf(salt, ikm, info, bytes) {
    const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}

// the VAPID key pair as WebCrypto keys (the public key is 0x04 || x || y)
async function vapidKey(env) {
    const pub = unb64u(env.VAPID_PUBLIC);
    return crypto.subtle.importKey('jwk', {
        kty: 'EC', crv: 'P-256', d: env.VAPID_PRIVATE,
        x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), ext: true
    }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

async function vapidHeader(env, endpoint) {
    const aud = new URL(endpoint).origin;
    const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
    const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'https://hanabirn.xyz/' })));
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await vapidKey(env), enc.encode(head + '.' + body));
    return `vapid t=${head}.${body}.${b64u(sig)}, k=${env.VAPID_PUBLIC}`;
}

// RFC 8291: one aes128gcm record
async function encrypt(p256dh, auth, payload) {
    const uaPub = unb64u(p256dh);
    const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
    const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));
    const prk = await hkdf(unb64u(auth), shared, concat(enc.encode('WebPush: info\0'), uaPub, asPub), 32);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const cek = await hkdf(salt, prk, enc.encode('Content-Encoding: aes128gcm\0'), 16);
    const nonce = await hkdf(salt, prk, enc.encode('Content-Encoding: nonce\0'), 12);
    const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
    const plain = concat(enc.encode(JSON.stringify(payload)), new Uint8Array([2]));
    const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plain));
    const header = new Uint8Array(21);
    header.set(salt, 0);
    new DataView(header.buffer).setUint32(16, 4096);
    header[20] = 65;
    return concat(header, asPub, cipher);
}

/* -> true sent, false gone (the subscription was removed), null failed this time */
export async function sendPush(env, row, payload, urgency = 'normal') {
    if (!env.VAPID_PRIVATE || !env.VAPID_PUBLIC) return null;
    try {
        const res = await fetch(row.endpoint, {
            method: 'POST',
            headers: {
                TTL: String(12 * 3600), Urgency: urgency,
                'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream',
                Authorization: await vapidHeader(env, row.endpoint)
            },
            body: await encrypt(row.p256dh, row.auth, payload)
        });
        if (res.status === 404 || res.status === 410) {
            await env.FRIENDS.prepare('DELETE FROM push_subs WHERE id = ?').bind(row.id).run();
            return false;
        }
        if (!res.ok) console.log('push failed', res.status, await res.text().catch(() => ''));
        return res.ok ? true : null;
    } catch (e) {
        console.log('push error', String(e));
        return null;
    }
}

const textOf = lang => PUSH_TEXT[lang] || PUSH_TEXT.zh;

function reminder(row) {
    const T = textOf(row.lang);
    return { title: T.title, body: row.streak > 0 ? T.body_streak.replace('{n}', row.streak) : T.body, url: '/', tag: 'hanabi-daily' };
}

// the local date and hour of a time zone
function localNow(tz) {
    try {
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
            timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
        }).formatToParts(new Date()).map(p => [p.type, p.value]));
        return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: parseInt(parts.hour, 10) };
    } catch {
        return localNow('Asia/Taipei');
    }
}

/* the cron: every hour */
export async function runReminders(env) {
    if (!env.FRIENDS) return;
    const rows = (await env.FRIENDS.prepare('SELECT * FROM push_subs').all()).results || [];
    let sent = 0;
    for (const row of rows) {
        const now = localNow(row.tz);
        if (now.hour !== row.hour || row.last_practice === now.day || row.last_sent === now.day) continue;
        const ok = await sendPush(env, row, reminder(row));
        if (ok) {
            sent++;
            await env.FRIENDS.prepare('UPDATE push_subs SET last_sent = ? WHERE id = ?').bind(now.day, row.id).run();
        }
    }
    console.log('reminders sent', sent, 'of', rows.length);
}

/* a friend's 🔔 (src/friends.js): to every device of that account */
export async function pushNudge(env, uid, fromName, sticker) {
    if (!env.FRIENDS) return;
    const rows = (await env.FRIENDS.prepare('SELECT * FROM push_subs WHERE uid = ?').bind(uid).all()).results || [];
    for (const row of rows) {
        const T = textOf(row.lang);
        const name = fromName || T.someone;
        await sendPush(env, row, { title: T.nudge_title.replace('{name}', name), body: T.nudge[sticker] || T.nudge[0], url: '/?page=friends', tag: 'hanabi-nudge' }, 'high');
    }
}

export async function push(request, env, json, headers) {
    if (request.method !== 'POST') return json({ error: 'not_found' }, 404, headers);
    if (!env.FRIENDS || !env.VAPID_PRIVATE) return json({ error: 'not_ready' }, 503, headers);
    const body = await request.json().catch(() => ({}));
    const sub = body.sub || {};
    const endpoint = String(sub.endpoint || '');
    if (!/^https:\/\/[^\s]{10,1000}$/.test(endpoint)) return json({ error: 'bad_request' }, 400, headers);
    if (env.FRIENDS_LIMITER) {
        const { success } = await env.FRIENDS_LIMITER.limit({ key: 'push:' + endpoint.slice(-40) });
        if (!success) return json({ error: 'busy' }, 429, headers);
    }
    const db = env.FRIENDS;
    const id = await sha(endpoint);
    const lang = LANGS.includes(body.lang) ? body.lang : 'zh';
    const streak = Math.max(0, Math.min(100000, Math.floor(Number(body.streak) || 0)));
    const day = /^\d{4}-\d{2}-\d{2}$/.test(body.day || '') ? body.day : '';
    switch (body.action) {
    case 'subscribe': {
        const keys = sub.keys || {};
        if (!/^[A-Za-z0-9_-]{80,100}$/.test(keys.p256dh || '') || !/^[A-Za-z0-9_-]{16,30}$/.test(keys.auth || '')) return json({ error: 'bad_request' }, 400, headers);
        const hour = HOURS.includes(Number(body.hour)) ? Number(body.hour) : 20;
        let tz = String(body.tz || 'Asia/Taipei').slice(0, 64);
        try { new Intl.DateTimeFormat('en', { timeZone: tz }); } catch { tz = 'Asia/Taipei'; }
        // signed in: nudges from friends reach this device too
        const user = bearer(request) ? await firebaseUser(bearer(request), env) : null;
        await db.prepare(`INSERT INTO push_subs (id, endpoint, p256dh, auth, hour, tz, lang, streak, last_practice, uid, created)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, hour = excluded.hour, tz = excluded.tz,
                    lang = excluded.lang, streak = excluded.streak, uid = excluded.uid,
                    last_practice = CASE WHEN excluded.last_practice != '' THEN excluded.last_practice ELSE push_subs.last_practice END`)
            .bind(id, endpoint, keys.p256dh, keys.auth, hour, tz, lang, streak, body.practised === true ? day : '', user ? user.uid : null, Date.now()).run();
        return json({ ok: true, hour }, 200, headers);
    }
    case 'practised':
        await db.prepare('UPDATE push_subs SET last_practice = ?, streak = ?, lang = ? WHERE id = ?').bind(day, streak, lang, id).run();
        return json({ ok: true }, 200, headers);
    case 'unsubscribe':
        await db.prepare('DELETE FROM push_subs WHERE id = ?').bind(id).run();
        return json({ ok: true }, 200, headers);
    case 'test': {
        const row = await db.prepare('SELECT * FROM push_subs WHERE id = ?').bind(id).first();
        if (!row) return json({ error: 'not_found' }, 404, headers);
        const hourAgo = Date.now() - 3600000;
        const tests = row.test_at > hourAgo ? row.tests : 0;
        if (tests >= TEST_PER_HOUR) return json({ error: 'busy' }, 429, headers);
        await db.prepare('UPDATE push_subs SET tests = ?, test_at = ? WHERE id = ?').bind(tests + 1, tests ? row.test_at : Date.now(), id).run();
        const T = textOf(row.lang);
        const ok = await sendPush(env, row, { title: T.test_title, body: T.test_body, url: '/', tag: 'hanabi-test' }, 'high');
        return json(ok ? { ok: true } : { error: ok === false ? 'gone' : 'push_failed' }, ok ? 200 : 502, headers);
    }
    default:
        return json({ error: 'bad_request' }, 400, headers);
    }
}
