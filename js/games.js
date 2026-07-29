/* ===================== 🎮 Games Hub ===================== */

function openGame(name) {
    document.getElementById('games-select-card').style.display = 'none';
    document.getElementById('snake-card').style.display = name === 'snake' ? 'block' : 'none';
    document.getElementById('whack-card').style.display = name === 'whack' ? 'block' : 'none';
    document.getElementById('rhythm-card').style.display = name === 'rhythm' ? 'block' : 'none';

    if (name === 'snake') {
        initSnakeCanvas();
        initSnakeSwipe();
        const overlay = document.getElementById('snake-overlay');
        overlay.innerHTML = `<p>${t('game_snake_intro')}</p><button class="btn next-btn" onclick="startSnake()">${t('game_start')}</button>`;
        overlay.style.display = 'flex';
        drawSnake();
    } else if (name === 'whack') {
        document.getElementById('whack-lang-select').style.display = 'block';
        document.getElementById('whack-game').style.display = 'none';
        document.getElementById('whack-lang-status').innerText = '';
    } else if (name === 'rhythm') {
        document.getElementById('rhythm-song-select').style.display = 'block';
        document.getElementById('rhythm-game').style.display = 'none';
        document.getElementById('rhythm-song-status').innerText = '';
        renderRhythmSongList();
    }
}

function closeGame() {
    stopAllGames();
    document.getElementById('games-select-card').style.display = 'block';
    document.getElementById('snake-card').style.display = 'none';
    document.getElementById('whack-card').style.display = 'none';
    document.getElementById('rhythm-card').style.display = 'none';
}

function stopAllGames() {
    snakeRunning = false;
    clearInterval(snakeInterval);
    whackRunning = false;
    clearInterval(whackTimerInterval);
    clearTimeout(whackMoleTimeout);
    rhythmRunning = false;
    cancelAnimationFrame(rhythmRAF);
    if (rhythmAudio) rhythmAudio.pause();
}

/* ===================== 🐍 Snake ===================== */

const SNAKE_GRID = 18;
let snakeCanvas = null;
let snakeCtx = null;
let snakeCellSize = 20;
let snakeBody = [];
let snakeDir = { x: 1, y: 0 };
let snakeNextDir = { x: 1, y: 0 };
let snakeFood = { x: 5, y: 5 };
let snakeScore = 0;
let snakeInterval = null;
let snakeSpeed = 160;
let snakeRunning = false;
let snakeSwipeInit = false;

function getSnakeHighScore() {
    return parseInt(localStorage.getItem('snake_high_score') || '0', 10);
}
function saveSnakeHighScore(score) {
    if (score > getSnakeHighScore()) localStorage.setItem('snake_high_score', String(score));
}

function initSnakeCanvas() {
    snakeCanvas = document.getElementById('snake-canvas');
    if (!snakeCanvas) return;
    snakeCtx = snakeCanvas.getContext('2d');
    snakeCellSize = snakeCanvas.width / SNAKE_GRID;
    document.getElementById('snake-highscore').textContent = getSnakeHighScore();
}

function randomSnakeFood() {
    let pos;
    do {
        pos = { x: Math.floor(Math.random() * SNAKE_GRID), y: Math.floor(Math.random() * SNAKE_GRID) };
    } while (snakeBody.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
}

function startSnake() {
    document.getElementById('snake-overlay').style.display = 'none';
    snakeBody = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }];
    snakeDir = { x: 1, y: 0 };
    snakeNextDir = { x: 1, y: 0 };
    snakeScore = 0;
    snakeSpeed = 160;
    snakeFood = randomSnakeFood();
    document.getElementById('snake-score').textContent = '0';
    snakeRunning = true;
    clearInterval(snakeInterval);
    snakeInterval = setInterval(snakeTick, snakeSpeed);
    drawSnake();
}

function snakeSetDir(x, y) {
    if (!snakeRunning) return;
    if (snakeDir.x === -x && snakeDir.y === -y) return;
    if (snakeDir.x === x && snakeDir.y === y) return;
    snakeNextDir = { x, y };
}

function snakeTick() {
    snakeDir = snakeNextDir;
    const head = { x: snakeBody[0].x + snakeDir.x, y: snakeBody[0].y + snakeDir.y };

    if (head.x < 0 || head.y < 0 || head.x >= SNAKE_GRID || head.y >= SNAKE_GRID ||
        snakeBody.some(s => s.x === head.x && s.y === head.y)) {
        return endSnake();
    }

    snakeBody.unshift(head);
    if (head.x === snakeFood.x && head.y === snakeFood.y) {
        playSound(true);
        snakeScore += 10;
        document.getElementById('snake-score').textContent = snakeScore;
        snakeFood = randomSnakeFood();
        snakeSpeed = Math.max(70, snakeSpeed - 3);
        clearInterval(snakeInterval);
        snakeInterval = setInterval(snakeTick, snakeSpeed);
    } else {
        snakeBody.pop();
    }
    drawSnake();
}

function snakeRoundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawSnake() {
    if (!snakeCtx) return;
    const ctx = snakeCtx;
    ctx.clearRect(0, 0, snakeCanvas.width, snakeCanvas.height);

    ctx.font = Math.floor(snakeCellSize * 0.9) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌸', (snakeFood.x + 0.5) * snakeCellSize, (snakeFood.y + 0.5) * snakeCellSize + 1);

    snakeBody.forEach((seg, i) => {
        const isHead = i === 0;
        ctx.fillStyle = isHead ? '#f472b6' : `rgba(168,85,247,${Math.max(0.5, 1 - i * 0.03)})`;
        const pad = 1.5;
        snakeRoundRectPath(ctx, seg.x * snakeCellSize + pad, seg.y * snakeCellSize + pad, snakeCellSize - pad * 2, snakeCellSize - pad * 2, 5);
        ctx.fill();
    });
}

function endSnake() {
    snakeRunning = false;
    clearInterval(snakeInterval);
    saveSnakeHighScore(snakeScore);
    document.getElementById('snake-highscore').textContent = getSnakeHighScore();
    const isNewBest = snakeScore > 0 && snakeScore === getSnakeHighScore();
    const overlay = document.getElementById('snake-overlay');
    overlay.innerHTML = `
        <p>${t('game_over')}</p>
        <p>${t('game_final_score', { n: snakeScore })}</p>
        ${isNewBest ? `<p class="game-new-best">${t('game_new_best')}</p>` : ''}
        <button class="btn next-btn" onclick="startSnake()">${t('game_restart')}</button>
    `;
    overlay.style.display = 'flex';
}

document.addEventListener('keydown', (e) => {
    if (!snakeRunning) return;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') snakeSetDir(0, -1);
    else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') snakeSetDir(0, 1);
    else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') snakeSetDir(-1, 0);
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') snakeSetDir(1, 0);
});

let snakeTouchStart = null;
function initSnakeSwipe() {
    if (snakeSwipeInit) return;
    const canvas = document.getElementById('snake-canvas');
    if (!canvas) return;
    canvas.addEventListener('touchstart', (e) => {
        const t0 = e.touches[0];
        snakeTouchStart = { x: t0.clientX, y: t0.clientY };
    }, { passive: true });
    canvas.addEventListener('touchend', (e) => {
        if (!snakeTouchStart) return;
        const t0 = e.changedTouches[0];
        const dx = t0.clientX - snakeTouchStart.x;
        const dy = t0.clientY - snakeTouchStart.y;
        if (Math.abs(dx) < 20 && Math.abs(dy) < 20) { snakeTouchStart = null; return; }
        if (Math.abs(dx) > Math.abs(dy)) snakeSetDir(dx > 0 ? 1 : -1, 0);
        else snakeSetDir(0, dy > 0 ? 1 : -1);
        snakeTouchStart = null;
    }, { passive: true });
    snakeSwipeInit = true;
}

/* ===================== 🔨 Whack-a-mole Vocab Game ===================== */

const WHACK_HOLES = 6;
const WHACK_ROUND_TIME = 60;
let whackLang = null;
let whackWords = [];
let whackScore = 0;
let whackTimeLeft = WHACK_ROUND_TIME;
let whackTimerInterval = null;
let whackMoleTimeout = null;
let whackCurrentTarget = null;
let whackRunning = false;

function getWhackHighScore(lang) {
    return parseInt(localStorage.getItem('whack_high_' + lang) || '0', 10);
}
function saveWhackHighScore(lang, score) {
    if (score > getWhackHighScore(lang)) localStorage.setItem('whack_high_' + lang, String(score));
}

function startWhackLang(lang) {
    const cache = getVocabCache(lang);
    const status = document.getElementById('whack-lang-status');
    if (!cache || !cache.vocabularyList || cache.vocabularyList.length < WHACK_HOLES) {
        status.innerText = t('game_whack_need_cache');
        status.style.color = '#ff5252';
        return;
    }
    whackLang = lang;
    whackWords = cache.vocabularyList.filter(w => w.word && w.meaning);
    status.innerText = '';
    document.getElementById('whack-lang-select').style.display = 'none';
    document.getElementById('whack-game').style.display = 'block';
    document.getElementById('whack-highscore').textContent = getWhackHighScore(lang);
    buildWhackGrid();
    const overlay = document.getElementById('whack-overlay');
    overlay.innerHTML = `<button class="btn next-btn" onclick="startWhackGame()">${t('game_start')}</button>`;
    overlay.style.display = 'flex';
}

function buildWhackGrid() {
    const grid = document.getElementById('whack-grid');
    grid.innerHTML = '';
    for (let i = 0; i < WHACK_HOLES; i++) {
        const hole = document.createElement('div');
        hole.className = 'whack-hole';
        hole.innerHTML = `<div class="whack-mole" id="whack-mole-${i}"></div>`;
        grid.appendChild(hole);
    }
}

function startWhackGame() {
    document.getElementById('whack-overlay').style.display = 'none';
    whackScore = 0;
    whackTimeLeft = WHACK_ROUND_TIME;
    whackRunning = true;
    document.getElementById('whack-score').textContent = '0';
    document.getElementById('whack-timer').textContent = whackTimeLeft;
    clearInterval(whackTimerInterval);
    whackTimerInterval = setInterval(() => {
        whackTimeLeft--;
        document.getElementById('whack-timer').textContent = whackTimeLeft;
        if (whackTimeLeft <= 0) endWhackGame();
    }, 1000);
    whackNextRound();
}

function whackPickRandomWords(n) {
    const pool = whackWords.slice();
    const picked = [];
    while (picked.length < n && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
}

function whackNextRound() {
    if (!whackRunning) return;
    clearTimeout(whackMoleTimeout);
    const optionCount = Math.min(WHACK_HOLES, whackWords.length);
    const options = whackPickRandomWords(optionCount);
    if (options.length < 2) return endWhackGame();
    whackCurrentTarget = options[Math.floor(Math.random() * options.length)];
    document.getElementById('whack-prompt').textContent = t('game_whack_find', { m: whackCurrentTarget.meaning });

    const holeOrder = shuffleArray([...Array(WHACK_HOLES).keys()]);
    for (let i = 0; i < WHACK_HOLES; i++) {
        const mole = document.getElementById('whack-mole-' + i);
        if (!mole) continue;
        mole.className = 'whack-mole';
        mole.textContent = '';
        mole.onclick = null;
    }
    options.forEach((word, i) => {
        const holeIdx = holeOrder[i];
        const mole = document.getElementById('whack-mole-' + holeIdx);
        if (!mole) return;
        mole.textContent = word.word;
        mole.classList.add('up');
        mole.onclick = () => whackHit(word === whackCurrentTarget, mole);
    });

    whackMoleTimeout = setTimeout(whackNextRound, 2200);
}

function whackHit(isCorrect, moleEl) {
    if (!whackRunning) return;
    clearTimeout(whackMoleTimeout);
    playSound(isCorrect);
    if (isCorrect) {
        whackScore += 10;
        moleEl.classList.add('correct');
    } else {
        whackScore = Math.max(0, whackScore - 5);
        moleEl.classList.add('wrong');
    }
    document.getElementById('whack-score').textContent = whackScore;
    document.querySelectorAll('.whack-mole').forEach(m => { m.onclick = null; });
    whackMoleTimeout = setTimeout(whackNextRound, 500);
}

function endWhackGame() {
    whackRunning = false;
    clearInterval(whackTimerInterval);
    clearTimeout(whackMoleTimeout);
    saveWhackHighScore(whackLang, whackScore);
    document.getElementById('whack-highscore').textContent = getWhackHighScore(whackLang);
    const isNewBest = whackScore > 0 && whackScore === getWhackHighScore(whackLang);
    document.querySelectorAll('.whack-mole').forEach(m => { m.className = 'whack-mole'; m.onclick = null; });
    const overlay = document.getElementById('whack-overlay');
    overlay.innerHTML = `
        <p>${t('game_over')}</p>
        <p>${t('game_final_score', { n: whackScore })}</p>
        ${isNewBest ? `<p class="game-new-best">${t('game_new_best')}</p>` : ''}
        <button class="btn next-btn" onclick="startWhackGame()">${t('game_restart')}</button>
    `;
    overlay.style.display = 'flex';
}

/* ===================== 🎵 Rhythm Tap ===================== */

const RHYTHM_LANES = 4;
const RHYTHM_JUDGE_Y = 370;
const RHYTHM_TRAVEL_MS = 1600;
const RHYTHM_WINDOW_PERFECT = 70;
const RHYTHM_WINDOW_GOOD = 150;
const RHYTHM_DURATION_MS = 60000;
const RHYTHM_BPM = [82, 76, 88, 94, 74, 78, 80, 72, 86];

let rhythmCanvas = null;
let rhythmCtx = null;
let rhythmAudio = null;
let rhythmSongIndex = 0;
let rhythmNotes = [];
let rhythmScore = 0;
let rhythmCombo = 0;
let rhythmMaxCombo = 0;
let rhythmStartPerf = 0;
let rhythmRunning = false;
let rhythmRAF = null;

function getRhythmHighScore(i) {
    return parseInt(localStorage.getItem('rhythm_high_' + i) || '0', 10);
}
function saveRhythmHighScore(i, score) {
    if (score > getRhythmHighScore(i)) localStorage.setItem('rhythm_high_' + i, String(score));
}

function renderRhythmSongList() {
    const container = document.getElementById('rhythm-song-list');
    if (!container || typeof BGM_TRACKS === 'undefined') return;
    container.innerHTML = BGM_TRACKS.map((track, i) => {
        const high = getRhythmHighScore(i);
        return `<button class="rhythm-song-btn" onclick="startRhythmLoad(${i})">
            <span class="rhythm-song-icon">🎵</span>
            <span>${escQ(track.name)}</span>
            <span class="rhythm-song-highscore">🏆 ${high}</span>
        </button>`;
    }).join('');
}

function initRhythmCanvas() {
    rhythmCanvas = document.getElementById('rhythm-canvas');
    if (!rhythmCanvas) return;
    rhythmCtx = rhythmCanvas.getContext('2d');
}

function startRhythmLoad(index) {
    rhythmSongIndex = index;
    document.getElementById('rhythm-song-select').style.display = 'none';
    document.getElementById('rhythm-game').style.display = 'block';
    document.getElementById('rhythm-highscore').textContent = getRhythmHighScore(index);
    document.getElementById('rhythm-score').textContent = '0';
    document.getElementById('rhythm-combo').textContent = '0';
    initRhythmCanvas();

    const overlay = document.getElementById('rhythm-overlay');
    overlay.innerHTML = `<p>${t('game_rhythm_loading')}</p>`;
    overlay.style.display = 'flex';

    if (rhythmAudio) rhythmAudio.pause();
    rhythmAudio = new Audio();
    rhythmAudio.preload = 'auto';

    let resolved = false;
    const showStart = () => {
        if (resolved) return;
        resolved = true;
        overlay.innerHTML = `<button class="btn next-btn" onclick="startRhythmSong()">${t('game_start')}</button>`;
    };
    const showFail = () => {
        if (resolved) return;
        resolved = true;
        overlay.innerHTML = `<p>${t('game_rhythm_load_fail')}</p>`;
    };
    rhythmAudio.addEventListener('canplay', showStart, { once: true });
    rhythmAudio.addEventListener('error', showFail, { once: true });
    setTimeout(() => { if (!resolved) showFail(); }, 8000);
    rhythmAudio.src = BGM_TRACKS[index].url;
    rhythmAudio.load();
}

function rhythmGenerateNotes(bpm, durationMs) {
    const beatMs = 60000 / bpm;
    const notes = [];
    let t0 = 2500;
    let lastLane = -1;
    while (t0 < durationMs) {
        if (Math.random() < 0.82) {
            let lane = Math.floor(Math.random() * RHYTHM_LANES);
            if (lane === lastLane && Math.random() < 0.5) {
                lane = (lane + 1 + Math.floor(Math.random() * 3)) % RHYTHM_LANES;
            }
            notes.push({ lane, targetTime: t0, judged: false, hit: false });
            lastLane = lane;
            if (Math.random() < 0.12) {
                const lane2 = Math.floor(Math.random() * RHYTHM_LANES);
                if (lane2 !== lane) notes.push({ lane: lane2, targetTime: t0, judged: false, hit: false });
            }
        }
        t0 += beatMs * (Math.random() < 0.25 ? 0.5 : 1);
    }
    return notes;
}

function startRhythmSong() {
    document.getElementById('rhythm-overlay').style.display = 'none';
    rhythmNotes = rhythmGenerateNotes(RHYTHM_BPM[rhythmSongIndex] || 84, RHYTHM_DURATION_MS);
    rhythmScore = 0;
    rhythmCombo = 0;
    rhythmMaxCombo = 0;
    document.getElementById('rhythm-score').textContent = '0';
    document.getElementById('rhythm-combo').textContent = '0';
    rhythmRunning = true;
    rhythmAudio.currentTime = 0;
    rhythmAudio.play().catch(() => {});
    rhythmStartPerf = performance.now();
    cancelAnimationFrame(rhythmRAF);
    rhythmRAF = requestAnimationFrame(rhythmLoop);
}

function rhythmLoop() {
    if (!rhythmRunning) return;
    const elapsed = performance.now() - rhythmStartPerf;

    rhythmNotes.forEach(n => {
        if (!n.judged && elapsed > n.targetTime + RHYTHM_WINDOW_GOOD) {
            n.judged = true;
            rhythmCombo = 0;
            document.getElementById('rhythm-combo').textContent = '0';
            playSound(false);
            showRhythmJudgement('miss', t('game_rhythm_miss'));
        }
    });

    drawRhythm(elapsed);

    if (elapsed >= RHYTHM_DURATION_MS || rhythmAudio.ended) {
        endRhythm();
        return;
    }
    rhythmRAF = requestAnimationFrame(rhythmLoop);
}

function drawRhythm(elapsed) {
    if (!rhythmCtx) return;
    const ctx = rhythmCtx;
    const w = rhythmCanvas.width, h = rhythmCanvas.height;
    const laneW = w / RHYTHM_LANES;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    for (let i = 1; i < RHYTHM_LANES; i++) {
        ctx.beginPath();
        ctx.moveTo(i * laneW, 0);
        ctx.lineTo(i * laneW, h);
        ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(244,114,182,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, RHYTHM_JUDGE_Y);
    ctx.lineTo(w, RHYTHM_JUDGE_Y);
    ctx.stroke();
    ctx.lineWidth = 1;

    rhythmNotes.forEach(n => {
        if (n.judged) return;
        const y = RHYTHM_JUDGE_Y - ((n.targetTime - elapsed) / RHYTHM_TRAVEL_MS) * RHYTHM_JUDGE_Y;
        if (y < -30 || y > h + 30) return;
        const x = n.lane * laneW + laneW / 2;
        ctx.fillStyle = '#f472b6';
        snakeRoundRectPath(ctx, x - laneW * 0.35, y - 11, laneW * 0.7, 22, 8);
        ctx.fill();
    });
}

function showRhythmJudgement(cls, text) {
    const el = document.getElementById('rhythm-judgement');
    if (!el) return;
    el.textContent = text;
    el.className = 'rhythm-judgement show ' + cls;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.className = 'rhythm-judgement'; }, 400);
}

function rhythmHitLane(lane) {
    if (!rhythmRunning) return;
    const btn = document.querySelector(`.rhythm-lane-btn[data-lane="${lane}"]`);
    if (btn) { btn.classList.add('pressed'); setTimeout(() => btn.classList.remove('pressed'), 100); }

    const elapsed = performance.now() - rhythmStartPerf;
    let best = null, bestDelta = Infinity;
    rhythmNotes.forEach(n => {
        if (n.judged || n.lane !== lane) return;
        const delta = Math.abs(elapsed - n.targetTime);
        if (delta < bestDelta) { bestDelta = delta; best = n; }
    });
    if (!best || bestDelta > RHYTHM_WINDOW_GOOD) return;

    best.judged = true;
    best.hit = true;
    playSound(true);
    if (bestDelta <= RHYTHM_WINDOW_PERFECT) {
        rhythmScore += 100;
        showRhythmJudgement('perfect', t('game_rhythm_perfect'));
    } else {
        rhythmScore += 50;
        showRhythmJudgement('good', t('game_rhythm_good'));
    }
    rhythmCombo++;
    rhythmMaxCombo = Math.max(rhythmMaxCombo, rhythmCombo);

    if (rhythmCanvas) {
        const rect = rhythmCanvas.getBoundingClientRect();
        const laneW = rect.width / RHYTHM_LANES;
        spawnClickParticles(rect.left + (lane + 0.5) * laneW, rect.top + rect.height * (RHYTHM_JUDGE_Y / rhythmCanvas.height));
    }

    document.getElementById('rhythm-score').textContent = rhythmScore;
    document.getElementById('rhythm-combo').textContent = rhythmCombo;
}

document.addEventListener('keydown', (e) => {
    if (!rhythmRunning) return;
    const map = { d: 0, f: 1, j: 2, k: 3 };
    const key = e.key.toLowerCase();
    if (key in map) rhythmHitLane(map[key]);
});

function endRhythm() {
    rhythmRunning = false;
    cancelAnimationFrame(rhythmRAF);
    if (rhythmAudio) rhythmAudio.pause();
    const totalNotes = rhythmNotes.length;
    const hitNotes = rhythmNotes.filter(n => n.hit).length;
    const accuracy = totalNotes > 0 ? Math.round((hitNotes / totalNotes) * 100) : 0;
    saveRhythmHighScore(rhythmSongIndex, rhythmScore);
    document.getElementById('rhythm-highscore').textContent = getRhythmHighScore(rhythmSongIndex);
    const isNewBest = rhythmScore > 0 && rhythmScore === getRhythmHighScore(rhythmSongIndex);
    const overlay = document.getElementById('rhythm-overlay');
    overlay.innerHTML = `
        <p>${t('game_over')}</p>
        <p>${t('game_final_score', { n: rhythmScore })}</p>
        <p>${t('game_rhythm_accuracy', { n: accuracy })} · ${t('game_rhythm_max_combo', { n: rhythmMaxCombo })}</p>
        ${isNewBest ? `<p class="game-new-best">${t('game_new_best')}</p>` : ''}
        <button class="btn next-btn" onclick="startRhythmSong()">${t('game_restart')}</button>
    `;
    overlay.style.display = 'flex';
}
