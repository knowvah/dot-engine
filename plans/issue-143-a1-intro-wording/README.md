# Mission: issue #143: fix the A1 intro's "not yet triaged per-id" wording

## Objective

`docs/known-divergences.md:189-191` (base `d6b12e9d`), the first sentence of the
**Iterative-engine characterization: neato/fdp/sfdp** paragraph
(anchor `a1-iterative-characterization`), says:

> Unlike the `circo`/`twopi`/`osage` engine tracks above, `neato`/`fdp`/`sfdp`
> are **not** yet triaged per-id — `engine-walk.ts` records a `tolerance: 0.5`
> field for these three and ...

That was true at the first sweep (2026-07-11). It is false now: the paragraph after the
count table (`:227-235`, "Unlike at first sweep, every diverged row of the 929-item
universe is individually attributed ...") and the A1 intro (`:115-119`, "every diverged
id ... is individually attributed by injection ... rather than left as untriaged drift")
both say every diverged id is attributed. No figure is wrong. Source: follow-ups README
item 157 (`plans/post-16.1-followups/README.md:721`, part 11 T11).

The same clause is translated in the 23 locale copies, `docs-site/<prefix>/divergences.md`,
on the line after the `a1-iterative-characterization` anchor. The English site page
`docs-site/divergences.md` is an `@include` of the `docs/` file and needs no edit.

Done means: the English sentence says what AD-1 gives and no longer claims the
iterative engines are untriaged. Each of the 23 locale copies says the same in its own
language (AD-2). Every locale `divergences.md` carries the new `sourceHash`, so
`npm run docs:i18n-status` shows 0 stale pages in every locale. Follow-ups README
item 157 is marked DONE. Gates are green.

**Out of scope:** any figure, table or other sentence of the paragraph; the A1 intro at
`:115-119`, which is already correct; `plans/` archaeology; `test/corpus/PARITY.md` and
the report generators.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read the queue rules (injected into the session). They override this brief where the
   two disagree.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline d6b12e9d..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, never merge `main` into it.
- **Base sha:** `d6b12e9dba04443a80105c6c54666f39a48b3a69` (tip at planning time). If
  the tip moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-143 brief` (this
  directory), then `docs(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-143/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  docs(divergences): say the iterative engines are attributed per-id

  The A1 iterative-engine paragraph opened by saying neato, fdp and sfdp
  were not yet triaged per-id, which was true at the first sweep. The
  paragraph after the count table, and the A1 intro, say every diverged
  id is now attributed by injection. The sentence now gives the real
  difference from the circo, twopi and osage tracks: a 0.5pt tolerance
  in place of 0.01. The 23 locale copies say the same and carry the new
  sourceHash. No figure changes.

  Refs: #143
  ```

  Add a gates line to the body as #137's commit does. Lines ≤ 80, subject ≤ 72, no
  attribution. Never push, rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 (runs `translation-lint`, `i18n-status`, `locale-complete`) |
| 5 | Smoke bytediff | — | N/A: `src/` does not change (AD-3) |
| 6 | Targeted survey | `npm run docs:i18n-status` | 23 locales, each `stale pages: 0` and `pages without sourceHash: 0`; no corpus id is reachable (AD-3) |

No oracle run is needed: nothing in this mission renders a graph. If one is run anyway,
the oracle is ADR-0001's (newest accepted ADR) `~/git/graphviz/build/cmd/dot/dot`
(16.1.0), plugin dir `/tmp/ghl`, after `oraclePreflight` (`test/corpus/oracle-env.ts`).

Baseline at planning: see [decisions.md](decisions.md#baseline).

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts: diagnose to a stated
   mechanism, journal it, stop.
3. At execution start, `npm run docs:i18n-status` shows any locale `divergences.md`
   already stale. Refreshing its hash would hide that drift: stop and report which
   locales.
4. A locale copy has no clause equivalent to "not yet triaged per-id" on the line after
   the anchor, or its paragraph differs in substance from the English one (a missing
   figure, a different engine list). File a `follow-up` issue naming the locale; finish
   the other locales; journal it. Do not refresh that locale's `sourceHash`.
5. An architecture decision in [decisions.md](decisions.md) turns out wrong (for
   example, the attribution paragraph no longer says every diverged id is attributed).

## Push-forward (decide alone, journal it)

- Exact English wording within AD-1's constraints.
- Each locale's wording, within AD-2: translate the new clause in the register and
  terminology that locale's paragraph already uses (its word for "engine", "per-id",
  "tolerance").
- Re-wrapping the edited lines of a paragraph to the file's existing width.
- Filing a `follow-up` issue for anything found on the way.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-3, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-reword-a1-intro.md](batch-1/T1-reword-a1-intro.md) | the task |
| [diagrams/data-flow.md](diagrams/data-flow.md) | English source → locale copies → hash check |
| [diagrams/component-map.md](diagrams/component-map.md) | touched files |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (project journal): what changed, files, gates.
- `.agent-notes/issue-143.md` for anything novel. Otherwise state that nothing was novel.
- Final message ends with the driver's status line.

## Summary (2026-11-10)

- **Tasks:** 1 of 1 done.
- **Changed:** `docs/known-divergences.md` (the A1 iterative paragraph's opening clause, and the
  scope note's "no per-id triage yet" at `:91`), the 23 locale `divergences.md` (both clauses, the
  pass-% clause part 11 T11 left untranslated, `sourceHash`), follow-ups README item 157.
- **Decisions:** 4 journaled; two go past the brief and are flagged for review: the second copy
  of the claim at `:91` was fixed too, and the 23 locales gained the missing T11 clause instead of
  being left unrefreshed under stop condition 4.
- **Gates:** typecheck, `npm test` (13411), goldens 5/5, corpus and docs (2839), i18n status
  23 × 0 stale. Gate 5 N/A (`src/` unchanged).
- **Follow-ups:** #200. No `needs-ruling` issue.
