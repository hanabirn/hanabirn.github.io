/* ===================== 🎮 Games Hub ===================== */

function openGame(name) {
    document.getElementById('games-select-card').style.display = 'none';
    document.getElementById('snake-card').style.display = name === 'snake' ? 'block' : 'none';
    document.getElementById('whack-card').style.display = name === 'whack' ? 'block' : 'none';
    document.getElementById('game2048-card').style.display = name === '2048' ? 'block' : 'none';
    document.getElementById('match3-card').style.display = name === 'match3' ? 'block' : 'none';

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
    }
}

function closeGame() {
    stopAllGames();
    document.getElementById('games-select-card').style.display = 'block';
    document.getElementById('snake-card').style.display = 'none';
    document.getElementById('whack-card').style.display = 'none';
    document.getElementById('game2048-card').style.display = 'none';
    document.getElementById('match3-card').style.display = 'none';
}

function stopAllGames() {
    snakeRunning = false;
    clearInterval(snakeInterval);
    whackRunning = false;
    clearInterval(whackTimerInterval);
    clearTimeout(whackMoleTimeout);
    game2048Running = false;
    match3Running = false;
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
            ctx.fillStyle = (x + y) % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.055)';
            ctx.fillRect(x * snakeCellSize, y * snakeCellSize, snakeCellSize, snakeCellSize);
        }
    }
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

    const foodCx = (snakeFood.x + 0.5) * snakeCellSize;
    const foodCy = (snakeFood.y + 0.5) * snakeCellSize;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(foodCx, foodCy + snakeCellSize * 0.28, snakeCellSize * 0.32, snakeCellSize * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = Math.floor(snakeCellSize * 0.85) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍎', foodCx, foodCy + 1);

    snakeBody.forEach((seg, i) => {
        const isHead = i === 0;
        ctx.fillStyle = isHead ? '#f472b6' : `rgba(168,85,247,${Math.max(0.5, 1 - i * 0.03)})`;
        const pad = 1.5;
        snakeRoundRectPath(ctx, seg.x * snakeCellSize + pad, seg.y * snakeCellSize + pad, snakeCellSize - pad * 2, snakeCellSize - pad * 2, 5);
        ctx.fill();

        const shineH = (snakeCellSize - pad * 2) * 0.35;
        ctx.fillStyle = isHead ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)';
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

/* ===================== 🔢 2048 ===================== */

const GAME2048_SIZE = 4;
const GAME2048_COLORS = {
    2: 'linear-gradient(135deg, #f9a8d4, #f472b6)',
    4: 'linear-gradient(135deg, #f472b6, #ec4899)',
    8: 'linear-gradient(135deg, #e9d5ff, #c084fc)',
    16: 'linear-gradient(135deg, #c084fc, #a855f7)',
    32: 'linear-gradient(135deg, #a855f7, #9333ea)',
    64: 'linear-gradient(135deg, #9333ea, #7e22ce)',
    128: 'linear-gradient(135deg, #818cf8, #6366f1)',
    256: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    512: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
    1024: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    2048: 'linear-gradient(135deg, #fde047, #facc15)'
};

let game2048Grid = [];
let game2048Score = 0;
let game2048Running = false;
let game2048Won = false;
let game2048SwipeInit = false;

function get2048Color(v) {
    return GAME2048_COLORS[v] || 'linear-gradient(135deg, #34d399, #10b981)';
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
                cell.style.color = v <= 4 ? '#3b0764' : '#fff';
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
