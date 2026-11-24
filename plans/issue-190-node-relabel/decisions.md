# Decisions: issue #190

This was an unattended planning run, so every decision was auto-confirmed.
The evidence for each is in [harness/](harness/). Base `67f46a36`.

## Mechanism (planning's diagnosis)

- **Mechanism.** `buildNodeLabel` returns early when `n.info.label` is set.
  `initNodeFromLabel` (`commonInitNode`) calls it at layout time, so a layout
  that meets the previous layout's record (no `freeLayout` between them) keeps
  the stale label. C's `common_init_node` makes `ND_label` again on every
  layout (`lib/common/utils.c:400-401`, 16.1.1).
- **Origin.** `src/common/poly-init.ts:94`, the guard; reached from
  `src/common/nodeinit.ts:261`.
- **Causal chain.** Layout 2 skips `makeAnyLabel`, so the node keeps layout 1's
  `TextlabelT` (text, `dimen`) and `polySize` sizes the node from it: the
  issue's `node a 0.42153 ... short`. `makeHtmlLabelTo` does not run either,
  so the HTML sizing warnings (`htmltable.ts` `sizeWarned`, `missingImages`)
  print once in three layouts where native prints them three times.
- **Ruled out.**
  - The registered per-render resets: #138's reset-skip check left the
    `htmlsize` stderr at 1 of 3 (`.agent-notes/issue-138.md`).
  - Records: `recordMakeLabel` (`src/common/record.ts:418`) already runs on
    every layout. On the base the `relabel-record` probe's stdout is identical
    to native on 7 of 8 engines. The eighth is patchwork, which sets
    `shape=box` on every node (`lib/patchwork/patchworkinit.c:76`), so the
    record input takes the poly path and the guard. The prototype fixes it.
  - Node xlabels: `initNodeXLabel` (`src/common/nodeinit.ts:183`) makes the
    xlabel on every layout when the attribute is non-empty, as C does.
    Clearing an xlabel is a different defect (#279, AD-4).
  - The flat-adjacent aux graph: `cloneNode` (`src/layout/dot/splines-clone.ts:37`)
    makes fresh nodes with no label, so the guard never fires there.
  - A second `commonInitNode` on one node within a single layout. C calls
    `common_init_node` once per node per layout, in every `doDot` branch
    (`lib/dotgen/dotinit.c:399-470`). The marker over 40 corpus inputs on 8
    engines saw 0 remakes ([results/marker-planning.tsv](harness/results/marker-planning.tsv)).

## AD-1: split the label maker; only the render-time call keeps the guard

**Context.** The guard was written for `polyInit` (`src/common/poly-init.ts:181`),
which `render` runs on every node before emitting (`src/gvc/device.ts:508`).
C has no render-time `make_label`. The port's `polyInit` builds a label only
when layout did not, that is, when layout had no measurer and took
`initNodeDefaults`. A second render of one layout must keep the layout's label
(native: one layout and three renders warn once,
[native/html-cell-small.dot.renders3.stderr](harness/native/html-cell-small.dot.renders3.stderr)).

**Decision.** Move `buildNodeLabel`'s body below the guard into a new exported
`makeNodeLabel(n, g, measurer)`, with no guard and
`@see lib/common/utils.c:common_init_node (make_label, :400)`. `buildNodeLabel`
keeps the guard and calls `makeNodeLabel`. Its comment then says it is the
render-time path (polyInit) and builds a label only when layout made none.
`initNodeFromLabel` calls `makeNodeLabel`. This is
[harness/prototype.diff](harness/prototype.diff) with final comments.

**Rejected.**

- (B) Clear `n.info.label` in `initNodeFromLabel` before calling
  `buildNodeLabel`. It works, but the guard would still read as if layout
  relied on it, and a later caller could copy the pattern.
- (C) Drop the guard entirely. `polyInit` would then make the label again at
  every render, which C never does: a render after a layout would repeat the
  HTML warnings (native warns once for one layout and three renders) and
  would throw away `space`/`valign`, which `initNodeFromLabel` installs on the
  layout's label.

**Consequences.** A single layout's output cannot change, because the label is
undefined on the first `commonInitNode` of a fresh record and no layout calls
it twice (marker: 0). No-free relayouts move to native: the matrix goes from
18 to 41 of 46 identical. Public `render()` and `renderAsync` free after every
layout, so they are unaffected. Only direct `ctx.layout` callers who relayout
without a free see a change, and it is a change toward C. Type `fix`.

## AD-2: tests

**Decision.** New file `src/gvc/rerender-relabel.test.ts`, written before
the fix (red on the base):

1. **Relabel, dot and neato.** Parse `relabel.gv`, `ctx.layout`,
   `deviceRender(ctx, g, 'plain')` equals `relabel.<e>.plain.relabel.1`. Set
   `a`'s `label` to `a much longer label than before`, `ctx.layout`, render
   equals `relabel.<e>.plain.relabel.2`. Fixtures are the carried oracle's,
   written by `harness/recapture.sh src/gvc/__fixtures__/rerender`.
   Red on the base: render 2 keeps `short`.
2. **HTML warnings per layout.** The `html-cell-small` input inline: three
   no-free dot layouts, a plain render after each. The `console.warn` and
   `console.error` messages equal native's six lines
   ([native/html-cell-small.dot.stderr](harness/native/html-cell-small.dot.stderr)),
   collected in the `htmltable-warn-state.test.ts` style. Red on the base,
   which gives two.
3. **One layout, three renders, warns once** (pins the guard AD-1 keeps). The same
   input, one layout and three renders: two lines
   ([native/html-cell-small.dot.renders3.stderr](harness/native/html-cell-small.dot.renders3.stderr)).
   Green on the base and on the head. Test 3 fails if a later change makes AD-1's
   rejected option (C).

Header: `// SPDX-License-Identifier: EPL-2.0`, the issue, the oracle (carried
16.1.1, `harness/relabel.c`), and the capture date.
`src/gvc/__fixtures__/rerender/regen.sh` gets one header line naming the
`relabel.*` files and `plans/issue-190-node-relabel/harness/recapture.sh`, as
it already does for #149 and #158. `regen.sh` itself does not produce them,
because `twice.c` cannot set an attribute between layouts.

**Rejected.** Adding the cases to `rerender.test.ts` (649 lines) would put an
unrelated file into the write-set for no gain.

## AD-3: the node-label "once" warnings now repeat per layout, the accepted N class

**Context.** Once node labels are made on every layout, a label-time warning
whose port static is reset per layout repeats on every layout. Native prints
it once per process. Probe `nonascii` (a node label with U+0100): native 1,
port 3, where the base gives 1 (it measures nothing on layouts 2 and 3). Edge
labels already behave this way on the base (edge `label="Ā"`: port 3).
`docs/process-statics.md` gives `src/common/textmeasure.ts` `warned` verdict
**N**, and `warnedFontNames` the same ("Probe `edgefont`: native warns once,
the port 3 times"). Part 3 AD-4 and part 4 AD-8 accepted that class.

**Decision.** Accept it; this is no new divergence. Update the two rows that
cite #190:

- `src/common/textmeasure.ts` `warned`: replace "From the code: the
  `nonascii` probe's node label is not measured again (issue #190)." with
  "Probe `nonascii`: native warns once, the port 3 times (node labels are
  measured on every layout since #190)."
- `src/common/htmltable.ts` `missingImages`, `sizeWarned`: replace "Probe
  `htmlsize`: the port warns once in 3 layouts, resets on or off, because
  `buildNodeLabel` keeps the stale label: issue #190." with "Probe `htmlsize`:
  native and the port warn 3 times in 3 layouts (pinned by
  `src/gvc/rerender-relabel.test.ts`)."

Verdicts stay as they are (N and M). `test/docs/process-statics.test.ts`
checks rows and verdicts only.

## AD-4: out of scope

- **#279** (filed at planning): clearing `xlabel` before a no-free neato,
  sfdp, circo or twopi relayout gives a taller bb natively. The base and the
  prototype agree on it, and its mechanism is not established.
- **#256**: fdp prints `Error: node "a" is contained in two non-comparable
  clusters "%1" and "%1"` on every no-free relayout natively, with or without
  a label change. The port prints nothing. Three fdp matrix rows show it as
  a stderr difference. stdout is identical.
- **#193** (neato KK bb on no-free relayout) is not reached by these probes.

## Baseline (Phase 8)

On `67f46a36`: `npm run typecheck` exit 0; `npm test` exit 0, 608 files,
15192 tests. Prototype: `npm test` 608 files, 15192 tests, no test edits.

## Rollback

Reversible: revert the one squashed commit. No data, API or schema change.
Irreversible changes: none.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
|---|---|---|---|
| AD-1 fix shape | split, guard only at render | clear-before-call; drop guard | prototype matrix 41/46; native renders3 stderr |
| AD-2 test home | new `rerender-relabel.test.ts` + carried fixtures | extend `rerender.test.ts` | file size; fixture precedent #149/#158 |
| AD-3 nonascii 1/3 | accept as existing N class, update doc rows | treat as halt | process-statics rows `warned`, `warnedFontNames`; edge-label control |
| AD-4 scope | #279, #256, #193 out | widen to xlabel clearing | base == prototype on #279 probe |
