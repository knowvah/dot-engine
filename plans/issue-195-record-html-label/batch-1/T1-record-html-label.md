# T1: port make_label's is_record branch; html field labels; tests, gates, squash

## Context

A record node's `ND_label` in C is unmeasured raw text with `html` set for an
html-like value. `parse_reclbl` then builds each field as an html label. The
port measures the record label whole, as plain text, and builds the fields
with `html` false
([../decisions.md](../decisions.md#mechanism-planning-s-diagnosis)).
[../harness/prototype.diff](../harness/prototype.diff) is the working fix
(AD-1) with its tests (AD-2).

## Write-set

| File | Action |
|---|---|
| `src/common/make-label.ts` | Modify: add `makeRecordLabel` and the `html-string.js` import (AD-1) |
| `src/common/record.ts` | Modify: `recordMakeLabel`, `recFlushText`'s html argument, `genFields`' emit, imports (AD-1); ≤ 521 lines |
| `src/render/map.ts` | Modify: `plainNodeLabel`'s first test, `lbl.html` (AD-1) |
| `src/common/record-html-label.test.ts` | Create (AD-2 items 1, 2) |
| `src/common/record.branch.test.ts` | Modify: `:257-261` only, same line count (AD-2 item 3) |
| `plans/decision-journal.md`, this brief's `decision-journal.md`, `README.md` status, `harness/results/` | Modify |
| `.agent-notes/issue-195.md` | Create |

Read-set: `lib/common/labels.c:110-183`, `lib/common/shapes.c:3358-3500,3663-3707,3831-3860`,
`lib/common/output.c:145-160`, `src/common/record.ts:130-160,375-470`,
`src/common/make-label.ts:180-240`, `src/gvc/device-labels.ts:66-115`,
`src/render/map.ts:275-310`, `src/parser/builder-local-names.test.ts:1-80` (the
harness-fixture pattern).

## Steps

1. **Start.** Run `git log --oneline 6da5d4e1..`. If the tip has moved, the
   tip at start is the base: journal it, and build the base bundle from it in
   step 5. Check `uptime` (above 12, wait) and the oracle:
   `ls /tmp/ghl1611-carried/config8 /tmp/ghl1611-carried-all/config8`. If one
   is missing, run `GVBINDIR=<dir> ~/git/sseely/graphviz-carried/build/cmd/dot/dot -c`.
2. **Fixtures.** Run `bash plans/issue-195-record-html-label/harness/recapture.sh $TMPDIR/i195/native`,
   then `diff -r $TMPDIR/i195/native plans/issue-195-record-html-label/harness/native`.
   Any difference means the oracle moved: stop 4.
3. **Tests first** (AD-2). Write `src/common/record-html-label.test.ts` as in
   the prototype diff, and make the `record.branch.test.ts` edit. On the base,
   prove the integration rows reach the defect. Temporarily add an
   export-only stub to `make-label.ts`:
   `export const makeRecordLabel = (s: string, f: FontInfo): TextlabelT => makeLabel(s, f.fontname, f.fontsize, f.fontcolor, { measure: () => ({ w: 0, h: 0 }) });`.
   Then run `npx vitest run src/common/record-html-label.test.ts` and remove
   the stub. Journal the counts. Pass: every in-scope probe fails at least one
   of its four checks (base matrix 0/210), and the repro-pin test passes (it
   reads only the fixture). Otherwise stop 2.
4. **Fix** (AD-1). Run `git apply` on the prototype diff's three source-file
   hunks, or make the same edits by hand if the base moved. Run
   `npx vitest run src/common src/render`: all pass.
   `wc -l src/common/record.ts` must be ≤ 521. `src/common/poly-gencode.ts`
   is not touched.
5. **Probe matrix.** Build the head bundle (`npm run build:js`, then copy
   `dist/index.js` to `$TMPDIR/i195/head.mjs`) and the base bundle (step 7's
   method). Run
   `npx tsx plans/issue-195-record-html-label/harness/probe.ts $TMPDIR/i195/base.mjs $TMPDIR/i195/head.mjs > plans/issue-195-record-html-label/harness/results/probe-head.tsv`.
   Pass: the in-scope tally is `base=out head=eq` 168 and `base=err head=eq`
   42, and every row, `oos-*` included, equals `results/probe-prototype.tsv`.
   Any other row is stop 3.
6. **Gates 1-4** (README table). Record each in the journal.
7. **Gate 5: smoke bytediff.** Build the base bundle from `git archive <base>`
   in `$TMPDIR/i195/base-src`: symlink `node_modules`, run
   `npm run parser:regen` and `npm run build:js`, and copy `dist/index.js` to
   `$TMPDIR/i195/base.mjs` (never `git stash`). Then run
   `BD_FORMATS=svg,xdot,json,plain,cmapx,dot npx tsx test/tools/bytediff.ts $TMPDIR/i195/base.mjs $TMPDIR/i195/head.mjs ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i195/smoke.json`.
   Pass: the result equals planning's (journal row 2). Every diff it lists
   must be one planning classified, and each must still equal native or pass
   a queue-rule exception. A job capped once means the machine is loaded:
   re-run that job alone.
8. **Gate 6: targeted survey.** Run the bytediff of
   [../harness/survey.md](../harness/survey.md) over `harness/survey-ids.txt`.
   Pass: the same 18 diff keys as planning (journal row 3), each
   re-checked against native as row 3 checked it. The capped jobs are the 24
   of row 3, each capped on both bundles (row 4 says why that is
   pre-existing). A diff key or a one-sided cap that planning did not see is
   stop 3. Load from other sessions slows `2646`, `2834` and `world`: wait
   until `uptime` ≤ 12 before starting.
9. **Notes and journals** (README "Session end").
10. **Squash** (README "Branch and commits").

## Acceptance criteria

- Given the issue's repro (`Mrecord` with two html tables), when it is laid
  out with dot or osage, then `bb="0,0,81.304,66.6"`, `width=1.1292` and
  `height=0.925` equal native, and stderr is empty, as native's is.
- Given an html record label (`text-fields`, `font`, `lr`, `table-port`,
  `xlabel`), when rendered to xdot, then the field `_ldraw_` ops equal
  native's byte for byte.
- Given an html record label, when rendered to plain, then the label field
  is `<...>`, as native prints it.
- Given a record label with a raw tab (`ctl-218`, `graphs/b545.gv`), when laid
  out, then no width warning is printed (#218).
- Given every smoke id, the result equals planning's (gate 5).

## Observability

N/A: library code with no runtime telemetry. The evidence is the TSVs under
`harness/results/` and the journal rows.

## Rollback

Reversible: revert the squashed commit. Nothing persists outside the repo.
