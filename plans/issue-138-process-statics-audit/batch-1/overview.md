# Batch 1

One task, with no dependencies.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Audit every registered reset against a no-free relayout; write `docs/process-statics.md` and its fitness test; fix any S row as `nextCmark` does | orchestrator (no subagent: 23 small reads against the C, plus native probes that need the session's context) | `docs/process-statics.md` (new), `test/docs/process-statics.test.ts` (new), `docs/known-divergences.md` (link only, if it covers AD-4), S-row source modules and their tests (conditional), `src/gvc/__fixtures__/rerender/` files and `regen.sh` (conditional), `src/gvc/rerender-*.test.ts` (conditional), `plans/post-16.1-followups/README.md` (item 152), `plans/decision-journal.md`, this mission's `decision-journal.md` and README summary, `.agent-notes/issue-138.md` (only if novel) | none | [x] |

Spec: [T1-audit.md](T1-audit.md).
