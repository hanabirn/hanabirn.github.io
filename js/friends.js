/* ===== 好友 (friends), owner's plan B 2026-10-23 =====
   The hanabi-assistant Worker keeps it (worker/assistant/src/friends.js, D1): friend codes,
   requests, a weekly leaderboard by words practised, cheers / nudges from fixed stickers
   (no free text, so nothing to moderate except the display name) and 🤝 friend streaks
   (both practise on a Taiwan day). Needs a site account (js/account.js). The page has two
   layouts: two columns on computers, three tabs on phones (friendsPhone()).
   The device reports its own numbers (friendsPing) after practice — only once this
   account has opened the page (friends_on), so nobody gets a profile without asking. */
const FRIENDS_API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? 'http://localhost:8787/friends'
    : 'https://hanabi-assistant.osu-collection-hanabi.workers.dev/friends';
// avatars are picked from these (owner's pick C, 2026-10-23: no uploads, so nothing to moderate);
// stored as "icon:colour" — keep the counts in step with AVATAR_ICONS / AVATAR_COLOURS in the Worker
const FRIEND_AVATARS = ['🐱', '🐶', '🐰', '🐻', '🐼', '🦊', '🐨', '🐯', '🐸', '🐧', '🦉', '🐢',
    '🌸', '🌻', '🍀', '🍙', '🍣', '🍓', '☕', '🎮', '🎵', '📚', '⭐', '🌙'];
const FRIEND_AVATAR_COLOURS = ['#c8553d', '#3d6c8c', '#8a5a9c', '#b08a2e', '#5b6b4e', '#a3485e'];
const FRIEND_STICKERS = { cheer: ['💪', '🎉', '🔥', '📚', '🌸', '🏆'], nudge: ['🔔', '🤝', '⏰', '🌙', '📚', '🌸'] };
const FRIENDS_PING_MS = 30000;        // after practice, wait this long for more answers
const FRIENDS_NOTES_PHONE = 1;        // the phone shows the newest note, the rest behind 全部

let friendsState = null;              // the Worker's answer (me, friends, incoming, outgoing, notes …)
let friendsBusy = false;
let friendsError = '';                // an i18n key shown above the page
let friendsToast = '';
let friendsTab = 'board';             // phones: board | pairs | add
let friendsSort = 'week';             // week | streak
let friendsPick = null;               // { code, kind } — the sticker menu open under a row
let friendsRenaming = false;
let friendsRemoveArm = '';            // the code whose 刪除 was pressed once
let friendsManage = false;            // the leaderboard shows 刪除 on each friend
let friendsAvatarOpen = false;        // my card shows the avatar picker
let friendsAllNotes = false;
let friendsPendingCode = '';          // from a shared link (?friend=CODE)
let friendsPingTimer = 0;

// local tests only: on localhost, localStorage.friends_test_user = 'alice' stands in for a signed-in
// account (the local Worker accepts it when .dev.vars has FRIENDS_TEST=1; the real one never does)
function friendsTestUser() {
    if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return '';
    try { return localStorage.getItem('friends_test_user') || ''; } catch { return ''; }
}
function friendsUser() {
    if (friendsTestUser()) return { test: friendsTestUser() };
    return typeof acctUser !== 'undefined' ? acctUser : null;
}
function friendsPhone() { return window.matchMedia && matchMedia('(max-width: 768px)').matches; }
function friendsCodeFmt(c) { return c ? c.slice(0, 4) + '-' + c.slice(4) : ''; }
function friendsName(p) { return p && p.name ? p.name : t('fr_default_name', { code: p ? p.code.slice(0, 4) : '' }); }

async function friendsCall(action, extra) {
    const user = friendsUser();
    if (!user) return null;
    const auth = {};
    if (user.test) auth['X-Test-User'] = user.test;
    else {
        try { auth.Authorization = 'Bearer ' + await user.getIdToken(); } catch { return null; }
    }
    const res = await fetch(FRIENDS_API, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, auth),
        body: JSON.stringify(Object.assign({ action }, extra || {}))
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || String(res.status));
    friendsState = data;
    try {
        localStorage.setItem('friends_on', '1');
        localStorage.setItem('friends_unseen', String(data.unseen || 0));
    } catch {}
    if (typeof renderHome === 'function' && document.body.dataset.page === 'home') renderHome();
    return data;
}

/* the numbers this device reports: the site's streak, words this week (Monday on), languages */
function friendsMyNumbers() {
    const act = typeof getDailyActivity === 'function' ? getDailyActivity() : {};
    const now = new Date(); now.setHours(12, 0, 0, 0);
    const monday = new Date(now); monday.setDate(now.getDate() - (now.getDay() + 6) % 7);
    let week = 0;
    for (const d = new Date(monday); d <= now; d.setDate(d.getDate() + 1)) week += act[activityDayKey(d.getTime())] || 0;
    const langs = [typeof learnLang === 'function' ? learnLang() : ''].concat(typeof learnLangRecent === 'function' ? learnLangRecent() : []);
    return {
        streak: typeof calcStreak === 'function' ? calcStreak(getQuizRecords()) : 0,
        week,
        langs: [...new Set(langs.filter(Boolean))].join(','),
        practised: (act[activityDayKey(Date.now())] || 0) > 0
    };
}

/* logDailyActivity() (js/quiz.js) calls this: report a little later, once a burst of answers is over */
function friendsActivity() {
    try { if (!localStorage.getItem('friends_on')) return; } catch { return; }
    if (!friendsUser()) return;
    clearTimeout(friendsPingTimer);
    friendsPingTimer = setTimeout(() => {
        friendsCall('ping', friendsMyNumbers()).then(() => {
            if (document.body.dataset.page === 'friends') renderFriends();
        }).catch(() => {});
    }, FRIENDS_PING_MS);
}

async function friendsDo(action, extra, okKey) {
    if (friendsBusy) return;
    friendsBusy = true;
    friendsError = '';
    try {
        await friendsCall(action, extra);
        if (okKey) friendsToastShow(okKey);
    } catch (e) {
        const known = ['not_found', 'self', 'already', 'full', 'too_many', 'blocked', 'moderation_busy', 'practised', 'busy', 'bad_name'];
        friendsError = 'fr_err_' + (known.includes(e.message) ? e.message : 'server');
    }
    friendsBusy = false;
    renderFriends();
}

function friendsToastShow(key) {
    friendsToast = key;
    setTimeout(() => { if (friendsToast === key) { friendsToast = ''; renderFriends(); } }, 2500);
}

/* switchPage() calls this; also on sign-in changes and resizes across the phone width */
function renderFriends() {
    const root = document.getElementById('friends-root');
    if (!root) return;
    const head = `<h3 class="fr-title">${escHtml(t('fr_title'))}</h3>`;
    const user = friendsUser();
    if (!user) {
        // a device that was signed in: load Firebase first
        try { if (localStorage.getItem('acct_signed_in') && typeof acctLoadSdk === 'function') acctLoadSdk().catch(() => {}); } catch {}
        root.innerHTML = head + `<div class="fr-gate">${mascotHtml('bust')}<b>${escHtml(t('fr_signin_title'))}</b>
            <p>${escHtml(t('fr_signin_text'))}</p>
            <button type="button" class="next-btn" onclick="openAccount()">${escHtml(t('fr_signin_btn'))}</button></div>`;
        return;
    }
    if (!friendsState) {
        root.innerHTML = head + `<p class="fr-loading">${escHtml(friendsError ? t(friendsError) : t('fr_loading'))}</p>`;
        if (!friendsBusy && !friendsError) {
            friendsBusy = true;
            friendsCall('ping', friendsMyNumbers())
                .catch(e => { friendsError = 'fr_err_' + (e.message === 'busy' ? 'busy' : 'server'); })
                .finally(() => { friendsBusy = false; renderFriends(); });
        }
        return;
    }
    // a shared link's code: fill the box (and open its tab on phones)
    const msg = friendsError ? `<p class="fr-msg fr-msg-err" role="alert">${escHtml(t(friendsError))}</p>`
        : friendsToast ? `<p class="fr-msg" role="status">${escHtml(t(friendsToast))}</p>` : '';
    if (friendsPhone()) {
        const s = friendsState;
        const notes = s.notes.slice(0, friendsAllNotes ? s.notes.length : FRIENDS_NOTES_PHONE);
        const tabs = [['board', 'fr_tab_board', 0], ['pairs', 'fr_tab_pairs', 0], ['add', 'fr_tab_add', s.incoming.length]];
        root.innerHTML = head + msg + friendsMeHtml(true)
            + (s.notes.length ? `<div class="fr-notes-phone">${notes.map(friendsNoteHtml).join('')}
                ${s.notes.length > FRIENDS_NOTES_PHONE ? `<button type="button" class="fr-link" onclick="friendsAllNotes = !friendsAllNotes; renderFriends()">${escHtml(friendsAllNotes ? t('fr_less') : t('fr_all_notes', { n: s.notes.length }))}</button>` : ''}</div>` : '')
            + `<div class="fr-tabs" role="tablist">${tabs.map(([id, key, n]) => `<button type="button" role="tab" aria-selected="${friendsTab === id}" class="${friendsTab === id ? 'on' : ''}" onclick="friendsTab='${id}'; friendsPick = null; renderFriends()">${escHtml(t(key))}${n ? `<i>${n}</i>` : ''}</button>`).join('')}</div>`
            + (friendsTab === 'board' ? friendsBoardHtml() : friendsTab === 'pairs' ? friendsPairsHtml() : friendsRequestsHtml() + friendsAddHtml());
    } else {
        root.innerHTML = head + msg + `<div class="fr-cols">
            <div class="fr-col">${friendsMeHtml(false)}${friendsPairsHtml()}${friendsNotesHtml()}</div>
            <div class="fr-col">${friendsRequestsHtml()}${friendsBoardHtml()}</div>
        </div>`;
    }
    if (friendsPendingCode) {
        const box = document.getElementById('fr-add-code');
        if (box) { box.value = friendsCodeFmt(friendsPendingCode); friendsPendingCode = ''; }
    }
    // the notes have been seen once they are on screen
    if (friendsState.unseen && !friendsBusy) {
        friendsCall('seen').catch(() => {});
    }
}

function friendsMeHtml(phone) {
    const me = friendsState.me;
    const code = friendsCodeFmt(me.code);
    if (friendsRenaming) {
        return `<div class="fr-box"><label class="fr-label" for="fr-name">${escHtml(t('fr_rename'))}</label>
            <div class="fr-add"><input id="fr-name" maxlength="20" value="${escHtml(me.name)}" placeholder="${escHtml(t('fr_name_ph'))}"
                onkeydown="if (event.key === 'Enter') friendsSaveName()">
            <button type="button" class="fr-btn red" onclick="friendsSaveName()">${escHtml(t('fr_save'))}</button>
            <button type="button" class="fr-btn" onclick="friendsRenaming = false; renderFriends()">${escHtml(t('fr_cancel'))}</button></div></div>`;
    }
    const sub = `🔥 ${escHtml(t('fr_days', { n: me.streak || 0 }))}${phone ? ' · ' + escHtml(code) : ''}`;
    if (phone) {
        return `<div class="fr-me-strip">${friendsMyAvatar()}<span class="fr-grow"><b>${escHtml(friendsName(me))}</b><small>${sub}</small></span>
            <button type="button" class="fr-btn" onclick="friendsShare()">${escHtml(t('fr_share'))}</button>
            <button type="button" class="fr-btn" onclick="friendsRenaming = true; renderFriends()" aria-label="${escHtml(t('fr_rename'))}">✎</button></div>
            ${friendsAvatarPickerHtml()}${friendsPublicHtml()}`;
    }
    return `<div class="fr-box">
        <div class="fr-me">${friendsMyAvatar()}<span class="fr-grow"><b>${escHtml(friendsName(me))}</b><small>${friendsLangs(me.langs)} ${sub}</small></span>
            <button type="button" class="fr-btn" onclick="friendsRenaming = true; renderFriends()">${escHtml(t('fr_rename'))}</button></div>
        ${friendsAvatarPickerHtml()}
        <div class="fr-code"><span class="fr-sub">${escHtml(t('fr_my_code'))}</span><code>${escHtml(code)}</code>
            <button type="button" class="fr-btn" onclick="friendsCopy()">${escHtml(t('fr_copy'))}</button>
            <button type="button" class="fr-btn" onclick="friendsShare()">${escHtml(t('fr_share'))}</button></div>
        ${friendsAddRowHtml()}
        ${friendsPublicHtml()}
    </div>`;
}

function friendsPublicHtml() {
    const on = friendsState.me.public;
    return `<label class="fr-toggle"><input type="checkbox" ${on ? 'checked' : ''} onchange="friendsDo('profile', { public: this.checked })">
        <span><b>${escHtml(t('fr_public'))}</b><small>${escHtml(t('fr_public_hint'))}</small></span></label>`;
}

// a picked icon on its colour, else the name's first letter on a colour from the code
function friendsAvatar(p) {
    const m = /^(\d+):(\d+)$/.exec(p.avatar || '');
    if (m && FRIEND_AVATARS[m[1]]) {
        return `<span class="fr-av fr-av-icon" style="background:${FRIEND_AVATAR_COLOURS[m[2]] || FRIEND_AVATAR_COLOURS[0]}" aria-hidden="true">${FRIEND_AVATARS[m[1]]}</span>`;
    }
    const n = [...(p.code || '')].reduce((s, ch) => s + ch.charCodeAt(0), 0);
    const ch = [...friendsName(p).replace(/\s/g, '')][0] || '?';
    return `<span class="fr-av" style="background:${FRIEND_AVATAR_COLOURS[n % FRIEND_AVATAR_COLOURS.length]}" aria-hidden="true">${escHtml(ch.toUpperCase())}</span>`;
}

// my avatar is a button that opens the picker
function friendsMyAvatar() {
    return `<button type="button" class="fr-av-btn" onclick="friendsAvatarOpen = !friendsAvatarOpen; renderFriends()"
        title="${escHtml(t('fr_avatar'))}" aria-expanded="${friendsAvatarOpen}">${friendsAvatar(friendsState.me)}<span class="fr-av-edit" aria-hidden="true">✎</span></button>`;
}

function friendsAvatarPickerHtml() {
    if (!friendsAvatarOpen) return '';
    const m = /^(\d+):(\d+)$/.exec(friendsState.me.avatar || '');
    const icon = m ? +m[1] : -1, colour = m ? +m[2] : 0;
    return `<div class="fr-av-picker"><p class="fr-sub">${escHtml(t('fr_avatar'))}</p>
        <div class="fr-av-colours">${FRIEND_AVATAR_COLOURS.map((c, i) => `<button type="button" class="${i === colour ? 'on' : ''}" style="background:${c}"
            aria-label="${i + 1}" aria-pressed="${i === colour}" onclick="friendsSetAvatar(${icon < 0 ? 0 : icon}, ${i})"></button>`).join('')}</div>
        <div class="fr-av-grid">${FRIEND_AVATARS.map((e, i) => `<button type="button" class="${i === icon ? 'on' : ''}" style="background:${FRIEND_AVATAR_COLOURS[colour]}"
            aria-pressed="${i === icon}" onclick="friendsSetAvatar(${i}, ${colour})">${e}</button>`).join('')}</div></div>`;
}

function friendsSetAvatar(icon, colour) {
    friendsState.me.avatar = icon + ':' + colour;          // at once; the Worker answer follows
    friendsDo('profile', { avatar: { icon, colour } });
}

function friendsLangs(langs) {
    return String(langs || '').split(',').filter(Boolean).map(l => `<span class="fr-lang">${escHtml(t('dict_lang_' + l))}</span>`).join('');
}

function friendsBoardHtml() {
    const s = friendsState;
    const me = Object.assign({}, s.me, { isMe: true, public: true });
    const rows = s.friends.concat([me]);
    const key = friendsSort === 'streak' ? 'streak' : 'week';
    rows.sort((a, b) => (b[key] == null ? -1 : b[key]) - (a[key] == null ? -1 : a[key]));
    const medal = ['🥇', '🥈', '🥉'];
    const list = rows.map((f, i) => {
        const pub = f.public;
        const stat = !pub ? `<span>${escHtml(t('fr_private'))}</span>`
            : `<span>🔥 ${escHtml(t('fr_days', { n: f.streak || 0 }))}</span>`
              + (f.pair && f.pair.status === 'on' ? `<span>🤝 ${escHtml(t('fr_days', { n: f.pair.days }))}</span>` : '')
              + (f.isMe ? '' : f.today ? `<span>${escHtml(t('fr_today_done'))}</span>` : `<span class="fr-red">${escHtml(t('fr_today_not'))}</span>`);
        const pairBtn = f.isMe || f.pair ? '' : `<button type="button" class="fr-link" title="${escHtml(t('fr_pair_invite_title'))}" onclick="friendsDo('pair', { code: '${f.code}', op: 'invite' }, 'fr_pair_sent')">${escHtml(t('fr_pair_invite'))}</button>`;
        const kind = pub && f.today === false ? 'nudge' : 'cheer';
        const sent = f.sent && f.sent[kind];
        const act = f.isMe ? '' : friendsManage
            ? `<button type="button" class="fr-btn${friendsRemoveArm === f.code ? ' red' : ''}" onclick="friendsRemove('${f.code}')">${escHtml(t(friendsRemoveArm === f.code ? 'fr_remove_again' : 'fr_remove'))}</button>`
            : `<button type="button" class="fr-act${kind === 'nudge' ? ' nudge' : ''}" ${sent ? 'disabled' : ''}
            title="${escHtml(t(sent ? 'fr_sent_already' : kind === 'nudge' ? 'fr_nudge_btn' : 'fr_cheer_btn'))}"
            onclick="friendsPick = friendsPick && friendsPick.code === '${f.code}' ? null : { code: '${f.code}', kind: '${kind}' }; renderFriends()">${kind === 'nudge' ? '🔔' : '📣'}</button>`;
        const pick = friendsPick && friendsPick.code === f.code ? friendsStickersHtml(f, friendsPick.kind) : '';
        const val = f[key] == null ? '—' : f[key];
        return `<li class="fr-row${f.isMe ? ' me' : ''}">
            <span class="fr-rank">${pub && val !== '—' && i < 3 ? medal[i] : i + 1}</span>${friendsAvatar(f)}
            <span class="fr-grow"><b>${escHtml(friendsName(f))}${f.isMe ? escHtml(t('fr_me')) : ''}</b><small class="fr-stats">${stat}${pairBtn}</small></span>
            <span class="fr-val">${escHtml(String(val))}<small>${escHtml(t(key === 'week' ? 'fr_words' : 'fr_days_unit'))}</small></span>${act}
        </li>${pick}`;
    }).join('');
    return `<div class="fr-box">
        <div class="fr-board-head"><h4>${escHtml(t('fr_board'))}</h4>
            <button type="button" class="pc-chip${key === 'week' ? ' on' : ''}" onclick="friendsSort='week'; renderFriends()">${escHtml(t('fr_by_week'))}</button>
            <button type="button" class="pc-chip${key === 'streak' ? ' on' : ''}" onclick="friendsSort='streak'; renderFriends()">${escHtml(t('fr_by_streak'))}</button>
            ${s.friends.length ? `<button type="button" class="fr-link fr-manage-btn" aria-pressed="${friendsManage}" onclick="friendsManage = !friendsManage; friendsRemoveArm = ''; friendsPick = null; renderFriends()">${escHtml(t(friendsManage ? 'fr_manage_done' : 'fr_manage'))}</button>` : ''}</div>
        ${s.friends.length ? `<ol class="fr-board">${list}</ol>` : `<p class="fr-empty">${escHtml(t('fr_board_empty'))}</p>`}
        <p class="fr-sub">${escHtml(t('fr_board_note'))}</p>
    </div>`;
}

function friendsStickersHtml(f, kind) {
    return `<li class="fr-pop"><p>${escHtml(t(kind === 'nudge' ? 'fr_nudge_pick' : 'fr_cheer_pick', { name: friendsName(f) }))}</p>
        <div class="fr-stickers">${FRIEND_STICKERS[kind].map((e, i) => `<button type="button" onclick="friendsSend('${f.code}', '${kind}', ${i})"><span aria-hidden="true">${e}</span>${escHtml(t('fr_' + kind + '_' + i))}</button>`).join('')}</div></li>`;
}

function friendsSend(code, kind, sticker) {
    friendsPick = null;
    friendsDo('send', { code, kind, sticker }, 'fr_sent');
}

function friendsPairsHtml() {
    const pairs = friendsState.friends.filter(f => f.pair);
    const yes = '✓', no = escHtml(t('fr_not_yet'));
    const myToday = friendsMyNumbers().practised;
    const rows = pairs.map(f => {
        const p = f.pair;
        let line, btn;
        if (p.status === 'on') {
            line = escHtml(t('fr_pair_today', { me: myToday ? yes : no, name: friendsName(f), them: p.today ? yes : no }));
            btn = !p.today && !(f.sent && f.sent.nudge) ? `<button type="button" class="fr-btn" onclick="friendsPick = { code: '${f.code}', kind: 'nudge' }; friendsTab = 'board'; renderFriends()">🔔 ${escHtml(t('fr_nudge_short'))}</button>` : '';
        } else if (p.mine) {
            line = escHtml(t('fr_pair_wait'));
            btn = `<button type="button" class="fr-btn" onclick="friendsDo('pair', { code: '${f.code}', op: 'leave' })">${escHtml(t('fr_withdraw'))}</button>`;
        } else {
            line = escHtml(t('fr_pair_asked'));
            btn = `<button type="button" class="fr-btn red" onclick="friendsDo('pair', { code: '${f.code}', op: 'accept' })">${escHtml(t('fr_pair_accept'))}</button>`;
        }
        const leave = p.status === 'on' ? `<button type="button" class="fr-link" onclick="friendsDo('pair', { code: '${f.code}', op: 'leave' })">${escHtml(t('fr_pair_leave'))}</button>` : '';
        return `<div class="fr-req">${friendsAvatar(f)}<span class="fr-grow"><b>${escHtml(friendsName(f))}${p.status === 'on' ? ' · 🤝 ' + escHtml(t('fr_days', { n: p.days })) : ''}</b>
            <small class="${p.status === 'on' && !p.today ? 'fr-red' : ''}">${line}</small></span>${btn}${leave}</div>`;
    }).join('');
    const on = pairs.length;
    return `<div class="fr-box"><h4>${escHtml(t('fr_pairs'))} <span class="fr-sub">${escHtml(t('fr_count', { n: on + ' / 5' }))}</span></h4>
        ${rows || `<p class="fr-empty">${escHtml(t('fr_pair_none'))}</p>`}
        <p class="fr-sub">${escHtml(t('fr_pairs_hint'))}</p></div>`;
}

function friendsNoteHtml(n) {
    const when = typeof practiceWhen === 'function' ? practiceWhen(n.created) : '';
    const text = t('fr_' + n.kind + '_' + n.sticker);
    return `<div class="fr-note${n.kind === 'nudge' ? ' nudge' : ''}${n.seen ? '' : ' new'}"><span class="fr-note-e" aria-hidden="true">${FRIEND_STICKERS[n.kind][n.sticker] || '📣'}</span>
        <span>${escHtml(t(n.kind === 'nudge' ? 'fr_note_nudge' : 'fr_note_cheer', { name: friendsName(n), text }))}<small>${escHtml(when)}</small></span></div>`;
}

function friendsNotesHtml() {
    const notes = friendsState.notes;
    const shown = friendsAllNotes ? notes : notes.slice(0, 3);
    return `<div class="fr-box"><h4>${escHtml(t('fr_notes'))}</h4>
        ${notes.length ? shown.map(friendsNoteHtml).join('') : `<p class="fr-empty">${escHtml(t('fr_notes_empty'))}</p>`}
        ${notes.length > 3 ? `<button type="button" class="fr-link" onclick="friendsAllNotes = !friendsAllNotes; renderFriends()">${escHtml(friendsAllNotes ? t('fr_less') : t('fr_all_notes', { n: notes.length }))}</button>` : ''}
    </div>`;
}

// the box for a friend's code (in my card on computers, the 加好友 tab on phones)
function friendsAddRowHtml() {
    return `<div class="fr-add-row"><span class="fr-sub">${escHtml(t('fr_add'))}</span>
        <div class="fr-add"><input id="fr-add-code" maxlength="9" autocomplete="off" autocapitalize="characters" placeholder="${escHtml(t('fr_add_ph'))}"
            aria-label="${escHtml(t('fr_add'))}" onkeydown="if (event.key === 'Enter') friendsAdd()">
        <button type="button" class="fr-btn red" onclick="friendsAdd()">${escHtml(t('fr_add_btn'))}</button></div></div>`;
}

function friendsAddHtml() {
    return `<div class="fr-box"><h4>${escHtml(t('fr_add'))}</h4>${friendsAddRowHtml()}
        <p class="fr-sub">${escHtml(t('fr_my_code') + t('fr_colon'))}<b>${escHtml(friendsCodeFmt(friendsState.me.code))}</b> <button type="button" class="fr-link" onclick="friendsCopy()">${escHtml(t('fr_copy'))}</button></p>
    </div>`;
}

function friendsAdd() {
    const box = document.getElementById('fr-add-code');
    const code = box ? box.value.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
    if (code.length !== 8) { friendsError = 'fr_err_not_found'; renderFriends(); return; }
    friendsDo('add', { code }, 'fr_add_sent');
}

function friendsRequestsHtml() {
    const s = friendsState;
    const inc = s.incoming.map(f => `<div class="fr-req">${friendsAvatar(f)}<span class="fr-grow"><b>${escHtml(friendsName(f))}</b><small>${escHtml(friendsCodeFmt(f.code))}</small></span>
        <button type="button" class="fr-btn red" onclick="friendsDo('respond', { code: '${f.code}', accept: true })">${escHtml(t('fr_accept'))}</button>
        <button type="button" class="fr-btn" onclick="friendsDo('respond', { code: '${f.code}', accept: false })">${escHtml(t('fr_decline'))}</button></div>`).join('');
    const out = s.outgoing.map(f => `<div class="fr-req">${friendsAvatar(f)}<span class="fr-grow"><b>${escHtml(friendsName(f))}</b><small>${escHtml(t('fr_waiting'))}</small></span>
        <button type="button" class="fr-btn" onclick="friendsDo('remove', { code: '${f.code}' })">${escHtml(t('fr_withdraw'))}</button></div>`).join('');
    return (inc ? `<div class="fr-box fr-requests"><h4>${escHtml(t('fr_requests') + t('fr_count', { n: s.incoming.length }))}</h4>${inc}</div>` : '')
        + (out ? `<div class="fr-box"><h4>${escHtml(t('fr_outgoing'))}</h4>${out}</div>` : '');
}

function friendsRemove(code) {
    if (friendsRemoveArm !== code) { friendsRemoveArm = code; renderFriends(); return; }
    friendsRemoveArm = '';
    friendsDo('remove', { code });
}

async function friendsSaveName() {
    const box = document.getElementById('fr-name');
    const name = box ? box.value.trim() : '';
    if (!name) return;
    friendsRenaming = false;
    await friendsDo('profile', { name });
}

function friendsLink() {
    return 'https://hanabirn.xyz/?friend=' + friendsState.me.code;
}

function friendsCopy() {
    const text = friendsCodeFmt(friendsState.me.code);
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
        .then(() => { friendsToastShow('fr_copied'); renderFriends(); }).catch(() => {});
}

function friendsShare() {
    const text = t('fr_share_text', { code: friendsCodeFmt(friendsState.me.code) });
    if (navigator.share) { navigator.share({ title: t('title'), text, url: friendsLink() }).catch(() => {}); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(text + ' ' + friendsLink()) : Promise.reject())
        .then(() => { friendsToastShow('fr_link_copied'); renderFriends(); }).catch(() => {});
}

/* account.js calls this when someone signs in or out */
function friendsOnUser() {
    friendsState = null;
    friendsError = '';
    if (!friendsUser()) { try { localStorage.removeItem('friends_unseen'); } catch {} }
    if (document.body.dataset.page === 'friends') renderFriends();
}

/* the home page's card: cheers / nudges not yet read (from the last answer this device got) */
function friendsUnseen() {
    try { return parseInt(localStorage.getItem('friends_unseen') || '0', 10) || 0; } catch { return 0; }
}

// a shared link: https://hanabirn.xyz/?friend=CODE opens the page with the code filled in
document.addEventListener('DOMContentLoaded', () => {
    const p = new URLSearchParams(location.search);
    const code = (p.get('friend') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length === 8) {
        friendsPendingCode = code;
        friendsTab = 'add';
        p.delete('friend');
        history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '') + location.hash);
        setTimeout(() => switchPage('friends', null), 300);
    }
    let wasPhone = friendsPhone();
    window.addEventListener('resize', () => {
        if (friendsPhone() !== wasPhone) { wasPhone = friendsPhone(); if (document.body.dataset.page === 'friends') renderFriends(); }
    });
});
