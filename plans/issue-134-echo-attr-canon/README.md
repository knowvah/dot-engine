# Mission: issue #134: echoed attribute values skip agstrcanon (no wrap, forced quotes)

## Objective

`echoAttr` and `echoGraphAttr` (`src/render/dot/attrs.ts:359-363`, `:393-398`) print
`key="` + `agcanonEscape(v)` + `"` by hand. C writes every attribute value through
`_write_canonstr(..., chk=true)` → `agstrcanon` (`lib/cgraph/write.c:502-504` for
nodes/edges, `:290-292` for graph dicts), which (a) breaks long strings with
backslash-newline at `Max_outputline` (128, or the root's `linelength`) and (b) quotes
only when needed. The echo helpers print values the layout did not recompute: graph and
cluster `bb`/`lp`/`lwidth`/`lheight`, node `rects`/`xlp`, edge `pos`/`lp`/`xlp`/
`head_lp`/`tail_lp` (callers: `src/render/dot/agwrite.ts:143,421,442,455,494-503`).

Planning evidence (16.1.0, harness in [harness/](harness/)):

- **The issue's literal premise does not hold for labels.** Long graph and cluster
  `label`s go through `graphInputParts` → `agstrcanon` (`attrs.ts:294`) and already
  equal native byte for byte, default and `linelength=70`, dot and xdot.
- **The real gap is the echoed keys.** `harness/echo.gv` (a cluster with a long `lp`,
  `lwidth=1.5`, `lheight="2"`; a node with long `rects`/`xlp`; an edge with long
  `pos`/`lp`/`head_lp`/`tail_lp`/`xlp`) differs from native under dot and patchwork, in
  dot and xdot: native wraps every long value and prints `lwidth=1.5`, `lheight=2`; the
  port prints them unwrapped and `lwidth="1.5"`, `lheight="2"`. This is the gap the
  maintainer's comment on #134 reports on 14 patchwork xdot corpus ids.
- A trial edit (both helpers return `key + '=' + agstrcanon(v)`, reverted) made all ten
  harness cases byte-equal to native.

Done means: both helpers route through `agstrcanon`; the now-dead `agcanonEscape` and
`isEscapeSeq` are removed with their tests; a new test pins the ten harness cases
against the native refs in `harness/out/`; follow-ups README item 145 is marked DONE;
gates green. Type `fix`.

**Out of scope:** node and graph *names* (`xdotId`, issue #167); any other attribute
path (`graphInputParts`, `objInputParts`, `computedPart` already use `agstrcanon`).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read the queue rules (`.claude/queue-policy.md`, injected into the session). They
   override this brief where the two disagree.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline a0eb4de3..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, never merge `main` into it.
- **Base sha:** `a0eb4de336c2319c0f4a4f0c5510db1d9b3de297` (tip at planning time). If
  the tip moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-134 brief` (this
  directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-134/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(dot): canonicalize echoed attribute values as agwrite does

  write.c prints every attribute value through agstrcanon, which wraps
  long strings at Max_outputline and quotes only when needed. echoAttr
  and echoGraphAttr built key="value" by hand, so values the layout
  did not recompute (cluster lp/lwidth/lheight, node rects/xlp, edge
  pos and label positions) never wrapped and numerals came out quoted
  (lwidth="1.5" where native prints lwidth=1.5). Both now call
  agstrcanon; agcanonEscape had no other caller and is removed.

  Refs: #134
  ```

  Add a gates line to the body as #132's commit does. Lines ≤ 80, subject ≤ 72, no
  attribution. Never push, rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-echo-attr-canon.md#bytediff) | every changed output equals native |
| 6 | Targeted survey | see [T1](batch-1/T1-echo-attr-canon.md#targeted-survey) | no head-only regression vs native |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot`
(16.1.0), plugin dir `/tmp/ghl` for dot. Patchwork needs `neato_layout`: build a dir
under `$TMPDIR` per `.agent-notes/issue-129.md` (symlink
`build/plugin/{core,dot_layout,neato_layout}/libgvplugin_*`, then
`GVBINDIR=<dir> <dot> -c`). Run `oraclePreflight` (`test/corpus/oracle-env.ts`) for
each dir/engine before trusting native output. Check `uptime` before gates 5-6; above
12, wait.

Baseline at planning: typecheck and `npm test` green on `a0eb4de3`
([decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts: diagnose to a stated
   mechanism, journal it, stop.
3. `regen.sh`, run with the preflighted oracle, produces refs that differ from the
   committed `harness/out/*`: the premise is in doubt; stop with the diff.
4. The smoke bytediff or targeted survey shows a changed output that does not equal
   native: halt per the queue rules.
5. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test names and helper shape in `echo-attr-wrap.test.ts` (mirror
  `long-string-wrap.test.ts`).
- Which corpus ids make up gate 6, within the rule in T1.
- Filing a `follow-up` issue for any unrelated native difference the survey shows on
  base and head alike.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-echo-attr-canon.md](batch-1/T1-echo-attr-canon.md) | the task |
| [harness/](harness/) | fixtures, `regen.sh`, native refs in `out/` |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where an echoed value flows |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (project journal): mechanism, files, gates.
- `.agent-notes/issue-134.md`: the issue's label premise was already satisfied and the
  gap was the echoed keys; the patchwork plugin-dir recipe reused. Otherwise state
  nothing novel.
- Final message ends with the driver's status line.
