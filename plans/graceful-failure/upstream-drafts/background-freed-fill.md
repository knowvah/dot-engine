<!-- SPDX-License-Identifier: EPL-2.0 -->
# Upstream draft: background-freed-fill (T10, A13)

Status: fork issue filed, fork branch pushed, no MR (stop 11). The maintainer
reads every line before anything goes to graphviz/graphviz.

- Fork issue: https://gitlab.com/sseely/graphviz/-/work_items/2
- Fork branch: `fix/background-freed-fill` (sseely/graphviz)
- Commits (on `upstream/main` 3d49611e3): test `6b2172593`, fix `499e61591`
- Duplicate check on graphviz/graphviz (issues and MRs, `--all`): "background",
  "_background", "use after free fill", "emit_background", "freed fill",
  "gradient bgcolor free". Hits were unrelated (#2325, #126, #1319, #426,
  !4912 and others); no duplicate.

## Upstream issue text

Title: svg: emit_background releases a gradient stop colour the _background replay still uses

### Summary

`emit_background` releases the gradient stop colours while the SVG render state
still points at the first one. A `_background` drawing that follows, whose first
filled shape sets no fill colour, prints that freed string as its fill.
AddressSanitizer reports a heap-use-after-free.

### Reproducer

`bg.gv`:

```dot
graph { bgcolor="red:blue"; _background="P 3 0 0 0 40 40 40 "; }
```

```
dot -Tsvg bg.gv
```

Observed with an unmodified 16.1.1 build (8 runs): the shape is printed as
`<polygon fill="" ...`, `<polygon fill=":" ...` or similar garbage, depending on
what the freed bytes hold; exit status 0 every time. With
`-fsanitize=address` at `upstream/main` 3d49611e3:

```
ERROR: AddressSanitizer: heap-use-after-free on address 0x60200004e690
READ of size 1 at 0x60200004e690 thread T0
    #0 strcmp
    #1 svg_print_paint gvrender_core_svg.c:123
    #2 svg_grstyle gvrender_core_svg.c:185
    #3 svg_polygon gvrender_core_svg.c:700
    #4 gvrender_polygon gvrender.c:551
    #5 emit_xdot emit.c:1362
    #6 emit_background emit.c:1502
freed by thread T0 here:
    #1 emit_background emit.c:1492
previously allocated by thread T0 here:
    #2 findStopColor emit.c:4280
    #3 emit_background emit.c:1475
```

Expected: the shape takes the fill colour `emit_background` set, the first
stop, so `<polygon fill="red" ...`.

### Mechanism (upstream/main 3d49611e3)

- `lib/common/emit.c:1475` `findStopColor` copies each stop colour with
  `gv_strdup` (line 4280) into `clrs[0]` and `clrs[1]`.
- `emit.c:1477` `gvrender_set_fillcolor(job, clrs[0])` stores a colour in
  `job->obj->fillcolor`. `gvrender_resolve_color` (`lib/gvc/gvrender.c:193`) sets
  `color->u.string = name`, and the SVG engine knows `red` by name, so the
  colour keeps pointing at `clrs[0]`.
- `emit.c:1492` frees `clrs[0]` and `clrs[1]`.
- `emit.c:1502` `emit_xdot` replays the `_background` ops. A filled polygon
  with no preceding fill-colour op calls `svg_polygon`, which reads
  `obj->fillcolor` (`gvrender_core_svg.c:123`, `strcmp(color.u.string, ...)`),
  and so the freed bytes.

Nothing in the repro is specific to polygons: any filled shape in the replay
that has not set its own fill reads it.

### History

`git log -S'free (clrs[0])' -- lib/common/emit.c` finds 3cb90cb43 (Emden
Gansner, 2012-01-23, "First pass at cleaning up gradient fill"), which added the
`free (clrs[0]); free (clrs[1]);` to `emit_background`. The xdot replay at the
end of `emit_background` came earlier, in 3350f3e6d (2009-07-30, "Add prototype
implementation for background polygons"). The frees are unchanged since, apart
from db56d651e (clang-format). The window of exposure opened in 2012.

### Fix

Release the colours after `emit_xdot`. Branch:
https://gitlab.com/sseely/graphviz/-/tree/fix/background-freed-fill
(test 6b2172593, fix 499e61591). The test is `test_background_freed_fill` in
`tests/test_regression.py`; it is xfail(strict) before the fix (the ASan build aborts with SIGABRT; on a
non-ASan 16.1.1 build the regex for `fill="red"` did not match in 3 of 3 runs)
and passes after.

### Checked

- Duplicates: searched graphviz/graphviz issues and MRs for "background",
  "_background", "use after free fill", "emit_background", "freed fill",
  "gradient bgcolor free". No match.
- `upstream/main` 3d49611e3 still has the bug.
- ASan run of the repro and of `bgcolor="red:blue"` with no `_background`:
  clean after the fix.

### Not checked

- Other output formats. Only `-Tsvg` was run.
- Platforms other than macOS arm64 (Apple clang, ASan).
- A `_background` that sets its own fill colour first: not run (by reading the
  code it overwrites the state before any read; unverified).
- The whole test suite; only the new test and the repro.

dot-engine port behaviour: the port prints the first stop (`fill="red"`), the
colour C meant. Documented as divergence A13 in dot-engine.

## MR description (style of !5152)

Title: fix a use-after-free of the gradient fill colour in the SVG background replay

Fixes #<upstream issue number>.

`emit_background` (`lib/common/emit.c`) copies the stop colours of a gradient
`bgcolor` with `findStopColor`, sets the first as the fill colour with
`gvrender_set_fillcolor`, draws the background box and frees both colours. The
SVG render state does not copy a colour it recognises by name
(`gvrender_resolve_color` keeps `color->u.string = name`, `lib/gvc/gvrender.c`),
so the fill colour still points at the freed string. `emit_background` then
replays the graph's `_background` drawing with `emit_xdot`. A filled shape in
it that sets no fill colour of its own takes the state left behind, and
`svg_print_paint` reads the freed string.

Repro:

```
$ echo 'graph { bgcolor="red:blue"; _background="P 3 0 0 0 40 40 40 "; }' | dot -Tsvg
...
<polygon fill="" stroke="none" points="0,0 0,-40 40,-40 0,0"/>
```

The shape should be filled `red`, the first stop. Under AddressSanitizer
(upstream `main` at 3d49611e3):

```
ERROR: AddressSanitizer: heap-use-after-free
READ of size 1 ...
    #1 svg_print_paint gvrender_core_svg.c:123
    #5 emit_xdot emit.c:1362
    #6 emit_background emit.c:1502
freed by thread T0 here:
    #1 emit_background emit.c:1492
```

The frees were added in 3cb90cb43 (2012), after the replay (3350f3e6d, 2009).

The fix releases the colours after `emit_xdot`. `clrs` moves to function scope
so both paths of the `if` see it; on the non-gradient path it stays zeroed and
`free(NULL)` is a no-op.

The test is `test_background_freed_fill` in `tests/test_regression.py`, added
first as `xfail(strict=True)`.

## Maintainer must read every line

- [ ] The repro and the ASan excerpt above reproduce for you at upstream/main.
- [ ] `lib/common/emit.c`: `clrs` hoisted to function scope; the two `free`
      calls moved after `emit_xdot`; no other change to `emit_background`.
- [ ] After the move the render state still dangles once `emit_background`
      returns (the fill colour points at freed memory until the next
      `gvrender_set_fillcolor`). Not shown to be read anywhere later; not
      checked across all renderers and all later emit paths.
- [ ] `tests/test_regression.py`: the test reads `dot("svg", ...)` as `str`;
      the xfail run was checked to fail for the right reason (SIGABRT under
      ASan; the regex does not match without ASan).
- [ ] `CHANGELOG.md` entry wording; issue number to fill in once upstream
      assigns one (fork issue is #2, the test is named descriptively).
- [ ] Commit messages: carry the `Co-Authored-By` trailer mirroring `c5960b0b7`.
- [ ] Not run: other output formats, other platforms, the full test suite,
      `clang-format-19` (formatted with clang-format 23.1.6, no diff on
      `emit.c`).
- [ ] Ban policy: you have read and understood every line before any upstream
      MR or issue.
