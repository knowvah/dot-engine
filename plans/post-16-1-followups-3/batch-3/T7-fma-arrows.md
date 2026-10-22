# T7: `arrow_type_curve` fusion and `arrowEndClip` (item 29b, AD-6)

**Context:** `lib/common/arrows.c:134 arrow_type_curve` computes Bezier control points the
port computes plain (`src/common/arrows-types.ts:33`, `arrows-shapes-poly.ts:195-219`).
`src/layout/dot/edge-route-clip.ts:120-130 arrowEndClip` differs from
`lib/common/arrows.c:285 arrowEndClip` beyond fusion (T10 of part 2 found it; read that
journal row in `plans/post-16-1-followups-2/decision-journal.md`).

**Task:**
1. `arrow_type_curve`: read the disassembly; port the fused expressions exactly.
2. `arrowEndClip`: diff the port against `arrows.c:285-330` line by line; port every
   difference (control flow, the `elen`/`elen2` computations, the `bezier_clip` call with
   `inside` predicate), then apply the disassembly's fusion.
3. One commit covers both (one task); the journal row separates them.

**Write-set:** `src/common/arrows-types.ts`, `src/common/arrows-shapes-poly.ts`,
`src/layout/dot/edge-route-clip.ts` (+ tests).
**Read-set:** `arrows.c:120-200, 280-340`, `splines.c:60-100`, the disassembly.

**Acceptance criteria:**
- *Given* the C source, *when* compared with the new `arrowEndClip`, *then* every branch
  maps one-to-one (journal table).
- *Given* `arrowhead=curve` and `arrowtail=curve` probes (dot, neato), *then* SVG matches
  native at 0.01, or matches better than T0.
- *Given* byte-identity over corpus ids with arrows (dot, neato), *then* identical or
  toward native (else revert, stop 5).

**Observability:** N/A. **Rollback:** reversible.
