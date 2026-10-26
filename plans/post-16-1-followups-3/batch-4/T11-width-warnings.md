# T11: width-fallback warnings (item 41)

**Context:** `lib/common/textspan_lut.c:803-831 estimate_character_width_canonical`
warns once per process (`static bool`) with
`agwarningf("Warning: no value for width of non-ASCII character %u. Falling back to width
of space character\n", character)` for the first byte ≥ 128, and with `"Warning: no value
for width of ASCII character %u. Falling back to 0\n"` for the first ASCII byte whose
width is -1. agwarningf adds its own `Warning: ` prefix, so native prints
`Warning: Warning: …`. The port's `charWidthUnits` (`src/common/textmeasure.ts:77-81`)
falls back silently. Under AD-4 "once per process" is once per render.

**Task:** add both warnings, each with its own flag registered via T1's
`registerRenderState`, printed through T5's `agerr('warning', …)` from the byte loop that
mirrors C's (`estimate_text_width_1pt` and `freetypeHintedWidth` both iterate bytes; warn
only where C's `estimate_character_width_canonical` is reached; check whether the hinted
path is C's estimate path or another C function). Keep the per-byte value C passes
(`%u` of the byte, e.g. 194 for `²`).

**Write-set:** `src/common/textmeasure.ts` (+ test).
**Read-set:** `textspan_lut.c:780-860`, `textmeasure.ts:70-180`, `textspan.c` callers.

**Acceptance criteria:**
- *Given* `label="p&sup2;q"`, *when* probed, *then* stderr has native's line once, with
  194.
- *Given* two non-ASCII labels in one graph, *then* one warning; two renders → one each.
- *Given* golden "logs nothing" tests, *then* native-matching lines are allow-listed and
  byte-identity over the corpus shows console changes only of this message.

**Observability:** N/A. **Rollback:** reversible.
