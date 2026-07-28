/* ===================== 🎵 BGM 唱片機 Vinyl BGM Player ===================== */

const BGM_TRACKS = [
    { name: 'Soft Vinyl Dreams', url: 'https://cdn.freesafemusic.com/audio/whjc.mp3' },
    { name: 'Chill Twilight Waves', url: 'https://cdn.freesafemusic.com/audio/jnk0.mp3' },
    { name: 'Cozy Snowfall Dream', url: 'https://cdn.freesafemusic.com/audio/5s59.mp3' },
    { name: 'Coffee Clap', url: 'https://cdn.freesafemusic.com/audio/arh2.mp3' }
];

let bgmAudio = null;
let bgmIndex = 0;
let bgmPlaying = false;

function initBgm() {
    bgmAudio = new Audio();
    const savedVol = parseInt(localStorage.getItem('bgm_volume'));
    bgmAudio.volume = isNaN(savedVol) ? 0.4 : savedVol / 100;
    const volSlider = document.getElementById('bgm-volume');
    if (volSlider) volSlider.value = Math.round(bgmAudio.volume * 100);
    bgmAudio.addEventListener('ended', () => bgmNext(true));
    bgmLoadTrack(0);
}

function bgmLoadTrack(i) {
    bgmIndex = ((i % BGM_TRACKS.length) + BGM_TRACKS.length) % BGM_TRACKS.length;
    bgmAudio.src = BGM_TRACKS[bgmIndex].url;
    const label = document.getElementById('bgm-track-name');
    if (label) label.textContent = '♪ ' + BGM_TRACKS[bgmIndex].name;
}

function toggleBgm() {
    if (!bgmAudio) return;
    if (bgmPlaying) {
        bgmAudio.pause();
        bgmPlaying = false;
    } else {
        bgmAudio.play().then(() => { bgmPlaying = true; updateBgmUI(); }).catch(() => {});
        bgmPlaying = true;
    }
    updateBgmUI();
}

function bgmNext(autoplay) {
    const wasPlaying = bgmPlaying || autoplay === true;
    bgmLoadTrack(bgmIndex + 1);
    if (wasPlaying) { bgmAudio.play().catch(() => {}); bgmPlaying = true; }
    updateBgmUI();
}

function bgmPrev() {
    const wasPlaying = bgmPlaying;
    bgmLoadTrack(bgmIndex - 1);
    if (wasPlaying) { bgmAudio.play().catch(() => {}); bgmPlaying = true; }
    updateBgmUI();
}

function setBgmVolume(v) {
    if (!bgmAudio) return;
    bgmAudio.volume = v / 100;
    localStorage.setItem('bgm_volume', v);
}

function updateBgmUI() {
    const disc = document.getElementById('bgm-disc');
    const playBtn = document.getElementById('bgm-play-btn');
    if (disc) disc.classList.toggle('spinning', bgmPlaying);
    if (playBtn) playBtn.textContent = bgmPlaying ? '⏸' : '▶';
}

/* ===================== ✨ 點擊特效 Click Particles ===================== */

const PARTICLE_EMOJIS = ['🌸', '✨', '💮', '⭐'];

function spawnClickParticles(x, y) {
    const count = 8;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('span');
        const useEmoji = Math.random() < 0.55;
        if (useEmoji) {
            p.className = 'click-particle emoji';
            p.textContent = PARTICLE_EMOJIS[Math.floor(Math.random() * PARTICLE_EMOJIS.length)];
        } else {
            p.className = 'click-particle dot';
            p.style.background = Math.random() < 0.5 ? '#f472b6' : '#c084fc';
        }
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
        const dist = 35 + Math.random() * 45;
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
        p.style.setProperty('--dy', Math.sin(angle) * dist - 20 + 'px');
        p.style.setProperty('--rot', (Math.random() * 360 - 180) + 'deg');
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 900);
    }
}

document.addEventListener('click', (e) => {
    spawnClickParticles(e.clientX, e.clientY);
});

/* ===================== 🕐 時鐘 + 天氣 Clock & Weather ===================== */

const WEATHER_EMOJI = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌧️',
    56: '🌧️', 57: '🌧️',
    61: '🌧️', 63: '🌧️', 65: '🌧️',
    66: '🌧️', 67: '🌧️',
    71: '🌨️', 73: '🌨️', 75: '❄️', 77: '❄️',
    80: '🌦️', 81: '🌧️', 82: '⛈️',
    85: '🌨️', 86: '❄️',
    95: '⛈️', 96: '⛈️', 99: '⛈️'
};

function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');
    if (timeEl) {
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        timeEl.textContent = `${h}:${m}:${s}`;
    }
    if (dateEl) {
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        dateEl.textContent = `${now.getMonth() + 1}/${now.getDate()}（${weekdays[now.getDay()]}）`;
    }
}

async function fetchWeather(lat, lon) {
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`);
        const data = await res.json();
        const cur = data.current;
        if (!cur) return;
        const emoji = WEATHER_EMOJI[cur.weather_code] || '🌡️';
        const el = document.getElementById('clock-weather');
        if (el) el.textContent = `${emoji} ${Math.round(cur.temperature_2m)}°C`;
    } catch (e) {
        console.log('Weather fetch failed:', e);
    }
}

function initWeather() {
    const fallback = () => fetchWeather(25.03, 121.56); // Taipei
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
            fallback,
            { timeout: 5000, maximumAge: 1800000 }
        );
    } else {
        fallback();
    }
    setInterval(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
                fallback,
                { timeout: 5000, maximumAge: 1800000 }
            );
        } else fallback();
    }, 1800000);
}

/* ===================== 📖 Guide Pagination ===================== */

let guideCurrentPage = 1;
const guidePerPage = 4;

function initGuidePagination() {
    const sections = document.querySelectorAll('#guide-grid .guide-section');
    const totalPages = Math.ceil(sections.length / guidePerPage);
    showGuidePage(1, totalPages);
}

function showGuidePage(page, totalPages) {
    guideCurrentPage = page;
    const sections = document.querySelectorAll('#guide-grid .guide-section');
    const start = (page - 1) * guidePerPage;
    const end = start + guidePerPage;

    sections.forEach((sec, i) => {
        sec.style.display = (i >= start && i < end) ? '' : 'none';
    });

    const info = document.getElementById('guide-page-info');
    const prev = document.getElementById('guide-prev');
    const next = document.getElementById('guide-next');
    if (info) info.textContent = `${page} / ${totalPages}`;
    if (prev) prev.disabled = (page <= 1);
    if (next) next.disabled = (page >= totalPages);
}

function guidePage(dir) {
    const sections = document.querySelectorAll('#guide-grid .guide-section');
    const totalPages = Math.ceil(sections.length / guidePerPage);
    showGuidePage(guideCurrentPage + dir, totalPages);
}

/* ===================== Init ===================== */

document.addEventListener('DOMContentLoaded', () => {
    initBgm();
    updateClock();
    setInterval(updateClock, 1000);
    initWeather();
    initVisitorCounter();
    initGuidePagination();
});
