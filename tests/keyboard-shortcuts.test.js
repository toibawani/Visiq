import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

function loadKeyboardShortcuts() {
    const src = readFileSync(join(ROOT, 'assets/keyboard-shortcuts.js'), 'utf8');
    // The class uses window/document only inside methods; the constructor just
    // sets this.shortcuts and calls initialize() (which adds a listener).
    // Provide a minimal DOM so construction succeeds, then return the map.
    global.document = {
        addEventListener: () => {},
        body: { classList: { contains: () => false } },
    };
    global.window = {};
    const factory = new Function(
        'document',
        'window',
        src.replace(
            /if \(document\.readyState === 'loading'\)[\s\S]*\n\} else \{\s*window\.keyboardShortcuts = new KeyboardShortcuts\(\);\s*\}/,
            ''
        ) + '\nreturn KeyboardShortcuts;'
    );
    return factory(global.document, global.window);
}

describe('keyboard shortcuts mapping', () => {
    it('exposes the expected key-to-action shortcuts', () => {
        const KeyboardShortcuts = loadKeyboardShortcuts();
        const inst = new KeyboardShortcuts();
        expect(inst.shortcuts).toEqual({
            r: 'reset',
            f: 'fullscreen',
            m: 'mute',
            s: 'screenshot',
            escape: 'exit-fullscreen',
            h: 'show-help',
        });
    });

    it('maps each key to a non-empty action', () => {
        const KeyboardShortcuts = loadKeyboardShortcuts();
        const inst = new KeyboardShortcuts();
        for (const [key, action] of Object.entries(inst.shortcuts)) {
            expect(key).toMatch(/^[a-z]|escape$/);
            expect(typeof action).toBe('string');
            expect(action.length).toBeGreaterThan(0);
        }
    });

    it('includes the accessibility-critical reset and escape shortcuts', () => {
        const KeyboardShortcuts = loadKeyboardShortcuts();
        const inst = new KeyboardShortcuts();
        expect(inst.shortcuts.r).toBe('reset');
        expect(inst.shortcuts.escape).toBe('exit-fullscreen');
    });
});
