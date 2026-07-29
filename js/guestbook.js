/* ===== Guestbook — Google Sheets Backend ===== */
const GUESTBOOK_API = 'https://script.google.com/macros/s/AKfycbx8V81ni-z8gCgLsV1vGGpJK--qcg1yqiLUJLjJYzfNl4F2D4VEMjFTyYtkncixfNUu/exec';

let guestbookMessages = [];
let guestbookLoading = false;
const GUESTBOOK_PAGE_SIZE = 10;
const GUESTBOOK_CACHE_KEY = 'guestbook_cache';
let guestbookVisibleCount = GUESTBOOK_PAGE_SIZE;

async function loadGuestbookMessages() {
    guestbookLoading = true;
    guestbookVisibleCount = GUESTBOOK_PAGE_SIZE;
    const container = document.getElementById('guestbook-local');

    // Show cached messages instantly (if any) while the fresh copy loads in the background,
    // since the Apps Script backend can take a few seconds to respond.
    const cached = localStorage.getItem(GUESTBOOK_CACHE_KEY);
    if (cached) {
        try {
            guestbookMessages = JSON.parse(cached);
            renderGuestbookMessages();
        } catch (e) {
            guestbookMessages = [];
        }
    } else {
        container.innerHTML = `<div class="guestbook-loading">${t('guestbook_loading') || 'Loading...'}</div>`;
    }

    try {
        const res = await fetch(GUESTBOOK_API);
        guestbookMessages = await res.json();
        localStorage.setItem(GUESTBOOK_CACHE_KEY, JSON.stringify(guestbookMessages));
    } catch (e) {
        console.error('Guestbook load failed:', e);
        if (!cached) guestbookMessages = [];
    }
    guestbookLoading = false;
    renderGuestbookMessages();
}

function renderGuestbookMessages() {
    const container = document.getElementById('guestbook-local');
    if (guestbookMessages.length === 0) {
        container.innerHTML = `<div class="guestbook-empty">${t('guestbook_empty') || 'No messages yet. Be the first!'}</div>`;
        return;
    }

    const visible = guestbookMessages.slice(0, guestbookVisibleCount);
    let html = visible.map(m => {
        const d = new Date(m.time);
        const timeStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `<div class="guestbook-msg-item">
            <div class="guestbook-msg-name">${escapeHtml(m.name)}</div>
            <div class="guestbook-msg-text">${escapeHtml(m.message)}</div>
            <div class="guestbook-msg-time">${timeStr}</div>
        </div>`;
    }).join('');

    if (guestbookMessages.length > guestbookVisibleCount) {
        html += `<button class="guestbook-load-more" onclick="loadMoreGuestbookMessages()">${t('guestbook_load_more')}</button>`;
    }

    container.innerHTML = html;
}

function loadMoreGuestbookMessages() {
    guestbookVisibleCount += GUESTBOOK_PAGE_SIZE;
    renderGuestbookMessages();
}

async function handleGuestbookSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.elements.name.value.trim();
    const message = form.elements.message.value.trim();
    if (!name || !message) return false;

    if (form.elements.website && form.elements.website.value) {
        form.style.display = 'none';
        document.getElementById('guestbook-success').style.display = 'block';
        setTimeout(() => {
            form.style.display = '';
            form.reset();
        }, 3000);
        return false;
    }

    const submitBtn = form.querySelector('.guestbook-submit');
    submitBtn.disabled = true;

    try {
        await fetch(GUESTBOOK_API, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ name, message })
        });

        form.style.display = 'none';
        document.getElementById('guestbook-success').style.display = 'block';

        guestbookMessages.unshift({ name, message, time: new Date().toISOString() });
        localStorage.setItem(GUESTBOOK_CACHE_KEY, JSON.stringify(guestbookMessages));
        renderGuestbookMessages();

        setTimeout(() => {
            form.style.display = '';
            form.reset();
            submitBtn.disabled = false;
            document.getElementById('guestbook-success').style.display = 'none';
        }, 3000);
    } catch (e) {
        console.error('Guestbook submit failed:', e);
        submitBtn.disabled = false;
    }

    return false;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}