---
name: agent-methodology
description: How to design, write, test and retire an agent or skill for PT Live Design and Vault-It. Use before creating or changing any file in .claude/agents or .claude/skills, or when an agent keeps doing the wrong thing.
---

## 1. Decide if it needs to exist
A new agent is justified only if a job repeats, has a clear input and output, and a mistake is costly or the context is heavy. Otherwise a prompt or an existing agent will do. Check `docs/AGENT_ROSTER.md` first.

## 2. Pick the form
| Need | Form |
|---|---|
| Dispatches other agents, talks to the owner | **Skill** run in the main session (CoS) |
| Narrow worker with its own context, returns a short result | **Subagent** in `.claude/agents` |
| Repeatable procedure with steps | **Skill** with `disable-model-invocation: true` if it has side effects |
Subagents cannot spawn subagents.

## 3. Write it
1. **One job in the description**, with the trigger words that should call it. The description is what routes work to it.
2. **Least tools.** Read-only unless it must write; no Bash unless it runs tests or shots. Reviewers never edit.
3. **Right model.** Haiku for search and mechanical edits; Sonnet for building and review; Opus for planning, 3D engine, money logic, release judgement. Do not switch model mid-session.
4. **Inputs it reads first** (by path) and **what it must not read whole** (`index.html`, the brand book).
5. **Output contract:** the exact shape and length of the reply (PASS / FIX / ASK, under N words, file:line).
6. **Guardrails in words:** what needs the owner's yes (send, pay, deploy, migrate, release), and the standing rules (British English, no em dashes, FCA line, no invented figures).
7. **Stop conditions:** when to ask one batched question instead of guessing.

## 4. Test it before trusting it
Run it on a past task whose answer you know (for example the v0.9 round) and compare. A reviewer must fail a deliberately broken change. Record the result in the agent's PR or in `docs/AGENT_ROSTER.md`.

## 5. Keep it healthy
One owner per agent. Edit the file, never fork a copy. Retire an agent that has not been called in two rounds. Update the roster whenever one is added, changed or removed. Never put secrets, keys or the owner's email in an agent file.

## PT Live Design vs Vault-It
Vault-It agents live in this repo (`.claude/`). Agents that serve PT Live Design as a whole (Chief of Staff, exec assistant, Pedro as shared creative director) are written here first, then copied to `claude-kit/home/` for use in every project via `claude-kit/install.sh`.
