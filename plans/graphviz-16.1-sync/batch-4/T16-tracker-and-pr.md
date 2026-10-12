# T16 — Tracker annotation, final gates, PR

**Agent:** orchestrator. **Depends on:** T14, T15. **Rollback:** Reversible.
**Observability:** final gate run records the closing SLIs in the journal.

## Task

1. Final gates on the branch: typecheck, `npx vitest run`, gates.sh, a fresh
   survey vs the **T2** 16.1 baseline (reuse the latest fresh survey if `src/` is
   unchanged since), and perf. Journal the deltas from T2.
2. Edit `/Users/scottseely/git/knowvah/plantuml-ts/docs/graphviz-issues/TRACKER.md`
   only (edit, no commit/branch/push there; report the diff to the user). Follow
   the file's style (`<!-- … -->` notes; prior text kept below "PREVIOUS NOTE FOLLOWS"):
   - 23, 27–30, 32, 33, 35: their FIXED notes cite plantuml-tracker-2 branch
     shas; rewrite each as "on main <sha>" and drop "NOT YET PUBLISHED" only if a
     release has shipped (check `npm view @knowvah/dot-engine version` vs `main`).
     PR #85 was rebase-merged, so the plantuml-tracker-2 branch shas are not on `main` (the remote branch is deleted). Map: fdd6d03d→b18c06e1, 87de3eea→d3d7297f, 33a928d8→ea0a8849, 44aba8a3→cdf597bc, bdd614d5→87347711, 0e07be7b→0cc05181, ba8a5ee0→236adff2.
   - 34: `[~]` → `[ ]`, FIXED with branch, sha and "NOT YET PUBLISHED". Mechanism:
     port of `f0d07786b` (table border before cells).
   - 18–35: append "RE-VERIFIED <date> against graphviz 16.1.0 (dot-engine oracle
     now matches homebrew 16.1.0): <pass | residual + reason>". Use T4's suite
     results; name each covering test.
   - 31: the warning-count outcome from T8/T12.
   - Add a header note: dot-engine's oracle is now graphviz 16.1.0, so filings
     against homebrew 16.1.0 compare like with like, apart from pango-measured
     text (T4 PROVENANCE `measured-text`).
3. Append the mission-summary row to `plans/decision-journal.md`.
4. README: tick batches, add the session-end summary.
5. `git push -u origin feature/graphviz-16.1-sync`; `gh pr create --base main`
   — title `feat: sync the port with graphviz 16.1.0`. Body:
   - per-area change table;
   - consumer-visible behaviour changes (HTML table order, `svgid`, ortho
     failure, parser macro names);
   - tracker issues fixed or re-verified;
   - ratchet history;
   - survey and walk deltas;
   - perf;
   - follow-on (publish, plantuml-ts `.tgz` bump);
   - merge-commit note.
   No attribution.

## Acceptance

- Given final gates, then all pass, and the PR is open against `main`.
- Given TRACKER.md, then 34 is FIXED (not ticked), 18–35 carry re-verification
  notes, and no other plantuml-ts file changed (`git -C plantuml-ts status`).

## Write-set

`../plantuml-ts/docs/graphviz-issues/TRACKER.md`, `plans/decision-journal.md`,
`plans/graphviz-16.1-sync/{README.md,decision-journal.md}`, batch overviews (checkboxes).
