# T11 — Shared libraries: cgraph, util, gvc, common (non-HTML)

**Agent:** typescript-pro. **Depends on:** T3. Follow [area-task-protocol.md](area-task-protocol.md).

**Rollback:** Reversible. **Observability:** N/A — library code; the SLIs are
survey verdicts and the ratchet length.

## Context

16.1 changes in `lib/cgraph` (`agnnodes_z` public API, `graph.c`, `attr.c`,
`utils.c`), `lib/util` (`list.c`, `random.c`, `gv_math.h`), `lib/gvc`
(`gvconfig.c` plugin loading, which is likely outside: the port has no
dynamic plugins; `gvevent.c`, `gvplugin.c`), and `lib/common` non-HTML
(`emit.c` layerlist leak, `postproc.c`, `arrow_clip`). Expect mostly refactors.
`random.c` is the exception: anything that changes a random sequence moves
force-directed output. Port side: `src/model/*` (cgraph), `src/util/*`,
`src/gvc/*`, `src/cdt/*`, `src/common/*` except `html*`.

## Acceptance

- Given every T3 row for T11, then each is ported with a test, or recorded as refactor-only with a reason.
- Given a `random.c` behaviour change, then the port's RNG matches the new C
  sequence on a pinned seed (unit test against values dumped from the 16.1 build).
- Given the area has no `port` rows, then the task closes as a journal-only no-op.

## Write-set

`src/model/*`, `src/util/*`, `src/gvc/*`, `src/cdt/*`, `src/common/*` except
`html*` + tests; `test/golden/known-failing.json` (removals).

## Commit

`fix(common): mirror graphviz 16.1 shared-library behaviour changes`
