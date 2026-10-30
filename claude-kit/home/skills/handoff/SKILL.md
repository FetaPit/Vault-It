---
name: handoff
description: Save a short state note so the next session (or /clear) starts focused instead of dragging a long history along. Use when switching tasks or when context is getting big.
disable-model-invocation: true
argument-hint: "[next task, optional]"
---

1. Get the note path:
   `p=$(git rev-parse --show-toplevel 2>/dev/null || pwd); mkdir -p ~/.claude/handoffs; echo ~/.claude/handoffs/$(echo "$p" | tr / -).md`
2. Write that file (overwrite). Max 25 lines:

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

Facts only, no narration. Leave out anything already in CLAUDE.md. No code.

3. Tell the user in one line: "Saved. Run /clear (same task) or start a new session (new task). The note loads automatically."

<!-- claude-kit -->
