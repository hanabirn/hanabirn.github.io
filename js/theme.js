/* ===== Theme Toggle ===== */
function getTheme() {
    return localStorage.getItem('theme') || 'dark';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const current = getTheme();
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* Apply theme immediately on load (before DOMContentLoaded to prevent flash) */
applyTheme(getTheme());

/* ===== Visitor Counter ===== */
async function initVisitorCounter() {
    try {
        const res = await fetch('https://api.counterapi.dev/v1/hanabirn/hits/up');
        const data = await res.json();
        const el = document.getElementById('visitor-count');
        if (el && data.count !== undefined) {
            el.textContent = data.count.toLocaleString();
        }
    } catch (e) {
        console.log('Visitor counter failed:', e);
    }
}
