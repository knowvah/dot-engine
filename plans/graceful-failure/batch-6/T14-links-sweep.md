<!-- SPDX-License-Identifier: EPL-2.0 -->
# T14: Links, docs, full gate sweep

## Task

1. Copy the links into `test/corpus/failure-sites.json`:
   - from `plans/graceful-failure/github-issues.md`: `links.dotEngineIssue`;
   - from `upstream-drafts/*.md`: `links.forkIssue` and `links.forkBranch`,
     with status `proposed`;
   - for #266: `links.upstreamMr` and status `merged`.
2. `docs/known-divergences.md`:
   - each `graceful` finding that was filed on the fork gets a one-line
     "fork issue: <url>" under its existing A13 or part-10 bullet;
   - the U-series intro states that a row joins the U-series only once its
     upstream MR is filed (D2).
3. **Full fresh sweep** against the carried oracle:
   - delete the JSONL for every walker (survey, xdot, json, map, plain,
     engine walks) first. CLAUDE.md "Sweep discipline": never edit `src/`
     while it runs;
   - check `uptime` first, and use `caffeinate`;
   - regenerate the dashboards.
   - **Pass:** 0 regressions in every engine and format against the
     pre-mission baseline, with the 64 retired plain entries now
     conformant. Any regression is **stop 7**.
4. `npm run codeql:gate`: exit 0. Never dismiss a finding without the
   maintainer.
5. Journal:
   - per-class registry counts;
   - fork issues filed and skipped (with reasons);
   - dot-engine issues;
   - release-note lines for new codes;
   - sweep counts before and after.
6. README: tick the batches, and add a "Session summary" of at most 15
   lines.
7. Tell the maintainer (final message):
   - the branch is ready for squash and sign;
   - the PR is theirs to open;
   - list the fork branches awaiting their line-by-line read for upstream
     MRs.

## Write-set

`test/corpus/failure-sites.json`, `docs/known-divergences.md`, regenerated
`test/corpus/*-parity-*.json`/`.jsonl` and `test/corpus/PARITY-*.md`,
`plans/graceful-failure/decision-journal.md`, `plans/graceful-failure/README.md`.

## Read-set

- `plans/graceful-failure/github-issues.md`
- `plans/graceful-failure/upstream-drafts/*.md`
- `CLAUDE.md` (Verification section)
- `package.json` scripts (`survey*`, `codeql:gate`)

## Acceptance criteria

- Given T8 and T10–T13, when linked, then every filed issue appears in
  exactly one registry row's links.
- Given the fresh full sweep against the carried oracle, when complete,
  then there are 0 regressions in every engine and format.
- Given `npm run codeql:gate`, when run, then it exits 0.

## Observability

The sweep counts and dashboards are the observable result.

## Rollback

Reversible.

## Commit

`chore(corpus): link failure sites and refresh parity against carried oracle`,
with a body.
