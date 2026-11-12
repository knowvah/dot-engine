# T3: `compareJson` reads C's non-finite tokens and compares them exactly

## Context

See the [README](../README.md#objective) and [decisions.md](../decisions.md) AD-3. File:
`test/golden/compare-json.ts`. The parse step is at `:602-640`, the op numeric loop at
`:276-295`, the positional loop at `:366-380`, and `extractNumbers` at `:138-147`. Test
file: `test/golden/compare-json.test.ts`. Today native's text for the three ids fails
`JSON.parse`, giving `[parse]/oracle`. After T2 the port's text fails first, giving
`[parse]/port`.

## Steps (TDD)

1. **Red.** In `test/golden/compare-json.test.ts`, add:
   - The native ref `../harness/out/1221.osage.json` (read it from the plan dir, or
     inline the cluster snippet) compared with itself: `pass: true`, no diffs.
   - Port text with `[inf,nan]` against oracle `[inf,nan]`: pass. `[inf,nan]` against
     `[nan,inf]`: a numeric diff on each point. `[inf,1]` against `[-inf,1]`: diff.
     `[nan,1]` against `[5,1]`: diff (it passes today, because the NaN delta slips
     past `delta > tolerance`).
   - A `bb` of `"inf,inf,nan,nan"` against `"inf,inf,nan,nan"`: pass. Against
     `"1,2,3,4"`: diff.
   - Strings that hold `inf`/`nan` as text (for example a label `"nan"`, or `info`)
     come through the token rewrite unchanged.
2. **Green.** Add a tokenizer pass before both `JSON.parse` calls. It walks the text,
   skips string literals (honouring `\"` escapes), and rewrites a bare `-inf`, `inf` or
   `nan` at a value position into a parseable placeholder. A `JSON.parse` reviver, or a
   post-walk, turns each placeholder back into `-Infinity`, `Infinity` or `NaN`. Route
   every numeric comparison in the file through one helper,
   `numDelta(a, b): number`: 0 when both are NaN or both are the same infinity,
   `Infinity` when exactly one is non-finite or the infinities differ in sign, and
   `Math.abs(a - b)` otherwise. `extractNumbers` also matches `-?inf` and `nan` at word
   boundaries.
3. Run `npx vitest run test/golden` and `npm run typecheck`.
4. Commit `test(T3): read c's non-finite tokens in compare-json`.

## Write-set

| File | Change |
|---|---|
| `test/golden/compare-json.ts` | token rewrite, `numDelta`, `extractNumbers` |
| `test/golden/compare-json.test.ts` | the cases above |

`compare-xdot.ts` and `compare.ts` are not in the write-set (AD-5). File one `follow-up`
issue for their `delta > tolerance` NaN blind spot, citing `compare-xdot.ts:399,464` and
`compare.ts:162,186,208`.

## Read-set

`test/corpus/json-walk.ts:340-370` (how the walk calls `compareJson`),
`../harness/out/*.json`.

## Interface contract (consumed by T4)

`compareJson(portText, oracleText, tol)` accepts texts that hold C's bare `inf`, `-inf`
and `nan` tokens. A `[parse]` diff now means the text is malformed for another reason.

## Acceptance criteria

- Given native's `1221` json against itself, when compared, then it passes with 0 diffs.
- Given NaN on one side and a finite value on the other, when compared, then a numeric
  diff is reported.
- Given NaN against NaN, or the same infinity on both sides, when compared, then no diff
  is reported.
- Given every existing `compare-json.test.ts` case, when run, then it is unchanged.

## Observability

N/A. This is test tooling.

## Rollback

Reversible by reverting the squash commit.
