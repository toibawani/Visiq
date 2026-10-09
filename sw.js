/* VISIQ service worker — app-shell caching + offline fallback.
 * Strategy:
 *   - install: precache the app shell (index, css, local scripts, fonts, icons)
 *   - activate: drop old caches
 *   - fetch (GET, same-origin):
 *       navigation -> network-first, fall back to cached index.html (offline)
 *       asset      -> cache-first, fill from network and cache for next time
 *   - cross-origin GETs (e.g. p5.js CDN): cache-first, network fallback
 */
'use strict';

const VERSION = 'v1';
const SHELL_CACHE = `visiq-shell-${VERSION}`;
const RUNTIME_CACHE = `visiq-runtime-${VERSION}`;

// The app shell — keep in sync with the <script>/<link> list in index.html.
const SHELL_ASSETS = [
    './',
    './index.html',
    './style.css',
    './manifest.webmanifest',
    './gallery.js',
    './assets/config.js',
    './assets/simulations-data.js',
    './assets/auth.js',
    './assets/advanced-search.js',
    './assets/sim-details.js',
    './assets/sim-timer.js',
    './assets/theme-toggle.js',
    './assets/stats-tracker.js',
    './assets/card-feedback.js',
    './assets/favorites-filter.js',
    './assets/sorting-system.js',
    './assets/keyboard.js',
    './assets/sim-base.js',
    './assets/integrators.js',
    './assets/visual-kit.js',
    './assets/instrument-layer.js',
    './assets/error-boundary.js',
    './assets/visiq-audio.js',
    './assets/starfield.js',
    './assets/fonts/fraunces-latin-200-normal.woff2',
    './assets/fonts/fraunces-latin-800-normal.woff2',
    './assets/fonts/ibm-plex-sans-latin-400-normal.woff2',
    './assets/fonts/ibm-plex-sans-latin-600-normal.woff2',
    './assets/fonts/jetbrains-mono-latin-400-normal.woff2',
    './assets/fonts/jetbrains-mono-latin-600-normal.woff2',
    './assets/favicon.svg',
    './assets/favicon-32.png',
    './assets/apple-touch-icon.png',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './assets/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(SHELL_CACHE)
            // addAll fails the whole install if any single fetch fails; add
            // individually so one missing asset can't brick installation.
            .then((cache) =>
                Promise.all(
                    SHELL_ASSETS.map((url) =>
                        cache.add(new Request(url, { cache: 'reload' })).catch(() => {}),
                    ),
                ),
            )
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
                        .map((k) => caches.delete(k)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // App navigations: try network, fall back to the cached shell when offline.
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(SHELL_CACHE).then((c) => c.put('./index.html', copy));
                    return res;
                })
                .catch(() =>
                    caches
                        .match('./index.html')
                        .then((cached) => cached || caches.match('./')),
                ),
        );
        return;
    }

    // Same-origin assets: cache-first.
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(req).then((cached) => {
                if (cached) return cached;
                return fetch(req)
                    .then((res) => {
                        if (res && res.status === 200 && res.type === 'basic') {
                            const copy = res.clone();
                            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
                        }
                        return res;
                    })
                    .catch(() => cached);
            }),
        );
        return;
    }

    // Cross-origin (p5.js CDN): cache-first, then network.
    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;
            return fetch(req)
                .then((res) => {
                    if (res && res.status === 200) {
                        const copy = res.clone();
                        caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
                    }
                    return res;
                })
                .catch(() => cached);
        }),
    );
});
