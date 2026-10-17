/* Small helpers for Discord message components. */

/* The embed's left bar is the one colour Discord lets a bot set (2026-10-17, owner's
   pick): a question is ink grey, a right answer green, a wrong one red; the site's
   vermilion is kept for results, help and the dictionary. */
export const COLOR = 0xC8432B;           // the site's vermilion
export const NEUTRAL = 0x8A7F72;         // a question still open
export const GREEN = 0x3A8F5C;           // answered right
export const RED = 0xD83C3E;             // answered wrong
export const SITE_URL = 'https://hanabirn.xyz/';

/* style: 1 primary, 2 secondary, 3 success, 4 danger */
export function button(customId, label, style = 2, disabled = false) {
    const text = String(label || '…');
    return { type: 2, style, custom_id: customId, label: text.length > 80 ? text.slice(0, 79) + '…' : text, disabled };
}

export function linkButton(url, label) {
    return { type: 2, style: 5, url, label };
}

/* a drop-down (string select): options [{label, value, description?, default?}], 25 at most */
export function select(customId, placeholder, options) {
    return { type: 3, custom_id: customId, placeholder: cut(placeholder, 150),
        options: options.slice(0, 25).map(o => ({ ...o, label: cut(o.label, 100), ...(o.description ? { description: cut(o.description, 100) } : {}) })) };
}

export function row(components) {
    return { type: 1, components };
}

export function cut(text, max) {
    const s = String(text || '');
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/* 🟩🟥⬜…: one square per question — right, wrong, not answered yet */
export function progressBar(results, n) {
    return Array.from({ length: n }, (_, i) => (i >= results.length ? '⬜' : results[i] ? '🟩' : '🟥')).join('');
}

/* Options too long for a button (a meaning, a phrase) are written in the card as
   A / B / C / D and the buttons carry the letter; short ones stay on the buttons. */
export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
export const needLetters = labels => labels.some(l => String(l).length > 10);
