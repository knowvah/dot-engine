# T11 — golden references (`test(T11)`)

## Context
`test/golden/refs-xdot/*.xdot` (221) have a generator, `gen-xdot-refs.ts` (deterministic engines only; after T1
it defaults to `/tmp/ghl1611-all`). `test/golden/refs/*.svg` (323) have none: they are native `-Tsvg` captures of
`manifest.json` entries. `refs-port/*.svg` (7) are port pins, not native: leave them. AD-6.

## Task
1. Test first: `test/golden/gen-svg-refs.test.ts` — given a manifest entry, the generator invokes the oracle with
   the entry's engine and `-Tsvg`, writes `refs/<reference>`, skips entries whose `reference` is in `refs-port/`,
   and refuses incomplete output (mirror `gen-xdot-refs.ts`'s rules). Use a fake `dot` as `oracle-env.test.ts` does.
2. `test/golden/gen-svg-refs.ts`, mirroring `gen-xdot-refs.ts` (oracle paths from `oracle-paths.mjs`, dot-only dir
   for dot, `ORACLE_GVBINDIR_ALL` otherwise; SPDX header; Node-only, never imported by `src/`).
3. Before regenerating: confirm the generator reproduces the current `refs/*.svg` **byte-for-byte** when pointed at
   16.1.0 (`DOT_BIN=~/git/graphviz/build/cmd/dot/dot GVBINDIR=/tmp/ghl` / the 16.1.0 all dir). Any mismatch means the
   refs were captured differently — stop and report the difference.
4. Regenerate both sets on 16.1.1; run `bash test/golden/gates.sh` and the xdot suite.
5. Each failing golden: cite its T9 group; if 16.1.1-caused, add it to `known-failing.json` with the issue number
   (format per `test/helpers/known-failing.ts:27`). Otherwise stop 1/5.
6. `test/golden/inputs/PROVENANCE.md`: say refs are graphviz 16.1.1 captures via the two generators.

## Write-set
`test/golden/gen-svg-refs.ts`, `test/golden/gen-svg-refs.test.ts`, `test/golden/refs/*.svg`,
`test/golden/refs-xdot/*.xdot`, `test/golden/known-failing.json`, `test/golden/inputs/PROVENANCE.md`.

## Acceptance criteria
- Given the generator on 16.1.0, then it reproduces the committed `refs/*.svg` byte-for-byte (step 3).
- Given the regenerated refs, then `gates.sh` passes 5/5 with every 16.1.1-caused failure in `known-failing.json`
  naming its issue, and no other failure.
- Given `refs-port/`, then it is unchanged.
- Gates: typecheck, `npm test`, goldens, corpus + docs green.

## Observability / rollback
N/A. Reversible (refs restorable from `$BASE/old/`).
