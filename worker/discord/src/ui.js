/* Small helpers for Discord message components. */

export const COLOR = 0xC8432B;           // the site's vermilion
export const SITE_URL = 'https://hanabirn.xyz/';

/* style: 1 primary, 2 secondary, 3 success, 4 danger */
export function button(customId, label, style = 2, disabled = false) {
    const text = String(label || '…');
    return { type: 2, style, custom_id: customId, label: text.length > 80 ? text.slice(0, 79) + '…' : text, disabled };
}

export function linkButton(url, label) {
    return { type: 2, style: 5, url, label };
}

export function row(components) {
    return { type: 1, components };
}

export function cut(text, max) {
    const s = String(text || '');
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
