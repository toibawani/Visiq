# Human review — VISIQ Stage 3

This file is the human gate. Every question below is answered by a human
with eyes on the live site; nothing here is auto-filled. The numbers in
brackets are what the machine measured, and the human's job is to say
whether the numbers tell the truth.

## 1. The hero, deeper

1. Open `index.html?sim=black-hole&perf=1` on a real phone. Does the
   `?perf=1` overlay appear in the bottom of the canvas and stay there
   while the animation runs? Does the frame rate read as a real number
   (not a constant)?
2. With the overlay on, does the scene still animate, or does the overlay
   eat the frame budget?
3. The black hole has a mode for each physics knob (mass, spin, accretion
   rate, camera distance). Do the modes look like different objects, or
   like the same object with different lighting?
4. Is the accretion disk visibly occluded by the event horizon when the
   camera looks edge-on? (This is the known-answer test.)
5. Does the scene feel like a black hole, or like a glowing blob?

## 2. Real pixels (390 px wide, dark and light, t = 0 / 5 / 20 s)

Raw numbers live in `evidence/black-hole/shots/`. The human looks at the
images, not just the JSON.

6. Do the dark and light captures look like the same scene under two
   lighting conditions, or like two different scenes?
7. Does anything in the light capture clip to white? Anything in the dark
   capture clip to black?
8. Are the t = 0 and t = 20 captures visibly different, or frozen?

## 3. `?perf=1` overlay

9. Is the overlay legible on both themes at 390 px wide?
10. Does the overlay hide the scene behind it, or float over it?
11. Is the close button (top right of the overlay) reachable at 390 px
    wide, or is it a tap target too small?

## 4. Human statements

12. Does the black hole hero look premium enough to be the first thing a
    visitor sees?
13. Is there anything in the first ten seconds that would make a visitor
    close the tab?
14. Is the physics honest? (If a knob says "spin" and the disk does not
    twist, say so here.)
15. Is there anything you would delete from this stage before it ships?

## 5. Answers

| # | Question | Answer |
|---|----------|--------|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |
| 7 | | |
| 8 | | |
| 9 | | |
| 10 | | |
| 11 | | |
| 12 | | |
| 13 | | |
| 14 | | |
| 15 | | |
