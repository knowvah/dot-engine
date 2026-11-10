# issue-132 mission — observations (2026-11-10)

## Observation: native aborts freeing the layout of a subgraph with an HTML graph label
- **Context**: capturing native refs for a subgraph render (`plans/issue-132-svg-graph-anchor-id/
  harness/subg-html.gv`, subgraph `s` with `label=<<table>...>`), with part 10 T15's
  `subg-after-free.c` on the 16.1.0 oracle.
- **Finding**: `gvLayout(gvc, s, "dot")` and `gvRenderData` succeed and the output is complete, then
  `gvFreeLayout(gvc, s)` dies: `malloc: *** error for object 0x...: pointer being freed was not
  allocated`, backtrace `gvFreeLayout` -> `free_label` (`lib/common/labels.c:204-215`, through
  `graph_cleanup`). Exit 134 (SIGABRT) in the default (`free`) mode, 133 (SIGTRAP, `mfm_free`) in
  `subonly` and `nofree`, so the root's layout and free are not needed. `subg-url.gv` (same
  subgraph, no HTML label) exits 0. Not diagnosed further (upstream).
- **Impact**: a native ref for a subgraph with an HTML label must be captured before the free
  (`show()` flushes, so the file is complete; ignore the exit status and check the render count,
  as the issue-132 `regen.sh` does). The port renders and frees the same case without error.
- **Confidence**: High (every run: free 6, subonly 3, nofree 1; backtrace from lldb)

## Observation: the corpus has five roots that print a graph anchor, and none with HTML-label anchors
- **Context**: choosing gate 6 ids for a change to the graph's `obj.id`.
- **Finding**: of the 950 applicable ids, native `-Tsvg` prints a `<g id="a_graph0">` anchor on four
  (`tree-tclpkg-tcldot-examples-data-demo`, `tree-tclpkg-tcldot-examples-data-poly`, `1880`,
  `graphs-url`); `2258` has a root `tooltip` and `id` and prints the area in cmapx only. No root has
  an HTML graph label whose cells carry `href`/`title`/`id`, and no input sets `layers` with a
  root anchor. Probes on those paths found six defects the corpus cannot see (#176-#181).
- **Impact**: the corpus survey does not cover graph-level anchors, map ids or layer prefixes;
  a change there needs probe inputs, and cmapx conformance on those paths is unmeasured.
- **Confidence**: High

## Observation: `lldb -b -o run -o bt` prints one frame after a crash
- **Context**: backtrace of the abort above.
- **Finding**: batch mode stops running `-o` commands once the process crashes; `-k bt -k quit`
  (commands to run on a crash) prints the whole stack.
- **Impact**: use `-k` for crash backtraces in headless sessions.
- **Confidence**: High
