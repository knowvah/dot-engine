# issue-144 mission — observations (2026-11-10)

## Observation: macOS strtod takes any characters inside `nan(...)`
- **Context**: porting C's `strtod` for the xdot number scan (`src/xdot/strtod.ts`), probing
  the oracle platform's libc with a C harness (104 inputs, value as `%a` and end offset).
- **Finding**: macOS `strtod("nan(a b)")` consumes 8 characters, `"nan(-1)"` 7, `"nan(a(b)c)"` 8
  (through the first `)`), and `"nan("` or `"nan(abc"` only 3. Every byte 1..255 except `)` is
  accepted between the parentheses. glibc documents `nan(n-char-sequence)` with alphanumerics and
  `_` only, so the two platforms stop at different offsets on `nan(a b)`. Other edges, all as
  C99: `"0x"`, `"0x."`, `"0x.p1"` and `"0xg"` are 0 stopping after the `0`; `"1e+"` is 1 stopping
  at `e`; `"infinit"` is inf stopping after `inf`; hex floats round half-even, also in the
  subnormal range (`0x1p-1075` is 0, `0x3p-1075` is `0x1p-1073`).
- **Impact**: a strtod port in this repo follows macOS (the oracle links it). A Linux oracle
  would differ only on `nan(` followed by a non-alphanumeric before `)`.
- **Confidence**: High

## Observation: `%.03f` of a non-finite double on the oracle platform
- **Context**: json draw-op numbers (`gvrender_core_json.c`, every `%.03f` site).
- **Finding**: macOS printf gives `inf`, `-inf`, `nan`, and `nan` again for a negative NaN
  (no `-nan`, no `nan.000`). Native json therefore holds bare `inf`/`nan` tokens and is not
  valid JSON on osage `1221`, `1332`, `2721`. The port now prints the same tokens.
- **Impact**: anything that feeds `render(g, 'json')` to `JSON.parse` fails on a graph with a
  non-finite draw coordinate, exactly as with native output. `test/golden/compare-json.ts`
  reads the tokens (`parseJsonText`); other tools need the same treatment.
- **Confidence**: High

## Observation: `delta > tolerance` hides NaN in the xdot and svg comparators
- **Context**: AD-5 of the brief; `compare-json.ts` got `numDelta`, the others did not.
- **Finding**: `test/golden/compare-xdot.ts:398-399,463-464` and `test/golden/compare.ts`
  (`:162,186,208,246`) compute `Math.abs(a - b)` and test `> tolerance`; a NaN delta is never
  greater, so NaN against anything passes. `compare-xdot.ts`'s `extractNumbers` also skips
  `inf`/`nan` tokens in positional strings. Filed as #201.
- **Impact**: a conformant xdot row does not prove a non-finite coordinate matches native.
- **Confidence**: High

## Observation: the oracle caches are complete for xdot, partial for json
- **Context**: choosing the targeted-survey ids by scanning cached native output for
  non-finite tokens.
- **Finding**: `~/.cache/dot-engine/oracle/xdot-oracle` holds about 929 ids for each of the 8
  engines; `json-oracle` holds the full set only for dot, osage and twopi (circo 128 files,
  fdp 116, sfdp 116, neato 4, patchwork 0). A json-cache scan alone does not cover the
  iterative engines. The xdot scan does, and it is sufficient for draw ops, because native json
  re-parses the same xdot draw strings. It finds osage `1221`, `1332`, `2721` (draw strings) and
  sfdp `2556` (`pos="nan,nan"`, no draw-string token).
- **Impact**: scan `xdot-oracle`, not `json-oracle`, when asking which ids hold a given native
  token.
- **Confidence**: High

## Observation: `getDrawOps` never returns cluster draw ops
- **Context**: the brief expected `getDrawOps` on `1221` to return the cluster frame.
- **Finding**: `collectGraphOps` (`src/render/xdot-public.ts`) reads the root's, nodes' and
  edges' draw attributes and does not visit subgraphs, so cluster `_draw_`/`_ldraw_` ops are
  absent on every engine. Filed as #203.
- **Impact**: `getDrawOps` output is the same on base and head for these ids; do not use it to
  check cluster frames.
- **Confidence**: High

## Observation: the osage json walk's resume would also render `894589`
- **Context**: T4, re-walking three ids with `json-walk.ts osage --survey`.
- **Finding**: `parity.json` has 930 conformant ids for osage after exclusions and
  `json-parity-osage.jsonl` has 929 rows; `894589` has no row, so a resume renders it too and
  the summary's `total` moves. `parity-report.ts` also rewrites `PARITY-sfdp.md` (it is stale by
  one A1-drift member, `894589`), and `json-dashboard.ts` rewrites `PARITY-JSON.md` with
  unrelated rows.
- **Impact**: a targeted row update on these tracks is a hand edit of the jsonl and the summary
  from a targeted comparison; regenerate pages and keep only the hunks for the ids at hand.
- **Confidence**: High
