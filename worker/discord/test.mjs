// Local end-to-end test: runs the Worker in `wrangler dev` with a throw-away key pair,
// serves this repo's data/ on localhost:8791 as the "site" (a keep-alive Node server:
// workerd keeps losing connections to python's HTTP/1.0 http.server), and stands in for
// Discord on localhost:8790 to catch the edited replies. Plays a whole /quiz, /grammar
// rounds and a few /dictionary look-ups (those also reach Wiktionary and Tatoeba).
//   node test.mjs [path to wrangler]
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { webcrypto as crypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const site = http.createServer(async (req, res) => {
    const path = decodeURIComponent(req.url.split('?')[0]);
    if (!/^\/data\/[\w/.-]+\.json$/.test(path) || path.includes('..')) return res.writeHead(404).end();
    let body;
    try { body = await readFile(REPO + path.slice(1)); } catch { return res.writeHead(404).end(); }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(body);
}).listen(8791);

const WRANGLER = process.argv[2] || 'npx wrangler';
const WORKER = 'http://127.0.0.1:8788';
const OWNER = '111', OTHER = '222';
// the grammar student: a new user each run, since wrangler dev keeps the KV between runs
const STUDENT = '9' + Date.now();

const keys = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const pubHex = Buffer.from(await crypto.subtle.exportKey('raw', keys.publicKey)).toString('hex');

// the fake Discord: remembers the last message written for each interaction token
const edits = new Map();
const fake = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
        const token = req.url.split('/')[3];
        edits.set(token, JSON.parse(body));
        res.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
    });
}).listen(8790);

const dev = spawn(`${WRANGLER} dev --port 8788 --ip 127.0.0.1 --var DISCORD_PUBLIC_KEY:${pubHex} --var SITE:http://127.0.0.1:8791 --var DISCORD_API:http://127.0.0.1:8790 --var RELAY_TOKEN:test-relay`,
    { shell: true, cwd: fileURLToPath(new URL('.', import.meta.url)) });
const devLog = [];
dev.stdout.on('data', d => devLog.push(String(d)));
dev.stderr.on('data', d => devLog.push(String(d)));
// stop wrangler (shell -> wrangler -> workerd) however this script ends, crash included
let stopped = false;
function stopDev() {
    if (stopped) return;
    stopped = true;
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(dev.pid), '/T', '/F']);
    else dev.kill();
}
process.on('exit', stopDev);
process.on('uncaughtException', err => { console.error(err); process.exitCode = 1; stopDev(); process.exit(1); });
for (let i = 0; i < 60; i++) {
    try { await fetch(WORKER); break; } catch { await new Promise(r => setTimeout(r, 1000)); }
}

let n = 0;
async function send(payload, { sign = true } = {}) {
    const body = JSON.stringify({ application_id: 'app', token: 'tok' + (++n), ...payload });
    const time = String(Math.floor(Date.now() / 1000));
    const sig = Buffer.from(await crypto.subtle.sign({ name: 'Ed25519' }, keys.privateKey, new TextEncoder().encode(time + body))).toString('hex');
    const res = await fetch(WORKER, { method: 'POST', body,
        headers: { 'Content-Type': 'application/json', 'X-Signature-Ed25519': sign ? sig : '00'.repeat(64), 'X-Signature-Timestamp': time } });
    const reply = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
    let edited = null;
    for (let i = 0; i < 300 && !edited; i++) { edited = edits.get('tok' + n); if (!edited) await new Promise(r => setTimeout(r, 100)); }
    return { status: res.status, reply, edited };
}
// every interaction carries the Discord client's locale; Traditional Chinese unless given
const command = (name, options, user = OWNER, locale = 'zh-TW') => send({ type: 2, locale, member: { user: { id: user } }, data: { name, options: Object.entries(options).map(([k, v]) => ({ name: k, value: v })) } });
// a subcommand: /grammar study | quiz
const sub = (name, subName, options, user = OWNER, locale = 'zh-TW') => send({ type: 2, locale, member: { user: { id: user } }, data: { name, options: [{ type: 1, name: subName, options: Object.entries(options).map(([k, v]) => ({ name: k, value: v })) }] } });
const press = (customId, user = OWNER, locale = 'zh-TW') => send({ type: 3, locale, member: { user: { id: user } }, data: { custom_id: customId } });
const buttons = msg => (msg.components || []).flatMap(r => r.components);
const show = (label, msg) => !msg ? check(false, label + ': no reply arrived') : console.log(`\n--- ${label}\n` + (msg.content || '') + (msg.embeds || []).map(e =>
    `[${e.title}]\n${e.description || ''}\n${(e.fields || []).map(f => `<${f.name}>\n${f.value}`).join('\n')}\n(${e.footer?.text || ''})`).join('\n') +
    '\nbuttons: ' + buttons(msg).map(b => `${b.label}${b.disabled ? '(off)' : ''}${b.style === 3 ? '✓' : b.style === 4 ? '✗' : ''}`).join(' | '));

const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) process.exitCode = 1; };

try {
    check((await send({ type: 1 }, { sign: false })).status === 401, 'bad signature -> 401');
    check((await send({ type: 1 })).reply.type === 1, 'PING -> PONG');

    const ac = await send({ type: 4, locale: 'zh-TW', data: { name: 'quiz', options: [{ name: 'language', value: 'es' }, { name: 'set', value: 'a', focused: true }] } });
    check(ac.reply.type === 8 && ac.reply.data.choices.length > 0, 'autocomplete sets: ' + ac.reply.data.choices.map(c => c.name).join(', '));
    const acg = await send({ type: 4, locale: 'zh-TW', data: { name: 'grammar', options: [{ type: 1, name: 'study', options: [{ name: 'language', value: 'ja' }, { name: 'level', value: '', focused: true }] }] } });
    check(acg.reply.data.choices.length === 3, 'autocomplete grammar, Japanese only: ' + acg.reply.data.choices.map(c => c.name).join(', '));
    const acg2 = await send({ type: 4, locale: 'zh-TW', data: { name: 'grammar', options: [{ type: 1, name: 'quiz', options: [{ name: 'language', value: 'ko' }, { name: 'level', value: '', focused: true }] }] } });
    check(acg2.reply.data.choices.length === 2 && acg2.reply.data.choices.every(c => /韓文/.test(c.name)), 'autocomplete grammar quiz, Korean only: ' + acg2.reply.data.choices.map(c => c.name).join(', '));
    // a button from before 2026-10-15 says it has expired
    const old = await press('qa:zh:jlpt_n5:abc:0:0:5:0:1');
    check(old.reply.type === 4 && /過期/.test(old.reply.data.content), 'an old quiz button has expired: ' + old.reply.data.content);

    // a whole public quiz, answering the first option each time
    let r = await command('quiz', { language: 'ja', set: 'jlpt_n5', count: 12, public: true });
    check(r.reply.type === 5 && r.reply.data.flags === 0, 'public quiz deferred without the ephemeral flag');
    show('quiz question 1', r.edited);
    for (let i = 0; i < 12; i++) {
        const answer = buttons(r.edited).find(b => b.custom_id.startsWith('va:'));
        if (i === 0) {
            const other = await press(answer.custom_id, OTHER);
            check(other.reply.type === 4 && other.reply.data.flags === 64, 'someone else pressing gets a private note');
        }
        r = await press(answer.custom_id);
        if (i === 0) show('quiz answer 1', r.edited);
        const next = buttons(r.edited).find(b => b.custom_id.startsWith('vn:') || b.label.startsWith('看結果'));
        r = await press(next.custom_id);
    }
    show('quiz result', r.edited);
    check(/測驗結果/.test(r.edited.embeds[0].title), 'quiz ends with a result card');
    const listed = d => (d.match(/^[✅❌] \d+\. /gmu) || []).length;
    check(listed(r.edited.embeds[0].description) === 10, 'result page 1 lists 10 words');
    const nextPage = buttons(r.edited).find(b => b.custom_id?.startsWith('vr:') && !b.disabled);
    check(!!nextPage, 'result has a next-page button');
    r = await press(nextPage.custom_id);
    show('quiz result page 2', r.edited);
    check(listed(r.edited.embeds[0].description) === 2 && /11\. /.test(r.edited.embeds[0].description), 'result page 2 lists words 11-12');

    for (const [lang, set] of [['zh', 'hsk_1'], ['en', 'en_toeic'], ['ru', 'ru_a1'], ['es', 'tp_es_food'], ['ko', 'topik_1']]) {
        r = await command('quiz', { language: lang, set, count: 5 });
        check(r.reply.data.flags === 64 && buttons(r.edited).filter(b => b.custom_id.startsWith('va:')).length === 4, `private ${set} question with 4 options`);
        show(set, r.edited);
    }
    r = await command('quiz', { language: 'de', set: 'de_a1' });
    show('a set the site does not have yet', r.edited);

    // grammar study: a point's three questions, then the next point; the place is kept
    for (const level of ['ja_n5', 'zh_hsk3', 'fr_a2', 'ko_topik1', 'ru_a1']) {
        const lang = level.slice(0, 2);
        r = await sub('grammar', 'study', { language: lang, level }, STUDENT);
        show('grammar study ' + level, r.edited);
        for (let q = 0; q < 3; q++) {
            const sa = buttons(r.edited).filter(b => b.custom_id?.startsWith('sa:'));
            check(sa.length >= 2, `${level} question ${q + 1} has options`);
            r = await press(sa[sa.length - 1].custom_id, STUDENT);
            if (q === 0) show('grammar study answer ' + level, r.edited);
            if (q < 2) r = await press(buttons(r.edited).find(b => b.custom_id?.startsWith('sq:')).custom_id, STUDENT);
        }
        show('grammar study point done ' + level, r.edited);
        check(/答對 \d \/ 3 題/.test(r.edited.embeds[0].description) && buttons(r.edited).some(b => b.custom_id?.startsWith('sp:')), level + ': the point ends with its score and the next point');
    }
    // the place: /grammar study ja (no level) goes back to ja_n5, at point 2
    r = await sub('grammar', 'study', { language: 'ja' }, STUDENT);
    show('grammar study again', r.edited);
    check(/第 2 \/ \d+ 個/.test(r.edited.embeds[0].title) && /上次/.test(r.edited.embeds[0].description), 'study picks up at point 2 of ja_n5');
    // grammar quiz: 5 questions, then the missed ones explained
    r = await sub('grammar', 'quiz', { language: 'ko', level: 'ko_topik1', count: 5 }, '902');
    show('grammar quiz', r.edited);
    for (let i = 0; i < 5; i++) {
        const ta = buttons(r.edited).filter(b => b.custom_id?.startsWith('ta:'));
        r = await press(ta[0].custom_id, '902');
        if (i === 0) show('grammar quiz answer', r.edited);
        r = await press(buttons(r.edited).find(b => b.custom_id?.startsWith(i < 4 ? 'tq:' : 'tr:')).custom_id, '902');
    }
    show('grammar quiz results', r.edited);
    check(/測驗結果/.test(r.edited.embeds[0].title) && /\d \/ 5/.test(r.edited.embeds[0].description), 'grammar quiz ends with a score');
    r = await sub('grammar', 'study', { language: 'en' }, '903');
    check(/準備中/.test(r.edited.content), 'a language without grammar: ' + r.edited.content);

    for (const [word, language] of [['agua', 'es'], ['食べる', undefined], ['house', undefined], ['學生', undefined], ['qwxzv', 'fr']]) {
        r = await command('dictionary', language ? { word, language } : { word });
        show('dictionary ' + word, r.edited);
    }

    // ----- reply languages -----
    const footer = m => m.embeds[0].footer?.text || '';
    // from the Discord locale: Japanese UI, English meanings (no Japanese ones exist)
    r = await command('quiz', { language: 'ko', set: 'tp_ko_food', count: 5 }, '333', 'ja');
    show('ko food quiz, Japanese Discord', r.edited);
    check(/問/.test(r.edited.embeds[0].title) && /意味/.test(footer(r.edited)), 'Japanese locale -> Japanese quiz text');
    check(buttons(r.edited).filter(b => b.custom_id.startsWith('va:')).every(b => /^[\x20-\x7E]+$/.test(b.label)), 'Japanese locale -> English meanings on the buttons');
    r = await press(buttons(r.edited).find(b => b.custom_id.startsWith('va:')).custom_id, '333', 'ja');
    check(/次へ|結果/.test(buttons(r.edited).map(b => b.label).join()), 'its buttons stay Japanese');

    // Simplified Chinese: HSK words in simplified
    r = await command('quiz', { language: 'zh', set: 'hsk_2', count: 5 }, '333', 'zh-CN');
    show('hsk_2, Simplified Discord', r.edited);
    check(/题/.test(r.edited.embeds[0].title), 'zh-CN locale -> Simplified quiz text');
    r = await command('quiz', { language: 'ja', set: 'tp_ja_food', count: 5 }, '333', 'zh-CN');
    r = await press(buttons(r.edited).find(b => b.custom_id.startsWith('va:')).custom_id, '333', 'zh-CN');
    show('ja food answer, Simplified Discord', r.edited);

    // /language: a saved choice beats the Discord locale, "auto" goes back to it
    r = await command('language', { reply_language: 'fr' }, '444', 'ja');
    check(r.reply.type === 4 && /français/i.test(r.reply.data.content) && /anglais/.test(r.reply.data.content), '/language fr answers in French with the English note: ' + r.reply.data.content.replace(/\n/g, ' '));
    r = await command('quiz', { language: 'es', set: 'tp_es_food', count: 5 }, '444', 'ja');
    show('es food quiz after /language fr', r.edited);
    check(/question/.test(r.edited.embeds[0].title), 'saved French beats the Japanese locale');
    const acf = await send({ type: 4, locale: 'ja', member: { user: { id: '444' } }, data: { name: 'quiz', options: [{ name: 'language', value: 'ja' }, { name: 'set', value: '', focused: true }] } });
    check(acf.reply.data.choices.some(c => /Repas/.test(c.name)), 'autocomplete in French too: ' + acf.reply.data.choices.slice(-3).map(c => c.name).join(', '));
    r = await command('language', { reply_language: 'auto' }, '444', 'ko');
    check(/Discord/.test(r.reply.data.content) && /한국어/.test(r.reply.data.content), '/language auto: ' + r.reply.data.content);
    r = await command('quiz', { language: 'ja', set: 'jlpt_n5', count: 5 }, '444', 'ko');
    check(/번/.test(r.edited.embeds[0].title), 'after auto: Korean from the locale');

    // grammar in Russian (Russian explanations now), with the finish button
    r = await sub('grammar', 'study', { language: 'fr', level: 'fr_a1' }, '555', 'ru');
    show('grammar fr_a1, Russian Discord', r.edited);
    check(/[а-я]{4}/.test(r.edited.embeds[0].description.split('\n').slice(2).join(' ')), 'explanation in Russian');
    const ge = buttons(r.edited).find(b => b.custom_id.startsWith('ge:'));
    check(!!ge && ge.label === 'Закончить', 'grammar question has a finish button in Russian');
    r = await press(ge.custom_id, '555', 'ru');
    show('grammar finished', r.edited);
    check(/окончена/.test(r.edited.embeds[0].description), 'finish says goodbye in Russian');
    r = await sub('grammar', 'study', { language: 'zh', level: 'zh_hsk12' }, '555', 'zh-CN');
    show('grammar zh_hsk12, Simplified Discord', r.edited);

    // dictionary: Tatoeba translations in the visitor's language, examples apart
    r = await command('dictionary', { word: 'agua', language: 'es' }, '666', 'ja');
    show('dictionary agua, Japanese Discord', r.edited);
    const exField = r.edited.embeds[0].fields.find(f => /Tatoeba/.test(f.name));
    check(!!exField && /\n\n> /.test(exField.value), 'examples are separated by a blank line');
    r = await command('dictionary', { word: '食べる' }, '666', 'zh-TW');
    show('dictionary 食べる, Traditional Discord', r.edited);

    // /help answers at once, privately; commands are clickable mentions (Discord names them in
    // the reader's own client language), the "public" option is named as their Discord does
    for (const [locale, opt] of [['zh-TW', '公開'], ['ja', '公開'], ['en-US', 'public']]) {
        r = await command('help', {}, '777', locale);
        const d = r.reply.data.embeds[0].description;
        check(r.reply.type === 4 && r.reply.data.flags === 64 && /<\/quiz:\d+>/.test(d) && /<\/help:\d+>/.test(d) && d.includes(opt), `/help (${locale}) uses mentions and names the option "${opt}"`);
    }
    // the owner's case: an English Discord with Traditional Chinese replies
    await command('language', { reply_language: 'zh' }, '888', 'en-US');
    r = await command('help', {}, '888', 'en-US');
    show('help, English Discord + Chinese replies', r.reply.data);
    check(/小花火能做什麼/.test(r.reply.data.embeds[0].title) && r.reply.data.embeds[0].description.includes('「public」'), 'Chinese help, English option name');
    // /ask: an answer with 繼續問; the button opens a box; its question continues the conversation
    const ASKER = '8' + Date.now();
    r = await command('ask', { question: '請用一句話解釋為什麼天空是藍色的。' }, ASKER);
    show('ask', r.edited);
    const ak = buttons(r.edited).find(b => b.custom_id?.startsWith('ak:'));
    check(!!ak && r.edited.embeds[0].description.length > 20, '/ask answers with a 繼續問 button');
    const modal = await press(ak.custom_id, ASKER);
    check(modal.reply.type === 9 && modal.reply.data.custom_id.startsWith('am:'), '繼續問 opens a box: ' + modal.reply.data?.title);
    const follow = await send({ type: 5, locale: 'zh-TW', member: { user: { id: ASKER } }, data: { custom_id: modal.reply.data.custom_id,
        components: [{ type: 1, components: [{ type: 4, custom_id: 'q', value: '我剛剛問了什麼？用一句話回答。' }] }] } });
    show('ask follow-up', follow.edited);
    check(follow.reply.type === 5 && follow.reply.data.flags === 64, 'the follow-up is a new private message');
    check(/天空|藍/.test(follow.edited.embeds[0].description.split('\n\n').slice(1).join('')), 'the follow-up remembers the first question');
    // POST /chat: replies relayed by the gateway bot on Render — a secret, then the chain as the conversation
    const chat = (body, token) => fetch(WORKER + '/chat', { method: 'POST', body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) } });
    check((await chat({ user: '123456789', history: [{ role: 'user', text: 'hi' }] })).status === 403, '/chat without the secret -> 403');
    check((await chat({ user: '123456789', history: [{ role: 'user', text: 'hi' }] }, 'wrong')).status === 403, '/chat with a wrong secret -> 403');
    const cr = await chat({ user: '7' + Date.now(), locale: 'zh-TW', history: [
        { role: 'user', text: '我最喜歡的水果是芒果。' },
        { role: 'model', text: '芒果很好吃！夏天的愛文芒果最棒了。' },
        { role: 'user', text: '我剛剛說我最喜歡什麼水果？只回答水果名稱。' }] }, 'test-relay');
    const cj = cr.status === 200 ? await cr.json() : {};
    console.log('\n--- /chat reply\n' + (cj.reply || cr.status));
    check(cr.status === 200 && /芒果/.test(cj.reply || ''), '/chat answers from the reply chain');
    // someone else's button: the note mentions the commands too
    r = await command('quiz', { language: 'ja', set: 'jlpt_n5', count: 5, public: true }, OWNER);
    const other = await press(buttons(r.edited).find(b => b.custom_id.startsWith('va:')).custom_id, OTHER, 'en-US');
    check(/<\/quiz:\d+>/.test(other.reply.data.content), 'not-yours note mentions /quiz: ' + other.reply.data.content);
} finally {
    if (process.exitCode || process.env.SHOW_LOG) console.log('\n=== wrangler log ===\n' + devLog.join(''));
    fake.close();
    site.close();
    stopDev();
}
