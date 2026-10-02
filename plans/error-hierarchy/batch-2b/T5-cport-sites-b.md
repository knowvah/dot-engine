# T5: C-port throw sites, group B (14 sites)

## Context

Same as T4 (read `../batch-2a/T4-cport-sites-a.md` § Context). Apply
[../cport-classification.md](../cport-classification.md), including the
`UNSUPPORTED_FEATURE` row (ADR-4a).

## Task

| File | Sites (line, message) | Expected class (verify against C) |
|---|---|---|
| `src/label/index.ts` | 263 rTreeInsert rect low > high | C `assert`? → InternalError |
| `src/label/rectangle.ts` | 84 area too large for rtree | C `agerrorf` + `graphviz_exit` (`lib/label/rectangle.c:73`) → RenderError `RENDER_ERROR` |
| `src/label/node.ts` | 264 splitNode not yet registered | port scaffolding → InternalError |
| `src/layout/dot/pack-components.ts` | 259 mapClust no original | verify |
| `src/layout/fdp/ports.ts` | 81 getEdgeList edges vs deg · 154 expandCluster ports vs wdeg | likely C `assert` → InternalError |
| `src/layout/fdp/xlayout.ts` | 336 removeOverlapAs mode not ported | UNSUPPORTED_FEATURE |
| `src/layout/sfdp/init.ts` | 134 smoothing not ported · 150 rotation not ported | UNSUPPORTED_FEATURE |
| `src/layout/twopi/circle.ts` | 26 missing rdata | port invariant → InternalError |
| `src/common/poly-shapes.ts` | 76 special shape not yet ported | UNSUPPORTED_FEATURE |
| `src/util/xml.ts` | 158 malformed UTF-8 · 166 invalid leading byte | verify against `lib/common/xml.c`; input comes from JS strings, so likely an invariant → InternalError |
| `src/gvc/job.ts` | 368 popObj stack empty | C `pop_obj_state` assert? verify |

"Expected" is a starting hypothesis only. Stop condition 5 applies if C continues
where the port throws.

## Write-set

The eleven source files above, plus `src/errors.cport-b.test.ts` (new). Not
`../reclassification.md` (return rows).

## Read-set

- `../cport-classification.md`
- `src/errors.ts` (T1 output)
- each site ±15 lines with its `@see`
- the C counterparts under `~/git/graphviz/lib/`

## Interface contract (input from T1)

`InternalError(message, options?)`, `RenderError(message, code?, options?)`.

## Acceptance criteria

- All 14 sites throw `InternalError` or `RenderError` (`RENDER_ERROR` /
  `UNSUPPORTED_FEATURE`) with the original message, or are reported as stop
  condition 5 with no change.
- Diff touches only throw expressions, imports and `@see` comments.
- These are triggerable from DOT and are tested end to end through `renderSvg`:
  - `sfdp` with `rotation=45`;
  - `fdp` with an unported `overlap` mode;
  - a special shape that isn't ported yet.
  Each yields `code === 'UNSUPPORTED_FEATURE'`. Until T8 lands, `renderSvg`
  re-throws GvError-like values unchanged, so the code is already visible.
- 14-row table returned, each row with a C reference or "no C counterpart".

## Quality bar

Strict TS; both type-checks; complexity limits; faithfulness first.

## Observability

N/A — no new observable operations.

## Rollback

Reversible (revert commit). Class-only change.

## Boundaries

Never change a condition, a message, or control flow. No new exports for tests.

## Commit

`refactor(errors): throw DotEngineError subclasses at C-port sites (B)`
