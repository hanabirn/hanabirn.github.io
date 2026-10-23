-- 好友 (src/friends.js), D1 database hanabi-friends. Apply with:
--   npx wrangler d1 execute hanabi-friends --remote --file=schema.sql   (add --local for wrangler dev)
-- Days are counted in Taiwan time (UTC+8, "tday" = YYYY-MM-DD) so two friends agree on "today".

-- one row per site account that opened the 好友 page
CREATE TABLE IF NOT EXISTS profiles (
    uid TEXT PRIMARY KEY,              -- Firebase uid, never sent to other visitors
    code TEXT NOT NULL UNIQUE,         -- the friend code, e.g. HANA7K3P (shown as HANA-7K3P)
    name TEXT NOT NULL,                -- display name (moderated), not the Google name
    avatar TEXT NOT NULL DEFAULT '',   -- a picked icon "icon:colour" (FRIEND_AVATARS on the site), '' = initial
    public INTEGER NOT NULL DEFAULT 0, -- 1 = friends may see my progress
    langs TEXT NOT NULL DEFAULT '',    -- learning languages, e.g. "ja,ko"
    streak INTEGER NOT NULL DEFAULT 0, -- the site's own streak, as the device reported it
    week_key TEXT NOT NULL DEFAULT '', -- the Monday (Taiwan time) week_words belongs to
    week_words INTEGER NOT NULL DEFAULT 0,
    tday TEXT NOT NULL DEFAULT '',     -- the last Taiwan day with practice
    created INTEGER NOT NULL,
    updated INTEGER NOT NULL DEFAULT 0
);

-- a friendship or a request; a < b (codes' uids sorted), "by" sent the request
CREATE TABLE IF NOT EXISTS links (
    a TEXT NOT NULL,
    b TEXT NOT NULL,
    status TEXT NOT NULL,              -- 'pending' | 'ok'
    by_uid TEXT NOT NULL,
    created INTEGER NOT NULL,
    pair_status TEXT NOT NULL DEFAULT '',  -- '' | 'pending' | 'on'   (🤝 friend streak)
    pair_by TEXT NOT NULL DEFAULT '',
    pair_days INTEGER NOT NULL DEFAULT 0,
    pair_last TEXT NOT NULL DEFAULT '',    -- the last Taiwan day both practised
    PRIMARY KEY (a, b)
);
CREATE INDEX IF NOT EXISTS links_b ON links (b);

-- cheers and nudges: one of each kind per sender, receiver and day
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    to_uid TEXT NOT NULL,
    from_uid TEXT NOT NULL,
    kind TEXT NOT NULL,                -- 'cheer' | 'nudge'
    sticker INTEGER NOT NULL,
    tday TEXT NOT NULL,
    created INTEGER NOT NULL,
    seen INTEGER NOT NULL DEFAULT 0,
    UNIQUE (from_uid, to_uid, kind, tday)
);
CREATE INDEX IF NOT EXISTS notes_to ON notes (to_uid, created);

-- 每日提醒 (src/push.js): one row per device that turned reminders on
CREATE TABLE IF NOT EXISTS push_subs (
    id TEXT PRIMARY KEY,               -- sha-256 of the endpoint (first 32 hex)
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    hour INTEGER NOT NULL DEFAULT 20,  -- 19–22, the device's local time
    tz TEXT NOT NULL DEFAULT 'Asia/Taipei',
    lang TEXT NOT NULL DEFAULT 'zh',
    streak INTEGER NOT NULL DEFAULT 0,
    last_practice TEXT NOT NULL DEFAULT '',   -- the device's local date it last practised
    last_sent TEXT NOT NULL DEFAULT '',       -- the local date of the last reminder
    uid TEXT,                          -- a signed-in account: friends' nudges reach it
    tests INTEGER NOT NULL DEFAULT 0,
    test_at INTEGER NOT NULL DEFAULT 0,
    created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS push_subs_uid ON push_subs (uid);
