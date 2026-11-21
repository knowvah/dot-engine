<!-- SPDX-License-Identifier: EPL-2.0 -->
# T10: svg `_background` replay reads a freed fill colour (A13)

Follow [fork-finding-procedure.md](fork-finding-procedure.md). Slug:
`background-freed-fill`.

## Recorded mechanism (verify; do not trust)

`docs/known-divergences.md` A13 (`#a13-freed-fill-in-the-background-replay`):

- `emit_background` frees `clrs[0]` (`lib/common/emit.c:1518` at 16.1.1).
- svg's fill state still points at it, because `gvrender_resolve_color`
  keeps `color->u.string = name` (`lib/gvc/gvrender.c:193`).
- Native printed `fill=""` in 8 of 8 measured runs.
- Trigger: a hand-written `_background` (or graph `_draw_`) whose first
  filled op has no fill colour of its own, on a graph with a gradient
  `bgcolor` such as `bgcolor="red:blue"`.
- The port prints the gradient's first stop, as `src/gvc/emit-xdot.test.ts`
  pins.

## Read-set

- `docs/known-divergences.md` A13 section
- `src/gvc/emit-xdot.test.ts`: the pinning test, for the input shape
- C: `emit_background` and `gvrender_resolve_color`, by function

## Write-set

`plans/graceful-failure/upstream-drafts/background-freed-fill.md`.
Fork: `fix/background-freed-fill`.

## Note

An ASan build is the cleanest evidence (heap-use-after-free report).

## Observability and rollback

Observability: N/A (no new observable operations). Rollback: Reversible; delete the fork branch and close the fork issue. See the procedure.
