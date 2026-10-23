/* 好友 (friends), served by the same Worker as 小花火 (owner's plan B, 2026-10-23).
 *
 * Stored in the D1 database FRIENDS (schema.sql). Every request needs a site account:
 * the client sends its Firebase ID token, checked like the guestbook's. Other visitors
 * only ever see a friend code (HANA-7K3P), a display name and — when the friend allows
 * it (public) — their streak, words this week and learning languages; never the uid.
 *
 *   POST /friends { action, ... }  + Authorization: Bearer <Firebase ID token>
 *     get                               -> state
 *     profile  { name?, public?, avatar? }  -> state | { error: 'blocked' | 'moderation_busy' | 'bad_name' }
 *              avatar = { icon: 0…AVATAR_ICONS-1, colour: 0…AVATAR_COLOURS-1 }: one of the site's own icons, no uploads
 *     ping     { streak, week, langs, practised }  the device's own numbers, after practice
 *     add      { code }                 -> state | { error: 'not_found' | 'self' | 'already' | 'full' | 'too_many' }
 *     respond  { code, accept }         a request someone sent me
 *     remove   { code }                 unfriend, or withdraw my request
 *     pair     { code, op: invite | accept | leave }   🤝 friend streak (at most PAIRS_MAX)
 *     send     { code, kind: cheer | nudge, sticker }  -> state | { error: 'already' | 'practised' }
 *     seen                              marks the cheers / nudges I got as read
 *   state = { me, friends, incoming, outgoing, notes, unseen, tday }
 *
 * Days are Taiwan days (UTC+8) for everyone, so two friends agree on "today": a 🤝 pair
 * grows by one on a day both practised, and shows 0 once a day was missed.
 */
import { firebaseUser, bearer, moderate } from './guestbook.js';
import { pushNudge } from './push.js';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O, 1/I/L
const NAME_MAX = 20;
const FRIENDS_MAX = 50;      // friends and open requests together
const PAIRS_MAX = 5;         // 🤝 streaks, as in Duolingo
const ADDS_PER_DAY = 20;     // requests sent in 24 hours
const STICKERS = 6;          // fr_cheer_0…5 / fr_nudge_0…5 on the site
const AVATAR_ICONS = 24;     // FRIEND_AVATARS on the site
const AVATAR_COLOURS = 6;
const NOTES_SHOWN = 20;
const LANGS = ['ja', 'ko', 'zh', 'en', 'fr', 'ru', 'es', 'de'];
const DAY_MS = 86400000;

const tdayOf = ms => new Date(ms + 8 * 3600000).toISOString().slice(0, 10);
const dayBefore = d => new Date(Date.parse(d + 'T00:00:00Z') - DAY_MS).toISOString().slice(0, 10);
function weekKey(d) {
    const t = Date.parse(d + 'T00:00:00Z');
    return new Date(t - ((new Date(t).getUTCDay() + 6) % 7) * DAY_MS).toISOString().slice(0, 10);
}
const pairOf = (x, y) => (x < y ? [x, y] : [y, x]);
const cleanCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
const int = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

// ID token -> uid, kept a few minutes so one page visit costs one Identity Toolkit call
const tokenCache = new Map();
async function who(request, env) {
    // local tests only: .dev.vars FRIENDS_TEST=1 lets "X-Test-User: alice" stand in for a
    // signed-in account (never set on the deployed Worker)
    if (env.FRIENDS_TEST === '1' && request.headers.get('X-Test-User')) return 'test-' + request.headers.get('X-Test-User').slice(0, 20);
    const token = bearer(request);
    if (!token) return '';
    const hit = tokenCache.get(token);
    if (hit && hit.until > Date.now()) return hit.uid;
    const u = await firebaseUser(token, env);
    if (!u) return '';
    if (tokenCache.size > 500) tokenCache.clear();
    tokenCache.set(token, { uid: u.uid, until: Date.now() + 5 * 60000 });
    return u.uid;
}

async function newCode(db) {
    for (let i = 0; i < 12; i++) {
        const bytes = crypto.getRandomValues(new Uint8Array(8));
        const code = [...bytes].map(b => CODE_CHARS[b % CODE_CHARS.length]).join('');
        if (!await db.prepare('SELECT 1 FROM profiles WHERE code = ?').bind(code).first()) return code;
    }
    throw new Error('no free code');
}

async function profileOf(db, uid) {
    const p = await db.prepare('SELECT * FROM profiles WHERE uid = ?').bind(uid).first();
    if (p) return p;
    const code = await newCode(db);
    const now = Date.now();
    await db.prepare('INSERT INTO profiles (uid, code, name, created, updated) VALUES (?, ?, ?, ?, ?)')
        .bind(uid, code, '', now, now).run();
    return db.prepare('SELECT * FROM profiles WHERE uid = ?').bind(uid).first();
}

// what a friend may see of someone (their own numbers only when they made them public)
function seen(p, today) {
    const pub = p.public === 1;
    const active = p.tday >= dayBefore(today);
    return {
        code: p.code, name: p.name, avatar: p.avatar || '', public: pub,
        langs: pub ? p.langs : '',
        streak: pub ? (active ? p.streak : 0) : null,
        week: pub ? (p.week_key === weekKey(today) ? p.week_words : 0) : null,
        today: pub ? p.tday === today : null
    };
}

async function stateOf(db, uid) {
    const today = tdayOf(Date.now());
    const me = await profileOf(db, uid);
    const links = (await db.prepare('SELECT * FROM links WHERE a = ? OR b = ?').bind(uid, uid).all()).results || [];
    const others = links.map(l => (l.a === uid ? l.b : l.a));
    const people = {};
    if (others.length) {
        const rows = (await db.prepare(`SELECT * FROM profiles WHERE uid IN (${others.map(() => '?').join(',')})`)
            .bind(...others).all()).results || [];
        rows.forEach(r => { people[r.uid] = r; });
    }
    const sent = (await db.prepare('SELECT to_uid, kind FROM notes WHERE from_uid = ? AND tday = ?').bind(uid, today).all()).results || [];
    const sentKey = new Set(sent.map(s => s.to_uid + '|' + s.kind));
    const friends = [], incoming = [], outgoing = [];
    links.forEach(l => {
        const o = people[l.a === uid ? l.b : l.a];
        if (!o) return;
        const v = seen(o, today);
        if (l.status === 'ok') {
            const pairLive = l.pair_status === 'on' && l.pair_last >= dayBefore(today);
            v.pair = l.pair_status ? {
                status: l.pair_status, mine: l.pair_by === uid,
                days: pairLive ? l.pair_days : 0,
                // partners see each other's day even when progress isn't public
                today: l.pair_status === 'on' ? o.tday === today : null
            } : null;
            v.sent = { cheer: sentKey.has(o.uid + '|cheer'), nudge: sentKey.has(o.uid + '|nudge') };
            friends.push(v);
        } else if (l.by_uid === uid) outgoing.push({ code: o.code, name: o.name, avatar: o.avatar || '' });
        else incoming.push(v);
    });
    friends.sort((x, y) => (y.week || 0) - (x.week || 0) || (y.streak || 0) - (x.streak || 0));
    const notes = (await db.prepare(`SELECT n.kind, n.sticker, n.created, n.seen, p.code, p.name, p.avatar FROM notes n
            JOIN profiles p ON p.uid = n.from_uid WHERE n.to_uid = ? ORDER BY n.created DESC LIMIT ?`)
        .bind(uid, NOTES_SHOWN).all()).results || [];
    const mine = seen(Object.assign({}, me, { public: 1 }), today);
    mine.public = me.public === 1;
    return {
        me: mine, friends, incoming, outgoing,
        notes: notes.map(n => ({ kind: n.kind, sticker: n.sticker, created: n.created, seen: n.seen === 1, code: n.code, name: n.name, avatar: n.avatar || '' })),
        unseen: notes.filter(n => !n.seen).length,
        tday: today
    };
}

async function linkWith(db, uid, code) {
    const other = await db.prepare('SELECT * FROM profiles WHERE code = ?').bind(cleanCode(code)).first();
    if (!other) return { other: null, link: null };
    const [a, b] = pairOf(uid, other.uid);
    const link = await db.prepare('SELECT * FROM links WHERE a = ? AND b = ?').bind(a, b).first();
    return { other, link, a, b };
}

export async function friends(request, env, json, headers) {
    if (request.method !== 'POST') return json({ error: 'not_found' }, 404, headers);
    if (!env.FRIENDS) return json({ error: 'not_ready' }, 503, headers);
    const uid = await who(request, env);
    if (!uid) return json({ error: 'signin' }, 401, headers);
    if (env.FRIENDS_LIMITER) {
        const { success } = await env.FRIENDS_LIMITER.limit({ key: uid });
        if (!success) return json({ error: 'busy' }, 429, headers);
    }
    const body = await request.json().catch(() => ({}));
    const db = env.FRIENDS;
    const now = Date.now();
    const today = tdayOf(now);
    const fail = error => json({ error }, 400, headers);
    try {
        const me = await profileOf(db, uid);
        switch (body.action) {
        case 'get':
            break;
        case 'profile': {
            if (typeof body.public === 'boolean') {
                await db.prepare('UPDATE profiles SET public = ?, updated = ? WHERE uid = ?').bind(body.public ? 1 : 0, now, uid).run();
            }
            if (body.avatar && typeof body.avatar === 'object') {
                const av = int(body.avatar.icon, AVATAR_ICONS - 1) + ':' + int(body.avatar.colour, AVATAR_COLOURS - 1);
                await db.prepare('UPDATE profiles SET avatar = ?, updated = ? WHERE uid = ?').bind(av, now, uid).run();
            }
            if (typeof body.name === 'string') {
                const name = body.name.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
                if (!name) return fail('bad_name');
                if (name !== me.name) {
                    const verdict = await moderate(name, '(a display name on a friends list)', env);
                    if (!verdict) return fail('moderation_busy');
                    if (!verdict.allowed) return fail('blocked');
                    await db.prepare('UPDATE profiles SET name = ?, updated = ? WHERE uid = ?').bind(name, now, uid).run();
                }
            }
            break;
        }
        case 'ping': {
            const langs = String(body.langs || '').split(',').filter(l => LANGS.includes(l)).slice(0, 8).join(',');
            const practised = body.practised === true;
            await db.prepare(`UPDATE profiles SET streak = ?, week_key = ?, week_words = ?, langs = ?,
                    tday = CASE WHEN ? THEN ? ELSE tday END, updated = ? WHERE uid = ?`)
                .bind(int(body.streak, 100000), weekKey(today), int(body.week, 1000000), langs, practised ? 1 : 0, today, now, uid).run();
            if (practised && me.tday !== today) {
                // 🤝: a day both practised — partners who already practised today move on
                const pairs = (await db.prepare(`SELECT l.a, l.b, l.pair_days, l.pair_last, p.tday AS other_day FROM links l
                        JOIN profiles p ON p.uid = CASE WHEN l.a = ? THEN l.b ELSE l.a END
                        WHERE (l.a = ? OR l.b = ?) AND l.pair_status = 'on'`).bind(uid, uid, uid).all()).results || [];
                const ups = pairs.filter(p => p.other_day === today && p.pair_last !== today).map(p =>
                    db.prepare('UPDATE links SET pair_days = ?, pair_last = ? WHERE a = ? AND b = ?')
                        .bind(p.pair_last === dayBefore(today) ? p.pair_days + 1 : 1, today, p.a, p.b));
                if (ups.length) await db.batch(ups);
            }
            break;
        }
        case 'add': {
            const { other, link, a, b } = await linkWith(db, uid, body.code);
            if (!other) return fail('not_found');
            if (other.uid === uid) return fail('self');
            if (link && (link.status === 'ok' || link.by_uid === uid)) return fail('already');
            if (link) {                       // they had asked me: that's a yes
                await db.prepare("UPDATE links SET status = 'ok' WHERE a = ? AND b = ?").bind(a, b).run();
                break;
            }
            const n = await db.prepare('SELECT COUNT(*) AS n FROM links WHERE a = ? OR b = ?').bind(uid, uid).first();
            if (n.n >= FRIENDS_MAX) return fail('full');
            const recent = await db.prepare('SELECT COUNT(*) AS n FROM links WHERE by_uid = ? AND created > ?').bind(uid, now - DAY_MS).first();
            if (recent.n >= ADDS_PER_DAY) return fail('too_many');
            await db.prepare("INSERT INTO links (a, b, status, by_uid, created) VALUES (?, ?, 'pending', ?, ?)").bind(a, b, uid, now).run();
            break;
        }
        case 'respond': {
            const { link, a, b } = await linkWith(db, uid, body.code);
            if (!link || link.status !== 'pending' || link.by_uid === uid) break;
            if (body.accept === true) await db.prepare("UPDATE links SET status = 'ok' WHERE a = ? AND b = ?").bind(a, b).run();
            else await db.prepare('DELETE FROM links WHERE a = ? AND b = ?').bind(a, b).run();
            break;
        }
        case 'remove': {
            const { link, a, b } = await linkWith(db, uid, body.code);
            if (link) await db.prepare('DELETE FROM links WHERE a = ? AND b = ?').bind(a, b).run();
            break;
        }
        case 'pair': {
            const { link, a, b } = await linkWith(db, uid, body.code);
            if (!link || link.status !== 'ok') return fail('not_found');
            const set = (status, by) => db.prepare("UPDATE links SET pair_status = ?, pair_by = ?, pair_days = 0, pair_last = '' WHERE a = ? AND b = ?")
                .bind(status, by, a, b).run();
            if (body.op === 'leave') await set('', '');
            else if (link.pair_status === 'pending' && link.pair_by !== uid) await set('on', link.pair_by);   // invite or accept
            else if (body.op === 'invite' && !link.pair_status) {
                const n = await db.prepare("SELECT COUNT(*) AS n FROM links WHERE (a = ? OR b = ?) AND pair_status != ''").bind(uid, uid).first();
                if (n.n >= PAIRS_MAX) return fail('full');
                await set('pending', uid);
            }
            break;
        }
        case 'send': {
            const { other, link } = await linkWith(db, uid, body.code);
            if (!link || link.status !== 'ok') return fail('not_found');
            const kind = body.kind === 'nudge' ? 'nudge' : 'cheer';
            if (kind === 'nudge' && other.tday === today) return fail('practised');
            const res = await db.prepare('INSERT OR IGNORE INTO notes (to_uid, from_uid, kind, sticker, tday, created) VALUES (?, ?, ?, ?, ?, ?)')
                .bind(other.uid, uid, kind, int(body.sticker, STICKERS - 1), today, now).run();
            if (!res.meta || !res.meta.changes) return fail('already');
            // a nudge also reaches the friend's phone when they turned reminders on (src/push.js)
            if (kind === 'nudge') await pushNudge(env, other.uid, me.name, int(body.sticker, STICKERS - 1));
            break;
        }
        case 'seen':
            await db.prepare('UPDATE notes SET seen = 1 WHERE to_uid = ? AND seen = 0').bind(uid).run();
            break;
        default:
            return fail('bad_request');
        }
        return json(await stateOf(db, uid), 200, headers);
    } catch (e) {
        console.log('friends failed', String(e && e.stack || e));
        return json({ error: 'server' }, 500, headers);
    }
}
