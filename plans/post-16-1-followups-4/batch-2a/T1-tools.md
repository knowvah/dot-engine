# T1: parity tools as committed tsx (items 65, 66; AD-5, AD-10)

**Context:** T0 copied part 3's tools verbatim into `test/tools/`. Item 65: fuzz
`classify.mjs` files native's duplicate-`baseline-shift` outputs (nested `<sup>`/`<sub>`,
invalid XML) under class 35 or svg-other. Item 66: `probe.mjs` compares only text content
and ellipse `cx`, so it reported item 35's case as SAME. AD-10: native CLI stderr has a
`<stdin>: ` prefix on lexer errors that the port (agmemread semantics) never prints.

**Task:**
1. Convert each tool to TypeScript run with `npx tsx test/tools/<name>.ts` (bytediff,
   bd-job, probe, classify, fuzz drivers); keep CLI arguments and output formats.
2. Extract pure parts (SVG span/shape extraction, stderr normalization, fuzz class
   assignment, diff summarising) into importable functions with unit tests in
   `test/tools/*.test.ts` (vitest must pick them up; check `vitest.config`).
3. Item 65: a dedicated class `dup-baseline-shift` for outputs whose native SVG repeats a
   `baseline-shift` attribute.
4. Item 66: probe also compares text `x`/`y` and ellipse `rx`/`ry` (0.01 tolerance as the
   rest of probe).
5. AD-10: probe strips a leading `<stdin>: ` from native stderr lines before comparing.

**Write-set:** `test/tools/**`; `vitest.config.*` only if needed to include
`test/tools/*.test.ts` (one line).
**Read-set:** `test/tools/*` (T0 copies), `test/golden/compare-xdot.ts` (tolerance helper),
`plans/post-16-1-followups-3/decision-journal.md` (T12 rows: item 35's case).

**Interface output (all later tasks):** `npx tsx test/tools/bytediff.ts <bundleA> <bundleB>
<ids-file|--amp|--all> <out.json>`; `npx tsx test/tools/probe.ts <bundle> <engine> <case...>`.

**Acceptance criteria:**
- *Given* item 35's case on the T0 bundle, *when* probed, *then* probe reports DIFF on text
  `x`/`y`.
- *Given* a native SVG with two `baseline-shift` attributes on one element, *when*
  classified, *then* its class is `dup-baseline-shift`.
- *Given* native line `<stdin>: syntax error in line 1 near '}'` and port line
  `syntax error in line 1 near '}'`, *then* probe reports SAME.
- *Given* bytediff T0 vs T0 over the `&` set, *then* 0 diffs (parity with the .mjs tool).

**Observability:** N/A. **Rollback:** reversible.
