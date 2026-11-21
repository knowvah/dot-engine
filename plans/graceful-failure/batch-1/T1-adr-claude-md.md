<!-- SPDX-License-Identifier: EPL-2.0 -->
# T1: ADR-0003 (upstream fix-forward) and the CLAUDE.md carve-out

## Context

dot-engine is a faithful TypeScript port of graphviz. Its CLAUDE.md treats
the C source as sacred. The maintainer has now decided that bugs we find in
graphviz may be fixed upstream, and that the port follows such a fix once
the upstream MR is filed. Until then the fix is carried as a patch on the
oracle build. This mirrors elk-engine (`~/git/knowvah/elk-engine`,
`plans/elk-engine-skeleton/decisions.md` AD-3, `docs/conformance.md` §4).

## Task

1. Write `docs/adr/0003-upstream-fix-forward.md`, following the format of
   `docs/adr/0002-graphviz-16.1.1-oracle.md`. Status: Accepted, 2026-11-19.
   It must state D1, D2, D6 and D7 from `plans/graceful-failure/decisions.md`
   and name the clause of ADR-0002 it replaces: the oracle becomes the
   carried build, and pristine 16.1.1 stays for bisecting. Also cover:
   - the patch life cycle: draft → fork issue (`proposed`) → upstream MR
     filed (carried, port follows) → merged (dropped at the next pin move);
   - the ban-policy rule: the maintainer reads every line and files every
     upstream MR.
2. Edit `CLAUDE.md`:
   - **"The C Source Is Sacred"**: add a carve-out of at most 4 lines. Only a
     fix whose upstream MR has been filed, and which is carried in
     `test/corpus/oracle-patches/`, may change port behaviour. Link
     ADR-0003.
   - **Verification**: the oracle bullet names the carried build
     (`/Users/scottseely/git/sseely/graphviz-carried/build/cmd/dot/dot`,
     GVBINDIR `/tmp/ghl1611-carried` and `/tmp/ghl1611-carried-all`, built
     by `test/corpus/build-carried-oracle.sh`), and keeps pristine 16.1.1 as
     the bisect build. The locations live in `test/corpus/oracle-paths.mjs`.

## Write-set

`docs/adr/0003-upstream-fix-forward.md` (create), `CLAUDE.md` (modify).

## Read-set

- `docs/adr/0002-graphviz-16.1.1-oracle.md`
- `plans/graceful-failure/decisions.md`
- `CLAUDE.md` (the "C Source Is Sacred" and "Verification" sections)
- `~/git/knowvah/elk-engine/docs/conformance.md`, the "Seam patches"
  section (for patterns only; do not copy it)

## Acceptance criteria

- Given ADR-0003, when read, then it states D1, D2, D6 and D7, the patch
  life cycle, the ban-policy rule, and the ADR-0002 clause it replaces.
- Given CLAUDE.md, when read, then the carve-out is limited to filed
  upstream MRs carried as patches, and the oracle bullet names the carried
  build with pristine kept for bisecting.
- Given CLAUDE.md, when `wc -l CLAUDE.md` is run, then it is under 200
  lines.

## Quality bar and boundaries

- SPDX header `<!-- SPDX-License-Identifier: EPL-2.0 -->` on the ADR.
- Do not edit ADR-0002. Its status line may gain
  "Partly superseded by ADR-0003" only if the ADR format already has a
  status line.
- No other CLAUDE.md sections change.

## Observability

N/A: no new observable operations.

## Rollback

Reversible (revert the commit).

## Commit

`docs(adr): add adr-0003 upstream fix-forward and carried oracle`, with a
body explaining why (more than one file, and a policy change).
