# T2: gates, survey, comments, report, squash

## Gates 1-4

As the README table. Record each in the journal with counts. Gate 2 must show
**0 expected fail**. A remaining expected fail means a known-failing entry was
left behind.

## Bytediff (gate 5)

`src/` changed. Head: `npm run build:js` (after `npm test` has finished), copy
`dist/index.js` to `$TMPDIR/issue163-head.mjs`. Base: `git archive <base>`
under `$TMPDIR`, with `node_modules` symlinked, then `npm run parser:regen`,
`npm run build:js`, and copy to `$TMPDIR/issue163-base.mjs`. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue163-base.mjs $TMPDIR/issue163-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue163-bytediff.json
```

**Expected at planning: 0 changed jobs.** No corpus file sets `compact`, and
the deleted code runs only when a cluster's `compact` is true. A changed job
means something besides `compact` reached the deleted code. Diagnose it (which
id, which deleted branch) and halt.

## Targeted survey (gate 6)

**How the inputs were chosen** ([harness/survey-files.txt](../harness/survey-files.txt)):
the change alters behaviour only when `compact` reads true on a cluster in a
`newrank=true` graph. No corpus file sets `compact` (`grep -rlIE
'\bcompact\s*=' ~/git/graphviz-16.1.1/tests` is empty). So the survey takes every
input in the repository that sets it (the five `dot-newrank-compact-*` goldens),
plus three probes: upstream's own example (`probe-north`), root-level
inheritance (`probe-root-compact`), and the `dot1_rank` control
(`probe-no-newrank`).

Run, at load below 12 (native renders):

```
bash plans/issue-163-remove-compact/harness/golden-compare.sh \
  $TMPDIR/issue163-base.mjs $TMPDIR/issue163-head.mjs \
  plans/issue-163-remove-compact/harness/survey-files.txt $TMPDIR/issue163-survey \
  | tee plans/issue-163-remove-compact/harness/execution-survey.txt
```

**Pass:** the output equals
[harness/planning-survey.txt](../harness/planning-survey.txt) line for line:
48 jobs, every `head~native:0`, every `native-err=0 head-err=0`. `three` and
`weak` are `base=head:n` in svg, xdot, plain, json and dot. Every other job is
`base=head:y`. There is no accepted residue. Any other difference: diagnose it,
and halt unless it equals native.

## Comments

1. On #163: the outcome; the upstream shas; the survey table (the two moving
   goldens with base → head diff-line counts); 0 expected-fail tests (was 4);
   the follow-ups #237 and #238; that the issue's "not yet checked against a
   16.1.1 native build" is now checked (refs byte-equal to native).
2. On #148: #163 is on the branch; no corpus id reaches it; goldens
   `dot-newrank-compact-three` and `dot-newrank-compact-weak` now pass and left
   `known-failing.json`, which is empty.

## Finish

1. Journal rows for every gate; README batch status and Summary.
2. One row in `plans/decision-journal.md`. Write `.agent-notes/issue-163.md`
   for anything novel. A candidate: the port's base did not inherit a root-level
   `compact` into clusters while native 16.1.0 did (probe-root-compact; the
   attribute-inheritance family of #183).
3. Write-set check: `git diff --name-only <base>` lists only T1's write-set,
   this directory, `plans/decision-journal.md` and `.agent-notes/issue-163.md`.
4. Delete `.plan-mission-progress.md` if it is still present (planning should
   have removed it).
5. `git tag issue-163/pre-squash`, `git reset --soft <base>`, and one commit
   with the README's message.

## Write-set

Journals, README status/summary, `harness/execution-survey.txt`,
`plans/decision-journal.md`, `.agent-notes/issue-163.md`.

## Acceptance criteria

- Given the head and base bundles, when bytediff runs over the smoke ids, then
  0 jobs differ.
- Given the survey files, when `golden-compare.sh` runs, then its output equals
  `planning-survey.txt`.
- Given the finished mission, when `git log <base>..` is read, then there is
  exactly one commit, with footer `Refs: #163`, and the tag
  `issue-163/pre-squash` holds the per-task history.

## Observability

N/A.

## Rollback

Reversible: revert the squashed commit.
