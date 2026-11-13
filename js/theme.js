/* ===== Theme Toggle ===== */
/* New visitors follow their system setting; after that the toggle wins. */
function getTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/* Browser-chrome colour (address bar / PWA status bar) = the page's paper colour. */
const THEME_CHROME_COLOR = { light: '#f6f1e6', dark: '#141210' };

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_CHROME_COLOR[theme] || THEME_CHROME_COLOR.light);
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const current = getTheme();
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* Apply theme immediately on load (before DOMContentLoaded to prevent flash) */
applyTheme(getTheme());

/* The footer's visitor counter (CounterAPI) was removed on 2026-11-13 at the owner's request: it told visitors
   nothing and sent every visit to a third party. */
