# T1 — `canvasFont()` builder

## Context

dot-engine is a faithful TS port of Graphviz (C source at `~/git/graphviz` is
the spec; read the repo `CLAUDE.md`). The SVG emitter resolves PostScript font
names via `src/common/ps-fontalias.ts`; the browser canvas measurer does not.
This task adds the shared builder only — no caller changes.

## Task

Create `src/common/css-font.ts` exporting:

```ts
/** @see plugin/core/gvrender_core_svg.c:462-500 svg_textspan (family/weight/style selection) */
export function canvasFont(
  fontname: string | null,
  fontsize: number,
  flags?: TextVariantFlags,
): string;
```

Returns a CSS `font` shorthand: `[style] [weight] [stretch] <size>px <family-list>`.

Rules (locked — see `../decisions.md`):
- Alias hit (`translatePostscriptFontname(fontname)`): family list =
  `a.family` + (`, a.svgFontFamily` when different) — ADR-1. Weight `a.weight`
  only if CSS-valid (ADR-2). Style `a.style`. Stretch `a.stretch` (ADR-3).
- Flags: `bold` adds `bold` only if the alias produced no weight; `italic`
  adds `italic` only if the alias produced no style (C HTML_BF/HTML_IF rule,
  `gvrender_core_svg.c:496-500`).
- No alias: ADR-4 split/quote/default. Default `Times,serif` when null/empty.
- Family-name quoting per ADR-4; alias family names with spaces
  (`URW Gothic L`, `Palatino Linotype`) are quoted too.
- Size: `${fontsize}px` (existing measurer uses px == pt units; keep it).

## Write-set
`src/common/css-font.ts`, `src/common/css-font.test.ts`

## Read-set
- `src/common/ps-fontalias.ts:24-160` (table, `translatePostscriptFontname`, `fontFamilyAttrs`)
- `src/render/svg-helpers.ts:300-340` (`svgTextspan`, `emitFontAttrs`)
- `src/common/textmeasure.ts:36-55` (`TextVariantFlags`)
- `~/git/graphviz/plugin/core/gvrender_core_svg.c:434-500`
- `../decisions.md`

## Acceptance criteria
- Given `Times-Roman`, 14 → `14px Times, serif` (spacing may differ; family
  list and absence of weight/style must match).
- Given `Helvetica-Narrow-BoldOblique` → contains `oblique`, `bold`,
  `condensed`, families `Helvetica`, `sans-Serif`.
- Given `AvantGarde-Demi` → no weight token, with or without `{bold:true}`.
  C's HTML_BF guard tests the *alias* weight (`demi`, non-null), so the SVG
  emits `font-weight="demi"` and no `bold`; the browser drops `demi` and
  renders normal. Measuring normal matches render. The flag check therefore
  uses the alias weight *before* the ADR-2 drop.
- Given `Courier` with `{bold:true}` → `bold` present (alias weight null).
- Given `My Font, Arial, sans-serif` → `"My Font", "Arial", sans-serif`.
- Given every alias row → family/style agree with `fontFamilyAttrs(name)`
  (NativeFonts) and weight agrees except ADR-2 drops (table-driven, 35 rows).

## Quality bar
TDD (tests first). Strict TS, no `any`. SPDX header. `@see` on the export.
≥90% coverage on the new file. Complexity hook limits: ≤30 NLOC/function,
CCN ≤10 — split helpers (`quoteFamily`, `isCssWeight`, `familyList`).

## Interface contract (output, consumed by T2 + async prefetch)
`canvasFont(fontname: string | null, fontsize: number, flags?: TextVariantFlags): string`
— pure, deterministic, always a syntactically valid CSS font shorthand.

## Observability
N/A — no new observable operations.

## Rollback
Reversible (revert commit). New file only.

## Boundaries
Never modify `ps-fontalias.ts` or `svg-helpers.ts`. Do not export from
`src/index.ts`.

## Commit
`feat(textmeasure): add canvasFont builder from ps alias table`
