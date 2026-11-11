# Mission: issue #167: print dot/xdot names through `agstrcanon`

## Objective

Node, edge-endpoint and graph/subgraph names print through the port-local `xdotId`, not
through `_agstrcanon` as C does (`write_nodename` / `write_hdr` → `write_canonstr`,
`lib/cgraph/write.c:246-259,353,523`). A name over `Max_outputline` (128, or `linelength`)
never wraps. The same bypass also leaves keywords bare (`node`), quotes non-ascii names
(`é`), mishandles `\"` and `-.`, and leaks the U+0001 html marker.

**Done when (the issue):** a native ref with a node name, an edge endpoint and a graph name
longer than 128 bytes, default and `linelength`, is byte-equal on `-Tdot` and `-Txdot`.

**Work:** one task. See [decisions.md](decisions.md): AD-1 `xdotId` delegates to
`agstrcanon`; AD-2 the root's name loses the html flag in the parser; AD-3 the existing
trailing-backslash padding stays; AD-4 two follow-ups are filed, not fixed.

A trial of AD-1 and AD-2 at planning made all 14 harness cases byte-equal to native and
left all 13,463 tests passing. The trial was reverted, so nothing here is applied yet.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read the queue rules (`.claude/queue-policy.md`, injected into the session). They
   override this brief where the two disagree.
3. Read this README, [decisions.md](decisions.md), [decision-journal.md](decision-journal.md),
   then [batch-1/overview.md](batch-1/overview.md). Check progress with
   `git log --oneline 022695a2..`.
4. Read `.agent-notes/issue-129.md` (non-dot plugin dir recipe; `.mts` temp scripts).

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no branch,
  and never merge `main` into it.
- **Base sha:** `022695a2d8cdeb87e99cb8753be1302e9d6425dc` (the tip at planning). If the
  tip has moved, use the tip at execution start as the base and journal it.
- Per-task commits: first `docs(mission): add issue-167 brief` (this directory), then
  `fix(T1): ...`. Commit with `git -c commit.gpgsign=false commit -F <msgfile>`.
- **Finish (T1's last step):** `git tag issue-167/pre-squash`, then
  `git reset --soft <base>` and one commit, subject
  `fix(dot): print names through agstrcanon as write_nodename does`, footer `Refs: #167`.
  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR, or use
  `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Typecheck | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-name-canon.md#gate-5-smoke-bytediff) | every changed output equals native |
| 6 | Targeted survey | see [T1](batch-1/T1-name-canon.md#gate-6-targeted-survey) | no head-only regression vs native |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot` (16.1.0),
plugin dir `/tmp/ghl` for dot. Run `oraclePreflight` (`test/corpus/oracle-env.ts`) before
trusting native output. Check `uptime` before gates 5-6; above 12, wait.

Baseline at planning: [decisions.md](decisions.md#baseline).

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts: diagnose to a stated
   mechanism, journal it, stop.
3. `regen.sh`, run with the preflighted oracle, produces refs that differ from the
   committed `harness/out/*`: the premise is in doubt; stop with the diff.
4. The smoke bytediff or targeted survey shows a changed output that does not equal native
   and is not covered by the queue rules' accepted-row exception: halt.
5. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test names and helper shape in `name-canon.test.ts` (mirror `echo-attr-wrap.test.ts`).
- Filing a `follow-up` issue for any unrelated native difference seen on base and head
  alike, such as the `1472` layout width in T1.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-6, baseline, operational readiness |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-name-canon.md](batch-1/T1-name-canon.md) | the task |
| [follow-ups.md](follow-ups.md) | two issue drafts T1 files |
| [harness/](harness/) | fixtures, `regen.sh`, native refs in `out/` |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where a name flows |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (project journal): mechanism, files, gates.
- `.agent-notes/issue-167.md`: the root-name html mechanism (AD-2). Otherwise state nothing
  novel.
- Final message ends with the driver's status line.

## Summary (2026-11-10)

- **Tasks:** 1 of 1 (T1).
- **Decisions:** AD-1, AD-2 and AD-3 applied as written; AD-4's two follow-ups filed as #205
  and #206. Journalled judgment calls, for review: `dot` added to the smoke bytediff's formats
  (the default list has none); `2064` checked on a truncated sample, because native finishes
  neither `-Tdot` nor `-Tcanon` on the full file; `1472` counted as a pre-existing difference
  as T1 says, with the ruling asked in #207.
- **Gates:** typecheck exit 0; `npm test` 571 files, 13,485 tests; `gates.sh` 5/5; corpus and
  docs 24 files, 2,844 tests; smoke bytediff 2,352 jobs, 16 changed, 16 equal to native, no
  accepted-row changes; targeted survey with no head-only regression.
- **Done-when:** `names`, `names-ll` and `names-ll0` (node name, edge endpoint, graph and
  cluster names over 128 bytes; default, `linelength=70`, `linelength=0`) are byte-equal to
  native on `-Tdot` and `-Txdot`, as are the four other fixtures.
- **Open:** #205, #206, #207 (needs-ruling).
