<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 5: fork findings (issues and pushed fix branches)

T10–T13 run in parallel. Each follows
[fork-finding-procedure.md](fork-finding-procedure.md) in its own fork
worktree. None touches `src/`, and none writes the registry (T14 links
them).

| ID | Finding | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T10 | svg `_background` replay reads a freed fill colour (A13) | cpp-pro | `plans/graceful-failure/upstream-drafts/background-freed-fill.md` | T7 | [x] |
| T11 | `T` op in a graph `_draw_` segfaults in `xdotBB` | cpp-pro | `plans/graceful-failure/upstream-drafts/xdotbb-null-span.md` | T7 | [x] |
| T12 | `mode=hier dim=4` writes past `directions` in `stress.c` | cpp-pro | `plans/graceful-failure/upstream-drafts/stress-directions-oob.md` | T7 | [x] |
| T13 | fdp output depends on heap addresses (node-pointer comparisons) | cpp-pro | `plans/graceful-failure/upstream-drafts/fdp-pointer-compare.md` | T7 | [x] |

Each finding produces at most one fork issue, so there are at most 4 here
(the cap is 5, stop 10). A finding that is already fixed or already
reported upstream is recorded and skipped, with no substitute.

Gates: 1–5. The fork's own tests are each task's evidence.
