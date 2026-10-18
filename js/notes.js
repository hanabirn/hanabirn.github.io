/* ===== Notepad (記事本, redesigned 2026-10-17) — notes and folders in localStorage
   (synced to the account, js/account.js SYNC_KEYS), attachments in IndexedDB (this
   device only). A note:
     { id, title, text, category (folder id or ''), tags [], lang, pinned, star,
       src {kind, ref, label} (where it was saved from, notesAddFrom), createdAt, updatedAt,
       deletedAt (in the trash), purged (a tombstone: emptied after NOTES_TRASH_DAYS so
       the deletion still syncs) }
   text is light markup: "# " a heading, "- " a list item, **bold**, ==highlight==, and a
   "word — meaning" line is a word card. Folders: { id, name, color, parentId, updatedAt,
   deleted }. ===== */
const NOTES_KEY = 'notepad_notes';
const NOTES_CATEGORIES_KEY = 'notepad_categories';
const NOTE_ATTACHMENT_MAX_MB = 20;
const NOTES_TRASH_DAYS = 30;
const NOTES_SAVE_MS = 400;
let notesFilter = { k: 'all' };   // all | star | pinned | images | trash | folder (v = id) | tag (v = name) | folders (the folder manager)
let notesOpenId = null;           // the note on screen, null = the list
let notesEditing = false;
let notesSearch = '';
let notesGalleryItems = [];
let notesGalleryRenderToken = 0;  // a slower, stale renderGallery() must not clobber a newer one
let notesSaveTimer = 0;
let notesAttachCounts = {};       // note id → images / files on this device

/* ----- storage ----- */

function notesNow() { return new Date().toISOString(); }

/* HTML-escape, quotes included: text also goes into attributes and onclick strings */
function notesEsc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* every note in the store, old ones brought up to the current shape */
function getNotes() {
    let list;
    try { list = JSON.parse(localStorage.getItem(NOTES_KEY)) || []; } catch { list = []; }
    return list.map(n => n && n.purged ? n : Object.assign({
        title: '', text: '', category: '', tags: [], lang: '', pinned: false, star: false,
        createdAt: n && n.updatedAt
    }, n));
}

function saveNotesData(notes) {
    const s = JSON.stringify(notes);
    if (typeof storeSet === 'function') storeSet(NOTES_KEY, s);
    else localStorage.setItem(NOTES_KEY, s);
}

/* the notes not in the trash */
function notesLive(all) { return (all || getNotes()).filter(n => !n.purged && !n.deletedAt); }

function notesFind(id, all) { return (all || getNotes()).find(n => n.id === id); }

/* change one note and save (updatedAt decides which copy wins when syncing) */
function notesUpdate(id, change) {
    const all = getNotes();
    const n = notesFind(id, all);
    if (!n) return null;
    Object.assign(n, change, { updatedAt: notesNow() });
    saveNotesData(all);
    return n;
}

/* notes in the trash longer than NOTES_TRASH_DAYS become tombstones (and lose their files) */
function notesPurgeTrash() {
    const limit = Date.now() - NOTES_TRASH_DAYS * 86400000;
    const all = getNotes();
    let changed = false;
    all.forEach((n, i) => {
        if (!n.purged && n.deletedAt && Date.parse(n.deletedAt) < limit) {
            all[i] = { id: n.id, purged: true, deletedAt: n.deletedAt, updatedAt: notesNow() };
            idbDeleteAttachmentsForNote(n.id).catch(() => {});
            changed = true;
        }
    });
    if (changed) saveNotesData(all);
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

function idbGetAllAttachments() {
    return openNotesDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(ATTACH_STORE, 'readonly');
        const req = tx.objectStore(ATTACH_STORE).getAll();
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
    notesAttachCounts[noteId] = attachments.length;
    if (!attachments.length) { container.innerHTML = ''; return; }
    container.innerHTML = `<div class="notes-local-hint">${uiIcon('photo')} ${notesEsc(t('notes_local_files'))}</div>` + attachments.map(a => {
        const isImage = a.type && a.type.startsWith('image/');
        const url = URL.createObjectURL(a.blob);
        return `<div class="notes-attach-chip">
            <a href="${url}" target="_blank" rel="noopener" class="notes-attach-link" ${isImage ? '' : `download="${notesEsc(a.name)}"`}>
                ${isImage ? `<img class="notes-attach-thumb" src="${url}" alt="">` : `<span class="notes-attach-icon">${uiIcon('document')}</span>`}
                <span class="notes-attach-name" title="${notesEsc(a.name)}">${notesEsc(a.name)}</span>
                <span class="notes-attach-size">${formatFileSize(a.size)}</span>
            </a>
            <button type="button" class="notes-attach-remove" onclick="deleteAttachment('${a.id}', ${noteId})" title="${t('notes_attach_remove')}">&times;</button>
        </div>`;
    }).join('');
}

/* ----- Backup: bundle everything (notes, folders, attachments) into one downloadable
   JSON file, and merge one back in — the only way to carry attachments to another device. ----- */

function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function exportNotesData() {
    notesCloseMenu();
    const notes = notesLive();
    const categories = notesFolders();
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

    const payload = { app: 'hanabi-notepad', version: 2, exportedAt: new Date().toISOString(), notes, categories, attachments };
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
    notesCloseMenu();
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
    const cats0 = payload.categories.filter(c => c && !c.deleted);
    const notes0 = payload.notes.filter(n => n && !n.purged && !n.deletedAt);
    if (!confirm(t('notes_import_confirm', { notes: notes0.length, folders: cats0.length }))) return;

    // Every id is regenerated so an import can never collide with (or overwrite) existing data.
    const now = notesNow();
    const catIdMap = {};
    const newCats = cats0.map(c => {
        const newId = 'c' + Date.now() + Math.random().toString(36).slice(2, 6);
        catIdMap[c.id] = newId;
        return { id: newId, name: c.name, color: c.color, parentId: null, updatedAt: now };
    });
    newCats.forEach((c, i) => {
        const oldParent = cats0[i].parentId;
        c.parentId = oldParent ? (catIdMap[oldParent] || null) : null;
    });

    const noteIdMap = {};
    const baseId = Date.now();
    const newNotes = notes0.map((n, i) => {
        const newId = baseId + i;
        noteIdMap[n.id] = newId;
        return {
            id: newId, title: n.title || '', text: n.text || '', category: n.category ? (catIdMap[n.category] || '') : '',
            tags: Array.isArray(n.tags) ? n.tags : [], lang: n.lang || '', pinned: !!n.pinned, star: !!n.star,
            src: n.src, rv: n.rv, createdAt: n.createdAt || now, updatedAt: now
        };
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

/* ----- Folders ----- */

const NOTE_CATEGORY_COLORS = ['#c8432b', '#b8862b', '#3f5a8a', '#5b6b4e', '#8a3a3a', '#a8792a', '#2f6f73', '#6b4f7a'];

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

/* the folders not deleted */
function notesFolders() { return getCategories().filter(c => c && !c.deleted); }

/* "Parent / Child" for a folder */
function notesFolderName(id, cats) {
    cats = cats || notesFolders();
    const byId = {};
    cats.forEach(c => { byId[c.id] = c; });
    const names = [];
    for (let c = byId[id]; c; c = byId[c.parentId]) names.unshift(c.name);
    return names.join(' / ');
}

/* folders in tree order, each with its depth */
function notesFolderTree() {
    const cats = notesFolders();
    const byParent = {};
    cats.forEach(c => { (byParent[c.parentId || ''] = byParent[c.parentId || ''] || []).push(c); });
    const out = [];
    (function walk(pid, depth) {
        (byParent[pid || ''] || []).forEach(c => { out.push({ c, depth }); walk(c.id, depth + 1); });
    })(null, 0);
    return out;
}

function addNotesCategory(name, parentId) {
    name = (name || '').trim().slice(0, 20);
    if (!name) return null;
    const cats = getCategories();
    const parent = parentId || null;
    const same = cats.find(c => !c.deleted && c.name === name && (c.parentId || null) === parent);
    if (same) return same.id;
    const id = 'c' + Date.now() + Math.random().toString(36).slice(2, 6);
    cats.push({ id, name, color: categoryColorForId(id), parentId: parent, updatedAt: notesNow() });
    saveCategories(cats);
    return id;
}

function handleAddNotesCategory(event) {
    event.preventDefault();
    const input = document.getElementById('notes-new-folder');
    const parent = document.getElementById('notes-new-folder-parent');
    if (addNotesCategory(input.value, parent ? parent.value : null)) input.value = '';
    renderNotes();
    return false;
}

function renameNotesCategory(id) {
    const cats = getCategories();
    const c = cats.find(x => x.id === id);
    if (!c) return;
    const name = (prompt(t('notes_folder_rename'), c.name) || '').trim().slice(0, 20);
    if (!name || name === c.name) return;
    c.name = name;
    c.updatedAt = notesNow();
    saveCategories(cats);
    renderNotes();
}

/* A folder and every folder inside it. */
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

/* deleting a folder keeps its notes: they move to 未分類 */
function deleteNotesCategory(id) {
    if (!confirm(t('notes_folder_delete_confirm'))) return;
    const cats = getCategories();
    const ids = collectFolderSubtreeIds(id, cats);
    const now = notesNow();
    cats.forEach(c => { if (ids.has(c.id)) { c.deleted = true; c.updatedAt = now; } });
    saveCategories(cats);
    const all = getNotes();
    all.forEach(n => { if (!n.purged && n.category && ids.has(n.category)) { n.category = ''; n.updatedAt = now; } });
    saveNotesData(all);
    if (notesFilter.k === 'folder' && ids.has(notesFilter.v)) notesFilter = { k: 'folders' };
    renderNotes();
}

/* ----- light markup ----- */

const NOTES_PAIR_RE = /^\s*(?:[-*]\s+)?(.+?)\s+[—–=]\s+(.+?)\s*$/;

function notesInline(s) {
    return notesEsc(s)
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/==(.+?)==/g, '<mark>$1</mark>');
}

/* the word cards a note holds: lines written "word — meaning" */
function notesPairs(text) {
    const out = [];
    String(text || '').split('\n').forEach(line => {
        if (/^\s*#/.test(line)) return;
        const m = NOTES_PAIR_RE.exec(line);
        if (m && m[1].length <= 40) out.push({ w: m[1].replace(/\*\*|==/g, '').trim(), m: m[2].replace(/\*\*|==/g, '').trim() });
    });
    return out;
}

/* the note body as HTML: headings, lists, word cards (grouped), paragraphs */
function notesRender(text) {
    const html = [];
    let list = null, pairs = null;
    const close = () => {
        if (list) { html.push('<ul>' + list.join('') + '</ul>'); list = null; }
        if (pairs) { html.push('<div class="notes-pairs">' + pairs.join('') + '</div>'); pairs = null; }
    };
    String(text || '').split('\n').forEach(line => {
        const h = /^\s*#{1,3}\s+(.*)$/.exec(line);
        const pm = !h && NOTES_PAIR_RE.exec(line);
        const li = !h && !pm && /^\s*[-*•]\s+(.*)$/.exec(line);
        if (h) { close(); html.push('<h4>' + notesInline(h[1]) + '</h4>'); }
        else if (pm && pm[1].length <= 40) {
            if (list) close();
            (pairs = pairs || []).push(`<div><b>${notesInline(pm[1])}</b><span>${notesInline(pm[2])}</span></div>`);
        } else if (li) {
            if (pairs) close();
            (list = list || []).push('<li>' + notesInline(li[1]) + '</li>');
        } else if (!line.trim()) { close(); }
        else { close(); html.push('<p>' + notesInline(line) + '</p>'); }
    });
    close();
    return html.join('');
}

/* plain text for previews and search */
function notesPlain(text) {
    return String(text || '').replace(/^\s*#{1,3}\s+/gm, '').replace(/^\s*[-*•]\s+/gm, '').replace(/\*\*|==/g, '');
}

/* the title, or the first line when there is none */
function notesTitleOf(n) {
    if (n.title && n.title.trim()) return n.title.trim();
    const first = notesPlain(n.text).split('\n').find(l => l.trim());
    return first ? first.trim().slice(0, 60) : t('notes_untitled');
}

function notesPreviewOf(n) {
    let lines = notesPlain(n.text).split('\n').map(l => l.trim()).filter(Boolean);
    if (!(n.title && n.title.trim())) lines = lines.slice(1);
    return lines.join('　');
}

function formatNoteTime(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return sameYear ? `${d.getMonth() + 1}/${d.getDate()}` : d.toLocaleDateString();
}

/* ----- the list ----- */

function notesAllTags(notes) {
    const count = {};
    (notes || notesLive()).forEach(n => (n.tags || []).forEach(tg => { count[tg] = (count[tg] || 0) + 1; }));
    return Object.keys(count).sort((a, b) => count[b] - count[a] || a.localeCompare(b)).map(tg => ({ tag: tg, n: count[tg] }));
}

/* the notes the current filter and search show, pinned first, newest first */
function notesVisible() {
    const all = getNotes();
    let notes = notesFilter.k === 'trash' ? all.filter(n => !n.purged && n.deletedAt) : notesLive(all);
    const f = notesFilter;
    if (f.k === 'star') notes = notes.filter(n => n.star);
    else if (f.k === 'pinned') notes = notes.filter(n => n.pinned);
    else if (f.k === 'tag') notes = notes.filter(n => (n.tags || []).includes(f.v));
    else if (f.k === 'folder') {
        const ids = collectFolderSubtreeIds(f.v);
        notes = notes.filter(n => n.category && ids.has(n.category));
    }
    if (notesSearch) {
        const q = notesSearch;
        notes = notes.filter(n => [n.title, notesPlain(n.text), (n.tags || []).join(' '), n.src && n.src.label]
            .join(' ').toLowerCase().includes(q));
    }
    const time = n => Date.parse(f.k === 'trash' ? n.deletedAt : n.updatedAt) || 0;
    return notes.sort((a, b) => (f.k !== 'trash' && (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || time(b) - time(a));
}

function notesFilterIs(k, v) { return notesFilter.k === k && (v === undefined || notesFilter.v === v); }

function notesSetFilter(k, v) {
    notesFilter = { k, v };
    notesOpenId = null;
    notesEditing = false;
    renderNotes();
    const main = document.querySelector('.notes-main');
    if (main && main.getBoundingClientRect().top < 0) main.scrollIntoView({ block: 'start' });
}

function handleNotesSearch(value) {
    notesSearch = (value || '').trim().toLowerCase();
    notesRenderBody();
}

/* the filters as a desktop side list (side) or a phone chip row (chips) */
function notesFilterItems() {
    const live = notesLive();
    const items = [
        { k: 'all', icon: 'grid', label: t('notes_cat_all'), n: live.length },
        { k: 'star', icon: 'star', label: t('notes_f_star'), n: live.filter(n => n.star).length },
        { k: 'pinned', icon: 'pin', label: t('notes_pin'), n: live.filter(n => n.pinned).length, hideEmpty: true },
        { k: 'images', icon: 'photo', label: t('notes_view_gallery') }
    ];
    return items.filter(it => !(it.hideEmpty && !it.n));
}

function notesSideHtml() {
    const live = notesLive();
    const row = (on, click, inner, n) => `<button type="button" class="notes-side-item${on ? ' on' : ''}" onclick="${click}">${inner}${n != null ? `<small>${n}</small>` : ''}</button>`;
    const filters = notesFilterItems().map(it => row(notesFilterIs(it.k), `notesSetFilter('${it.k}')`, uiIcon(it.icon) + `<span>${notesEsc(it.label)}</span>`, it.n)).join('');
    const folders = notesFolderTree().map(({ c, depth }) => {
        const ids = collectFolderSubtreeIds(c.id);
        const n = live.filter(x => x.category && ids.has(x.category)).length;
        return row(notesFilterIs('folder', c.id), `notesSetFilter('folder','${c.id}')`,
            `<span class="notes-dot" style="background:${categoryColor(c)};margin-left:${depth * 12}px"></span><span>${notesEsc(c.name)}</span>`, n);
    }).join('');
    const tags = notesAllTags(live).map(({ tag, n }) => row(notesFilterIs('tag', tag), `notesSetFilter('tag',${notesEsc(JSON.stringify(tag))})`,
        `<span class="notes-hash">#</span><span>${notesEsc(tag)}</span>`, n)).join('');
    const trashN = getNotes().filter(n => !n.purged && n.deletedAt).length;
    return `
        <button type="button" class="btn next-btn notes-new-btn" onclick="notesNew()">${uiIcon('plus')} ${notesEsc(t('notes_new'))}</button>
        <div class="notes-side-group">${filters}</div>
        <div class="notes-side-head"><span>${notesEsc(t('notes_folders'))}</span><button type="button" class="notes-side-edit" onclick="notesSetFilter('folders')" title="${notesEsc(t('notes_folders_manage'))}">${uiIcon('pencil')}</button></div>
        <div class="notes-side-group">${folders || `<button type="button" class="notes-side-item muted" onclick="notesSetFilter('folders')">${uiIcon('plus')}<span>${notesEsc(t('notes_folder_new'))}</span></button>`}</div>
        ${tags ? `<div class="notes-side-head"><span>${notesEsc(t('notes_tags'))}</span></div><div class="notes-side-group">${tags}</div>` : ''}
        <div class="notes-side-group notes-side-foot">${row(notesFilterIs('trash'), "notesSetFilter('trash')", uiIcon('trash') + `<span>${notesEsc(t('notes_trash'))}</span>`, trashN || null)}</div>`;
}

function notesChipsHtml() {
    const live = notesLive();
    const chip = (on, click, inner) => `<button type="button" class="notes-chip${on ? ' on' : ''}" onclick="${click}">${inner}</button>`;
    const out = notesFilterItems().map(it => chip(notesFilterIs(it.k), `notesSetFilter('${it.k}')`,
        uiIcon(it.icon) + notesEsc(it.label) + (it.n != null ? ` <small>${it.n}</small>` : '')));
    notesFolderTree().forEach(({ c }) => out.push(chip(notesFilterIs('folder', c.id), `notesSetFilter('folder','${c.id}')`,
        `<span class="notes-dot" style="background:${categoryColor(c)}"></span>${notesEsc(c.name)}`)));
    notesAllTags(live).forEach(({ tag }) => out.push(chip(notesFilterIs('tag', tag), `notesSetFilter('tag',${notesEsc(JSON.stringify(tag))})`,
        `<span class="notes-hash">#</span>${notesEsc(tag)}`)));
    out.push(chip(notesFilterIs('folders'), "notesSetFilter('folders')", uiIcon('folder') + notesEsc(t('notes_folders_manage'))));
    out.push(chip(notesFilterIs('trash'), "notesSetFilter('trash')", uiIcon('trash') + notesEsc(t('notes_trash'))));
    return out.join('');
}

/* the sync line: synced / sign in to sync */
function notesSyncHtml() {
    const user = typeof acctUser !== 'undefined' && acctUser;
    if (user) {
        const err = typeof acctStatus !== 'undefined' && acctStatus === 'error';
        return `<span class="notes-sync${err ? ' err' : ''}">${uiIcon('cloud')} ${notesEsc(t(err ? 'notes_sync_err' : 'notes_sync_on'))}</span>`;
    }
    return `<button type="button" class="notes-sync off" onclick="if (typeof openAccount === 'function') openAccount()">${uiIcon('cloud')} ${notesEsc(t('notes_sync_off'))}</button>`;
}

function notesCardHtml(n, cats) {
    const cat = n.category && cats.find(c => c.id === n.category);
    const color = cat ? categoryColor(cat) : 'var(--line)';
    const tags = (n.tags || []).map(tg => `<span class="notes-tag">#${notesEsc(tg)}</span>`).join('');
    const pairs = notesPairs(n.text).length;
    const trash = !!n.deletedAt;
    const flag = n.lang && typeof learnFlags === 'function' ? `<span class="notes-card-flag">${learnFlags(n.lang)}</span>` : '';
    const meta = [
        cat ? `<span class="notes-card-folder">${notesEsc(notesFolderName(cat.id, cats))}</span>` : '',
        tags,
        n.src ? `<span class="notes-card-src">${uiIcon('uturn')}${notesEsc(n.src.label || '')}</span>` : '',
        pairs ? `<span class="notes-card-pairs">${uiIcon('cards')}${notesEsc(t('notes_cards_n', { n: pairs }))}</span>` : '',
        notesAttachCounts[n.id] ? `<span>${uiIcon('photo')}${notesAttachCounts[n.id]}</span>` : '',
        `<span class="notes-card-time">${trash ? notesEsc(t('notes_trashed_on', { d: formatNoteTime(n.deletedAt) })) : formatNoteTime(n.updatedAt)}</span>`
    ].join('');
    const actions = trash
        ? `<div class="notes-card-actions"><button type="button" class="btn back-btn" onclick="event.stopPropagation(); notesRestore(${n.id})">${uiIcon('uturn')} ${notesEsc(t('notes_restore'))}</button>
           <button type="button" class="notes-icon-btn" onclick="event.stopPropagation(); notesDeleteForever(${n.id})" title="${notesEsc(t('notes_delete_forever'))}" aria-label="${notesEsc(t('notes_delete_forever'))}">${uiIcon('trash')}</button></div>`
        : '';
    return `<div class="notes-card${n.pinned ? ' pinned' : ''}" style="--c:${color}" ${trash ? '' : `role="button" tabindex="0" onclick="notesOpen(${n.id})" onkeydown="if(event.key==='Enter')notesOpen(${n.id})"`}>
        <div class="notes-card-title">${flag}<span>${notesEsc(notesTitleOf(n))}</span>
            ${n.star ? `<span class="notes-card-mark star" title="${notesEsc(t('notes_f_star'))}">${uiIcon('star')}</span>` : ''}
            ${n.pinned ? `<span class="notes-card-mark" title="${notesEsc(t('notes_pin'))}">${uiIcon('pin')}</span>` : ''}</div>
        ${notesPreviewOf(n) ? `<div class="notes-card-preview">${notesEsc(notesPreviewOf(n))}</div>` : ''}
        <div class="notes-card-meta">${meta}</div>
        ${actions}
    </div>`;
}

function notesEmptyHtml() {
    return `<div class="notes-empty">
        <span class="mascot-slot notes-empty-mascot" data-mascot="bust"></span>
        <div class="notes-empty-title">${notesEsc(t('notes_empty_title'))}</div>
        <p>${notesEsc(t('notes_empty_text'))}</p>
        <div class="notes-empty-btns">
            <button type="button" class="btn back-btn" onclick="notesNew('word')">${notesEsc(t('notes_tpl_word'))}</button>
            <button type="button" class="btn back-btn" onclick="notesNew('grammar')">${notesEsc(t('notes_tpl_grammar'))}</button>
            <button type="button" class="btn back-btn" onclick="notesNew('mistake')">${notesEsc(t('notes_tpl_mistake'))}</button>
        </div>
    </div>`;
}

/* the folder manager: add, rename, delete */
function notesFoldersHtml() {
    const tree = notesFolderTree();
    const live = notesLive();
    const rows = tree.map(({ c, depth }) => {
        const n = live.filter(x => x.category === c.id).length;
        return `<div class="notes-folder-row" style="padding-left:${10 + depth * 18}px">
            <span class="notes-dot" style="background:${categoryColor(c)}"></span>
            <button type="button" class="notes-folder-open" onclick="notesSetFilter('folder','${c.id}')">${notesEsc(c.name)} <small>${notesEsc(t('notes_folder_note_count', { n }))}</small></button>
            <button type="button" class="notes-icon-btn" onclick="renameNotesCategory('${c.id}')" title="${notesEsc(t('notes_folder_rename'))}" aria-label="${notesEsc(t('notes_folder_rename'))}">${uiIcon('pencil')}</button>
            <button type="button" class="notes-icon-btn" onclick="deleteNotesCategory('${c.id}')" title="${notesEsc(t('notes_cat_delete'))}" aria-label="${notesEsc(t('notes_cat_delete'))}">${uiIcon('trash')}</button>
        </div>`;
    }).join('');
    const parents = `<option value="">${notesEsc(t('notes_folder_top'))}</option>` + tree.map(({ c, depth }) =>
        `<option value="${c.id}">${'　'.repeat(depth + 1)}${notesEsc(c.name)}</option>`).join('');
    return `<div class="notes-section-title">${uiIcon('folder')} ${notesEsc(t('notes_folders_manage'))}</div>
        <form class="notes-folder-form" onsubmit="return handleAddNotesCategory(event)">
            <input type="text" id="notes-new-folder" class="notes-input" maxlength="20" placeholder="${notesEsc(t('notes_cat_new_placeholder'))}" aria-label="${notesEsc(t('notes_cat_new_placeholder'))}">
            ${tree.length ? `<select id="notes-new-folder-parent" class="notes-input notes-folder-parent" aria-label="${notesEsc(t('notes_folder_parent'))}">${parents}</select>` : ''}
            <button type="submit" class="btn next-btn">${uiIcon('plus')} ${notesEsc(t('notes_folder_new'))}</button>
        </form>
        <div class="notes-folder-list">${rows || `<p class="notes-muted">${notesEsc(t('notes_folders_none'))}</p>`}</div>`;
}

async function renderGallery() {
    const gallery = document.getElementById('notes-gallery');
    if (!gallery) return;
    const token = ++notesGalleryRenderToken;
    const live = new Map(notesLive().map(n => [n.id, n]));
    let atts = [];
    try { atts = await idbGetAllAttachments(); } catch (e) { console.error('Failed to load attachments:', e); }
    if (token !== notesGalleryRenderToken) return;
    const items = atts.filter(a => a.type && a.type.startsWith('image/') && live.has(a.noteId))
        .map(a => ({ note: live.get(a.noteId), attachment: a }));
    notesGalleryItems = items;
    if (!items.length) {
        gallery.innerHTML = `<p class="notes-muted notes-center">${notesEsc(t('notes_gallery_empty'))}</p>`;
        return;
    }
    gallery.innerHTML = items.map((it, idx) => {
        const url = URL.createObjectURL(it.attachment.blob);
        return `<button type="button" class="notes-gallery-tile" onclick="openGalleryLightbox(${idx})">
            <img src="${url}" alt="${notesEsc(it.attachment.name)}" loading="lazy">
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
            <button type="button" class="notes-lightbox-close" aria-label="${notesEsc(t('notes_back'))}">&times;</button>
            <img src="${url}" class="notes-lightbox-img" alt="${notesEsc(it.attachment.name)}">
            <button type="button" class="notes-lightbox-caption">${notesEsc(notesTitleOf(it.note))} ›</button>
        </div>`;
    overlay.querySelector('.notes-lightbox-close').onclick = () => overlay.remove();
    overlay.querySelector('.notes-lightbox-caption').onclick = () => { overlay.remove(); notesOpen(it.note.id); };
    document.body.appendChild(overlay);
}

/* ----- one note: reading it, editing it ----- */

function notesTemplate(kind) {
    return kind ? t('notes_tpl_' + kind + '_body') : '';
}

function notesNew(kind) {
    const all = getNotes();
    const now = notesNow();
    const id = Date.now();
    const folder = notesFilter.k === 'folder' ? notesFilter.v : '';
    const tag = notesFilter.k === 'tag' ? [notesFilter.v] : [];
    all.unshift({
        id, title: '', text: notesTemplate(kind), category: folder, tags: tag,
        lang: typeof learnLang === 'function' ? learnLang() : '', pinned: false, star: notesFilter.k === 'star',
        createdAt: now, updatedAt: now
    });
    saveNotesData(all);
    notesOpenId = id;
    notesEditing = true;
    if (notesFilter.k === 'trash' || notesFilter.k === 'folders' || notesFilter.k === 'images') notesFilter = { k: 'all' };
    renderNotes();
    const title = document.getElementById('notes-ed-title');
    if (title) title.focus();
}

function notesOpen(id) {
    notesOpenId = id;
    notesEditing = false;
    renderNotes();
    const main = document.querySelector('.notes-main');
    if (main && main.getBoundingClientRect().top < 0) main.scrollIntoView({ block: 'start' });
}

/* back to the list; an untouched new note is dropped */
function notesClose() {
    notesFlushSave();
    const n = notesFind(notesOpenId);
    if (n && !n.title.trim() && !n.text.trim() && !(n.tags || []).length && !notesAttachCounts[n.id]) {
        saveNotesData(getNotes().filter(x => x.id !== n.id));
    }
    notesOpenId = null;
    notesEditing = false;
    renderNotes();
}

function notesEdit() {
    notesEditing = true;
    renderNotes();
    const ta = document.getElementById('notes-ed-text');
    if (ta) ta.focus();
}

function notesDoneEditing() {
    notesFlushSave();
    notesEditing = false;
    renderNotes();
}

function notesToggle(field) {
    const n = notesFind(notesOpenId);
    if (!n) return;
    notesFlushSave();
    notesUpdate(n.id, { [field]: !n[field] });
    renderNotes();
}

function notesTrash(id) {
    notesFlushSave();
    notesUpdate(id, { deletedAt: notesNow() });
    if (notesOpenId === id) { notesOpenId = null; notesEditing = false; }
    renderNotes();
    if (typeof showShareToast === 'function') showShareToast(t('notes_trashed', { n: NOTES_TRASH_DAYS }));
}

function notesRestore(id) {
    notesUpdate(id, { deletedAt: null });
    renderNotes();
}

function notesDeleteForever(id) {
    if (!confirm(t('notes_delete_forever_confirm'))) return;
    const all = getNotes();
    const i = all.findIndex(n => n.id === id);
    if (i < 0) return;
    all[i] = { id, purged: true, deletedAt: all[i].deletedAt || notesNow(), updatedAt: notesNow() };
    saveNotesData(all);
    idbDeleteAttachmentsForNote(id).catch(() => {});
    renderNotes();
}

/* autosave while typing */
function notesQueueSave() {
    clearTimeout(notesSaveTimer);
    notesSaveTimer = setTimeout(notesFlushSave, NOTES_SAVE_MS);
    const st = document.getElementById('notes-ed-status');
    if (st) st.textContent = t('notes_saving');
}

function notesFlushSave() {
    clearTimeout(notesSaveTimer);
    notesSaveTimer = 0;
    const title = document.getElementById('notes-ed-title');
    const text = document.getElementById('notes-ed-text');
    if (!title || !text || notesOpenId == null) return;
    const n = notesFind(notesOpenId);
    if (!n || (n.title === title.value && n.text === text.value)) return;
    notesUpdate(notesOpenId, { title: title.value, text: text.value });
    const st = document.getElementById('notes-ed-status');
    if (st) st.textContent = t('notes_saved');
}

function notesSetFolder(value) {
    notesUpdate(notesOpenId, { category: value });
    try { localStorage.setItem('notes_last_folder', value); } catch {}   // where ＋筆記 saves next
}

function notesSetLang(value) {
    notesUpdate(notesOpenId, { lang: value });
}

function notesAddTag(input) {
    const tag = input.value.replace(/^#/, '').replace(/[,，]/g, '').trim().slice(0, 20);
    input.value = '';
    if (!tag) return;
    const n = notesFind(notesOpenId);
    if (!n || (n.tags || []).includes(tag)) return;
    notesFlushSave();
    notesUpdate(n.id, { tags: (n.tags || []).concat(tag) });
    notesRenderTags();
}

function notesRemoveTag(tag) {
    const n = notesFind(notesOpenId);
    if (!n) return;
    notesFlushSave();
    notesUpdate(n.id, { tags: (n.tags || []).filter(x => x !== tag) });
    notesRenderTags();
}

function notesTagKey(event, input) {
    if (event.key === 'Enter' || event.key === ',' || event.key === '，') {
        event.preventDefault();
        notesAddTag(input);
    }
}

function notesRenderTags() {
    const box = document.getElementById('notes-ed-tags');
    const n = notesFind(notesOpenId);
    if (!box || !n) return;
    box.innerHTML = (n.tags || []).map(tg => `<span class="notes-tag edit">#${notesEsc(tg)}<button type="button" onclick='notesRemoveTag(${notesEsc(JSON.stringify(tg))})' aria-label="${notesEsc(t('notes_tag_remove'))}">&times;</button></span>`).join('');
}

/* the formatting buttons: wrap the selection, or start the lines with a mark */
function notesFormat(kind) {
    const ta = document.getElementById('notes-ed-text');
    if (!ta) return;
    const { selectionStart: a, selectionEnd: b, value: v } = ta;
    let start = a, end = b, insert;
    if (kind === 'bold' || kind === 'mark') {
        const m = kind === 'bold' ? '**' : '==';
        const sel = v.slice(a, b) || t(kind === 'bold' ? 'notes_tool_bold' : 'notes_tool_mark');
        insert = m + sel + m;
        ta.setRangeText(insert, a, b, 'end');
        ta.setSelectionRange(a + m.length, a + m.length + sel.length);
    } else if (kind === 'head' || kind === 'list') {
        const mark = kind === 'head' ? '# ' : '- ';
        start = v.lastIndexOf('\n', a - 1) + 1;
        const block = v.slice(start, end);
        const lines = block.split('\n');
        const all = lines.every(l => l.startsWith(mark));
        insert = lines.map(l => all ? l.slice(mark.length) : (l.startsWith(mark) ? l : mark + l)).join('\n');
        ta.setRangeText(insert, start, end, 'end');
    } else if (kind === 'card') {
        const lineStart = v.lastIndexOf('\n', a - 1) + 1;
        const pre = a > lineStart ? '\n' : '';
        const word = t('notes_tool_card_word'), mean = t('notes_tool_card_meaning');
        insert = pre + word + ' — ' + mean + '\n';
        ta.setRangeText(insert, a, b, 'end');
        const ws = a + pre.length;
        ta.setSelectionRange(ws, ws + word.length);
    }
    ta.focus();
    notesQueueSave();
}

function notesSourceHtml(n) {
    if (!n.src) return '';
    return `<button type="button" class="notes-src-btn" onclick="notesGoSource(${n.id})">${uiIcon('uturn')} ${notesEsc(t('notes_src_back', { s: n.src.label || '' }))}</button>`;
}

/* the source link of a note saved from another page (stage C fills notesGoSource) */
function notesGoSource(id) {
    const n = notesFind(id);
    if (n && n.src && typeof notesOpenSource === 'function') notesOpenSource(n.src);
}

function notesReaderHtml(n) {
    const cats = notesFolders();
    const cat = n.category && cats.find(c => c.id === n.category);
    const tags = (n.tags || []).map(tg => `<button type="button" class="notes-tag" onclick='notesSetFilter("tag", ${notesEsc(JSON.stringify(tg))})'>#${notesEsc(tg)}</button>`).join('');
    const pairs = notesPairs(n.text);
    const btn = (on, click, icon, key) => `<button type="button" class="notes-icon-btn${on ? ' on' : ''}" onclick="${click}" title="${notesEsc(t(key))}" aria-label="${notesEsc(t(key))}" aria-pressed="${on ? 'true' : 'false'}">${uiIcon(icon)}</button>`;
    return `<div class="notes-view">
        <div class="notes-view-bar">
            <button type="button" class="btn back-btn" onclick="notesClose()">${uiIcon('back')} ${notesEsc(t('notes_back'))}</button>
            <span class="notes-grow"></span>
            ${btn(n.star, "notesToggle('star')", 'star', 'notes_f_star')}
            ${btn(n.pinned, "notesToggle('pinned')", 'pin', n.pinned ? 'notes_unpin' : 'notes_pin')}
            ${btn(false, `notesTrash(${n.id})`, 'trash', 'notes_delete')}
            <button type="button" class="btn next-btn notes-edit-btn" onclick="notesEdit()">${uiIcon('pencil')} ${notesEsc(t('notes_edit'))}</button>
        </div>
        <h3 class="notes-view-title">${notesEsc(notesTitleOf(n))}</h3>
        <div class="notes-view-meta">
            ${n.lang && typeof learnFlags === 'function' ? `<span class="notes-card-flag">${learnFlags(n.lang)} ${notesEsc(t('dict_lang_' + n.lang))}</span>` : ''}
            ${cat ? `<button type="button" class="notes-card-folder" onclick="notesSetFilter('folder','${cat.id}')">${uiIcon('folder')}${notesEsc(notesFolderName(cat.id, cats))}</button>` : ''}
            ${tags}
        </div>
        ${notesSourceHtml(n)}
        <div class="notes-view-text" onclick="if(!getSelection().toString())notesEdit()">${notesRender(n.text) || `<p class="notes-muted">${notesEsc(t('notes_body_empty'))}</p>`}</div>
        ${pairs.length ? `<div class="notes-cards-box">${uiIcon('cards')} ${notesEsc(t('notes_cards_n', { n: pairs.length }))}</div>` : ''}
        <div class="notes-item-attachments" data-note-id="${n.id}"></div>
        <div class="notes-view-foot">
            <label class="btn back-btn notes-attach-btn">${uiIcon('clip')} ${notesEsc(t('notes_attach'))}<input type="file" multiple onchange="handleAddAttachmentToExisting(${n.id}, this)"></label>
            <span class="notes-muted">${notesEsc(t('notes_edited_on', { d: formatNoteTime(n.updatedAt) }))}</span>
        </div>
    </div>`;
}

function notesEditorHtml(n) {
    const folderOpts = `<option value="">${notesEsc(t('notes_cat_none'))}</option>` + notesFolderTree().map(({ c, depth }) =>
        `<option value="${c.id}"${c.id === n.category ? ' selected' : ''}>${'　'.repeat(depth)}${notesEsc(c.name)}</option>`).join('');
    const langs = typeof LEARN_LANGS !== 'undefined' ? LEARN_LANGS : [];
    const langOpts = `<option value="">${notesEsc(t('notes_lang_none'))}</option>` + langs.map(l =>
        `<option value="${l}"${l === n.lang ? ' selected' : ''}>${notesEsc(t('dict_lang_' + l))}</option>`).join('');
    const tagList = notesAllTags().map(x => `<option value="${notesEsc(x.tag)}">`).join('');
    const tool = (kind, label, inner) => `<button type="button" class="notes-tool" onmousedown="event.preventDefault()" onclick="notesFormat('${kind}')" title="${notesEsc(label)}" aria-label="${notesEsc(label)}">${inner}</button>`;
    return `<div class="notes-view notes-editor">
        <div class="notes-view-bar">
            <button type="button" class="btn next-btn" onclick="notesDoneEditing()">${notesEsc(t('notes_done'))}</button>
            <span class="notes-ed-status" id="notes-ed-status">${notesEsc(t('notes_autosave'))}</span>
            <span class="notes-grow"></span>
            <button type="button" class="notes-icon-btn${n.star ? ' on' : ''}" onclick="notesToggle('star')" title="${notesEsc(t('notes_f_star'))}" aria-label="${notesEsc(t('notes_f_star'))}" aria-pressed="${n.star}">${uiIcon('star')}</button>
            <button type="button" class="notes-icon-btn" onclick="notesTrash(${n.id})" title="${notesEsc(t('notes_delete'))}" aria-label="${notesEsc(t('notes_delete'))}">${uiIcon('trash')}</button>
        </div>
        <input type="text" id="notes-ed-title" class="notes-ed-title" maxlength="80" value="${notesEsc(n.title)}" placeholder="${notesEsc(t('notes_title_ph'))}" aria-label="${notesEsc(t('notes_title_ph'))}" oninput="notesQueueSave()">
        <div class="notes-ed-fields">
            <label class="notes-field">${uiIcon('folder')}<select class="notes-input" onchange="notesSetFolder(this.value)" aria-label="${notesEsc(t('notes_folders'))}">${folderOpts}</select></label>
            <label class="notes-field">${uiIcon('globe')}<select class="notes-input" onchange="notesSetLang(this.value)" aria-label="${notesEsc(t('notes_lang'))}">${langOpts}</select></label>
            <div class="notes-field notes-field-tags">${uiIcon('tag')}<span id="notes-ed-tags" class="notes-ed-tags"></span>
                <input type="text" class="notes-tag-input" list="notes-tag-list" maxlength="20" placeholder="${notesEsc(t('notes_tag_ph'))}" aria-label="${notesEsc(t('notes_tags'))}" onkeydown="notesTagKey(event, this)" onchange="notesAddTag(this)">
                <datalist id="notes-tag-list">${tagList}</datalist></div>
        </div>
        <div class="notes-tools" role="toolbar">
            ${tool('bold', t('notes_tool_bold'), '<b>B</b>')}
            ${tool('head', t('notes_tool_head'), '<b>H</b>')}
            ${tool('list', t('notes_tool_list'), '• ' + notesEsc(t('notes_tool_list')))}
            ${tool('mark', t('notes_tool_mark'), `<span class="notes-tool-mark">${notesEsc(t('notes_tool_mark'))}</span>`)}
            ${tool('card', t('notes_tool_card'), uiIcon('cards') + notesEsc(t('notes_tool_card')))}
            <label class="notes-tool" title="${notesEsc(t('notes_attach'))}" aria-label="${notesEsc(t('notes_attach'))}">${uiIcon('clip')}<input type="file" multiple onchange="handleAddAttachmentToExisting(${n.id}, this)"></label>
        </div>
        <textarea id="notes-ed-text" class="notes-ed-text" placeholder="${notesEsc(t('notes_body_ph'))}" aria-label="${notesEsc(t('notes_body_ph'))}" oninput="notesQueueSave(); notesGrow(this)"></textarea>
        <p class="notes-ed-help">${notesEsc(t('notes_format_help'))}</p>
        ${notesSourceHtml(n)}
        <div class="notes-item-attachments" data-note-id="${n.id}"></div>
    </div>`;
}

function notesGrow(el) {
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 200) + 'px';
}

/* ----- the page ----- */

function notesMenuHtml() {
    return `<div class="notes-menu-wrap" id="notes-menu-wrap">
        <button type="button" class="notes-icon-btn" onclick="notesToggleMenu()" aria-haspopup="true" aria-expanded="false" title="${notesEsc(t('notes_more'))}" aria-label="${notesEsc(t('notes_more'))}">${uiIcon('dots')}</button>
        <div class="notes-menu" id="notes-menu" role="menu">
            <button type="button" role="menuitem" onclick="notesCloseMenu(); notesSetFilter('folders')">${uiIcon('folder')} ${notesEsc(t('notes_folders_manage'))}</button>
            <button type="button" role="menuitem" onclick="notesCloseMenu(); notesSetFilter('images')">${uiIcon('photo')} ${notesEsc(t('notes_view_gallery'))}</button>
            <button type="button" role="menuitem" onclick="notesCloseMenu(); notesSetFilter('trash')">${uiIcon('trash')} ${notesEsc(t('notes_trash'))}</button>
            <button type="button" role="menuitem" onclick="exportNotesData()">${uiIcon('download')} ${notesEsc(t('notes_export'))}</button>
            <label role="menuitem">${uiIcon('upload')} ${notesEsc(t('notes_import'))}<input type="file" accept="application/json" onchange="handleImportFile(this)"></label>
            <p class="notes-menu-note">${notesEsc(t('notes_backup_hint'))}</p>
        </div>
    </div>`;
}

function notesToggleMenu() {
    const w = document.getElementById('notes-menu-wrap');
    if (!w) return;
    const open = !w.classList.contains('open');
    w.classList.toggle('open', open);
    w.querySelector('button').setAttribute('aria-expanded', open);
}

function notesCloseMenu() {
    const w = document.getElementById('notes-menu-wrap');
    if (w) { w.classList.remove('open'); w.querySelector('button').setAttribute('aria-expanded', 'false'); }
}

document.addEventListener('click', e => {
    const w = document.getElementById('notes-menu-wrap');
    if (w && w.classList.contains('open') && !w.contains(e.target)) notesCloseMenu();
});

/* the frame (side, head, search, chips) and the body under it */
function renderNotes() {
    const root = document.getElementById('notes-root');
    if (!root) return;
    notesPurgeTrash();
    if (notesOpenId != null && !notesLive().some(n => n.id === notesOpenId)) { notesOpenId = null; notesEditing = false; }
    const open = notesOpenId != null;
    root.classList.toggle('note-open', open);
    root.innerHTML = `
        <aside class="notes-side">${notesSideHtml()}</aside>
        <div class="notes-main">
            <div class="notes-head${open ? ' hide-open' : ''}">
                <h3 class="notes-h">${notesEsc(t('nav_notes'))}</h3>
                ${notesSyncHtml()}
                ${notesMenuHtml()}
            </div>
            <div class="notes-search${open ? ' hide-open' : ''}">${uiIcon('search')}
                <input type="search" id="notes-search-input" value="${notesEsc(notesSearch)}" oninput="handleNotesSearch(this.value)" placeholder="${notesEsc(t('notes_search_placeholder'))}" aria-label="${notesEsc(t('notes_search_placeholder'))}"></div>
            <div class="notes-chips${open ? ' hide-open' : ''}">${notesChipsHtml()}</div>
            <div id="notes-body"></div>
        </div>
        <button type="button" class="notes-fab${open ? ' hide-open' : ''}" onclick="notesNew()" title="${notesEsc(t('notes_new'))}" aria-label="${notesEsc(t('notes_new'))}">${uiIcon('plus')}</button>`;
    notesRenderBody();
    if (typeof mascotFillSlots === 'function') mascotFillSlots(root);
}

function notesRenderBody() {
    const body = document.getElementById('notes-body');
    if (!body) return;
    const f = notesFilter;
    if (notesOpenId != null) {
        const n = notesFind(notesOpenId);
        body.innerHTML = notesEditing ? notesEditorHtml(n) : notesReaderHtml(n);
        if (notesEditing) {
            const ta = document.getElementById('notes-ed-text');
            ta.value = n.text;
            notesGrow(ta);
            notesRenderTags();
        }
        renderNoteAttachments(n.id);
        return;
    }
    if (f.k === 'folders') { body.innerHTML = notesFoldersHtml(); return; }
    if (f.k === 'images' && !notesSearch) {
        body.innerHTML = `<div class="notes-section-title">${uiIcon('photo')} ${notesEsc(t('notes_view_gallery'))} <small>${notesEsc(t('notes_local_files'))}</small></div><div id="notes-gallery" class="notes-gallery"></div>`;
        renderGallery();
        return;
    }
    const all = notesLive();
    const notes = notesVisible();
    let head = '';
    if (f.k === 'trash') head = `<div class="notes-section-title">${uiIcon('trash')} ${notesEsc(t('notes_trash'))}</div><p class="notes-muted">${notesEsc(t('notes_trash_hint', { n: NOTES_TRASH_DAYS }))}</p>`;
    else if (f.k === 'folder') head = `<div class="notes-section-title"><span class="notes-dot" style="background:${categoryColor(notesFolders().find(c => c.id === f.v) || { id: f.v })}"></span> ${notesEsc(notesFolderName(f.v))}</div>`;
    else if (f.k === 'tag') head = `<div class="notes-section-title"><span class="notes-hash">#</span>${notesEsc(f.v)}</div>`;
    if (!all.length && f.k !== 'trash' && !notesSearch) { body.innerHTML = notesEmptyHtml(); if (typeof mascotFillSlots === 'function') mascotFillSlots(body); return; }
    if (!notes.length) {
        const key = notesSearch ? 'notes_empty_search' : f.k === 'trash' ? 'notes_trash_empty' : f.k === 'star' ? 'notes_star_empty' : 'notes_empty_filter';
        body.innerHTML = head + `<p class="notes-muted notes-center">${notesEsc(t(key))}</p>`;
        return;
    }
    const cats = notesFolders();
    body.innerHTML = head + `<div class="notes-cards">${notes.map(n => notesCardHtml(n, cats)).join('')}</div>`;
    notesLoadCounts(notes);
}

/* attachment counts for the cards, then redraw the cards once if any changed */
async function notesLoadCounts(notes) {
    let atts = [];
    try { atts = await idbGetAllAttachments(); } catch { return; }
    const counts = {};
    atts.forEach(a => { counts[a.noteId] = (counts[a.noteId] || 0) + 1; });
    const changed = notes.some(n => (counts[n.id] || 0) !== (notesAttachCounts[n.id] || 0));
    notesAttachCounts = counts;
    if (changed && notesOpenId == null) {
        const box = document.querySelector('#notes-body .notes-cards');
        if (box) box.innerHTML = notes.map(n => notesCardHtml(n, notesFolders())).join('');
    }
}

/* ===== Saving from the other pages (＋筆記) =====
   notesAddFrom({ kind, ref, label, title, text, lang }): the note saved from that place
   before gets the new lines added (once), else a new note is made — starred for review,
   in the folder used last, with src so it can lead back (notesOpenSource). kind:
   grammar (ref "set|point"), reading ("set|passage"), listening ("level|set"), dict
   ("lang"), words ("word set"). */
function notesLastFolder() {
    let id = '';
    try { id = localStorage.getItem('notes_last_folder') || ''; } catch {}
    return notesFolders().some(c => c.id === id) ? id : '';
}

function notesAddFrom(o) {
    const all = getNotes();
    const now = notesNow();
    const text = String(o.text || '').trim();
    let n = notesLive(all).find(x => x.src && x.src.kind === o.kind && x.src.ref === o.ref);
    if (n) {
        const have = n.text.split('\n').map(l => l.trim());
        const add = text.split('\n').filter(l => l.trim() && !have.includes(l.trim()));
        if (add.length) n.text = n.text.replace(/\s+$/, '') + '\n' + add.join('\n');
        n.updatedAt = now;
    } else {
        n = {
            id: Date.now(), title: o.title || '', text, category: notesLastFolder(), tags: [],
            lang: o.lang || '', pinned: false, star: true,
            src: { kind: o.kind, ref: o.ref, label: o.label || '', lang: o.lang || '' }, createdAt: now, updatedAt: now
        };
        all.unshift(n);
    }
    saveNotesData(all);
    notesToast(t('notes_added', { t: notesTitleOf(n) }), n.id);
    return n.id;
}

/* a toast with an 打開 button (the site's share toast can't be clicked) */
function notesToast(msg, id) {
    let el = document.getElementById('notes-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'notes-toast';
        el.className = 'notes-toast';
        el.setAttribute('role', 'status');
        document.body.appendChild(el);
    }
    el.innerHTML = `<span>${notesEsc(msg)}</span><button type="button" onclick="notesToastOpen(${id})">${notesEsc(t('notes_open'))}</button>`;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 4000);
}

function notesToastOpen(id) {
    const el = document.getElementById('notes-toast');
    if (el) el.classList.remove('show');
    notesFilter = { k: 'all' };
    notesSearch = '';
    switchPage('notes');
    notesOpen(id);
}

/* the learning language of a word set (js/quiz.js codes: jp, jlpt_n5, tp_ko_food …) */
function notesLangOfSet(id) {
    const tests = [['ja', 'isJapaneseQuizLang'], ['ko', 'isKoreanQuizLang'], ['zh', 'isChineseQuizLang'], ['en', 'isEnglishQuizLang'],
        ['fr', 'isFrenchQuizLang'], ['ru', 'isRussianQuizLang'], ['es', 'isSpanishQuizLang'], ['de', 'isGermanQuizLang']];
    const hit = tests.find(([, f]) => typeof window[f] === 'function' && window[f](id || ''));
    return hit ? hit[0] : '';
}

/* a word as a word-card line: "word（reading） — meaning" */
function notesWordLine(word, reading, meaning) {
    const w = String(word || '').trim();
    const r = String(reading || '').trim();
    const m = String(meaning || '').replace(/\s*\n\s*/g, '；').trim();
    return (r && r !== w ? `${w}（${r}）` : w) + (m ? ' — ' + m : '');
}

/* words from the quiz pages, one note per word set */
function notesAddWord(setId, word, reading, meaning) {
    const name = typeof wordSetName === 'function' ? wordSetName(setId) : setId;
    notesAddFrom({
        kind: 'words', ref: setId, label: name, title: t('notes_src_words_title', { s: name }),
        text: notesWordLine(word, reading, meaning), lang: notesLangOfSet(setId)
    });
}

/* "回到 …": open the page a note was saved from (another learning language switches the header too) */
async function notesOpenSource(src) {
    const [a, b] = String(src.ref || '').split('|');
    if (src.lang && typeof learnLang === 'function' && learnLang() !== src.lang && typeof setLearnLang === 'function') setLearnLang(src.lang);
    if (src.kind === 'grammar') {
        grammarSetId = a;
        switchPage('grammar');
        if (!(await grammarLoad())) return;
        const set = grammarSets[grammarSetId];
        const i = set ? set.points.findIndex(p => p.id === b) : -1;
        grammarGo(i >= 0 ? 'point' : 'list', Math.max(0, i));
    } else if (src.kind === 'reading') {
        readingSetId = a;
        switchPage('reading');
        if (!(await readingLoad())) return;
        const set = readingSets[readingSetId];
        const i = set ? set.passages.findIndex(p => p.id === b) : -1;
        if (i >= 0) readingGo('read', i);
    } else if (src.kind === 'listening') {
        switchPage('listening');
        if (typeof listeningPickLevel === 'function') listeningPickLevel(a);
    } else if (src.kind === 'dict') {
        if (typeof setDictLang === 'function') setDictLang(a);
        switchPage('dict');
    } else if (src.kind === 'words') {
        switchPage('quiz');
        if (typeof selectWordSet === 'function') selectWordSet(a);
    }
}
