/* ===================================================
   VISIQ — CUSTOM ICONS (24px grid, 1.5px stroke)
   Author: Devin
   Square caps, mitered corners, accessible names
=================================================== */

const ICONS = {
    play: {
        name: 'Play',
        path: 'M5 3l14 9-14 9V3z'
    },
    pause: {
        name: 'Pause',
        path: 'M6 4h4v16H6V4zm8 0h4v16h-4V4z'
    },
    step: {
        name: 'Step forward',
        path: 'M5 5l10 7-10 7V5zm12 0v14h2V5h-2z'
    },
    reset: {
        name: 'Reset',
        path: 'M3 12a9 9 0 1 1 9 9m-9-9a9 9 0 0 1 9-9m-9 9h9'
    },
    speed: {
        name: 'Speed control',
        path: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z'
    },
    share: {
        name: 'Share',
        path: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13'
    },
    fullscreen: {
        name: 'Fullscreen',
        path: 'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3'
    },
    search: {
        name: 'Search',
        path: 'M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z'
    },
    sun: {
        name: 'Light theme',
        path: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z'
    },
    moon: {
        name: 'Dark theme',
        path: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'
    },
    progress: {
        name: 'Progress',
        path: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83'
    },
    close: {
        name: 'Close',
        path: 'M18 6L6 18M6 6l12 12'
    },
    back: {
        name: 'Back',
        path: 'M19 12H5M12 19l-7-7 7-7'
    },
    notes: {
        name: 'Notes',
        path: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8'
    },
    graph: {
        name: 'Graph',
        path: 'M3 3v18h18 M3 14l4-4 4 4 6-6 4 4'
    },
    shuffle: {
        name: 'Shuffle',
        path: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5'
    }
};

/**
 * Render an icon as an SVG string
 * @param {string} key - Icon key from ICONS object
 * @param {object} options - { class: string, ariaLabel: string }
 * @returns {string} SVG HTML string
 */
function renderIcon(key, options = {}) {
    const icon = ICONS[key];
    if (!icon) return '';

    const className = options.class || '';
    const ariaLabel = options.ariaLabel || icon.name;

    return `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="square"
            stroke-linejoin="miter"
            class="${className}"
            aria-label="${ariaLabel}"
            role="img"
        >
            <path d="${icon.path}" />
        </svg>
    `.trim();
}

/**
 * Get icon name for accessibility
 * @param {string} key - Icon key from ICONS object
 * @returns {string} Icon name
 */
function getIconName(key) {
    return ICONS[key]?.name || '';
}

// Export for use in components
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ICONS, renderIcon, getIconName };
}
