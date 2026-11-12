# T2: attribute the peak phase and write the diagnosis artifact

## Context

[decisions.md](../decisions.md) AD-2, AD-3, AD-5. T1 names the peak phase and the phase
whose port/native ratio grows. The maintainer's candidates, **to check, not conclusions**:
JS objects where C has packed structs, arrays that never shrink, retained closures or
back-references, per-cluster copies.

## Steps

1. Re-apply `harness/markers.patch`, add an env-gated `v8.writeHeapSnapshot()` at the peak
   marker, and take a snapshot on c800 (c400 if the file is over about 400 MB and you do
   not stream it). Snapshot files go under `$TMPDIR/issue-145/`, never the repo.
2. Write `harness/heap-summary.mjs`: self size and count per (type, constructor), top 30,
   and one retainer path for each of the top 10. Run it with
   `node --max-old-space-size=16384`. Take a second snapshot at the next size up and
   compare: which structures grow faster than the node count?
3. For each top structure, find the port code that builds it (`file:line`) and the C code
   it ports (`file:line` in `~/git/graphviz/lib/`). Compare the orders: what does C
   allocate per node, per edge, per cluster, per rank? When does C free it
   (`free_*`, `agdelrec`, end of phase) and when does the port drop the last reference?
4. Classify each per AD-3 and set `outcome`.
5. Write the diagnosis artifact to the journal: **mechanism** (one or two sentences),
   **origin** (`file:line`), **causal chain** (why the heap grows to the limit on the full
   graph), **ruled out** (each maintainer candidate and each other structure eliminated,
   with the number that eliminated it). Add the interface table from
   [overview.md](overview.md).
6. If the artifact cannot be written, stop (stop condition 4) with what is ruled out and
   the next instrument.
7. Revert the patch. Commit `docs(T2): diagnose the 2475_1 heap growth`.

## Write-set

`plans/issue-145-2475-heap/harness/**`, `plans/issue-145-2475-heap/decision-journal.md`.

## Read-set

T1's journal rows; `src/model/**` and the `src/layout/dot/**` files the retainer paths
name; their C counterparts.

## Acceptance criteria

- Given the snapshot summary, when T2 is done, then every structure over 5% of the peak
  phase's live heap has a port `file:line`, a C `file:line` (or "no C counterpart"), and
  a class.
- Given the journal, when read, then it holds a diagnosis artifact with a non-empty ruled
  out list naming each of the maintainer's four candidates.
- Given the T2 commit, when `git diff 59a5b3ee -- src` runs, then it is empty.

## Observability / rollback

Observability: N/A. Rollback: reversible; nothing under `src/`.
