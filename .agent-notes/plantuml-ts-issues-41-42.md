# plantuml-ts issues 41 and 42 (2026-11-06)

## Observation: lldb on native without debug info still shows the edge object
- **Context**: Tracing plantuml-ts issue 41, where one merged parallel edge was clipped differently from native.
- **Finding**: The oracle's `libgvc` has symbols but no debug info, so `p pn` fails. On arm64, `register read x0 x3` plus `memory read -f f -c 8 -s 8 $x2` at `clip_and_install` gives `fe`, `pn` and the points. A stack-range `fe` (`0x16f…`) marks a `make_regular_edge` hackflag or `makefwdedge` view; a heap one is a real or fast edge. `shape_clip0` has its own symbol (`x3` = `left_inside`); `bezier_clip` is inlined.
- **Impact**: Which ends native clips can be read without rebuilding graphviz.
- **Confidence**: High

## Observation: a merged edge's chain segments resolve to the owner, not the edge
- **Context**: Same trace.
- **Finding**: For an edge class2 merged into another's chain (`merge_chain`), every chain segment's `to_orig` is the owner. Any port code that passes a chain segment to `beginPath`/`endPath` for the merged edge resets the owner's `clip` flags. C reaches the merged edge only through make_regular_edge's hackflag copies. Fixed in `edge-route-chain.ts` (`chainEnds`). `makeFwdEdge` still shares port objects with the real edge, where C copies them by value; no case where this changes output has been found.
- **Impact**: Check `resolveOrigEdge(segs[0]) === e` before reusing chain segments on another edge's behalf.
- **Confidence**: High for the mechanism; the `makeFwdEdge` remark is unmeasured

## Observation: agerr sites writing assembled text can drift from native
- **Context**: Porting `agseterrf` for plantuml-ts issue 42.
- **Finding**: Three `agwarningf` sites in C were written through `agerrLineOn` with bare text, so the port's stderr lacked `Warning: `: `curvedTop` (`src/layout/dot/splines.ts`, which also gained a blank line from an embedded `\n`), sgd's `resolveModel` and fdp's cluster-edge warning. All three are fixed and equal native 16.1.0 stderr. No `agerrLineOn` caller with bare text remains.
- **Impact**: `agerrLineOn` is for text whose prefix is already assembled; a C `agwarningf`/`agerrorf` site belongs on `agwarningf`/`agerrorf`.
- **Confidence**: High
