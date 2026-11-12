# T1: xdot `parseReal` scans what `strtod` accepts

## Context

See the [README](../README.md#objective) and [decisions.md](../decisions.md) AD-1. C
references: `lib/xdot/xdot.c:24-33` (`parseReal`), `:52-77` (`parseRect`), `:79-110`
(`parsePolyline`), `:171` (op whitespace, `gv_isspace`), `:336-384` (`parseXDotFOn`
keeps the partial ops and sets `XDOT_PARSE_ERROR`); `lib/util/gv_ctype.h:55`
(`gv_isspace`). Port: `src/xdot/parse.ts:24-57` (`isWs`, `skipWs`, `consumeDigits`,
`consumeExponent`, `parseReal`).

## Steps (TDD)

1. **Red.** Write `src/xdot/parse-strtod.test.ts` and drive it through `parseXDot` (as
   `parse.branch.test.ts` does) and the exported `parsePolyline`/`parseRect`:
   - `"p 4 inf inf inf nan nan nan nan inf "` gives one `unfilled_polygon` op with points
     `(Inf,Inf) (Inf,NaN) (NaN,NaN) (NaN,Inf)` and no `XDOT_PARSE_ERROR` flag. The
     string `"c 7 -#000000 p 4 inf ..."` gives 2 ops (today it gives 1 and the flag).
   - `INF`, `Infinity`, `-inf`, `+nan`, `NaN(abc_1)` each parse in an `E` rect field;
     `infx` parses as inf with the parse position at `x`.
   - Hex: `0x1.8p1` = 3; `0X10` = 16; `0x1p-1074` = 5e-324; `-0x1p-1` = -0.5;
     `0x1.fffffffffffff8p1023` = Infinity (half-even overflow); `0x` = 0 with the
     position at `x`.
   - Decimal edges: `"1e+"` = 1 with the position at `e`; `"."` fails; `".5"` = 0.5;
     `"5."` = 5; `"1e400"` = Infinity; `"1e-400"` = 0.
   - Whitespace: `"E\v1\f2 3 4"` parses (`gv_isspace` includes `\v` and `\f`).
   - Write the expected values from C, not from the port. Planning confirmed the
     values in decisions.md AD-1 against macOS libc. Probe any new case the same way:
     a ten-line C file under `$TMPDIR` calling `strtod` and printing the value and the
     end offset.
2. **Green.** Rewrite the number scan in `src/xdot/parse.ts` as AD-1 describes. Split
   it into helpers (sign, decimal, hex, inf/nan) so that each function stays within 30
   NLOC and CCN 10. Make `isWs` match `gv_isspace`. Every changed symbol keeps or gains
   its `@see lib/xdot/xdot.c:<fn>` tag. Add a doc comment citing C's `strtod`.
3. If an existing test pins the old scan (for example a `"1e"` or `"."` case), update it
   to the C result and journal it (stop-condition-1 exception).
4. Run `npx vitest run src/xdot src/render` and `npm run typecheck`.
5. Commit `fix(T1): scan xdot reals as strtod does`.

## Write-set

| File | Change |
|---|---|
| `src/xdot/parse.ts` | strtod-faithful `parseReal`; `isWs` = `gv_isspace` |
| `src/xdot/parse-strtod.test.ts` | new |
| `src/xdot/*.test.ts` | only to update a case that pins the old scan |

## Read-set

`src/xdot/parse.branch.test.ts:1-130`, `src/xdot/types.ts`, `src/render/xdot-public.ts:90-100`,
`src/gvc/init-xdot.ts`.

## Interface contract (consumed by T2, T4)

`parseXDot(s)` returns ops whose number fields may be `Infinity`, `-Infinity` or `NaN`
wherever the xdot text holds a token that `strtod` accepts. The op types do not change.

## Acceptance criteria

- Given `"c 7 -#000000 p 4 inf inf inf nan nan nan nan inf "`, when parsed, then 2 ops
  come back, the polygon has 4 points with C's values, and the error flag is clear.
- Given each strtod form in step 1, when parsed, then the value and the stop position
  equal C's `strtod`.
- Given a separator of `\v` or `\f`, when parsed, then it is skipped as `gv_isspace`
  skips it.
- Given any xdot string the port's own writer emits (finite decimals), when parsed, then
  the result is unchanged. The existing `src/xdot` tests stay green.

## Observability

N/A. This is a library with no runtime telemetry.

## Rollback

Reversible by reverting the squash commit.
