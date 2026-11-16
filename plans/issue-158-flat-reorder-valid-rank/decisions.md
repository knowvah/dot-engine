# Decisions: issue #158

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-16. #158 is the lowest-numbered open `queue:ready` issue. Its one
blocker, #147, is closed. No issue is `queue:planned`. Nobody confirmed these
decisions. Each one names the rejected options and the evidence, so the
maintainer can audit it. "cf" below is the planning counterfactual: the base
plus [harness/counterfactual.patch](harness/counterfactual.patch), which is
AD-1's change.

### AD-1: port valid_rank as C has it

- **Decision:** `flatReorderBuildTemprank` (`src/layout/dot/mincross-flat.ts:154`)
  returns `boolean`. Where C has `else if (!MARK(v) && local_in_cnt == 0)
  postorder(...); else { valid_rank = false; break; }`, the port calls
  `postorder` and continues, and otherwise returns `false` at once (C's
  `break`). It returns `true` after the loop. `flatReorderRank` (`:183`) runs
  the reorder and `flatReorderFixEdges` only when it returned `true` and
  `temprank` is non-empty. `rootRank[r].valid = false` stays unconditional.
- **Why:** upstream `9fb21f570` (`git show -w 9fb21f570` in `~/git/graphviz`);
  the oracle source is `~/git/graphviz-16.1.1/lib/dotgen/mincross.c:1327-1390`.
  CLAUDE.md: keep function boundaries, port every branch, keep the order.
- **What it means:** a node with a constraining incoming flat edge always ends
  the loop (unmarked, it fails `!MARK && in == 0`; marked, it fails `!MARK`). So
  any rank holding a constraining flat edge is now left as mincross ordered it,
  and its "nonconstraint flat edges must be made LR" loop does not run. The
  issue warned of this ("fires on the right-hand node of any `rank=same {a->b}`
  chain"); native 16.1.1 does exactly that, and the cf equals native on 33 of
  the issue's 35 survey ids (README, Evidence).
- **Rejected:**
  - A pre-scan "any node has a constraining in-edge" before the loop. Same
    result, but not C's structure, and it walks the rank twice.
  - Keeping 16.1.0's behaviour. The oracle is 16.1.1 (ADR-0002).

### AD-2: re-capture only the native fixtures AD-1 turns red, and only when the head equals them

- **Decision:** T2 replaces, with native 16.1.1 captures, exactly the 16.1.0
  fixtures listed in [T2](batch-1/T2-recapture-fixtures.md), and only when the
  head's output equals the fresh capture byte for byte (stdout and, where the
  test reads it, stderr). Each replaced entry's comment says 16.1.1 and names
  this issue. A listed fixture whose capture differs from the head is a stop.
- **Why:** the tests compare with native, and native moved. #149's AD-3 did the
  same for its edge-order change. At planning the cf turned 41 tests red; with
  16.1.1 captures each of them equals the cf (README, Evidence). Re-capturing a
  whole regen set would pull in other 16.1.1 changes: the rerender `regen.sh`
  run against 16.1.1 changes 62 files, only 14 of them for this issue.
- **Rejected:** setting the expectations to the port's values. The tests claim
  native values.

### AD-3: the issue-130 aux ranks come from an instrumented 16.1.1 plugin

- **Decision:** `flat-adj-source-subgraph.test.ts`'s native values for V8, V9 and
  V11 (and a check that V1-V7 and V10 are unchanged) come from
  [harness/native-i130.sh](harness/native-i130.sh): a rebuilt
  `gvplugin_dot_layout` from an rsync'd copy of the oracle tree, unpatched first
  (byte-identical to the oracle on every variant, or the script stops), then with
  [harness/native-i130-trace.patch](harness/native-i130-trace.patch).
- **Why:** the test pins internal state (auxt, auxh, ranks, minset, the flat-edge
  flag) that no output format prints. Issue #130's mission got the 16.1.0 values
  the same way (`plans/issue-130-flat-adj-source-subgraph/decision-journal.md`).
  Run at planning ([harness/native-i130-1611.txt](harness/native-i130-1611.txt)):
  the unpatched rebuild equals the oracle on all 11 variants; V1-V7 and V10 are
  as the test says; V8 and V9 are now `auxt=a 0 auxh=b 1 max=1` (was `b`/`a`);
  V11 is `auxt=b 0 auxh=a 2 max=2 minset=b hasflat=0` (was `a`/`b`, flag 1).
  With those values in the test, the cf passes 44/44.
- **Rejected:** taking the port's values on the strength of the output match.

### AD-4: a non-adjacent flat group is routed in edgecmp order (seq), not left-tail first

- **Decision:** `collectNonAdjacentFlatGroup` (`src/layout/dot/splines-flat-multi.ts:109`)
  sorts the group by `seq` alone, which is C's order for the group: within one
  run of `dot_splines_` every earlier `edgecmp` key is equal (same main edge, rank
  and x difference, same ports through `makefwdedge`, same graph type, same
  label), so the last key, `AGSEQ(e)`, decides
  (`~/git/graphviz-16.1.1/lib/dotgen/dotsplines.c:543-640`). `make_flat_edge`
  gives edge `i` the `(i+1)`-th route out (`:1574-1617`).
- **Why:** after AD-1, on `700813` (rankdir=LR, the flat 2-cycle `B -> C`,
  `C -> B`) every node equals native but the two routes are swapped. Port trace
  (cf): `C` has order 0, so the left-tail-first sort puts `C -> B` (seq 1) first;
  C's edgecmp puts `B -> C` (seq 0) first, and native gives `B -> C` the inner
  route. Before AD-1, `B` was left of `C`, so both rules agreed. The rule's own
  decision record says to follow C if they differ
  (`plans/nonadjacent-flat-multi/decisions.md` AD-3: "Confirm against the
  oracle's per-edge spline assignment; if C's order differs, follow C").
  Reach: [harness/detector.sh](harness/detector.sh) `P158SORT` (README,
  Evidence).
- **Rejected:**
  - A follow-up issue only. `700813` would leave the mission with two changed
    lines that do not equal native, which the queue rules' toward-native
    exception does not allow.
  - Sorting by `edgecmp` itself. The group is collected per node pair, not per
    C run; inside it every other key is equal, and the lead edge is
    forward-normalized by `routeFlatEdgeGroupFaithful` whatever its side.

### AD-5: corpus records, the ledger and its locale pages stay as they are

- **Decision:** no edit to `test/corpus/*` (parity files, accepted-divergence and
  walk registries, `known-divergences-examples.test.ts` including
  `DOC_CLAIMS_CONFORMANT`), `docs/known-divergences.md` or the 23
  `docs-site/*/divergences.md` pages. The issue comment lists, for the
  maintainer's survey over the branch: `2368` back into `DOC_CLAIMS_CONFORMANT`
  (and its comment at `:44-45`), the 16 walk-registry entries the issue names,
  the #158 row, the stale `2723` paragraph (`docs/known-divergences.md:665-674`,
  "native segfaults … the port throws") and the #159 row's `2723` claim.
- **Why:** #149 (AD-5) and #150 (AD-3) did the same. Verdicts come from the full
  survey, which the queue rules reserve for the maintainer.
  `known-divergences-examples.test.ts` reads `parity.json`, not live output, so
  it stays green.
- **Exception:** `test/golden/known-failing.json` must shrink in T1: its entries
  run as `test.fails` and go red the moment they pass.

### AD-6: how "equals native" is judged

- **Decision:** with [harness/native-compare.sh](harness/native-compare.sh):
  plain, xdot and cmapx byte for byte; svg from `<g id="graph0"` on (the port's
  generator comment and `<svg>` line breaks are its own convention); json parsed,
  keys sorted, numbers at 3 decimals. A json root `"name": ""` against native's
  `"%1"` is #185 and is on the base too; a subgraph `nodes` list order is #199.
  Both predate the mission and are listed, not chased. On `2723`, `2756` and
  `2756_1` the base threw, so the #185 line is new on the head and `toward.mjs`
  reports `FAIL a=1`; that one line is the only difference from native there.
- **Toward native:** a changed job that is not equal to native is checked with
  [harness/toward.mjs](harness/toward.mjs) (the queue rules' second exception
  on line multisets: every new head line is a native line; every base line that
  was a native line stays). `2239` passes: its three arrowhead lines that differ
  from native in the last digit (`7269.52` against `7269.53`) are on the base
  too, so they predate the mission.
- **`1472`:** its divergence predates the mission (#207: three node widths, so
  every x downstream differs) and `parity.json` records it as `oracle-error`.
  Lines cannot match native (the line check fails both ways; its xdot `b=2` is
  two wrapped fragments of spline strings that matched native by coincidence),
  so it is judged by rank order instead
  ([harness/rankorder.py](harness/rankorder.py)): at planning
  3 ranks differ from native's node order on the head and 4 on the base, and
  every rank that matched on the base still matches. List it under
  "toward-native changes" with those counts.
- **`2781`, `2781_1` (and `1314`):** native exits 1 with `Error: Edge length …
  larger than maximum 2147483647 allowed` and prints a degenerate drawing. That
  is #162's failure path, which the port does not have yet. There is no native
  layout to compare with; list them with their counts, as the issue does for
  `1314`.

## Baseline

Measured at planning on `f939503d`:

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 580 files, 13692 passed, 18 expected fail |
| `bash test/golden/gates.sh` | 5/5 PASS |
| `npx vitest run test/corpus test/docs` | 25 files, 2863 passed |

Oracle preflight: `/tmp/ghl1611/config8` and `/tmp/ghl1611-all/config8`
present; `dot -V`: `graphviz version 16.1.1 (20261109.2225)`.

## Rollback

Reversible: revert the squashed commit, which restores the 16.1.0 fixtures with
it. No data, API or format contract changes; `flatReorderBuildTemprank` is
internal (exported for tests only, not from `.`, `./api` or `./render`).

## Operational readiness (auto-confirmed)

Observability N/A (a library; C prints nothing on this path). No API, schema or
format change. Load envelope unchanged: AD-1 removes work on ranks it skips.
