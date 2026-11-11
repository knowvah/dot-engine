# Decisions: issue #171

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-11. No issue was labelled `queue:planned`. #171 was the lowest-numbered
open `queue:ready` issue, and it has no "Blocked by" references. Nobody confirmed
the decisions below. Each one names the options it rejected and the evidence, so
the maintainer can audit it.

### AD-1: a new module holds the record exit: test, once-flag and warning

- **Decision:** create `src/layout/dot/flat-adj-record.ts`. It ports C's whole
  `if (shapeOf(tn) == SH_RECORD || ...)` block: the detection, now moved out of
  `edge-route.ts` (`isLostFlatAdjRecordEdge`), the `warned` flag with its
  `registerRenderState` reset, and the two `agerr` calls. It exports one
  function that returns true when the edge takes the exit and warns at most once
  per render. `routeFlatEdge` (`edge-route.ts:418`) calls it in place of
  `isLostFlatAdjRecordEdge`.
- **Rejected:** writing the warning in `edge-route.ts`. The file has 492 lines.
  The flag, its reset and the doc comments need about 25, which would take it
  past the complexity hook's 500-line limit.
- **Rejected:** writing it in `splines-flat.ts` beside `makeFlatAdjEdges`. That
  file has 561 lines, and the hook blocks any edit that makes it longer.
- **Rejected:** moving the record test into `makeFlatAdjEdges`, where C has it.
  The port reaches `makeFlatAdjEdges` only for port groups. Labelled and no-port
  adjacent groups route through `makeFlatLabeledEdge` and
  `makeAdjFlatNoPortEdge`. Moving the test would mean restructuring the flat
  dispatch, which is a routing change this issue does not need.
- **Evidence:** `wc -l` at the base. `~/.claude/hooks/check-complexity.py:227-241`
  (the file-size rule only blocks growth).

### AD-2: name the forward-normalized lead edge, raw names, by graph kind

- **Decision:** the `Edge` line names the endpoints from `flatLeadPair`
  (`splines-flat.ts:160`). It is already the port of C's makefwdedge'd `e0`, and
  T1 exports it, a one-word change with no extra lines. The names are the raw node
  names (`agnameof`), with no canonical quoting. The separator is `->` for a
  directed root and `--` otherwise.
- **Rejected:** the edge being routed (`e.tail`, `e.head`). `rankdir-lr.gv` routes
  `b -> a`, and native prints `Edge a -> b`.
- **Rejected:** `agstrcanon` names (#167's `write_nodename`). `quoted-name.gv`:
  native prints `x y -> p"q` unquoted.
- **Evidence:** `harness/native/rankdir-lr.err`, `quoted-name.err` and
  `undirected.err`. In a group every edge has the same two ends, so the pair does
  not depend on which edge leads.

### AD-3: once per render, reset with `registerRenderState`, verdict N

- **Decision:** the flag is a module `const` object, `{ warned: false }`, reset
  by `registerRenderState`. This is the pattern that `multicolor.ts`
  (`parseSegsState`) and `neato/start.ts` (`selfOnce`) use. Add a row for the new
  module to `docs/process-statics.md` with verdict **N**: on a no-free relayout,
  native warns once across layouts and the port once per layout. The flag reads
  no layout record.
- **Rejected:** keeping the flag on the `Graph`. No other once-flag does that,
  and part 3's AD-4 makes one render behave as one process.
- **Rejected:** a flag that is never reset. It would leak across renders and
  break the multi-diagram invariant (`test/architecture/module-globals.fitness.test.ts`).
- **Evidence:** `docs/process-statics.md` (the rows for `multicolor.ts` and
  `textmeasure.ts`). `test/docs/process-statics.test.ts` fails when a
  registering module has no row.

### AD-4: one task. The mechanism is already stated, and the tests pin native stderr

- **Decision:** a single task T1, covering red tests, the fix, the gates and the
  squash. There is no separate diagnosis task. The new test file,
  `src/layout/dot/flat-adj-record-warning.test.ts`, captures stderr with
  `agseterrf` (as `ordering.test.ts:225` does). It renders each probe through the
  public `render(parse(src), 'dot', { engine: 'dot' })` and compares the joined
  pieces with native's stderr, inlined with a provenance comment. Required: `1323`
  and all 14 other probes, including the two silent ones. Also required: two
  renders of `two-pairs.gv` in one test, each warning once (the per-render reset).
- **Rejected:** a T1 diagnose and T2 fix split (#170's shape). The issue states
  the mechanism with `file:line`, and planning confirmed it on 13 probes. The two
  missing lines are the whole difference. The journal still records the artifact,
  and stop condition 2 covers a surprise.
- **Evidence:** `harness/native/*.err`, against the port's base stderr diffed
  during planning (README, "Evidence").

## Baseline

At `c29f47fa` on 2026-11-11: `npm run typecheck` exit 0. `npm test`: 572 files,
13506 tests, all passed. There is no lint script, so typecheck is the lint bar.

## Rollback

Reversible: revert the one squashed commit. stderr only. No API, data or output
format change.

## Operational readiness

A library, so there are no SLIs, dashboards or on-call. The one behaviour change
is an extra warning on stderr (through the `agseterrf` callback for library
users) in the record case. Backwards compatible: no API or stdout change.
