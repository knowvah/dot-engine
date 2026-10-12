# T4 — Tracker conformance suite (plantuml-ts repros → tests)

**Agent:** typescript-pro. **Depends on:** T0, T1. **Rollback:** Reversible.
**Observability:** adds the tracker-conformance SLI (every `pt-issue` case green
vs 16.1.0, or listed in `known-failing.json`).

## Context

User requirement: the 16.1-era repros in plantuml-ts `docs/graphviz-issues/`
become dot-engine tests. Read-only source root:
`/Users/scottseely/git/knowvah/plantuml-ts`. Copying out is a read; writing there
is STOP 11. Existing pattern: `test/golden/pt-issue-32.test.ts` (render via
`renderSvg(src, 'dot')`, compare `compareSvg(actual, ref, 'deterministic')`).

Sources (≈55 repros):
- **Inline DOT blocks** (```` ```dot ````) in issue files 21, 22, 23, 24, 26, 28,
  29, 30, 31, 32, 33, 34, 35 (one or more per file).
- **Scratch repros** cited by 22 and 26:
  `plans/class-divergence-drive-3/diagnosis/scratch/E2-sametail-min{,-rect,-tb}.dot`,
  `E3-selfloop-{min,cluster,bisect}.dot`.
- **Cached fixture DOTs** named in TRACKER.md items 18–35 and those issue files:
  `test-results/dot-cache/<family>/<id>/svek-1.dot`. All 34 are present: bajotu,
  bamami, baneru, bejusa, bobixe, boseba, camuna, cobumi, coxose, delasa, deroxu,
  focaci, givoli, majuva, mucoti, nadepi, nafiki, nugecu, pecabi, pijiju, pugodi,
  repoge, rifuzu, ririlu, rubebe, rufopi, sanixi, sefazi, sokevu, tekena,
  xagonu, xenusu, zosuje, zuduxu (full ids in the issue files).

## Task

1. Copy each repro to `test/golden/inputs/pt-issue-NN-<label>.dot`. NN is the
   issue that names it; a fixture named by several issues goes under the lowest
   NN, and the others reference it. Existing `pt-issue-*` inputs stay as they are.
2. `test/golden/inputs/PROVENANCE.md`: one row per new input with the source
   path, the fixture id, the issue numbers, and the plantuml-ts commit
   (`git -C <plantuml-ts> rev-parse HEAD`). Add a `measured-text` column that
   says whether graphviz measures any text in the input (a label without
   FIXEDSIZE). The oracle is headless (estimate_textspan_size, decided
   2026-10-12, not pango). plantuml-ts filings compared against pango-enabled
   homebrew can therefore differ on those inputs for a reason that is not a defect.
3. Capture refs from the 16.1.0 oracle (`GVBINDIR=/tmp/ghl`, `-Tsvg`).
4. Tests: one `test/golden/pt-issue-NN.test.ts` per issue, one case per input,
   through `ptIssueTest` (T1). Extend the existing 23, 28–30, 32, 33, 35 files;
   create 18–22, 24, 26, 31 and 34.
5. Homebrew quotes: where an issue file quotes a homebrew 16.1.0 path or
   coordinate (e.g. 32's detour `M18.35,-10.48C25.6,...`), assert our ref
   contains it. A mismatch is STOP 4.
6. Issue 31 (zuduxu, rubebe): also capture native stderr to
   `refs/pt-issue-31-<label>.stderr`. Assert the port reports the same lost-edge
   set and the same `Pshortestpath failed` count through its warning channel
   (find how `renderSvg` surfaces warnings).
7. Run the suite. Add every failing case to `known-failing.json` `ptIssue` with a
   one-line reason in the hand-back. Issue 34 cases are expected to fail until T7.

## Acceptance

- Given every source above, then each has an input, a ref, a test and a provenance row.
- Given the issue-32 homebrew quote, when asserted against our ref, then it matches.
- Given issue 31, then the test checks the lost-edge set and the warning count.
- Given the full suite on the current port, then vitest is green with failing
  cases listed (ratchet).

## Write-set

`test/golden/inputs/pt-issue-*`, `test/golden/refs/pt-issue-*`,
`test/golden/pt-issue-*.test.ts`, `test/golden/inputs/PROVENANCE.md`,
`test/golden/known-failing.json` (`ptIssue` only).

## Commit

`test(golden): add plantuml-ts tracker repros as conformance tests`
