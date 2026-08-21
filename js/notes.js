/* ===== Personal notepad — note text/folders in localStorage, attachments in IndexedDB.
   Everything stays in this browser only; there is no backend. ===== */
const NOTES_KEY = 'notepad_notes';
const NOTES_CATEGORIES_KEY = 'notepad_categories';
const NOTE_ATTACHMENT_MAX_MB = 20;
let notesCurrentFolder = null; // id of the folder currently being browsed, null = root
let notesViewMode = 'list'; // 'list' | 'gallery'
let notesSearch = '';
let notesGalleryItems = [];
let notesGalleryRenderToken = 0; // guards against a slower, stale renderGallery() call clobbering a newer one

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
    if (notesViewMode === 'gallery') renderGallery();
}

async function deleteAttachment(id, noteId) {
    await idbDeleteAttachment(id);
    renderNoteAttachments(noteId);
    if (notesViewMode === 'gallery') renderGallery();
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

/* ----- Backup: bundle everything (notes, folders, attachments) into one downloadable
   JSON file, and merge one back in. Lets a visitor manually carry their notepad between
   devices/browsers without a server. ----- */

function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function exportNotesData() {
    const notes = getNotes();
    const categories = getCategories();
    const attachments = [];
    for (const n of notes) {
        let atts = [];
        try { atts = await idbGetAttachmentsForNote(n.id); } catch (e) { console.error('Failed to read attachments:', e); }
        for (const a of atts) {
            try {
                attachments.push({ noteId: n.id, name: a.name, type: a.type, size: a.size, addedAt: a.addedAt, data: await blobToDataURL(a.blob) });
            } catch (e) {
                console.error('Failed to encode attachment:', e);
            }
        }
    }

    const payload = { app: 'hanabi-notepad', version: 1, exportedAt: new Date().toISOString(), notes, categories, attachments };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notepad-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

async function handleImportFile(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;

    let payload;
    try {
        payload = JSON.parse(await file.text());
    } catch (e) {
        alert(t('notes_import_invalid'));
        return;
    }
    if (!payload || !Array.isArray(payload.notes) || !Array.isArray(payload.categories)) {
        alert(t('notes_import_invalid'));
        return;
    }
    if (!confirm(t('notes_import_confirm', { notes: payload.notes.length, folders: payload.categories.length }))) return;

    // Every id is regenerated so an import can never collide with (or overwrite) existing data.
    const catIdMap = {};
    const newCats = payload.categories.map(c => {
        const newId = 'c' + Date.now() + Math.random().toString(36).slice(2, 6);
        catIdMap[c.id] = newId;
        return { id: newId, name: c.name, color: c.color, parentId: null };
    });
    newCats.forEach((c, i) => {
        const oldParent = payload.categories[i].parentId;
        c.parentId = oldParent ? (catIdMap[oldParent] || null) : null;
    });

    const noteIdMap = {};
    const baseId = Date.now();
    const newNotes = payload.notes.map((n, i) => {
        const newId = baseId + i;
        noteIdMap[n.id] = newId;
        return { id: newId, text: n.text, category: n.category ? (catIdMap[n.category] || '') : '', pinned: !!n.pinned, updatedAt: n.updatedAt || new Date().toISOString() };
    });

    saveCategories(getCategories().concat(newCats));
    saveNotesData(getNotes().concat(newNotes));

    for (const a of (payload.attachments || [])) {
        const newNoteId = noteIdMap[a.noteId];
        if (newNoteId == null) continue;
        try {
            const blob = await fetch(a.data).then(r => r.blob());
            await idbAddAttachment({
                id: 'a' + newNoteId + '_' + Date.now() + '_' + Math.random().toString(36).slice(2),
                noteId: newNoteId,
                name: a.name,
                type: a.type,
                size: a.size,
                blob,
                addedAt: a.addedAt || new Date().toISOString()
            });
        } catch (e) {
            console.error('Failed to import attachment:', e);
        }
    }

    renderNotes();
    alert(t('notes_import_success', { n: newNotes.length }));
}

/* ----- Folders: visitors name their own, nested via parentId, stored locally ----- */

const NOTE_CATEGORY_COLORS = ['#f472b6', '#c084fc', '#60a5fa', '#34d399', '#fbbf24', '#fb7185', '#38bdf8', '#a78bfa'];

function categoryColorForId(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return NOTE_CATEGORY_COLORS[hash % NOTE_CATEGORY_COLORS.length];
}

function categoryColor(cat) {
    return cat.color || categoryColorForId(cat.id);
}

function getCategories() {
    try { return JSON.parse(localStorage.getItem(NOTES_CATEGORIES_KEY)) || []; } catch { return []; }
}

function saveCategories(cats) {
    localStorage.setItem(NOTES_CATEGORIES_KEY, JSON.stringify(cats));
}

function addNotesCategory(name, parentId) {
    name = (name || '').trim().slice(0, 20);
    if (!name) return;
    const cats = getCategories();
    const normalizedParent = parentId || null;
    if (cats.some(c => c.name === name && (c.parentId || null) === normalizedParent)) return;
    const id = 'c' + Date.now() + Math.random().toString(36).slice(2, 6);
    cats.push({ id, name, color: categoryColorForId(id), parentId: normalizedParent });
    saveCategories(cats);
    renderNotes();
}

function handleAddNotesCategory(event) {
    event.preventDefault();
    const input = document.getElementById('notes-new-category-input');
    addNotesCategory(input.value, notesCurrentFolder);
    input.value = '';
    return false;
}

/* Walks parentId links to collect a folder and every descendant folder's id. */
function collectFolderSubtreeIds(rootId, cats) {
    cats = cats || getCategories();
    const ids = new Set([rootId]);
    let changed = true;
    while (changed) {
        changed = false;
        cats.forEach(c => {
            if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) { ids.add(c.id); changed = true; }
        });
    }
    return ids;
}

/* Folder ids in scope for gallery/browsing: a specific folder's subtree, or every folder at the root. */
function descendantFolderIds(rootId) {
    if (!rootId) return new Set(getCategories().map(c => c.id));
    return collectFolderSubtreeIds(rootId);
}

function deleteNotesCategory(id) {
    if (!confirm(t('notes_cat_delete_confirm'))) return;
    const cats = getCategories();
    const target = cats.find(c => c.id === id);
    const fallbackParent = target ? (target.parentId || null) : null;
    const idsToDelete = collectFolderSubtreeIds(id, cats);

    const notes = getNotes();
    const notesToDelete = notes.filter(n => n.category && idsToDelete.has(n.category));
    saveNotesData(notes.filter(n => !(n.category && idsToDelete.has(n.category))));
    notesToDelete.forEach(n => idbDeleteAttachmentsForNote(n.id).catch(e => console.error('Failed to delete attachments:', e)));

    saveCategories(cats.filter(c => !idsToDelete.has(c.id)));

    if (idsToDelete.has(notesCurrentFolder)) notesCurrentFolder = fallbackParent;
    renderNotes();
}

/* Path from the root down to (and including) the given folder id. */
function folderPath(id) {
    const cats = getCategories();
    const byId = {};
    cats.forEach(c => { byId[c.id] = c; });
    const path = [];
    let cur = id;
    while (cur) {
        const c = byId[cur];
        if (!c) break;
        path.unshift(c);
        cur = c.parentId;
    }
    return path;
}

function navigateToFolder(id) {
    notesCurrentFolder = id || null;
    notesSearch = '';
    const searchInput = document.getElementById('notes-search-input');
    if (searchInput) searchInput.value = '';
    renderNotes();
}

function setNotesView(mode) {
    notesViewMode = mode;
    const listBtn = document.getElementById('notes-view-list-btn');
    const galleryBtn = document.getElementById('notes-view-gallery-btn');
    if (listBtn) listBtn.classList.toggle('active', mode === 'list');
    if (galleryBtn) galleryBtn.classList.toggle('active', mode === 'gallery');
    renderNotes();
}

/* ----- Note text + folder (localStorage) ----- */

/* Flat, indented list of every folder — used by each note's "move to folder" select. */
function renderFolderOptionsFlat(selectedId) {
    const cats = getCategories();
    const byParent = {};
    cats.forEach(c => {
        const key = c.parentId || '';
        (byParent[key] = byParent[key] || []).push(c);
    });
    const options = [`<option value="" ${!selectedId ? 'selected' : ''}>${t('notes_cat_none')}</option>`];
    function walk(parentId, depth) {
        (byParent[parentId || ''] || []).forEach(c => {
            const indent = '　'.repeat(depth);
            options.push(`<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${indent}${escapeHtml(c.name)}</option>`);
            walk(c.id, depth + 1);
        });
    }
    walk(null, 0);
    return options.join('');
}

function handleAddNote(event) {
    event.preventDefault();
    const form = event.target;
    const text = form.elements.text.value.trim();
    if (!text) return false;

    const notes = getNotes();
    notes.unshift({ id: Date.now(), text, category: notesCurrentFolder || '', updatedAt: new Date().toISOString() });
    saveNotesData(notes);
    form.reset();
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

function togglePinNote(id) {
    const notes = getNotes();
    const note = notes.find(n => n.id === id);
    if (!note) return;
    note.pinned = !note.pinned;
    saveNotesData(notes);
    renderNotes();
}

function handleNotesSearch(value) {
    notesSearch = (value || '').trim().toLowerCase();
    renderNotes();
}

function deleteNote(id) {
    if (!confirm(t('notes_delete_confirm'))) return;
    saveNotesData(getNotes().filter(n => n.id !== id));
    idbDeleteAttachmentsForNote(id).catch(e => console.error('Failed to delete attachments:', e));
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

function renderBreadcrumb() {
    const el = document.getElementById('notes-breadcrumb');
    if (!el) return;
    const path = folderPath(notesCurrentFolder);
    let html = `<button type="button" class="notes-crumb${!notesCurrentFolder ? ' active' : ''}" onclick="navigateToFolder(null)">${t('notes_cat_all')}</button>`;
    path.forEach((c, i) => {
        html += `<span class="notes-crumb-sep">&rsaquo;</span><button type="button" class="notes-crumb${i === path.length - 1 ? ' active' : ''}" onclick="navigateToFolder('${c.id}')">${escapeHtml(c.name)}</button>`;
    });
    el.innerHTML = html;
}

function renderFolderGrid() {
    const grid = document.getElementById('notes-folder-grid');
    if (!grid) return;
    if (notesSearch) { grid.innerHTML = ''; grid.style.display = 'none'; return; }

    const cats = getCategories();
    const notes = getNotes();
    const subfolders = cats.filter(c => (c.parentId || null) === (notesCurrentFolder || null));
    if (!subfolders.length) { grid.innerHTML = ''; grid.style.display = 'none'; return; }

    grid.style.display = '';
    grid.innerHTML = subfolders.map(c => {
        const count = notes.filter(n => n.category === c.id).length;
        return `<div class="notes-folder-card" onclick="navigateToFolder('${c.id}')">
            <button type="button" class="notes-folder-del" onclick="event.stopPropagation(); deleteNotesCategory('${c.id}')" title="${t('notes_cat_delete')}">&times;</button>
            <span class="notes-folder-icon" style="color:${categoryColor(c)}">&#x1F4C1;</span>
            <span class="notes-folder-name">${escapeHtml(c.name)}</span>
            <span class="notes-folder-count">${t('notes_folder_note_count', { n: count })}</span>
        </div>`;
    }).join('');
}

async function renderGallery() {
    const gallery = document.getElementById('notes-gallery');
    if (!gallery) return;
    const token = ++notesGalleryRenderToken; // if a newer render starts before this one finishes, this one must not apply its result

    const folderIds = descendantFolderIds(notesCurrentFolder);
    const allNotes = getNotes();
    const scopedNotes = notesCurrentFolder
        ? allNotes.filter(n => n.category && folderIds.has(n.category))
        : allNotes;

    const items = [];
    for (const n of scopedNotes) {
        let attachments = [];
        try { attachments = await idbGetAttachmentsForNote(n.id); } catch (e) { console.error('Failed to load attachments:', e); }
        attachments.filter(a => a.type && a.type.startsWith('image/')).forEach(a => items.push({ note: n, attachment: a }));
    }

    if (token !== notesGalleryRenderToken) return; // superseded by a later renderGallery() call

    notesGalleryItems = items;
    if (!items.length) {
        gallery.innerHTML = `<div class="guestbook-empty">${t('notes_gallery_empty')}</div>`;
        return;
    }
    gallery.innerHTML = items.map((it, idx) => {
        const url = URL.createObjectURL(it.attachment.blob);
        return `<button type="button" class="notes-gallery-tile" onclick="openGalleryLightbox(${idx})">
            <img src="${url}" alt="${escapeHtml(it.attachment.name)}" loading="lazy">
        </button>`;
    }).join('');
}

function openGalleryLightbox(idx) {
    const it = notesGalleryItems[idx];
    if (!it) return;
    const url = URL.createObjectURL(it.attachment.blob);
    const overlay = document.createElement('div');
    overlay.className = 'notes-lightbox-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="notes-lightbox-box">
            <button type="button" class="notes-lightbox-close">&times;</button>
            <img src="${url}" class="notes-lightbox-img" alt="${escapeHtml(it.attachment.name)}">
            <div class="notes-lightbox-caption">${escapeHtml(it.note.text.slice(0, 120))}</div>
        </div>`;
    overlay.querySelector('.notes-lightbox-close').onclick = () => overlay.remove();
    document.body.appendChild(overlay);
}

function renderNotes() {
    renderBreadcrumb();
    renderFolderGrid();

    const list = document.getElementById('notes-list');
    const gallery = document.getElementById('notes-gallery');
    if (!list) return;

    if (notesViewMode === 'gallery' && !notesSearch) {
        list.style.display = 'none';
        if (gallery) { gallery.style.display = ''; renderGallery(); }
        return;
    }
    list.style.display = '';
    if (gallery) gallery.style.display = 'none';

    const allNotes = getNotes();
    const cats = getCategories();

    if (!allNotes.length && !cats.length) {
        list.innerHTML = `<div class="guestbook-empty">${t('notes_empty')}</div>`;
        return;
    }

    let notes;
    let showPath = false;
    if (notesSearch) {
        notes = allNotes.filter(n => n.text.toLowerCase().includes(notesSearch));
        showPath = true;
    } else {
        notes = allNotes.filter(n => (n.category || null) === (notesCurrentFolder || null));
    }

    if (!notes.length) {
        list.innerHTML = `<div class="guestbook-empty">${t(notesSearch ? 'notes_empty_search' : 'notes_empty_filter')}</div>`;
        return;
    }
    notes = notes.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    const catsById = {};
    cats.forEach(c => { catsById[c.id] = c; });

    list.innerHTML = notes.map(n => {
        const cat = n.category ? catsById[n.category] : null;
        const accentStyle = cat ? ` style="border-left: 3px solid ${categoryColor(cat)};"` : '';
        const catDot = cat ? `<span class="notes-cat-dot" style="background:${categoryColor(cat)}"></span>` : '';
        const pathLabel = (showPath && cat) ? `<div class="notes-item-path">${escapeHtml(folderPath(cat.id).map(c => c.name).join(' / '))}</div>` : '';
        return `
        <div class="notes-item${n.pinned ? ' pinned' : ''}"${accentStyle}>
            ${pathLabel}
            <div class="notes-item-top">
                <div class="notes-item-cat-group">
                    ${catDot}
                    <select class="notes-item-category" data-id="${n.id}" onchange="updateNoteCategory(${n.id}, this.value)">
                        ${renderFolderOptionsFlat(n.category || '')}
                    </select>
                </div>
                <div class="notes-item-actions">
                    <button type="button" class="notes-item-pin${n.pinned ? ' active' : ''}" onclick="togglePinNote(${n.id})" title="${t(n.pinned ? 'notes_unpin' : 'notes_pin')}">&#x1F4CC;</button>
                    <button type="button" class="notes-item-delete" onclick="deleteNote(${n.id})" title="${t('notes_delete')}">&#x1F5D1;&#xFE0F;</button>
                </div>
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
        </div>`;
    }).join('');
    list.querySelectorAll('.notes-item-text').forEach(ta => {
        const note = notes.find(n => n.id === Number(ta.dataset.id));
        ta.value = note.text;
        autoGrowNote(ta);
    });
    notes.forEach(n => renderNoteAttachments(n.id));
}
