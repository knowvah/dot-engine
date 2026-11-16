# T2: re-capture the 47 fixtures, the hackflag order, provenance lines

## Context

After T1, 10 test files compare the port with native captures stored from
16.1.0, in the old edge order. ADR-0002 decision 7 says the port issue
re-captures what it touches. AD-3 says how: exactly the files those tests read,
and only when the 16.1.1 capture differs in line order alone.
`harness/recapture.sh` encodes the list and the check. AD-4 covers the one
inline case.

## Steps

1. **Preflight.** Confirm `/tmp/ghl1611/config8` and `/tmp/ghl1611-all/config8`
   exist (else `GVBINDIR=<dir> <dot> -c`). Check `uptime`: the instrumented
   regens compile and run about 40 native processes.
2. **Apply.** From the repo root:
   `bash plans/issue-149-agwrite-edge-order/harness/recapture.sh apply $TMPDIR/i149/rc`.
   It must print 47 `order` (or `same`) lines and `copied 47 files`. Any
   `CONTENT` or `MISSING` line is stop condition 2: the script copies nothing,
   and you journal the line and stop. Journal the summary. `git status` must
   show exactly the 47 paths modified.
3. **Hackflag order (AD-4).** In
   `src/layout/dot/edge-route-chain.hackflag.test.ts`, first case: swap the 4th
   and 5th expected entries, so `'91.267,13 102.3,13 ...'` comes before
   `'78.449,120.82 ...'`. Before editing, confirm this against native: write the
   case's graph to a file (the strings in `graphOf`), run native 16.1.1
   `-Tdot`, and extract each edge's `pos` in output order. Journal both lists.
   Add a line to the header comment: values unchanged at 16.1.1, and order is
   16.1.1's (edges in creation order, #149).
4. **Provenance (AD-3).** Add one line to the header comment of each test that
   reads a re-captured file, naming the files that are now 16.1.1's and
   `plans/issue-149-agwrite-edge-order/harness/recapture.sh`:
   `src/render/dot/stored-draws.test.ts`, `src/common/edge-in-box.test.ts`,
   `src/render/dot/name-canon.test.ts`, `src/render/dot/echo-attr-wrap.test.ts`,
   `src/gvc/node-in-box-pad.test.ts`, `src/gvc/rerender-nestedclust.test.ts`,
   `src/layout/neato/ipsep-probes.test.ts`, `src/layout/sfdp/dim.test.ts`,
   `test/golden/pt-issue-36.test.ts`. Add the same line, as a comment, to the
   header of each source regen script:
   `plans/issue-167-name-canon/harness/regen.sh`,
   `plans/issue-134-echo-attr-canon/harness/regen.sh`,
   `plans/issue-141-nodeinbox-pad/harness/regen.sh`,
   `plans/post-16-1-followups-11/harness/T7b/regen.sh`,
   `src/gvc/__fixtures__/rerender/regen.sh`,
   `src/layout/sfdp/__fixtures__/dim/regen.sh`. Change comments only, no code.
5. **Green.** `npm test` exit 0. Journal the counts.
6. **Commit** `test(T2): re-capture the fixtures #149 reorders from 16.1.1`, with
   a body naming AD-3 and the `recapture.sh` summary.

## Write-set

- the 47 files listed in `harness/recapture.sh` (written by the script only)
- `src/layout/dot/edge-route-chain.hackflag.test.ts`
- the 9 test files and 6 `regen.sh` files in step 4 (header comments only)
- this mission's `decision-journal.md`

## Read-set

- `plans/issue-149-agwrite-edge-order/harness/recapture.sh`
- `docs/adr/0002-graphviz-16.1.1-oracle.md:57-71`
- the header of each file in step 4

## Observability / rollback

Observability: N/A. Rollback: Reversible. Reverting the squashed commit
restores the 16.1.0 fixtures with the 16.1.0 writer.

## Acceptance criteria

- Given T1's head, when `recapture.sh apply` runs, then every one of the 47
  files classifies `order` or `same`, and all 47 are copied.
- Given the copies and the hackflag swap, when `npm test` runs, then it exits 0.
- Given the hackflag graph, when native 16.1.1 renders `-Tdot`, then its `pos`
  order equals the test's new expected order.
- Given `git diff --stat` for T2, then no non-comment line changes outside the
  47 fixtures and the hackflag expected array.
