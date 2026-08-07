/* ===== Reading Ambiance parallax =====
   Cheap cursor-driven parallax for the warm reading-glow background
   layer (css/reading-ambiance.css) — desktop/mouse only, skipped
   entirely for touch devices and prefers-reduced-motion, since it's
   a subtle depth cue, not a feature anyone interacts with directly. */
(function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    let raf = null;
    let targetX = 0, targetY = 0;

    window.addEventListener('mousemove', (e) => {
        targetX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetY = (e.clientY / window.innerHeight - 0.5) * 2;
        if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });

    function apply() {
        document.documentElement.style.setProperty('--parallax-x', targetX.toFixed(3));
        document.documentElement.style.setProperty('--parallax-y', targetY.toFixed(3));
        raf = null;
    }
})();
