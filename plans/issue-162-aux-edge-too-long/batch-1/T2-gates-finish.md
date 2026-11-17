# T2: gates, survey, comments, report, squash

## Gates 1-4

As the README table. Record each in the journal with counts.

## Bytediff (gate 5)

`src/` changed. Head: `npm run build:js` (after `npm test` has finished), copy
`dist/index.js` to `$TMPDIR/issue162-head.mjs`. Base: `git archive <base>`
under `$TMPDIR`, with `node_modules` symlinked, then `npm run parser:regen`,
`npm run build:js`, and copy to `$TMPDIR/issue162-base.mjs`. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue162-base.mjs $TMPDIR/issue162-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue162-bytediff.json
```

**Expected at planning: 0 changed jobs.** No smoke id is in either detector's
hits (README, Evidence). The AD-3 nodesep saturation changes only a nodesep above
29826161 in, which no smoke id sets. A changed job means the change reached
further than planned. Diagnose it (which `P162` site, which id) and halt unless
it equals native.

## Targeted survey (gate 6)

**How the ids were chosen** ([harness/survey-ids.txt](../harness/survey-ids.txt)):
the change alters behaviour only where `makeAuxEdge` gets `len > INT_MAX` (AD-1/2)
or nodesep exceeds `INT_MAX` points (AD-3). `make_aux_edge` prints its message on
every refusal, so the message is the reach marker on both sides. Two detectors ran
over all 982 applicable dot ids (`-Kdot -Tplain`, 60 s cap, then a port-only 180 s
re-run of the ids that did not finish; [harness/detector-nonzero.txt](../harness/detector-nonzero.txt)):

- native: [harness/detector-native.sh](../harness/detector-native.sh) (16.1.1
  oracle stderr);
- port: [harness/detector.sh](../harness/detector.sh) with a bundle of the base
  plus [harness/detector.patch](../harness/detector.patch) (the cf plus `P162`
  markers naming the refusing caller and the `dotPosition` failure).

Both hit exactly `1314`, `2758`, `2776_1`, `2781` and `2781_1`, one message
each, with the same value. On the port every refusal is at `lrRankPair` and fails
`dotPosition` ([harness/detector-hits.txt](../harness/detector-hits.txt)). `2776`
is a control: the same upstream family, failing in pathplan instead.

Run, at load below 12 (native renders):

```
bash plans/issue-162-aux-edge-too-long/harness/native-compare.sh \
  $TMPDIR/issue162-base.mjs $TMPDIR/issue162-head.mjs \
  plans/issue-162-aux-edge-too-long/harness/survey-ids.txt $TMPDIR/issue162-survey
```

**Pass:** the output equals
[harness/planning-survey.txt](../harness/planning-survey.txt) line for line. The
residue it carries, and nothing else:

- json `head~native:2` on every reach id: the root `"name": ""` vs native's
  `"%1"` (#185).
- `2781`/`2781_1` svg and xdot `head~native:2`, json `4`: node `00`'s ellipse
  centre `0` vs `2147483648`, which is native's fma contraction in
  `poly_gencode` (#236, decisions AD-5). These rows print `toward:FAIL a=1 b=0`:
  that one line changed and still differs from native, while `b=0` means no line
  that equalled native on the base was lost. List them in the report under
  "toward-native changes" with the counts (svg 48 → 2, xdot 74 → 2, json
  494 → 4) and the #236 mechanism.

Also check stderr on every survey id. On the head it must equal native's
apart from paths (`node test/tools/bd-job.ts <bundle> <file> dot svg 2>&1 | sed
-n '/--stderr--/,$p'` vs `dot … 2>&1 >/dev/null`; native prints the input path in
the `syntax ambiguity` warnings and `lib/pathplan/...` prefixes on `2776` where the
port prints `input` and nothing). The planning values:

| id | `Edge length` value (native = cf) |
|---|---|
| 1314 | `272931242864.483337` |
| 2758 | `2147483701.000000` |
| 2776_1 | `300000000000000000.000000` |
| 2781, 2781_1 | `71999999999999994497073152.000000` |

Any other difference: diagnose it, and halt unless it equals native.

## Comments

1. On #162: the outcome; the C-site → port-site table (decisions AD-2) with the
   upstream shas; the survey table; the 2758 nodesep finding (AD-3); the two
   residues (#185, #236); the pack-arm note (native segfaults on the probe); and
   that the issue body's "only `make_edge_pairs` checks" is corrected by
   `e62e35be5`.
2. On #148: #162 is on the branch; `2758`, `2776_1`, `2781`, `2781_1` now fail as
   native does (error, exit-1 output); verdict changes are for the maintainer's
   survey.

## Finish

1. Journal rows for every gate; README batch status and Summary.
2. One row in `plans/decision-journal.md`. Write `.agent-notes/issue-162.md`
   for anything novel. Candidates: `printfFixed` is the `%f` for huge values
   (`toFixed` goes exponential at 1e21); native `int` fields filled by `POINTS`
   saturate on arm64 (2758); native segfaults after a failed pack component.
3. Write-set check: `git diff --name-only <base>` lists only T1's write-set,
   this directory, `plans/decision-journal.md` and `.agent-notes/issue-162.md`.
4. `git tag issue-162/pre-squash`, `git reset --soft <base>`, and one commit
   with the README's message.

## Write-set

Journals, README status/summary, `plans/decision-journal.md`,
`.agent-notes/issue-162.md`.

## Acceptance criteria

- Given the head and base bundles, when bytediff runs over the smoke ids, then
  0 jobs differ.
- Given the survey ids, when `native-compare.sh` runs, then its output equals
  `planning-survey.txt`, and the head's `Edge length` stderr equals native's on
  all five reach ids.
- Given the finished mission, when `git log <base>..` is read, then there is
  exactly one commit, with footer `Refs: #162`, and the tag
  `issue-162/pre-squash` holds the per-task history.

## Observability

N/A.

## Rollback

Reversible: revert the squashed commit.
