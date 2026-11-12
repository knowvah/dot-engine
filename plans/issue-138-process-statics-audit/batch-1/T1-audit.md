# T1: audit the registered resets against no-free relayouts

## Context

`resetRenderState()` (`src/common/render-state.ts:34`) runs every registered
reset at each public render entry (`src/index.ts:94`, `render/public.ts:122`,
`render/xdot-public.ts:164`, `async/render-async.ts:156`) and at
`GvcContext.layout` (`gvc/context.ts:312`). A no-free relayout is
`ctx.layout(g)` twice on one graph with no `freeLayout` between the calls. The
second layout then sees the stale records (`layout-reset.ts`: records are
replaced only after a free), but every registered static starts again at its
reset value. Native continues every static. For decompose's `Cmark`, which is
compared with `ND_mark` on the records, that broke layout 3 of
`nestedclust.gv`. The fix is `nextCmark` (`decomp.ts:138-163`), pinned by
`src/gvc/rerender-nestedclust.test.ts`.

C sources are under `~/git/graphviz/lib/`. Each registration's doc comment
already names its C static. Start from that `@see`.

## Task (TDD)

1. **Enumerate.** `grep -rln 'registerRenderState(' src --include=*.ts | grep -v
   '\.test\.ts' | grep -v render-state.ts`. Expect 23 files. Journal the list
   and any change since planning.
2. **Red: the fitness test.** Write `test/docs/process-statics.test.ts`
   (AD-3). It reads every non-test `src/**/*.ts`, collects the files that call
   `registerRenderState(`, parses the file column of the table in
   `docs/process-statics.md`, and asserts that the two sets are equal and that
   each row's verdict is `M`, `N` or `S`. Create the doc with its header and
   column row only. The test must fail, listing all 23 files as missing.
3. **Audit each static** (AD-4 evidence bar). For each, read the C static's
   declaration, every C read, and every C write, and note whether C assigns it
   on every layout before the first read. Then read the port's readers and note
   whether any of them reads a layout record (`n.info`, `e.info`, `g.info`, a
   label or shape object hanging off one) and compares it with the static.
   Write the row. Settle the four candidates in decisions.md AD-4 explicitly.
   Where the code does not settle it, run a no-free probe.
4. **No-free probe** (where needed). Build `twice-native` into `$TMPDIR` with the
   `clang` line in `src/gvc/__fixtures__/rerender/regen.sh`. Run
   `twice-native <case>.gv <engine> <fmt> nofree` with stdout and stderr captured,
   3 runs to check that native repeats. For the port, use the same loop as
   `rerender-nestedclust.test.ts`'s `noFreeRenders`, run through `npx tsx` from
   a `$TMPDIR` script, with stderr captured. **Check the base first**
   (`.agent-notes/issue-131.md`). The probe input's first render must equal
   native. If it does not, pick another input; a first render that differs
   judges nothing.
5. **S rows only.** Enter diagnosis mode and journal the artifact. Red: copy the
   native renders into `src/gvc/__fixtures__/rerender/` as
   `<case>.<engine>.<fmt>.nofree.<n>`, add the `run` line to `regen.sh`, and add
   a test that asserts all 3 renders equal native. It must fail on the base.
   Green: AD-2's `WeakMap` pattern in the S module, citing the C static and
   `gvlayout.c:gvFreeLayout`. Also assert that the freed path is unchanged: a
   render after `freeLayout` equals render 1.
6. **Green: the doc.** Fill the 23 files' rows. Give the doc a short intro: what
   M, N and S mean, why a no-free relayout is the case that matters, and a link
   to AD-4/AD-8, `layout-reset.ts` and `nextCmark`. Keep it under 150 lines. If
   `docs/known-divergences.md` describes the per-render reset contract, add one
   link line there. The fitness test passes.
7. **Close the item.** Mark follow-ups README item 152 DONE
   (`plans/post-16.1-followups/README.md:712`), pointing to #138 and the doc.
8. **Gates** 1–4 always; 5–6 only if a non-test `src/` file changed.
9. **Session end** (README) and the squash.

## Acceptance criteria

- Given the 23 registering files, when `test/docs/process-statics.test.ts`
  runs, then it passes, and it fails if a file's registration is removed or a
  new file registers without a row.
- Given each row in `docs/process-statics.md`, when it is read, then it names
  the C static with a `file:line`, states what C does on a no-free relayout,
  and has a verdict of M, N or S with the AD-4 evidence.
- Given the four planning candidates (fill nodes, `UserShape`, the HTML
  WeakSets, `CL_type`), when the audit finishes, then each has a verdict whose
  evidence answers the question decisions.md AD-4 asks.
- Given any S row, when its no-free fixture test runs, then renders 1–3 equal
  native, the test fails on the base, and a render after `freeLayout` equals
  render 1.
- Given no S row, when the mission ends, then no non-test `src/` file has
  changed.

## Interface contracts

None: one task. The doc's table must keep a parseable file column for the
fitness test. The format is the test's choice, written in the doc's intro.

## Bytediff

Only if a non-test `src/` file changed. Build the base bundle from
`git archive 27402ece` into `$TMPDIR/i138-base/`: symlink `node_modules`, run
`npm run parser:regen`, then `npm run build:js`. Copy `dist/index.js` to
`$TMPDIR/issue138-base.mjs`. Build the head the same way into
`$TMPDIR/issue138-head.mjs`. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue138-base.mjs $TMPDIR/issue138-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue138-bytediff.json
```

Expected: identical. An S fix acts only on a no-free relayout, which no smoke
id runs. Any difference is stop condition 3 or 5.

## Targeted survey

Only if a non-test `src/` file changed. How to choose ids: the S module's
engine and code path. Use the marker-bundle method (`.agent-notes/issue-130.md`)
with a marker where the carried value differs from the reset value on a first
render. It must never fire: if it does, that is stop condition 3. Cover every
manifest id of that engine within a 45 s cap, and take up to 30 ids that reach
the module for a base/head/native comparison. Journal the hit list and the slow
ids not scanned.

## Observability

N/A: a library audit with no runtime telemetry. Evidence goes to the journal.

## Rollback

Reversible (decisions.md). A revert of the squashed commit restores the base.
