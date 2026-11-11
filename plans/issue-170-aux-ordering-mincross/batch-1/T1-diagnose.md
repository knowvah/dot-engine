# T1: trace the aux mincross window and state the mechanism

## Context

The four probes in `../harness/probes/` give a different label order from native.
The first divergent value measured at planning is the aux graph's crossing count
at `mincross: pass 0 iter 0`: native 4, port 2 (README). That count is taken after
`build_ranks` (with its closing `transpose` when `g == dot_root(g)`),
`flat_breakcycles` (pass 0 only) and `flat_reorder`, all in `mincross`
(`lib/dotgen/mincross.c`, pass setup). The port mirrors them in
`mincrossPassSetup` (`src/layout/dot/mincross-order.ts:371`), `buildRanks`
(`mincross-build.ts`), `flatBreakcycles` and `flatReorder` (`mincross-flat.ts`),
and `ncross` (`mincross-cross.ts`).

One more planning clue, not yet explained. Native `-v` prints
`merge2: graph auxg, rank 1 has only 3 < 4 nodes`
(`../harness/native/*.trajectory`), so native allocated rank 1 of the aux for four
nodes and filled three. Check what the port allocates (`allocateRanks`) and why.

## Native probe (AD-2)

Recipe: #130's T1 "Native probe"
(`plans/issue-130-flat-adj-source-subgraph/batch-1/T1-source-subgraph.md:80-100`)
and `.agent-notes/pt-tracker-2-observations.md`.

1. `rsync -a --exclude build ~/git/graphviz/ $TMPDIR/gv-i170/`, then
   `git -C $TMPDIR/gv-i170 checkout -- .`.
2. Configure with the oracle's cmake options plus the homebrew bison and flex
   paths (#130's step 3). Build `gvplugin_dot_layout`. Make a plugin dir in
   `$TMPDIR` with `/tmp/ghl`'s core plugin symlinked, add the rebuilt dot_layout
   plugin, and run `GVBINDIR=<dir> <oracle dot> -c`. **Before adding traces,**
   check that the rebuild is byte-identical to the oracle on all four probes in
   `-Txdot`.
3. Add env-gated (`getenv("I170")`) `fprintf(stderr, ...)` traces. Restrict them
   to `GD_flip`-bearing calls on the graph named `auxg`, or print the graph name
   on every line. The minimum set:
   - the end of `build_ranks`, before and after its `transpose`: each rank's
     order as `agnameof`-or-`ND_label` text, so label vnodes read as `x` and `y`
     and other vnodes as `v<ND_order>`;
   - `flat_breakcycles`: for each rank, every flat edge (tail, head, `ED_weight`,
     `ED_edge_type`) and whether `flat_search` reversed it;
   - `flat_reorder`: per rank, each node's `local_in_cnt` and `local_out_cnt`,
     each flat edge's `constraining_flat_edge` result and its two
     `inside_cluster` terms, then `temprank` before and after the reverse;
   - `ncross` at the first pass-0 count: the rank orders it saw and the per-rank
     `rcross` totals;
   - `GD_flip(g)`, `GD_rank(g)[r].n` and `.an` for each aux rank (the `merge2`
     clue).
4. Run every probe with `I170=1 -Tplain`. Save the stderr under `$TMPDIR`. Copy
   only what the artifact needs into the journal.

Never write to `~/git/graphviz` or `/tmp/ghl`.

## Port probe

Copy the worktree to `$TMPDIR/de-i170/` (`git archive HEAD | tar -x`, then
`npm run parser:regen`; symlink `node_modules`). Add `console.error` traces at the
same points, in the same format, gated on the same env var. Run each probe through
`harness/trajectory.mts` copied into that tree, or through `render()`. The
worktree never holds a trace.

## Method

Compare the two dumps in pipeline order. The first line that differs is the first
divergent value. From there, read the C and the port for the statement that
produces it, and follow its inputs back until they are equal on both sides. Use
`rules/diagnosis.md`: no change to `src/` until the mechanism is stated.

## Output (consumed by T2)

A journal row headed `diagnosis` with:

- **Mechanism:** one or two sentences.
- **Origin:** the C `file:line`, plus the port `file:line` of its counterpart.
- **Causal chain:** from that statement to native's 4 crossings against the
  port's 2, and to the swapped `lp` values.
- **Ruled out:** each step of the window that was traced and found equal, with the
  equal values.
- **First divergent value:** both sides' numbers.

Then commit the journal (and `.agent-notes/issue-170.md` if something is novel)
as `docs(T1): state the aux mincross mechanism for issue 170`.

## Write-set

- `plans/issue-170-aux-ordering-mincross/decision-journal.md`
- `.agent-notes/issue-170.md` (only if novel)

## Read-set

`lib/dotgen/mincross.c` (`mincross`, `build_ranks`, `install_in_rank`,
`flat_breakcycles`, `flat_search`, `flat_reorder`, `postorder`,
`constraining_flat_edge`, `inside_cluster`, `ncross`, `rcross`, `transpose`,
`left2right`, `allocate_ranks`, `do_ordering_node`), `lib/dotgen/fastgr.c`
(`virtual_node`, `new_virtual_edge`, `flat_edge`), `lib/dotgen/class2.c`,
`lib/dotgen/dotsplines.c` (`make_flat_adj_edges`, `cloneGraph`), and their port
counterparts listed in Context, plus `src/layout/dot/fastgr.ts`,
`classify.ts`, `splines-flat.ts` and `splines-clone.ts`.

## Observability / rollback

Observability: N/A (library; traces are temporary and stay out of the worktree).
Rollback: Reversible (documentation commit only).

## Acceptance criteria

- Given the uninstrumented rebuild, when the four probes run with `-Txdot`, then
  the output is byte-identical to the oracle's.
- Given both trace dumps for `node-out.gv`, when they are compared in pipeline
  order, then the journal names the first line that differs and its two values.
- Given the artifact, when the stated mechanism is applied to the other three
  probes' dumps, then it accounts for their difference too, or AD-3's fallback
  is journalled.
- Given the origin, when it falls outside T2's write-set, then stop condition 1
  applies.
