/* ===== About-page Avatar Upload & Crop ===== */

const AVATAR_STORAGE_KEY = 'about_avatar';
const AVATAR_CANVAS_SIZE = 200;

let avatarState = null; // { img, baseScale, zoom, posX, posY }
let avatarDragging = false;
let avatarDragStartX = 0, avatarDragStartY = 0;
let avatarDragStartPosX = 0, avatarDragStartPosY = 0;

function applySavedAvatar() {
    const saved = localStorage.getItem(AVATAR_STORAGE_KEY);
    const img = document.getElementById('about-avatar-img');
    const resetBtn = document.getElementById('about-avatar-reset-btn');
    if (saved && img) img.src = saved;
    if (resetBtn) resetBtn.style.display = saved ? 'flex' : 'none';
}

function handleAvatarFileSelect(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const baseScale = Math.max(AVATAR_CANVAS_SIZE / img.naturalWidth, AVATAR_CANVAS_SIZE / img.naturalHeight);
            avatarState = { img, baseScale, zoom: 1, posX: 0, posY: 0 };
            centerAvatarImage();
            const slider = document.getElementById('avatar-zoom-slider');
            if (slider) slider.value = 100;
            openAvatarEditor();
            drawAvatarCanvas();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function centerAvatarImage() {
    if (!avatarState) return;
    const scale = avatarState.baseScale * avatarState.zoom;
    const w = avatarState.img.naturalWidth * scale;
    const h = avatarState.img.naturalHeight * scale;
    avatarState.posX = (AVATAR_CANVAS_SIZE - w) / 2;
    avatarState.posY = (AVATAR_CANVAS_SIZE - h) / 2;
}

function clampAvatarPosition() {
    if (!avatarState) return;
    const scale = avatarState.baseScale * avatarState.zoom;
    const w = avatarState.img.naturalWidth * scale;
    const h = avatarState.img.naturalHeight * scale;
    const minX = Math.min(0, AVATAR_CANVAS_SIZE - w);
    const minY = Math.min(0, AVATAR_CANVAS_SIZE - h);
    avatarState.posX = Math.min(0, Math.max(minX, avatarState.posX));
    avatarState.posY = Math.min(0, Math.max(minY, avatarState.posY));
}

function drawAvatarCanvas() {
    const canvas = document.getElementById('avatar-editor-canvas');
    if (!canvas || !avatarState) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);
    const scale = avatarState.baseScale * avatarState.zoom;
    const w = avatarState.img.naturalWidth * scale;
    const h = avatarState.img.naturalHeight * scale;
    ctx.drawImage(avatarState.img, avatarState.posX, avatarState.posY, w, h);
}

function updateAvatarZoom(value) {
    if (!avatarState) return;
    const center = AVATAR_CANVAS_SIZE / 2;
    const oldScale = avatarState.baseScale * avatarState.zoom;
    const imgX = (center - avatarState.posX) / oldScale;
    const imgY = (center - avatarState.posY) / oldScale;
    avatarState.zoom = value / 100;
    const newScale = avatarState.baseScale * avatarState.zoom;
    avatarState.posX = center - imgX * newScale;
    avatarState.posY = center - imgY * newScale;
    clampAvatarPosition();
    drawAvatarCanvas();
}

function onAvatarPointerDown(e) {
    if (!avatarState) return;
    avatarDragging = true;
    avatarDragStartX = e.clientX;
    avatarDragStartY = e.clientY;
    avatarDragStartPosX = avatarState.posX;
    avatarDragStartPosY = avatarState.posY;
    e.target.setPointerCapture(e.pointerId);
}

function onAvatarPointerMove(e) {
    if (!avatarDragging || !avatarState) return;
    avatarState.posX = avatarDragStartPosX + (e.clientX - avatarDragStartX);
    avatarState.posY = avatarDragStartPosY + (e.clientY - avatarDragStartY);
    clampAvatarPosition();
    drawAvatarCanvas();
}

function onAvatarPointerUp() {
    avatarDragging = false;
}

function openAvatarEditor() {
    const overlay = document.getElementById('avatar-editor-overlay');
    if (overlay) overlay.classList.add('show');
}

function closeAvatarEditor() {
    const overlay = document.getElementById('avatar-editor-overlay');
    if (overlay) overlay.classList.remove('show');
    avatarState = null;
}

function saveAvatarCrop() {
    const canvas = document.getElementById('avatar-editor-canvas');
    if (!canvas || !avatarState) { closeAvatarEditor(); return; }
    try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.87);
        localStorage.setItem(AVATAR_STORAGE_KEY, dataUrl);
        const img = document.getElementById('about-avatar-img');
        if (img) img.src = dataUrl;
    } catch (e) {
        console.log('Avatar save failed:', e);
    }
    applySavedAvatar();
    closeAvatarEditor();
}

function resetAvatarToDefault() {
    localStorage.removeItem(AVATAR_STORAGE_KEY);
    const img = document.getElementById('about-avatar-img');
    if (img) img.src = 'icons/web-app-manifest-512x512.png';
    applySavedAvatar();
    closeAvatarEditor();
}

document.addEventListener('DOMContentLoaded', () => {
    applySavedAvatar();
    const canvas = document.getElementById('avatar-editor-canvas');
    if (canvas) {
        canvas.addEventListener('pointerdown', onAvatarPointerDown);
        canvas.addEventListener('pointermove', onAvatarPointerMove);
        canvas.addEventListener('pointerup', onAvatarPointerUp);
        canvas.addEventListener('pointercancel', onAvatarPointerUp);
    }
});
