// ===== VISIQ - GLOBAL CONFIGURATION =====
// Author: toibawani
// Email: toibawani14@gmail.com
// GitHub: https://github.com/toibawani/visiq

const CONFIG = {
    // Animation settings
    animation: {
        frameRate: 60,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDuration: 0.3
    },
    
    // Color palette (dark theme)
    colors: {
        bgDark: '#0a0a0f',
        bgDarker: '#050507',
        accentPrimary: '#e8a04c',
        accentSecondary: '#ff006e',
        accentTertiary: '#00d9ff',
        textBright: '#f5f5f7',
        textMuted: '#a0a0a8',
        borderSubtle: '#1a1a23'
    },
    
    // Physics defaults
    physics: {
        gravity: 0.2,
        damping: 0.98,
        friction: 0.05,
        maxSpeed: 3,
        maxForce: 0.2
    },
    
    // Canvas sizing
    canvas: {
        minWidth: 600,
        minHeight: 400
    }
};

// Version & metadata
const VERSION = {
    major: 1,
    minor: 0,
    patch: 0,
    name: 'VISIQ',
    build: 'production',
    author: 'toibawani',
    email: 'toibawani14@gmail.com',
    repository: 'https://github.com/toibawani/visiq'
};