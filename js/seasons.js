/* ===== Seasons ===== */
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const SEASON_ICONS = { spring: '\u{1F338}', summer: '\u{1F41B}', autumn: '\u{1F342}', winter: '\u{2744}\uFE0F' };

let currentSeason = localStorage.getItem('season') || 'spring';

function applySeason(season) {
    currentSeason = season;
    localStorage.setItem('season', season);
    document.body.setAttribute('data-season', season);
    document.getElementById('season-btn').textContent = SEASON_ICONS[season];
    generateSeasonParticles(season);
}

function cycleSeason() {
    const idx = SEASONS.indexOf(currentSeason);
    const next = SEASONS[(idx + 1) % SEASONS.length];
    applySeason(next);
}

function generateSeasonParticles(season) {
    const container = document.getElementById('season-particles');
    container.innerHTML = '';
    if (season === 'spring') return;

    const count = season === 'summer' ? 20 : 25;
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = season === 'summer' ? 'firefly' : season === 'autumn' ? 'autumn-leaf' : 'snowflake';

        const left = Math.random() * 100;
        const dur = 6 + Math.random() * 8;
        const delay = Math.random() * dur;
        const size = season === 'winter' ? (4 + Math.random() * 6) : undefined;

        el.style.left = left + '%';
        el.style.animationDuration = dur + 's';
        el.style.animationDelay = delay + 's';

        if (season === 'summer') {
            const dx = -40 + Math.random() * 80;
            const dy = -60 + Math.random() * 120;
            el.style.setProperty('--dx', dx + 'px');
            el.style.setProperty('--dy', dy + 'px');
        }
        if (season === 'autumn') {
            const colors = ['#e85d26', '#d44a1a', '#c93c10', '#f59e0b', '#b91c1c'];
            el.style.setProperty('--leaf-color', colors[i % colors.length]);
            el.style.width = (14 + Math.random() * 10) + 'px';
            el.style.height = el.style.width;
        }
        if (season === 'winter') {
            el.style.width = size + 'px';
            el.style.height = size + 'px';
        }

        container.appendChild(el);
    }
}

applySeason(currentSeason);

/* ===== Splash ===== */
(function() {
    const splash = document.getElementById('splash-overlay');
    if (!splash) return;
    if (sessionStorage.getItem('splash_seen')) {
        splash.style.display = 'none';
    } else {
        setTimeout(() => splash.classList.add('hide'), 1500);
        setTimeout(() => { splash.style.display = 'none'; }, 2300);
        sessionStorage.setItem('splash_seen', '1');
    }
})();