# Batch 2 — port the 16.1 behaviour changes, by area

Work lists = T3's `port` rows (`.agent-notes/gv16-triage.md`) for each area.
Develop in parallel worktrees (disjoint write-sets). The orchestrator lands one
at a time: cherry-pick, gates, fresh survey (0 regressions vs the 16.1
baseline), perf when listed, journal, commit. Each landing removes the
`known-failing.json` ids it fixes. An area with zero rows closes as a
journal-only no-op. A row that needs files outside its area is STOP 6, unless
the orchestrator re-assigns it to the owning area (push-forward).

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T7 | HTML: `htmllex`, `htmltable`, emission order (`f0d07786b`, plantuml-ts 34) | typescript-pro | `src/common/html*`, HTML-table emit code in `src/render/*` named by T3 rows (+ tests), `known-failing.json` removals | T3, T4 | [x] |
| T8 | dotgen + ortho: mincross/rank/cleanup1/topsort fixes; ortho failure → `dot_splines_` rc (AD-6) | typescript-pro (model: opus) | `src/layout/dot/*`, `src/ortho/*`, `src/layout/dot/ortho-adapter.ts` (+ tests), removals | T3 | [x] |
| T9 | Renderers: svg `svgid`, json, `-Tdot`, xdot, image loading | typescript-pro | `src/render/*` except T7's HTML-table emit files, `src/xdot/*` (+ tests), removals | T3 | [x] |
| T10 | Force engines + labels: neato, sfdp, sparse, fdp, circo numerics; xlabels | typescript-pro (model: opus) | `src/layout/{neato,sfdp,fdp,circo,twopi,osage,patchwork}/*` (sparse lives in `src/layout/sfdp/`), `src/label/*`, `src/vpsc/*` (+ tests), removals | T3 | [x] |
| T11 | Shared: cgraph / util / gvc / non-HTML common behaviour changes | typescript-pro | per T3 rows in `src/model/*` (cgraph), `src/util/*`, `src/gvc/*`, `src/cdt/*`, `src/common/*` minus `html*` (+ tests), removals | T3 | [x] |

`known-failing.json` has one writer at a time: each task edits it in its own
worktree, and the orchestrator resolves the merge at land time (removals only).

Specs: [T7](T7-html.md) · [T8](T8-dotgen-ortho.md) · [T9](T9-renderers.md) · [T10](T10-force-engines.md) · [T11](T11-shared.md)
