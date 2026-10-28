# T11: `findStopColor` / `parseSegs` diagnostics and `:red` fill (items 75, 77, 82)

**Context:** three native behaviours the port misses, all on the `parseSegs` →
`findStopColor` seam:
- 75: `fillcolor="red;0.6:blue;0.6"` on a filled node prints one line, `Warning: Total size
  > 1 in "…" color spec Warning: red;0.6 is not a known color.` (`parseSegs` rv 3 with no
  newline, then `findStopColor` returns false and the whole string is resolved as a colour).
  The port prints only the first half and never the unknown-colour half.
- 77: a filled cluster with a weighted fill prints the Total-size line (no `in cluster`
  tail) then `Warning: red;0.7 is not a known color.`; three colours print `More than 2
  colors specified for a gradient - ignoring remaining`. The port prints neither:
  `src/common/style-resolve.ts:417` `findStopColor` treats rv 3 as a gradient and omits the
  more-than-2 warning that `htmltable-emit-fill.ts:findHtmlStopColor` already has.
- 82: HTML `BGCOLOR="red;0.7:blue;0.6"` needs the same join; `"red;x:blue"` prints the
  colour warning before the Error (pre-pass order); `":red"` warns `Warning:  is not a
  known color.` and fills solid natively, while the port renders no fill
  (`resolveRenderColor('')`).

**Task:** (1) `findStopColor` (style-resolve) mirrors `emit.c:findStopColor` exactly: null
on any non-zero rv, the more-than-2 warning, `DEFAULT_COLOR` stop. (2) `parseSegs` emits
C's text with C's newlines through T1's partial-line form; the rv 3 tail (`in edge a -> b`
/ none for clusters) as C's callers do. (3) The unknown-colour half: when `findStopColor`
fails, the caller resolves the full string as a colour name (`color-resolve.ts`
`reportColorNames`/`resolveRenderColor` path) so the native warning prints. (4) HTML
`:red`: `setFill` falls through to `gvrender_set_fillcolor(job, color)` with the whole
string; the port's `htmltable-emit-fill.ts` does the same (solid fill, empty-name warning).
(5) `"red;x:blue"` ordering per the pre-pass. (6) Tests from `$BASE/native/75*`, `77*`,
`82*`.

**Write-set:** `src/common/multicolor.ts`, `src/common/style-resolve.ts` (findStopColor and
its callers in that file only), `src/render/color-resolve.ts`,
`src/common/htmltable-emit-fill.ts` (+ tests beside each).
**Read-set:** `lib/common/emit.c` `parseSegs` (~470) and `findStopColor` (~4335),
`lib/common/htmltable.c:345-368` `setFill`, `lib/common/shapes.c:findFill`; T1's hand-back
(partial-line form); T5's hand-back (token shape).

**Acceptance criteria:**
- *Given* `digraph{a[style=filled fillcolor="red;0.6:blue;0.6"]}`, *then* stderr is the one
  native line.
- *Given* a filled cluster with `"red;0.7:blue;0.6"` and with three colours, *then* stderr
  equals native for each.
- *Given* `<TABLE BGCOLOR=":red">`, *then* a solid red fill and `Warning:  is not a known
  color.`; *given* `"red;x:blue"`, *then* the colour warning precedes the Error.
- *Given* the corpus, *then* bytediff changes only on ids with these colour specs, each
  explained toward native.

**Observability:** N/A. **Rollback:** reversible.
