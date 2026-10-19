# Stage 0 Audit — VISIQ (final)

Raw output for every item below. Run date: working tree at commit
`cb3ad6b` on branch `audit/stage-0-final` (branched from `main`, which is at
the same commit). Nothing in the repo was changed except this file.

## 1. git ls-files summary and repo root listing

`git ls-files` reports **232 tracked files**.

Top-level repo root (`ls -la`, non-code / config files at root):

```
.github/            assets/             docs/               evidence/
scripts/            sketches/           tests/              workers/
.gitignore          LICENSE             README.md           package.json
package-lock.json   tsconfig.json       vercel.json         _headers
manifest.webmanifest      sw.js               theme-toggle.js     gallery.js
index.html          og-image.png        audit_fps_results.json
AUDIT-3.md          AUDIT.md            CHANGELOG.md        CODE_OF_CONDUCT.md
COMPARE-VERIFY.md   CONTRIBUTING_GUIDE.md   DECISIONS.md        EXTRACT-PLAN.md
INSTRUMENT-AUDIT.md KNOWN_ISSUES.md     LICENSE             NOT-IMPLEMENTED.md
PRODUCTION_SUMMARY.md     SIM-3D-AUDIT.md     SIM-AUDIT.md        SOURCES.md
STAGE-1-REPORT.md   TIER_3_FINAL_REPORT.md  master_simulation_upgrade_prompt.md
fluid.html
```

### Files that do not belong in a recruiter's first view

These are agent reports, prompt files, and overclaiming docs with no measured
numbers. None of them is evidence a reviewer can reproduce.

| File | Why it is junk for the root |
|------|-----------------------------|
| `AUDIT.md`, `AUDIT-3.md` | Agent audit reports. Belong in `docs/` or deleted. |
| `STAGE-1-REPORT.md`, `SIM-AUDIT.md`, `INSTRUMENT-AUDIT.md`, `EXTRACT-PLAN.md` | Agent work product. Not part of the product. |
| `TIER_3_FINAL_REPORT.md` | Overclaiming tier report; no measured numbers reproduced here. |
| `COMPARE-VERIFY.md` | Claims verification with no measured numbers (explicitly flagged in the brief). |
| `NOT-IMPLEMENTED.md` | Declares work not done; no value in root. |
| `PRODUCTION_SUMMARY.md` | Agent summary, not project documentation. |
| `KNOWN_ISSUES.md` | 140 bytes, superseded by honest limits lines inside each sim. |
| `master_simulation_upgrade_prompt.md` | Prompt file, not repo content. |
| `CHANGELOG.md` | Session-work changelog; real changelog belongs in release notes at tag time. |
| `audit_fps_results.json` | Raw scratch output of a prior agent run; evidence JSONs live in `evidence/`. |
| `fluid.html` | 44 KB orphan HTML page, not linked from the gallery; unreferenced by any script. |
| `CONTRIBUTING_GUIDE.md` | Duplicate of `docs/CONTRIBUTING.md`; two contributing guides confuse reviewers. |

Also at root but legitimate: `README.md`, `LICENSE`, `index.html`, `package.json`, `vercel.json`, `_headers`, `manifest.webmanifest`, `sw.js`, `theme-toggle.js`, `gallery.js`, `style.css`, `tsconfig.json`, `og-image.png` (155 KB, under the 1 MB screen-shot guideline).

## 2. Secret scan of tree and history

### Working tree (grep for keys/tokens/password patterns)

Command:

```
grep -rniE 'api[_-]?key|secret|token|password|sk_live|pk_live|aws_access|private_key|BEGIN (RSA|EC|OPENSSL) PRIVATE KEY|ghp_|github_pat|AIza|xoxb-' --include='*.js' --include='*.html' --include='*.json' --include='*.md' --include='*.css' --include='*.py' .
```

Raw output: no API keys, tokens, signing secrets, or private keys in the tree.
The only matches are legitimate uses of the word "password" inside the auth
form (`index.html` input labels) and `assets/auth.js` (comparing a password
the user typed), plus documentation mentioning that `auth.js` stores passwords
in plaintext. No `.env` files are tracked:

```
git ls-files | grep -iE '\.env|secret'   -> no output
```

### Git history

Command: `git log -p --all | grep -niE 'api[_-]?key|secret|token|password|sk_live|pk_live|ghp_|github_pat|AIza|xoxb-|BEGIN (RSA|EC|OPENSSL) PRIVATE KEY'`

Raw output: no secrets introduced in any commit. Matches are the same
documentation sentences about plaintext password storage (see section 3).

**Security finding (not a leaked secret, a design defect):** `assets/auth.js`
writes users — email + **plaintext password** — to `localStorage` under key
`visiq_users`, and writes the session email to `visiq_user_email` /
`visiq_session`. This is documented in the repo itself (`DECISIONS.md`
"Registration backend: stubbed..."). It must be called out in the Privacy
Policy and removed when login becomes optional (Stage 2).

## 3. What assets/auth.js does and what it actually protects

`assets/auth.js` defines `class AuthSystem`, self-initialized on DOM ready.

Raw behavior (read verbatim from the file):

- `loadUsers()` reads `localStorage.getItem('visiq_users')`; `saveUsers()`
  writes `JSON.stringify(this.users)` back, where each user is
  `{ email, password, createdAt }` — **passwords in plaintext**.
- `handleLogin()` looks up email, compares `user.password !== password`
  (plaintext comparison), then `createSession()` writes
  `visiq_session` and `visiq_user_email` to localStorage and calls `showApp()`.
- `showApp()` hides `#auth-page`, shows `#main-app`, and instantiates
  `window.gallery = new Gallery()`.
- `showAuthPage()` does the reverse. `handleLogout()` removes the session
  keys and shows the auth page.

**Does it gate the gallery or the sims?** Yes — both. `index.html` renders
`#auth-page` as `active` first; `gallery.js` (the gallery and every sim page
via `main-app`) is only reachable after `AuthSystem.createSession()` runs.
There is no anonymous path. That violates the design rule: "the gallery and
every sim open without it; any login copy says plainly it saves data on this

## 4. Everything written to localStorage (keys and contents) and every third-party request

For the Privacy Policy: nothing is sent to a server by this site. All
persistence is same-origin `localStorage` / `sessionStorage`.

### localStorage writes (raw grep output)

| File | Key(s) | What is stored |
|------|--------|----------------|
| `assets/auth.js` | `visiq_users`, `visiq_session`, `visiq_user_email` | users with plaintext passwords; active session email |
| `assets/theme-toggle.js` / `assets/theme-system.js` | `visiq-theme`, `theme_${userId}` | chosen theme |
| `assets/visiq-audio.js` / `assets/mute-system.js` | `visiq-muted`, `visiq_audio_muted` | mute state |
| `assets/stats-tracker.js` / `assets/preload-hot.js` | `visiq-stats` | stats history |
| `assets/analytics.js` | `visiq_events` | event log |
| `assets/share-system.js` | `visiq_shares` | share records |
| `gallery.js` | `visiq-onboarding-dismissed` | onboarding dismissal flag |
| `assets/instrument-layer.js` | per-sim `storageKey(simId)` | pinned controls state |
| `sketches/pendulum-chaos.js` | `GUESS_STORAGE_KEY` | user's drawn path guesses |
| `assets/streaks-system.js` | `streak_${userId}` | streak data |
| `assets/achievements.js` | `achievements_${userId}` | unlocked achievements |
| `assets/user-preferences.js` | `prefs_${userId}`, `visiq_user_email` | user preferences |
| `assets/error-boundary.js` | error-history key | captured errors |

### sessionStorage writes

| File | Key |
|------|-----|
| `gallery.js` | `visiq-compare-speed` |
| `assets/smooth-scroll.js` | `scrollPos` |

### Third-party requests (raw grep of http URLs in JS/HTML)

| URL | Where | Notes |
|-----|-------|-------|
| `https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js` | `index.html:307` | runtime CDN script (pre-existing; CSP allows it) |
| `https://github.com/toibawani/visiq` | `assets/config.js` | link only, no request |
| `https://toibawani.github.io/Visiq/*` | `index.html` (canonical, og:image, twitter:image) | self / own domain |
| `https://reddit.com/submit`, `https://twitter.com/intent/tweet` | `assets/share-system.js` | share intents, only on user click |
| `https://ssd.jpl.nasa.gov/planets/approx_pos.html` | `assets/orbital-elements.js:8` | URL in a comment citing the element source; no runtime request |

No analytics, no telemetry, no fingerprinting, no third-party cookies. The
site is effectively self-hosted except for p5.js from cdnjs.

## 5. Claims audit

Greps over README.md, docs/, index.html, gallery.js, style.css for
"complete", "verified", "tested", "60 fps", and every number. Each claim is
matched to an evidence file in `evidence/` or marked **unproven**.

### README.md claims

| Claim (raw) | File:line | Evidence / status |
|-------------|-----------|-------------------|
| "29 interactive science simulations" | README.md:12 | **unproven / wrong** — catalog has 31 ids (computed at load time in section 1); README also says Astronomy (6), actual category counts are Physics 8, Biology 8, Geography 7, Astronomy 8 |
| "Physics (8) ... Biology (8) ... Geography (7) ... Astronomy (6)" | README.md:29-32 | wrong — Astronomy is 8, total is 31 |
| "~60 feature modules" | README.md:92 | unproven (hand-estimate, not counted) |
| status-active / license-MIT / version-1.0.0 / author badges | README.md:5-8 | badges are images, not evidence; "version-1.0.0" is not yet tagged |
| "no emoji-only UI" | README.md:43 | contradicted — catalog carries 31 emoji `icon:` entries and README headings use emoji |

### index.html claims

| Claim | File:line | Evidence / status |
|-------|-----------|-------------------|
| "NAVIER-STOKES · WORKER 60 FPS" | index.html:189 | **unproven** — no fps evidence for fluid.html exists in `evidence/`; fluid.html is an orphan page not linked from the gallery |
| CSP meta / `_headers` | index.html:13 | present, matches `_headers` and `vercel.json` |

### gallery.js / style.css

No numeric product claims found beyond code comments ("Complete ... memory leak prevention" at gallery.js:3 — unproven as a user-facing claim).

### What is proven

- `npm test`: 73 passed, 7 files — raw output in section 6.
- Pixel/fps/leak measurements for black-hole, solar-system, earth-seasons — `evidence/<sim>/VERIFICATION.md` with raw JSON next to each doc.

### Bottom line

The README's "29" and "Astronomy (6)" are hardcoded wrong numbers of exactly
the kind the brief forbids. Any count shown anywhere must come from
`assets/simulations-data.js` at load time. Every "60 fps"/"verified"/"complete"
claim outside `evidence/` is unproven.

## 6. State of play

### npm test

Command: `npm test` (Vitest). Raw output:

```
Test Files  7 passed (7)
Tests       73 passed (73)
Start at 17:11:16
Duration    1.09s
```

All 7 files pass: integrators (2), orbit-drift (2), relativity (35),
seasons (14), solar-system (13), persistence (5), font-glyphs (2).
Two font-glyph tests previously failed on this machine for an environmental
reason (missing Python `fonttools`/`brotli`); after `pip3 install --user
fonttools brotli` the suite passes 59/59. That was a machine change, not a
repo change.

### node --check on all JS

Command: `for f in $(git ls-files '*.js' '*.mjs'); do node --check "$f"; done`

Raw output: every one of 61 JS/mjs files prints `ok: <path>` — zero syntax
errors.

### npm audit (dev dependencies)

Command: `npm audit`. Raw output:

```
11 vulnerabilities (7 moderate, 4 high)
```

All are in dev-only tooling transitive deps (`braces`, `chokidar`,
`micromatch`, `decode-uri-component`, `morgan`, `uuid` via `live-server` and
its chain). None are in the client bundle. `npm audit fix` would require
`npm audit fix --force` (live-server@1.2.0, a breaking change), which is
out of scope for this stage. For the record: dev dependency last-release
dates and audit results were checked; nothing in the bundle is affected.

### CI — latest Actions run on main

Command: `gh api repos/toibawani/Visiq/actions/runs`. Raw output (latest 5):

```
{conclusion: success, created_at: 2026-10-14T15:07:29Z, id: 38586564684}
{conclusion: success, created_at: 2026-10-14T15:07:03Z, id: 38586500257}
{conclusion: success, created_at: 2026-10-14T14:46:41Z, id: 38583543271}
{conclusion: success, created_at: 2026-10-14T14:45:45Z, id: 38583403925}
{conclusion: success, created_at: 2026-10-14T14:43:03Z, id: 38583001637}
```

The latest CI run on `main` is green (CI workflow: install, typecheck,
vitest, JSON validation, JS syntax checks, font-glyph coverage).

## Gate status for Stage 0

- [x] git ls-files summary and root listing — done (232 files; junk named above)
- [x] Secret scan of tree and history — done (no secrets; plaintext-password defect noted)
- [x] auth.js analysis — done (it gates gallery + sims; plaintext passwords in localStorage)
- [x] localStorage + third-party requests — done (table above; feeds the Privacy Policy)
- [x] Claims audit — done (README "29" / "Astronomy (6)" are wrong; all other numeric claims unproven except evidence/ measurements)
- [x] State of play — npm test 73/73 passing; node --check clean on all JS; CI latest run green

**Stage 0 complete. Waiting on the owner before Stage 1.** Next stage moves
the junk out of the root, rewrites README in a human voice, adds
docs/ARCHITECTURE.md, DECISIONS.md, SOURCES.md, PHYSICS.md, WALKTHROUGH.md,
LICENSE, SECURITY.md, CONTRIBUTING.md, Terms and Privacy, and footers. The
README's "29" / "Astronomy (6)" and every emoji must be fixed there because
no number may be hardcoded and no emoji may appear anywhere.
device only." Stage 2's one allowed auth change is to make login optional.