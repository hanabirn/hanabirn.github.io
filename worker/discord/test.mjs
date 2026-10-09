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

const dev = spawn(`${WRANGLER} dev --port 8788 --ip 127.0.0.1 --var DISCORD_PUBLIC_KEY:${pubHex} --var SITE:http://127.0.0.1:8791 --var DISCORD_API:http://127.0.0.1:8790`,
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
const command = (name, options, user = OWNER) => send({ type: 2, member: { user: { id: user } }, data: { name, options: Object.entries(options).map(([k, v]) => ({ name: k, value: v })) } });
const press = (customId, user = OWNER) => send({ type: 3, member: { user: { id: user } }, data: { custom_id: customId } });
const buttons = msg => (msg.components || []).flatMap(r => r.components);
const show = (label, msg) => !msg ? check(false, label + ': no reply arrived') : console.log(`\n--- ${label}\n` + (msg.content || '') + (msg.embeds || []).map(e =>
    `[${e.title}]\n${e.description || ''}\n${(e.fields || []).map(f => `<${f.name}>\n${f.value}`).join('\n')}\n(${e.footer?.text || ''})`).join('\n') +
    '\nbuttons: ' + buttons(msg).map(b => `${b.label}${b.disabled ? '(off)' : ''}${b.style === 3 ? '✓' : b.style === 4 ? '✗' : ''}`).join(' | '));

const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) process.exitCode = 1; };

try {
    check((await send({ type: 1 }, { sign: false })).status === 401, 'bad signature -> 401');
    check((await send({ type: 1 })).reply.type === 1, 'PING -> PONG');

    const ac = await send({ type: 4, data: { name: 'quiz', options: [{ name: 'language', value: 'es' }, { name: 'set', value: 'a', focused: true }] } });
    check(ac.reply.type === 8 && ac.reply.data.choices.length > 0, 'autocomplete sets: ' + ac.reply.data.choices.map(c => c.name).join(', '));
    const acg = await send({ type: 4, data: { name: 'grammar', options: [{ name: 'level', value: '日文', focused: true }] } });
    check(acg.reply.data.choices.length === 3, 'autocomplete grammar: ' + acg.reply.data.choices.map(c => c.name).join(', '));

    // a whole public quiz, answering the first option each time
    let r = await command('quiz', { language: 'ja', set: 'jlpt_n5', count: 5, public: true });
    check(r.reply.type === 5 && r.reply.data.flags === 0, 'public quiz deferred without the ephemeral flag');
    show('quiz question 1', r.edited);
    for (let i = 0; i < 5; i++) {
        const answer = buttons(r.edited).find(b => b.custom_id.startsWith('qa:'));
        if (i === 0) {
            const other = await press(answer.custom_id, OTHER);
            check(other.reply.type === 4 && other.reply.data.flags === 64, 'someone else pressing gets a private note');
        }
        r = await press(answer.custom_id);
        if (i === 0) show('quiz answer 1', r.edited);
        const next = buttons(r.edited).find(b => b.custom_id.startsWith('qn:') || b.label.startsWith('看結果'));
        r = await press(next.custom_id);
    }
    show('quiz result', r.edited);
    check(/測驗結果/.test(r.edited.embeds[0].title), 'quiz ends with a result card');

    for (const [lang, set] of [['zh', 'hsk_1'], ['en', 'en_toeic'], ['ru', 'ru_a1'], ['es', 'tp_es_food'], ['ko', 'topik_1']]) {
        r = await command('quiz', { language: lang, set, count: 5 });
        check(r.reply.data.flags === 64 && buttons(r.edited).filter(b => b.custom_id.startsWith('qa:')).length === 4, `private ${set} question with 4 options`);
        show(set, r.edited);
    }
    r = await command('quiz', { language: 'de', set: 'de_a1' });
    show('a set the site does not have yet', r.edited);

    // grammar: a point, its answer, the next point
    for (const level of ['ja_n5', 'zh_hsk3', 'fr_a2', 'ko_topik1', 'ru_a1']) {
        r = await command('grammar', { level });
        show('grammar ' + level, r.edited);
        const ga = buttons(r.edited).find(b => b.custom_id.startsWith('ga:'));
        r = await press(ga.custom_id);
        show('grammar answer ' + level, r.edited);
        check(buttons(r.edited).some(b => b.custom_id?.startsWith('gn:')), 'grammar answer offers the next point');
    }
    r = await press(buttons(r.edited).find(b => b.custom_id?.startsWith('gn:')).custom_id);
    check(buttons(r.edited).filter(b => b.custom_id?.startsWith('ga:')).length >= 2, 'next grammar point has options');

    for (const [word, language] of [['agua', 'es'], ['食べる', undefined], ['house', undefined], ['學生', undefined], ['qwxzv', 'fr']]) {
        r = await command('dictionary', language ? { word, language } : { word });
        show('dictionary ' + word, r.edited);
    }
} finally {
    if (process.exitCode || process.env.SHOW_LOG) console.log('\n=== wrangler log ===\n' + devLog.join(''));
    fake.close();
    site.close();
    stopDev();
}
