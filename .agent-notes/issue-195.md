# issue-195 mission — observations (2026-11-23)

## Observation: a record's `ND_label` is unmeasured raw text; only its fields are measured
- **Context**: sizing `shape=record`/`Mrecord` nodes whose label is html-like (#195, #218).
- **Finding**: `make_label`'s `is_record` branch (`lib/common/labels.c:139-144`) copies the text,
  sets `html` for a non-empty html value (`:119`) and measures nothing. `parse_reclbl` builds each
  field with `make_label(n, text, lbl->html, false, ...)` (`lib/common/shapes.c:3444`), so every
  field of an html record is a full html label. The port's twin is `makeRecordLabel`
  (`src/common/make-label.ts`); `n.info.label` of a record has zero `dimen` and no spans.
- **Impact**: any warning from measuring a record label whole is a port artifact, not a font
  problem. Read sizes from the fields (`shape_info`), never from a record's `n.info.label`.
- **Confidence**: High (14 probes x 3 engines x 5 formats equal the carried oracle)

## Observation: `ASCII character 1` in a width warning is a leaked html marker
- **Context**: the repro printed `Warning: no value for width of ASCII character 1`.
- **Finding**: the port marks an html attribute value with a leading `\u0001`
  (`HTML_STRING_MARK`, `src/common/html-string.ts`). A code path that hands a marked value to the
  text estimator prints that warning. Native has no such character in the string.
- **Impact**: on that message, look for a caller that skipped `isHtmlValue`/`htmlValueContent`.
- **Confidence**: High

## Observation: `poly-gencode.ts:renderLabel` draws text labels only
- **Context**: `gen_fields` calls `emit_label` (`shapes.c:3837-3838`), which draws html too.
- **Finding**: `renderLabel` returns early for `u.kind !== 'txt'`. The port of `emit_label` is
  `renderOneLabel` (`src/gvc/device-labels.ts`); it reads `lp.pos`, so set `pos` first, as C does.
  Pass `requireSet = false` at call sites where C draws on existence alone.
- **Impact**: a label that may be html goes through `renderOneLabel`.
- **Confidence**: High

## Observation: html record fields reach the anchor gaps #250 and #253
- **Context**: extra probes with `URL`, `tooltip` and table `HREF`s on an html record.
- **Finding**: the node's map data is resolved and its anchor opened only in the poly codefn
  (`src/common/poly-gencode.ts:309`); `recordGencode` has no anchor call (#250). A cell anchor in a
  record field therefore prints the label text as its title where native prints the node's
  `tooltip` (#253 shows the same on a box node in svg), and the `node1` area is missing.
  Filed as #291 (needs-ruling); probes `oos-anchor-url`, `oos-anchor-tooltip`.
- **Impact**: fixing #250 must resolve the obj's url, target and tooltip before `genFields` runs.
- **Confidence**: High (cmapx and svg against the carried oracle, base and head)

## Observation: tooling limits met at planning
- **Context**: planning's survey and edits.
- **Finding**: `test/tools/bytediff.ts` throws on a manifest id whose status is not `applicable`
  (filter id lists first). The 500-line write hook compares against the file's line count at
  `HEAD`, so an already-oversized file can be edited only without growing (`record.ts` 521,
  `record.branch.test.ts` 514).
- **Impact**: put new helpers beside their C sibling in a smaller file; keep test edits same-length.
- **Confidence**: Medium (reported by planning; this session edited both files without growth)
