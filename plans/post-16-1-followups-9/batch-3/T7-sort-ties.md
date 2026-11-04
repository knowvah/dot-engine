# T7: `compareEvents` ties (item 110, AD-2)

**Context:** `generate-constraints.cpp:157,234` call `std::sort(events..., compare_events)`. Different rectangles at
equal positions compare false both ways. libc++'s sort is unstable but repeatable, and `SweepLine.ts:186,213` use
JS's stable sort, so the two may disagree on tie order. The oracle's build uses `/usr/bin/c++`; the SDK's libc++
header is `__algorithm/sort.h` (`_LIBCPP_VERSION` 220106 today, which may be newer than the oracle's build).

**Task:**
1. **Measure.** Extend part 8's `plans/post-16-1-followups-8/harness/T3/native-unit.cpp` (build pattern in
   `plans/post-16-1-followups-7/harness/T5/build.sh`) to dump the sorted event sequence before the sweep, on tie-heavy
   inputs: aligned equal-size rectangles at n = 5, 10, 24, 25, 40, 128, 200, 1000, in both X and Y passes. Confirm the
   native order repeats across ≥8 runs. Compare with the port's order.
2. **If every order agrees:** add a test pinning it, journal it, and stop there. The commit is `test(T7)`.
3. **If any order differs:** port libc++'s `std::sort` for this comparator as `src/util/libcxx-sort.ts`, in full: the
   small-size sorts, insertion sort, the partition, the pivot selection and the depth-limit heap fallback. Licence header
   as in `src/common/arm-pow.ts` (Apache-2.0 WITH LLVM-exception). Use it at both sort sites with a boolean comparator
   matching `compare_events`. Tests first, from the harness dumps, across all the sizes above.
4. Measure the sort on the largest input against the current one. Report the numbers.
5. Keep ipsep probes 22/22. A move is allowed only if the new result matches native (stop 7).

**Write-set:** `src/vpsc/SweepLine.ts`, `src/vpsc/SweepLine.test.ts`, `src/util/libcxx-sort.ts` and
`src/util/libcxx-sort.test.ts` (if needed), `plans/post-16-1-followups-9/harness/T7/`.
**Read-set:** `~/git/graphviz/lib/vpsc/generate-constraints.cpp:119-160,225-240`, `src/vpsc/SweepLine.ts:20-40,180-220`,
`/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/include/c++/v1/__algorithm/sort.h`, `src/util/bsd-qsort.ts` (form).

**Interface output, if ported:** `libcxxSort<T>(a: T[], lt: (x: T, y: T) => boolean): void`.

**Acceptance criteria:**
- *Given* tie-heavy inputs, *when* the harness dumps the native order, *then* the port's order is compared case by case
  and the result is journaled.
- *Given* a difference, *when* the ported sort runs, *then* its order equals native's on every case and size.
- *Given* the ipsep probes and the smoke ids, *when* run, *then* every change matches native.

**Commit:** `fix(T7): sort sweep events as libc++ std::sort does` (or the `test(T7)` form in step 2).
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
