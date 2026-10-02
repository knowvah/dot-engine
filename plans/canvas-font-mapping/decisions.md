# Architecture decisions (pre-made, locked)

Approved 2026-10-01.

## ADR-1: Measure with the NATIVEFONTS emitted family list

- **Context:** `svgTextspan` emits, for an alias, `family[,svgFontFamily]`
  chosen by `GD_fontnames`; the default (NATIVEFONTS) gives `Times,serif`.
  `TextMeasurer.measure` has no access to the graph's `fontnames` mode.
- **Decision:** Build the canvas font from the NATIVEFONTS selection
  (`a.family`, `a.weight`, `a.style`, `a.stretch`, plus `a.svgFontFamily`
  appended when different) — the same rule as `fontFamilyAttrs` default.
  `TextMeasurer` interface unchanged.
- **Consequences:** Graphs with `fontnames=svg|ps` measure against the native
  list; deferred until a mode-aware measurer is requested.

## ADR-2: Drop CSS-invalid alias weights

- **Context:** Alias weights include `book`, `demi`, `roman`, `light`,
  `medium`. In NATIVEFONTS mode the SVG emits them verbatim; browsers drop an
  invalid `font-weight` and render `normal`.
- **Decision:** Keep a weight only if CSS-valid (`normal`, `bold`, `bolder`,
  `lighter`, 1–1000). Otherwise omit. No mapping (`demi`→`600` etc. is
  forbidden — it would measure a face the browser does not render).
- **Consequences:** Measurement matches render. HTML/variant `bold` flag still
  applies when the alias set no weight (mirrors `svg_textspan` HTML_BF rule,
  `gvrender_core_svg.c:496-500`).

## ADR-3: Stretch goes in the `ctx.font` shorthand

- **Context:** `Helvetica-Narrow*` carry `stretch=condensed`. Shorthand
  acceptance of stretch keywords in canvas is MEDIUM confidence; `ctx.fontStretch`
  is not universally available.
- **Decision:** Include the stretch keyword in the shorthand. T3 verifies in
  Chromium by reading `ctx.font` back. If rejected, the T2 rejection guard
  covers correctness; journal the finding.
- **Consequences:** No reliance on `ctx.fontStretch`.

## ADR-4: Non-alias names — split, quote, default

- **Decision:** Split on `,`, trim each entry, strip existing surrounding
  quotes, leave CSS generic families unquoted (`serif`, `sans-serif`,
  `monospace`, `cursive`, `fantasy`, `system-ui`, case-insensitive), quote all
  others with `"` (escape `"` and `\`). Null/empty → the `svgTextspan`
  default `Times,serif`. Alias lookup is only on the whole name (C
  `translate_postscript_fontname` matches the full string).
- **Consequences:** Every produced string is syntactically valid CSS; the
  silent-ignore hazard is limited to browser-side refusals (ADR-3 guard).

## ADR-5: Internal function

- **Decision:** `canvasFont` lives in `src/common/css-font.ts`, NOT exported
  from `src/index.ts`. The async prefetch imports it internally.
- **Consequences:** No public API change.

## ADR-6: Oracle

- **Decision:** C has no canvas measurer. Correctness =
  (a) alias resolution via the existing port of `translate_postscript_fontname`;
  (b) for all 35 alias rows, family/weight/style in `canvasFont` agree with
  `fontFamilyAttrs(name, NativeFonts)` (modulo ADR-2 drops);
  (c) one real Chromium run: width(`Times-Roman`) == width(`Times, serif`).
- **Precedent:** pango measures via the alias too
  (`plugin/pango/gvtextlayout_pango.c:112`).
