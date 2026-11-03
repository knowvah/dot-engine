# Decisions: part 9

AD-1 to AD-10 were approved by the user during planning (2026-11-03). They are locked; a
change is stop 4.

## AD-1: where the root's attributes reach components (111)
- **Context:** C's `agsubg` copies the parent's attribute values into a new subgraph, so
  `agget(component, "maxiter")` sees the root's value. The port's `buildSubgraph` leaves
  `sg.attrs` empty. Measured on neato: `maxiter`, `epsilon` and `stresswt` miss native by
  283–302 diffs on major, hier, sgd and KK with pack.
- **Decision:** copy the parent's attributes in `ccomps` and `pccomps`. Trial: those cases
  reach 0 diffs and all 11806 tests pass.
- **Rejected:** copying in `buildSubgraph`, because dot's `cccompsWithClusters` uses it too and
  2 tests in `oracle-segfault-pack-newrank.test.ts` fail. Fixing each reader with `aggetGraph`:
  about 8 sites, and a new reader can repeat the bug.
- **Consequence:** `src/layout/pack/index.ts` is 574 lines, over the hook's limit, and may not
  grow. T2 moves the `lib/pack/ccomps.c` ports to a new `src/layout/pack/ccomps.ts`, and
  `index.ts` re-exports them so callers do not change.

## AD-2: `compareEvents` ties (110)
- **Context:** `compare_events` returns false both ways for different rectangles at equal
  positions. libc++ `std::sort` is unstable but repeatable: its tie order does not depend on
  addresses. JS `Array.prototype.sort` is stable.
- **Decision:** measure first with a native harness on tie-heavy inputs. If the orders differ,
  port libc++'s `std::sort` as `src/util/libcxx-sort.ts` and use it at both `SweepLine.ts`
  sort sites. `bsd-qsort.ts` is the precedent. The source is LLVM `__algorithm/sort.h`,
  Apache-2.0 WITH LLVM-exception, stated in the file header as `arm-pow.ts` does.
- **Interface:** `libcxxSort<T>(a: T[], lt: (x: T, y: T) => boolean): void`, a boolean comparator
  as C's is. `Event` holds a `shared_ptr`, so it is not trivially copyable, which selects
  libc++'s non-branchless path; the harness confirms.
- **Rejected:** keeping the stable sort and documenting the difference.

## AD-3: `dir1 n40` (110)
- **Context:** native gives many variants across runs, and none of 29 sampled equals the port.
  `IncVPSC::satisfy` iterates `Blocks : std::set<Block*>` by address.
- **Decision:** build a scratch copy of native VPSC with `Blocks` ordered by creation index
  (never in `~/git/graphviz`) and compare with the port.
  - Match: the heap-address cause is proven. That build's output becomes the test fixture, and
    T9 adds the proof to the ledger bullet from part 8.
  - No match: another difference exists. Diagnose for about 2 h, then park with the artifact.
- **Rejected:** accepting the cause unproven.

## AD-4: `getGlobalImageSizer` (113)
- **Decision:** remove it. The fallback already lives in `findImageSize`, and it has no
  production caller. `image-ft-null.test.ts` tests behaviour through `setImageSizer`. This
  replaces part-8 AD-6 for the sizer only; `getGlobalImageResolver` has real callers and stays.
- **Rejected:** routing callers through it, which reworks working code to give it a caller.

## AD-5: `toDistType` (109)
- **Decision:** saturate as native arm64 does: ≥ 2^31 → `INT_MAX`, < −2^31 → `INT_MIN`, NaN → 0.
  `size_t wrap` returns to `DIJ_CASES`. No graph reaches this, so output cannot move (stop 10).

## AD-6: `ccomps` names (112)
- **Decision:** port `setPrefix` and `isLegal` (`ccomps.c`): the prefix is optional, illegal or
  absent gives `_cc_`, and the index is appended directly. `ccomps(g: Graph, pfx?: string | null)`.
  twopi, sfdp, circo and `isConnected` pass none, as C does (`isConnected` builds no subgraph in
  C at all, so its name is never seen). neato keeps `_neato_cc` (`neatoinit.c:58`).
  dot's `_cc_${idx}` in `cccompsWithClusters` already has the right form.
- **Check:** C's `agsubg(g, name, 1)` reuses an existing subgraph of that name; T6 probes a user
  `subgraph _cc_0` and opens a follow-up if the port differs.

## AD-7: circo root (new)
- **Decision:** port `blocktree.c:119-132` in full, in C's order: search the component for the
  graph's `root` (`agfindnode(g, ...)`; today `blocktree.ts:165` searches `g.parent`, so a root in
  another component throws in `doBlock`), then node-level `root=true` (`late_bool` on `ORIGN(n)`;
  unported, 214 diffs on a probe), then the first node.

## AD-8: sfdp `start` warning (112)
- **Decision:** warn in `tuneControl` when `parseStart` (the port of `setSeed`) gives
  `init !== INIT_RANDOM`, text `sfdp only supports start=random` through `agerr`.
  `resolveSeed` stays, so seeds and layouts do not move (stop 10).

## AD-9: release
- **Decision:** `fix`-class commits only, so a patch release. Commit unsigned and locally; the
  user re-signs with `git rebase -f main` and pushes. PR lands as a merge commit.

## AD-10: verification
- **Decision:** full survey and full bytediff against the T0 bundle, plus the quarantined ids.
  No corpus move is expected from 111: in `tests/` and `graphs/`, `maxiter`, `epsilon` and
  `stresswt` appear only in two `.xdot` outputs. Any move must match native (stop 8).

## Carried decisions
- The C at `~/git/graphviz` (16.1.0) is the spec; diagnosis mode for every discrepancy.
- Part-5 AD-1: unsigned local commits, the user re-signs. Part-5 AD-3: fix faithfully or park
  with the full artifact. Part-5 AD-17: `documentation-engineer` writes docs and locales.
- Part-8 AD-8: VPSC neighbour-set ties go by creation order.
- PR 119 (user decision): layouts that vary with `pow`, `hypot` or similar are accepted. A
  sensitive probe replays macOS's values in the test; runtime code does not change.
