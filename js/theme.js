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

/* ===== Visitor Counter (CounterAPI v2) ===== */
let visitorCount = null;

/* Word order differs per language ("350 visits" vs "Посещений: 350"), so the
   whole label comes from t('footer_visits'). applyLang() calls this again on
   every language switch. */
function renderVisitorCount() {
    const el = document.getElementById('visitor-count');
    if (el && typeof t === 'function') {
        el.textContent = t('footer_visits', { n: visitorCount === null ? '...' : visitorCount.toLocaleString() });
    }
}

/* One count per device per day (owner's pick 2026-10-22: a reload or a second visit the
   same day used to count again, so the number said little): the first load of the day
   calls `up`, later ones only read the counter. visit_counted_day holds that day.
   The `up` endpoint's GET response gets cached by Cloudflare for hours despite
   having a side effect (it increments), so every request needs a cache-busting
   query param or repeat visits just replay the same stale cached count. */
async function initVisitorCounter() {
    const d = new Date();
    const today = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    let counted = false;
    try { counted = localStorage.getItem('visit_counted_day') === today; } catch {}
    try {
        const res = await fetch(`https://api.counterapi.dev/v2/hanabirn/hanabirn${counted ? '' : '/up'}?t=${Date.now()}`);
        if (!counted && res.ok) { try { localStorage.setItem('visit_counted_day', today); } catch {} }
        const json = await res.json();
        if (json.data && json.data.up_count !== undefined) {
            visitorCount = json.data.up_count;
            renderVisitorCount();
        }
    } catch (e) {
        console.log('Visitor counter failed:', e);
    }
}
