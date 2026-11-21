<!-- SPDX-License-Identifier: EPL-2.0 -->
# Mission: Graceful failure and upstream fix-forward

Read `docs/reference/autonomous-execution.md` (in `~/.claude/`) in full at
mission start and after every compaction. Then this file, then
[decisions.md](decisions.md).

## Objective

Find every place where the port fails the way the C fails (`exit`,
`graphviz_exit`, `abort`, `UNREACHABLE`, `agerrorf` followed by an error
return, native crashes) and record each one in a registry. Classify each
site on the D6 ladder: `mirror`, `graceful`, `upstream-fix`, `port-bug`,
`not-ported` or `port-only`. Then do better within the approved bounds:
- give the `mirror` pilot sites structured, contextual errors;
- carry filed upstream graphviz fixes as patches on a "carried oracle" so
  the port can follow them (the elk-engine pattern);
- file proven C defects on our GitLab fork, each with a pushed fix branch,
  so the maintainer can read every line and file the upstream MR.

## Startup gate

`glab mr view 5152 -R graphviz/graphviz` must show `state: merged`. If it
does not, **stop** (stop 8). The mission was planned on 2026-11-19, while
the MR was open.

## Branch and commits

- `feature/graceful-failure` from `main` (it does not exist yet; create it).
- One **unsigned** commit per task, run as its own command:
  `git -C /Users/scottseely/git/knowvah/dot-engine -c commit.gpgsign=false commit -F <msgfile>`.
  The maintainer squashes and signs later. Never pass `--no-gpg-sign`.
- Conventional Commits, lines of at most 80 characters, with the
  `Co-Authored-By` trailer.
- The PR lands as a **merge commit**. Opening the PR is the maintainer's
  job (`gh pr create` is denied).
- Fork work:
  - fix branches in worktrees at `/Users/scottseely/git/sseely/graphviz-wt/<slug>`;
  - the carried oracle at `/Users/scottseely/git/sseely/graphviz-carried`;
  - never write to `~/git/graphviz*` (the oracle clones);
  - always use absolute paths with `git -C`.

## Constraints

### Stop and wait for the maintainer when

1. A task needs to write a file outside its write-set. This includes T9
   needing a file that is not in `mirror-sites.md`, and T6's #266 exception
   site lying outside T6's set.
2. The same gate check fails twice in a row.
3. The same code location is edited 3 or more times without resolving the
   same failing check.
4. A decision in [decisions.md](decisions.md) (D1–D9) would be contradicted.
5. The zero-patch carried build is not byte-equal to pristine 16.1.1 on the
   sample, in either output or stderr.
6. Backporting 5152 onto 16.1.1 needs a logic change rather than a
   context-only fixup.
7. Any sweep regresses against the carried oracle, or stderr parity drops
   on any id.
8. The startup gate fails.
9. A fork issue would claim a mechanism that has no instrumented C values
   behind it.
10. The work would grow past 5 fork issues, or past 5 individual dot-engine
    issues plus 1 tracking issue.
11. Anything would open an MR (upstream or on the fork) or file anything on
    graphviz/graphviz.
12. `glab` or `gh` behaves unexpectedly: an auth failure, the wrong project,
    or a rejected push.
13. A `mirror` change would alter output the oracle is compared on (svg,
    xdot, plain, json, map or stderr).
14. A C logic bug seems to need a port behaviour change but has no filed MR.
    Record its row as `proposed` and do not change `src/`.

### Push forward with judgment when

- Choosing friendly-message wording or context field names: clear English,
  no C jargon.
- T7 chooses which `mirror` sites to fix, up to the cap. Prefer sites that
  user input can reach over pure invariants.
- A batch-5 finding is already fixed or reported upstream: record it, skip
  it, and do not substitute another finding.
- The scanner misses a C failure form: extend the scanner and journal it.
- Choosing the self-check sample, as long as it is deterministic and covers
  every engine and format.
- Wording commit messages and journal entries.
- A task turns out simpler than estimated: write one journal line.

## Quality gates (after every batch; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | all PASS (monotonic) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Write-set | `git diff --name-only main...HEAD` plus the working tree | only the batch's declared files |
| 6 | Targeted sweep | per task spec (T6, T9) | 0 regressions vs the carried oracle |
| 7 | Full sweep | T14 only: fresh `npm run survey` (delete JSONL first) | 0 regressions, every engine and format |
| 8 | CodeQL | T14 only: `npm run codeql:gate` | exit 0 |

- Run `oraclePreflight` (`test/corpus/oracle-env.ts`) before trusting
  native output. `/tmp/ghl1611*` loses `config8` overnight; regenerate it
  with `GVBINDIR=<dir> <dot> -c` or `gen-headless-gvbindir.sh`.
- Check `uptime` before native renders and wait while the load is above 12.
- Never edit `src/` while a sweep runs.
- Batches 1, 2 and 5 do not touch `src/`, so gates 6 and 7 do not apply to
  them.

## Batches

| Batch | Tasks | Theme | Status |
|---|---|---|---|
| [1](batch-1/overview.md) | T1, T2, T3 | Policy ADR, carried-oracle tooling, scanner | [x] |
| [2](batch-2/overview.md) | T4, T5 | Registry and fitness test; zero-patch build and oracle switch | [x] |
| [3](batch-3/overview.md) | T6, T7 | Pilot patch 0001 (5152), registry classification | [x] |
| [4](batch-4/overview.md) | T8, T9 | dot-engine issues; mirror pilot in `src/` | [x] |
| [5](batch-5/overview.md) | T10–T13 | Fork findings: issues and pushed fix branches | [x] |
| [6](batch-6/overview.md) | T14 | Links, docs, full gate sweep | [x] |

## Index

- [decisions.md](decisions.md): D1–D9, approved 2026-11-19
- [decision-journal.md](decision-journal.md): append during execution
- Batch 1: [T1](batch-1/T1-adr-claude-md.md), [T2](batch-1/T2-carried-build-script.md),
  [T3](batch-1/T3-scanner.md)
- Batch 2: [T4](batch-2/T4-registry.md), [T5](batch-2/T5-zero-patch-switch.md)
- Batch 3: [T6](batch-3/T6-pilot-5152.md), [T7](batch-3/T7-classify.md)
- Batch 4: [T8](batch-4/T8-github-issues.md), [T9](batch-4/T9-mirror-pilot.md)
- Batch 5: [fork-finding procedure](batch-5/fork-finding-procedure.md),
  [T10](batch-5/T10-a13-freed-fill.md), [T11](batch-5/T11-xdotbb-null-span.md),
  [T12](batch-5/T12-stress-directions-oob.md), [T13](batch-5/T13-fdp-pointer-compare.md)
- Batch 6: [T14](batch-6/T14-links-sweep.md)
- Diagrams: [data-flow](diagrams/data-flow.md), [component-map](diagrams/component-map.md)

## Recommended model

Execution runs on `fable`. Subagents use the agent named in each task,
with Sonnet for implementation.

## Session summary

- Carried oracle live: 16.1.1 + patch 0001 (graphviz!5152, `filed`); flex
  pinned to 2.6.4; zero-patch self-check 66 samples, 0 differences.
- Registry: 489 rows (mirror 94, port-bug 3, upstream-fix 1, graceful 7,
  not-ported 132, port-only 252); every site-specific filed issue linked.
- Mirror pilot: 3 sites throw structured errors with `context`; no new code.
- Issues: dot-engine #268–#272; fork work_items/1–4 with pushed branches
  `fix/{xdotbb-null-span,background-freed-fill,stress-directions-oob,`
  `fdp-pointer-compare}`; 0 MRs opened.
- Full fresh sweep, every engine and format: 0 port regressions; 10 ids
  moved pass → oracle-nondeterministic (AD-13, maintainer ruling);
  dot svg survey 899 → 966 conformant; 64 retired plain entries conform.
- Open for the maintainer: registry `status` pinned by its fitness test;
  unknown-layout stderr gap (nop engines); stale pristine-oracle wording in
  test/corpus/README.md, gen-headless-gvbindir.sh, docs-site plain pages;
  fork commit trailers; .agent-notes/T9.md and T14.md cleanups.
