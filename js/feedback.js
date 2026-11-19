/* ===== Suggestions & Improvements — private, write-only Google Sheets backend =====
   Deliberately has no read/fetch counterpart (unlike guestbook.js) — messages
   are never displayed on the page, only appended to a Sheet only the site
   owner can open, so visitors can never see what anyone else submitted. */
const FEEDBACK_API = 'https://script.google.com/macros/s/AKfycby0XtYQeXLu1f9gj1vNNhTNdZyCAII2STh5JOhgVrOdgEZu56QpT3s7kVvkiTPTHbLB/exec';

async function handleFeedbackSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const message = form.elements.message.value.trim();
    if (!message) return false;

    // Honeypot: bots fill every field, real users never see or fill this one.
    if (form.elements.website && form.elements.website.value) {
        form.style.display = 'none';
        document.getElementById('feedback-success').style.display = 'block';
        setTimeout(() => {
            form.style.display = '';
            form.reset();
            document.getElementById('feedback-success').style.display = 'none';
        }, 3000);
        return false;
    }

    const submitBtn = form.querySelector('.feedback-submit');
    submitBtn.disabled = true;

    try {
        await fetch(FEEDBACK_API, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ message, context: `${siteLang} / ${location.pathname}` })
        });

        form.style.display = 'none';
        document.getElementById('feedback-success').style.display = 'block';

        setTimeout(() => {
            form.style.display = '';
            form.reset();
            submitBtn.disabled = false;
            document.getElementById('feedback-success').style.display = 'none';
        }, 3000);
    } catch (e) {
        console.error('Feedback submit failed:', e);
        submitBtn.disabled = false;
    }

    return false;
}

/* ===== 這裡有錯 — report a wrong item (2026-11-19, owner's pick from the site review) =====
   A small flag button beside a quiz result row, a grammar point, a reading passage and a
   listening item's transcript. It sends the kind of mistake, an optional note and what the
   item is (data-ctx, machine-readable) to the same private Sheet as the feedback page, so
   friends testing the site can point at a mistake in two taps (a German friend's report of
   hallo = "used to express bewilderment" needed a screenshot in Discord). */
const REPORT_TYPES = ['meaning', 'audio', 'answer', 'text', 'other'];
let reportItem = null;     // { ctx, label, type }

function reportBtnHtml(ctx, label, iconOnly) {
    const title = escHtml(t('report_title'));
    return `<button type="button" class="${iconOnly ? 'mb-note' : 'note-add'} report-btn" data-ctx="${escHtml(ctx)}" data-label="${escHtml(label)}"`
        + ` onclick="reportOpen(this.dataset.ctx, this.dataset.label)" title="${title}" aria-label="${title}">${uiIcon('flag')}`
        + (iconOnly ? '' : `<span>${escHtml(t('report_btn'))}</span>`) + '</button>';
}

function reportOpen(ctx, label) {
    reportItem = { ctx, label, type: '' };
    reportDraw();
    document.getElementById('report-overlay').classList.add('show');
}

function reportClose() {
    document.getElementById('report-overlay').classList.remove('show');
    reportItem = null;
}

function reportDraw(msg) {
    const r = reportItem;
    if (!r) return;
    const note = document.getElementById('report-note');
    const kept = note ? note.value : '';
    document.getElementById('report-panel').innerHTML = `<h3 id="report-title">${uiIcon('flag')} ${escHtml(t('report_title'))}</h3>
        <p class="report-about">${escHtml(t('report_about', { x: r.label }))}</p>
        <p class="report-q">${escHtml(t('report_what'))}</p>
        <div class="report-types">${REPORT_TYPES.map(k => `<button type="button" class="mode-btn${r.type === k ? ' mode-btn-active' : ''}"`
            + ` aria-pressed="${r.type === k}" onclick="reportPick('${k}')">${escHtml(t('report_t_' + k))}</button>`).join('')}</div>
        <textarea id="report-note" class="report-note" rows="3" maxlength="500" placeholder="${escHtml(t('report_note_ph'))}">${escHtml(kept)}</textarea>
        <p class="report-msg" id="report-msg" role="status">${msg ? escHtml(msg) : ''}</p>
        <div class="report-actions">
            <button type="button" class="back-btn" onclick="reportClose()">${escHtml(t('report_cancel'))}</button>
            <button type="button" class="next-btn" id="report-send" onclick="reportSend()">${escHtml(t('report_send'))}</button>
        </div>`;
}

function reportPick(type) {
    if (!reportItem) return;
    reportItem.type = type;
    reportDraw();
}

async function reportSend() {
    const r = reportItem;
    if (!r) return;
    if (!r.type) { reportDraw(t('report_pick')); return; }
    const note = (document.getElementById('report-note').value || '').trim();
    const btn = document.getElementById('report-send');
    btn.disabled = true;
    try {
        await fetch(FEEDBACK_API, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                message: `[這裡有錯] ${r.type} | ${r.label}${note ? ' | ' + note : ''}`,
                context: `${siteLang} / ${r.ctx} / ${location.pathname}${location.search}`
            })
        });
        document.getElementById('report-panel').innerHTML = `<h3 id="report-title">${uiIcon('flag')} ${escHtml(t('report_title'))}</h3>
            <p class="report-done">${escHtml(t('report_thanks'))}</p>`;
        setTimeout(() => { if (reportItem === r) reportClose(); }, 1800);
    } catch (e) {
        console.error('Report failed:', e);
        btn.disabled = false;
        reportDraw(t('report_failed'));
    }
}
