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

## Observation: libc++ std::sort path and tooling details found by T7
- **Context**: T7's native harness.
- **Finding**: `generate-constraints.cpp.o` in `libvpsc.a` is ThinLTO bitcode, so `strings -a` reads mangled template
  names, which show the non-branchless path and ABI tag `nqe220106`. `sort.h` is byte-identical in SDK 26.5 and 27.2 though
  `_LIBCPP_VERSION` differs. A McIlroy adversary with a freeze budget reaches the depth-limit heap fallback, ties included.
  Event order repeats across environments; constraints from `same`, `touch` and `overlap` still vary through `Node*` ties.
- **Impact**: separate sort order from address order when comparing VPSC with native.
- **Confidence**: High

## Observation: check-complexity.py --help hangs
- **Context**: T7.
- **Finding**: `python3 ~/.claude/hooks/check-complexity.py --help` reads stdin and blocked a shell for 180 s.
- **Impact**: do not call it by hand without input.
- **Confidence**: Medium (reported by T7)

## Observation: native repeats less than it appears to, for reasons other than write-back
- **Context**: T11, the 25 `plain` cases native does not repeat.
- **Finding**: `plain` has no `attach_attrs`. `graphs-b56` varies through corrupted label bytes between processes. sfdp and fdp `2184` vary
  through process-global state (a fresh graph in one process gives the same render 2; the C `rand` stream is the likely cause, untraced). dot
  `1581`, `2521` and fdp `graphs-fdp` carry subgraph membership changes from the first cycle. fdp `nshare-pack_neato1` is unexplained.
- **Impact**: a second-render comparison needs native's own repeatability first; the port, per AD-4, repeats on the process-global cases.
- **Confidence**: High for the classes; Medium for membership as the cause.

## Observation: the port's dot and xdot writers do not mutate g.attrs; layouts do
- **Context**: T11.
- **Finding**: fdp adds `label`, `style` and `shape` on nodes, patchwork adds `shape`; `src/render/dot.ts` and `agwrite.ts` overlay computed values at
  output. A layout that throws after a reset leaves `laidOut` unset. A subgraph laid out after its root was freed is not reset. Neither is pinned.
- **Impact**: rendering does not feed the next layout, unlike native.
- **Confidence**: High

## Observation: first-render JSON depends on not seeing the layout's bb attribute
- **Context**: T14 porting `gvLayout`'s `bb` write.
- **Finding**: the CLI's `gvLayoutJobs` never writes `bb`, and JSON first renders were built against that, while `gvLayout`, which the port's `ctx.layout` mirrors, does. `src/gvc/layout-bb.ts`
  holds the difference, and the JSON writer reads root attributes without it. `context.ts` cannot import `viewport.ts` or style-resolve at runtime: the cycle breaks `PenType` at load.
- **Impact**: the oracle is the CLI, so check which entry point a C write lives behind before porting it.
- **Confidence**: High

## Observation: shell grep silently skips some source files as binary
- **Context**: T14.
- **Finding**: `grep` here is ugrep and skips `src/render/json.ts` as binary; `grep -a` or `/usr/bin/grep` reads it.
- **Impact**: an empty search result over `src/` is not proof of absence.
- **Confidence**: Medium (reported by T14; the older note on ugrep agrees)
