<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 4: mirror sites

Three sites; two are C fatal exits the port silently renders past, one is an
existing throw whose message and context improve. No new `GvErrorCode`
(D4): no registry row shows a consumer branching on a new code, and
`RENDER_ERROR` / `UNKNOWN_LAYOUT` already cover all three.

**Context is used** (`{ node }`, `{ edge }`, `{ layout }`). The next task must
add an optional `context?: Record<string, string>` to `GvError`,
`DotEngineError`, `RenderError`'s constructor options and `classifyError` in
`src/index.ts`.

All three change thrown-error surfaces only. The two overflow sites change
port output only for inputs on which the carried oracle exits 1 (no svg, xdot,
plain, json, map or dot output to compare); no `agerr`/stderr text changes.
Each overflow check must mirror the C order: check after every addition, in
`int32` range, before the assignment.

| Row id | src file | Symbol | Code | New message | Context | Triggering DOT | Test file |
|---|---|---|---|---|---|---|---|
| `lib/common/ns.c#x_cutval#agerrorf#1` (also `#agerrorf#2`, `#graphviz_exit#1`, `#graphviz_exit#2`) | `src/layout/dot/ns-range.ts` | `xCutval` | `RENDER_ERROR` (existing) | `Edge weights at node "<node>" sum past the 32-bit integer limit; lower the weight attribute values.` | `{ node: string }` | `digraph{a->b[weight=2147483647]; a->c[weight=2147483647]}` (dot) | `src/layout/dot/ns-range.test.ts` |
| `lib/dotgen/mincross.c#virtual_weight#agerrorf#1` (also `#graphviz_exit#1`) | `src/layout/dot/classify.ts` | `applyVirtualWeight` | `RENDER_ERROR` (existing) | `Edge "<tail>-><head>" has a weight too large for the layout (weight x <t> exceeds the 32-bit integer limit); lower its weight attribute.` | `{ edge: string }` (original edge, `tail->head`) | `digraph{a->b->c->d; a->d[weight=600000000]}` (dot) | `src/layout/dot/classify.test.ts` |
| `lib/gvc/gvlayout.c#gvLayoutJobs#agerrorf#1` | `src/gvc/context.ts` | `GvcContext.layout` | `UNKNOWN_LAYOUT` (existing) | `Layout type "<name>" not recognized. Use one of: <registered engine names>.` | `{ layout: string }` | `graph{a--b; layout=nope}` (any engine) | `src/gvc/context.test.ts` |

## Verified current behaviour

| Row | Native (carried oracle) | Port today |
|---|---|---|
| x_cutval | exit 1, stderr `Error: overflow when computing edge weight sum` | renders svg, no error |
| virtual_weight | exit 1, stderr `Error: overflow when calculating virtual weight of edge` | renders svg, no error |
| gvLayoutJobs | stderr `Layout type: "nope" not recognized...` | throws `RenderError` `UNKNOWN_LAYOUT` `Layout type: "nope" not recognized` |

## Write-set for the next task (10 files)

- `src/errors.ts`, `src/errors.test.ts`
- `src/index.ts`, `src/error-contract.test.ts`
- `src/layout/dot/ns-range.ts`, `src/layout/dot/ns-range.test.ts`
- `src/layout/dot/classify.ts`, `src/layout/dot/classify.test.ts`
- `src/gvc/context.ts`, `src/gvc/context.test.ts`

## Not chosen (reason)

- `gvRender#agerrorf#1` (unknown format): port already throws a Node-style
  `TypeError` `ERR_INVALID_ARG_VALUE` from `checkRenderArgs`; an API contract.
- `RectArea` (label area overflow) and `xml_core` (malformed UTF-8): port
  already throws `RenderError`; no known input reaches them from a JS string.
- All `agerr`-and-recover sites: converting them to throws changes
  oracle-compared output and stderr.
