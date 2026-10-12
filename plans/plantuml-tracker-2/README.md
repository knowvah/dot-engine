# Mission: plantuml-ts tracker issues, round 2

## Objective

Fix every open item in
`/Users/scottseely/git/knowvah/plantuml-ts/docs/graphviz-issues/TRACKER.md` that
reproduces against **our** oracle (native 15.x build), close 34 as version skew,
and annotate the tracker. The centrepiece is making `pathplan/route.ts`
`findMaxDev` faithful on the oracle host — libm `hypot` (`libmHypot`), C's strict
`>`, and clang `-ffp-contract=on` FMA contractions mirrored with `fma` — which is
expected to close plantuml-ts 23/32/33/35 and the A3/A8 accepted-divergence class
(2368, 241_1, 2413_1/2, graphs-b100/b104, graphs-decorate, 2371, 2646).

| Issue | Status vs native 15.x | Task |
|---|---|---|
| 23, 32, 33, 35 | reproduce; shared `findMaxDev` tie-break | T1 → T5 |
| 28 flat edge ignores `splines=line/polyline` | reproduces | T3 |
| 29 ortho self-loop lost | reproduces | T4 |
| 30 flat-adj port-less edge 0.2px | reproduces | T3 → T6 |
| 27 parser accepts `node { }` | reproduces | T2 |
| 34 HTML table border order | **matches 15.x** (16.1.0 skew) | T9 `[~]` |
| 14, 16 | consumer-side (plantuml-ts) | T9 note |
| A8 `points2coeff`/`solve3` (2646) | accepted divergence | T7 |

Evidence from planning: a reverted experiment (`ptDist`→`libmHypot`, strict `>`)
matched native on 23(w9), 32, 33, 35; 23(w20) still differed — the FMA term.
Prior art: `.agent-notes/fma-contraction-tiebreak.md` (contraction decides the
tie; stopped because JS had no fma — `src/common/fma.ts` now exists),
`src/common/libm-hypot.ts` (bit-exact host hypot, used by fdp/sfdp).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full
   (`rules/autonomous-execution.md` is a stub).
2. Read this README, `decisions.md`, `decision-journal.md`, then the current
   batch's `overview.md`. Verify task commits with `git log --oneline`.
3. Read `.agent-notes/` entries named in the task spec.

## Branch

`fix/plantuml-tracker-issues-2` off `main`. One commit per task (Conventional
Commits, ≤72-char subject, no attribution). Merge-commit PR at the end (AD-5).

## Quality gates (every task, before commit)

- `npm run typecheck` — exit 0 — fix_and_rerun
- `npx vitest run` — exit 0 — fix_and_rerun
- `bash test/golden/gates.sh` — all PASS — fix_and_rerun
- Survey (any task touching `src/layout` or `src/pathplan`; **fresh** — delete the
  JSONL first; never edit `src/` while it runs):
  `GVBINDIR=/tmp/ghl PARITY_OUT=parity-probe.json npx tsx test/corpus/survey.ts && npx tsx test/corpus/rules-gate.ts test/corpus/parity-probe.json`
  — pass: `GATE PASS`, 0 regressions vs T0 baseline — on_fail: revert, STOP
- Perf (T5, T7): `2646` and `graphs-b100` dot layout ≤ 1.10× T0 baseline.
- Oracle: `~/git/graphviz/build/cmd/dot/dot` with `GVBINDIR=/tmp/ghl`
  (regenerate: `sh test/corpus/gen-headless-gvbindir.sh`). Never homebrew `dot`
  (16.1.0) — the plantuml-ts filings used it; we do not.

## Stop conditions

1. A task must write outside its write-set.
2. Two consecutive failures of the same gate check.
3. A conformant→worse regression that reverting the task's change does not clear.
4. T5/T7 cannot reach 0 regressions with faithful contraction — revert, journal
   ids + diagnosis artifact, STOP (no strict-only fallback, AD-1).
5. Perf > 1.10× after one optimization attempt.
6. T1 map incomplete (an `fmadd`/`fmsub` in the 4 target functions unmapped after
   pragma bisection).
7. Evidence contradicts an AD (e.g. `libmHypot` ≠ oracle hypot on pathplan inputs).
8. 3 consecutive edits to one code site without resolving its check.
9. Anything requiring edits to `~/git/graphviz`, `/tmp/ghl`, or the oracle binary.
10. Any plantuml-ts write other than `docs/graphviz-issues/TRACKER.md`.
11. Push to `main`, version bump, tag, publish, or release.

## Push forward (decide alone)

- Env-gated temporary instrumentation in the port, or in an **rsync'd scratchpad
  copy** of graphviz (rebuild freely); revert port traces before commit.
- fma placement/operand order per T1's table, incl. unlisted sites T1 finds in
  the 4 target functions.
- Close an issue `[~]` with a controlled experiment proving irreducibility (AD-7).
- A separate diagnosis-only commit (`.agent-notes`) before the fix commit.
- Remove accepted-divergence entries the fresh survey proves conformant; refresh
  the gate baseline once a task is green.
- Update C-provenance comments (e.g. the `route.ts` A3 block) to the new behaviour.
- 1–3-line pre-existing fixes in files being edited; log others to `.agent-notes/`.
- END: push the branch and open the PR (pre-authorized; merge-commit; no
  attribution).

## Batches

| Batch | Tasks | Mode | Done |
|---|---|---|---|
| [0](batch-0/overview.md) | T0 setup, baselines, native refs | sequential | [x] |
| [1](batch-1/overview.md) | T1 contraction map · T2 parser 27 · T3 flat `et` 28 · T4 ortho loop 29 | parallel | [x] |
| [2](batch-2/overview.md) | T5 faithful `findMaxDev` 23/32/33/35 · T6 flat-adj 30 | parallel | [x] |
| [3](batch-3/overview.md) | T7 `points2coeff`/`solve3` 2646 → T8 ledgers | sequential | [x] |
| [4](batch-4/overview.md) | T9 tracker annotation, final gates, PR | sequential | [ ] |

## Documents

- [decisions.md](decisions.md) — AD-1…AD-7 (pre-made; do not relitigate)
- [decision-journal.md](decision-journal.md) — append per task (orchestrator only)
- [diagrams/component-map.md](diagrams/component-map.md)
- [diagrams/data-flow.md](diagrams/data-flow.md)
- Global journal: also append a mission-summary row to `plans/decision-journal.md`
  at T9 (CLAUDE.md: journal every fix there).

## Conventions

- Diagnosis mode (`~/.claude/rules/diagnosis.md`) for every fix: the
  mechanism/origin/causal-chain/ruled-out artifact goes in the task's journal row.
- Every ported/mirrored symbol keeps `/** @see lib/...:fn */`; every fma site
  carries `// clang -ffp-contract=on: fmadd at <file>.c:<line>`.
- Per-issue goldens live in `test/golden/pt-issue-NN.test.ts` reading
  `test/golden/{inputs,refs}/pt-issue-*` — **do not edit `test/golden/manifest.json`**.
- Only the orchestrator writes `decision-journal.md`; subagents report
  observations in their hand-back.

## Follow-on (not this mission)

graphviz 16.1.0 sync (re-pin oracle + ADR + port the 15.0.0-82..16.1.0 diff;
reopens 34). `route.c`/`solvers.c` are unchanged in that range, so this mission's
pathplan work carries forward.
