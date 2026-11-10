# issue-140 mission — observations (2026-11-10)

## Observation: a follow-up written from a doc comment, never probed, was false
- **Context**: #140 (follow-up 154) said `-Tjson` prints only this render's draw strings.
- **Finding**: it came from the doc comment on `drawStringsByObject` (`src/render/dot.ts:107`), which
  called the side table "what `-Tjson` reads via agxget". json's `emitAttrs` starts from the object's
  own attributes and overlays the re-parsed xdot text, which prints `renderedDraws`; both carry the
  stored strings. Native probes at planning and execution found no difference for nodes, edges,
  non-cluster subgraphs and unlabelled clusters.
- **Impact**: probe a follow-up's premise against native before planning a fix; a comment is not
  evidence of behaviour.
- **Confidence**: High

## Observation: a cluster's and the root's `_ldraw_` follow `GD_label`, not the buffer
- **Context**: an extra probe after the planned fixtures passed: an invisible cluster with a label
  and an input `_ldraw_`.
- **Finding**: `xdot_end_cluster` agxsets `_draw_` always and `_ldraw_` whenever `GD_label(cluster)`;
  `xdot_end_graph` sets the root's `_ldraw_` whenever `GD_label(g)`
  (`plugin/core/gvrender_core_dot.c:280-285,427-438`). Only `xdot_end_node` and `xdot_end_edge` test
  the buffer. The buffer is empty for an invisible cluster (`PEN_NONE` stops `gvrender_textspan`)
  and for a `"\n"` label (one empty span). `label=""` gives no `GD_label`. The port treats all four
  object kinds as non-empty-only for `_ldraw_` (`write-back.ts:136-146,159-166`, `dot.ts` `endGraph`,
  `agwrite.ts:362`), so it keeps a stored `_ldraw_` native clears, and prints no `_ldraw_=""` line on
  a fresh input. Not fixed: #196. Repro and native refs: `plans/issue-140-json-stored-draws/harness/`
  (`ldraw-*.gv`, `hide-cluster.c`).
- **Impact**: a "stored draw string" claim has four separate C rules (node/edge: non-empty buffer;
  cluster `_draw_`: always; cluster and root `_ldraw_`: `GD_label`; root `_draw_`: non-empty). A
  no-defect verdict needs a probe per rule; planning's fixtures had no labelled cluster that draws
  no text.
- **Confidence**: High (native xdot and json, single render and no-free second render)

## Observation: agwrite prints a cluster's `_ldraw_=""` only when it differs from the parent's
- **Context**: native xdot for the #196 fixtures.
- **Finding**: `ldraw-cleared.gv` and `ldraw-fresh.gv` print `_ldraw_=""` on the invisible labelled
  cluster; `ldraw-newline.gv` prints it on the root and no line on `cluster_n`, whose value equals the
  root's. json skips the empty value in every case.
- **Impact**: a fix for #196 needs the serializer's subgraph-value rule, not only "set it to empty";
  json's draw keys are equal either way, so a json-only check will not see the xdot line.
- **Confidence**: Medium (three fixtures; the agwrite rule was read from output, not from `write.c`)

## Observation: a comment-only `src/` change still changes the bundle
- **Context**: gate 5, base and head bundles after two comment edits.
- **Finding**: `cmp` reports a difference: esbuild keeps the doc comment on a class member
  (`drawStringsByObject`), while the comment on the `emitAttrs` function declaration is dropped.
  `diff` of the two bundles shows the two comment lines only; the smoke bytediff was 1960 of 1960
  identical.
- **Impact**: "bundles identical" is not the test for a comment-only change; diff the bundles and
  read what differs.
- **Confidence**: High

## Observation: survey rows with no native ref under dot, and `2371`'s cost
- **Context**: gate 6, `harness/draw-keys.mts` over 35 dot ids with `invis`/`layers`/`layerselect`.
- **Finding**: native exits with an error on `1323`, `2368`, `2368_1`, `2796`, `2825` and prints
  nothing inside 120 s on `2723`, `2621` and `share/examples/world.gv`, so 8 of the 35 rows compare
  nothing. `2371` needs native 52 s and the port's json 3 min 46 s (46,926 objects, 28 MB and 35 MB
  of json) at a load near 5: it does not fit a one-process probe with a 150 s cap, and was run as
  native-to-file, port-to-file, then a compare. `1435` (A4) and `2239` (0.01 in three arrowhead
  points) differ from native in coordinates on base and head alike.
- **Impact**: a draw-key survey over this list has 27 usable rows inside the cap; run `2371` apart.
- **Confidence**: High

## Observation: the complexity hook counts `??` and `?.` in `src/**/*.test.ts`
- **Context**: writing `src/render/json-stored-draws.test.ts`.
- **Finding**: `hooks/check-complexity.py` skips test directories by name, not `*.test.ts` files beside
  the source, so a test body with a dozen `port[1] ?? ''` reads was blocked at CCN 16. Helpers that
  throw on a missing element (`at`, `keyed`, `named`) keep each body at CCN 1. Calling the hook
  script by hand with `--help` blocks on stdin.
- **Impact**: in colocated tests, index through a throwing helper instead of `??` defaults.
- **Confidence**: High
