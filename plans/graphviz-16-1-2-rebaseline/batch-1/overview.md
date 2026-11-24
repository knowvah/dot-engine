# Batch 1 — ADR, oracle defaults, pending inputs, failure sites, preflight

Sequential. T1 records the decision; T2+T3 flip the defaults the walks will read and set the 7 new inputs aside
(**one commit**: the corpus-manifest test is red between them, see the journal's planning row); T4 regenerates
the failure-site inventory; T5 builds the plugin dirs, proves the port unchanged and copies the old registries.
Nothing in batch 2 starts before T5's journal row.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | [ADR-0004](T1-adr-0004.md) | orchestrator | `docs/adr/0004-graphviz-16.1.2-oracle.md` | — | [x] |
| T2 | [Oracle defaults](T2-oracle-defaults.md) | typescript-pro | `test/corpus/{oracle-paths.mjs,build-carried-oracle.sh,gen-headless-gvbindir.sh,gvbindir-defaults.test.ts,oracle-env.test.ts,carried-selfcheck.ts}` | T1 | [x] |
| T3 | [Pending inputs](T3-pending-inputs.md) (same agent and commit as T2) | typescript-pro | `test/corpus/{enumerate.ts,corpus-manifest.json,corpus-manifest.test.ts}` | T1 | [x] |
| T4 | [Failure sites](T4-failure-sites.md) | typescript-pro | `test/corpus/{failure-sites.json,failure-sites.test.ts}` | T2 | [x] |
| T5 | [Preflight](T5-preflight.md) | orchestrator | `$BASE` only (no commit) | T4 | [x] |
