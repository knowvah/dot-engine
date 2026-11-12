# Mission: issue #144: json keeps a cluster `_draw_` polygon with inf/nan points

## Objective

On osage `1221`, `1332` and `2721` a cluster that holds only a node already placed by
another cluster gets the bb `inf,inf,nan,nan`. Native's inner xdot render writes its frame
as `p 4 inf inf inf nan nan nan nan inf` (or `P 4 ...` for a filled one), and the port's
xdot text is the same. Native json re-parses that string with `parseXDot`, whose
`parseReal` and `parsePolyline` read numbers with `strtod` (`lib/xdot/xdot.c:24-33,
79-110`), and `strtod` accepts `inf` and `nan`. `write_polyline` then prints each point
with `%.03f` (`plugin/core/gvrender_core_json.c:159`), giving `[inf,nan]`. Those are
bare tokens, so native's document is not valid JSON.

**Mechanism (planning, HIGH).** The port's `XdotParser.parseReal`
(`src/xdot/parse.ts:47-57`) scans only `[sign] digits [. digits] [e [sign] digits]`, so
`inf` fails. `parsePolyline` returns null, `parseOp` returns `"error"`, and
`parseXDotFOn` keeps the ops parsed so far and sets `XDOT_PARSE_ERROR`, as C does. The `p`
op is lost, and `drawStringToOps` (`src/render/json.ts:183-188`) prints only the `c` op.
**Evidence:** with native's tokens replaced by `null`, `compareJson` finds exactly one
diff per affected cluster (`_draw_[opCount]` port 1 / native 2 on `1221` and `2721`,
2 / 3 on five clusters of `1332`) and no other difference. The registry rationale
"port emits finite, valid JSON" (2026-07-24) got the port's behaviour wrong: the port
drops the op.

**Fix (see [decisions.md](decisions.md)):**

1. **T1:** `parseReal` scans what C's `strtod` accepts, and xdot whitespace is
   `gv_isspace` (AD-1).
2. **T2:** the json writer prints a non-finite number as `%.03f` prints it: `inf`,
   `-inf`, `nan` (AD-2).
3. **T3:** `compareJson` reads those tokens and compares non-finite values exactly
   (AD-3).
4. **T4:** re-walk the three ids, retire their three `[parse]/oracle` acceptances, and
   mark follow-up 158 done (AD-4).

**Done when:** T1-T4's acceptance criteria hold; `1221`, `1332` and `2721` are
`conformant` on the osage json walk with their acceptances retired; follow-ups README
item 158 is marked DONE; gates green with every changed output equal to native. Commit
type `fix`.

**Out of scope (AD-5):**
- `compare-xdot.ts` and `compare.ts` read numbers with `delta > tolerance`, which lets a
  NaN delta pass. T1 makes `parseXDot` feed compare-xdot non-finite values on these three
  ids, so file that as a `follow-up` and do not fix it.
- `gvStrtod` (`src/util/math.ts:102`) and every other `parseFloat` user outside
  `src/xdot`.
- The json writer's finite-number formatting (`JSON.stringify` against `%.03f`). It is
  an accepted formatting difference (the json.ts header).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read the queue rules (`.claude/queue-policy.md`, injected into the session). They
   override this brief where the two disagree.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then the batch overviews. Check what is
   already done with `git log --oneline d6d0a91b..`.
4. Read `.agent-notes/issue-129.md` (non-dot plugin dirs, `.mts` temp scripts).

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, and never merge `main` into it.
- **Base sha:** `d6d0a91b0c56d19fdb65727471e3b277608ccfcd` (the tip at planning). If the
  tip has moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-144 brief` (this
  directory), then `fix(T1): ...` through `chore(T4): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T4's last step):** `git tag issue-144/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(json): keep a cluster draw polygon with inf/nan points as C does

  A cluster whose bb is inf,inf,nan,nan gets the xdot frame
  "p 4 inf inf inf nan ...". C's parseXDot reads it with strtod, which
  takes inf and nan, and json prints each point with %.03f. The port's
  xdot parseReal took only decimal digits, so the polygon failed to
  parse and json dropped it. parseReal now scans strtod's grammar, and
  json prints a non-finite number as inf, -inf or nan, as %.03f does;
  compare-json reads those tokens. Osage 1221, 1332 and 2721 json are
  conformant and their acceptances are retired.

  Refs: #144
  ```

  Add a gates line to the body, as #139's commit does. Lines ≤ 80, subject ≤ 72, no
  attribution. Never push, rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4: `src/render/json.ts` cap 734, now 724) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T4](batch-2/T4-retire-acceptances.md#bytediff) | every changed output equals native |
| 6 | Targeted survey | see [T4](batch-2/T4-retire-acceptances.md#targeted-survey) | the three ids conformant; nothing else moves |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot` (16.1.0).
osage needs a plugin dir with `neato_layout`. Build it under `$TMPDIR` per
`.agent-notes/issue-129.md` (planning used `$TMPDIR/ghl-neato-141`; reuse it if it is
still there). Run `oraclePreflight` (`test/corpus/oracle-env.ts`) on it for `osage` and
`dot` before trusting native output. Check `uptime` before gates 5-6, and wait while it
is above 12.

Baseline at planning: typecheck and `npm test` green on `d6d0a91b`
([decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside a task's write-set needs a change. One exception: an existing test that
   pins the old `parseReal` behaviour (for example `"1e"` consuming the `e`, or `"."`
   parsing). Update it to C's `strtod` result and journal it.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a stated
   mechanism, journal it, and stop.
3. The smoke bytediff or the targeted survey shows a changed output that does not equal
   native. Halt per the queue rules.
4. After T1-T3, any of the three ids still differs from native on json, or differs on a
   format other than json. Diagnose it, and stop if it is not this mechanism.
5. An architecture decision in [decisions.md](decisions.md) turns out to be wrong, for
   example native printing `-nan` or `nan.000`, or a path from the port's json output
   into a `JSON.parse` inside `src/`.

## Push-forward (decide alone, journal it)

- Where the non-finite serializer lives (in `json.ts`, or a small sibling module if
  Gate 4's headroom is short) and its sentinel spelling.
- Helper names and how the strtod scan is split, within the complexity limits
  (30 NLOC, CCN 10 per function).
- Test file names and layout.
- Wording of the json.ts header note about non-finite numbers.
- Filing a `follow-up` issue for any unrelated native difference the survey shows on base
  and head alike.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-5, auto-confirmed record, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | T1, T2, T3 |
| [batch-1/T1-strtod-parse-real.md](batch-1/T1-strtod-parse-real.md) | xdot `parseReal` = strtod |
| [batch-1/T2-json-nonfinite-tokens.md](batch-1/T2-json-nonfinite-tokens.md) | json prints `inf`/`nan` |
| [batch-1/T3-compare-json-nonfinite.md](batch-1/T3-compare-json-nonfinite.md) | comparator reads them |
| [batch-2/overview.md](batch-2/overview.md) | T4 |
| [batch-2/T4-retire-acceptances.md](batch-2/T4-retire-acceptances.md) | re-walk, retire, gates, squash |
| [diagrams/data-flow.md](diagrams/data-flow.md) | xdot string → json |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [harness/regen.sh](harness/regen.sh) | native refs for the three ids |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1, T2, T3 | [x] |
| 2: T4 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): the mechanism, the
  files, the gates.
- Write `.agent-notes/issue-144.md` for anything novel. Candidates: macOS `%.03f`
  spelling of non-finite values, and the comparator NaN blind spot. Otherwise state that
  nothing was novel.
- End the final message with the driver's status line.

## Summary (2026-11-10)

- **Tasks:** 4 of 4 (T1, T3, T2, T4; T3 ran before T2).
- **Decisions:** 9 journal rows. For review: AD-1 refined from a libc probe (macOS `strtod`
  takes any characters inside `nan(...)`); the strtod scan and the serializer live in two new
  sibling modules (`src/xdot/strtod.ts`, `src/render/json-nonfinite.ts`); the walk was not
  re-run (it would render `894589` too), the three rows come from a targeted comparison;
  `PARITY-JSON.md` had its three rows removed by hand; the brief's `getDrawOps` expectation was
  wrong (#203).
- **Gates:** 1-4 green; smoke bytediff 1960 jobs identical; targeted survey: json changed on
  osage `1221`, `1332`, `2721` only, each equal to native; 19 heavy pairs not rendered.
- **Follow-ups:** #201 (comparator NaN blind spot), #202 (`parseString` skip), #203
  (`getDrawOps` omits cluster ops).
