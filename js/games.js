/* ===================== 🎮 Games Hub ===================== */

function openGame(name) {
    document.getElementById('games-select-card').style.display = 'none';
    document.getElementById('snake-card').style.display = name === 'snake' ? 'block' : 'none';
    document.getElementById('whack-card').style.display = name === 'whack' ? 'block' : 'none';

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
    }
}

function closeGame() {
    stopAllGames();
    document.getElementById('games-select-card').style.display = 'block';
    document.getElementById('snake-card').style.display = 'none';
    document.getElementById('whack-card').style.display = 'none';
}

function stopAllGames() {
    snakeRunning = false;
    clearInterval(snakeInterval);
    whackRunning = false;
    clearInterval(whackTimerInterval);
    clearTimeout(whackMoleTimeout);
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
