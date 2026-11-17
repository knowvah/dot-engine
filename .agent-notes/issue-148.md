# issue-148 mission — observations (2026-11-16)

## Observation: a revert test needs one recompiled object, not a graphviz build
- **Context**: attributing corpus `2783` to one of two `lib/ortho` commits in `16.1.0..16.1.1`.
- **Finding**: the oracle build links `lib/common`, `lib/pack` and `lib/ortho` into
  `libgvc.7.0.15.dylib` from object libraries (`build/lib/ortho/CMakeFiles/ortho_obj.dir/*.c.o`),
  not into the layout plugins. Compile the edited source with the flags in
  `ortho_obj.dir/flags.make`, run `build/lib/gvc/CMakeFiles/gvc.dir/link.txt` from `build/lib/gvc`
  with `-o` and the one object path pointed at `$TMPDIR`, symlink `libgvc.7.dylib` beside it, and
  run the oracle `dot` with `DYLD_LIBRARY_PATH=<that dir>`. About 10 s; the oracle tree is only
  read. Always build a control (the unmodified source) the same way and check it is byte-identical
  to the oracle before reading the variant. `DYLD_PRINT_LIBRARIES=1` confirms which libgvc loaded.
- **Impact**: reuse `plans/issue-148-corpus-1611-inputs/harness/2783-revert-test.sh` as the template
  for single-commit attribution in `lib/common`, `lib/pack`, `lib/ortho`. A change in
  `lib/dotgen` or `lib/neatogen` needs the plugin's `link.txt` instead.
- **Confidence**: High

## Observation: the old oracle cannot attribute upstream's regression inputs
- **Context**: T3 used native 16.1.0 as the "did native move" half of each pair.
- **Finding**: native 16.1.0 dies on a signal (SIGSEGV or SIGBUS) on 24 of the 36 inputs 16.1.1
  adds; they are regression tests for crashes 16.1.1 fixed. Only `2758`, `2783`, `2821_*`, `2841`,
  `2860*`, `2866`, `2870_*` render on both.
- **Impact**: for a new upstream input, attribution is the port's throw site or first differing
  line against the new oracle plus the C change, not an old/new native pair.
- **Confidence**: High

## Observation: a failed native layout still writes a complete file
- **Context**: `2758`, `2776_1`, `2781*` (aux edge too long), `2783` (ortho failure).
- **Finding**: when 16.1.1's `dot_position` or `dot_splines_` fails, `dot` prints the error, exits
  1 (0 for the ortho failure) and still emits a complete SVG and xdot of the unpositioned graph
  (8×8 pt canvas, nodes at 0, no edges, or untranslated coordinates). The walkers key validity on
  completeness, so these are scored references, not `oracle-error` rows.
- **Impact**: a port of a "fail the layout" change must reproduce that output, not throw. #162's
  text says "no output"; the measurement on #162 corrects it.
- **Confidence**: High

## Observation: C reads past `P->nbox`; the port's box array has nothing there
- **Context**: the port's `InternalError … reading 'll'` on `2773*`, `2774*`, `2776*`, `2780`.
- **Finding**: `add_box` drops degenerate boxes, so a path can reach `adjustregularpath` with
  `nbox = 0` while the loop still indexes `[fb-1, lb]`. C reads inside the array `dot_splines_`
  preallocates (`dotsplines.c:338`); the port's `P.boxes` is a JS array grown by `addBox`, so the
  same read is `undefined` (`src/layout/dot/edge-route-faithful.ts:289`).
- **Impact**: another form of the "C calloc zeroes it" hazard: an index past the logical length of
  a preallocated C array. Look for it wherever a C loop bound is computed from counts rather than
  from `nbox`.
- **Confidence**: High (traced copy of `src/`); what C reads there (zeroes or a previous edge's
  boxes) is not yet traced.

## Observation: image inputs are compared on the missing-file path only
- **Context**: `2821_0` diverged with cwd = `tests/` and was conformant from the repository root.
- **Finding**: the walkers spawn native with an absolute input path from the repository root, and
  `render-one*.ts` registers no image sizer, so a relatively named image is found by neither side.
  With `setImageSizer(() => ({ w: 1, h: 1 }))` the port equals native's image-present output.
- **Impact**: do not read a `tests/`-cwd divergence on an image input as a port defect; see #226.
- **Confidence**: High

## Observation: the oracle-path fitness test also reads test data
- **Context**: a new `corpusRootMd` test spelled the real corpus root as a string literal.
- **Finding**: `gvbindir-defaults.test.ts` flags any quoted literal under `test/` containing
  `git/graphviz-16`, `git/graphviz/build` or `/tmp/ghl`, test data included.
- **Impact**: in tests use a synthetic path (as `corpus-links.test.ts` does) or import the constant.
- **Confidence**: High
