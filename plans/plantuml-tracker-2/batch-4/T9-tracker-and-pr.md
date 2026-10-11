# T9 — Tracker annotation, final gates, PR

**Agent:** orchestrator. **Depends on:** T2–T8. **Rollback:** Reversible.
**Observability:** N/A — final gate run records the closing SLI values in the journal.

## Task

1. Final gates on the mission branch: `npm run typecheck`, `npx vitest run`,
   `bash test/golden/gates.sh`, a **fresh** full survey + `rules-gate.ts`
   (0 regressions vs T0 baseline; journal the final conformant count delta), perf
   bench (≤ 1.10×).
2. Edit `/Users/scottseely/git/knowvah/plantuml-ts/docs/graphviz-issues/TRACKER.md`
   (the only plantuml-ts file this mission may touch; edit only — do **not**
   commit, branch, or push in plantuml-ts; report the diff to the user). Follow
   the file's existing comment style (`<!-- FIXED … -->` notes appended to the
   item; prior notes kept unedited below a "PREVIOUS NOTE FOLLOWS" line):
   - 23, 27, 28, 29, 30, 32, 33, 35 (each that landed): leave `[ ]`; append
     `FIXED <date> on dot-engine branch fix/plantuml-tracker-issues-2 (<sha>),
     NOT YET PUBLISHED. Mechanism: <one or two sentences>. Verified against native
     graphviz 15.x (our oracle); the filing compared against homebrew 16.1.0.`
   - 23: also replace the "REOPENED … method" plan with the outcome (hypot +
     contraction, not hypot alone).
   - 27: add "error-text parity (graphviz `syntax error in line N near 'tok'`)
     not implemented — ParseError contract kept (dot-engine AD-4)".
   - Any issue closed irreducible by T4/T6: `[~]` with the controlled experiment.
   - 34: `[~]`, "version skew: native 15.x draws cells then border, as the port
     does; 16.1.0 reordered `emit_html_tbl`. Tracked by the dot-engine graphviz
     16.1.0 sync follow-on."
   - 14, 16: append "consumer-side; no dot-engine work". For 16: "03 is consumed —
     re-measure pavuzo-79-zodu430 and tick if clean".
   - Add, per fixed issue, the plantuml-ts fixtures expected to move (from the
     issue files) so the next `.tgz` bump knows what to re-measure.
3. Append a mission-summary row to `plans/decision-journal.md` (global journal).
4. `git push -u origin fix/plantuml-tracker-issues-2`; `gh pr create --base main`
   — title `fix: resolve plantuml-ts tracker issues 23/27-30/32/33/35`, body:
   per-issue mechanism table, A3/A8 ids retired, perf numbers, survey delta,
   follow-on (graphviz 16.1.0 sync). No attribution lines. Merge strategy note:
   merge commit (mission-brief branch).

## Acceptance

- Given each fixed issue, when annotated, then the entry names branch, sha,
  mechanism and "NOT YET PUBLISHED", and no box is ticked.
- Given 34, then it is `[~]` with the version-skew note.
- Given final gates, then all pass and the PR is open against `main`.

## Write-set

`/Users/scottseely/git/knowvah/plantuml-ts/docs/graphviz-issues/TRACKER.md`,
`plans/decision-journal.md`, `plans/plantuml-tracker-2/decision-journal.md`,
`plans/plantuml-tracker-2/README.md` (batch checkboxes).
