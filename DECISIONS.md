# VISIQ Design Decisions

## Design Brief: Aesthetic Authority (Aesthetic Bible)

- **Direction:** VISIQ is built as a **"Scientific instrument panel, after dark"** — drawing inspiration from high-precision oscilloscopes, deep-sea research vessels, and planetarium consoles, creating a dark, disciplined technical environment where fine graticules, calibrated units, and dark obsidian surfaces ensure the simulations' own particle trails and energetic emissions are the brightest, most vibrant elements on the screen.
- **Font Pairing:** Typography delivers extreme structural contrast using **Fraunces** for expressive, high-impact display titles (pairing 200 light display weights with 800 punch weights), **IBM Plex Sans** for neutral, hyper-legible technical UI copy, and **JetBrains Mono** with native tabular figures for zero-jitter telemetry, coordinate readouts, and physical equations.
- **Color Logic:** A near-black, subtly tinted obsidian chassis (`#07090e` / `#0d1117`) serves as the dominant backdrop, accented strictly by deliberate, phenomenon-derived categorical signatures (cool oscilloscope cyan for Physics, bio-luminescent emerald for Biology, reactive spectral violet/teal for Chemistry, seismic terra ochre for Geography, and phosphor starlight amber for Astronomy) with zero arbitrary purple-on-white or evenly-distributed pastel gradients.
- **Motion Logic:** Visual motion focuses on a single grand entrance choreography with staggered reveal delays upon first load, fluid cubic-bezier count-up easing for live numerical metrics, and strict zero-overhead CSS micro-transitions elsewhere, completely suppressed when `prefers-reduced-motion` is active.

### Three Chosen Fonts and Rationale
1. **Display & Headings — Fraunces:** Chosen to banish the generic "AI SaaS" look. Its 19th-century optical-size heritage gives headings intellectual weight, human intention, and dramatic contrast when used in extreme weights (200 display vs 800 bold), proving this is a tool for scientific inquiry.
2. **UI & Body Text — IBM Plex Sans:** Engineered specifically for technical clarity and IBM's scientific documentation. It features clear distinction between ambiguous glyphs (1, l, I), generous apertures, and an engineered personality that sits naturally next to instrument readouts.
3. **Telemetry, Equations & Live Readouts — JetBrains Mono:** Live scientific monitors (F=ma, temperature, velocity, framerate, wave period) require true tabular numerals across all weights so active digits never jitter or vibrate the layout.
All fonts are subset to Latin woff2, preloaded for primary weights with `font-display: swap` and size-adjusted metrics to guarantee zero layout shift. Canvas text in p5 is strictly rendered only after `document.fonts.load()` resolves.

## Visual Direction

VISIQ looks like a scientific instrument, not a portfolio site. The aesthetic is lab notebook meets oscilloscope: dark canvas panels, fine grid rules, a single warm-amber accent (#e8a04c), thin hairline borders, and every number labeled with its unit. Headings use Fraunces (a serif with optical personality) to signal that this is a place for thinking, not consuming. UI copy uses IBM Plex Sans — a humanist sans with visible construction — and all live readouts render in JetBrains Mono with tabular figures so digits never jitter. Nothing is decorative that isn't also informative: a glow on a particle scales with its energy, a colored trail encodes velocity, a pulsing border means the simulation is live.

## Font Rationale

Inter is banned because it is the default signal for "AI-generated." Fraunces draws from optically-corrected 19th-century book type and reads beautifully at display sizes without feeling retro. IBM Plex Sans was designed for technical documentation and has enough quirk (double-storey `a`, distinct `l/1`) that it reads as intentional. JetBrains Mono has true tabular figures built in at every weight — no font-variant-numeric hack needed. All fonts are self-hosted via @fontsource (woff2 subset, Latin only) with size-adjusted fallbacks so there is zero layout shift on hard reload.

## Architecture Decisions

- Sims stay in p5 instance mode forever. React wraps them through a typed `Simulation` interface (`mount(el) → () => void`). React never touches the p5 canvas DOM directly.
- New shell UI (dashboard, carousel, table, feed, registration, button library) lives under `app/src/` as a Vite React 19 + TypeScript strict + Tailwind app. Old `index.html` stays working until the new shell replaces it page by page.
- Tailwind uses `darkMode: 'class'`. CSS custom properties handle anything Tailwind tokens don't reach (p5 canvas reads `getComputedStyle` on the host element at setup and on `themechange`).
- A blocking inline script in `<head>` resolves light/dark/system from localStorage before hydration, eliminating flash of wrong theme entirely.
- Sims with >2000 elements use typed arrays (Float32Array for positions/velocities) and a hand-rolled update loop to stay at 60fps under 4× CPU throttle. WEBGL mode for shaders on the particle-heavy ones.

## What Was Skipped and Why

- Registration backend: stubbed. A real implementation needs an auth provider (Firebase Auth / Supabase), server-side password hashing (bcrypt, never client-side), email verification, rate limiting on the submit endpoint, and a CSRF token. None of that exists here.
- Cross-user analytics: the dashboard shows per-device stats from localStorage only. Aggregating across users requires a database.
- Audio: sonification is off by default and the WebAudio context is created lazily on first user gesture to pass autoplay policy on all browsers.
- WEBGL sim reworks are done on the highest-traffic sims first (newton, wave-interference, black-hole, pendulum-chaos, magnetic-field, quantum-tunnel, gas-pressure, galaxy-collision, doppler, murmuration). The remaining 19 sims keep Canvas 2D with Float32Array optimizations.

## Honest Uncertainty

The ΛCDM scale factor formula in `cosmic-expansion.js` uses a simplified `sinh` approximation valid for a flat universe with Ω_m + Ω_Λ = 1. It is accurate to ~5% for redshifts below 3. The Michaelis-Menten constants in `enzyme-kinetics.js` are plausible but not tied to a specific enzyme — they teach the shape of the curve, not a measurement.
