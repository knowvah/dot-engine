# Decisions: issue #145

## AD-1: reproduce on cluster prefixes; measure live heap per phase on both sides

- **Context:** the maintainer's prefix table gives whole-process peak RSS only. The lead
  (about 300 MB freed in one GC at the end of c800) points at one phase but does not name
  it. Native's own growth is superlinear, so a port-only measurement cannot tell port
  overhead from C growth.
- **Decision:**
  - Prefixes `c100`, `c200`, `c400`, `c800`, `c1600` from [harness/prefix.sh](harness/prefix.sh)
    into `$TMPDIR/issue-145/`. c800 is the working reproduction (about 30 s); c1600
    confirms. Size is measured in nodes and edges (count them once per prefix), not in
    cluster count.
  - **Port:** temporary markers that call `gc()` and print `process.memoryUsage().heapUsed`
    and `rss` after: parse/graph build, `dotRank`, `dotMincross`, `dotPosition`,
    `dotSameports`+`dotSplines`, `dotCompoundEdges`/postprocess, SVG render, and output
    string built (`src/layout/dot/index.ts:253-270`, `src/index.ts:92`). Run with
    `node --expose-gc --import tsx test/corpus/render-one.ts <prefix> dot`. Also record a
    peak between markers with `--trace-gc` (the largest heap before a mark-compact).
    The markers live only as `harness/markers.patch`; the tree is clean between runs.
  - **Native:** an instrumented copy in `$TMPDIR` (queue rules: rsync the tree, configure
    a fresh build dir with the oracle's `CMakeCache.txt` flags, own plugin dir, run
    `dot -c` once). At the same phase points (`lib/dotgen/dotinit.c` `dotLayout`, and
    around `gvLayoutJobs`/`gvRenderJobs` in `cmd/dot/dot.c`) print
    `malloc_zone_statistics(NULL, &s)`'s `size_in_use` to stderr. Check that the copy's
    output equals the oracle's on c800 before trusting it.
- **Consequences:** a per-phase table of port live bytes against native live bytes on
  three sizes. That names the phase that grows, and whether the ratio grows with size.
- **Rejected:** (B) port-only measurement: cannot separate C growth from port growth,
  which the done-when needs. (C) `--heap-prof` sampling: shows allocation, not what stays
  live. (D) native RSS per phase via `getrusage`: max RSS never falls, so it cannot show a
  phase that frees.

## AD-2: attribute the peak phase with a V8 heap snapshot

- **Context:** the phase table names where; the done-when needs which structure, and its C
  counterpart.
- **Decision:** at the peak marker, `v8.writeHeapSnapshot()` (gated by an env var inside
  the temporary patch). A summarizer in `harness/` sums `self_size` and count per
  (node type, constructor name) and prints one retainer path for each of the top 10.
  V8 strings cap at about 512 M characters, so a snapshot file over about 400 MB cannot be
  `JSON.parse`d whole: stream the `nodes` and `strings` arrays, or take the snapshot on
  c400. Confirm on c800 with counters in the markers (for example, array lengths of the
  top structures). Run tooling with a raised heap; that is tooling, not the port.
- **Consequences:** a ranked list of structures with bytes at two sizes, each with a port
  `file:line` and the C `file:line` it ports.
- **Rejected:** DevTools (headless session); `--heapsnapshot-near-heap-limit` as the main
  tool (it fires at the limit, not at a named phase; it stays the fallback).

## AD-3: how T2 classifies the growth

- **Decision:** for each top structure of the peak phase:
  - **Port artifact** when it has no C counterpart, when its size has a different order
    than its C counterpart's (for example O(n²) where C is O(n), a per-cluster copy, an
    array that keeps entries C frees, a closure or back-reference that keeps a phase's
    data alive past the point C frees it), or when the phase's port/native live-byte
    ratio grows by more than 1.25x from c800 to c1600.
  - **C-faithful** when the C counterpart has the same order and the phase ratio stays
    within 1.25x across sizes. A constant ratio above 1 is representation overhead (JS
    objects against packed C structs).
  - **Mixed** when both hold for different structures: T3 fixes the artifacts, T5
    documents the rest.
- **Evidence for the threshold:** native's own c800→c1600 RSS ratio is 3.3x for 2.3x input;
  the port's is 2.7x. Whole-process ratios therefore do not show a port artifact, so the
  test is per phase and per structure.

## AD-4: T3 changes are representation-only, byte-identical, and measured

- **Decision:** a change may replace a JS representation (typed arrays, packed records,
  dropping a retained reference at the point the C frees, reusing a buffer as the C does).
  It may not change an algorithm, iteration order, or a C function boundary (stop
  condition 5). Each change is its own commit and must: keep the port's c100-c800 SVG
  byte-identical base vs head; cut peak live heap on c800 by at least 3% (smaller savings
  are dropped, push-forward); carry a unit test for the representation contract it changes.
  At most three changes; more candidates become a `follow-up` issue.
- **Rejected:** changes judged by the corpus alone: the queue does not run the full corpus,
  and the prefix outputs are a stronger, cheap check on the exact code path.

## AD-5: a port artifact found in an algorithm that differs from C is a fix, not a change

- **Decision:** if T2 finds the port's algorithm builds a larger structure than the C does
  (the port is unfaithful), restoring the C behaviour is in scope, provided output stays
  byte-identical. If restoring it would change output, the port's current output is
  already a divergence: stop with the question (stop condition 5).

## AD-6: per-id heap cap in the survey

- **Context:** `test/corpus/survey.ts:384-396` spawns `tsx render-one.ts` with
  `process.env`. Planning confirmed that `NODE_OPTIONS=--max-old-space-size=12000` reaches
  tsx's child (heap limit 12,096 MB, against 4,192 MB without it). The time budget is
  already large enough: `renderBudgetMs` takes 3x the recorded port time
  (`perf.json`: 12,982,770 ms), about 10.8 h.
- **Decision:** a pure exported function in `survey.ts` builds the child env for an id:
  for an id in a `PORT_HEAP_MB` map it appends `--max-old-space-size=<MB>` to any existing
  `NODE_OPTIONS`; every other id gets `process.env` unchanged. `portSvg` takes the id. The
  map holds only `2475_1`, with a comment giving native's peak (8,410 MB RSS, 1,411.9 s,
  2026-11-10) and the factor. **Sizing:** T5's full render runs under a trial cap of
  `1.5 x R x 8,410 MB`, where R is head's port/native peak-RSS ratio on c1600. The
  committed cap is `ceil(1.25 x k x 8,410 MB)` rounded up to a whole GB, where k is the
  full render's peak RSS over 8,410 MB. Over 48 GB (half the host) is stop condition 6.
- **Survey parent:** once `2475_1` renders, the survey's parent runs `diffVerdict`
  (`survey.ts:469`) on two ~100 MB SVGs under the default heap. T5 measures that
  comparison; if it needs more than 3.5 GB, stop condition 6 holds, because landing the cap
  would then crash the maintainer's full survey.
- **Rejected:** (B) a global `--max-old-space-size` for every render: the maintainer's
  boundary forbids it. (C) a cap file in json: one entry does not need a data file.
  (D) sizing from the prefix ratio alone: the full render is run anyway, and measuring it
  beats extrapolating.

## AD-7: documentation

- **Decision:** C-faithful or mixed outcome: a new accepted-delta section in
  `docs/known-divergences.md` after A13, modelled on A10 (a runtime limit, not a logic
  gap), with a native vs port table (prefixes and full) and the per-phase finding. Port
  artifact outcome: no section; the cap's comment in `survey.ts` carries the numbers.
  `parity.json` is not edited by hand: the maintainer's full survey re-scores the id.

## Auto-confirmed (unattended)

Source `next`: no `queue:planned` issue was open; the `queue:ready` issues were #145, #167
and #189, and #145 is the lowest, with no "Blocked by" reference. Its `needs-ruling`
parking was lifted by the maintainer's scope comment (2026-11-10), which supplies the
done-when. Each decision above is the recommendation; the rejected options are listed
with it. Evidence gathered at planning: the survey spawn code
(`survey.ts:384-396`), the budget code (`survey.ts:93-148`), `perf.json`'s 2475_1 row, the
`NODE_OPTIONS` probe (4,192 → 12,096 MB), the cached native SVG
(`~/.cache/dot-engine/oracle/oracle/c2e610dcc867/2475_1.svg`, 101,313,598 bytes; check its
cache signature still matches the oracle before using it), and the dot pipeline's phase
calls (`src/layout/dot/index.ts:253-270`). The planner did not instrument anything: the
diagnosis is the mission.

## Baseline

`59a5b3ee`: `npm run typecheck` exit 0; `npm test` exit 0 (569 files, 13,451 tests).
Working tree clean.

## Rollback

Reversible. T3 changes are representation-only with byte-identical output; T4 is test
infrastructure; T5 is documentation. Revert the squash commit.
