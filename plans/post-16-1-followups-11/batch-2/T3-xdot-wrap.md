# T3: long strings wrap as `write.c` does (127, 135)

**Context:** `lib/cgraph/write.c:_write_canonstr` (lines 160-195) breaks a quoted string with backslash-newline once
`cnt >= Max_outputline`, only after a non-id char that is not `\` and before an id char (else it defers via
`backslash_pending`). `agwrite` sets `Max_outputline` from the root's `linelength` when it is 0 or ≥ 60 (`write.c:670-677`)
and restores 128 after. The port's `agstrcanon` (`src/render/map.ts:140-260`) wraps at a fixed 128 and reads no
`linelength`; `xdot-ops.ts`'s `xdotId` escapes only `"` and never wraps, so `_draw_`-family strings print unwrapped. A
40-sided polygon's `_draw_` wraps 3 times natively, 0 in the port. AD-2.

**Task:**
1. Make the xdot-op attribute strings take the same canon path C uses for them (they are `agxset` string attributes
   written by `agwrite`), so the wrap applies. Keep `xdotId`'s documented `"`-only escaping where C's canon also keeps
   backslashes (code-scanning alert 12's dismissal explains why).
2. Read `linelength` in the `agwrite` path as `write.c:670-677` does, thread it to the wrap, and restore 128 after.
3. 135: a second `xdot` render on the same graph wraps the replayed long `_draw_` too.
4. Tests in `src/render/dot/long-string-wrap.test.ts`: `poly40` dot and xdot byte-equal to `harness/T0/poly40.*`;
   `linelength=0` (no wrap) and `linelength=80` byte-equal to their refs; a second render; and `src/xdot`'s parser
   reads the wrapped `_draw_` to the same ops as the unwrapped one.

**Write-set:** `src/render/map.ts`, `src/render/dot/xdot-ops.ts`, `src/render/dot/agwrite.ts` (506 lines: may not grow;
split along C function boundaries into a new `agwrite-*.ts`), `src/render/dot/long-string-wrap.test.ts` (new).
**Read-set:** `lib/cgraph/write.c:100-200,660-694`; `src/render/map.ts:140-260`; `src/render/dot/xdot-ops.ts` (`xdotId` docblock);
`src/xdot/` parser entry.

**Acceptance criteria:**
- *Given* `poly40`, *when* rendered to `xdot` and `dot`, *then* bytes equal native's, wraps included.
- *Given* `linelength=0` or `linelength=80`, *then* output equals native's for each.
- *Given* a second `xdot` render, *then* it equals native's second render (135).
- *Given* the smoke bytediff, *then* the only changes are wrap lines in `xdot`/`dot`, each matching native (stop 8 exception).

**Commit:** `fix(T3): wrap long strings in xdot and dot output as write.c does`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible; consumers see wrapped long lines, as native emits.
