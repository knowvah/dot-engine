# post-16-1-followups-9 mission — observations (2026-11-03)

## Observation: native's second xdot render on one graph never equals its first
- **Context**: measuring plantuml-ts issue 37 with a native `gvLayout`/`gvRenderData`/`gvFreeLayout` loop.
- **Finding**: on 35 smoke ids × 8 engines, native's second `xdot` differs from its first in all 280 cases; on `plain`
  it repeats in 255 of 280. A probe that renders `xdot` twice and calls any difference a port bug overstates the
  defect. The attribute write-back is the suspected cause and was not traced.
- **Impact**: compare re-render behaviour with native's second output, not with the port's first.
- **Confidence**: High for the counts; Low for the cause.

## Observation: git cherry-pick signs under the repo's commit.gpgsign=true
- **Context**: landing T5 from its worktree.
- **Finding**: plain `git cherry-pick` fails with `failed to write commit object` and leaves the changes staged.
  `git -c commit.gpgsign=false cherry-pick --continue --no-edit` completes it.
- **Impact**: land mission commits with `git -c commit.gpgsign=false cherry-pick <ref>`.
- **Confidence**: High

## Observation: a corpus id with node root=true can be unmoved by the node-root branch
- **Context**: T4 bytediff showed 0 diffs although `graphs-p` sets `kernel [root=true]`.
- **Finding**: `kernel` is declared first, so it is also the fallback first node. Fixtures that test a node root must
  declare it after the edges.
- **Impact**: a zero-diff result on such ids is not coverage of `find_blocks`' node branch.
- **Confidence**: High
