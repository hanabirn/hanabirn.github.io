/* ===== Ambient neon particle background =====
   Replaces the old season-switching particle system with a single
   always-on drifting particle canvas (ported from the Bolt.new
   reference design). The existing sakura petals (css/sakura.css)
   already cover the "falling cherry blossoms" look, so this only
   adds the slow-drifting neon dot layer behind them. */
(function () {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    let W, H;

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const COLORS = [
        'rgba(244,114,182,',  // neon pink
        'rgba(192,132,252,',  // violet
        'rgba(251,182,206,',  // sakura
        'rgba(168,85,247,',   // purple
    ];

    function makeParticle() {
        return {
            x: Math.random() * W,
            y: Math.random() * H,
            r: Math.random() * 2.2 + 0.4,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            a: Math.random() * 0.55 + 0.15,
            da: (Math.random() - 0.5) * 0.004,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
        };
    }

    // Fewer particles on phones — same full-viewport canvas is proportionally
    // more expensive to redraw 60x/sec on weaker mobile GPUs.
    const COUNT = window.innerWidth <= 768 ? 45 : 110;
    const particles = Array.from({ length: COUNT }, makeParticle);

    // The canvas redraws continuously behind several backdrop-filter glass
    // cards, so every visible card recomputes its blur every frame just from
    // this animating — pausing the redraw while the user is actively
    // scrolling removes that cost exactly when it competes with scroll
    // compositing, without changing how anything looks at rest.
    let scrolling = false;
    let scrollTimer = null;
    window.addEventListener('scroll', () => {
        scrolling = true;
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => { scrolling = false; }, 200);
    }, { passive: true });

    function draw() {
        if (!scrolling) {
            ctx.clearRect(0, 0, W, H);
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.a += p.da;
                if (p.a <= 0.1 || p.a >= 0.7) p.da *= -1;
                if (p.x < 0) p.x = W;
                if (p.x > W) p.x = 0;
                if (p.y < 0) p.y = H;
                if (p.y > H) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.color + p.a + ')';
                ctx.fill();
            }
        }
        requestAnimationFrame(draw);
    }
    draw();
})();
