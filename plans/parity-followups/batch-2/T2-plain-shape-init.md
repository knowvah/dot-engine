<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — twopi/neato shape=plain init defect

## Context
`tests/regression_tests/shapes/reference/plain.gv` (shape=plain, width=0,
height=0, pos-pinned, bb="0,0,0,0"): native and the port's **dot** path size
node `a` 0×0; the port's **twopi and neato** paths emit 0.75×0.5 (default
sizing). Verified 2026-07-24: `render-one-plain.ts <file> {dot|twopi|neato}
plain` → dot `0 0`, twopi/neato `0.75 0.5`. The port models IS_PLAIN correctly
in `src/common/poly-sizing.ts:138` (width=height=0) — so the twopi/neato init
path is not reaching it (falls to `initNodeDefaults`, likely the
no-measurer / pos-pinned branch). Engine-init defect class.

## Task
1. Diagnose per diagnosis.md: state which init call-site twopi/neato take for
   this input vs dot's, `file:line`, why poly sizing is skipped, ruled-outs.
2. Fix per AD-3: align the engine init call-site with C's central
   `common_init_node` → `poly_init` path. STOP (per mission stop 1) if the
   mechanism forces a change in `src/common/` shared with dot.
3. Add a colocated regression test (twopi + neato sizing of a shape=plain
   width=0 node) and re-verdict: twopi plain id byte-matches native; delete
   its `accepted-divergences-plain.json` entry.
4. Re-verdict twopi+neato plain AND xdot tracks for regressions; dot plain
   sweep unchanged.

## Write-set
- `src/layout/twopi/*` and/or `src/layout/neato/*` init call-sites (+ tests)
- `test/corpus/accepted-divergences-plain.json` (entry removal)
- `test/corpus/plain-parity-twopi.json(l)` (re-verdict)

## Read-set
- `src/common/nodeinit.ts:commonInitNode` / `initNodeFromLabel` /
  `initNodeDefaults`; `src/common/poly-sizing.ts:138` (IS_PLAIN)
- `~/git/graphviz/lib/common/shapes.c:1940-2000` (poly_init IS_PLAIN)
- `~/git/graphviz/lib/twopigen/` + `lib/neatogen/` init call order
- Registry entry: accepted-divergences-plain.json id
  `regression_tests-shapes-reference-plain` / twopi

## Acceptance criteria
- Given the stated mechanism, when fixed, then twopi plain render of the id
  byte-matches native and the registry entry is deleted.
- Given twopi/neato plain+xdot re-verdicts, then 0 regressions.
- Given dot, when its plain track is re-checked, then unchanged (754 pass).

## Observability / rollback
N/A — no new observable operations. Reversible (git).

## Quality bar
`npm run typecheck` + `npm test` green; mechanism journaled (repo-root) with
file:line + ruled-outs before the fix commit; one `fix(...)` commit.
