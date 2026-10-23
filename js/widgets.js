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
    document.querySelectorAll('.more-bgm').forEach(b => {
        b.classList.toggle('on', bgmPlaying);
        b.setAttribute('aria-pressed', String(bgmPlaying));
    });
}

/* ===================== 📱 Tab bar sheets (phones): 學習 and 更多 ===================== */
function setSheet(id, btnId, open) {
    const sheet = document.getElementById(id);
    const btn = document.getElementById(btnId);
    if (!sheet) return;
    sheet.classList.toggle('show', open);
    if (btn) btn.setAttribute('aria-expanded', String(open));
}

function toggleMoreSheet() {
    const sheet = document.getElementById('more-sheet');
    const open = !(sheet && sheet.classList.contains('show'));
    setSheet('learn-sheet', 'tabbar-learn', false);
    setSheet('more-sheet', 'tabbar-more', open);
}

function toggleLearnSheet() {
    const sheet = document.getElementById('learn-sheet');
    const open = !(sheet && sheet.classList.contains('show'));
    setSheet('more-sheet', 'tabbar-more', false);
    if (open) renderLearnSheet();
    setSheet('learn-sheet', 'tabbar-learn', open);
}

function closeLearnSheet() {
    setSheet('learn-sheet', 'tabbar-learn', false);
}

/* switchPage() calls this, so it closes both sheets */
function closeMoreSheet() {
    setSheet('more-sheet', 'tabbar-more', false);
    closeLearnSheet();
}

/* How much of each 學習 page is done: grammar points / passages / listening sets
   passed (each page keeps { "<set>:<item>": { best, of } } in localStorage). */
function learnPassedCount(key, pass) {
    let prog = {};
    try { prog = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
    return Object.values(prog).filter(r => r && r.of && r.best / r.of >= pass).length;
}

function renderLearnSheet() {
    const rows = [
        ['grammar', 'grammar_progress', typeof GRAMMAR_PASS === 'number' ? GRAMMAR_PASS : 2 / 3, 'learn_prog_grammar'],
        ['reading', 'reading_progress', typeof READING_PASS === 'number' ? READING_PASS : 2 / 3, 'learn_prog_reading'],
        ['listening', 'listening_progress', typeof LISTENING_PASS === 'number' ? LISTENING_PASS : 2 / 3, 'learn_prog_listening'],
    ];
    rows.forEach(([tab, key, pass, label]) => {
        const el = document.getElementById('learn-prog-' + tab);
        if (!el) return;
        const n = learnPassedCount(key, pass);
        el.textContent = n ? t(label, { n }) : t('learn_prog_new');
        el.classList.toggle('none', !n);
    });
}

/* ===================== 🧭 Desktop dropdowns: 學習 ▾ / 工具 ▾ / ☰ ===================== */
/* Opened by a click, or by hovering with a mouse; one open at a time. */
function setNavMenu(wrap, open) {
    if (!wrap) return;
    wrap.classList.toggle('open', open);
    const btn = wrap.querySelector('.nav-group-btn, #menu-btn');
    if (btn) btn.setAttribute('aria-expanded', String(open));
}

function closeNavMenus(except) {
    document.querySelectorAll('.nav-group.open, .site-menu.open').forEach(w => { if (w !== except) setNavMenu(w, false); });
}

function toggleNavGroup(id) {
    const wrap = document.getElementById('nav-group-' + id);
    if (!wrap) return;
    // with a mouse, hovering has already opened it: a click keeps it open
    const open = NAV_HOVER || !wrap.classList.contains('open');
    closeNavMenus(wrap);
    setNavMenu(wrap, open);
}

function toggleSiteMenu() {
    const wrap = document.getElementById('site-menu');
    if (!wrap) return;
    const open = !wrap.classList.contains('open');
    closeNavMenus(wrap);
    if (typeof toggleLangMenu === 'function') toggleLangMenu(false);
    setNavMenu(wrap, open);
}

function closeSiteMenu() {
    setNavMenu(document.getElementById('site-menu'), false);
}

/* Phones: a site name too long for the header shows as "Hanabi" (.brand-short). On
   computers the controls, the name and the nav each have a row (css/header.css), so
   nothing needs measuring. Re-checked on resize and a language switch. */
function headerFit() {
    const bar = document.querySelector('.header-bar');
    const brand = bar && bar.querySelector('.brand');
    const nav = bar && bar.querySelector('.main-nav');
    const controls = bar && bar.querySelector('.subtitle-controls');
    if (!brand || !nav || !controls) return;
    bar.classList.remove('brand-short');
    if (getComputedStyle(nav).display === 'none') {   // phones
        // a site name too long for the bar ("Маленький мир Хан…") gives way to "Hanabi"
        const h1 = brand.querySelector('h1');
        if (h1 && h1.scrollWidth > h1.clientWidth + 1) bar.classList.add('brand-short');
        return;
    }
    // computers: the controls, the name and the nav each have a row (css/header.css)
}

const NAV_HOVER = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
function initNavMenus() {
    headerFit();
    window.addEventListener('resize', headerFit);
    if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => headerFit());
        document.querySelectorAll('.header-bar .brand-text, .main-nav > *, .subtitle-controls > *').forEach(el => ro.observe(el));
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(headerFit);
    // the phone title is clipped, so its size never changes: watch its text (language switch)
    const h1 = document.querySelector('.header-bar h1');
    if (h1 && window.MutationObserver) new MutationObserver(headerFit).observe(h1, { childList: true, characterData: true, subtree: true });
    if (NAV_HOVER) {
        document.querySelectorAll('.nav-group').forEach(wrap => {
            let timer = 0;
            wrap.addEventListener('mouseenter', () => { clearTimeout(timer); closeNavMenus(wrap); setNavMenu(wrap, true); });
            wrap.addEventListener('mouseleave', () => { timer = setTimeout(() => setNavMenu(wrap, false), 180); });
        });
    }
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-group, .site-menu')) closeNavMenus();
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeMoreSheet();
    const open = document.querySelector('.nav-group.open, .site-menu.open');
    if (open) {
        closeNavMenus();
        const btn = open.querySelector('.nav-group-btn, #menu-btn');
        if (btn) btn.focus();
    }
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
    if (!banner) return;
    banner.classList.add('show');
    // it sits over the bottom of the page, so it folds away by itself after a while
    // (only ✕ stops it for good; the ☰ / More "下載 App" stays there)
    clearTimeout(showInstallBanner.timer);
    showInstallBanner.timer = setTimeout(() => banner.classList.remove('show'), INSTALL_BANNER_MS);
}
const INSTALL_BANNER_MS = 12000;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallBanner();
    const now = document.getElementById('install-now');
    if (now) now.hidden = false;
    // Chrome on Android offers the prompt only after a little while on the page: if the
    // dialog is already open with the manual steps, swap them for the one-tap button.
    const overlay = document.getElementById('install-overlay');
    if (overlay && overlay.classList.contains('show')) openInstallHelp();
});

/* Apps that open links in their own browser (LINE, Facebook, Instagram…) can't install
   a web app, so the dialog asks to open the site in a real browser first: LINE has a
   URL flag for that, Android can hand the page to Chrome with an intent; iPhone apps
   only offer it in their own ⋯ menu. */
function inAppBrowser() {
    const ua = navigator.userAgent;
    const apps = [[/Line\//, 'LINE'], [/FBAN|FBAV|FB_IAB/, 'Facebook'], [/Instagram/, 'Instagram'],
        [/Barcelona/, 'Threads'], [/MicroMessenger/, 'WeChat'], [/KAKAOTALK/i, 'KakaoTalk'],
        [/musical_ly|BytedanceWebview|TikTok/i, 'TikTok']];
    const hit = apps.find(([re]) => re.test(ua));
    return hit ? hit[1] : '';
}

function openInRealBrowser() {
    const url = new URL(location.href);
    if (inAppBrowser() === 'LINE') {
        url.searchParams.set('openExternalBrowser', '1');
        location.href = url.toString();
    } else {
        location.href = `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;`
            + `S.browser_fallback_url=${encodeURIComponent(url.toString())};end`;
    }
}

function openInstallHelp() {
    const overlay = document.getElementById('install-overlay');
    if (!overlay) return;
    const steps = document.getElementById('install-steps');
    const app = deferredInstallPrompt ? '' : inAppBrowser();
    if (deferredInstallPrompt) {
        steps.innerHTML = '';
    } else if (app) {
        const oneTap = app === 'LINE' || installPlatform() === 'android';
        steps.innerHTML = `<p class="install-how">${escHtml(t('install_inapp', {app}))}</p>${oneTap
            ? `<button class="next-btn install-open-browser" onclick="openInRealBrowser()">${escHtml(t('install_open_browser'))}</button>`
            : `<ol class="install-steps"><li>${escHtml(t('install_inapp_ios'))}</li></ol>`}`;
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
    initNavMenus();
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
