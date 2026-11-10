# Mission: issue #131: unbind the symbols C's setState nulls for the aux layout

## Objective

C `setState` (`~/git/graphviz/lib/dotgen/dotsplines.c:731-771`) runs inside
`cloneGraph` and nulls a set of attribute globals while `make_flat_adj_edges` lays
out its aux graph. `cleanupCloneGraph` restores them. Part 11 ported three of the
nulled symbols (`E_constr`, `E_minlen`, `N_group`) as `AUX_INIT_SYMS`
(`src/layout/dot/init.ts:141`). The issue names the other ten:

| C global | Where C reads it on the aux path | What a bound read does in the port's aux |
|---|---|---|
| `E_headlabel` | `common_init_edge` (`utils.c:533`); `_dot_splines` port-label gate (`dotsplines.c:447-460`) | creates `head_label`, sets `HEAD_LABEL` (`edge-label-init.ts:190`) |
| `E_taillabel` | `common_init_edge` (`utils.c:539`); same gate | creates `tail_label`, sets `TAIL_LABEL` (`edge-label-init.ts:209`) |
| `E_xlabel` | `common_init_edge` (`utils.c:525`) | creates `xlabel`, sets `EDGE_XLABEL` (`edge-label-init.ts:171,236`) |
| `N_xlabel` | `common_init_node` (`utils.c:443`) | creates node `xlabel`, sets `NODE_XLABEL` (`nodeinit.ts:168`) |
| `E_fontcolor` | `initFontEdgeAttr` (`utils.c:460`) | label font colour only |
| `E_labelfontcolor` | `initFontLabelEdgeAttr` (`utils.c:470`) | head/tail label colour only |
| `N_fontcolor` | `common_init_node` (`utils.c:440`) | node label colour only (`poly-init.ts:50`) |
| `N_showboxes` | `common_init_node` (`utils.c:450`) | not read in the port's init |
| `N_nojustify` | `poly_init` (`shapes.c:2133`), `record_init` (`shapes.c:3700`) | label `space.x` (`nodeinit.ts:156`); records bail before the aux |
| `N_style` | render only (`shapes.c:471` via `stylenode`, `emit.c`) | no read in layout |

The first four create label objects in the aux graph that C never creates. Those
objects feed later aux passes that C also runs on `auxg`: `gvPostprocess` →
`addXLabels` (C `dotneato_postprocess`, `dotsplines.c:1240`, gated on
`GD_has_labels`), the aux bounding box and the postprocess translation, and
`placePortLabels`. The last six only set fields on aux objects that no aux pass
reads and that `cleanupCloneGraph` throws away.

Done means (the issue's criterion, plus the project's port-every-branch rule):
- Each of the ten symbols is probed against native on flat-adjacent inputs that
  set it (stdout as dot, xdot and svg, and stderr). The results are journalled
  per symbol.
- The four object-creating symbols (`E_headlabel`, `E_taillabel`, `E_xlabel`,
  `N_xlabel`) are unbound in the aux init (AD-1, AD-2), whatever the probe says.
- Any of the other six whose probe differs from native is diagnosed to a stated
  mechanism and unbound too. The rest are recorded, with the probe evidence, in
  `AUX_INIT_SYMS`'s doc comment.
- A test pins that the aux init creates none of those labels, and that the
  probe inputs render as native.
- Follow-ups README item 141 is marked DONE.
- All gates are green.

Type `fix`, so this is a patch release.

**Out of scope:** the C symbols `setState` rebinds from `auxg` (`E_dir`,
`E_weight`, `E_label`, `N_ordering`, …); `placePortLabels`' own gate (AD-3);
any change to `buildFlatAux`, `cloneGraph` or `cloneNode`; the record-shape bail
(#171); every other flat-edge path.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read the queue rules (`.claude/queue-policy.md`, injected into the session). They
   override this brief where the two disagree.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 8645f5ca..`.
4. Read `.agent-notes/issue-130.md` (subgraph audits, marker-bundle id selection)
   and `.agent-notes/pt30-flat-adj-aux.md`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch and never merge `main` into it.
- **Base sha:** `8645f5ca4beca70e4f291b710b120cc874c40134` (the tip at planning
  time). If the tip has moved, use the tip at execution start as the base and
  journal it.
- Per-task commits while you work: first `docs(mission): add issue-131 brief` (this
  directory), then `test(T1): ...`, `fix(T1): ...`, `docs(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-131/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(dot): unbind setState's label symbols in the flat-adj aux layout

  C's setState nulls E_headlabel, E_taillabel, E_xlabel and N_xlabel
  while make_flat_adj_edges lays out its aux graph, so the aux init
  makes no head, tail or external labels. The port made them, and they
  fed the aux postprocess and port-label passes C skips. The aux init
  now leaves them unbound. Native probes of all ten nulled symbols
  are journalled; the six that only set colours, style, showboxes or
  justification on discarded aux objects need no change.

  Refs: #131
  ```

  Rewrite the body to match what the probe and the gates actually showed (for
  example, which outputs changed and that they now equal native). Lines ≤ 80,
  subject ≤ 72, no attribution. Never push, rebase, sign, open a PR, or use
  `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-aux-syms.md#bytediff) | every changed output equals native |
| 6 | Targeted survey | see [T1](batch-1/T1-aux-syms.md#targeted-survey) | head = base, or head equals native where it differs; head vs native no worse than base |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot`
(16.1.0), `GVBINDIR=/tmp/ghl`. Run `oraclePreflight` (`test/corpus/oracle-env.ts`)
or `preflightOrExit` before you trust native output. If `config8` is missing, run
`GVBINDIR=<dir> <dot> -c`. Check `uptime` before the native probe and gate 6, and
wait while it is above 12.

Baseline at planning: `npm run typecheck` and `npm test` are green on `8645f5ca`
(see [decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside the write-set needs a change. (The queue rules let you go
   ahead when a stated mechanism requires it; journal why, as #130 did.)
2. The same gate check fails twice in a row after fix attempts: diagnose it to a
   stated mechanism, journal it, and stop.
3. A probe input differs from native on the base for a reason other than the ten
   symbols (the diagnosis artifact shows a different origin): record the
   artifact, file a `follow-up` issue, and leave that input out of the pinned
   expectations. Halt only if it blocks judging the ten symbols.
4. The smoke bytediff or the targeted survey shows an output that differs from the
   base and does not equal native: halt, per the queue rules.
5. An architecture decision in [decisions.md](decisions.md) turns out to be wrong
   (for example, unbinding a symbol moves an output away from native).
6. Unbinding one of the six field-only symbols would need a signature change in
   `src/common/poly-init.ts`, `src/common/record.ts` or the shape code: that is a
   wider change than AD-1 plans. File it as `needs-ruling` with the probe
   evidence, finish the rest, and say so in the summary.

## Push-forward (decide alone, journal it)

- Exact probe inputs and values, within the matrix in T1.
- Test file layout, fixture names, and whether expectations are inline constants
  or files under the test's directory.
- Field names in `InitEdgeSyms` and the narrow common-side interfaces (AD-2 gives
  the default).
- Which corpus ids make up the targeted survey, within the rule in T1.
- Whether an instrumented native build is needed (only for a diagnosis; the
  recipe is in the #130 brief's T1 "Native probe").

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-aux-syms.md](batch-1/T1-aux-syms.md) | the task |
| [diagrams/data-flow.md](diagrams/data-flow.md) | aux init → postprocess, where the symbols act |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  probe results per symbol, files, gates.
- Write `.agent-notes/issue-131.md` only for something novel. Otherwise the journal
  row says there was nothing novel.
- Append a `## Summary (<date>)` section here (tasks, result, not-as-planned,
  decisions, gates, follow-ups, known limits), as the #130 brief did.
- The final message ends with the driver's status line.

## Summary (2026-11-10)

- **Tasks:** 1 of 1 (T1). No subagent.
- **Result:** the flat-adjacent aux init leaves `E_headlabel`, `E_taillabel`, `E_xlabel` and
  `N_xlabel` unbound (`AUX_INIT_SYMS`), so the aux makes no head, tail or external label and sets
  none of their `has_labels` bits; the centre label is still made. An instrumented native plugin
  prints the same aux contents (`has_labels=1 label=1 xlabel=0 head=0 tail=0 nodexlabel=0`) on the
  17 test inputs. All ten symbols were probed on 234 inputs (dot, xdot, svg, stderr).
- **What the probe showed:** stdout is the same on base and head for every input. The four label
  symbols are convicted on stderr: the port reported a malformed HTML value twice (main graph and
  aux), native once; the head reports it once. The six field-only symbols (`E_fontcolor`,
  `E_labelfontcolor`, `N_fontcolor`, `N_style`, `N_showboxes`, `N_nojustify`) probed equal and stay
  ungated, with the evidence in `InitEdgeSyms`' doc comment.
- **Not as planned:** the brief's B2 base (`rankdir=LR` on B1) differs from native on the base with
  no symbol set, so two native-equal `rankdir=LR` bases (B4, B5) carry the `GD_flip` branch
  instead. Stop condition 3 fired three times, each diagnosed to a stated mechanism and filed, none
  blocking: #172 (group order into the aux), #173 (`GD_ranksep/2` is integer division), #174
  (missing "exterior labels positioned" warning). The native expectations are a fixture file, not
  inline constants.
- **Decisions:** 5 journalled (bases B4/B5; fixture file; `NodeInitSyms` as a named interface;
  the doc-comment move in `edge-label-init.ts`; marker-bundle id selection). For review: none
  changes an architecture decision.
- **Gates (final head):** typecheck 0; `npm test` 559 files / 13215 tests; goldens 5/5; corpus +
  docs 2837; smoke bytediff 1960/1960 identical; targeted survey 30/30 rows head = base and equal
  to native by the corpus comparators (`1949`, the one corpus id the change reaches, included).
- **Follow-ups filed:** #172, #173, #174. All three are on the base too.
- **Known limits:** 66 B2 inputs and 2 B4 `nojustify` inputs are not pinned (they differ from
  native for #172 and #173); one input's stderr is not pinned (#174). 18 slow ids were not scanned
  for reachability (listed in the journal).
