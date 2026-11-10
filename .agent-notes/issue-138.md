# issue-138 mission — observations (2026-11-10)

## Observation: twice.c silences stderr, so a stderr probe needs a copy without agseterr
- **Context**: no-free probes of the once-only warning statics (`emit_once`, `UserShape`, `parseSegs`).
- **Finding**: `plans/post-16-1-followups-9/harness/T11/twice.c:137` calls `agseterr(AGMAX)`, so native
  prints no warning at all through it. A `$TMPDIR` copy with that line gated on an env var prints them.
- **Impact**: a stderr comparison through the stock `twice-native` reads "native warns 0 times" for
  every input. Build the copy before counting warning lines.
- **Confidence**: High

## Observation: skipping the resets after layout 1 splits "the reset" from every other no-free cause
- **Context**: deciding whether a no-free difference comes from a registered reset.
- **Finding**: a scratch edit of `src/common/render-state.ts` that skips the resets (all, or all but a
  kept set of indexes) once the first `resetRenderState` call has run, driven by a `globalThis` flag,
  turns the question into one run. On every N probe the port's stderr then equalled native's. Three
  differences stayed with the resets off, so they are not reset matters: the stale node label (#190),
  the anchor ids (#191, a second reset at `src/gvc/device.ts:507`) and the neato KK bb (#193).
  Registration order (the index) is module evaluation order; print `resets.map(String)` to read it.
- **Impact**: use it before reading a no-free delta as a static. Revert the edit with
  `git checkout src/common/render-state.ts` before any gate.
- **Confidence**: High

## Observation: /tmp/ghl serves dot only; other engines need a plugin dir of their own
- **Context**: oracle preflight for the neato and fdp probes.
- **Finding**: `/tmp/ghl` links the core and `dot_layout` plugins (ADR-0001 AD-10), so
  `-Kneato` answers `There is no layout engine support for "neato"`. A `$TMPDIR` dir with symlinks to
  `build/plugin/{core,dot_layout,neato_layout}/libgvplugin_*.dylib` plus `GVBINDIR=<dir> dot -c`
  passes the preflight for all eight engines, and its dot output equals `/tmp/ghl`'s.
- **Impact**: `src/gvc/__fixtures__/rerender/regen.sh` needs such a dir ("full plugin dir"); the
  `ghl16-all` one part 11 used is gone.
- **Confidence**: High

## Observation: native dot fails most no-free relayouts of cluster graphs, and the port throws there
- **Context**: sweep of graphviz `tests/graphs` plus the rerender fixtures, three dot layouts, no free.
- **Finding**: the port throws in layout 2 or 3 on 86 of 275 inputs (63 `reading 'par'`, 22
  `reading 'info'` of null, 1 `reading 'ht1'`). Native fails on the same 86: 84 segfault, 2 return
  an error from `gvLayout`. The other 188 complete on both sides.
- **Impact**: a no-free probe input with clusters usually has no native reference
  (`nestedclust.gv` is an exception). Pick inputs without clusters, or check native finishes first.
- **Confidence**: High for the counts; native's crash sites were not traced.

## Observation: a node label is not made again on a no-free relayout
- **Context**: stderr probes of label-time warnings (HTML cell size, missing image, font metrics).
- **Finding**: `buildNodeLabel` (`src/common/poly-init.ts:94`) returns early when `n.info.label` is
  set, and `commonInitNode` calls it at layout time, so layouts 2 and 3 keep the stale label and
  print none of its warnings; C's `common_init_node` (`utils.c:441`) makes it again. Edge labels are
  made again. Filed as #190 with a native label-change repro.
- **Impact**: probe label-time warnings with an edge label until #190 lands; a node label reports
  "once" whatever the static under test does.
- **Confidence**: High

## Observation: process-killing wrappers around `npx tsx` and `xargs`
- **Context**: sweeping 276 inputs with a per-input time limit.
- **Finding**: `perl -e 'alarm N; exec @ARGV' npx tsx ...` kills `npx` but leaves its `node` child
  running, and `xargs` stops the whole run when a child dies on a signal. Forking, `setpgrp`, and
  `kill -9, $pid` (the group) on the alarm ends the run; `|| true` keeps `xargs` going.
- **Impact**: three inputs (`b100.gv`, `b104.gv`, `ldbxtried.gv`) run for minutes on a no-free dot
  relayout in the port; without the group kill they outlive the sweep.
- **Confidence**: High

## Observation: violations in files this mission did not edit
- **Context**: reading `graph-init.ts` for the `State` row.
- **Finding**: `src/common/graph-init.ts:341-342` says `State = GVBEGIN` is skipped because the
  `State` machine "is not ported". It is: `src/common/layout-state.ts`, written by
  `layout/dot/splines.ts:467,492` and `layout/neato/splines.ts:825,829`, read at
  `common/postproc.ts:227`; the registered reset is the `GVBEGIN` assignment.
- **Impact**: comment only; fix it with the next change to that file.
- **Confidence**: High
