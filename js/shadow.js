/* ===================== 跟讀 Shadowing (2026-11-19, owner's pick #8 of the site review) =====================
   The site had nothing for speaking. A 🎤 beside a grammar example, a listening transcript line and
   the 閱讀 reader's tools row opens #shadow-overlay: the sentence, 聽原音, 跟讀 (plays the original,
   then records the visitor for about as long again), 我的錄音 and 對照 (original, then the
   recording), and ‹ › through the other sentences of the same example list / transcript / passage.
   The recording never leaves the browser: MediaRecorder into a blob URL, dropped on close; the mic
   is released when the dialog closes. No scoring (speech recognition would send the voice away).

   shadowOpen({ lines: [{ text, lang }], at, say(k, onend), title }) — say plays line k and calls
   onend when it has finished (speakText / speakChinese / listeningSay all take one). */
let shadowState = null;   // { lines, at, say, title, stream, rec, chunks, url, phase, timer, origMs, run }

function shadowOpen(opts) {
    shadowClose();
    shadowState = Object.assign({ at: 0, phase: 'ready', run: 0 }, opts);
    shadowDraw();
    document.getElementById('shadow-overlay').classList.add('show');
}

function shadowClose() {
    const s = shadowState;
    if (!s) return;
    s.run++;
    clearTimeout(s.timer);
    if (s.rec && s.rec.state !== 'inactive') try { s.rec.stop(); } catch {}
    if (s.stream) s.stream.getTracks().forEach(tr => tr.stop());
    if (s.url) URL.revokeObjectURL(s.url);
    if (s.mine) s.mine.pause();
    if (typeof stopSpeech === 'function') stopSpeech();
    shadowState = null;
    const o = document.getElementById('shadow-overlay');
    if (o) o.classList.remove('show');
}

function shadowDraw() {
    const s = shadowState;
    if (!s) return;
    const line = s.lines[s.at];
    const n = s.lines.length;
    const busy = s.phase === 'orig' || s.phase === 'rec' || s.phase === 'play';
    const status = { ready: 'shadow_ready', orig: 'shadow_playing', rec: 'shadow_rec', done: 'shadow_done', play: 'shadow_playing_mine', nomic: 'shadow_nomic' }[s.phase];
    document.getElementById('shadow-panel').innerHTML = `
        <div class="shadow-head">
            <h3 id="shadow-title">${uiIcon('mic')} ${escHtml(t('shadow_title'))}</h3>
            ${n > 1 ? `<span class="shadow-nav">
                <button type="button" class="mode-btn" onclick="shadowGo(-1)"${s.at === 0 || busy ? ' disabled' : ''} aria-label="${escHtml(t('shadow_prev'))}">‹</button>
                <span>${escHtml(t('shadow_n', { n: s.at + 1, m: n }))}</span>
                <button type="button" class="mode-btn" onclick="shadowGo(1)"${s.at >= n - 1 || busy ? ' disabled' : ''} aria-label="${escHtml(t('shadow_next'))}">›</button>
            </span>` : ''}
        </div>
        ${s.title ? `<p class="shadow-from">${escHtml(s.title)}</p>` : ''}
        <p class="shadow-text" lang="${escHtml(line.lang || '')}">${escHtml(line.text)}</p>
        <p class="shadow-status${s.phase === 'rec' ? ' rec' : ''}${s.phase === 'nomic' ? ' no' : ''}" role="status">
            ${s.phase === 'rec' ? '<span class="shadow-dot" aria-hidden="true"></span>' : ''}${escHtml(t(status))}</p>
        <div class="shadow-btns">
            <button type="button" class="mode-btn" onclick="shadowListen()"${busy ? ' disabled' : ''}>${uiIcon('speaker')} ${escHtml(t('shadow_listen'))}</button>
            ${s.phase === 'rec'
                ? `<button type="button" class="next-btn shadow-main" onclick="shadowStopRec()">${escHtml(t('shadow_stop'))}</button>`
                : `<button type="button" class="next-btn shadow-main" onclick="shadowGoRec()"${busy ? ' disabled' : ''}>${uiIcon('mic')} ${escHtml(t('shadow_go'))}</button>`}
            <button type="button" class="mode-btn" onclick="shadowPlayMine()"${!s.url || busy ? ' disabled' : ''}>${uiIcon('play')} ${escHtml(t('shadow_mine'))}</button>
            <button type="button" class="mode-btn" onclick="shadowCompare()"${!s.url || busy ? ' disabled' : ''}>${escHtml(t('shadow_compare'))}</button>
        </div>
        <p class="shadow-private">${escHtml(t('shadow_private'))}</p>
        <button type="button" class="back-btn shadow-close" onclick="shadowClose()">${escHtml(t('updates_close'))}</button>`;
}

function shadowSet(phase) {
    if (!shadowState) return;
    shadowState.phase = phase;
    shadowDraw();
}

/* the original; calls then() when it has finished (only if nothing else started meanwhile) */
function shadowOrig(then) {
    const s = shadowState;
    if (!s) return;
    const run = ++s.run;
    shadowSet('orig');
    const t0 = Date.now();
    let ended = false;
    const end = () => {
        if (ended || !shadowState || shadowState.run !== run) return;
        ended = true;
        s.origMs = Date.now() - t0;
        if (then) then(); else shadowSet(s.url ? 'done' : 'ready');
    };
    s.say(s.at, end);
    // a voice that never reports its end (some browsers): carry on after a long wait
    clearTimeout(s.timer);
    s.timer = setTimeout(end, 20000);
}

function shadowListen() { shadowOrig(); }

function shadowGo(d) {
    const s = shadowState;
    if (!s) return;
    const k = s.at + d;
    if (k < 0 || k >= s.lines.length) return;
    s.run++;
    if (typeof stopSpeech === 'function') stopSpeech();
    if (s.url) { URL.revokeObjectURL(s.url); s.url = ''; }
    s.at = k;
    shadowSet('ready');
}

async function shadowMic() {
    const s = shadowState;
    if (s.stream) return s.stream;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('no mic');
    s.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    return s.stream;
}

/* 跟讀: ask for the mic first (so the prompt doesn't cut into the recording), play the original, then record */
async function shadowGoRec() {
    const s = shadowState;
    if (!s) return;
    try { await shadowMic(); } catch { shadowSet('nomic'); return; }
    if (shadowState !== s) return;
    shadowOrig(() => shadowRecord());
}

function shadowRecord() {
    const s = shadowState;
    if (!s) return;
    const run = ++s.run;
    s.chunks = [];
    try { s.rec = new MediaRecorder(s.stream); } catch { shadowSet('nomic'); return; }
    s.rec.ondataavailable = e => { if (e.data && e.data.size) s.chunks.push(e.data); };
    s.rec.onstop = () => {
        if (!shadowState || shadowState !== s) return;
        if (s.url) URL.revokeObjectURL(s.url);
        s.url = s.chunks.length ? URL.createObjectURL(new Blob(s.chunks, { type: s.rec.mimeType || 'audio/webm' })) : '';
        shadowSet(s.url ? 'done' : 'ready');
    };
    s.rec.start();
    shadowSet('rec');
    // about as long as the original took, plus room to start
    const ms = Math.min(Math.max((s.origMs || 2000) * 1.4 + 1200, 2500), 20000);
    clearTimeout(s.timer);
    s.timer = setTimeout(() => { if (shadowState === s && s.run === run) shadowStopRec(); }, ms);
}

function shadowStopRec() {
    const s = shadowState;
    if (!s || !s.rec || s.rec.state === 'inactive') return;
    clearTimeout(s.timer);
    s.rec.stop();
}

function shadowPlayMine(then) {
    const s = shadowState;
    if (!s || !s.url) return;
    const run = ++s.run;
    if (typeof stopSpeech === 'function') stopSpeech();
    shadowSet('play');
    s.mine = new Audio(s.url);
    const end = () => { if (shadowState === s && s.run === run) { if (typeof then === 'function') then(); else shadowSet('done'); } };
    s.mine.addEventListener('ended', end);
    s.mine.play().catch(end);
}

/* 對照: the original, then the visitor's recording */
function shadowCompare() {
    shadowOrig(() => shadowPlayMine());
}
