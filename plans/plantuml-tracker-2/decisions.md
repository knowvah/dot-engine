# Architecture decisions (pre-made, user-approved 2026-10-11)

| AD | Decision |
|---|---|
| AD-1 | `findMaxDev` is faithful: `libmHypot` + strict `>` + `fma` mirroring clang's contractions. No strict-only fallback. |
| AD-2 | Contraction map from `clang -S -g` (oracle flags) + `otool -tV` of the oracle `libpathplan.4.dylib`; pragma bisection for ambiguous sites. |
| AD-3 | Mirror only `reallyroutespline`, `mkspline`, `points2coeff`, `solve3`; widen only on measured divergence. |
| AD-4 | Issue 27: grammar fix only; `ParseError` contract unchanged. |
| AD-5 | Branch `fix/plantuml-tracker-issues-2`; merge-commit PR; no release. |
| AD-6 | Ledgers: remove conformant A3/A8 members; survivors keep entries with new evidence. |
| AD-7 | 29/30: diagnosis artifact first; irreducible → `[~]` with a controlled experiment. |

## AD-1 — findMaxDev tie-break

**Context.** `src/pathplan/route.ts:182-212` uses `Math.hypot` (`ptDist`, :33) and a
tolerant tie (`d > maxd*(1+1e-10)+1e-10`). C `lib/pathplan/route.c:reallyroutespline`
uses strict `if ((d = dist(p, inps[i])) > maxd)`. The oracle is Apple clang `-O3`
arm64: libm `hypot` + `-ffp-contract=on`. The tolerant rule was chosen when neither
could be reproduced (A3 in `docs/known-divergences.md`); both now can
(`src/common/libm-hypot.ts`, `src/common/fma.ts`).
**Decision.** Mirror C on the oracle host exactly.
**Consequences.** Spline knots move on symmetric/tie channels corpus-wide, toward
the oracle. The port stops being translation-equivariant (as C is). If 0
regressions is unreachable → STOP.

## AD-2 — How the contraction map is built

**Context.** Contraction is a compiler choice per source expression; operand order
of the fused add matters for the last bit.
**Decision.** rsync `~/git/graphviz` to the scratchpad; compile `lib/pathplan/route.c`
and `solvers.c` with the flags in `~/git/graphviz/build/CMakeCache.txt` plus
`-S -g`; map each `fmadd/fmsub/fnmsub` to a source line; cross-check against
`otool -tV ~/git/graphviz/build/lib/pathplan/libpathplan.4.dylib`. Ambiguous →
`#pragma clang fp contract(off)` bisection in the copy, compared bitwise with the
oracle on the T0 repros.
**Consequences.** `~/git/graphviz` is never edited (memory: native-oracle-libm).

## AD-3 — Mirroring scope

**Decision.** Only the four functions. Widen only where a measured divergence
points, and record each widening in the journal.
**Consequences.** Hot-loop cost bounded (perf gate 1.10×).

## AD-4 — Issue 27 error text

**Decision.** Reject `node|edge|graph { … }` as C's yacc grammar does
(`lib/cgraph/grammar.y`); the thrown error stays the structured `ParseError`
(`SYNTAX_ERROR`). Graphviz-format message parity is recorded as remaining in the
tracker, not implemented.

## AD-5 — Integration

**Decision.** One branch, one commit per task, merge-commit PR at T9 (push + PR
pre-authorized). No version bump, tag, publish. Tracker says "FIXED on branch,
NOT YET PUBLISHED"; boxes are not ticked (the tracker's own rule needs a pinned
`.tgz`).

## AD-6 — Divergence ledgers

**Decision.** After T5/T7, the fresh survey decides: conformant ids leave
`test/corpus/accepted-divergences*.json` and `docs/known-divergences.md` A3/A8;
survivors stay with new evidence; if a class empties, mark its heading CLOSED
(precedent: A2).

## AD-7 — Diagnosis-first for 29/30

**Decision.** Produce the `rules/diagnosis.md` artifact before editing. A
mechanism below the code (proven by a controlled experiment) closes `[~]`.

## Rollback

All changes **Reversible** (git revert; nothing released, no data/schema).
