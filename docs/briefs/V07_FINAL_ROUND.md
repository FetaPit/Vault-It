# v0.7 final round: house builder as smooth as the brand book

Coordinated by David (COO), 1 Nov 2026 from about 22:20. The release waits for this round.

## Owner's words
- 22:11 (fold phone screenshot of the d19bb0c preview): "The house builder is still lagging, not working, breaking the app, making it freeze. This should be the final round of edits before release. What needs to be done to make sure that the house builder 3D viewport and the engine behind it runs on all devices smoothly and works just like on the brand book?"
- ~22:20: "by works, just like the brand book, like the animations are as smooth as on the brand book. Pull in all of our agents and use David, COO, to coordinate this last round of edits."

## Why it still freezes
The brand book draws 14,465 bricks with raw WebGL: one shader program, one instanced draw call, brick drops animated in the shader from a per-brick time stamp. The app draws 11,965 bricks through three.js across src/hb3d (about 2,900 lines, several meshes and line layers). The lab harness (software WebGL, CPU 4x) passed; the owner's real phone did not. From now on the owner's devices are the gate.

## Who does what
| Who | What | Branch | Gate |
|---|---|---|---|
| Stream A2, house engine (Fable, session_01KoffvynkETPQC1hZdf8um5) | Port plan in 30 min, then replace the brick renderer with the brand book's approach (one instanced draw, shader drops), keeping models, levels, ROW tag, camera buttons, ground ping, still picture, lazy start, "only new bricks lay". Old engine behind ?house=legacy for one release | v07/engine | Owner's phone and laptop via ?perf=1, Pedro side by side, rollout-qc |
| Stream B2, measurement and fixes (Sonnet, session_01KoffvwxP6sZqoPLryChbVP) | First the ?perf=1 overlay with Copy report (so the owner can measure the current build tonight); then the three screenshot bugs: tower caption with Terraced selected, "Counting bricks..." and "... OF ... UK BRICKS" stuck, "£n lays n bricks" missing at 884 px | v07/final-fixes | Failing tests first, rollout-qc, CI |
| Pedro (CD) | Motion and fidelity acceptance spec taken from the brand book (timings, easing, flash, orbit, DPR, palettes, ground), then the side-by-side review | none | PASS against his spec |
| rollout-qc, queue-keeper | QC on every app commit; queue kept current | | |
| David (COO, release chat) | Order, merges into candidate/v0.7, CI, previews, owner sign-off, release | candidate/v0.7 | Owner's "signed off" |

## Order
1. B2's perf overlay merges first; the owner measures the current build on his fold phone and laptop and pastes the reports.
2. A2's plan, then the build; B2's three fixes merge as they pass.
3. A2's engine merges once it meets the gate: no main-thread task over 100 ms while loading, laying or orbiting; laptop 55 to 60 fps, phone at least 30 fps sustained; first 3D frame within about 1.5 s on the phone; Pedro PASS against the brand book.
4. One preview, the owner signs off on both devices, then the release (backup, PR #3 to the signed-off commit, owner merges, live check, tag v0.7.0-alpha), then the server deploys with the owner's yes.

## David's view
- Honest timing: the engine swap is hours, not minutes. Release tonight only if the owner takes the safety option (still picture by default, 3D on tap) for v0.7 and the new engine as v0.7.1; otherwise the release follows the new engine.
- No new features in this round. Anything new goes to v0.7.1.
