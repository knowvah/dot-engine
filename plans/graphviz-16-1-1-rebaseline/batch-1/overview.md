# Batch 1 — oracle defaults and preflight

T1 fixes the defaults the walks will read; T2 then builds the plugin dirs, proves the port unchanged and
clears the resume files. Nothing in batch 2 starts before T2's journal row.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | [Oracle defaults](T1-oracle-defaults.md) | typescript-pro | `package.json`, `test/corpus/{gen-headless-gvbindir.sh,engine-walk.ts,json-walk.ts,map-walk.ts,plain-walk.ts,gvbindir-defaults.test.ts,README.md}`, `test/golden/gen-xdot-refs.ts` | — | [x] |
| T2 | [Preflight](T2-preflight.md) | orchestrator | `$BASE` only (no commit) | T1 | [x] |
