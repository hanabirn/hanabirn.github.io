/* ===================== 小花火 (the mascot) =====================
   The owner's drawing, split by tools/split_mascot.py into stacked layers in
   images/mascot/: body, extra blush (only shown on the shy face), eyes open /
   closed, mouth smiling / closed. Two framings:
   'full' (the whole figure) and 'bust' (the head in a round frame, for spots of
   72px and smaller). Placeholders in the markup are <span class="mascot-slot"
   data-mascot="full|bust"></span>; scripts insert mascotHtml(kind) themselves.

   Every mascot on the page breathes (CSS), blinks every 2.5–6 s on its own clock,
   and can talk (mascotTalk: the mouth flaps) or hop (mascotHop). Faces for the
   poke reactions (js/rails.js) are classes on .mascot: mc-happy (eyes closed in a
   smile), mc-shy (redder cheeks), mc-angry (mouth shut, shaking). */

const MASCOT_PARTS = ['body', 'blush', 'eyes_open', 'eyes_closed', 'mouth_smile', 'mouth_closed'];

function mascotHtml(kind) {
    const imgs = MASCOT_PARTS.map(p => `<img class="mc-${p}" src="images/mascot/${p}.webp" alt="" draggable="false" decoding="async">`).join('');
    return `<span class="mascot mascot-${kind === 'bust' ? 'bust' : 'full'}" aria-hidden="true"><span class="mc-fig"><span class="mc-rig">${imgs}</span></span></span>`;
}

function mascotFillSlots(root) {
    (root || document).querySelectorAll('.mascot-slot:not(.filled)').forEach(el => {
        el.innerHTML = mascotHtml(el.dataset.mascot);
        el.classList.add('filled');
    });
}

/* the .mascot inside el (or el itself) */
function mascotOf(el) {
    if (!el) return null;
    return el.classList && el.classList.contains('mascot') ? el : el.querySelector('.mascot');
}

function mascotBlink(el) {
    el.classList.add('mc-blink');
    setTimeout(() => el.classList.remove('mc-blink'), 130);
}

/* Mouth flapping for ms milliseconds (the AI's answer, a tour step). */
function mascotTalk(el, ms) {
    const m = mascotOf(el);
    if (!m) return;
    clearTimeout(m._talk);
    const end = Date.now() + Math.min(ms, 4000);
    (function flap() {
        if (Date.now() > end || !m.isConnected) { m.classList.remove('mc-shut'); return; }
        m.classList.toggle('mc-shut');
        m._talk = setTimeout(flap, 110 + Math.random() * 90);
    })();
}

function mascotHop(el) {
    const m = mascotOf(el);
    if (!m) return;
    m.classList.remove('mc-hop');
    void m.offsetWidth;
    m.classList.add('mc-hop');
    m.addEventListener('animationend', () => m.classList.remove('mc-hop'), { once: true });
}

/* One clock for all of them: each mascot keeps its own next-blink time, and now and
   then blinks twice. Nothing runs while the tab is hidden. */
setInterval(() => {
    if (document.hidden) return;
    const now = Date.now();
    document.querySelectorAll('.mascot').forEach(el => {
        if (!el._nextBlink) { el._nextBlink = now + 1000 + Math.random() * 4000; return; }
        if (now < el._nextBlink) return;
        mascotBlink(el);
        if (Math.random() < 0.2) setTimeout(() => mascotBlink(el), 260);
        el._nextBlink = now + 2500 + Math.random() * 3500;
    });
}, 250);

mascotFillSlots();
document.addEventListener('DOMContentLoaded', () => mascotFillSlots());
