// Preload the 2–3 sketches this device opens most. Everything else stays lazy.
(function () {
    'use strict';

    const FALLBACK = ['pendulum-chaos', 'wave-interference', 'newton'];

    function topIds() {
        try {
            const stats = JSON.parse(localStorage.getItem('visiq-stats') || '{}');
            const counts = stats.openCounts || {};
            const ranked = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
            if (ranked.length >= 2) return ranked.slice(0, 3);
        } catch (e) {}
        return FALLBACK;
    }

    function inject() {
        topIds().forEach((id) => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'script';
            link.href = `sketches/${id}.js`;
            document.head.appendChild(link);
        });
    }

    inject();
})();
