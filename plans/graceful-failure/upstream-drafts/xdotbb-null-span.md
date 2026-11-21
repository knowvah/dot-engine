<!-- SPDX-License-Identifier: EPL-2.0 -->
# xdotbb-null-span: NULL `span` dereference in `emit_xdot` (not `xdotBB`)

Status: fork branch pushed, fork issue filed (https://gitlab.com/sseely/graphviz/-/work_items/1,
no MR).

- Fork branch: `fix/xdotbb-null-span` (origin), base `upstream/main`
  `3d49611e3e743f46b85cae91fe672fb85d5c7b31`
- Shas (unsigned): test `59f488ca3` (xfail strict), fix `10f6f15fd`
- Push: `* [new branch] fix/xdotbb-null-span -> fix/xdotbb-null-span`
  (via `-c credential.https://gitlab.com.helper='!glab auth git-credential'`;
  the default osxkeychain helper had no gitlab credential in this shell)

## Duplicate check (graphviz/graphviz, read-only)

Issues and MRs searched for "xdot segfault", "xdotBB", "xdot NULL span",
"_draw_ text crash". Issues: 3 unrelated hits for "xdot segfault" (#1908,
#686, #529, none about xdot); the rest no hits. MRs: no hits.

## Re-keying note for the registry row

The recorded site `xdotBB` (`neatoinit.c:560`) is wrong. `neatoinit.c:560` is
the only call of `xdotBB`. The crash is **`gvrender_textspan`
(`lib/gvc/gvrender.c:419`) called from `emit_xdot` (`lib/common/emit.c:1386`)**
with `op->span == NULL`. The `neato -n` claim also needs refinement: with a
preceding `F` op, `neato -n` works; with a `T` op and no `F` op, `neato -n`
fails separately (`textspan_size` asserts `font->name`, `textspan.c:82` in
Debug; pristine 16.1.1 exits 139).

## Upstream issue text

A `T` (text) operation in a graph's `_draw_` or `_background` makes `dot` (and every layout except `neato -n`) segfault while rendering.

### Repro

`r.gv`:

```dot
digraph{_draw_="T 10 10 0 20 1 -a ";a}
```

```
dot -Tsvg r.gv > /dev/null
```

Observed: exit 139 (5 of 5 runs, pristine 16.1.1 Release build; also `-Kneato`). `graph{_background="T 10 10 0 20 1 -a "}` crashes the same way.
Expected: no crash. The node label `a` is drawn.

### Mechanism (upstream/main 3d49611e3)

`lib/common/emit.c:1386` in `emit_xdot` passes `op->span` to `gvrender_textspan` for every `xd_text` op. `op->span` is only allocated in `xdotBB` (`emit.c:3153`), and the only caller of `xdotBB` is `init_nop` (`lib/neatogen/neatoinit.c:560`, i.e. `neato -n` with a background). For any other run the span is NULL and `gvrender_textspan` (`lib/gvc/gvrender.c:419`) dereferences it.

Instrumented (temporary `fprintf` before `emit.c:1386`, ASan Debug build of upstream/main):

```
T11 trace: op=0x60c0000004c0 span=0x0 kind=7 text=a
```
(`kind=7` is `xd_text`.) Under `neato -n` with a preceding `F` op: `span=0x6070000013d0`, no crash.

ASan:

```
==8316==ERROR: AddressSanitizer: SEGV on unknown address 0x000000000000 ... READ memory access
    #0 in gvrender_textspan gvrender.c:419
    #1 in emit_xdot emit.c:1386
    #2 in emit_background emit.c:1502
    #3 in emit_page emit.c:3603
    #4 in emit_graph emit.c:3663
    #5 in gvRenderJobs emit.c:4239
    #6 in main dot.c:71
```

So the crash is in `gvrender_textspan` via `emit_xdot`, not in `xdotBB`; `xdotBB` is where the span is meant to be set.

### History

`git log -S'op->span' -- lib/common/emit.c` shows only `ee6f402f0` (rename para -> span), `c5fc476af`, `a724a5af5`, `fc6a990b3`. `git log -S'xdotBB' -- lib/common/emit.c` shows `d1a991fd2` (fonts in background output), `329ffe291` (move background xdot from gvc to GD_drawing), `3350f3e6d` (prototype background polygons). I did not bisect which of these first made the NULL reachable.

### Checked / not checked

Checked: no matching issue or MR on graphviz/graphviz (searched "xdot segfault", "xdotBB", "xdot NULL span", "_draw_ text crash"); upstream/main still has the unguarded call; ASan and the trace above; `neato -n` with `F ... T ...` still draws the text (new test).
Not checked: other formats than svg; other `_draw_`-style attributes on nodes/edges/clusters; other platforms.

Separate defect noticed, not fixed here: `neato -n` with a `T` op and no preceding `F` op asserts `font->name` in `textspan_size` (`textspan.c:82`, Debug) and presumably crashes in Release (pristine 16.1.1 `neato -n` exits 139 on `digraph{_draw_="T 10 10 0 20 1 -a ";a[pos="10,10"]}`; I did not isolate the Release crash site).

### Fix

Branch: https://gitlab.com/sseely/graphviz/-/tree/fix/xdotbb-null-span (2 commits: xfail test, then fix skipping the op when `op->span` is NULL).

dot-engine port behaviour: the port draws no text for a graph `_draw_` `T` op (renders the node label only) and does not crash.

## MR description (style of !5152)

common emit_xdot: fix: skip text without a prepared span

`emit_xdot` passed `op->span` to `gvrender_textspan` for every `T` operation.
`op->span` is only set by `xdotBB`, which only `neato -n` calls, so a `T`
operation in a graph `_draw_` or `_background` under any other layout passed a
null pointer. AddressSanitizer reports a null dereference in
`gvrender_textspan`, called from `emit_xdot`. Skip the operation when it has no
span; `neato -n` output is unchanged.

The tests run the crashing graph with `dot`, and `neato -n` with a font (`F`)
and text (`T`) operation, which must still draw both labels.

Gitlab: fixes #<upstream issue number>

## Evidence

- xfail before: `test_xdot_graph_text_without_span XFAIL` on the fork ASan
  build at `59f488ca3`; `test_xdot_graph_text_neato_n PASSED`.
- After fix (`10f6f15fd`): both PASSED.
- Lint: black, isort `--profile=black`, pylint `--rcfile=.pylintrc
  --disable=fixme` clean. clang-format 23.1.6 (CI wants 19, not installed)
  reports `emit.c` clean.

## Maintainer must read every line

- [ ] `lib/common/emit.c` `emit_xdot`: `op->span != NULL &&` guard and comment
      (the choice is to draw nothing; the alternative is to prepare a span)
- [ ] `tests/test_regression.py`: two tests; the second needs `neato`
- [ ] `CHANGELOG.md`: entry has no issue number yet
- [ ] Not fixed: `neato -n` with `T` and no `F` op
- [ ] Commit trailers and wording are the maintainer's to confirm
