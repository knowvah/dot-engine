# T9 — Renderers: svg, json, dot, xdot, image loading

**Agent:** typescript-pro. **Depends on:** T3. Follow [area-task-protocol.md](area-task-protocol.md).

**Rollback:** Reversible. **Observability:** N/A — library code; the SLIs are
survey verdicts and the ratchet length.

## Context

16.1 `plugin/core/gvrender_core_svg.c` writes a graph-level `id="<svgid>"` when
the `svgid` attribute is set (+6 lines). Other changes are in
`gvrender_core_json.c` (10/22), `gvrender_core_dot.c` (8/14), `lib/xdot/xdot.c`
(34/53 ignoring whitespace), and `gvloadimage_core.c` (80/83). `gvrender_core_fig.c` and
`gvrender_core_tk.c` are outside unless `src/render` has fig/tk. Port side:
`src/render/*` (svg, json, dot writer, xdot), `src/xdot/*`, and image loading
wherever `src/` implements it (find it first).

## Acceptance

- Given every T3 row for T9, then each is ported with a test, or recorded as refactor-only with a reason.
- Given `digraph { svgid="x"; a }`, when rendered to SVG, then the root `<g>` or
  `<svg>` carries `id="x"` exactly where native puts it.
- Given the json/dot/xdot goldens and walks T3 lists as moved, then they pass vs 16.1.0.

## Write-set

`src/render/*` (except HTML-table emit files owned by T7), `src/xdot/*`, the
image-loading module if T3 names it, + tests; `test/golden/known-failing.json` (removals).

## Commit

`feat(render): mirror graphviz 16.1 renderer changes including svgid`
