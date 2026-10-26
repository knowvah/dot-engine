# T12: `tailArrowEndClip` in C's reversed form (item 50, AD-4)

**Context:** `src/layout/dot/edge-route-clip.ts` `tailArrowEndClip` ports `arrowStartClip`
forward in tip-local coordinates with `Math.hypot` (`:234`); C `arrowStartClip`
(`lib/common/arrows.c`) reverses to `sp[0]=ps[start+3] … sp[3]=tip` with
`left_inside=false` on absolute coordinates. Equal in exact arithmetic, not bit-equal.
Part 3 T7 ported `arrowEndClip` the same way (journal line map).

**Task:** port `arrowStartClip` line for line as part 3 T7 did for `arrowEndClip`
(absolute coordinates, C point order, `inside` with the fused DIST the disassembly shows);
pin with clang harness vectors.

**Write-set:** `src/layout/dot/edge-route-clip.ts` (+ test).
**Read-set:** `edge-route-clip.ts:100-260`; `lib/common/arrows.c:280-340`;
part 3 T7 journal rows; `$BASE/disasm/libgvc.txt` `_arrowStartClip`.

**Acceptance criteria:**
- *Given* harness vectors (3+ inputs incl. elen ≤ 0), *then* points equal C bit for bit.
- *Given* part 3 T7's sets A/B (dot + neato × 5 formats), *then* bytediff identical or
  every change toward native.
- *Given* the speed set, *then* p50 ≤ 1.05×.

**Observability:** N/A. **Rollback:** reversible.
