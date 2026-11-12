# issue-189 mission — observations (2026-11-10)

## Observation: an sgd probe with coincident nodes only tests `mag == 0` if the shuffle lets it
- **Context**: #189 swapped `Math.hypot` for `libmHypot` at `sgd.c:223`. The brief recorded two
  planning probes with coincident and pinned nodes as equal to native, and left the port's
  `if (mag === 0) continue;` (no C counterpart) alone.
- **Finding**: `graph G { mode=sgd; a [pos="0,0"]; b [pos="0,0"]; a -- b; }` gives `nan`
  coordinates on native 16.1.0 (`r = -inf`, `r * dx = nan`) and a finite layout on the port.
  `a [pos="0,0"]; b [pos="0,0"]; c; a -- c; b -- c` equals native: the shuffled term order applies
  `(a,c)` or `(b,c)` first, so `a` and `b` have moved apart before their own term runs. A probe
  reaches `mag == 0` only when a coincident pair's term comes before any other term that moves
  either node (always true when the pair is the whole graph).
- **Impact**: probe the guard with a two-node graph, not a larger one. Removing the guard alone is
  not enough: the port then prints `NaN` in `-Tplain` and `bb="0,0,0,0"`, where native prints
  `nan` and `0,0,-4.295e+09,-4.295e+09` (#208).
- **Confidence**: High

## Observation: `/tmp/ghl` has no neato plugin
- **Context**: gate 6 needed native `-Kneato`.
- **Finding**: `/tmp/ghl` holds core and dot_layout only. A plugin dir under `$TMPDIR` with
  symlinks to `build/plugin/{core,dot_layout,neato_layout}` and `GVBINDIR=<dir> dot -c` passes
  `oraclePreflight` for neato and writes nothing outside `$TMPDIR`.
- **Impact**: a neato/fdp/sfdp queue mission builds its own plugin dir; the recipe is in
  `plans/issue-189-sgd-libm-hypot/batch-1/T1-sgd-libm-hypot.md`.
- **Confidence**: High
