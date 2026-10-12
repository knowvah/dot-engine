# T3 — Triage: what in 15.0.0-82 → 16.1.0 must the port mirror

**Agent:** cpp-pro (model: opus). Research only — no `src/` edits.
**Depends on:** T0, T2. **Rollback:** Reversible.
**Observability:** N/A — produces the work list.

## Context

AD-2, AD-3. Range: `git -C ~/git/graphviz log 9d6e3abfd..16.1.0` (519 commits,
148 files in lib/plugin/cmd). Ignoring whitespace, the biggest churn:
`lib/dotgen/mincross.c` (clang-format + leak/failure fixes), `lib/common/htmllex.c`,
`lib/gvc/gvconfig.c`, `lib/ortho/partition.c` (error plumbing),
`plugin/core/gvloadimage_core.c`, `lib/sfdpgen/post_process.c`,
`lib/neatogen/quad_prog_vpsc.c`, `lib/xdot/xdot.c`, `lib/label/xlabels.c`. Known
behaviour changes: `f0d07786b` (HTML table cell/border emission order),
`dot_splines_` returning `orthoEdges` rc, svg renderer `svgid`, `eec5068a6`
(topsort crash), `1ae5c03b7` (cleanup1 use-after-free). Oracles: 15.x
`~/git/graphviz-15/build/cmd/dot/dot` + `/tmp/ghl15`; 16.1
`~/git/graphviz/build/cmd/dot/dot` + `/tmp/ghl`. Port source map: `CLAUDE.md`
"C Source Map"; port lives in `src/`. Do not modify either graphviz tree. Use a
scratchpad copy for instrumentation (`.agent-notes/pt-tracker-2-observations.md`:
the DYLD/plugin-swap technique; use `objdump`, not `otool`).

## Task

1. Classify every commit: `port` (changes observable behaviour of code the port
   mirrors: layout, render output, warnings/errors, exit status/return codes),
   `refactor` (no behaviour change: format, const, rename, leak/free-only on
   success paths, internal API moves), or `outside` (cmd/gvmap, smyrna, gvedit,
   gdiplus, gd, vt, tk, fig, and other plugins/tools the port does not have; check
   `src/` before calling something outside). Use one row per commit; a run of
   same-topic refactor commits may share a row.
2. Native corpus diff: render every `corpus-manifest.json` input on both oracles.
   Do dot `-Tsvg` for all of them, plus each engine/format pair the walks use
   (`test/corpus/*-walk.ts`). Diff with the repo comparators at the walk
   tolerance. List every id+engine+format whose native output moved.
3. Explain every moved id with ≥1 `port` row. Bisect over the commit range with a
   scratchpad build when reading the diff is not enough. An unexplained moved id is STOP 5.
4. Map each `port` row to the port target (`src/` file + function) and to an
   area task: T7 HTML, T8 dotgen+ortho, T9 renderers, T10 force engines + label,
   T11 shared (cgraph/util/gvc/common non-HTML).

## Interface contract (consumed by T7–T11)

`.agent-notes/gv16-triage.md`, front-loaded:
- Summary table: per area task, the row count and the corpus ids moved.
- Rows: `| commit | C file:function | class | behaviour change (1 line) | port target src path:fn | ids moved (engine/format) | area |`
- An "Unexplained" section, which must be empty.

## Acceptance

- Given all 519 commits, then each has exactly one class.
- Given the native diff, then every moved id appears in ≥1 `port` row.
- Given each `port` row, then it names a port target and one area task.

## Write-set

`.agent-notes/gv16-triage.md` (hand back observations; the orchestrator journals).

## Commit

`docs(notes): triage graphviz 16.1.0 behaviour changes for the port`
