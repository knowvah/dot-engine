# Decisions: issue #185

All decisions were auto-confirmed (an unattended planning run). The evidence for
each is in [harness/](harness/). Base `9336a55c`.

## AD-1: the json writer prints the graph name through `agNameOf`, as `write_hdr` calls `agnameof`

**Context.** C's `write_hdr` prints `agnameof(g)` for every graph object, root
and subgraph (`~/git/graphviz-16.1.1/plugin/core/gvrender_core_json.c:364-370`).
`agnameof` returns `%<AGID>` for an anonymous graph
(`lib/cgraph/id.c:145-169`). A nameless root is the first anonymous object, so
it is `%1`. A root named `""` is not anonymous and prints `""`.

The port keeps `''` as a nameless root's `name`, with `anonymous: true`
(`src/model/graph.ts:50-57`), because the dot writer must print `digraph {`.
`agNameOf` (`src/model/cgraph-ops.ts:45-47`) restores `%1` for it and returns
`g.name` otherwise. The neato warning sites already use it. The json builder
reads `g.name` directly (`src/render/json.ts:581-582`, `buildGraphObject`), so
json and json0 print `""` where native prints `%1`.

**Decision.** `buildGraphObject` sets `o.name = agNameOf(g)` for every graph
object. [harness/prototype.diff](harness/prototype.diff) is the prototype.

**Rejected.**

- (A) Store `%1` as the root's `name`. The dot, xdot and canon writers would
  print `digraph "%1" {`, or each would need the reverse mapping. The model's
  `''` plus `anonymous` is the port's settled form (#139).
- (B) `top ? agNameOf(g) : g.name`. Same output: no subgraph is constructed
  `anonymous` (`src/parser/builder.ts:312`, `src/layout/fdp/comp.ts:43`), and
  an anonymous subgraph already carries its `%N` name. C calls `agnameof` for
  every graph, so the one call is C's shape.

**Consequences.** On base `9336a55c` with the prototype:

- the 5 probes × 8 engines × `json`,`json0` all equal native (80 rows, 48
  changed `""` → `"%1"`);
- the smoke bytediff changes 96 outputs, all `-Tjson`, on 12 ids with nameless
  roots × 8 engines; each changes only line 2, from `"name": "",` to
  `"name": "%1",`, which is native's line 2 in every one;
- `npm test` passes unchanged (no test pinned `""`; the two that knew of the gap
  masked the root name).

## AD-2: `json.ts` does not grow

**Context.** `src/render/json.ts` has 734 lines, exactly its cap in
`test/golden/line-limit-baseline.txt`. Gate 4 is a ratchet: a listed file must
not grow. The prototype's new import makes it 735.

**Decision.** Keep the file at 734 or fewer lines without touching the baseline:
fold the `// write_hdr` comment line (`json.ts:581`) onto the assignment, e.g.
`o.name = agNameOf(g); // write_hdr: agnameof (%1 for a nameless root)`. The
import goes with the other model imports.

**Rejected.** Raising the baseline (the ratchet's purpose is to stop growth);
inlining `g.anonymous ? '%1' : g.name` (a second copy of `agNameOf`'s rule and a
magic literal).

## AD-3: `compareJson` keeps skipping the root name in this mission

**Context.** `compareJson` skips the root `name` (`RESERVED_TOP`,
`test/golden/compare-json.ts:115-118`; only `directed`, `strict`,
`_subgraph_cnt` are compared, `:467`). The issue notes that this hid the gap.
Comparing it would also report every root whose name differs for another
reason, such as #194's `%`-prefixed names, across the golden and corpus json
baselines. Measuring that needs the full survey the queue reserves for the
maintainer.

**Decision.** This mission checks the root name with its own tests (AD-4) and
the survey harness, which reads the name directly. It leaves `compareJson`
unchanged and files a `follow-up` issue: "compareJson skips the root graph
name", citing this mission's evidence and #194.

**Rejected.** Adding `name` to `GRAPH_STRUCTURAL_FIELDS` now: its blast radius
on the json baselines is unmeasured, and the queue rules forbid the full survey.

## AD-4: tests

- New `src/render/json-root-name.test.ts`: each of
  [harness/probes/](harness/probes/) under the 8 engines in `json` and `json0`
  has the root `name` native 16.1.1 prints, read from
  [harness/native-root-names.tsv](harness/native-root-names.tsv) (80 rows). Plus
  two API cases: `createGraph()` (no name, anonymous) prints `%1`, and
  `createGraph({ name: '' })` prints `""` (`src/api/builder.ts:349` sets
  `anonymous` from a missing name, as `agopen(NULL)` maps an anonymous id).
- `src/render/dot/empty-graph-name.test.ts:95-99`: the `root-anon` case compares
  the root name too (`jsonNames(...)` whole, against
  `plans/issue-139-empty-graph-name/harness/out/root-anon.json`, which holds
  `%1`), and its comment no longer cites #185.
- `src/gvc/rerender.test.ts:466-467`: compare the second json render with native
  without overriding `name` (`__fixtures__/rerender/filing.dot.seq-json-json.2`
  holds `%1`), and drop the "first-render gap" comment.

## Baseline

At planning on `9336a55c`: `npm run typecheck` exit 0; `npm test` 601 files,
14954 tests passed.

## Rollback

Reversible: revert the one squashed commit. No data, API shape or published
contract changes; the json root name becomes native's value.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
|---|---|---|---|
| AD-1 | `agNameOf(g)` for every graph object | (A) store `%1`; (B) top-only | probes 80/80 equal native; smoke bytediff 96 json rows, each only line 2, each equal to native |
| AD-2 | fold the `// write_hdr` comment, json.ts ≤ 734 | raise baseline; inline literal | `line-limit-baseline.txt:10` |
| AD-3 | compareJson unchanged, follow-up issue | compare root name now | blast radius needs the full survey (queue rules) |
| AD-4 | new probe test + two tightened tests | — | `npm test` green on the prototype with no test edits |
