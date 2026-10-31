---
name: ship-item
description: Build and ship one queue item end to end, the Vault-It way. Locks the owner's intent first, builds with a failing test, gathers evidence (named tests, element screenshots in Night and Daylight), gets an independent rollout-qc verdict, then commits, updates the queue and hands off. Use whenever you start or finish an item from docs/QUEUE.md that changes the app, the landing page, the worker or the edge functions.
argument-hint: "<queue item, e.g. 'Round 3 item 8' or 'footer disclaimer'>"
---

Item: $ARGUMENTS

Work in this order. Do not skip a step to save tokens; the savings come from doing each step once.

## 1. Lock the intent (before any code)
1. Run the `queue-keeper` agent with the item. Obey STOP or ADD. Mark the item `[~]`.
2. Read the owner's words for the item in `docs/QUEUE.md`, and its brief if one exists. Copy them verbatim into the intent card.
3. Write the intent card to `shots/qc/<slug>.intent.md` (git-ignored scratch; the summary goes in the commit body later):
   ```
   # <item>
   Owner's words: "<verbatim>"
   Why (the user outcome): <one line: what the user can do or understand afterwards>
   Done means (observable): - <check a test or a screenshot can prove>  (3 to 6 lines)
   Out of scope: - <what this item does not change>
   Rules in play: <which standing rules this touches: figures, FCA line, hosts, prices, saved data, motion, copy>
   Open questions: - <only where two readings give different products>
   ```
4. **Internal critique of the card.** Ask yourself: would the owner recognise this as what they asked for? Did I add anything they did not ask for, or drop a word they used (for example "across the board", "exactly", "every")? Is each "done means" line checkable? Fix the card.
5. If there are open questions, ask them all in one `AskUserQuestion` now, with a recommended option first. Do not ask what the codebase or the brief already answers.

## 2. Build
- Find code with the session map and `Grep`, then read ranges. Use `scout` for wide searches and `grunt` for exact mechanical edits.
- For new or changed behaviour, write or extend the test first and see it fail on the old code. Tests live in `tests/`; follow the pattern of the nearest Round 3 test and add one line to `tests/README.md`.
- Keep to the card. If the item turns out bigger or different than the card, update the card and say why in the final reply.

## 3. Evidence
1. Run the named tests for what changed, plus the guards: `bash scripts/run-tests.sh <new test> <neighbouring tests> test_beta_client test_copy`. Add `test_hb_brand test_nw3d` if 3D code changed, `test_signup_page` for `landing.html`, `xss` if user text is rendered. Keep the command and its last lines.
2. Screenshots of the changed element: `node tools/shot.js --name <slug> --tab <tab> [--sub <sub>] --sel "<css>"`. It shoots Night and Daylight at 390 and 1100 px, and reports page errors and sideways scroll. Fix any problem it prints. Open only the images you need to judge the change.

## 4. Independent QC
1. Stage the change: `git add <files>` (no `git commit -a`: the gate checks exactly what is staged).
2. Run the `rollout-qc` agent with the item, the intent card path, the test command and its output, and the screenshot paths.
3. FIX: make the fixes, re-run the evidence, re-stage, run `rollout-qc` again. ASK: put the question to the owner. After two FIX rounds on the same point, stop and tell the owner what is blocking, rather than looping.
4. PASS writes `shots/qc/QC_PASS`. The commit gate (`.claude/hooks/qc-gate.sh`) refuses an app commit whose staged change does not match it, so anything edited after QC needs QC again.

## 5. Ship
1. Commit. Message: `<Round / item>: <what changed, plain words>`, then a body with the intent card's "Done means" lines, the tests run, and `QC: PASS (rollout-qc)`. End with the session's attribution lines.
2. Update `docs/QUEUE.md`: the item's progress line, or move it to Done with the commit hash. Commit that with the work or straight after.
3. Push to the session's branch (and `brand-rollout` when the owner has asked for that). Fetch and rebase first; another session may be working in parallel.
4. Send the screenshots to the owner with `SendUserFile` (Night and Daylight at 390 and 1100 px).
5. Hand off. In cloud sessions `/handoff` notes do not survive the container, so the queue progress line ("Next: ...") and the commit body are the handoff. Tell the owner in three lines: what changed, what proves it, what is next.
