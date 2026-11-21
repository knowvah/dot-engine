<!-- SPDX-License-Identifier: EPL-2.0 -->
# Architecture decisions (approved by the maintainer, 2026-11-19)

| ID | Decision |
|---|---|
| D1 | **The carried oracle is *the* oracle.** It is the 16.1.1 tag plus `test/corpus/oracle-patches/*.patch`, applied in lexical order with `git am --3way`. Each patch is backported on a fork branch `carried/<slug>` at tag 16.1.1 and exported with `git format-patch`. It is built in `/Users/scottseely/git/sseely/graphviz-carried`, with GVBINDIR `/tmp/ghl1611-carried` (dot) and `/tmp/ghl1611-carried-all` (other engines). Pristine 16.1.1 stays as the bisect build. ADR-0003 replaces ADR-0002's "oracle = pristine native 16.1.1" clause. Self-check: with zero patches, a deterministic sample of about 60 ids is byte-equal to pristine. |
| D2 | **The port follows a C fix once the upstream MR is *filed*.** Filing is the maintainer's job, after reading every line (graphviz ban policy). A finding with only a fork issue keeps the C behaviour, and its registry row has status `proposed`. When the fix merges, the patch is dropped at the next pin move. |
| D3 | **`agerr` and stderr text stays verbatim**, because sweeps compare stderr. Improvements go only into surfaces we own: thrown-error `code`, `message`, `friendlyMessage` and context (node, edge, attribute or graph name). A `RenderResult.warnings` channel becomes a dot-engine GitHub issue, not part of this mission. |
| D4 | **A `GvErrorCode` member is added only when a registry row shows a consumer would branch on it.** None are declared in advance. Each new code gets a release-note line: "exhaustive switches over GvErrorCode must add a case." |
| D5 | **Scanner scope.** It finds C `exit`, `graphviz_exit`, `abort`, `UNREACHABLE`, `agerrorf`, and `agerr` followed by an error return, in C functions the port names in an `@see` tag. `assert` is excluded, since it is compiled out of the Release oracle. Rows are keyed by C file + function and port file + symbol, never by line. A fitness test requires a row for every port `throw new (Internal\|Render)?Error`. A13, the 5 items in known-divergences "part 10", and #266 are seeded by hand. |
| D6 | **The classification ladder.** `mirror`: C fails correctly, so the port throws a structured error, now. `graceful`: C crashes or has undefined behaviour and the port renders sanely, so the port keeps its output and a fork issue is filed; the case becomes a U-row once the MR is filed. `upstream-fix`: C output is wrong but deterministic, so the port mirrors C until the MR is filed, then carries the patch. `port-bug`: the port fails where C survives, so it gets a dot-engine GitHub issue and is not fixed here. `not-ported`: row only. `port-only` (added in Phase 5): a port throw with no C counterpart, such as API argument checks. In this mission only `mirror` sites and the pilot patch change `src/`. |
| D7 | **Fork actions.** File issues on gitlab.com/sseely/graphviz (maintainer ruling, 2026-11-19). Push `fix/<slug>` branches carrying an xfail test commit, then a fix commit with a CHANGELOG entry. **Never open an MR.** Issues meet the elk-engine fork-issue standard: check graphviz/graphviz for a duplicate first; a minimal `.dot` repro, run on the oracle and shrunk; the mechanism at `file:line` with instrumented values; history from `git log -S`; and what was and was not checked. At most 5 fork issues per run. |
| D8 | **Pilot.** Once 5152 has merged, it is backported onto 16.1.1 as patch `0001` on `carried/plain-canon-use-after-free`. The carried oracle is rebuilt, and #266 changes from a native-reference exception to U1 in `docs/known-divergences.md`. |
| D9 | **Commits.** Branch `feature/graceful-failure`, unsigned commits per task, signed by the maintainer later, landing as a merge commit. Fork commits follow graphviz's convention: "add a test case for …", then "<component> <function>: fix: …", with a `### Fixed` entry under Unreleased in CHANGELOG. |

## Rollback

**Reversible.** Revert the branch. Removing a patch file and rebuilding
returns the carried oracle to pristine, and pristine 16.1.1 is never
touched. Fork issues and branches can be closed or deleted but not
unpublished; the maintainer approved filing them.

## Irreversible changes

None.
