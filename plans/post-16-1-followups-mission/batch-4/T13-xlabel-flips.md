# T13: `fix(T13)` or parked: label-placement candidate flips (fdp 2471, sfdp 2371)

**Context:**
- With the oracle's positions injected, a few edges still have an `lp.y` one label
  line off: the label placer chose a different candidate.
  - fdp 2471: 2 injected diffs.
  - sfdp 2371: 318 injected diffs, signature `edge/_ldraw_/numeric+edge/lp/numeric`
    (`attribution-{fdp,sfdp}.jsonl`).
- fdp 2471's native layout is nondeterministic run to run (bounding box 86,089 to
  4.3e6; `.agent-notes/attribution-16-1.md`).

**Task:**
1. Reproduce with injection: `attribute-divergence.ts <engine> --fresh` on the 2 ids.
   For 2471, compare at least 5 native runs before drawing conclusions.
2. Dump the placer's inputs on both sides: node and label boxes, R-tree load order,
   candidate scores (`lib/label/xlabels.c`, `lib/common/postproc.c` `addXLabels`).
   Find the first input or decision that differs.
3. Fix at the origin if the port departs from C, with a test first. If the inputs differ
   only through libm or native nondeterminism, prove it with a forcing experiment and
   classify the ids. Park after about 2 h (AD-3).
4. If verdicts move: re-run attribution for the affected engines and update
   `attribution-*.jsonl` and the registry and docs as needed (locale `sourceHash`
   re-stamp).

**Write-set:** `src/common/xlabels-place.ts`, `src/label/*.ts` (+ tests);
`test/corpus/attribution-{fdp,sfdp}.json(l)`;
`test/corpus/accepted-divergences-engines.json`; `docs/known-divergences.md` + locales.
**Read-set:** `~/git/graphviz/lib/label/xlabels.c`,
`~/git/graphviz/lib/common/postproc.c` (`addXLabels`); `src/common/xlabels-place.ts`;
`src/label/`; journal row 2026-10-14 (follow-up 3).

**Acceptance criteria:**
- *Given* both ids with injection, *then* the journal names the first divergent placer
  input or decision, with values from both sides.
- *Given* a fix, *then* the injected diffs for the edges involved go to 0, and the
  fdp/sfdp walks show 0 regressions.
- *Given* parking, *then* the journal row lists what was ruled out and what to instrument
  next.

**Observability:** N/A. **Rollback:** reversible.
