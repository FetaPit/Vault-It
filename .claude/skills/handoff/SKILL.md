---
name: handoff
description: Save a short state note so the next session (or /clear) starts focused instead of dragging a long history along. Use when switching tasks or when context is getting big.
disable-model-invocation: true
argument-hint: "[next task, optional]"
---

Write `.claude/handoff.md` (overwrite it). Max 25 lines:

```
## Goal
<one line>
## Done
- <what changed, with file:line>
## Open
- <next steps, in order>
## Gotchas
- <anything learned that is easy to forget>
## Next task
<the argument, if given>
```

Rules: facts only, no narration. Leave out anything already in CLAUDE.md. Do not paste code.

Then tell the user in one line: "Saved. Run /clear (same task) or start a new session (new task). The note loads automatically." If the note is stale later, they can delete the file.
