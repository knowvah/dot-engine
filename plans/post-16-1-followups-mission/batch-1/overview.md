# Batch 1: baselines and housekeeping

T0 runs first: batches 2 and 3 compare against its output. T1–T3 have no `src/`
changes and can run in parallel with T0.

| ID | Description | Agent | Writes | Depends on | Done |
|---|---|---|---|---|---|
| [T0](T0-baselines.md) | Port and native baselines (no commit) | orchestrator | `$BASE` (scratchpad) | — | [ ] |
| [T1](T1-gvbindir-defaults.md) | `GVBINDIR` default `/tmp/gvplugins` → `/tmp/ghl` | sonnet | 3 corpus scripts + fitness test | — | [x] |
| [T2](T2-followups-readme.md) | Commit the follow-ups README and this brief | orchestrator | `plans/post-16.1-followups/README.md`, `plans/post-16-1-followups-mission/**`, `.claude/settings.autonomous.json` | — | [x] |
| [T3](T3-architecture-docs.md) | Refresh `docs/architecture/*` | `/explore` (supplement mode) | `docs/architecture/*.md` | — | [ ] |
