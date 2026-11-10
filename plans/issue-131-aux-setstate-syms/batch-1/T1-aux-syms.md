# T1: unbind setState's remaining symbols in the aux init

## Context

C, `~/git/graphviz/lib/dotgen/dotsplines.c:731-771` (`setState`, called at the
end of `cloneGraph`) nulls these ten globals for the aux layout, alongside the
three part 11 ported:

```c
E_fontcolor = NULL;      E_headlabel = NULL;   E_labelfontcolor = NULL;
E_taillabel = NULL;      E_xlabel = NULL;
N_style = NULL;          N_fontcolor = NULL;   N_xlabel = NULL;
N_showboxes = NULL;      N_nojustify = NULL;
```

`make_flat_adj_edges` then runs `dot_init_node_edge(auxg)`, rank, mincross,
position, `dot_sameports`, `dot_splines_(auxg, 0)` and
`dotneato_postprocess(auxg)` (`dotsplines.c:1208-1240`) before copying the
splines and edge-label positions back. The port's sequence is
`makeFlatAdjEdges` (`src/layout/dot/splines-flat.ts:361-383`), which calls
`dotInitNodeEdge(aux.auxg, AUX_INIT_SYMS)`. `dotInitNodeEdge`
(`init.ts:264-275`) calls `commonInitNode(n, g)` and `initEdgeLabels(e, g,
measurer)` with no symbol state, so all ten are effectively bound in the port's
aux. The README's reader table lists where each one acts.

## Task (TDD)

1. **Probe the base against native** (before any change; see
   [Probe matrix](#probe-matrix)). For every input, render `-Kdot` as dot, xdot
   and svg with a base bundle and with the oracle, and capture stderr. Journal
   one line per symbol: inputs, byte-equal or not, corpus-comparator result,
   stderr equal or not.
2. **Diagnose any difference** before changing code (diagnosis mode). If the
   origin is one of the ten symbols, that symbol is "convicted" and gets
   unbound. If the origin is elsewhere, stop condition 3 applies.
3. **Red:** in `flat-adj-aux-syms.test.ts` (AD-4), assert for the label-creating
   inputs that every aux edge has no `xlabel`, `head_label` or `tail_label`,
   that every aux node has no `xlabel`, and that
   `auxg.info.has_labels & (NODE_XLABEL | EDGE_XLABEL | HEAD_LABEL | TAIL_LABEL)`
   is 0. Also assert that the aux edge's `label` is still made (C keeps
   `E_label` bound): this guards against over-unbinding. Add unit cases: with an
   unbound `EdgeLabelSyms`, `initEdgeLabels` makes no xlabel/head/tail label
   and sets no bit, but still makes `label`; with `{ nodeXlabel: false }`,
   `commonInitNode` makes no node xlabel for a polygon and for a record node;
   `AUX_INIT_SYMS` has all seven fields `false` and `DOT_INIT_SYMS` all `true`.
   They must fail now.
4. **Green:** AD-2. Gate at the read in `applyMainLabels`/`applyXLabel`
   (E_xlabel), `applyEndLabels`/`applyHeadLabel`/`applyTailLabel`
   (E_headlabel/E_taillabel) and `initNodeXLabel` (N_xlabel). Keep C's order
   (label → xlabel → headlabel → taillabel) and its lazy font-info init. Cite
   `@see lib/dotgen/dotsplines.c:setState` and the `utils.c` line of each
   guarded read. Extend `InitEdgeSyms`' doc comment to list all thirteen C
   globals, which seven are modelled and why the other six need no gate
   (per-symbol reader and probe evidence), and AD-3's note on
   `placePortLabels`. Unbind any convicted field-only symbol the same way,
   unless stop condition 6 applies.
5. **Pin the output:** for every probe input that equals native after the change,
   assert the port's dot output equals native's (constants or fixture files
   captured from the oracle, with a comment naming the oracle and date). For any
   input whose output changed between base and head, also pin xdot.
6. Mark item 141 in `plans/post-16.1-followups/README.md` (line ~690)
   `**[DONE — issue #131: unbound the four label symbols; the other six probed equal]**`
   (reword to fit the result), in the style of items 139 and 140.
7. Run gates 1-6 (README), write the journals, then do the squash described in
   the README.

## Probe matrix

Write each input to `$TMPDIR/i131/<name>.gv`. The flat-adjacent base cases are:

- **B1** `digraph { {rank=same; a; b} a:n -> b:n; a:s -> b:s; a -> b [label=x]; }`
- **B2** B1 plus `rankdir=LR` (the `GD_flip` branch; postprocess rotates the aux).
- **B3** `plans/post-16-1-followups-11/harness/T0/w4.gv` (three-edge group).

For each symbol, set it both on an object in the flat-adjacent group and as a
default (`edge [...]` / `node [...]`, which also declares it), on B1 and B2, and
on B3 for the label-creating four. Values chosen to make a divergence visible:

| Symbol | Values |
|---|---|
| `xlabel` (edge) | short text; long text (`"a very long external label"`, grows the aux bb); `forcelabels=false` variant |
| `headlabel`, `taillabel` | text alone; text with `labelangle=45 labeldistance=2` (opens `placePortLabels`' gate) |
| `xlabel` (node) | on `a`, on `b`, on both; long text |
| `fontcolor` (edge, node), `labelfontcolor` | `red`; with a headlabel for `labelfontcolor` |
| `style` (node) | `filled`, `rounded`, `invis`, `diagonals` |
| `showboxes` (node) | `1`, `2` |
| `nojustify` (node) | `true` with a multi-line label `"line one\lline two"` |

Add an HTML-like value for each label-creating symbol (`<<b>x</b>>`), and one
malformed HTML value (`<<b>x</i>>`) to check that stderr warns once, as native
does. In C the aux does not parse the unbound labels again. If native's
behaviour with the malformed value makes the input unusable (an error exit),
drop it and journal that.

## Write-set

- `src/layout/dot/init.ts` (`InitEdgeSyms`, its doc, the two constants,
  `dotInitNodeEdge`)
- `src/common/edge-label-init.ts` (`EdgeLabelSyms`, its default,
  `initEdgeLabels` and the `apply*` helpers it calls)
- `src/common/nodeinit.ts` (`commonInitNode`, `initNodeFromLabel`,
  `initNodeXLabel`)
- `src/layout/dot/flat-adj-aux-syms.test.ts` (create)
- `src/common/edge-label-init.test.ts`, `src/common/nodeinit.test.ts`,
  `src/layout/dot/init.branch.test.ts`
- `plans/post-16.1-followups/README.md` (item 141 only)
- `plans/decision-journal.md` (one row), this mission's `decision-journal.md`,
  README summary
- `.agent-notes/issue-131.md` (only if novel)

## Read-set

- `src/layout/dot/init.ts:117-200,255-276`
- `src/common/edge-label-init.ts:60-317`
- `src/common/nodeinit.ts:140-180,225-346`
- `src/layout/dot/splines-flat.ts:355-385`
- `src/layout/dot/splines-label.ts:320-400`
- `src/common/xlabels-place.ts:430-460`, `src/common/postproc.ts:405-430`
- `src/layout/dot/flat-adj-source-subgraph.test.ts` (mock pattern),
  `src/layout/dot/flat-adj-w4.test.ts` (native-constant style)
- `~/git/graphviz/lib/dotgen/dotsplines.c:640-850,1122-1281`
- `~/git/graphviz/lib/common/utils.c:430-560`
- `~/git/graphviz/lib/common/postproc.c:405-470,600-620`
- `.agent-notes/issue-130.md`

## Interface contracts

- `InitEdgeSyms` gains `headlabel`, `taillabel`, `xlabel`, `nodeXlabel`
  (all `readonly boolean`). It stays exported from `init.ts`.
- `initEdgeLabels(e, g, measurer, syms?: EdgeLabelSyms)`; omitted means all
  bound. `commonInitNode(n, g, syms?: { readonly nodeXlabel: boolean })`;
  omitted means bound.
- No callers other than `dotInitNodeEdge` change. No public API (the package
  entry points) changes.

## Acceptance criteria

- Given any probe input that sets `xlabel`, `headlabel` or `taillabel` on a
  flat-adjacent edge, or `xlabel` on its nodes, when the port builds the aux,
  then no aux object carries those labels and `auxg.info.has_labels` has none of
  the four bits, while the aux edge `label` is still made.
- Given the main graph of the same input, when it is laid out, then its labels
  are made and placed exactly as on the base (the main path's symbols stay
  bound).
- Given each of the ten symbols, when its probe inputs render on the head, then
  stdout (dot, xdot, svg) and stderr equal native, or the journal names the
  stated mechanism and follow-up issue for the input that does not.
- Given a malformed HTML value on a label-creating symbol, when it renders,
  then the port's stderr has the warning as many times as native's.
- Given the smoke list and the targeted survey, when they are compared with the
  base and native, then every output that changed equals native.

## Bytediff

`src/` changes, so gate 5 applies. Build the base bundle from
`git archive 8645f5ca` into `$TMPDIR/i131-base/`: symlink `node_modules`, run
`npm run parser:regen`, then `npm run build:js`. Copy `dist/index.js` to
`$TMPDIR/issue131-base.mjs`. Build the head the same way from `git archive HEAD`
into `$TMPDIR/issue131-head.mjs`. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue131-base.mjs $TMPDIR/issue131-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue131-bytediff.json
```

Expected: identical, unless a smoke id has a flat-adjacent group with one of the
four labels. Any difference must equal native, or it is a halt.

## Targeted survey

How to choose ids: the change acts only inside the aux init of
`makeFlatAdjEdges` (dot engine). Use the marker-bundle method from
`.agent-notes/issue-130.md`: a `$TMPDIR` copy of the head with
`console.error('I131HIT')` where an unbound symbol now suppresses a label (an aux
read that the base would have honoured), run through `test/tools/bd-job.ts` on
every applicable manifest id (`-Kdot -Tdot`, 45 s cap). Never put the marker in
the repo. The #130 aux-path ids (`1444`, `1444-2`, `1949`, `241_0`, `241_1`,
`2437`, `graphs-ports`, `linux.x86-ports_dot`, `nshare-ports_dot`) are always in
the survey, as are all probe inputs, plus `1323` as a control. Cap at 30 corpus
ids; if more hit, take every smoke-list id plus the lowest-numbered.

For each id, render `-Kdot` as dot, xdot and svg with the base bundle, the head
bundle and the oracle. Compare head with base byte for byte, and head with
native using the corpus comparators (xdot 0.01). Record the hit list, the slow
ids not scanned, and the results in the journal.

## Observability

N/A: no new operations; the change is to internal aux init only.

## Rollback

Reversible: revert the commit.
