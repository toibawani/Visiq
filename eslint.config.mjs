import js from '@eslint/js';
import globals from 'globals';

/** @type {import("eslint").Linter.Config[]} */
export default [
  // Default ignores
  {
    ignores: ['node_modules', 'dist', 'build', '.freebuff', '.git', 'scripts/.font-src'],
  },

  // ESLint recommended ruleset
  js.configs.recommended,

  // --- Browser simulations, gallery shell and controls ---
  {
    files: [
      'assets/**/*.js',
      'gallery.js',
      'sketches/**/*.js',
      'theme-toggle.js',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // p5.js globals (loaded via CDN in index.html)
        p5: 'readonly',
        createButton: 'readonly',
        // Session/simulation systems attached to window by their scripts.
        SimBase: 'readonly',
        VisualKit: 'readonly',
        VisiqAudio: 'readonly',
        VisiqErrors: 'readonly',
        soundManager: 'readonly',
        createControlGroup: 'readonly',
        systemPrefersDark: 'readonly',
        AudioContext: 'readonly',
        VisiqSeasons: 'readonly',
        VisiqRelativity: 'readonly',
        VisiqOrbitalElements: 'readonly',
        VisiqIntegrators: 'readonly',
        SIMULATIONS: 'readonly',
        InstrumentLayer: 'readonly',
        UIPolish: 'readonly',
        statsTracker: 'readonly',
        // initSketch is assigned by gallery.js (window.initSketch)
        initSketch: 'readonly',
      },
    },
  },

  // --- Dedicated Web Workers ---
  {
    files: ['workers/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.worker },
    },
  },

  // --- Service Worker ---
  {
    files: ['sw.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.serviceworker },
    },
  },

  // --- Vitest test files (run in Node) ---
  {
    files: ['tests/**/*.test.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
];
