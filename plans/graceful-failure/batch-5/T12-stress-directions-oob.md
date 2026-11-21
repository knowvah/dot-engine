<!-- SPDX-License-Identifier: EPL-2.0 -->
# T12: `mode=hier dim=4` writes past `directions` in `stress.c`

Follow [fork-finding-procedure.md](fork-finding-procedure.md). Slug:
`stress-directions-oob`.

## Recorded mechanism (verify; do not trust)

`docs/known-divergences.md`, "Native crashes and heap-address variation
(part 10)":

- With `mode=hier dim=4` on two nodes, native writes past `directions`
  (`lib/neatogen/stress.c:514` at 16.1.1).
- In some runs it aborts (exit 133 in 5 of 16 runs).
- The port renders.

## Scope

**Only** the `dim=4` out-of-bounds write. The separate `mode=hier dim=3
len=0.001` heap corruption has **no proven site**, so it is out of scope
for filing (stop 9). If instrumentation shows the same root, say so in the
issue as evidence. Do not file a second issue.

## Read-set

- `docs/known-divergences.md`, the part 10 bullets
- C: the function containing `stress.c:514`, and the allocation of
  `directions`

## Write-set

`plans/graceful-failure/upstream-drafts/stress-directions-oob.md`.
Fork: `fix/stress-directions-oob`.

## Note

Use ASan for the evidence (heap-buffer-overflow report, with the allocation
size against the index).

## Observability and rollback

Observability: N/A (no new observable operations). Rollback: Reversible; delete the fork branch and close the fork issue. See the procedure.
