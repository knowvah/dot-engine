# Batch 4 — final bits and close-out

Starts only when `known-failing.json` is empty (STOP 14). T14 and T15 run in
parallel (disjoint files); T16 runs last.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T14 | Fresh walks + regenerate all 35 `PARITY-*.md` | orchestrator | `test/corpus/PARITY*.md`, walk JSON outputs they read | T13 | [ ] |
| T15 | Re-translate `divergences.md` into 23 locales; refresh `sourceHash` | 4 × technical-writer (~6 locales each) | `docs-site/<locale>/divergences.md` | T13 | [ ] |
| T16 | plantuml-ts TRACKER.md annotation (edit only), final gates, journals, push, PR | orchestrator | `../plantuml-ts/docs/graphviz-issues/TRACKER.md`, `plans/decision-journal.md`, this mission's journal/README | T14, T15 | [ ] |

Specs: [T14](T14-dashboards.md) · [T15](T15-translations.md) · [T16](T16-tracker-and-pr.md)
