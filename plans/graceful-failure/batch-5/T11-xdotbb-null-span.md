<!-- SPDX-License-Identifier: EPL-2.0 -->
# T11: `T` op in a graph `_draw_` segfaults in `xdotBB`

Follow [fork-finding-procedure.md](fork-finding-procedure.md). Slug:
`xdotbb-null-span`.

## Recorded mechanism (verify; do not trust)

`docs/known-divergences.md`, "Native crashes and heap-address variation
(part 10)":

- A `T` op in a graph `_draw_` or `_background` makes native segfault
  (exit 139).
- `op->span` is NULL outside neato `-n` (`xdotBB`,
  `lib/neatogen/neatoinit.c:560` at 16.1.1).
- The port draws no text for it.

## Read-set

- `docs/known-divergences.md`, the part 10 bullets
- C: `xdotBB` and where `span` is populated (find the callers with
  `ast-grep`)

## Write-set

`plans/graceful-failure/upstream-drafts/xdotbb-null-span.md`.
Fork: `fix/xdotbb-null-span`.

## Note

The fix must not change neato `-n` behaviour, where `span` is set. The
test should cover both: no crash without `-n`, and `-n` output unchanged.

## Observability and rollback

Observability: N/A (no new observable operations). Rollback: Reversible; delete the fork branch and close the fork issue. See the procedure.
