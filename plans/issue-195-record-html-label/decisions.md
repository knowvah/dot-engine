# Decisions: issue #195

This was an unattended planning run, so every decision was auto-confirmed.
The evidence for each is in [harness/](harness/). Base `6da5d4e1`.

## Mechanism (planning's diagnosis)

- **Mechanism.** For a record node, C's `make_label` takes the `is_record`
  branch (`lib/common/labels.c:139-144`). That branch keeps the raw label text,
  sets `html` when the value is html-like and non-empty (`:119`), and measures
  nothing. `record_init` (`lib/common/shapes.c:3663-3707`) parses that text
  with `parse_reclbl`. When `lbl->html` is set, `parse_reclbl` reads `<` and
  `>` as text (`:3399`, `:3406`) and builds each field label with
  `make_label(n, text, lbl->html, false, ...)` (`:3444`). So each field is a
  full HTML label, and its HTML layout sizes the field. The port builds the
  record's `ND_label` with the plain-text `makeLabel`. That label has
  `html: false`, is measured whole (html marker `\u0001` included), and its
  field labels are built with `html` hard-coded `false`.
- **Origin.** `src/common/record.ts:418-422` (`recordMakeLabel`: `makeLabel`
  on the raw, marked value) and `src/common/record.ts:148` (`recFlushText`:
  `makeAnyLabel(t.join(''), false, ...)`).
- **Causal chain.**
  1. `makePlainLabel` measures the whole raw value. The marker is ASCII 1, so
     the estimator prints `Warning: no value for width of ASCII character 1`.
     Native never measures the record label whole.
  2. With `html` false, `parse_reclbl` reads `<TABLE BORDER="0">` as a port
     name. The next `<` (in `<TR>`) arrives while `HASPORT` is set, which is
     an error (`recOpenPort`). So `recParseOrFallback` re-parses as `\N`, and
     the node is sized from its name: the default 0.75 x 0.51389, not
     native's 1.1292 x 0.925.
  3. Once 1 and 2 are fixed, two more C steps show up in output.
     `gen_fields` (`shapes.c:3831-3840`) sets `f->lp->pos` and calls
     `emit_label`, which draws an html field through `emit_html_label`. The
     port's `genFields` calls the text-only `renderLabel` (`poly-gencode.ts:240`
     returns early for `u.kind !== 'txt'`), so no `_ldraw_` is written.
     `write_plain` (`lib/common/output.c:153-158`) tests `ND_label(n)->html`
     and prints `<...>`. The port's `plainNodeLabel` (`src/render/map.ts:287`)
     tests `u.kind === 'html'`, which a record's label never is, so it
     prints the label quoted.
- **The same branch is #218.** A record label holding a raw control character
  warns about its width in the port because of step 1 alone. Probes `ctl-218`
  and `b545-218` (the issue's own inputs) equal native on the prototype.
- **Ruled out.**
  - The HTML layout itself. With field labels built as html, every in-scope
    xdot and svg body equals native byte for byte (`text-fields`, `font`,
    `table-port`, `xlabel`, `lr`), so html sizing and emitting need no change.
  - The engines. The defect is in `common_init_node`/`record_init`, before
    layout. `dot`, `neato` and `osage` move together on every probe (matrix).
  - Rankdir flip. `lr` (rankdir=LR, html fields in a flipped record) equals
    native on the prototype with no change to the flip code.
  - Ports on html records. `table-port`: the table's `PORT` attributes are
    not record ports (C `record_port` reads only field ids, and `<` is text),
    and the port agrees with native with no port-code change.
  - Edge labels and xlabels on an html record (`xlabel`). These are built by
    `make_label` without `is_record` and were already right.
  - `bad label format` (`oos-bad-format`). The port never prints it, for any
    record: #269 owns that line. The same probe's fallback `\N` drawn inside an
    html field is #287.

## AD-1: port the `is_record` branch and pass `lbl->html` to the fields

**Context.** Other options: (a) keep `makeLabel` and strip the marker before
measuring. That fixes only the warning, and the sizes and stderr of the
other probes still differ. (b) Special-case html in `recordInit`. C has no
such branch, and `parse_reclbl` already ports `lbl->html` everywhere except
`:3444`.

**Decision.** As [harness/prototype.diff](harness/prototype.diff) does:

- `src/common/make-label.ts`: new `makeRecordLabel(str, font)`, the
  `is_record` branch. `text` is the value without the marker. `html` is
  `isHtmlValue(str) && text !== ''`. `dimen`, `space` and `pos` are zero,
  `u` is `{ kind: 'txt', span: [], nspans: 0 }`, `valign` is `'c'`, and
  `set` is false. Nothing is measured. It lives in `make-label.ts` beside
  `makeAnyLabel`, because both port `make_label`. That also keeps `record.ts`
  under its base line count (the 500-line write hook blocks any growth past
  500, and `record.ts` is already 521).
- `src/common/record.ts`:
  - `recordMakeLabel` calls `makeRecordLabel(labelText, readFontAttrs(n, g))`.
    The `measurer` parameter stays, renamed `_measurer`, because three callers
    pass it.
  - `recFlushText` passes `p.lbl.html` (shapes.c:3444).
  - `genFields` sets `f.lp.pos` and calls `renderOneLabel(f.lp, renderer, job,
    false)` from `../gvc/device.js`, the port of `emit_label` (shapes.c:3837-3838).
  - Imports: `makeRecordLabel` replaces `makeLabel`, and `renderLabel` leaves
    the `poly-gencode.js` import.
- `src/render/map.ts:287`: `plainNodeLabel` tests `lbl.html`, as
  `write_plain` tests `ND_label(n)->html`.

The `?? n.name` default in `recordMakeLabel` stays: #289 owns it.

**Consequences.** In-scope probe rows equal to native (stdout and stderr) go
from 0 to 210 of 210. One known step away from native, on an out-of-scope
probe only: `oos-bad-format` `-Tdot` (3 rows, one per engine). For a bad
html record label, C re-parses `\N` with `lbl->html` still set
(`shapes.c:3684`), so the fallback field is an html label whose `\N` the
html layout substitutes (`htmltable.c:959`). The base matched native only by
accident: it built the field as text, where `\N` is substituted. The head
builds it as html, as C does, and the port's html text does not substitute
(#287), so the field is sized from `\N` (`rects` width 54, native 53.214).
Fixing #287 closes it. No corpus row reaches it (journal rows 2-3). `record.ts` goes 521 → 520 lines, `make-label.ts`
240 → 257, `map.ts` unchanged. `npm test` fails once with no test edited
(AD-2 item 3).

## AD-2: tests

**Decision.**

1. New `src/common/record-html-label.test.ts`. It reads the carried oracle's
   outputs from [harness/native/](harness/native/) (written by
   [harness/recapture.sh](harness/recapture.sh)), following #194's
   `builder-local-names.test.ts`. For every in-scope probe (`probes/*.gv` not
   starting `oos-`, 14 of them) it checks four outputs against native:
   `-Kdot -Txdot`, `-Kosage -Txdot` and `-Kdot -Tplain` stdout, byte for
   byte, and the stderr of a `-Kdot -Tdot` render. It also pins native's repro
   numbers (`bb="0,0,81.304,66.6"`, `height=0.925`, `width=1.1292`).
2. In the same file, unit checks with no fixture. `makeRecordLabel` keeps an
   html value's markup with `html` true. It drops html intent for an empty
   html value. It measures nothing: `dimen` is zero and `u` holds no spans.
   A field parsed from an html record label is an html label
   (`lp.html`, `u.kind === 'html'`).
3. `src/common/record.branch.test.ts:257-261` asserts that the field of
   `<a>` under `lbl.html` is a text label with text `<a>`. That is the old
   departure: C builds the field with `lbl->html`, and native reports
   `Unknown HTML element <a>` (probe `unknown-elem`). Change the input to
   `<B>a</B>` and the title to say "html field text". Keep the same line
   count (the file is 514 lines, so the hook blocks growth). The `id` null
   assertion stays.

The prototype file is in [harness/prototype.diff](harness/prototype.diff)
(as a new-file diff). It passes on the prototype: 4 record test files, 139
tests.

**Consequences.** On the base the new file fails to import
`makeRecordLabel`. Step 3 of T1 therefore runs the test against the base with
an export-only stub (T1 step 3 says how) to show the integration rows fail:
every in-scope probe fails at least one of its four checks there (matrix:
base 0/210).

## AD-3: out of scope

- #269: `bad label format` is never printed (any record).
- #287 (filed at planning): escapes such as `\N` in html text are not
  substituted (`htmltable.c:959`). Probe `oos-html-subst`.
- #288 (filed at planning): `emit_label` leaves the label emit state set when
  a text label has no spans, so after a fatal html field the separators land
  in `_ldraw_` natively and in `_draw_` in the port. Probe `oos-bad-field`:
  its dot, svg and plain rows equal native on the prototype, but its xdot and
  json rows do not.
- #289 (filed at planning): a record node with no `label` is parsed from its
  name, not from `\N`. Probe `oos-name-default`.
- #218 is fixed by the same change (mechanism step 1). The commit footer
  references it, and the session end comments on it. It is not a separate
  task.

## Baseline (Phase 8)

On `6da5d4e1`: see [decision-journal.md](decision-journal.md) row 0.

## Rollback

Reversible: revert the one squashed commit. No data, API or schema change.
For a record node, a library caller reading `n.info.label` after layout now
sees C's `textlabel_t`: raw text, `html` set for html values, zero `dimen` and
no spans. The fields carry the measured labels. Irreversible changes: none.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
|---|---|---|---|
| AD-1 fix site | port `make_label`'s `is_record` branch; pass `lbl->html` to fields; `genFields` via the `emit_label` port; plain tests `lbl.html` | strip the marker before measuring; html branch in `recordInit` | `labels.c:119,139-144`, `shapes.c:3444,3837`, `output.c:153`; probes 210/210 (base 0) |
| AD-1 helper home | `makeRecordLabel` in `make-label.ts` | inline in `record.ts` | the 500-line hook (`record.ts` 531 inline, base 521) |
| AD-1 field emit | `renderOneLabel` (port of `emit_label`) | new `renderAnyLabel` in `poly-gencode.ts` | same matrix; `poly-gencode.ts` is 551 lines, so the hook blocks the 13 more lines |
| AD-2 tests | new file on harness fixtures, plus a same-length edit of one wrong assertion | rows in `record.branch.test.ts` | 14 probes × 4 outputs; #194's pattern; that file is 514 lines |
| AD-3 scope | #218 rides along; #269, #287, #288, #289 out | fix all here | #218 is the same line; the others are separate code paths |
