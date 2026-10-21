# T3: `chore(T3)`: re-walk json circo world (item 21)

**Context:** `test/corpus/json-parity-circo.jsonl` row `tree-share-examples-world` still
records `diverged`, 50223 diffs, from before the previous mission's T12; the circo engine
track now records 533 (`test/corpus/parity-circo.jsonl`). Port circo world takes about
984 s; native about 6 s.

**Task:** after T1 lands, in a worktree of the batch head:
1. Copy the committed jsonl minus the world row to a scratch jsonl (single-id resume:
   `.agent-notes/perf-2371-pointset.md`, "single-id walk").
2. Run the json walk for circo with the full plugin dir; it resumes past every other row.
3. Splice the new row into the committed jsonl, regenerate `json-parity-circo.json` and
   `PARITY-circo-json.md` with the walk's own tooling, and regenerate whatever docs pages
   the walk tooling stamps (locales included). Restore any fixed-path file the walk
   overwrote that this task does not own.

**Write-set:** `test/corpus/json-parity-circo.jsonl`, `test/corpus/json-parity-circo.json`,
`test/corpus/PARITY-circo-json.md`, docs pages the json dashboard regenerates.
**Read-set:** `test/corpus/json-walk.ts`, `test/corpus/json-dashboard.ts`.

**Acceptance criteria:**
- *Given* the re-walk, *then* the world row reflects the current head (verdict and
  diffCount recorded in the journal) and every other row is byte-identical.
- *Given* `npx vitest run test/corpus test/docs`, *then* it passes.

**Observability:** N/A. **Rollback:** reversible (data files).
