# T2: `w5.gv` reads `.ll` of undefined (128)

**Context:** `digraph { {rank=same; a; b} a:n->b:n [minlen=3]; a:s->b:s [weight=0]; a->b [weight=0, label="x"]; }`
(`harness/T0/w5.gv`) throws `Cannot read properties of undefined (reading 'll')` on `main` `1e55cf7f`; native renders it.
Stack: `edge-route-faithful.ts:289` ← `:327` ← `:344` ← `edge-route-chain.ts:162` (`endSeg`) ← `:194` ← `:229`
(`routeChainSegmented`) ← `:336` ← `edge-route.ts:282`. A same-rank pair with `minlen=3` and a labelled flat edge: a rank
box or vnode the chain router expects is missing. Part 10's `.agent-notes/plantuml-ts-issues-41-42.md` covers
`chainEnds` and merged chains. AD-1.

**Task:** diagnose which C path native takes for each edge (flat, flat-labelled, or regular via `minlen`), find where
the port's routing departs, fix it faithfully, and pin native's `-Tdot` from `harness/T0/w5.dot` in
`src/layout/dot/flat-minlen-w5.test.ts`.

**Write-set:** `src/layout/dot/edge-route-faithful.ts`, `src/layout/dot/edge-route-chain.ts` (498 lines: split along C
function boundaries rather than grow past 500), `src/layout/dot/flat-minlen-w5.test.ts` (new).
**Read-set:** `lib/dotgen/dotsplines.c:make_regular_edge`, `make_flat_labeled_edge`, `rank_box`, `maximal_bbox`;
`src/layout/dot/edge-route-faithful.ts:270-350`, `src/layout/dot/edge-route-chain.ts:140-240`.

**Acceptance criteria:**
- *Given* `w5.gv`, *when* rendered with dot, *then* no throw, and `-Tdot` equals `harness/T0/w5.dot`.
- *Given* the fix, *then* the ARTIFACT names which edge reached the router with which missing box, and why C has it.
- *Given* the smoke bytediff, *then* every other first render is identical (stop 8).

**Commit:** `fix(T2): <mechanism>`, ≤72 chars, e.g. `fix(T2): give the flat minlen chain its rank boxes as c does`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
