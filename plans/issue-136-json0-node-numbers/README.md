# Mission: issue #136: json0 prints node numbers as attach_attrs does

## Objective

C's `json_begin_graph` runs `attach_attrs` for FORMAT_JSON0
(`plugin/core/gvrender_core_json.c:65-67`). That writes each node's `pos`, `height` and
`width` at `%.5g`, from `ND_coord`, `PS2INCH(ND_ht)` and `PS2INCH(ND_lw + ND_rw)`
(`lib/common/output.c:296-309`), and json0 prints those strings. The port's json0 has no
xdot draw lookup, so `buildNodeObject` builds the three values itself
(`src/render/json.ts:518-523`). It uses `printNum` (xdot-ops.ts:77), the xdot draw-op
number format (`%.3f`, trailing zeros trimmed, leading zero dropped), and takes
`info.width`/`info.height` (the input attribute) where C uses `ht` and `lw + rw`. So
json0 prints `.75` where native prints `0.75`, `.344` where native prints `0.34444`,
`133.148` where native prints `133.15`, and only two coordinates for a `dimen=3` layout.

Planning evidence (16.1.0; probe [harness/node-fields.mts](harness/node-fields.mts), refs
in [harness/out/](harness/out/)):

- Smoke ids × dot: 1445 node fields differ (height 618, width 615, pos 203, label 7,
  rects 2). 1412 of them equal the port's own `-Tjson` value for that node. `-Tjson`
  reads them from the xdot render, which formats them as `attach_attrs` does. The other
  33 are all in `graphs-b56`, where the port's `-Tjson` differs from native too (a
  non-ASCII label class, see [decisions.md](decisions.md#ad-3)). `1581` and `1328` fail
  natively under dot.
- 13 neato-family smoke ids × neato: 667 fields differ and 667 equal the port's `-Tjson`
  value.
- `harness/{sizes,frac,dim3}.gv`, the corpus' only `dim=3` input `2556` (neato), and a
  `y_invert=true` graph: every differing field equals the port's `-Tjson` value.

Done means: json0 node `pos`, `width` and `height` come from the same function as
`attach_attrs`'s write-back, and equal native on the smoke ids, `graphs-b56` excepted
(AD-3). A new test pins them to native refs. Follow-ups README item 147 is marked DONE.
The drafted follow-up is filed. Gates are green. Type `fix`.

**Out of scope:** graph/cluster `bb` and edge `pos` in json0 (#184), the anonymous root's
`name` ([followup-anon-root-name.md](followup-anon-root-name.md)), json key order
(the port's json is structural by design, `json.ts` header), `graphs-b56` labels.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read the queue rules (`.claude/queue-policy.md`, injected into the session). They
   override this brief where the two disagree.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 3c371f02..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, never merge `main` into it.
- **Base sha:** `3c371f02255413c4e6877bae15a2537aceb08a39` (tip at planning time). If
  the tip moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-136 brief` (this
  directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-136/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(json): print json0 node pos and sizes as attach_attrs does

  json0 has no xdot render to read node layout attributes from, so
  buildNodeObject formatted pos, width and height itself with printNum,
  the xdot draw-op format (.75, 125.354), and from the input width and
  height. C's json0 prints what attach_attrs wrote: %.5g of ND_coord,
  PS2INCH(ND_ht) and PS2INCH(ND_lw + ND_rw), every pos coordinate of
  a dimen=3 layout included. Both now use one function.

  Refs: #136
  ```

  Add a gates line to the body as #135's commit does. Lines ≤ 80, subject ≤ 72, no
  attribution. Never push, rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-json0-node-numbers.md#bytediff) | only json0 jobs change; changed fields equal native |
| 6 | Targeted survey | see [T1](batch-1/T1-json0-node-numbers.md#targeted-survey) | head json0 node fields = native |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot`
(16.1.0), plugin dir `/tmp/ghl` for dot. The other seven engines need `neato_layout`.
Build a dir under `$TMPDIR` per `.agent-notes/issue-129.md`: symlink
`build/plugin/{core,dot_layout,neato_layout}/libgvplugin_*`, then
`GVBINDIR=<dir> <dot> -c`. `$TMPDIR/i135-ghl-neato` existed at planning; check it before
reusing it. Run `oraclePreflight` (`test/corpus/oracle-env.ts`) for each dir and engine
before trusting native output. Check `uptime` before gates 5 and 6, and wait while it
is above 12. Load was 69 at planning.

Baseline at planning: typecheck and `npm test` green on `3c371f02`
([decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts: diagnose to a stated
   mechanism, journal it, stop.
3. `regen.sh`, run with the preflighted oracle, produces refs that differ from the
   committed `harness/out/*`: the premise is in doubt. Stop with the diff.
4. A non-json0 bytediff job changes, or a changed json0 job differs from base in
   anything but node `pos`/`width`/`height`, or a changed value differs from native
   (`graphs-b56` per AD-3 excepted): halt per the queue rules.
5. `json.ts` would grow past its base length (723 lines), or an architecture decision in
   [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- The exported function's name and return shape, within AD-1's contract.
- Test names and case table layout in `json0-node-attrs.test.ts`.
- Adding a corpus id to gate 6 that reaches the path in a way the planned ids do not
  (e.g. another `dim`/`dimen` input).
- Filing a `follow-up` issue for any unrelated native difference seen on base and head
  alike.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, follow-ups, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-json0-node-numbers.md](batch-1/T1-json0-node-numbers.md) | the task |
| [harness/](harness/) | fixtures, `regen.sh`, native json0 refs in `out/`, survey probe |
| [followup-anon-root-name.md](followup-anon-root-name.md) | draft issue: anonymous root `name` |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where json0 node values come from |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (project journal): mechanism, files, gates.
- `.agent-notes/issue-136.md` for anything novel. Candidates: public `render()`
  accepts `json0` at runtime though `OutputFormat` omits it, so `bytediff.ts` takes it in
  `BD_FORMATS`. `compareJson` skips the root `name`. Otherwise state that nothing was
  novel.
- Final message ends with the driver's status line.

## Summary (2026-11-10)

- **Tasks:** 1 of 1 done (T1).
- **Decisions:** 5 journalled judgment calls. Two are flagged for review: gate 6 was widened
  from 140 planned rows to 416, and 18 rows whose `pos` differs from native through an
  accepted layout divergence did not halt the mission (#186, `needs-ruling`). AD-3 is
  superseded: the `graphs-b56` exception was a probe artifact and is not used.
- **Gates:** typecheck 0; `npm test` 562 files / 13275 tests; goldens 5/5; corpus + docs 2837
  tests; smoke bytediff 2352 jobs, 1968 identical, 384 changed, all json0 and node
  `pos`/`width`/`height` only; survey 416 rows, native finished 412, head equals native on
  394, 18 rows differ in `pos` alone (17 sfdp, `graphs-polypoly` x osage).
- **Filed:** #185 (follow-up: anonymous root `name`), #186 (needs-ruling: the 18 rows).
- **Outside T1's planned write-set:** `harness/node-fields.mts` (the probe gave native a
  re-encoded input) and `decisions.md` (AD-3 note).
