/* ===== Header title entrance animation =====
   Splits the header <h1> into one <span class="char"> per character (with
   --char-index set for CSS stagger), so css/header.css can bounce each
   character in. Hooked into js/i18n.js's applyLang() so it re-runs on
   every language switch too, since applyLang() replaces the h1's text
   each time - done by hand (not a library) so re-splitting after that
   text swap is trivial and has no caching to fight. */
function playTitleEntrance() {
    const h1 = document.querySelector('header h1');
    if (!h1) return;
    const text = h1.textContent;
    h1.innerHTML = '';
    let index = 0;
    for (const ch of text) {
        const span = document.createElement('span');
        span.className = 'char';
        span.style.setProperty('--char-index', index);
        span.textContent = ch;
        h1.appendChild(span);
        index++;
    }
}
