# Mission: issue #200: fi's word for per-id, an sv typo

## Objective

Two wording defects in translated docs, found during #143:

1. `docs-site/fi/divergences.md` renders the English "per-id"
   (`docs/known-divergences.md:93,218,223,233,280,281,1168`) as
   `syykohtai…` ("per-cause") at lines 100, 239, 247, 269, 270 and 1134. The
   same page says `tunniste` for "id", and #143 used `tunnistekohtaisesti`
   (`:103`), so the word becomes `tunnistekohtai…`, keeping each case ending.
2. `docs-site/sv/divergences.md:199`: `godkändandeprocenten` →
   `godkännandeprocenten`.

Done means: `grep -c syykohtai docs-site/fi/divergences.md` is 0,
`grep -rn godkändande docs-site` is empty, the diff is exactly those seven
lines, and the docs gates stay green. Type `docs`.

**Out of scope:** the English source, every `sourceHash`, every other
locale, and re-translating anything else. Every locale's `divergences.md`
is already stale against the English (`npm run docs:i18n-status` shows
`stale pages: 1` in all 23 at the base; the English moved in `70bd5faf`
after the hash). That predates this mission and stays as it is
([decisions.md](decisions.md#ad-2-no-hash-or-english-change)).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/T1-fi-sv-wording.md](batch-1/T1-fi-sv-wording.md). Check finished
   work with `git log --oneline 2f707cca..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree.
  Create no branch, and never merge `main` into it.
- **Base sha:** `2f707cca8666ba5e4168c7c2457599340f54baaa` (the tip at
  planning). If the tip has moved, the tip at execution start is the base:
  re-run T1 step 1's greps on it and journal the result.
- Per-task commits while working: first `docs(mission): add issue-200 brief`
  (this directory), then `docs(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`.
- **Finish (T1's last step):** `git tag issue-200/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  docs(i18n): say tunnistekohtainen for per-id in fi, fix an sv typo

  fi rendered "per-id" as syykohtainen ("per-cause") in six places where
  the page uses tunniste for id; sv misspelled godkännandeprocenten.

  Refs: #200
  ```

## Quality gates (queue rules, in order)

1. `npm run typecheck`
2. `npm test`
3. `bash test/golden/gates.sh` (all five)
4. `npx vitest run test/corpus test/docs`
5. Bytediff: **not applicable**, `src/` does not change. Journal that.
6. Targeted survey: the docs checks this edit can reach,
   `npm run docs:i18n-status` (fi and sv each still `stale pages: 1`,
   `- divergences.md`, as at the base, and `pages without sourceHash: 0`).
   Journal how the reach was chosen: no corpus id reads translated docs.

Planning's baseline on the base is journal row 0.

## Stop conditions

1. A file other than the two locale pages, the mission's plan directory,
   `plans/decision-journal.md` and `.agent-notes/issue-200.md` must change.
2. Step 1's greps differ from planning's (six `syykohtai` lines at 100, 239,
   247, 269, 270, 1134; one `godkändande` at sv `:199`) and the moved text
   is not explained by a commit since the base. Journal and stop.
3. A gate that is green at the base fails, or `docs:i18n-status` changes for
   any locale. The same check failing twice after fix attempts: diagnose,
   journal, stop.
4. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Line re-wrapping is not needed (the word grows by five characters); leave
  wrapping as it is unless `test/docs` objects.
- Another `syykohtai…` or `godkändande` found in a different file: fix it
  only if its English source says "per-id" / it is the same typo, and
  journal it; otherwise leave it and file a `follow-up` issue.
- If no open issue tracks the 23 stale `divergences.md` translations, file
  one with label `follow-up` (title: "docs-site: every locale's
  divergences.md is stale against known-divergences.md") and journal its
  number.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..3, rollback, auto-confirmed table |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-fi-sv-wording.md](batch-1/T1-fi-sv-wording.md) | steps, write-set, acceptance |
| [diagrams/data-flow.md](diagrams/data-flow.md) | how a translated page is checked |
| [diagrams/component-map.md](diagrams/component-map.md) | files touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md`: what changed, files, gates.
- Write `.agent-notes/issue-200.md` only for a novel finding; otherwise say
  in the report there was none.
- Comment on #200 with the head sha. The issue closes when the branch merges.
- The final message ends with the driver's status line.
