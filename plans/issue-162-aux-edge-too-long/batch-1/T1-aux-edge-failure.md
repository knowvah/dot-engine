# T1: fail the layout when an aux edge is too long

## Context

[decisions.md](../decisions.md) AD-1..AD-4. The planned change is
[harness/counterfactual.patch](../harness/counterfactual.patch) (src only, no
tests). Port it test-first. Do not just apply it: each red test must fail on the
base for the stated reason.

## Write-set

- `src/layout/dot/position-aux.ts`: AD-1 (`makeAuxEdge`), AD-2 (status returns).
  It is 395 lines; the change adds about 25. Stay under the 500-line limit
  (hook-enforced).
- `src/layout/dot/position.ts`: `dotPosition` tests `createAuxEdges`' rc.
- `src/layout/dot/classify.ts`: `interclust1`'s `!` with the C-`int` reason.
- `src/layout/dot/pack-components.ts`: `dotLayoutComponent` returns
  `dotPosition`'s rc; update its doc comment ("The mincross/position statuses
  are not consulted" becomes mincross only, with a reference to #235).
- `src/common/graph-init.ts`: AD-3.
- Tests: `src/layout/dot/position-aux.branch.test.ts`,
  `position-aux.auxedge.test.ts`, `position-aux.test.ts` (type-only `!` edits,
  plus the replaced clamp test), a new `src/common/graph-init.nodesep.test.ts`
  (no test calls `graphInit` today; `parseSepAttrs` is private, so test through
  the exported `graphInit(g, useRankdir)`, `graph-init.ts:264`),
  a new `src/layout/dot/aux-edge-too-long-2781.test.ts`, and, if a pack test
  needs its own file, `src/layout/dot/pack-components.aux-fail.test.ts`.

## Read-set

- C: `~/git/graphviz-16.1.1/lib/dotgen/position.c:121-150,179-200,222-366,534-550`,
  `dotinit.c:259-300,400-481`, `lib/common/input.c:657-659`, `class1.c:55-61`.
- Port: `src/common/agerr.ts` (`agerrorf`, `agseterrf`),
  `src/util/printf-round.ts:101` (`printfFixed`), `src/util/math.ts:79` (`d2i`),
  `src/layout/dot/index.ts:250-268` (`dotLayoutPipeline`'s `posRc` return),
  `src/layout/dot/no-out-edge-2765.test.ts` (pin pattern),
  `src/layout/dot/conc.branch.test.ts:746` (stderr spy pattern).

## Steps

1. Red tests 1-4 of AD-4 against the base; run them and journal each failure
   message.
2. AD-1 + AD-2 + AD-3 in the source (match the counterfactual unless a test
   says otherwise; journal any departure).
3. Corpus pins (AD-4 item 5). Capture native stdout from the oracle
   (`GVBINDIR=/tmp/ghl1611 ~/git/graphviz-16.1.1/build/cmd/dot/dot -Kdot -Tplain
   ~/git/graphviz-16.1.1/tests/<id>.dot`; exit 1 is expected) and paste it as
   constants, with provenance comments as in `no-out-edge-2765.test.ts`. Embed
   the sources verbatim. Assert the stderr lines with a spy.
4. Pack probe (AD-4 item 6): `harness/pack-probe.dot` inline. Assert the
   control flow (the component's `dotPosition` rc stops `layoutAndPack` before
   `packComponentsClusterAware`; stderr has one `Edge length` line). Do not pin
   bytes to native: native segfaults on this input (decisions AD-2).
5. Type-only `!` edits to existing tests; change no expected values.
6. `npm run typecheck`, then the touched test files, then commit
   `fix(T1): fail the dot layout when an aux edge is too long`.

## Interface contracts

- `makeAuxEdge(u, v, len, wt): Edge | null`. `null` only when
  `len > 2147483647`, after the message. Callers outside AD-2's table ignore it.
- `lrRankPair(...): number | null`; the status helpers return `0 | -1`;
  `createAuxEdges(...)` and `dotPosition(g)` return `0` or the first nonzero rc.

## Acceptance criteria

- Given `makeAuxEdge(u, v, 1e20, 0)`, when called, then it returns `null`,
  `u.info.out`/`v.info.in` gain no edge, and stderr gets
  `Error: Edge length 100000000000000000000.000000 larger than maximum 2147483647 allowed.`
  and `Check for overwide node(s).`
- Given a rank pair whose `rw + lw + nodesep` exceeds `INT_MAX`, when
  `makeLrConstraints` runs, then it returns `-1` and the pair's `v.info.rank` is
  not written. Given the same in `createAuxEdges`, `posClusters` is never called.
- Given `nodesep=40000000`, when the graph is initialised, then `nodesep` is
  `2147483647`.
- Given corpus `1314`, `2781_1`, `2776_1`, `2758`, when rendered `-Tplain`, then
  the output equals native 16.1.1's byte for byte and stderr carries native's
  `Edge length` line.
- Given an oversized length at an unchecked caller (`connectGraph` or a cluster
  helper), when it runs, then the message prints, no edge is added, and the
  caller completes.

## Observability

N/A (library). The new stderr line is the 16.1.1 message itself.

## Rollback

Reversible: revert the commit.
