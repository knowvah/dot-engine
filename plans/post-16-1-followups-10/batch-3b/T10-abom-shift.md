# T10: `abomShift` on a no-free layout (118, AD-8)

**Context:** `abomShift` is port-only: it recovers C's rank parity after the label rank is inserted (`src/layout/dot/flat.ts:325`, read at `position-aux.ts:148` and `self-loop.ts:86`). It only ever
grows, so a no-free layout carries it over and a scratch graph's no-free render 3 on dot differs. C re-derives this each layout.

**Task:**
1. Test first: the scratch graph's no-free renders 1–3 on dot against a native `nofree` fixture, added through `src/gvc/__fixtures__/rerender/regen.sh`.
2. Reset `abomShift` when each dot layout starts, in `dotPhaseInit` (`src/layout/dot/index.ts:125`). Do not change the renumbering itself.

**Write-set:** `src/layout/dot/index.ts`, `src/layout/dot/flat.ts`, `src/gvc/rerender.test.ts`, `src/gvc/__fixtures__/rerender/`.

**Acceptance criteria:**
- *Given* the scratch graph, *when* laid out three times with no free, *then* render 3 matches native's.
- *Given* the smoke ids, *when* bytediffed, *then* output is byte-identical (stop 8).

**Commit:** `fix(T10): reset the abomination shift when a dot layout starts`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
