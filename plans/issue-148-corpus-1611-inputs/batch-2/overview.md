# Batch 2: classify, then gates and squash

T3 measures and attributes; T4 runs the gates and squashes. T4 needs T3 (the
classification is part of the record), so they run in order.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T3 | Targeted survey of the 36 new + 7 changed ids; attribution; issues | executor (subagents allowed for per-id attribution, read-only) | `classification.md`, `harness/*` in this plan | T2 | [x] |
| T4 | Gates 1–6, journals, notes, squash | executor | `plans/decision-journal.md`, this plan's journal, `.agent-notes/issue-148.md` | T3 | [x] |
