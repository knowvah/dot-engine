# T12 — Residual ratchet

**Agent:** debugger (model: opus). **Depends on:** T7–T11. **Rollback:** Reversible.
**Observability:** drives the ratchet SLI to zero. Perf gate at land.

## Context

AD-4. After Batch 2, whatever remains on `test/golden/known-failing.json`, plus any
16.1-baseline survey ids still diverged that T3 attributed to a 16.1 change, has
no owner. Issue 31 belongs here too if T8 did not resolve it: the port logs 36
`Pshortestpath failed` against native's 34 on rubebe-45-sura795, with the same
lost-edge set. More than 10 entries needing fresh diagnosis is STOP 10, to be re-planned.

## Task

For each entry, one at a time:
1. Diagnosis artifact (`~/.claude/rules/diagnosis.md`): mechanism, origin
   `file:line`, causal chain, ruled out. Instrument the port and/or a scratchpad
   graphviz copy (never the graphviz trees).
2. Port-side cause: fix at the origin with a test, and remove the ratchet id.
3. Cause proven irreducible (below the code, shown by a controlled experiment):
   - write a comparison page `comparisons/<id>.md` (repo root; precedent `comparisons/newrank.md`, `comparisons/a2-font-metrics/`) (native vs port, the
     mechanism, and the experiment);
   - add an accepted-divergence entry (T13 finalizes the wording);
   - keep the id off the ratchet by marking it as accepted, not by listing it.
4. Hand back one block per entry with the artifact, the action and the commit.

## Acceptance

- Given T12 done, then `known-failing.json` is `{ "goldens": [], "ptIssue": [] }`.
- Given each accepted survivor, then a comparison page and a registry entry exist,
  and the journal references the page.
- Given issue 31, then the warning counts match native, or the residual is proven irreducible.
- Given the corpus, then 0 regressions vs the 16.1 baseline, and perf ≤ 1.10×.

## Write-set

Files under `src/**` named by each diagnosis. A file another area owned is
allowed here; journal each one. Plus tests, `test/golden/known-failing.json`,
`comparisons/*`, and draft entries in `test/corpus/accepted-divergences*.json`.

## Commit

One commit per fixed mechanism, e.g. `fix(<scope>): <mechanism>`. Acceptance pages:
`docs(comparisons): document <id> residual against graphviz 16.1`.
