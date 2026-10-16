# T3: `docs(T3)`: refresh the architecture docs

**Context:** `/explore` refreshed `docs/architecture/overview.md` (uncommitted, describes
`main` at `2983eea8`). Four docs are still stale: `inventory.md` and `tech-health.md` (15.0
oracle, TypeScript 5); `data-flow.md` and `components.md` (written before the async API
and `src/async/`).

**Task:** run `/explore` in supplement mode for those four docs. Keep the refreshed
overview and drop its "stale" labels once the four are current. Commit all
`docs/architecture/*.md`.

**Write-set:** `docs/architecture/*.md`. **Read-set:** `package.json`, `src/` layout,
`docs/adr/0001-graphviz-16.1-oracle.md`, `test/corpus/PARITY.md`, `test/corpus/PERF.md`.

**Acceptance criteria:**
- *Given* the docs, *when* they are grepped, *then* none presents graphviz 15.x as the
  oracle or TypeScript 5 as the stack.
- *Given* `data-flow.md` and `components.md`, *then* both cover the async API
  (`renderSvgAsync`, `renderSvgInto`, prefetch).
- *Given* every PlantUML block, *when* run through `plantuml --check-syntax`, *then* it
  passes.

**Observability:** N/A. **Rollback:** reversible.
