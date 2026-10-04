/* ===================== 🎵 BGM 唱片機 Vinyl BGM Player ===================== */

const BGM_TRACKS = [
    { name: 'Soft Vinyl Dreams', url: 'https://cdn.freesafemusic.com/audio/whjc.mp3' },
    { name: 'Chill Twilight Waves', url: 'https://cdn.freesafemusic.com/audio/jnk0.mp3' },
    { name: 'Cozy Snowfall Dream', url: 'https://cdn.freesafemusic.com/audio/5s59.mp3' },
    { name: 'Coffee Clap', url: 'https://cdn.freesafemusic.com/audio/arh2.mp3' },
    { name: 'Celestial Dreamscapes', url: 'https://cdn.freesafemusic.com/audio/okxt.mp3' },
    { name: 'Floating Home', url: 'https://cdn.freesafemusic.com/audio/qaw1.mp3' },
    { name: 'Serene Echoes', url: 'https://cdn.freesafemusic.com/audio/ebw8.mp3' },
    { name: 'Cider Pages', url: 'https://cdn.freesafemusic.com/audio/mepd.mp3' },
    { name: 'Soft Saudade', url: 'https://cdn.freesafemusic.com/audio/f4rv.mp3' }
];

let bgmAudio = null;
let bgmIndex = 0;
let bgmPlaying = false;

/* Phones and tablets have hardware volume keys, so there the slider is hidden
   (css/widgets.css, same media query) and the music plays at full volume — a saved
   40% would otherwise cap what the keys can reach. */
const BGM_HARDWARE_VOLUME = window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches;

function initBgm() {
    bgmAudio = new Audio();
    const savedVol = parseInt(localStorage.getItem('bgm_volume'));
    bgmAudio.volume = BGM_HARDWARE_VOLUME ? 1 : isNaN(savedVol) ? 0.4 : savedVol / 100;
    const volSlider = document.getElementById('bgm-volume');
    if (volSlider) volSlider.value = Math.round(bgmAudio.volume * 100);
    bgmAudio.addEventListener('ended', () => bgmNext(true));
    bgmLoadTrack(0);
    updateBgmUI();
    initBgmHint();
}

function initBgmHint() {
    if (localStorage.getItem('bgm_hint_shown')) return;
    const hint = document.getElementById('bgm-hint');
    if (!hint) return;
    setTimeout(() => {
        hint.style.display = 'block';
        requestAnimationFrame(() => hint.classList.add('show'));
    }, 1500);
    const dismiss = () => {
        hint.classList.remove('show');
        localStorage.setItem('bgm_hint_shown', '1');
        setTimeout(() => { hint.style.display = 'none'; }, 400);
        document.removeEventListener('click', onOutsideClick);
    };
    hint.addEventListener('click', dismiss);
    setTimeout(dismiss, 8000);
    const onOutsideClick = (e) => {
        if (!e.target.closest('#bgm-player')) dismiss();
    };
    document.addEventListener('click', onOutsideClick);
}

function bgmLoadTrack(i) {
    bgmIndex = ((i % BGM_TRACKS.length) + BGM_TRACKS.length) % BGM_TRACKS.length;
    bgmAudio.src = BGM_TRACKS[bgmIndex].url;
    const label = document.getElementById('bgm-track-name');
    if (label) label.textContent = '♪ ' + BGM_TRACKS[bgmIndex].name;
}

function toggleBgm() {
    if (!bgmAudio) return;
    const hint = document.getElementById('bgm-hint');
    if (hint && hint.classList.contains('show')) {
        hint.classList.remove('show');
        localStorage.setItem('bgm_hint_shown', '1');
        setTimeout(() => { hint.style.display = 'none'; }, 400);
    }
    if (bgmPlaying) {
        bgmAudio.pause();
        bgmPlaying = false;
    } else {
        bgmAudio.play().then(() => { bgmPlaying = true; updateBgmUI(); }).catch(() => {});
    }
    updateBgmUI();
}

function bgmNext(autoplay) {
    const wasPlaying = bgmPlaying || autoplay === true;
    bgmLoadTrack(bgmIndex + 1);
    if (wasPlaying) {
        bgmAudio.play().then(() => { bgmPlaying = true; updateBgmUI(); }).catch(() => { bgmPlaying = false; updateBgmUI(); });
    }
    updateBgmUI();
}

function bgmPrev() {
    const wasPlaying = bgmPlaying;
    bgmLoadTrack(bgmIndex - 1);
    if (wasPlaying) {
        bgmAudio.play().then(() => { bgmPlaying = true; updateBgmUI(); }).catch(() => { bgmPlaying = false; updateBgmUI(); });
    }
    updateBgmUI();
}

function setBgmVolume(v) {
    if (!bgmAudio) return;
    bgmAudio.volume = v / 100;
    localStorage.setItem('bgm_volume', v);
}

function updateBgmUI() {
    const disc = document.getElementById('bgm-disc');
    const waveIcon = document.getElementById('bgm-icon-wave');
    const muteIcon = document.getElementById('bgm-icon-mute');
    if (disc) disc.classList.toggle('spinning', bgmPlaying);
    if (waveIcon) waveIcon.style.display = bgmPlaying ? '' : 'none';
    if (muteIcon) muteIcon.style.display = bgmPlaying ? 'none' : '';
}

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
    if (dateEl) dateEl.textContent = formatClockDate(now);
}

/* Date + weekday in the site language: "9/25（五）", "9/25（金）",
   "9/25 (Fri)", "25/09 (ven.)", "25.9. (Fr.)"… CJK keeps the one-character
   weekday in full-width brackets; the rest use Intl's short weekday. */
const CLOCK_LOCALES = { zh: 'zh-TW', 'zh-Hans': 'zh-CN' };
function formatClockDate(d) {
    const lang = typeof siteLang === 'string' ? siteLang : 'zh';
    const locale = CLOCK_LOCALES[lang] || lang;
    try {
        const date = d.toLocaleDateString(locale, { month: 'numeric', day: 'numeric' });
        if (/^(zh|ja|ko)/.test(lang)) {
            return `${date}（${d.toLocaleDateString(locale, { weekday: 'narrow' })}）`;
        }
        return `${date} (${d.toLocaleDateString(locale, { weekday: 'short' })})`;
    } catch (e) {
        return `${d.getMonth() + 1}/${d.getDate()}`;
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

let weatherLat = 25.03, weatherLon = 121.56; // Taipei fallback

async function initWeather() {
    // Only runs after the user opts in via #weather-optin (see initWeatherOptin) —
    // fetching IP-based location without consent isn't something we do silently.
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.latitude && data.longitude) {
            weatherLat = data.latitude;
            weatherLon = data.longitude;
        }
    } catch (e) {
        console.log('IP geolocation failed, using fallback:', e);
    }
    fetchWeather(weatherLat, weatherLon);
    setInterval(() => fetchWeather(weatherLat, weatherLon), 1800000);
}

function initWeatherOptin() {
    const el = document.getElementById('clock-weather');
    if (!el) return;
    if (localStorage.getItem('weather_consent') === 'granted') {
        initWeather();
        return;
    }
    const btn = document.createElement('button');
    btn.className = 'weather-optin-btn';
    // data-i18n so applyLang() re-translates it on a language switch.
    btn.setAttribute('data-i18n', 'weather_enable');
    btn.textContent = t('weather_enable');
    btn.onclick = () => {
        localStorage.setItem('weather_consent', 'granted');
        el.innerHTML = '';
        initWeather();
    };
    el.appendChild(btn);
}

/* ===================== 📱 Mobile "more options" FAB ===================== */
/* ===================== 📱 Tab bar "More" sheet (phones) ===================== */
function setMoreSheet(open) {
    const sheet = document.getElementById('more-sheet');
    const btn = document.getElementById('tabbar-more');
    if (!sheet) return;
    sheet.classList.toggle('show', open);
    if (btn) btn.setAttribute('aria-expanded', String(open));
}

function toggleMoreSheet() {
    const sheet = document.getElementById('more-sheet');
    setMoreSheet(!(sheet && sheet.classList.contains('show')));
}

function closeMoreSheet() {
    setMoreSheet(false);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMoreSheet();
});

/* ===================== 🌐 Language Dropdown ===================== */
function toggleLangMenu(forceOpen) {
    const wrap = document.getElementById('lang-globe');
    const btn = document.getElementById('lang-globe-btn');
    if (!wrap || !btn) return;
    const open = typeof forceOpen === 'boolean' ? forceOpen : !wrap.classList.contains('open');
    wrap.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (open) {
        document.addEventListener('click', onLangMenuOutsideClick);
        document.addEventListener('keydown', onLangMenuEscape);
    } else {
        document.removeEventListener('click', onLangMenuOutsideClick);
        document.removeEventListener('keydown', onLangMenuEscape);
    }
}
function onLangMenuOutsideClick(e) {
    if (!e.target.closest('#lang-globe')) toggleLangMenu(false);
}
function onLangMenuEscape(e) {
    if (e.key === 'Escape') toggleLangMenu(false);
}

/* ===================== 📲 Install the app (PWA) =====================
   "下載 App" in the header (desktop) and the phone More sheet opens a dialog: browsers
   that offer an install prompt (Chrome, Edge, Android — beforeinstallprompt) get an
   "立即安裝" button; the rest (iPhone / iPad Safari, Firefox, desktop Safari) get the
   add-to-home-screen steps for their platform. Everything is hidden once the site runs
   as the installed app. The bottom banner suggests it once: on an install-prompt
   browser when the prompt arrives, on iOS a few seconds after load; ✕ stops it. */

let deferredInstallPrompt = null;

function isStandaloneApp() {
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
}

function installPlatform() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua)) return 'mac_safari';
    return 'desktop';
}

const INSTALL_STEPS = {
    ios: ['install_ios_1', 'install_ios_2', 'install_ios_3'],
    android: ['install_android_1', 'install_android_2'],
    mac_safari: ['install_mac_1', 'install_mac_2'],
    desktop: ['install_desktop_1', 'install_desktop_2']
};

function refreshInstallEntries() {
    document.documentElement.classList.toggle('is-standalone', isStandaloneApp());
}

function showInstallBanner() {
    if (isStandaloneApp()) return;
    const moved = document.getElementById('moved-overlay');
    if (moved && moved.classList.contains('show')) return;   // the moved notice already offers it
    try { if (localStorage.getItem('pwa_install_dismissed')) return; } catch {}
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.add('show');
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallBanner();
    const now = document.getElementById('install-now');
    if (now) now.hidden = false;
});

function openInstallHelp() {
    const overlay = document.getElementById('install-overlay');
    if (!overlay) return;
    const steps = document.getElementById('install-steps');
    if (deferredInstallPrompt) {
        steps.innerHTML = '';
    } else {
        const keys = INSTALL_STEPS[installPlatform()];
        steps.innerHTML = `<p class="install-how">${escHtml(t('install_how'))}</p><ol class="install-steps">${
            keys.map(k => `<li>${escHtml(t(k))}</li>`).join('')}</ol>`;
    }
    document.getElementById('install-now').hidden = !deferredInstallPrompt;
    overlay.classList.add('show');
    const focus = overlay.querySelector(deferredInstallPrompt ? '#install-now' : '.install-close');
    if (focus) focus.focus();
}

function closeInstallHelp() {
    const overlay = document.getElementById('install-overlay');
    if (overlay) overlay.classList.remove('show');
}

/* The banner's 安裝 and the dialog's 立即安裝: the browser's own prompt when there is
   one, otherwise the steps. */
function installPwa() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.remove('show');
    if (!deferredInstallPrompt) { openInstallHelp(); return; }
    closeInstallHelp();
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.finally(() => {
        deferredInstallPrompt = null;
        const now = document.getElementById('install-now');
        if (now) now.hidden = true;
    });
}

function dismissPwaInstall() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.remove('show');
    try { localStorage.setItem('pwa_install_dismissed', '1'); } catch {}
}

window.addEventListener('appinstalled', () => {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.remove('show');
    deferredInstallPrompt = null;
    closeInstallHelp();
    refreshInstallEntries();
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeInstallHelp(); });

refreshInstallEntries();
// iOS never fires beforeinstallprompt, so suggest it there after the visitor has settled in
function suggestInstallOnIos() {
    if (typeof tourEl !== 'undefined' && tourEl) { setTimeout(suggestInstallOnIos, 5000); return; }   // not over the site tour
    showInstallBanner();
}
if (installPlatform() === 'ios') setTimeout(suggestInstallOnIos, 8000);

/* ===================== 🚚 "We moved" notice =====================
   hanabirn.netlify.app 301s to hanabirn.xyz/…?from=netlify (the root _redirects file).
   Whoever arrives that way — usually the old home-screen app, whose data and origin
   stay on Netlify — is asked to delete it and install the app again from here. The
   marker is taken off the address so a reload doesn't ask again. */
function showMovedNotice() {
    const overlay = document.getElementById('moved-overlay');
    if (overlay) overlay.classList.add('show');
    const banner = document.getElementById('pwa-install-banner');   // the notice offers the same thing
    if (banner) banner.classList.remove('show');
}

function closeMovedNotice() {
    const overlay = document.getElementById('moved-overlay');
    if (overlay) overlay.classList.remove('show');
}

(function checkMovedFromNetlify() {
    const params = new URLSearchParams(location.search);
    if (params.get('from') !== 'netlify') return;
    params.delete('from');
    history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params.toString() : '') + location.hash);
    // a returning visitor: no first-visit tour over the notice (tour.js decides on DOMContentLoaded)
    try { localStorage.setItem('tour_done', '1'); } catch {}
    setTimeout(showMovedNotice, 600);
})();

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMovedNotice(); });

/* ===================== 🔄 New Version Banner ===================== */

function showUpdateBanner() {
    const banner = document.getElementById('update-banner');
    if (banner) banner.classList.add('show');
}

function refreshForUpdate() {
    location.reload();
}

function dismissUpdateBanner() {
    const banner = document.getElementById('update-banner');
    if (banner) banner.classList.remove('show');
}

/* ===================== Init ===================== */

document.addEventListener('DOMContentLoaded', () => {
    initBgm();
    updateClock();
    setInterval(updateClock, 1000);
    initWeatherOptin();
    initVisitorCounter();
});

/* ===================== Splash screen ===================== */
(function() {
    const splash = document.getElementById('splash-overlay');
    if (!splash) return;
    if (sessionStorage.getItem('splash_seen')) {
        splash.style.display = 'none';
    } else {
        requestAnimationFrame(() => splash.classList.add('hide'));
        setTimeout(() => { splash.style.display = 'none'; }, 800);
        sessionStorage.setItem('splash_seen', '1');
    }
})();


/* ===================== Tooltips ===================== */
/* The browser's own title tooltip is a white box with black text that CSS can't
   touch, so on mouse hover an element's title moves into data-tip (before the
   native one appears) and a themed bubble shows it instead. Icon-only buttons
   that relied on the title for their name get it as aria-label. applyLang()
   may write a fresh title later; the next hover simply takes it again. */
(function () {
    let tip = null, current = null, timer = 0;

    function take(el) {
        const t = el.getAttribute('title');
        if (t) {
            el.dataset.tip = t;
            el.removeAttribute('title');
            if (el.dataset.tipLabel || (!el.hasAttribute('aria-label') && !el.textContent.trim())) {
                el.setAttribute('aria-label', t);
                el.dataset.tipLabel = '1';
            }
        }
        return el.dataset.tip || '';
    }

    function show(el) {
        const text = el.dataset.tip;
        if (!text) return;
        if (!tip) {
            tip = document.createElement('div');
            tip.className = 'site-tip';
            tip.setAttribute('role', 'tooltip');
            document.body.appendChild(tip);
        }
        tip.textContent = text;
        // measure at the top-left corner, where nothing squeezes it into wrapping
        tip.style.left = '0px';
        tip.style.top = '0px';
        tip.classList.add('show');
        const r = el.getBoundingClientRect();
        const tw = tip.offsetWidth, th = tip.offsetHeight;
        let top = r.top - th - 8;
        if (top < 6) top = r.bottom + 8;
        tip.style.top = top + 'px';
        // clientWidth leaves out the scrollbar, which innerWidth would count
        tip.style.left = Math.min(Math.max(6, r.left + r.width / 2 - tw / 2), document.documentElement.clientWidth - tw - 6) + 'px';
    }

    function hide() {
        current = null;
        clearTimeout(timer);
        if (tip) tip.classList.remove('show');
    }

    document.addEventListener('pointerover', e => {
        if (e.pointerType !== 'mouse') return;
        const el = e.target.closest('[title], [data-tip]');
        if (el === current) return;
        hide();
        if (!el || !take(el)) return;
        current = el;
        timer = setTimeout(() => { if (current === el && el.isConnected) show(el); }, 350);
    });
    document.addEventListener('pointerout', e => {
        if (current && !current.contains(e.relatedTarget)) hide();
    });
    document.addEventListener('pointerdown', hide);
    document.addEventListener('keydown', hide);
    window.addEventListener('scroll', hide, true);
})();
