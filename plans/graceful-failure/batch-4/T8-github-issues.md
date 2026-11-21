<!-- SPDX-License-Identifier: EPL-2.0 -->
# T8: dot-engine GitHub issues

## Context

Open work in dot-engine lives in GitHub issues on knowvah/dot-engine. D3
moves the structured-warnings idea out of this mission and into an issue.
T7 classified the registry; each `port-bug` row is a defect in the port.

## Task

1. File one issue: "Structured warnings in RenderResult". Proposal:
   - `RenderResult.warnings?: GvError[]`, fed from the `agerr` channel
     (`src/common/agerr.ts`);
   - the stderr text stays verbatim (D3);
   - list the design questions: codes per `agerr` site, levels, the
     interaction with `agseterrf`, and the size cap.
   Link the registry and ADR-0003.
2. For the `port-bug` rows:
   - file **at most 5** individual issues, each with the C behaviour, the
     port behaviour, a minimal DOT repro run on both, and the registry row
     id;
   - put the rest in **one** tracking issue, as a checklist of row ids and
     repros;
   - check `gh issue list --search` for duplicates first, and comment on an
     existing issue instead of filing a duplicate;
   - use the repo's existing labels only. Read them with `gh label list`
     and never create a label.
3. Write `plans/graceful-failure/github-issues.md`: a table of issue
   number, title and registry row ids. T14 copies the links into the
   registry.

## Write-set

`plans/graceful-failure/github-issues.md`. On GitHub: issues on
knowvah/dot-engine only.

## Read-set

- `test/corpus/failure-sites.json` (`port-bug` rows; filter with `jq`)
- `src/common/agerr.ts:1-60`
- `src/errors.ts:36-56`

## Acceptance criteria

- Given D3, when filed, then exactly one warnings-channel issue exists.
- Given N port-bug rows, when filed, then min(N, 5) individual issues
  exist, plus one tracking issue if N > 5. More is **stop 10**.
- Given `github-issues.md`, when read, then every filed issue is listed
  with its row ids.

## Observability

N/A.

## Rollback

Reversible (issues can be closed).

## Commit

`docs(plans): record graceful-failure github issues`
