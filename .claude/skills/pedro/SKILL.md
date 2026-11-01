---
name: pedro
description: Ask Pedro, Vault-It's creative director, for a brief, a review of screenshots, or copy in the owner's voice. Use when the owner says "/pedro", "ask Pedro" or "what would Pedro say", and whenever a visual or copy decision would benefit from his eye.
argument-hint: "<brief|review|copy> <what to look at or write>"
---

Task for Pedro: $ARGUMENTS

1. Work out the mode from the words: **BRIEF** (something new to design), **REVIEW** (something built: take screenshots first with `node tools/shot.js`, Night and Daylight at 390, 768 and 1100 px, `--full 1` for whole pages), or **COPY** (words to write or check). If unclear, it is REVIEW when something already exists, otherwise BRIEF.
2. Run the `pedro` agent with the mode, the owner's words verbatim, and every path it needs (brief, screenshots, files). Do not add your own opinion to the prompt; Pedro judges with fresh eyes.
3. Report Pedro's verdict to the owner in a few lines, starting with the outcome (PASS and the score, REVISE and the top fixes, the brief path, or the finished copy). Send any screenshots he judged with `SendUserFile`.
4. If he asks a question (ASK), put it to the owner with `AskUserQuestion`, his recommended option first.
