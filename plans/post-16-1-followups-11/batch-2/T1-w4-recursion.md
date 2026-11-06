# T1: `w4.gv` recurses without end (128)

**Context:** `digraph { {rank=same; a; b} a:n->b:n [constraint=false]; a:s->b:s [constraint=false]; a->b [constraint=false]; }`
(`harness/T0/w4.gv`) throws `Maximum call stack size exceeded` on `main` `1e55cf7f`; native renders it. The stack cycles
`splines-flat.ts:370` → `init.ts:243` → `nodeinit.ts:339` → `poly-init.ts:99` → `make-label.ts:118`. Three flat adjacent
edges, two with compass ports: C's `make_flat_adj_edges` (`lib/dotgen/dotsplines.c`) lays the pair out in an auxiliary
graph, recursively, when ports or labels are present. AD-1.

**Task:** diagnose where the port's recursion departs from C (does C recurse at all here, and on what graph; what stops
it), state the mechanism, fix it faithfully, and pin native's `-Tdot` from `harness/T0/w4.dot` in
`src/layout/dot/flat-adj-w4.test.ts`.

**Write-set:** `src/layout/dot/splines-flat.ts` (571 lines: may not grow; split along C function boundaries into a new
`splines-flat-*.ts`), `src/layout/dot/init.ts`, `src/layout/dot/flat-adj-w4.test.ts` (new).
**Read-set:** `lib/dotgen/dotsplines.c:make_flat_adj_edges`, `lib/dotgen/dotinit.c:dot_init_subg`, `dot_init_node_edge`;
`src/layout/dot/splines-flat.ts:340-400`, `src/layout/dot/init.ts:220-260`.

**Acceptance criteria:**
- *Given* `w4.gv`, *when* rendered with dot, *then* no throw, and `-Tdot` equals `harness/T0/w4.dot`.
- *Given* the fix, *then* the hand-back's ARTIFACT carries mechanism, origin `file:line`, causal chain and what was ruled out.
- *Given* the smoke bytediff, *then* every other first render is identical (stop 8).

**Commit:** `fix(T1): stop the flat-adjacent aux layout recursing as c does`, or the subject the mechanism dictates.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
