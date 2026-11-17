# T2: re-capture the 16.1.0 native fixtures T1 turns red

## Context

Several unit tests pin native graphviz **16.1.0** output on inputs whose flat
ranks AD-1 now leaves alone; native 16.1.1 changed them the same way. At
planning, on the cf, every test below failed against its 16.1.0 value and
equalled a fresh 16.1.1 capture. Rules: [AD-2](../decisions.md#ad-2-re-capture-only-the-native-fixtures-ad-1-turns-red-and-only-when-the-head-equals-them),
[AD-3](../decisions.md#ad-3-the-issue-130-aux-ranks-come-from-an-instrumented-1611-plugin).
The oracle is `~/git/graphviz-16.1.1/build/cmd/dot/dot`, `GVBINDIR=/tmp/ghl1611`
(dot) or `/tmp/ghl1611-all` (rerender's libgvc harness). Run `oraclePreflight`
(`test/corpus/oracle-env.ts`) for `dot` before trusting a capture.

## Task

For each item: capture with 16.1.1, compare with the head, replace only on a
byte-equal match, and update the provenance comment (16.1.1, issue #158).

1. **rerender** (8 tests in `src/gvc/rerender.test.ts`): run
   `bash plans/issue-158-flat-reorder-valid-rank/harness/recapture-rerender.sh $TMPDIR/<dir>`,
   expect `DIFF` on all 14 files of
   [harness/rerender-files.txt](../harness/rerender-files.txt), then re-run with
   `apply`. Add a line to `src/gvc/__fixtures__/rerender/regen.sh`'s header, as
   #149 did for `nestedclust`: these 14 files are native 16.1.1's, re-captured by
   #158 (`plans/issue-158-flat-reorder-valid-rank/harness/recapture-rerender.sh`).
   Planning: with these 14 files the cf passes 122/122 and the base fails exactly
   the 8.
2. **flat-adj-ordering.test.ts** (#170, 4 probes, `-Tplain`): re-capture each
   failing probe's `native` string.
3. **ordering.test.ts** (#169): `NATIVE_ROOT_DEFAULT_PLAIN`,
   `NATIVE_SUBGRAPH_DEFAULT_PLAIN` (`-Tplain`, stderr empty). Leave the other
   constants (they still pass).
4. **flat-adj-record-warning.test.ts** (#171): the `rankdir-lr` probe's `err`.
   16.1.1 names `Edge b -> a` (16.1.0 said `a -> b`), then `Error: lost b a
   edge`; fix the comment at `:104` to match.
5. **flat-adj-source-subgraph.test.ts** (#130): run
   `bash plans/issue-158-flat-reorder-valid-rank/harness/native-i130.sh $TMPDIR/<dir>`
   (load below 12 first; it builds one plugin). It stops if the unpatched
   rebuild differs from the oracle. Set V8, V9 and V11's expected `NativeAux`
   from their `I130` lines; check V1-V7 and V10 print what the test already
   says. Planning's run is
   [harness/native-i130-1611.txt](../harness/native-i130-1611.txt): V8 and V9
   become `A_THEN_B`; V11 becomes auxt `b` rank 0, auxh `a` rank 2, maxrank 2,
   `hasFlatEdges: false` (its comment about ordered_edges flagging auxg no
   longer applies to V11; keep it for V10). Your run must match it. Update the
   provenance comment (`:81-89`).
6. **flat-2723.test.ts**: native 16.1.1 exits 1 on `tests/2723.dot` with a
   complete drawing and stderr `Error: in routesplines, illegal values of prev 1
   and next 1, line 375` then `Error: lost 415 407 edge` twice. The head no
   longer throws; its svg, xdot, plain and cmapx equal native (json: #185 only)
   and its stderr is `Error: lost 415 407 edge` once. Rewrite the test to pin
   the head's `-Tplain` against a native 16.1.1 capture, and rewrite its header
   comment (no segfault, no throw). Then diagnose the stderr gap (mechanism,
   origin, chain, ruled out): the port has no `illegal values of prev`
   message anywhere in `src/`. Planning did not chase it. File one `follow-up`
   issue per mechanism and cite it in the test comment; do not pin the port's
   current stderr.

Then `npm test`; journal the counts; commit (`test(T2): ...`).

## Write-set

- `src/gvc/__fixtures__/rerender/` (the 14 listed files and `regen.sh`'s header)
- `src/layout/dot/flat-adj-ordering.test.ts`, `src/layout/dot/ordering.test.ts`,
  `src/layout/dot/flat-adj-record-warning.test.ts`,
  `src/layout/dot/flat-adj-source-subgraph.test.ts`, `src/layout/dot/flat-2723.test.ts`
- `plans/issue-158-flat-reorder-valid-rank/decision-journal.md`

## Read-set

- each test file's provenance comment and the probe it fails on
- `plans/issue-149-agwrite-edge-order/harness/recapture.sh` (the precedent)
- `plans/issue-130-flat-adj-source-subgraph/decision-journal.md:7` (the native
  trace recipe this repeats)

## Interface contracts

None.

## Acceptance criteria

- Given each listed fixture, when captured from native 16.1.1, then it equals
  the head's output byte for byte, and only then is it replaced.
- Given the head, when `npm test` runs, then it exits 0 with 4 expected fail
  (the two `dot-newrank-compact-*` goldens in both suites).
- Given the 2723 stderr gap, when T2 ends, then the journal holds its diagnosis
  artifact and a `follow-up` issue number.

## Observability

N/A.

## Rollback

Reversible with the squashed commit (the 16.1.0 fixtures come back).
