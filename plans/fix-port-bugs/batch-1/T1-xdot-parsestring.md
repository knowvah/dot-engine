<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — xdot parseString rejects truncated byte-counted strings

## Context

dot-engine is a faithful TypeScript port of Graphviz; the C source at
`~/git/graphviz` is the canonical spec. Tests use vitest; strict TS. Every
ported symbol carries a `@see` reference to its C origin. TDD: convert the
existing `it.todo` into a real red test FIRST, verify it fails, then fix src.

## The bug (locked analysis — if the fix turns out to differ, STOP)

`XdotParser.parseString` (src/xdot/parse.ts:108-139) parses `N-<chars>` where
N is a UTF-8 byte count. When the input runs out before N bytes are accounted,
the port `break`s out of the loop (parse.ts:125, mislabeled "C strncpy
semantics") and returns the partial string as success. C's parseString
(`~/git/graphviz/lib/xdot/xdot.c:138-142`) instead returns 0/NULL the moment
`s[j] == '\0'` before the count is satisfied — corrupt xdot must fail parsing.
Probe: `parseString("5-ab", 0)` currently returns `{ val: "ab", pos: 4 }`;
C returns NULL.

## Task

1. In src/xdot/parse.branch.test.ts, replace the `it.todo` at :190 (describe
   "parseString — truncated input (documented port bug)") with real test(s).
   Run them; confirm red.
2. Fix parseString: exhausting input before `accounted == len` returns `null`.
   Replace the inaccurate "C strncpy semantics" comment with a correct note
   citing xdot.c:138-142.
3. Confirm green; run the full quality bar.

## Write-set

- src/xdot/parse.ts
- src/xdot/parse.branch.test.ts

## Read-set

- src/xdot/parse.ts:100-145 (parseString + cpByteLen)
- src/xdot/parse.branch.test.ts:160-205 (surrounding describes + the todo)
- ~/git/graphviz/lib/xdot/xdot.c:110-155 (C parseString)

## Acceptance criteria

- Given `parseString("5-ab", 0)`, when parsed, then the result is `null`.
- Given the op string `"T 0 0 0 50 5-ab"`, when `parseXDot` runs, then the
  whole parse returns `null` (a failed string fails the op).
- Given the existing 2/3/4-byte code-point tests (parse.branch.test.ts:162-178),
  then they still pass unchanged.
- The `it.todo` is gone; its replacement asserts specific values (no
  toBeTruthy / not.toThrow).

## Observability requirements

N/A — no new observable operations (browser library, no telemetry).

## Rollback notes

Reversible — pure code change, revert the commit.

## Quality bar

`npm run typecheck` exit 0; `npm test` exit 0 (full suite);
`git diff --name-only` within the write-set only.

## Boundaries

- Never edit files outside the write-set.
- Never change behavior for inputs C accepts (valid xdot must still parse).
- Do not write decision-journal.md — return your journal-entry text
  (mechanism, file:line, what changed) in your final report instead.

## Commit

One commit: `fix(xdot): parseString rejects truncated byte-counted strings (T1)`
Body: why (C xdot.c:138-142 returns NULL; port silently accepted corrupt xdot).
