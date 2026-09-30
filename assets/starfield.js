// Seeded starfield: drawn once to an offscreen canvas, composited with CSS.
// Same seed → same sky. Not redrawn every frame.
(function () {
    'use strict';

    const SEED = 20260930;

    function mulberry32(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    function paint(canvas, w, h) {
        const ctx = canvas.getContext('2d');
        canvas.width = w;
        canvas.height = h;
        ctx.fillStyle = '#07090f';
        ctx.fillRect(0, 0, w, h);
        const rand = mulberry32(SEED);
        const n = Math.floor((w * h) / 9000);
        for (let i = 0; i < n; i++) {
            const x = rand() * w;
            const y = rand() * h;
            const r = 0.4 + rand() * 1.4;
            const a = 0.25 + rand() * 0.65;
            const warm = rand() > 0.82;
            ctx.fillStyle = warm
                ? `rgba(232,160,76,${a})`
                : `rgba(226,232,240,${a})`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function mount() {
        const host = document.querySelector('.hero-section');
        if (!host) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }
        host.style.position = host.style.position || 'relative';
        const el = document.createElement('canvas');
        el.id = 'visiq-starfield';
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = [
            'position:absolute', 'inset:0', 'width:100%', 'height:100%',
            'pointer-events:none', 'z-index:0', 'opacity:0.55',
            'transform:translate3d(0,0,0)',
        ].join(';');
        host.prepend(el);
        const content = host.querySelector('.hero-content');
        if (content) content.style.position = 'relative';

        const draw = () => paint(el, Math.max(320, host.clientWidth), Math.max(200, host.clientHeight));
        draw();
        window.addEventListener('resize', draw);

        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (!reduce.matches) {
            let mx = 0, my = 0;
            window.addEventListener('pointermove', (e) => {
                mx = (e.clientX / window.innerWidth - 0.5) * 12;
                my = (e.clientY / window.innerHeight - 0.5) * 8;
                el.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
            }, { passive: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();
