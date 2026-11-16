# T1 — oracle defaults (`test(T1)`)

## Context
`test/corpus/oracle-paths.mjs` already names the 16.1.1 binary and two plugin dirs, but three defaults still
pair the 16.1.1 binary with the wrong plugins (8.0.15 vs 8.0.16, the ABI mismatch ADR-0001 forbids):
- `package.json:70` `survey`: `GVBINDIR=${GVBINDIR:-/tmp/ghl}`.
- `test/corpus/engine-walk.ts:115`, and the same pattern in `json-walk.ts:80-81`, `map-walk.ts:49`,
  `plain-walk.ts:63`: non-dot engines default to `ORACLE_GVBINDIR` (core + dot_layout only), so `-Kneato`
  and friends cannot load their layout plugin.
- `test/golden/gen-xdot-refs.ts:13-15` needs `neato_layout` but defaults to the dot-only dir.
Nothing builds `/tmp/ghl1611-all` (AD-2). The fitness test `gvbindir-defaults.test.ts` scans `test/` only, so it
missed `package.json`.

## Task
1. `gen-headless-gvbindir.sh`: add a mode (e.g. second argument `all`, or a sibling invocation) that also links
   `libgvplugin_neato_layout.*` and runs `dot -c`, writing `/tmp/ghl1611-all` by default. Keep the existing
   dot-only behaviour byte-for-byte when called as today. Its defaults mirror `oracle-paths.mjs`.
2. Walkers: when the engine is not `dot`, default `GVBINDIR` to `ORACLE_GVBINDIR_ALL`; `GVBINDIR` env still wins.
   Prefer one small exported helper (in `oracle-paths.mjs`, e.g. `defaultGvbindir(engine)`) over four copies.
3. `gen-xdot-refs.ts`: default to `ORACLE_GVBINDIR_ALL`.
4. `package.json` `survey`: drop the `/tmp/ghl` literal so the survey takes the module default (keep
   `GVBINDIR` overridable); `survey:setup` keeps building the dot-only dir.
5. `gvbindir-defaults.test.ts`: also scan `package.json` scripts for oracle path literals; test the helper and the
   `.sh` `all` defaults against the module.
6. `test/corpus/README.md:93-94`: replace the stale 15.0.0 / `/tmp/gvplugins` lines with the module's values.

## Write-set
`package.json`, `test/corpus/gen-headless-gvbindir.sh`, `test/corpus/oracle-paths.mjs` (+ its `.d.mts`),
`test/corpus/engine-walk.ts`, `test/corpus/json-walk.ts`, `test/corpus/map-walk.ts`, `test/corpus/plain-walk.ts`,
`test/corpus/gvbindir-defaults.test.ts`, `test/corpus/README.md`, `test/golden/gen-xdot-refs.ts`.

## Read-set
`test/corpus/oracle-paths.mjs`, `test/corpus/gvbindir-defaults.test.ts`, `test/corpus/engine-walk.ts:100-200`,
`docs/adr/0002-graphviz-16.1.1-oracle.md` (decisions 1–3), [decisions.md](../decisions.md) AD-2.

## Acceptance criteria
- Given `engine-walk.ts neato` with no `GVBINDIR`, when the oracle dir is resolved, then it is `/tmp/ghl1611-all`;
  with `GVBINDIR=/x` it is `/x`; for `dot` it is `/tmp/ghl1611`.
- Given a `package.json` script containing `/tmp/ghl`, when the fitness test runs, then it fails naming the script.
- Given `sh test/corpus/gen-headless-gvbindir.sh` with no arguments, then its output dir and links equal today's;
  given the `all` mode, then `/tmp/ghl1611-all` holds core, dot_layout and neato_layout and `dot -c` succeeded.
- Gates: typecheck, `npm test`, `npx vitest run test/corpus test/docs` green.

## Interface contract (consumed by T2–T8, T11)
`defaultGvbindir(engine: string): string` exported from `oracle-paths.mjs` (or equivalent named in the hand-back);
`gen-headless-gvbindir.sh` `all` mode producing `ORACLE_GVBINDIR_ALL`.

## Observability / rollback
N/A — no new observable operations. Reversible (revert the commit).
