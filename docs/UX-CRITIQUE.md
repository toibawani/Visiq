# VISIQ UX Critique

**Date**: 30 October 2026
**Stage**: 1.1 - Diagnose
**Screenshots**: Not rendered (requires human check at http://localhost:8000)

---

## Ten Concrete Problems

### 1. Authentication Wall Blocks Entry
**File**: `/Users/apple/Visiq/index.html` lines 47-106
**Problem**: The site opens with a full-screen sign-in/sign-up form (`#auth-page`) that blocks all access to simulations. The main app (`#main-app`) is hidden with `display: none` until authentication. This violates the requirement that "the gallery and every sim open without a login."
**Status**: Inferred from code

### 2. Generic Card Grid Layout
**File**: `/Users/apple/Visiq/gallery.js` lines 74-76, 88-100
**Problem**: Simulations are rendered in a grid (`.category-sim-grid`) of cards (`.sim-card-featured`) with emoji icons, tag pills, and stacked controls. This is "the same shape as every sim site" and lacks a distinct point of view.
**Status**: Inferred from code

### 3. Emoji Icons Instead of Custom Icons
**File**: `/Users/apple/Visiq/assets/simulations-data.js` lines 13, 29, 45, 61, 77, 93
**Problem**: Every simulation uses emoji icons (⚛️, 🕳️, 〰️, 🔬, 🎯, 🧲) as visual identifiers. The spec explicitly bans "emoji anywhere" and requires "a custom set drawn by you on a 24px grid."
**Status**: Inferred from code

### 4. Cluttered Navbar with Too Many Controls
**File**: `/Users/apple/Visiq/index.html` lines 122-158
**Problem**: The navbar contains six buttons (Favorites, Sort, Analytics, Theme, Logout, plus the logo) plus a user name display. This is cognitive overload. The spec calls for "wordmark left; search, theme toggle, and progress on the right" - only three elements.
**Status**: Inferred from code

### 5. Generic Hero Section
**File**: `/Users/apple/Visiq/index.html` lines 166-182
**Problem**: The hero uses generic copy ("Scientific Instrumentation for Interactive Phenomena") and a generic "Explore Modules ↓" button. The spec requires "one honest sentence" and a search field with a "/" hint. The current hero is marketing fluff, not an honest statement.
**Status**: Inferred from code

### 6. Gradient and Glow Effects on Signature Card
**File**: `/Users/apple/Visiq/index.html` lines 186-194
**Problem**: The signature fluid sim card uses a linear gradient (`linear-gradient(135deg, rgba(0,229,255,0.05)...)`), cyan accent color, and a glow effect on hover (`box-shadow='0 0 20px rgba(0,229,255,0.15)'`). The spec bans "purple-to-blue or cyan-to-purple gradients, neon, glowing borders."
**Status**: Inferred from code

### 7. Sim Page Not Full-Bleed Canvas
**File**: `/Users/apple/Visiq/index.html` lines 258-287
**Problem**: The simulation view has a header bar (`.sim-header`) with back button, title, timer, and reset button. The canvas is wrapped in `.canvas-wrapper` alongside a `.controls-wrapper`. The spec requires "the canvas fills the viewport" with controls in a bottom dock. The current layout splits the viewport, making the sim not the star.
**Status**: Inferred from code

### 8. No Command Palette
**File**: Not present in codebase
**Problem**: There is no command palette triggered by Cmd/Ctrl+K. The spec requires "Cmd/Ctrl+K opens a command palette: fuzzy search across title, hook, tags and engine, arrows and Enter, Esc to close, recent items, 'surprise me'."
**Status**: Inferred from code absence

### 9. Generic "How to Use" Section
**File**: `/Users/apple/Visiq/index.html` lines 224-248
**Problem**: The "How to Use" section is a grid of four numbered cards with generic instructions ("Search or Browse", "Click to Open", "Experiment Freely", "Learn & Discover"). This is filler content. The spec requires the Index and Stage concept, not generic onboarding cards.
**Status**: Inferred from code

### 10. No Search Field with "/" Hint on Landing
**File**: `/Users/apple/Visiq/index.html` lines 197-208
**Problem**: The search field exists in a separate section below the hero, but it has no "/" hint and is not integrated into the landing's primary navigation. The spec requires "a search field with a '/' hint" in the left column of the landing at 1100px and wider.
**Status**: Inferred from code

---

## Screenshots Required (Human Check)

The following screenshots should be captured by the owner at http://localhost:8000:

1. **Landing page** at 1440px width, light theme
2. **Landing page** at 1440px width, dark theme
3. **Landing page** at 390px width, light theme
4. **Landing page** at 390px width, dark theme
5. **Gallery page** (after auth) at 1440px width, light theme
6. **Gallery page** at 1440px width, dark theme
7. **Gallery page** at 390px width, light theme
8. **Gallery page** at 390px width, dark theme
9. **2D sim page** (e.g., pendulum-chaos) at 1440px width, light theme
10. **2D sim page** at 1440px width, dark theme
11. **2D sim page** at 390px width, light theme
12. **2D sim page** at 390px width, dark theme
13. **3D sim page** (e.g., black-hole-orbit or solar-system) at 1440px width, light theme
14. **3D sim page** at 1440px width, dark theme
15. **3D sim page** at 390px width, light theme
16. **3D sim page** at 390px width, dark theme

**Note**: I cannot capture these screenshots directly. The owner must open the browser preview and take them.

---

## Summary

The current VISIQ frontend has several fundamental issues that make it feel like a template rather than a site with a point of view:

1. **Template-like card grid** with emoji icons and tag pills
2. **Authentication wall** blocking access
3. **Generic marketing copy** instead of honest, direct language
4. **Cluttered navigation** with too many controls
5. **Gradient and glow effects** that feel like default design system choices
6. **Sim page not full-bleed** - the canvas doesn't fill the viewport
7. **Missing key features** - no command palette, no "/" search hint, no Index/Stage concept

The redesign needs to address all of these issues with the Index and Stage concept, custom icons, full-bleed sim pages, and a cleaner, more opinionated design system.
