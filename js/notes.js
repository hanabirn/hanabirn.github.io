/* ===== Personal notepad — note text/category in localStorage, attachments in IndexedDB.
   Everything stays in this browser only; there is no backend. ===== */
const NOTES_KEY = 'notepad_notes';
const NOTES_CATEGORIES_KEY = 'notepad_categories';
const NOTE_ATTACHMENT_MAX_MB = 20;
let notesFilter = 'all'; // 'all' | 'none' | a category id

function getNotes() {
    try { return JSON.parse(localStorage.getItem(NOTES_KEY)) || []; } catch { return []; }
}

function saveNotesData(notes) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

/* ----- IndexedDB: attachments (can be much larger than localStorage's quota allows) ----- */
const NOTES_DB_NAME = 'hanabi_notes_db';
const NOTES_DB_VERSION = 1;
const ATTACH_STORE = 'attachments';
let notesDBPromise = null;

function openNotesDB() {
    if (notesDBPromise) return notesDBPromise;
    notesDBPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(NOTES_DB_NAME, NOTES_DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(ATTACH_STORE)) {
                const store = db.createObjectStore(ATTACH_STORE, { keyPath: 'id' });
                store.createIndex('noteId', 'noteId', { unique: false });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return notesDBPromise;
}

function idbAddAttachment(record) {
    return openNotesDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(ATTACH_STORE, 'readwrite');
        tx.objectStore(ATTACH_STORE).put(record);
        tx.oncomplete = () => resolve(record);
        tx.onerror = () => reject(tx.error);
    }));
}

function idbGetAttachmentsForNote(noteId) {
    return openNotesDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(ATTACH_STORE, 'readonly');
        const req = tx.objectStore(ATTACH_STORE).index('noteId').getAll(noteId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    }));
}

function idbDeleteAttachment(id) {
    return openNotesDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(ATTACH_STORE, 'readwrite');
        tx.objectStore(ATTACH_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
}

function idbDeleteAttachmentsForNote(noteId) {
    return openNotesDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(ATTACH_STORE, 'readwrite');
        const req = tx.objectStore(ATTACH_STORE).index('noteId').openCursor(IDBKeyRange.only(noteId));
        req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) { cursor.delete(); cursor.continue(); }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
}

function formatFileSize(bytes) {
    if (bytes == null) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function handleAddAttachmentToExisting(noteId, input) {
    const files = Array.from(input.files || []);
    input.value = '';
    const maxBytes = NOTE_ATTACHMENT_MAX_MB * 1024 * 1024;
    for (const file of files) {
        if (file.size > maxBytes) {
            alert(t('notes_file_too_large', { n: NOTE_ATTACHMENT_MAX_MB }));
            continue;
        }
        try {
            await idbAddAttachment({
                id: 'a' + noteId + '_' + Date.now() + '_' + Math.random().toString(36).slice(2),
                noteId,
                name: file.name,
                type: file.type,
                size: file.size,
                blob: file,
                addedAt: new Date().toISOString()
            });
        } catch (e) {
            console.error('Failed to store attachment:', e);
        }
    }
    renderNoteAttachments(noteId);
}

async function deleteAttachment(id, noteId) {
    await idbDeleteAttachment(id);
    renderNoteAttachments(noteId);
}

async function renderNoteAttachments(noteId) {
    const container = document.querySelector(`.notes-item-attachments[data-note-id="${noteId}"]`);
    if (!container) return;
    let attachments = [];
    try { attachments = await idbGetAttachmentsForNote(noteId); } catch (e) { console.error('Failed to load attachments:', e); }
    if (!attachments.length) { container.innerHTML = ''; return; }
    container.innerHTML = attachments.map(a => {
        const isImage = a.type && a.type.startsWith('image/');
        const url = URL.createObjectURL(a.blob);
        return `<div class="notes-attach-chip">
            <a href="${url}" target="_blank" rel="noopener" class="notes-attach-link" ${isImage ? '' : `download="${escapeHtml(a.name)}"`}>
                ${isImage ? `<img class="notes-attach-thumb" src="${url}">` : `<span class="notes-attach-icon">📄</span>`}
                <span class="notes-attach-name" title="${escapeHtml(a.name)}">${escapeHtml(a.name)}</span>
                <span class="notes-attach-size">${formatFileSize(a.size)}</span>
            </a>
            <button type="button" class="notes-attach-remove" onclick="deleteAttachment('${a.id}', ${noteId})" title="${t('notes_attach_remove')}">&times;</button>
        </div>`;
    }).join('');
}

/* ----- Categories: visitors name their own, stored locally alongside the notes ----- */

function getCategories() {
    try { return JSON.parse(localStorage.getItem(NOTES_CATEGORIES_KEY)) || []; } catch { return []; }
}

function saveCategories(cats) {
    localStorage.setItem(NOTES_CATEGORIES_KEY, JSON.stringify(cats));
}

function addNotesCategory(name) {
    name = (name || '').trim().slice(0, 20);
    if (!name) return;
    const cats = getCategories();
    if (cats.some(c => c.name === name)) return;
    cats.push({ id: 'c' + Date.now() + Math.random().toString(36).slice(2, 6), name });
    saveCategories(cats);
    initNotesCategorySelect();
    renderNotes();
}

function handleAddNotesCategory(event) {
    event.preventDefault();
    const input = document.getElementById('notes-new-category-input');
    addNotesCategory(input.value);
    input.value = '';
    return false;
}

function deleteNotesCategory(id) {
    if (!confirm(t('notes_cat_delete_confirm'))) return;
    saveCategories(getCategories().filter(c => c.id !== id));

    const notes = getNotes();
    let changed = false;
    notes.forEach(n => {
        if (n.category === id) { n.category = ''; changed = true; }
    });
    if (changed) saveNotesData(notes);

    if (notesFilter === id) notesFilter = 'all';
    initNotesCategorySelect();
    renderNotes();
}

/* ----- Note text + category (localStorage) ----- */

function renderNoteCategoryOptions(selected) {
    const options = [`<option value="" ${!selected ? 'selected' : ''}>${t('notes_cat_none')}</option>`];
    getCategories().forEach(c => {
        options.push(`<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${escapeHtml(c.name)}</option>`);
    });
    return options.join('');
}

function initNotesCategorySelect() {
    const sel = document.getElementById('notes-add-category');
    if (sel) sel.innerHTML = renderNoteCategoryOptions('');
}
initNotesCategorySelect();

function handleAddNote(event) {
    event.preventDefault();
    const form = event.target;
    const text = form.elements.text.value.trim();
    if (!text) return false;
    const category = form.elements.category.value || '';

    const notes = getNotes();
    notes.unshift({ id: Date.now(), text, category, updatedAt: new Date().toISOString() });
    saveNotesData(notes);
    form.reset();
    initNotesCategorySelect();
    renderNotes();
    return false;
}

function updateNote(id, value) {
    const notes = getNotes();
    const note = notes.find(n => n.id === id);
    if (!note) return;
    note.text = value;
    note.updatedAt = new Date().toISOString();
    saveNotesData(notes);
    renderNotes();
}

function updateNoteCategory(id, category) {
    const notes = getNotes();
    const note = notes.find(n => n.id === id);
    if (!note) return;
    note.category = category;
    saveNotesData(notes);
    renderNotes();
}

function deleteNote(id) {
    if (!confirm(t('notes_delete_confirm'))) return;
    saveNotesData(getNotes().filter(n => n.id !== id));
    idbDeleteAttachmentsForNote(id).catch(e => console.error('Failed to delete attachments:', e));
    renderNotes();
}

function setNotesFilter(cat) {
    notesFilter = cat;
    renderNotes();
}

function formatNoteTime(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function autoGrowNote(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

function renderNotesFilters(allNotes) {
    const bar = document.getElementById('notes-filters');
    if (!bar) return;
    const cats = getCategories();
    const counts = {};
    let noneCount = 0;
    allNotes.forEach(n => {
        if (n.category) counts[n.category] = (counts[n.category] || 0) + 1;
        else noneCount++;
    });

    let html = `<span class="notes-filter-chip${notesFilter === 'all' ? ' active' : ''}">
        <button type="button" class="notes-filter-chip-btn" onclick="setNotesFilter('all')">${t('notes_cat_all')} <span class="notes-filter-count">${allNotes.length}</span></button>
    </span>`;

    if (noneCount > 0 || !cats.length) {
        html += `<span class="notes-filter-chip${notesFilter === 'none' ? ' active' : ''}">
            <button type="button" class="notes-filter-chip-btn" onclick="setNotesFilter('none')">${t('notes_cat_none')} <span class="notes-filter-count">${noneCount}</span></button>
        </span>`;
    }

    html += cats.map(c => `
        <span class="notes-filter-chip${notesFilter === c.id ? ' active' : ''}">
            <button type="button" class="notes-filter-chip-btn" onclick="setNotesFilter('${c.id}')">${escapeHtml(c.name)} <span class="notes-filter-count">${counts[c.id] || 0}</span></button>
            <button type="button" class="notes-filter-chip-del" onclick="deleteNotesCategory('${c.id}')" title="${t('notes_cat_delete')}">&times;</button>
        </span>`).join('');

    bar.innerHTML = html;
}

function renderNotes() {
    const list = document.getElementById('notes-list');
    if (!list) return;
    const allNotes = getNotes();
    renderNotesFilters(allNotes);

    if (!allNotes.length) {
        list.innerHTML = `<div class="guestbook-empty">${t('notes_empty')}</div>`;
        return;
    }

    const notes = notesFilter === 'all' ? allNotes
        : notesFilter === 'none' ? allNotes.filter(n => !n.category)
        : allNotes.filter(n => n.category === notesFilter);
    if (!notes.length) {
        list.innerHTML = `<div class="guestbook-empty">${t('notes_empty_filter')}</div>`;
        return;
    }

    list.innerHTML = notes.map(n => `
        <div class="notes-item">
            <div class="notes-item-top">
                <select class="notes-item-category" data-id="${n.id}" onchange="updateNoteCategory(${n.id}, this.value)">
                    ${renderNoteCategoryOptions(n.category || '')}
                </select>
                <button type="button" class="notes-item-delete" onclick="deleteNote(${n.id})" title="${t('notes_delete')}">&#x1F5D1;&#xFE0F;</button>
            </div>
            <textarea class="notes-item-text" data-id="${n.id}" oninput="autoGrowNote(this)" onchange="updateNote(${n.id}, this.value)"></textarea>
            <div class="notes-item-attachments" data-note-id="${n.id}"></div>
            <div class="notes-item-footer">
                <label class="notes-item-attach-btn" title="${t('notes_attach')}">
                    &#x1F4CE;
                    <input type="file" multiple onchange="handleAddAttachmentToExisting(${n.id}, this)">
                </label>
                <span class="notes-item-time">${formatNoteTime(n.updatedAt)}</span>
            </div>
        </div>
    `).join('');
    list.querySelectorAll('.notes-item-text').forEach(ta => {
        const note = notes.find(n => n.id === Number(ta.dataset.id));
        ta.value = note.text;
        autoGrowNote(ta);
    });
    notes.forEach(n => renderNoteAttachments(n.id));
}
