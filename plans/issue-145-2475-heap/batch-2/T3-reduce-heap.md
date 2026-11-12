# T3: fix the port artifacts and remove constant overhead, byte-identically

## Context

[decisions.md](../decisions.md) AD-4, AD-5 and the README's boundaries. Each change
addresses one structure from T2's table at the origin T2 named.

## Steps (per change, T3a then T3b then T3c)

1. **Red:** write a unit test for the representation contract the change touches (for
   example: a structure is released after its phase, a typed array holds the same values
   the object array held, a buffer is reused). It fails on the current head, or pins the
   values the new representation must reproduce.
2. **Green:** make the change at the origin. Keep C function boundaries, iteration order
   and side-effect order. Port comments keep their `@see` tags; add a sentence saying what
   the representation stands for in the C.
3. **Byte check:** render c100, c200, c400 and c800 with the base and with the head; every
   SVG must be byte-identical (`cmp`). Any difference: revert the change (stop condition
   3).
4. **Measure:** peak RSS and peak live heap (T1's method) on c800. Under 3% saved on peak
   live heap: revert and journal the number (push-forward). Otherwise measure c1600 too.
5. Gates 1-2, then commit `perf(T3a): <what>` with the numbers in the body.

After the last change, record the interface numbers from [overview.md](overview.md).

## Write-set

Bounded: the `src/` files named as origins in T2's artifact, plus their colocated tests,
at most four `src/` files per change, all under `src/layout/dot/`, `src/model/`,
`src/common/`, `src/render/` or `src/util/`. Anything else, or a file whose Gate 4 cap
the change would exceed, is stop condition 1. Journal rows go to
`plans/issue-145-2475-heap/decision-journal.md`.

## Read-set

T2's artifact; the origin files; their C counterparts; `test/golden/line-limit-baseline.txt`.

## Interface contracts

No exported signature in `src/index.ts` changes. Internal types may change shape only
where every caller is in the write-set.

## Acceptance criteria

- Given a T3 change, when c100-c800 render on base and head, then every SVG is
  byte-identical.
- Given a T3 change, when c800 is measured, then peak live heap is at least 3% lower than
  before the change.
- Given the change's unit test, when run on the commit before the change, then it fails or
  pins the values the change must keep.
- Given all T3 changes, when gates 1-4 run, then they pass.

## Observability / rollback

Observability: N/A (library code, no runtime telemetry). Rollback: reversible; each change
is one commit until the squash, and output is byte-identical.
