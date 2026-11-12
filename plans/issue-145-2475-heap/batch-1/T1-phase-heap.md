# T1: per-phase live heap, port and native

## Context

[README](../README.md#objective), [decisions.md](../decisions.md) AD-1. The port's dot
path is `renderSvg` (`src/index.ts:92`): `parse` → `ctx.layout` → `deviceRender` →
`ctx.freeLayout`. The layout phases are in `dotLayoutPipeline`
(`src/layout/dot/index.ts:253-270`): `dotRank`, `dotMincross`, `dotPosition`, then
`dotSameports` and `dotSplines` (`:163-164`), and `dotCompoundEdges` when `compound` is
set (`:171`; `2475_1` does not set it, planning grep). The C counterparts are in
`~/git/graphviz/lib/dotgen/dotinit.c` (`dotLayout`, `doDot`) and `cmd/dot/dot.c`.

## Steps

1. `bash plans/issue-145-2475-heap/harness/prefix.sh $TMPDIR/issue-145 100 200 400 800 1600`.
   Record lines, node and edge counts.
2. **Port markers.** Add a small marker helper (`globalThis.gc?.()`, then one stderr line
   `PHASE <name> heapUsed=<MB> rss=<MB>`) at each AD-1 phase point. Save the diff as
   `harness/markers.patch` and keep the tree clean between runs
   (`git apply` / `git apply -R`).
3. Run c400, c800, c1600 with
   `/usr/bin/time -l node --expose-gc --trace-gc --import tsx test/corpus/render-one.ts <prefix> dot > out.svg 2> phase.log`.
   From `--trace-gc` record the largest heap before a mark-compact inside each phase (the
   peak a forced GC at the marker cannot see). Check load first (README).
4. **Native.** Build the instrumented copy (AD-1) in `$TMPDIR/gv-145`; print
   `malloc_zone_statistics(NULL, &s).size_in_use` at the same phase points. Confirm its
   c800 SVG equals the oracle's (`GVBINDIR=/tmp/ghl ~/git/graphviz/build/cmd/dot/dot`).
   Run c400, c800, c1600. Revert nothing in `~/git/graphviz`: it is read-only.
5. Write the table and the two phase names (peak, fastest-growing ratio) to the journal.
   Also confirm or refute the lead (about 300 MB freed at once at the end of c800): name
   the phase it belongs to.
6. `git apply -R` the markers. Commit `docs(T1): record issue-145 per-phase heap` with
   `harness/markers.patch`, any native patch as `harness/native-markers.patch`, and the
   journal.

## Write-set

`plans/issue-145-2475-heap/harness/**`, `plans/issue-145-2475-heap/decision-journal.md`.
`src/` only through the temporary patch, never committed.

## Read-set

`src/index.ts:80-110`, `src/layout/dot/index.ts:150-345`, `test/corpus/render-one.ts`,
`~/git/graphviz/lib/dotgen/dotinit.c`, `~/git/graphviz/cmd/dot/dot.c`,
`~/git/graphviz/build/CMakeCache.txt` (flags only).

## Acceptance criteria

- Given c400, c800 and c1600, when T1 is done, then the journal holds port and native live
  bytes at every AD-1 phase point for all three sizes.
- Given the instrumented native, when it renders c800, then its SVG equals the oracle's.
- Given the T1 commit, when `git diff 59a5b3ee -- src` runs, then it is empty.

## Observability / rollback

Observability: N/A (measurement only). Rollback: reversible; nothing under `src/`.
