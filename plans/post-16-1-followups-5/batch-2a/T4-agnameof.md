# T4: `agNameOf` (AD-11, item 74)

**Context:** `lib/cgraph/id.c:163` `agnameof` returns `%<id>` (`LOCALNAMEPREFIX`) for an
anonymous graph, so neato messages print `graph %1`; the port prints an empty name at
`src/layout/neato/edge-len.ts:28`, `kk.ts:293`, `start.ts:150`, `start.ts:198`.
`src/render/map.ts:591` `mapGraphName` already returns `%1` for an anonymous root;
`src/model/cgraph-ops.ts:27` holds `LOCALNAMEPREFIX`.

**Task:** (1) `agNameOf(g: Graph): string` in `cgraph-ops.ts`: the name, or
`LOCALNAMEPREFIX + id` for an anonymous graph, where the id is the cgraph id the port
assigns (`Graph` creation order, `src/model/graph.ts:155`; confirm an anonymous root is
`1` and an anonymous subgraph gets its own id as native prints it — probe
`graph{subgraph{a--b[len=x]}}`). (2) `mapGraphName` delegates to it. (3) The four message
sites use it. (4) Tests per site against `$BASE/native/74*`.

**Write-set:** `src/model/cgraph-ops.ts` (+test), `src/render/map.ts`,
`src/layout/neato/edge-len.ts`, `kk.ts`, `start.ts` (message text only, + tests).
**Read-set:** `lib/cgraph/id.c:140-170`, `src/model/graph.ts:45-60,150-190`.

**Interface output:** `agNameOf(g)` (consumed by T10's `edge-len.ts` message).

**Acceptance criteria:**
- *Given* `graph{mode=bogus;a}` -Kneato, *then* stderr equals native
  (`… in graph %1 - ignored`).
- *Given* `graph{a--b[len=x]}` and the anonymous-subgraph probe, *then* the name printed
  equals native's.
- *Given* cmapx of an anonymous root, *then* output unchanged; dot/xdot re-serialization
  unchanged (bytediff identical).

**Observability:** N/A. **Rollback:** reversible.
