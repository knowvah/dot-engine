# T1: conjgrad-mkernel's error prints on one line

## Context

C `lib/neatogen/conjgrad.c:65` calls
`agerrorf("conjugate_gradient: unexpected length 0 vector\n")`. C's `agerrorf`
writes the text as given, so native prints one line. The port's agerr family
always finishes a line itself (`src/common/agerr.ts:8-10`); every call site drops
C's trailing `\n`. `conjgrad-mkernel.ts:28` did not, so:

- console: `Error: conjugate_gradient: unexpected length 0 vector\n` passed to
  `console.error`, which adds its own newline: a blank second line;
- `agseterrf` sink: the last piece is `...vector\n\n` (`agerr.ts:156` appends `\n`).

Reached only when `r·r` underflows to 0 while `max|r| > tol`
(`cgIteration`, `conjgrad-mkernel.ts:115-117`). The kernel runs the default neato
stress (`stressMajorizationKDMkernel`, `src/layout/neato/init.ts:330`),
`mode=hier` (`constrained-majorization.ts:351`) and `mode=ipsep`
(`stress-cola.ts:378,401`).

## Task (TDD)

1. **Red:** rewrite the zero-length test in `conjgrad-mkernel.test.ts` (now
   lines 64-71) per [AD-3](../decisions.md#ad-3-the-test-mirrors-conjgradtestts):
   keep the existing `A = pack([[1e30, 0], [0, 1e30]])`, `b = (1e-30, -1e-30)`,
   `tol: 0, maxIterations: 3` fixture and its return code 1; assert
   `err.mock.calls` equals `[['Error: conjugate_gradient: unexpected length 0 vector']]`;
   add a sink test expecting `['Error', ': ', 'conjugate_gradient: unexpected length 0 vector\n']`;
   add `agseterrf(null)` to `afterEach`. Run the file; both assertions must fail
   against the current source.
2. **Green:** drop `\n` from `ZERO_LENGTH_MESSAGE` (`conjgrad-mkernel.ts:28`); update
   its doc comment to cite `conjgrad.c:65` and say the trailing `\n` is dropped
   per `agerr.ts`.
3. Mark item 139 in `plans/post-16.1-followups/README.md` (line ~686)
   `**[DONE — issue #129: dropped the \n]**`, in the style of item 131.
4. Gates 1-6 (README), then journal, then the squash in the README.

## Write-set

- `src/layout/neato/conjgrad-mkernel.ts` (line 28 and its comment only)
- `src/layout/neato/conjgrad-mkernel.test.ts`
- `plans/post-16.1-followups/README.md` (item 139 only)
- `plans/decision-journal.md` (one row), `plans/issue-129-conjgrad-mkernel-newline/decision-journal.md`
- `.agent-notes/issue-129.md` (only if novel)

## Read-set

- `src/layout/neato/conjgrad-mkernel.ts:20-30,100-125`
- `src/layout/neato/conjgrad-mkernel.test.ts:1-10,64-71`
- `src/layout/neato/conjgrad.test.ts` (T5's pattern, 45 lines)
- `src/common/agerr.ts:1-20,110-160`
- `~/git/graphviz/lib/neatogen/conjgrad.c:55-70`
- `git show bbd0b48d` (T5's precedent)

## Interface contracts

None. No exported symbol changes; `conjugateGradientMkernelFused` still returns 1
on this path.

## Acceptance criteria

- Given the underflow fixture, when `conjugateGradientMkernelFused` runs, then it
  returns 1 and `console.error` is called once, with
  `Error: conjugate_gradient: unexpected length 0 vector` (no `\n`).
- Given an `agseterrf` sink, when the same fixture runs, then the sink receives
  exactly `['Error', ': ', 'conjugate_gradient: unexpected length 0 vector\n']`.
- Given `src/`, when grepping `unexpected length 0 vector\\n`, then there are no
  matches outside tests.
- Given the smoke list and the targeted survey, when compared against the base and
  native, then no output or stderr differs.

## Bytediff

`src/` changes, so gate 5 applies. Build the base and head bundles
(`npm run build:js`, copy `dist/index.js` to `$TMPDIR/issue129-base.mjs` and
`$TMPDIR/issue129-head.mjs`; build the base in a temporary worktree of `35f98bb0`
with `node_modules` symlinked and `npm run parser:regen`), then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue129-base.mjs $TMPDIR/issue129-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue129-bytediff.json
```

Expected: identical on every job (the path needs a float underflow no smoke input
hits). Any difference is a halt unless it equals native.

## Targeted survey

How to choose: the change is reachable only through the three kernel callers above,
all neato. Take (a) every corpus input under `~/git/graphviz/tests` that sets
`mode=hier` or `mode=ipsep` (at planning: `1554.dot`; re-grep), and (b) the neato ids
in the smoke list (`linux.x86-pack_neato1/2`, `nshare-pack_neato1/2`,
`tree-doc-neato-G4_orig`). For each, render `-Kneato -Tsvg` with the head bundle and
with the oracle; compare output with the corpus comparator and stderr exactly.
Expected: identical to the base; a stderr line containing `unexpected length 0
vector` on any id is new evidence. Journal the id list and how it was chosen.

## Observability

N/A: no new observable operations. The change removes one blank stderr line.

## Rollback

Reversible: revert the commit.
