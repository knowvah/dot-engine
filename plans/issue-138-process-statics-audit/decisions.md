# Decisions: issue #138

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-10. #138 was the lowest-numbered open `queue:ready` issue, it had no
"Blocked by" references, and no issue was labelled `queue:planned`. Nobody
confirmed the decisions below. Each one names the options it rejected and the
evidence, so the maintainer can audit it.

### AD-1: scope is the registered resets; N rows change nothing

- **Decision:** audit every `registerRenderState` call in non-test `src/`
  (23 files at planning). Give each static one verdict (M, N or S, defined in
  the README). Fix only S rows. An N row, such as a once-only warning that warns
  again on each `ctx.layout` where one native process warns once, is recorded
  and left alone.
- **Evidence:** the issue's done criterion accepts "matches C on a no-free
  relayout or is shown not to read stale records". `ctx.layout` resetting
  process state is part-4 AD-8 (`plans/post-16-1-followups-4/decisions.md:59`),
  documented in `context.ts:290-300`. One render behaving as one native process
  is part-3 AD-4. Reversing either is the maintainer's decision.
- **Rejected:** (a) making `ctx.layout` keep process state across calls. That
  contradicts AD-8 and changes every repeat-render test. (b) Widening the audit
  to unregistered module statics or record-held port fields (`abomShift`). The
  issue names "statics that `ctx.layout` resets", which are the registered ones.

### AD-2: an S fix follows the `nextCmark` pattern

- **Decision:** an S static carries its value with the root's record, in a
  `WeakMap` keyed by `g.root.info`. Then `layout-reset.ts`'s record replacement
  after a free starts it at the reset value (a new process), and a no-free
  relayout continues it (C). The test is a native no-free fixture from
  `twice.c` (`nofree` mode, 3 layouts), added to `regen.sh`.
- **Evidence:** `decomp.ts:143-163`. Part 11 T8 showed it keeps every first and
  freed render unchanged (smoke 1960/1960 identical) and makes
  `nestedclust.gv` renders 2 and 3 equal native.
- **Rejected:** dropping the S static's reset. A public render after an
  unrelated one would then depend on that earlier render, which AD-4 forbids.
  Any fix outside this pattern is stop condition 4 (`needs-ruling`).

### AD-3: the audit is one doc plus a fitness test

- **Decision:** `docs/process-statics.md` holds one row per registration: file,
  port symbol, C static (`file:line`), what C does on a no-free relayout,
  verdict, evidence. `test/docs/process-statics.test.ts` lists the non-test
  `src/**/*.ts` files that call `registerRenderState(` and checks that this set
  equals the set of files named in the doc's table. It also checks that every
  row has a verdict of M, N or S. Gate 4 runs it.
- **Evidence:** `src/layout/dot/rank.ts` is already 549 lines and
  `src/common/htmltable.ts` 496. The complexity hook blocks writes past 500
  lines, so an audit comment at each of the 23 registrations cannot land in
  every file. `docs/` already holds the cross-cutting ledgers
  (`known-divergences.md`, `conformance.md`).
- **Rejected:** (a) one comment line per registration, blocked by the file-size
  limit above. (b) A `name` argument on `registerRenderState`, an API change
  across 23 files for a doc's sake. (c) The table in `render-state.ts`'s doc
  comment, which nothing would keep in step.
- **Cross-link:** if `docs/known-divergences.md` describes the AD-4/AD-8
  contract, link the new doc from there and do not repeat it.

### AD-4: evidence bar per verdict

- **Decision:** M needs the C line that assigns the static before its first read
  on every layout (or shows the value C holds there), plus the port's
  equivalent. N needs the C and port readers, showing that no layout record is
  among their inputs. S needs the diagnosis artifact (mechanism, origin, causal
  chain, ruled out) and a native no-free probe. A row the code cannot settle
  gets a no-free probe: stdout and stderr, 3 layouts, `twice.c`.
- **Probe candidates found at planning**, each a possible record read:
  - `mincross-build.ts` fill nodes: `agnode(sg, '__fill_<rank>_<seq>', true)`
    returns an existing node of that name. Does every fill node of the last
    layout get removed (C `removeFill`) before the next layout makes fills?
  - `shapes.ts` `UserShape`: does any port reader compare a node's stale
    `shape` against a freshly made desc by identity?
  - `htmltable.ts` WeakSets: keyed by HTML label objects. Does a no-free
    relayout reuse the last layout's label objects, as C's re-run of
    `make_label` would not?
  - `rank.ts` `CL_type`: C assigns it per graph in dot init. Confirm before
    any read.
- **Rejected:** probing all 27 statics natively. Most are assigned before
  every read in both C and the port, and a probe adds nothing to the citation.

## Baseline

On `27402ece3de05e63200dbaf212e27cef113ac006`, 2026-11-10 13:12, load 3.7:

- `npm run typecheck`: exit 0.
- `npm test`: exit 0, 13275 tests passed.

Gates 3 and 4 were not run at planning. They passed on the five previous queue
missions, whose head is this base.

## Rollback

Reversible. With no S row the change is a doc and a test. An S fix is one
module's state moved into a `WeakMap`, which a revert of the squashed commit
undoes. No data, API or file format changes.
