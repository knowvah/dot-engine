# T2 — wire `CanvasTextMeasurer` to `canvasFont`

## Context

Same repo rules as T1 (read `CLAUDE.md`). `CanvasTextMeasurer.measure`
(`src/common/textmeasure.ts:272-291`) builds `ctx.font` from the raw name.
It is constructed only in browsers (`textmeasure-factory.ts:createMeasurer`,
`document` present) or by explicit host opt-in; Node sweeps never use it.
It currently has zero tests.

Hazard: assigning an unparseable string to `ctx.font` is silently ignored —
the previous font *and size* stay active.

## Task

1. Replace the style/font construction in `measure()` with
   `canvasFont(fontname, fontsize, flags)` from T1.
2. Cache: per-instance `Map<string, string>` keyed by
   `fontname|fontsize|bold|italic` → font string (hot path: called per label
   line). Mirrors pango's last-font reuse (`gvtextlayout_pango.c:99-100`).
3. Rejection guard: after `ctx.font = f`, if the browser did not accept it
   (read-back is the browser's serialization, so compare against a value
   recorded on first acceptance, or detect "unchanged from previous
   assignment while previous differs"), fall back to
   `canvasFont(null, fontsize, flags)` so the size is always the requested one.
   Pick the simplest detection that the fake-context test can exercise;
   journal the choice.
4. Return shape unchanged: `{ w: m.width, h: fontsize }`.

## Write-set
`src/common/textmeasure.ts` (CanvasTextMeasurer only),
`src/common/textmeasure.canvas.test.ts`

## Read-set
- `src/common/textmeasure.ts:272-292`
- `src/common/css-font.ts` (T1 output)
- `src/common/textmeasure-factory.ts:60-90`
- `../decisions.md` ADR-3, ADR-4

## Interface contract (input from T1)
`canvasFont(fontname: string | null, fontsize: number, flags?: TextVariantFlags): string`

## Acceptance criteria
- Given a fake 2D context, when measuring `Times-Roman` 14, then the context
  saw `ctx.font === canvasFont('Times-Roman', 14)`.
- Given a fake context that rejects (ignores) one specific font string, when
  measuring with it after a different-size measurement, then the final
  `ctx.font` carries the requested size (fallback applied).
- Given two measurements with identical font args, then `canvasFont` work is
  done once (spy or counter on the cache).
- Given `{ bold: true }` on a non-alias name, then `bold` reaches `ctx.font`.

## Quality bar
TDD. Fake context = minimal object with a `font` accessor and `measureText`
returning `{ width }` (cast at the test boundary only). Strict TS. Complexity
limits per hook. ≥90% coverage of `CanvasTextMeasurer`.

## Observability
N/A — no new observable operations.

## Rollback
Reversible (revert commit). Browser-only behavior change.

## Boundaries
Do not touch `LutTextMeasurer`, `EstimateTextMeasurer`, the factory, or the
`TextMeasurer` interface.

## Commit
`fix(textmeasure): measure canvas text with the svg-emitted font`
(body: why — measure/render mismatch + silent ctx.font rejection.)
