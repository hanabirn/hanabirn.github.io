/* ===================== 🎮 Games Hub ===================== */

function openGame(name) {
    document.getElementById('games-select-card').style.display = 'none';
    document.getElementById('snake-card').style.display = name === 'snake' ? 'block' : 'none';
    document.getElementById('whack-card').style.display = name === 'whack' ? 'block' : 'none';
    document.getElementById('game2048-card').style.display = name === '2048' ? 'block' : 'none';
    document.getElementById('match3-card').style.display = name === 'match3' ? 'block' : 'none';
    document.getElementById('wordle-card').style.display = name === 'wordle' ? 'block' : 'none';

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
    } else if (name === '2048') {
        document.getElementById('game2048-highscore').textContent = getGame2048HighScore();
        init2048Swipe();
        const overlay = document.getElementById('game2048-overlay');
        overlay.innerHTML = `<button class="btn next-btn" onclick="start2048()">${t('game_start')}</button>`;
        overlay.style.display = 'flex';
        render2048();
    } else if (name === 'match3') {
        document.getElementById('match3-highscore').textContent = getMatch3HighScore();
        const overlay = document.getElementById('match3-overlay');
        overlay.innerHTML = `<button class="btn next-btn" onclick="startMatch3()">${t('game_start')}</button>`;
        overlay.style.display = 'flex';
    } else if (name === 'wordle') {
        const best = getWordleBest();
        document.getElementById('wordle-best').textContent = best ? best : '-';
        const overlay = document.getElementById('wordle-overlay');
        overlay.innerHTML = `<p>${t('game_wordle_intro')}</p><button class="btn next-btn" onclick="startWordle()">${t('game_start')}</button>`;
        overlay.style.display = 'flex';
        wordleRenderGrid();
        wordleRenderKeyboard();
    }
}

function closeGame() {
    stopAllGames();
    document.getElementById('games-select-card').style.display = 'block';
    document.getElementById('snake-card').style.display = 'none';
    document.getElementById('whack-card').style.display = 'none';
    document.getElementById('game2048-card').style.display = 'none';
    document.getElementById('match3-card').style.display = 'none';
    document.getElementById('wordle-card').style.display = 'none';
}

function stopAllGames() {
    snakeRunning = false;
    clearInterval(snakeInterval);
    whackRunning = false;
    clearInterval(whackTimerInterval);
    clearTimeout(whackMoleTimeout);
    game2048Running = false;
    match3Running = false;
    wordleRunning = false;
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

function drawSnakeBoard(ctx) {
    for (let y = 0; y < SNAKE_GRID; y++) {
        for (let x = 0; x < SNAKE_GRID; x++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? '#9bd35c' : '#8bc94e';
            ctx.fillRect(x * snakeCellSize, y * snakeCellSize, snakeCellSize, snakeCellSize);
        }
    }
}

function drawSnakeFood(ctx) {
    const cs = snakeCellSize;
    const cx = (snakeFood.x + 0.5) * cs;
    const cy = (snakeFood.y + 0.5) * cs;
    const r = cs * 0.34;

    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.95, r, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.08, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.35, cy - r * 0.2, r * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#6d4c2b';
    ctx.lineWidth = Math.max(1.5, cs * 0.06);
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.85);
    ctx.lineTo(cx + r * 0.2, cy - r * 1.3);
    ctx.stroke();

    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.6, cy - r * 1.15, r * 0.34, r * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawSnakeEyes(ctx, head) {
    const cs = snakeCellSize;
    const cx = head.x * cs + cs / 2;
    const cy = head.y * cs + cs / 2;
    const off = cs * 0.22;
    const r = cs * 0.09;
    let e1, e2;
    if (snakeDir.x === 1) { e1 = [cx + off * 0.3, cy - off]; e2 = [cx + off * 0.3, cy + off]; }
    else if (snakeDir.x === -1) { e1 = [cx - off * 0.3, cy - off]; e2 = [cx - off * 0.3, cy + off]; }
    else if (snakeDir.y === -1) { e1 = [cx - off, cy - off * 0.3]; e2 = [cx + off, cy - off * 0.3]; }
    else { e1 = [cx - off, cy + off * 0.3]; e2 = [cx + off, cy + off * 0.3]; }
    [e1, e2].forEach(([ex, ey]) => {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3b0764';
        ctx.beginPath(); ctx.arc(ex + snakeDir.x * r * 0.35, ey + snakeDir.y * r * 0.35, r * 0.55, 0, Math.PI * 2); ctx.fill();
    });
}

function drawSnake() {
    if (!snakeCtx) return;
    const ctx = snakeCtx;
    ctx.clearRect(0, 0, snakeCanvas.width, snakeCanvas.height);
    drawSnakeBoard(ctx);

    drawSnakeFood(ctx);

    snakeBody.forEach((seg, i) => {
        const isHead = i === 0;
        ctx.fillStyle = isHead ? '#2563eb' : '#3b82f6';
        const pad = 1.5;
        snakeRoundRectPath(ctx, seg.x * snakeCellSize + pad, seg.y * snakeCellSize + pad, snakeCellSize - pad * 2, snakeCellSize - pad * 2, 8);
        ctx.fill();

        const shineH = (snakeCellSize - pad * 2) * 0.35;
        ctx.fillStyle = isHead ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)';
        snakeRoundRectPath(ctx, seg.x * snakeCellSize + pad + 2, seg.y * snakeCellSize + pad + 2, snakeCellSize - pad * 2 - 4, shineH, 4);
        ctx.fill();

        if (isHead) drawSnakeEyes(ctx, seg);
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
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); snakeSetDir(0, -1); }
    else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); snakeSetDir(0, 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); snakeSetDir(-1, 0); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); snakeSetDir(1, 0); }
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

/* ===================== 🔢 2048 ===================== */

const GAME2048_SIZE = 4;
const GAME2048_COLORS = {
    2: '#eee4da',
    4: '#eee1c9',
    8: '#f3b27a',
    16: '#f69664',
    32: '#f77c5f',
    64: '#f65e3b',
    128: '#edcf72',
    256: '#edcc61',
    512: '#edc850',
    1024: '#edc53f',
    2048: '#edc22e'
};

let game2048Grid = [];
let game2048Score = 0;
let game2048Running = false;
let game2048Won = false;
let game2048SwipeInit = false;

function get2048Color(v) {
    return GAME2048_COLORS[v] || '#3c3a32';
}

function getGame2048HighScore() {
    return parseInt(localStorage.getItem('game2048_high_score') || '0', 10);
}
function saveGame2048HighScore(score) {
    if (score > getGame2048HighScore()) localStorage.setItem('game2048_high_score', String(score));
}

function add2048Tile() {
    const empty = [];
    for (let y = 0; y < GAME2048_SIZE; y++) {
        for (let x = 0; x < GAME2048_SIZE; x++) {
            if (game2048Grid[y][x] === 0) empty.push({ x, y });
        }
    }
    if (empty.length === 0) return;
    const { x, y } = empty[Math.floor(Math.random() * empty.length)];
    game2048Grid[y][x] = Math.random() < 0.9 ? 2 : 4;
}

function render2048() {
    const container = document.getElementById('game2048-grid');
    if (!container) return;
    container.innerHTML = '';
    for (let y = 0; y < GAME2048_SIZE; y++) {
        for (let x = 0; x < GAME2048_SIZE; x++) {
            const v = game2048Grid[y] ? game2048Grid[y][x] : 0;
            const cell = document.createElement('div');
            cell.className = 'game2048-cell';
            if (v > 0) {
                cell.textContent = v;
                cell.style.background = get2048Color(v);
                cell.style.color = v <= 4 ? '#776e65' : '#f9f6f2';
                if (v >= 1000) cell.style.fontSize = '0.95rem';
            }
            container.appendChild(cell);
        }
    }
}

function start2048() {
    document.getElementById('game2048-overlay').style.display = 'none';
    game2048Grid = Array.from({ length: GAME2048_SIZE }, () => Array(GAME2048_SIZE).fill(0));
    game2048Score = 0;
    game2048Won = false;
    document.getElementById('game2048-score').textContent = '0';
    game2048Running = true;
    add2048Tile();
    add2048Tile();
    render2048();
}

function is2048GameOver() {
    const size = GAME2048_SIZE;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (game2048Grid[y][x] === 0) return false;
            if (x < size - 1 && game2048Grid[y][x] === game2048Grid[y][x + 1]) return false;
            if (y < size - 1 && game2048Grid[y][x] === game2048Grid[y + 1][x]) return false;
        }
    }
    return true;
}

function move2048(dx, dy) {
    if (!game2048Running) return;
    const size = GAME2048_SIZE;
    const before = JSON.stringify(game2048Grid);
    let scoreGain = 0;

    function collapseLine(values) {
        const nums = values.filter(v => v !== 0);
        const result = [];
        for (let i = 0; i < nums.length; i++) {
            if (i < nums.length - 1 && nums[i] === nums[i + 1]) {
                const merged = nums[i] * 2;
                result.push(merged);
                scoreGain += merged;
                i++;
            } else {
                result.push(nums[i]);
            }
        }
        while (result.length < size) result.push(0);
        return result;
    }

    if (dx !== 0) {
        for (let y = 0; y < size; y++) {
            let line = game2048Grid[y];
            if (dx === 1) line = line.slice().reverse();
            let collapsed = collapseLine(line);
            if (dx === 1) collapsed = collapsed.reverse();
            game2048Grid[y] = collapsed;
        }
    } else if (dy !== 0) {
        for (let x = 0; x < size; x++) {
            let col = game2048Grid.map(row => row[x]);
            if (dy === 1) col = col.reverse();
            let collapsed = collapseLine(col);
            if (dy === 1) collapsed = collapsed.reverse();
            for (let y = 0; y < size; y++) game2048Grid[y][x] = collapsed[y];
        }
    }

    if (JSON.stringify(game2048Grid) === before) return;

    game2048Score += scoreGain;
    document.getElementById('game2048-score').textContent = game2048Score;
    if (scoreGain > 0) playSound(true);
    add2048Tile();
    render2048();

    if (!game2048Won && game2048Grid.some(row => row.includes(2048))) {
        game2048Won = true;
        showShareToast(t('game_2048_win'));
    }

    if (is2048GameOver()) end2048();
}

document.addEventListener('keydown', (e) => {
    if (!game2048Running) return;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); move2048(0, -1); }
    else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); move2048(0, 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); move2048(-1, 0); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); move2048(1, 0); }
});

let game2048TouchStart = null;
function init2048Swipe() {
    if (game2048SwipeInit) return;
    const grid = document.getElementById('game2048-grid');
    if (!grid) return;
    grid.addEventListener('touchstart', (e) => {
        const t0 = e.touches[0];
        game2048TouchStart = { x: t0.clientX, y: t0.clientY };
    }, { passive: true });
    grid.addEventListener('touchend', (e) => {
        if (!game2048TouchStart) return;
        const t0 = e.changedTouches[0];
        const dx = t0.clientX - game2048TouchStart.x;
        const dy = t0.clientY - game2048TouchStart.y;
        if (Math.abs(dx) < 20 && Math.abs(dy) < 20) { game2048TouchStart = null; return; }
        if (Math.abs(dx) > Math.abs(dy)) move2048(dx > 0 ? 1 : -1, 0);
        else move2048(0, dy > 0 ? 1 : -1);
        game2048TouchStart = null;
    }, { passive: true });
    game2048SwipeInit = true;
}

function end2048() {
    game2048Running = false;
    playSound(false);
    saveGame2048HighScore(game2048Score);
    document.getElementById('game2048-highscore').textContent = getGame2048HighScore();
    const isNewBest = game2048Score > 0 && game2048Score === getGame2048HighScore();
    const overlay = document.getElementById('game2048-overlay');
    overlay.innerHTML = `
        <p>${t('game_over')}</p>
        <p>${t('game_final_score', { n: game2048Score })}</p>
        ${isNewBest ? `<p class="game-new-best">${t('game_new_best')}</p>` : ''}
        <button class="btn next-btn" onclick="start2048()">${t('game_restart')}</button>
    `;
    overlay.style.display = 'flex';
}

/* ===================== 🌸 Match-3 (六消樂) ===================== */

const MATCH3_SIZE = 8;
const MATCH3_SYMBOLS = ['🍬', '🍭', '🍫', '🍩', '🍪', '🧁'];
const MATCH3_COLORS = {
    '🍬': ['#fbcfe8', '#f472b6'],
    '🍭': ['#fca5a5', '#ef4444'],
    '🍫': ['#c39a6b', '#8a5a2b'],
    '🍩': ['#fde68a', '#f59e0b'],
    '🍪': ['#e7c496', '#b8813f'],
    '🧁': ['#ddd6fe', '#a855f7'],
};
const MATCH3_MOVES = 20;
const MATCH3_COMBO_TEXT = { 2: 'game_combo_2', 3: 'game_combo_3', 4: 'game_combo_4' };

let match3Board = [];
let match3Score = 0;
let match3MovesLeft = MATCH3_MOVES;
let match3Running = false;
let match3Selected = null;
let match3Busy = false;

function getMatch3HighScore() {
    return parseInt(localStorage.getItem('match3_high_score') || '0', 10);
}
function saveMatch3HighScore(score) {
    if (score > getMatch3HighScore()) localStorage.setItem('match3_high_score', String(score));
}

function match3RandomSymbol() {
    return MATCH3_SYMBOLS[Math.floor(Math.random() * MATCH3_SYMBOLS.length)];
}

function match3SwapCells(board, x1, y1, x2, y2) {
    const tmp = board[y1][x1];
    board[y1][x1] = board[y2][x2];
    board[y2][x2] = tmp;
}

function match3FindMatches(board) {
    const size = MATCH3_SIZE;
    const matched = new Set();
    for (let y = 0; y < size; y++) {
        let runStart = 0;
        for (let x = 1; x <= size; x++) {
            if (x < size && board[y][x] === board[y][runStart]) continue;
            if (x - runStart >= 3) {
                for (let k = runStart; k < x; k++) matched.add(y + ',' + k);
            }
            runStart = x;
        }
    }
    for (let x = 0; x < size; x++) {
        let runStart = 0;
        for (let y = 1; y <= size; y++) {
            if (y < size && board[y][x] === board[runStart][x]) continue;
            if (y - runStart >= 3) {
                for (let k = runStart; k < y; k++) matched.add(k + ',' + x);
            }
            runStart = y;
        }
    }
    return matched;
}

function match3GenerateBoard() {
    let board;
    let tries = 0;
    do {
        board = Array.from({ length: MATCH3_SIZE }, () => Array.from({ length: MATCH3_SIZE }, () => match3RandomSymbol()));
        tries++;
    } while (match3FindMatches(board).size > 0 && tries < 50);
    return board;
}

function match3HasValidMove(board) {
    const size = MATCH3_SIZE;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (x < size - 1) {
                match3SwapCells(board, x, y, x + 1, y);
                const has = match3FindMatches(board).size > 0;
                match3SwapCells(board, x, y, x + 1, y);
                if (has) return true;
            }
            if (y < size - 1) {
                match3SwapCells(board, x, y, x, y + 1);
                const has = match3FindMatches(board).size > 0;
                match3SwapCells(board, x, y, x, y + 1);
                if (has) return true;
            }
        }
    }
    return false;
}

function match3ApplyGravity(board) {
    const size = MATCH3_SIZE;
    const newTiles = new Set();
    for (let x = 0; x < size; x++) {
        let write = size - 1;
        for (let y = size - 1; y >= 0; y--) {
            if (board[y][x] !== null) {
                board[write][x] = board[y][x];
                if (write !== y) board[y][x] = null;
                write--;
            }
        }
        for (let y = write; y >= 0; y--) {
            board[y][x] = match3RandomSymbol();
            newTiles.add(y + ',' + x);
        }
    }
    return newTiles;
}

function match3Render(newTiles) {
    const container = document.getElementById('match3-grid');
    if (!container) return;
    container.innerHTML = '';
    for (let y = 0; y < MATCH3_SIZE; y++) {
        for (let x = 0; x < MATCH3_SIZE; x++) {
            const cell = document.createElement('div');
            cell.className = 'match3-cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            const symbol = match3Board[y][x];
            if (symbol) {
                const colors = MATCH3_COLORS[symbol] || ['#e5e7eb', '#9ca3af'];
                const candy = document.createElement('span');
                candy.className = 'match3-candy' + (newTiles && newTiles.has(y + ',' + x) ? ' drop-in' : '');
                candy.style.background = `radial-gradient(circle at 32% 28%, ${colors[0]}, ${colors[1]})`;
                candy.textContent = symbol;
                cell.appendChild(candy);
            }
            cell.onclick = () => match3ClickCell(x, y);
            if (match3Selected && match3Selected.x === x && match3Selected.y === y) {
                cell.classList.add('selected');
            }
            container.appendChild(cell);
        }
    }
}

function match3ShowCombo(cascadeLevel) {
    const key = MATCH3_COMBO_TEXT[Math.min(cascadeLevel, 4)];
    if (!key) return;
    const wrap = document.querySelector('.match3-wrap');
    if (!wrap) return;
    let el = document.getElementById('match3-combo');
    if (!el) {
        el = document.createElement('div');
        el.id = 'match3-combo';
        el.className = 'match3-combo';
        wrap.appendChild(el);
    }
    el.textContent = t(key);
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
}

function match3RenderClearing(matchSet) {
    document.querySelectorAll('.match3-cell').forEach(cell => {
        const key = cell.dataset.y + ',' + cell.dataset.x;
        if (matchSet.has(key)) cell.classList.add('clearing');
    });
}

function startMatch3() {
    document.getElementById('match3-overlay').style.display = 'none';
    match3Board = match3GenerateBoard();
    match3Score = 0;
    match3MovesLeft = MATCH3_MOVES;
    match3Selected = null;
    match3Busy = false;
    match3Running = true;
    document.getElementById('match3-score').textContent = '0';
    document.getElementById('match3-moves').textContent = match3MovesLeft;

    const allTiles = new Set();
    for (let y = 0; y < MATCH3_SIZE; y++) {
        for (let x = 0; x < MATCH3_SIZE; x++) allTiles.add(y + ',' + x);
    }
    match3Render(allTiles);
}

function match3ClickCell(x, y) {
    if (!match3Running || match3Busy) return;
    if (!match3Selected) {
        match3Selected = { x, y };
        match3Render();
        return;
    }
    if (match3Selected.x === x && match3Selected.y === y) {
        match3Selected = null;
        match3Render();
        return;
    }
    const isAdjacent = (Math.abs(match3Selected.x - x) + Math.abs(match3Selected.y - y)) === 1;
    if (!isAdjacent) {
        match3Selected = { x, y };
        match3Render();
        return;
    }
    attemptMatch3Swap(match3Selected.x, match3Selected.y, x, y);
}

async function attemptMatch3Swap(x1, y1, x2, y2) {
    match3Busy = true;
    match3SwapCells(match3Board, x1, y1, x2, y2);
    const matches = match3FindMatches(match3Board);
    if (matches.size === 0) {
        match3SwapCells(match3Board, x1, y1, x2, y2);
        match3Selected = null;
        match3Render();
        playSound(false);
        match3Busy = false;
        return;
    }

    playSound(true);
    match3Selected = null;
    match3Render();
    match3MovesLeft--;
    document.getElementById('match3-moves').textContent = match3MovesLeft;

    await match3ResolveCascade();
    match3Busy = false;

    if (!match3HasValidMove(match3Board)) {
        match3Board = match3GenerateBoard();
        match3Render();
    }
    if (match3MovesLeft <= 0) endMatch3();
}

async function match3ResolveCascade() {
    let cascadeLevel = 0;
    while (true) {
        const matches = match3FindMatches(match3Board);
        if (matches.size === 0) break;
        cascadeLevel++;
        match3Score += matches.size * 10 * cascadeLevel;
        document.getElementById('match3-score').textContent = match3Score;
        if (cascadeLevel >= 2) match3ShowCombo(cascadeLevel);

        match3RenderClearing(matches);
        await new Promise(r => setTimeout(r, 200));

        matches.forEach(key => {
            const [y, x] = key.split(',').map(Number);
            match3Board[y][x] = null;
        });
        const newTiles = match3ApplyGravity(match3Board);
        match3Render(newTiles);
        await new Promise(r => setTimeout(r, 150));
    }
}

function endMatch3() {
    match3Running = false;
    saveMatch3HighScore(match3Score);
    document.getElementById('match3-highscore').textContent = getMatch3HighScore();
    const isNewBest = match3Score > 0 && match3Score === getMatch3HighScore();
    const overlay = document.getElementById('match3-overlay');
    overlay.innerHTML = `
        <p>${t('game_over')}</p>
        <p>${t('game_final_score', { n: match3Score })}</p>
        ${isNewBest ? `<p class="game-new-best">${t('game_new_best')}</p>` : ''}
        <button class="btn next-btn" onclick="startMatch3()">${t('game_restart')}</button>
    `;
    overlay.style.display = 'flex';
}

/* ===================== 🟩 Wordle ===================== */

const WORDLE_WORDS = ['aback','abase','abate','abbey','abbot','abhor','abide','abled','abode','abort','about','above','abuse','abyss','acorn','acrid','actor','acute','adage','adapt','adept','admin','admit','adobe','adopt','adore','adorn','adult','affix','afire','afoot','afoul','after','again','agape','agate','agent','agile','aging','aglow','agony','agora','agree','ahead','aider','aisle','alarm','album','alert','algae','alibi','alien','align','alike','alive','allay','alley','allot','allow','alloy','aloft','aloha','alone','along','aloof','aloud','alpha','altar','alter','amass','amaze','amber','amble','amend','amiss','amity','among','ample','amply','amuse','angel','anger','angle','angry','angst','anime','ankle','annex','annoy','annul','anode','antic','anvil','aorta','apart','aphid','aping','apnea','apple','apply','apron','aptly','arbor','ardor','arena','argue','arise','armor','aroma','arose','array','arrow','arson','artsy','ascot','ashen','aside','askew','aspic','assay','asset','atoll','atone','attic','audio','audit','augur','aunty','avail','avert','avian','avoid','await','awake','award','aware','awash','awful','awoke','axial','axiom','axion','azure','bacon','badge','badly','bagel','baggy','baker','baler','balmy','balsa','banal','banjo','barge','baron','basal','basic','basil','basin','basis','baste','batch','bathe','baton','batty','bawdy','bayou','beach','beady','beard','beast','beaut','beech','beefy','befit','began','begat','beget','begin','begun','being','belch','belie','belle','belly','below','bench','beret','berry','berth','beset','betel','bevel','bezel','bible','bicep','biddy','bigot','bilge','billy','binge','bingo','biome','birch','birth','bison','bitty','black','blade','blame','bland','blank','blare','blast','blaze','bleak','bleat','bleed','bleep','blend','bless','blimp','blind','blink','bliss','blitz','bloat','block','bloke','blond','blood','bloom','blown','bluer','bluff','blunt','blurb','blurt','blush','board','boast','bobby','boney','bongo','bonus','booby','boost','booth','booty','booze','boozy','borax','borne','bosom','bossy','botch','bough','boule','bound','bowel','boxer','brace','braid','brain','brake','brand','brash','brass','brave','bravo','brawl','brawn','bread','break','breed','briar','bribe','brick','bride','brief','brine','bring','brink','briny','brisk','broad','broil','broke','brood','brook','broom','broth','brown','brunt','brush','brute','buddy','budge','buggy','bugle','build','built','bulge','bulky','bully','bunch','bunny','burly','burnt','burst','bused','bushy','butch','butte','buxom','buyer','bylaw','cabal','cabby','cabin','cable','cacao','cache','cacti','caddy','cadet','cagey','cairn','camel','cameo','canal','candy','canny','canoe','canon','caper','caput','carat','cargo','carol','carom','carry','carve','caste','catch','cater','catty','caulk','cause','cavil','cease','cedar','cello','chafe','chaff','chain','chair','chalk','champ','chant','chaos','chard','charm','chart','chase','chasm','cheap','cheat','check','cheek','cheer','chess','chest','chick','chide','chief','child','chili','chill','chime','china','chirp','chock','choir','choke','chord','chore','chose','chuck','chump','chunk','churn','chute','cider','cigar','cinch','circa','civic','civil','clack','claim','clamp','clang','clank','clash','clasp','class','clean','clear','cleat','cleft','clerk','click','cliff','climb','cling','clink','cloak','clock','clone','close','cloth','cloud','clout','clove','clown','cluck','clued','clump','clung','clunk','coach','coast','cobra','cocoa','colon','color','comet','comfy','comic','comma','conch','condo','conic','copse','coral','corer','corny','couch','cough','could','count','coupe','court','coven','cover','covet','covey','cower','coyly','crack','craft','cramp','crane','crank','crash','crass','crate','crave','crawl','craze','crazy','creak','cream','credo','creed','creek','creep','creme','crepe','crept','cress','crest','crick','cried','crier','crime','crimp','crisp','croak','crock','crone','crony','crook','cross','croup','crowd','crown','crude','cruel','crumb','crump','crush','crust','crypt','cubic','cubit','cumin','curio','curly','curry','curse','curve','curvy','cutie','cyber','cycle','cynic','daddy','daily','dairy','daisy','dally','dance','dandy','datum','daunt','dealt','death','debar','debit','debug','debut','decal','decay','decor','decoy','decry','defer','deign','deity','delay','delta','delve','demon','demur','denim','dense','depot','depth','derby','deter','detox','deuce','devil','diary','dicey','digit','dilly','dimly','diner','dingo','dingy','diode','dirge','dirty','disco','ditch','ditto','ditty','diver','divot','dizzy','dodge','dodgy','dogma','doing','dolly','donor','donut','dopey','doubt','dough','dowdy','dowel','downy','dowry','dozen','draft','drain','drake','drama','drank','drape','drawl','drawn','dread','dream','dress','dried','drier','drift','drill','drink','drive','droit','droll','drone','drool','droop','dross','drove','drown','druid','drunk','dryer','dryly','duchy','dully','dummy','dumpy','dunce','dusky','dusty','dutch','duvet','dwarf','dwell','dwelt','dying','eager','eagle','early','earth','easel','eaten','eater','ebony','eclat','edict','edify','eerie','egret','eight','eject','eking','elate','elbow','elder','elect','elegy','elfin','elide','elite','elope','elude','email','embed','ember','emcee','emoji','empty','enact','endow','enema','enemy','enjoy','ennui','ensue','enter','entry','envoy','epoch','epoxy','equal','equip','erase','erect','erode','error','erupt','essay','ester','ether','ethic','ethos','etude','evade','event','every','evict','evoke','exact','exalt','excel','exert','exile','exist','expel','extol','extra','exult','eying','fable','facet','faint','fairy','faith','false','fancy','fanny','farce','fatal','fatty','fault','fauna','favor','feast','fecal','feign','fella','felon','femme','femur','fence','feral','ferry','fetal','fetch','fetid','fetus','fever','fewer','fiber','fibre','ficus','field','fiend','fiery','fifth','fifty','fight','filer','filet','filly','filmy','filth','final','finch','finer','first','fishy','fixer','fizzy','fjord','flack','flail','flair','flake','flaky','flame','flank','flare','flash','flask','fleck','fleet','flesh','flick','flier','fling','flint','flirt','float','flock','flood','floor','flora','floss','flour','flout','flown','fluff','fluid','fluke','flume','flung','flunk','flush','flute','flyer','foamy','focal','focus','foggy','foist','folio','folly','foray','force','forge','forgo','forte','forth','forty','forum','found','foyer','frail','frame','frank','fraud','freak','freed','freer','fresh','friar','fried','frill','frisk','fritz','frock','frond','front','frost','froth','frown','froze','fruit','fudge','fugue','fully','fungi','funky','funny','furor','furry','fussy','fuzzy','gaffe','gaily','gamer','gamma','gamut','gassy','gaudy','gauge','gaunt','gauze','gavel','gawky','gayer','gayly','gazer','gecko','geeky','geese','genie','genre','geode','ghost','ghoul','giant','giddy','gipsy','girly','girth','given','giver','glade','gland','glare','glass','glaze','gleam','glean','glide','glint','gloat','globe','gloom','glory','gloss','glove','glyph','gnash','gnome','godly','going','golem','golly','gonad','goner','goody','gooey','goofy','goose','gorge','gouge','gourd','grace','grade','graft','grail','grain','grand','grant','grape','graph','grasp','grass','grate','grave','gravy','graze','great','greed','green','greet','grief','grill','grime','grimy','grind','gripe','groan','groin','groom','grope','gross','group','grout','grove','growl','grown','gruel','gruff','grunt','guano','guard','guava','guess','guest','guide','guild','guile','guilt','guise','gulch','gully','gumbo','gummy','guppy','gusto','gusty','gypsy','habit','hairy','halve','handy','happy','hardy','harem','harpy','harry','harsh','haste','hasty','hatch','hater','haunt','haute','haven','havoc','hazel','heady','heard','heart','heath','heave','heavy','hedge','hefty','heist','helix','hello','hence','heron','hilly','hinge','hippo','hippy','hitch','hoard','hobby','hoist','holly','homer','honey','honor','horde','horny','horse','hotel','hotly','hound','house','hovel','hover','howdy','human','humid','humor','humph','humus','hunch','hunky','hurry','husky','hussy','hutch','hydro','hyena','hymen','hyper','icily','icing','ideal','idiom','idiot','idler','idyll','igloo','iliac','image','imbue','impel','imply','inane','inbox','incur','index','indie','inept','inert','infer','ingot','inlay','inlet','inner','input','inter','intro','ionic','irate','irony','islet','issue','itchy','ivory','jaunt','jazzy','jelly','jerky','jetty','jewel','jiffy','joint','joist','joker','jolly','joust','judge','juice','juicy','jumbo','jumpy','junta','junto','juror','kappa','karma','kayak','kazoo','kebab','khaki','kinky','kiosk','kitty','knack','knave','knead','kneed','kneel','knelt','knife','knock','knoll','known','koala','krill','label','labor','laden','ladle','lager','lance','lanky','lapel','lapse','large','larva','laser','lasso','latch','later','latte','laugh','layer','leach','leafy','leaky','leant','leapt','learn','lease','leash','least','leave','ledge','leech','leery','lefty','legal','leggy','lemon','lemur','leper','level','lever','libel','liege','light','liken','lilac','limbo','limit','linen','liner','lingo','lipid','lithe','liver','livid','llama','loamy','loath','lobby','local','locus','lodge','lofty','logic','login','loopy','loose','loris','lorry','loser','louse','lousy','lover','lower','lowly','loyal','lucid','lucky','lumen','lumpy','lunar','lunch','lunge','lupus','lurch','lurid','lusty','lying','lymph','lynch','lyric','macaw','macho','macro','madam','madly','mafia','magic','magma','maize','major','maker','mambo','mamma','mammy','manga','mange','mango','mangy','mania','manic','manly','manor','maple','march','marry','marsh','mason','masse','match','matey','mauve','maven','maxim','maybe','mayor','mealy','meant','meaty','mecca','medal','media','medic','melee','melon','mercy','merge','merit','merry','metal','meter','metro','micro','midge','midst','might','milky','mimic','mince','miner','minim','minor','minty','minus','mirth','miser','missy','mocha','modal','model','modem','mogul','moist','molar','moldy','mommy','money','month','moody','moose','moral','moron','morph','mossy','motel','motif','motor','motto','moult','mound','mount','mourn','mouse','mouth','mover','movie','mower','mucky','mucus','muddy','mulch','mummy','munch','mural','murky','mushy','music','musky','musty','myrrh','nadir','naive','nanny','nasal','nasty','natal','naval','navel','needy','neigh','nerdy','nerve','nervy','never','newer','newly','nicer','niche','niece','night','ninja','ninny','ninth','noble','nobly','noise','noisy','nomad','noose','north','nosey','notch','novel','nudge','nurse','nutty','nylon','nymph','oaken','oasis','obese','occur','ocean','octal','octet','odder','oddly','offal','offer','often','olden','older','olive','ombre','omega','onion','onset','opera','opine','opium','optic','orbit','order','organ','other','otter','ought','ounce','outdo','outer','outgo','ovary','ovate','overt','ovine','ovoid','owing','owner','oxide','ozone','paddy','pagan','paint','paler','palsy','panel','panic','pansy','papal','paper','parer','parka','parry','parse','party','pasta','paste','pasty','patch','patio','patsy','patty','pause','payee','payer','peace','peach','pearl','pecan','pedal','penal','pence','penne','penny','perch','peril','perky','pesky','pesto','petal','petty','phase','phone','phony','photo','piano','picky','piece','piety','piggy','pilot','pinch','piney','pinky','pinto','pious','piper','pique','pitch','pithy','pivot','pixel','pixie','pizza','place','plaid','plain','plait','plane','plank','plant','plate','plaza','plead','pleat','plied','plier','pluck','plumb','plume','plump','plunk','plush','poesy','point','poise','poker','polar','polka','polyp','pooch','poppy','porch','poser','posit','posse','pouch','pound','pouty','power','prank','prawn','preen','press','price','prick','pride','pried','prime','primo','print','prior','prism','privy','prize','probe','prone','prong','proof','prose','proud','prove','prowl','proxy','prude','prune','psalm','pshaw','pubic','pudgy','puffy','pulpy','pulse','punch','pupal','pupil','puppy','puree','purer','purge','purse','pushy','putty','pygmy','quack','quail','quake','qualm','quark','quart','quash','quasi','queen','queer','quell','query','quest','queue','quick','quiet','quill','quilt','quirk','quite','quota','quote','quoth','rabbi','rabid','racer','radar','radii','radio','rainy','raise','rajah','rally','ralph','ramen','ranch','randy','range','rapid','rarer','raspy','ratio','ratty','raven','rayon','razor','reach','react','ready','realm','rearm','rebar','rebel','rebus','rebut','recap','recur','recut','reedy','refer','refit','regal','rehab','reign','relax','relay','relic','remit','renal','renew','repay','repel','reply','rerun','reset','resin','retch','retro','retry','reuse','revel','revue','rhino','rhyme','rider','ridge','rifle','right','rigid','rigor','rinse','ripen','riper','risen','riser','risky','rival','river','rivet','roach','roast','robin','robot','rocky','rodeo','roger','rogue','roomy','roost','rotor','rouge','rough','round','rouse','route','rover','rowdy','rower','royal','ruddy','ruder','rugby','ruler','rumba','rumor','rupee','rural','rusty','sadly','safer','saint','salad','sally','salon','salsa','salty','salve','salvo','sandy','saner','sappy','sassy','satin','satyr','sauce','saucy','sauna','saute','savor','savoy','savvy','scald','scale','scalp','scaly','scamp','scant','scare','scarf','scary','scene','scent','scion','scoff','scold','scone','scoop','scope','score','scorn','scour','scout','scowl','scram','scrap','scree','screw','scrub','scrum','scuba','sedan','seedy','segue','seize','semen','sense','sepia','serif','serum','serve','setup','seven','sever','sewer','shack','shade','shady','shaft','shake','shaky','shale','shall','shalt','shame','shank','shape','shard','share','shark','sharp','shave','shawl','shear','sheen','sheep','sheer','sheet','sheik','shelf','shell','shied','shift','shill','shine','shiny','shire','shirk','shirt','shoal','shock','shone','shook','shoot','shore','shorn','short','shout','shove','shown','showy','shrew','shrub','shrug','shuck','shunt','shush','shyly','siege','sieve','sight','sigma','silky','silly','since','sinew','singe','siren','sissy','sixth','sixty','skate','skier','skiff','skill','skimp','skirt','skulk','skull','skunk','slack','slain','slang','slant','slash','slate','slave','sleek','sleep','sleet','slept','slice','slick','slide','slime','slimy','sling','slink','sloop','slope','slosh','sloth','slump','slung','slunk','slurp','slush','slyly','smack','small','smart','smash','smear','smell','smelt','smile','smirk','smite','smith','smock','smoke','smoky','smote','snack','snafu','snail','snake','snaky','snare','snarl','sneak','sneer','snide','sniff','snipe','snoop','snore','snort','snout','snowy','snuck','snuff','soapy','sober','soggy','solar','solid','solve','sonar','sonic','sooth','sooty','sorry','sound','south','sower','space','spade','spank','spare','spark','spasm','spawn','speak','spear','speck','speed','spell','spelt','spend','spent','sperm','spice','spicy','spied','spiel','spike','spiky','spill','spilt','spine','spiny','spire','spite','splat','split','spoil','spoke','spoof','spook','spool','spoon','spore','sport','spout','spray','spree','sprig','spunk','spurn','spurt','squad','squat','squib','stack','staff','stage','staid','stain','stair','stake','stale','stalk','stall','stamp','stand','stank','stare','stark','start','stash','state','stave','stead','steak','steal','steam','steed','steel','steep','steer','stein','stern','stick','stiff','still','stilt','sting','stink','stint','stock','stoic','stoke','stole','stomp','stone','stony','stood','stool','stoop','store','stork','storm','story','stout','stove','strap','straw','stray','strip','strut','stuck','study','stuff','stump','stung','stunk','stunt','style','suave','sugar','suing','suite','sulky','sully','sumac','sunny','super','surer','surge','surly','sushi','swami','swamp','swarm','swash','swath','swear','sweat','sweep','sweet','swell','swept','swift','swill','swine','swing','swirl','swish','swoon','swoop','sword','swore','sworn','swung','synod','syrup','tabby','table','taboo','tacit','tacky','taffy','taint','taken','taker','tally','talon','tamer','tango','tangy','taper','tapir','tardy','tarot','taste','tasty','tatty','taunt','tawny','teach','teary','tease','teddy','teeth','tempo','tenet','tenor','tense','tenth','tepee','tepid','terra','terse','testy','thank','theft','their','theme','there','these','theta','thick','thief','thigh','thing','think','third','thong','thorn','those','three','threw','throb','throw','thrum','thumb','thump','thyme','tiara','tibia','tidal','tiger','tight','tilde','timer','timid','tipsy','titan','tithe','title','toady','toast','today','toddy','token','tonal','tonga','tonic','tooth','topaz','topic','torch','torso','torus','total','totem','touch','tough','towel','tower','toxic','toxin','trace','track','tract','trade','trail','train','trait','tramp','trash','trawl','tread','treat','trend','triad','trial','tribe','trice','trick','tried','tripe','trite','troll','troop','trope','trout','trove','truce','truck','truer','truly','trump','trunk','truss','trust','truth','tryst','tubal','tuber','tulip','tulle','tumor','tunic','turbo','tutor','twang','tweak','tweed','tweet','twice','twine','twirl','twist','twixt','tying','udder','ulcer','ultra','umbra','uncle','uncut','under','undid','undue','unfed','unfit','unify','union','unite','unity','unlit','unmet','unset','untie','until','unwed','unzip','upper','upset','urban','urine','usage','usher','using','usual','usurp','utile','utter','uvula','vague','valet','valid','valor','value','valve','vapid','vapor','vault','vaunt','vegan','venom','venue','verge','verse','verso','verve','vicar','video','vigil','vigor','villa','vinyl','viola','viper','viral','virus','visit','visor','vista','vital','vivid','vixen','vocal','vodka','vogue','voice','voila','vomit','voter','vouch','vowel','vying','wacky','wafer','wager','wagon','waist','waive','waltz','warty','waste','watch','water','waver','waxen','weary','weave','wedge','weedy','weigh','weird','welch','welsh','wench','whack','whale','wharf','wheat','wheel','whelp','where','which','whiff','while','whine','whiny','whirl','whisk','white','whole','whoop','whose','widen','wider','widow','width','wield','wight','willy','wimpy','wince','winch','windy','wiser','wispy','witch','witty','woken','woman','women','woody','wooer','wooly','woozy','wordy','world','worry','worse','worst','worth','would','wound','woven','wrack','wrath','wreak','wreck','wrest','wring','wrist','write','wrong','wrote','wrung','wryly','yacht','yearn','yeast','yield','young','youth','zebra','zesty','zonal'];

let wordleAnswer = '';
let wordleGuesses = [];
let wordleCurrentGuess = '';
let wordleRow = 0;
let wordleRunning = false;
let wordleKeyStates = {};

const WORDLE_KEYBOARD_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

function getWordleBest() {
    const v = localStorage.getItem('wordle_best');
    return v ? parseInt(v, 10) : 0;
}
function saveWordleBest(guessesUsed) {
    const cur = getWordleBest();
    if (!cur || guessesUsed < cur) localStorage.setItem('wordle_best', String(guessesUsed));
}

function wordleRandomWord() {
    return WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)];
}

function startWordle() {
    document.getElementById('wordle-overlay').style.display = 'none';
    wordleAnswer = wordleRandomWord();
    wordleGuesses = [];
    wordleCurrentGuess = '';
    wordleRow = 0;
    wordleKeyStates = {};
    wordleRunning = true;
    document.getElementById('wordle-attempt').textContent = '0';
    wordleRenderGrid();
    wordleRenderKeyboard();
}

function wordleEvaluate(guess) {
    const answerLetters = wordleAnswer.split('');
    const guessLetters = guess.split('');
    const states = new Array(5).fill('absent');
    const remaining = {};

    guessLetters.forEach((ch, i) => {
        if (ch === answerLetters[i]) {
            states[i] = 'correct';
        } else {
            remaining[answerLetters[i]] = (remaining[answerLetters[i]] || 0) + 1;
        }
    });
    guessLetters.forEach((ch, i) => {
        if (states[i] === 'correct') return;
        if (remaining[ch] > 0) {
            states[i] = 'present';
            remaining[ch]--;
        }
    });
    return states;
}

function wordleUpdateKeyStates(guess, states) {
    const rank = { absent: 0, present: 1, correct: 2 };
    guess.split('').forEach((ch, i) => {
        const cur = wordleKeyStates[ch];
        if (!cur || rank[states[i]] > rank[cur]) wordleKeyStates[ch] = states[i];
    });
}

function wordleKeyPress(letter) {
    if (!wordleRunning || wordleCurrentGuess.length >= 5) return;
    wordleCurrentGuess += letter;
    wordleRenderGrid();
}

function wordleBackspace() {
    if (!wordleRunning) return;
    wordleCurrentGuess = wordleCurrentGuess.slice(0, -1);
    wordleRenderGrid();
}

function wordleShakeRow() {
    const row = document.querySelector(`.wordle-row[data-row="${wordleRow}"]`);
    if (!row) return;
    row.classList.remove('shake');
    void row.offsetWidth;
    row.classList.add('shake');
}

function wordleSubmit() {
    if (!wordleRunning) return;
    if (wordleCurrentGuess.length < 5) {
        wordleShakeRow();
        wordleFlashMessage(t('game_wordle_not_enough'));
        return;
    }
    if (!WORDLE_WORDS.includes(wordleCurrentGuess)) {
        wordleShakeRow();
        wordleFlashMessage(t('game_wordle_not_word'));
        return;
    }

    const states = wordleEvaluate(wordleCurrentGuess);
    wordleUpdateKeyStates(wordleCurrentGuess, states);
    wordleGuesses.push({ word: wordleCurrentGuess, states });
    wordleRow++;
    document.getElementById('wordle-attempt').textContent = String(wordleRow);
    const won = states.every(s => s === 'correct');
    const guessedWord = wordleCurrentGuess;
    wordleCurrentGuess = '';
    wordleRenderGrid();
    wordleRenderKeyboard();
    playSound(won);

    if (won) {
        endWordle(true);
    } else if (wordleRow >= 6) {
        endWordle(false);
    }
}

function wordleFlashMessage(msg) {
    const el = document.getElementById('wordle-message');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(wordleFlashMessage._t);
    wordleFlashMessage._t = setTimeout(() => el.classList.remove('show'), 1500);
}

function wordleRenderGrid() {
    const container = document.getElementById('wordle-grid');
    if (!container) return;
    container.innerHTML = '';
    for (let r = 0; r < 6; r++) {
        const row = document.createElement('div');
        row.className = 'wordle-row';
        row.dataset.row = r;
        for (let c = 0; c < 5; c++) {
            const tile = document.createElement('div');
            tile.className = 'wordle-tile';
            if (r < wordleGuesses.length) {
                const g = wordleGuesses[r];
                tile.textContent = g.word[c].toUpperCase();
                tile.classList.add(g.states[c], 'filled');
            } else if (r === wordleRow && c < wordleCurrentGuess.length) {
                tile.textContent = wordleCurrentGuess[c].toUpperCase();
                tile.classList.add('typed');
            }
            row.appendChild(tile);
        }
        container.appendChild(row);
    }
}

function wordleRenderKeyboard() {
    const container = document.getElementById('wordle-keyboard');
    if (!container) return;
    container.innerHTML = '';
    WORDLE_KEYBOARD_ROWS.forEach((rowStr, i) => {
        const row = document.createElement('div');
        row.className = 'wordle-kb-row';
        if (i === 2) {
            row.appendChild(wordleMakeKey('ENTER', 'wide'));
        }
        rowStr.split('').forEach(ch => {
            row.appendChild(wordleMakeKey(ch));
        });
        if (i === 2) {
            row.appendChild(wordleMakeKey('⌫', 'wide', 'BACKSPACE'));
        }
        container.appendChild(row);
    });
}

function wordleMakeKey(label, wideClass, action) {
    const btn = document.createElement('button');
    btn.className = 'wordle-key' + (wideClass ? ' wide' : '');
    btn.textContent = label;
    const key = action || label;
    if (key.length === 1) {
        const state = wordleKeyStates[key.toLowerCase()];
        if (state) btn.classList.add(state);
    }
    btn.onclick = () => {
        if (key === 'ENTER') wordleSubmit();
        else if (key === 'BACKSPACE') wordleBackspace();
        else wordleKeyPress(key.toLowerCase());
    };
    return btn;
}

document.addEventListener('keydown', (e) => {
    if (!wordleRunning) return;
    if (e.key === 'Enter') { e.preventDefault(); wordleSubmit(); }
    else if (e.key === 'Backspace') { e.preventDefault(); wordleBackspace(); }
    else if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); wordleKeyPress(e.key.toLowerCase()); }
});

function endWordle(won) {
    wordleRunning = false;
    const overlay = document.getElementById('wordle-overlay');
    if (won) {
        saveWordleBest(wordleRow);
        document.getElementById('wordle-best').textContent = getWordleBest();
        overlay.innerHTML = `
            <p>${t('game_wordle_win', { n: wordleRow })}</p>
            <button class="btn next-btn" onclick="startWordle()">${t('game_restart')}</button>
        `;
    } else {
        overlay.innerHTML = `
            <p>${t('game_wordle_lose', { w: wordleAnswer.toUpperCase() })}</p>
            <button class="btn next-btn" onclick="startWordle()">${t('game_restart')}</button>
        `;
    }
    overlay.style.display = 'flex';
}
