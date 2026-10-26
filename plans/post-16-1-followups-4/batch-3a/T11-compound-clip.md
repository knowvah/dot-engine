# T11: compound clip distances and `clipToNodes` back-up (item 49, AD-4)

**Context:** `src/layout/dot/compound.ts:65-86` `arrowEndClipIdx`/`arrowStartClipIdx`
test `dist < elen` with unfused `dist` (`common/arrows-geometry.js`, `Math.hypot`);
`src/layout/dot/edge-route-routing.ts:144` `clipToNodes` lacks `lib/common/arrows.c:291-293`'s
`endp -= 3` back-up when the arrow is longer than the last segment.

**Task:** (1) port `arrows.c:285-293` into `clipToNodes` exactly (the `elen` test and
`endp -= 3`, and the start-side counterpart); (2) port compound.c's distance tests with
the form the dot_layout disassembly shows (AD-4).

**Write-set:** `src/layout/dot/compound.ts`, `src/layout/dot/edge-route-routing.ts`
(+ tests).
**Read-set:** `compound.ts:50-100`; `edge-route-routing.ts:120-170`;
`lib/common/arrows.c:270-330`; `lib/dotgen/compound.c` (`arrowEndClipIdx`,
`arrowStartClipIdx`); `$BASE/disasm/dot_layout.txt`.

**Acceptance criteria:**
- *Given* an edge whose last Bézier segment is shorter than its arrow, *when* clipped,
  *then* points equal a C harness of `arrowEndClip` with the back-up.
- *Given* the 19 compound/lhead/ltail ids and the arrowhead set (part 3 T7's sets A/B),
  *then* bytediff identical or every change toward native (0.01 probe).
- *Given* the speed set, *then* p50 ≤ 1.05×.

**Observability:** N/A. **Rollback:** reversible.
