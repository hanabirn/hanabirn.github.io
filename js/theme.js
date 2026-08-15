/* ===== Theme Toggle ===== */
function getTheme() {
    return localStorage.getItem('theme') || 'dark';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const current = getTheme();
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* Apply theme immediately on load (before DOMContentLoaded to prevent flash) */
applyTheme(getTheme());

/* ===== Visitor Counter (CounterAPI v2) =====
   The `up` endpoint's GET response gets cached by Cloudflare for hours despite
   having a side effect (it increments), so every load needs a cache-busting
   query param or repeat visits just replay the same stale cached count. */
async function initVisitorCounter() {
    try {
        const res = await fetch(`https://api.counterapi.dev/v2/hanabirn/hanabirn/up?t=${Date.now()}`);
        const json = await res.json();
        const el = document.getElementById('visitor-count');
        if (el && json.data && json.data.up_count !== undefined) {
            el.textContent = json.data.up_count.toLocaleString();
        }
    } catch (e) {
        console.log('Visitor counter failed:', e);
    }
}
