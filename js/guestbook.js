/* ===== Guestbook — Google Sheets Backend ===== */
const GUESTBOOK_API = 'https://script.google.com/macros/s/AKfycbx8V81ni-z8gCgLsV1vGGpJK--qcg1yqiLUJLjJYzfNl4F2D4VEMjFTyYtkncixfNUu/exec';

let guestbookMessages = [];
let guestbookLoading = false;

async function loadGuestbookMessages() {
    guestbookLoading = true;
    const container = document.getElementById('guestbook-local');
    container.innerHTML = `<div class="guestbook-loading">${t('guestbook_loading') || 'Loading...'}</div>`;
    try {
        const res = await fetch(GUESTBOOK_API);
        guestbookMessages = await res.json();
    } catch (e) {
        console.error('Guestbook load failed:', e);
        guestbookMessages = [];
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

    container.innerHTML = guestbookMessages.map(m => {
        const d = new Date(m.time);
        const timeStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `<div class="guestbook-msg-item">
            <div class="guestbook-msg-name">${escapeHtml(m.name)}</div>
            <div class="guestbook-msg-text">${escapeHtml(m.message)}</div>
            <div class="guestbook-msg-time">${timeStr}</div>
        </div>`;
    }).join('');
}

async function handleGuestbookSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.elements.name.value.trim();
    const message = form.elements.message.value.trim();
    if (!name || !message) return false;

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