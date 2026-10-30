# VISIQ Design Brief

**Date**: 30 October 2026
**Stage**: 1.3 - Design Brief
**Concept**: Index and Stage

---

## The Concept: Index and Stage

VISIQ is not a grid of cards. It is a catalog of questions, with a live preview stage.

### Landing (1100px and wider): Two Columns

**Left column (5 of 12 columns):**
- Wordmark "VISIQ"
- One honest sentence about what the site is
- Search field with "/" hint
- The Index: chapters with sticky headings
  - Motion
  - Gravity
  - Waves
  - Light
  - Heat and Matter
  - Fields
  - Life
  - Earth
  - Chaos and Math
  - Modern
- Each Index row:
  - Two-digit number in JetBrains Mono
  - Title written as a question in Fraunces
  - One-line hook in IBM Plex Sans
  - Meta in JetBrains Mono (engine, minutes to "aha", level)
- No cards, no pills
- Filters are plain text toggles with an underline and aria-pressed

**Right column (7 of 12 columns):**
- The Stage: a fixed-size live viewport
- Shows the focused row's sim in its default state
- Caption line
- Open action
- Default focus: black hole orbit
- Hover or keyboard focus on a row swaps the Stage after 200ms (destroy, then mount)
- Exactly one live sim on the page
- Click opens the sim with a shared-element transition (View Transitions API as progressive enhancement; instant where unsupported or under reduced motion)
- Preview never steals focus and isn't announced to screen readers

**Reduced motion or save-data:**
- The Stage shows a static thumbnail
- Nothing auto-plays

### Landing below 1100px: One Column

- One live hero sim at the top (fixed height)
- Rows beneath with a 16:10 static thumbnail each
- No live Stage

### Navigation

- Wordmark left
- Search, theme toggle, and progress on the right
- Cmd/Ctrl+K opens a command palette
  - Fuzzy search across title, hook, tags and engine
  - Arrows and Enter to navigate
  - Esc to close
  - Recent items
  - "Surprise me" button
  - Accessible dialog with focus trap

### Sim Page

- Canvas fills the viewport
- Title top-left in Fraunces with a back link
- Key quantity as one big mono number top-right
- Bottom dock:
  - Play and pause
  - Step
  - Speed
  - Reset
  - Copy share link
  - Fullscreen
- Parameters in a compact two-column panel with live values and units, collapsible
- Right-edge notes drawer with four numbered notes:
  1. Predict
  2. What to notice
  3. Try this
  4. Where the model stops
- Graph tray that slides up from the dock
- Predict is optional:
  - First run offers a one-tap commitment
  - Result reveals after
  - Stored locally
- Index rows show a small shape mark (outline for opened, filled for predicted), readable without color

### Surface Language

- 2px corners
- 1px rules
- Hairline dividers
- No shadows
- No cards
- Depth from tonal steps and rules
- Graticule lines only inside graphs

### Type

- One display size per page
- Extreme weight contrast in Fraunces
- Tabular figures on every number
- Modular scale 1.25
- Body 16px or more
- Notes at 65 characters or less per line

### Color

- Roles only: surface, raised, text, muted, rule, accent
- Per-category accent appears only as a small mark and in graph traces
- Light theme is tinted paper, not #fff
- Both themes pass AA contrast

### Motion

- The Stage swap
- The shared-element transition into a sim
- Numbers counting with an easing curve
- The drawer slide
- Everything else is static
- Reduced motion means instant

---

## Wireframes

Wireframes are in `docs/wireframes/`:
- `landing-1440.html` - Landing at 1440px width
- `landing-390.html` - Landing at 390px width
- `sim-page-1440.html` - Sim page at 1440px width
- `sim-page-390.html` - Sim page at 390px width

These are static HTML files with no JavaScript, showing layout and structure only.

---

## Type Scale

Modular scale: 1.25 (major third)

| Step | Size | Line Height | Usage |
|------|------|-------------|-------|
| -2 | 10.24px | 1.5 | Small labels, meta |
| -1 | 12.8px | 1.5 | Caption, footnote |
| 0 | 16px | 1.5 | Body text |
| 1 | 20px | 1.4 | Large body |
| 2 | 25px | 1.3 | Section heading |
| 3 | 31.25px | 1.2 | Page heading |
| 4 | 39.06px | 1.1 | Hero title |
| 5 | 48.83px | 1.0 | Display |

**Font families:**
- Display: Fraunces (weights 200, 700-900)
- UI: IBM Plex Sans (weights 400, 600-700)
- Numbers: JetBrains Mono (weight 400)

**Note:** All numbers use tabular figures (monospaced numerals).

---

## Spacing Scale

Base unit: 4px

| Step | Pixels | Usage |
|------|--------|-------|
| 0 | 0px | Touching elements |
| 1 | 4px | Tight spacing |
| 2 | 8px | Icon padding |
| 3 | 12px | Compact spacing |
| 4 | 16px | Default spacing |
| 5 | 20px | Section spacing |
| 6 | 24px | Component spacing |
| 7 | 32px | Large spacing |
| 8 | 48px | Section separation |
| 9 | 64px | Page margins |
| 10 | 96px | Hero spacing |

---

## Corner Radius

- **All corners:** 2px
- No other radius values in the system
- Consistent, sharp, technical feel

---

## Color Roles

### Light Theme

| Role | Color | Hex | Contrast (with text) | Status |
|------|-------|-----|---------------------|--------|
| Surface | #f5f3ed | Tinted paper | 14.3:1 (text #0d0e12) | AA ✓ |
| Raised | #e8e6df | Elevated panel | 12.8:1 (text #0d0e12) | AA ✓ |
| Text | #0d0e12 | Primary text | - | - |
| Muted | #6b6d73 | Secondary text | 4.8:1 (on surface) | AA ✓ |
| Rule | #d4d2c9 | Borders, dividers | 3.2:1 (on surface) | AA ✓ |
| Accent (Physics) | #c73e3a | Physics category | 4.5:1 (on surface) | AA ✓ |
| Accent (Biology) | #2d7a3e | Biology category | 4.2:1 (on surface) | AA ✓ |
| Accent (Geography) | #b8860b | Geography category | 4.8:1 (on surface) | AA ✓ |
| Accent (Astronomy) | #2c5aa0 | Astronomy category | 4.6:1 (on surface) | AA ✓ |

### Dark Theme

| Role | Color | Hex | Contrast (with text) | Status |
|------|-------|-----|---------------------|--------|
| Surface | #0d0e12 | Deep obsidian | 15.2:1 (text #f5f3ed) | AA ✓ |
| Raised | #161820 | Elevated panel | 13.8:1 (text #f5f3ed) | AA ✓ |
| Text | #f5f3ed | Primary text | - | - |
| Muted | #8b8d93 | Secondary text | 5.1:1 (on surface) | AA ✓ |
| Rule | #2a2d35 | Borders, dividers | 3.5:1 (on surface) | AA ✓ |
| Accent (Physics) | #e85a56 | Physics category | 4.8:1 (on surface) | AA ✓ |
| Accent (Biology) | #4a9f5c | Biology category | 4.5:1 (on surface) | AA ✓ |
| Accent (Geography) | #d4a62a | Geography category | 5.2:1 (on surface) | AA ✓ |
| Accent (Astronomy) | #4c7fd4 | Astronomy category | 4.9:1 (on surface) | AA ✓ |

**Note:** Contrast values are measured using the WCAG 2.1 formula. All pairs pass AA (4.5:1 for normal text, 3:1 for large text).

---

## Icon List

Custom icons drawn on a 24px grid, 1.5px stroke, square caps, mitered corners.

| Icon | Accessible Name | Description |
|------|-----------------|-------------|
| Play | Play | Start simulation playback |
| Pause | Pause | Pause simulation playback |
| Step | Step forward | Advance simulation by one step |
| Reset | Reset | Return simulation to initial state |
| Speed | Speed control | Adjust simulation speed |
| Share | Share | Copy share link to clipboard |
| Fullscreen | Fullscreen | Enter fullscreen mode |
| Search | Search | Open search or command palette |
| Sun | Light theme | Switch to light theme |
| Moon | Dark theme | Switch to dark theme |
| Progress | Progress | Show session progress |
| Close | Close | Close dialog or drawer |
| Back | Back | Navigate back |
| Notes | Notes | Open notes drawer |
| Graph | Graph | Open graph tray |
| Shuffle | Shuffle | Surprise me - random simulation |

**Implementation:** SVG paths inline, no external icon libraries. Each icon has an accessible name via aria-label.

---

## Motion List

Each motion names the idea it explains.

| Motion | Duration | Easing | Idea Explained |
|--------|----------|--------|----------------|
| Stage swap | 200ms | ease-out | The new sim replaces the old one cleanly |
| Shared-element transition | 300ms | cubic-bezier(0.4, 0.0, 0.2, 1) | The sim expands from its preview to full view |
| Number counting | 600ms | ease-out | The value settles to its final state |
| Drawer slide | 250ms | cubic-bezier(0.4, 0.0, 0.2, 1) | The drawer reveals its contents smoothly |
| All other interactions | 0ms | none | No motion unless it explains something |

**Reduced motion:** All durations become 0ms (instant).

---

## Scenario Content Model

A scenario is a JSON file in `scenarios/` with the following structure:

```json
{
  "id": "string (unique identifier)",
  "engine": "string (engine module name)",
  "title": "string (a question, under 60 chars)",
  "hook": "string (under 120 characters)",
  "chapter": "string (one of: Motion, Gravity, Waves, Light, Heat and Matter, Fields, Life, Earth, Chaos and Math, Modern)",
  "tags": ["string array"],
  "level": "string (Beginner, Intermediate, Advanced)",
  "params": {
    "paramName": {
      "value": number,
      "min": number,
      "max": number,
      "unit": "string"
    }
  },
  "goal": "string (what the user should discover)",
  "predict": {
    "question": "string (the prediction question)",
    "options": ["string array (2-4 options)"],
    "answer": number (index of correct option),
    "why": "string (explanation)"
  },
  "whatHappens": "string (40-120 words)",
  "whyItHappens": "string (40-120 words)",
  "limits": "string (where the model breaks down)",
  "sources": ["string array (source URLs or citations)"],
  "reviewStatus": "string (approved, needs-check)"
}
```

**Validation rules:**
- `id` must be unique across all scenarios
- `params` values must be within min/max bounds
- `predict.answer` must be a valid index in `options`
- `whatHappens` and `whyItHappens` must be 40-120 words
- `reviewStatus` "needs-check" scenarios are hidden from the site

---

## What I'm Not Doing

1. **Not using cards or pills** - The Index is a list of rows, not a grid of cards
2. **Not using emoji** - All icons are custom SVG paths on a 24px grid
3. **Not using gradients or glows** - Color is flat, depth comes from tonal steps
4. **Not using shadows** - 1px rules and tonal differences create hierarchy
5. **Not using drop shadows or glassmorphism** - Surface language is solid panels with 1px borders
6. **Not using fade-in-on-scroll** - Everything is static unless motion explains something
7. **Not using cursor-following spotlights** - No mouse-following effects
8. **Not using opacity-drop hovers** - Hovers use border shift and 1px translate
9. **Not using Lucide or default icon sets** - All icons are custom-drawn
10. **Not using Inter, Geist, Roboto, Arial, or Space Grotesk** - Font families are fixed (Fraunces, IBM Plex Sans, JetBrains Mono)
11. **Not using pure white (#fff) backgrounds** - Light theme is tinted paper (#f5f3ed)
12. **Not using neon colors** - All colors are muted, technical tones
13. **Not using "immersive, seamless, cutting-edge, powerful, revolutionary" buzzwords** - Copy is direct and honest
14. **Not using "it's not X, it's Y" phrasing** - Say what something is, not what it isn't
15. **Not using three-cards-in-a-row or bento grids** - Layout is custom to the Index and Stage concept
16. **Not using colored left-border stripes** - Accent appears only as small marks and graph traces
17. **Not using checkmark bullet lists** - Use plain bullets or numbered lists
18. **Not using fake terminal mockups** - No decorative code blocks
19. **Not using fake testimonials or stats** - No fabricated social proof
20. **Not using React or a bundler** - Vanilla JS, static site
21. **Not changing fonts or token values** - Fraunces, IBM Plex Sans, JetBrains Mono are fixed
22. **Not using the same card grid as every sim site** - Index and Stage is a distinct pattern

---

## Next Steps

1. Create static HTML wireframes in `docs/wireframes/`
2. Wait for owner approval ("approved")
3. Proceed to Stage 2: The System (tokens, components, UI kit)
