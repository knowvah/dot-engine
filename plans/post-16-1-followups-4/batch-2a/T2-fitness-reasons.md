# T2: module-globals allowlist reasons (item 45)

**Context:** after part 3 T1 the statics listed in
`test/architecture/module-globals.fitness.test.ts` reset through `resetRenderState`
(`src/common/render-state.ts`), and `clType` is set in `src/common/graph-init.ts:330`. The
allowlist still holds; only its reasons are stale.

**Task:** for each allowlist entry, read the owning module and rewrite the reason to state
the current mechanism (registered reset with the `registerRenderState` call's file:line,
caller hook, debug hook, per-object memo, or set-before-read). Do not add or remove entries.

**Write-set:** `test/architecture/module-globals.fitness.test.ts`.
**Read-set:** `src/common/render-state.ts`; `grep -rn registerRenderState src`;
`src/common/graph-init.ts:320-335`.

**Acceptance criteria:**
- *Given* the edited test, *when* `npm test` runs, *then* it passes with the same entry set
  (diff touches reason strings only).
- *Given* each reset-backed entry, *then* its reason names the `registerRenderState` site.

**Observability:** N/A. **Rollback:** reversible.
