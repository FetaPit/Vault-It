# Agent roster (PT Live Design and Vault-It)

Method for adding or changing agents: `.claude/skills/agent-methodology/SKILL.md`. Cloud sessions keep the model they start with.

| Role | File | Form | Model | Tools | Job |
|---|---|---|---|---|---|
| Chief of Staff | `.claude/skills/chief-of-staff` | Skill, main session | Opus for planning rounds, Sonnet for daily briefs | all | Captures asks, queues, dispatches, reports in five lines |
| David (COO) | `.claude/agents/david.md` | Subagent | Opus | read-only | Splits rounds, branches, merge order, CI, release gates |
| Pedro (creative director) | `.claude/agents/pedro.md` | Subagent | Sonnet, high effort | read-only + shots | Brief from dictation, visual review, nits list |
| Exec assistant | `.claude/agents/exec-assistant.md` | Subagent | Haiku | read, write drafts | Drafts, summaries, calendar, non-build tasks. Never sends |
| queue-keeper | `.claude/agents/queue-keeper.md` | Subagent | Haiku | read-only | Checks every ask against the queue |
| scout | `.claude/agents/scout.md` | Subagent | Haiku | read-only | Finds code, returns paths and ranges |
| grunt | `.claude/agents/grunt.md` | Subagent | Haiku | edit | Exact mechanical edits |
| architect | `.claude/agents/architect.md` | Subagent | Opus | read-only | Deep explains and plans |
| One B | `.claude/agents/one-b.md` | Subagent | Sonnet | run tests | Cross-device and sign-in tests |
| fintech-dev (fintech software engineer) | `.claude/agents/fintech-dev.md` + skill `.claude/skills/fintech-engineering` | Subagent + standards skill | Opus, high | edit + run tests | Money logic, payments, auth, saved data and Supabase changes: failing test first, stages for rollout-qc. Any session can load the skill alone. Tested 3 Nov in review mode on `debtPayoffMonths` (known answer): found both planted-in-the-wild faults (payment below interest returns the 600-month cap; no rollover of freed minimums) plus string-concatenated extra and unchecked negatives, each with a reproducing input, and spotted the function is unused |
| rollout-qc | `.claude/agents/rollout-qc.md` | Subagent | Sonnet, high | read-only | Gate: PASS writes the commit marker |
| Builders | per chunk | Cloud session | Sonnet (Opus for 3D, money, hard bugs) | all | One chunk, one branch |

## Flow of a round
Owner dictates, Chief of Staff queues it, Pedro writes the brief, David splits it into chunks and models, builders build in parallel on their own branches, Pedro reviews, rollout-qc gates each commit, David merges one at a time and reads CI, the owner signs off on the phone and moves production.

## Not yet connected
Slack, a meeting-capture tool and a Notion command centre are proposed in the 2 Nov research session, not built. Until then the queue file is the single list.
