# T2: json prints a non-finite number as `%.03f` prints it

## Context

See the [README](../README.md#objective) and [decisions.md](../decisions.md) AD-2. C
references: `plugin/core/gvrender_core_json.c:151-163` (`write_polyline`, `%.03f`) and
the other `%.03f` writers in `write_xdot` (rect, text `pt`/`width`, font `size`,
gradient `p0`/`p1`, stop `frac`). Port: `buildJson` (`src/render/json.ts:645-649`,
`JSON.stringify(..., null, 2)`), `opPoints` and `opToJson` (`:114-180`), and the header
comment (`:8-31`).

On the oracle platform, `%.03f` prints `inf`, `-inf` and `nan`, and a negative NaN also
prints `nan` (planning probe, decisions.md AD-2). Native refs:
`../harness/out/{1221,1332,2721}.osage.json`.

## Steps (TDD)

1. **Red.** Add a test (for example `src/render/json-nonfinite.test.ts`):
   - Render osage json for `1221`'s source (inline the 149-byte input). The text holds
     `[inf,inf],[inf,nan],[nan,nan],[nan,inf]` as bare tokens in `cluster_2`'s `p` op,
     and the op list is `c` then `p`, as in `../harness/out/1221.osage.json`. Parse it
     only after rewriting the tokens (use the T3 reader if it has landed, or a local
     regex), and assert the op shape.
   - A unit case on the serializer: a tree holding `Infinity`, `-Infinity` and `NaN` in
     arrays and as object values serializes to `inf`, `-inf` and `nan`. Finite numbers
     and strings stay byte-equal to `JSON.stringify(tree, null, 2)`, including a string
     whose text is `inf` and one holding the sentinel's printable part.
   - A finite graph's json output is byte-identical before and after (pick one existing
     json fixture test and assert equality against `JSON.stringify` of the same tree, or
     rely on the existing json tests staying green).
2. **Green.** Implement AD-2 in `buildJson`'s serialization step (or in a small helper
   module that `json.ts` imports, if Gate 4's headroom of 10 lines is short). Use a
   named constant for the sentinel and the token map; no magic strings repeated. Give
   the helper an `@see plugin/core/gvrender_core_json.c:write_polyline (%.03f)` tag.
3. Add one sentence to the json.ts header: a non-finite coordinate prints as C's
   `%.03f` token, so such a document is not valid JSON, exactly as native's is not.
4. Run `npx vitest run src/render` and `npm run typecheck`.
5. Commit `fix(T2): print non-finite json numbers as c's %.03f does`.

## Write-set

| File | Change |
|---|---|
| `src/render/json.ts` | serialization step; header sentence (≤ 10 net lines) |
| `src/render/json-nonfinite.ts` | new, only if the helper does not fit in json.ts |
| `src/render/json-nonfinite.test.ts` | new |

## Read-set

`src/render/json.test.ts` (fixture style), `src/render/json-stored-draws.test.ts`,
`test/golden/line-limit-baseline.txt`.

## Interface contract (consumed by T3, T4)

The port's json text holds the bare tokens `inf`, `-inf` and `nan`, and no other
non-finite spelling, exactly where C prints a non-finite float. Everything else is
`JSON.stringify(tree, null, 2)` output.

## Acceptance criteria

- Given osage `1221`, when rendered to json, then `cluster_2`'s `_draw_` holds `c` then
  `p` with points `[inf,inf],[inf,nan],[nan,nan],[nan,inf]` as bare tokens.
- Given a value tree with no non-finite number, when serialized, then the output is
  byte-identical to `JSON.stringify(tree, null, 2)`.
- Given a string attribute whose text is `inf` or `nan`, when serialized, then it stays
  a quoted JSON string.
- Given json0 output, when rendered, then it is unchanged (json0 has no draw ops).

## Observability

N/A. This is a library with no runtime telemetry.

## Rollback

Reversible by reverting the squash commit.
