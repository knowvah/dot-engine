# T14 — golden references (`test(T14)`, typescript-pro)

## Context
`test/golden/gen-svg-refs.ts` (svg refs plus non-manifest xdot refs) and `gen-xdot-refs.ts` regenerate the
native refs from `oracle-paths.mjs` (16.1.2 carried after T2). They refresh only refs that exist, and accept
complete output regardless of exit status (`gen-svg-refs.ts` header: pt-issue-31 exits 1 on routing warnings).
`refs-port/*.svg` are port pins: leave them. AD-6, AD-2.

## Task
1. Reproducibility first: point both generators at the 16.1.1 carried build (`DOT_BIN=~/git/sseely/graphviz-carried/build/cmd/dot/dot`,
   `GVBINDIR=/tmp/ghl1611-carried` / `-all`) into a scratch copy and confirm they reproduce the committed refs
   byte-for-byte. Any mismatch: stop and report it (the refs were captured differently).
2. Regenerate both sets on 16.1.2. Run `bash test/golden/gates.sh` and the xdot suite.
3. **Render skip (AD-2):** a ref whose 16.1.2 native output is empty with exit 1 (the generator refuses it) keeps
   its 16.1.1 capture; list each in the hand-back and in `PROVENANCE.md` under "#299: kept at 16.1.1".
4. Each failing golden: cite its T12 group; if 16.1.2-caused, add it to `known-failing.json` with the issue
   number (format per `test/helpers/known-failing.ts:27`). Otherwise stop 1/5.
5. `test/golden/inputs/PROVENANCE.md`: refs are graphviz 16.1.2 carried captures via the two generators, with
   the step-3 list.

## Write-set
`test/golden/refs/*.svg`, `test/golden/refs-xdot/*.xdot`, `test/golden/known-failing.json`,
`test/golden/inputs/PROVENANCE.md`.

## Acceptance criteria
- Given the generators on 16.1.1 carried, then they reproduce the committed refs byte-for-byte.
- Given the regenerated refs, then `gates.sh` passes 5/5 with every 16.1.2-caused failure in
  `known-failing.json` naming its issue, and no other failure.
- Given `refs-port/`, then it is unchanged.
- Gates: typecheck, `npm test`, goldens, corpus + docs green.

## Observability / rollback
N/A. Reversible (refs restorable from `$BASE/old/`).
