# Decisions: issue #144

## AD-1: xdot `parseReal` scans what C's `strtod` accepts

- **Context:** every number in C's xdot parser goes through `strtod`: `parseReal`
  (`lib/xdot/xdot.c:24-33`), `parseRect` (`:56-74`) and `parsePolyline` (`:91-104`). Op
  separators are skipped with `gv_isspace` (`xdot.c:171`, `lib/util/gv_ctype.h:55`:
  space, `\t`, `\n`, `\v`, `\f`, `\r`). The port's `XdotParser.parseReal`
  (`src/xdot/parse.ts:47-57`) accepts only decimal digits, and `isWs` (`:24-26`) leaves
  out `\v` and `\f`.
- **Decision:** `parseReal` scans the longest prefix that the platform `strtod` accepts,
  after `gv_isspace` whitespace and an optional sign:
  - decimal: at least one digit in the mantissa (`"."` alone fails). An exponent is
    consumed only when digits follow (`"1e+"` parses `1` and stops at `e`);
  - hex: `0x`/`0X`, hex digits, an optional `.` and hex digits, and an optional
    `p[sign]digits`. `"0x"` with no hex digit parses `0` and stops at `x`. The value is
    exact and rounded half-even, including in the subnormal range and on overflow to inf;
  - `inf` or `infinity` and `nan` or `nan(<alnum/_>*)`, all case-insensitive.

  The decimal value stays `parseFloat` of the scanned text, which rounds correctly as
  `strtod` does, and overflow gives ±inf. `isWs` matches `gv_isspace`.
  **Planning probe** (macOS libc, which the oracle links): `strtod(" infinity")` = inf;
  `"nan(12)x"` = nan, stopping at `x`; `"0x1.8p1"` = 3; `"1e+"` = 1, stopping at `e`;
  `"."` fails; `"\v\f2"` = 2; `"0x"` = 0, stopping at `x`; `"infx"` = inf, stopping at
  `x`.
- **Consequences:** `parseXDot` now keeps ops with non-finite or hex coordinates in all
  three callers: json (`src/render/json.ts:185`), `getDrawOps`
  (`src/render/xdot-public.ts:96`) and `init-xdot.ts:24` (`_background`). The public
  `getDrawOps` returns the op with `Infinity`/`NaN` numbers where it dropped it before.
  That is additive. No corpus input carries an xdot attribute (planning grep of every
  manifest input), so `init-xdot` changes no corpus output.
- **Rejected:** (B) accept only the literals `inf` and `nan`. That suppresses this
  symptom but leaves `infinity`, `nan(...)`, hex, `"1e"` and `"."` diverging in the same
  function. (C) write a general `src/util/strtod.ts` and move `gvStrtod` onto it. That is
  a wider change: `gvStrtod`'s two callers want `parseFloat` semantics and are not
  reached by this defect.

## AD-2: json prints a non-finite number as `%.03f` prints it

- **Context:** C prints every float in a json draw op with `%.03f`
  (`gvrender_core_json.c:159,170,181-191` and the rect, text and font lines). On the
  oracle platform that gives `inf`, `-inf` and `nan` (the planning probe printed
  `[inf,-inf,nan,nan]` for `INFINITY, -INFINITY, NAN, -NAN`). The port serializes a value
  tree with `JSON.stringify(..., null, 2)` (`json.ts:648`), which writes `null` for a
  non-finite number.
- **Decision:** the serializer writes a non-finite number as the bare token C prints:
  `Infinity` → `inf`, `-Infinity` → `-inf`, `NaN` → `nan`. One way to do it: a
  `JSON.stringify` replacer maps non-finite numbers to a sentinel string that no
  attribute can hold (C strings cannot contain NUL, so a NUL-delimited sentinel is
  safe), and one regex pass afterwards swaps each quoted sentinel for its bare token. The
  approach is push-forward, but the output must be exactly this. Note in the json.ts
  header that such a document is not valid JSON, exactly as native's is not.
- **Consequences:** `render(g, 'json')` returns text that `JSON.parse` rejects for these
  degenerate inputs, as native does. No published contract promises parseable json:
  the json.ts header promises "semantically-equivalent" output, and the README and
  `docs/` say nothing about it. Nothing in `src/` parses the port's json. Finite output
  is unchanged byte for byte.
- **Rejected:** (B) leave `JSON.stringify`'s `null`. The output stays valid JSON, but
  it is a new divergence (`null` where native prints `inf`), and a new divergence is the
  maintainer's call. (C) quoted strings `"inf"`. That is also a new divergence, and it
  changes the field's type. (D) a hand-written serializer for the whole tree. It touches
  every json output byte to fix one value class.

## AD-3: `compareJson` reads C's non-finite tokens and compares them exactly

- **Context:** `compareJson` calls `JSON.parse` on both sides (`test/golden/compare-json.ts:608-640`)
  and reports `[parse]/oracle` for these ids today. After AD-2 the port's side fails
  first, so the maintainer's json sweep would report `[parse]/port` and the three
  acceptances (keyed `[parse]/oracle`) would stop matching. Separately,
  `delta > tolerance` (`:283`, `:375`) is false when the delta is NaN, so NaN against
  any value passes. `extractNumbers` (`:138-147`) does not see `inf`/`nan` inside a
  positional string such as `bb`.
- **Decision:** before `JSON.parse`, both texts go through one tokenizer pass that
  rewrites a bare `inf`, `-inf` or `nan` outside string literals into a parseable form,
  which the comparator reads back as `Infinity`, `-Infinity` or `NaN`. Numeric
  comparison goes through one helper: two non-finite values are equal when they are the
  same kind (NaN with NaN, or infinities of the same sign), one non-finite value against
  a finite one is a diff, and two finite values keep the tolerance rule.
  `extractNumbers` also reads `inf`/`nan` tokens, at word boundaries.
- **Consequences:** the three ids become comparable. A NaN that used to slip past the
  json comparator is now reported. That could show up a hidden diff on some other id,
  but planning found no non-finite token in any cached native json or xdot for any of
  the 8 engines except these three ids (scan of `~/.cache/dot-engine/oracle/{json,xdot}-oracle`).
- **Rejected:** (B) keep the `[parse]` classes and re-key the acceptances to
  `[parse]/port`. Nothing is compared, and the port's lost op stays invisible. (C) strip
  the non-finite ops from both sides. That would hide exactly this defect class.

## AD-4: retire the three acceptances with a targeted re-walk

- **Decision:** follow the precedent of `383a4f0e` (record passes, retire entries).
  Delete the three ids' rows from `test/corpus/json-parity-osage.jsonl`. Re-run
  `npx tsx test/corpus/json-walk.ts osage --survey`, which resumes and renders only the
  missing ids, with the osage plugin dir as `GVBINDIR`, and check that it rewrites the
  summary JSON. Then remove the three `[parse]/oracle` rows from
  `test/corpus/accepted-divergences-json.json` and regenerate the PARITY pages
  (`npx tsx test/corpus/parity-report.ts`). Check how the walk reads its plugin dir
  before running it. If the resume would re-render anything beyond the three ids, stop
  and do it by hand from a targeted comparison instead.
- **Consequences:** no `docs/known-divergences.md` text and no `docs-site` page names
  these ids (planning grep), so there is no locale churn. If the regenerated PARITY pages
  change counts that `test/docs` pins, update those pins and journal it.

## AD-5: scope

- **Decision:** the comparator NaN blind spot in `compare-xdot.ts` (`:399`, `:464`) and
  `compare.ts` becomes one `follow-up` issue. It is not fixed here.
  After T1, compare-xdot sees the same non-finite values on both sides of the three ids,
  and `NaN > tol` is false, so their xdot verdict stays a pass. Leave `gvStrtod` as it is.

## Auto-confirmed (unattended)

AD-1..AD-5 were taken on the planner's recommendation, with nobody present. Evidence:
`lib/xdot/xdot.c:24-33,56-110,171,336-384`; `gvrender_core_json.c:151-163`; the
port's `src/xdot/parse.ts:24-57` and `src/render/json.ts:183-188,648`; native refs in
`harness/out/`; the planning `compareJson` run with native's tokens nulled (one opCount
diff per affected cluster, nothing else); the libc probe in AD-1 and AD-2; the cache
scan in AD-3. The rejected options and their reasons are listed under each decision.
Of these, AD-2 most needs an audit: the port's json for these inputs becomes invalid
JSON, as native's is. The maintainer's earlier faithfulness calls point that way: the
A4 policy note in `docs/known-divergences.md`, part 11 T7b making the `bb` text equal
native's `inf,inf,nan,nan`, and this issue's own title.

## Baseline

On `d6d0a91b` at planning: `npm run typecheck` exit 0; `npm test` 566 files / 13411
tests passed. The project has no separate lint script, so typecheck stands in for lint.

## Rollback

Reversible: revert the squash commit, and the three acceptance rows come back with it.
There is no data migration. The output change applies only to non-finite coordinates.
