# Decisions: issue #134

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-10. Nobody confirmed these; each names the rejected options and the evidence
so the maintainer can audit it.

### AD-1: both echo helpers return `key + '=' + agstrcanon(v)`

- **Decision:** in `src/render/dot/attrs.ts`, `echoAttr` and `echoGraphAttr` build their
  part with `agstrcanon` (already imported, `attrs.ts:16`), keeping their skip rules
  (empty value; `writeDictSkips`). Update both doc comments (`@see
  lib/cgraph/write.c:write_nondefault_attrs`, `_write_canonstr`).
- **Rejected:** (a) `agstrcanonText` (no html dispatch): C passes `chk=true`
  (`write.c:254`), so an html-flagged value prints `<...>`; `agstrcanon` is the port of
  exactly that. (b) Keep forced quotes and add wrapping only: native prints
  `lwidth=1.5`, `lheight=2` unquoted (planning diff); forced quoting is a second
  symptom of the same bypass, not a separate rule. (c) Fix at each caller in
  `agwrite.ts`: eight call sites rebuilding one C rule.
- **Evidence:** `write.c:502-504` (node/edge values) and `:290-292` (graph dicts) both
  call `write_canonstr(..., true)` → `_write_canonstr(..., chk=true)` → `agstrcanon`.
  Trial edit during planning made all ten harness cases byte-equal to native. The empty
  value is unchanged: `agstrcanon('')` is `""`. `Max_outputline` / `linelength` comes
  for free: `agstrcanonText` reads `maxOutputline()`, set by `withLinelength` around the
  whole write (`agwrite.ts:80`).

### AD-2: delete the dead `agcanonEscape` and `isEscapeSeq`

- **Decision:** after AD-1, `agcanonEscape` (`src/render/dot/xdot-ops.ts:397-422`) has no
  production caller (part 11 T3 already moved `drawAttr` to `agstrcanonText`), and
  `isEscapeSeq` (`:388-395`) is used only by it. Remove both and their cases in
  `src/render/dot/xdot-ops.branch.test.ts` (`describe('isEscapeSeq')`,
  `describe('agcanonEscape')`, the import and header comment). Fix the stale comment at
  `src/render/dot.ts:304` (it names `agcanonEscape` on serialize; the path is
  `drawAttr` → `agstrcanonText`).
- **Rejected:** keep them "for later": the pre-existing-violations rule removes dead code
  in a file being edited, after a reference grep; `map.ts:isEscapeAt` is the live port of
  `is_escape`.
- **Evidence:** `grep -rn "agcanonEscape\|isEscapeSeq" src` at planning: only
  `attrs.ts` (the two helpers), `xdot-ops.ts` itself, its branch test, and the
  `dot.ts:304` comment. Re-run the grep before deleting.

### AD-3: native refs live in `harness/out/`, made by `harness/regen.sh`

- **Decision:** five fixtures (`labels.gv`, `labels-ll.gv`, `echo.gv`, `echo-ll.gv`;
  `echo.gv` also under patchwork) rendered `-Tdot` and `-Txdot` → ten refs. The refs
  were generated at planning with the 16.1.0 oracle (`/tmp/ghl`; patchwork with a
  `$TMPDIR` core+dot_layout+neato_layout dir). The executor re-runs `regen.sh` after
  preflight and requires `git diff --exit-code harness/out` (stop condition 3). The new
  test `src/render/dot/echo-attr-wrap.test.ts` reads them like
  `long-string-wrap.test.ts` reads part 11's T0 refs.
- **Rejected:** hand-written expected strings: refs must come from native. Reusing part
  11's poly40 refs: they exercise `_draw_`, not the echo helpers.

### AD-4: the issue's label premise is already met; pin it, fix the echo keys

- **Decision:** the issue's done-condition ("a native ref with a long cluster label and a
  long graph label, default and `linelength`, is byte-equal") already holds on the base,
  because labels go through `graphInputParts` → `agstrcanon`. The labels refs are kept
  as regression pins (they pass before and after). The defect the issue names
  (`echoAttr`/`echoGraphAttr` bypass `_write_canonstr`) is real and is what T1 fixes,
  as the maintainer's comment on #134 widens it to node and edge echoes.
- **Rejected:** park as "done-condition unclear": the issue names the mechanism and the
  files, and the comment names the affected outputs; the done-condition's wording
  ("labels") was a guess at which values reach the helpers. Park as already-fixed: the
  echo keys provably differ from native on the base.

## Baseline

On `a0eb4de3`, 2026-11-10 during planning: `npm run typecheck` exit 0; `npm test`
exit 0, 559 files, 13222 tests. No lint script; typecheck is the static gate.

## Rollback

Reversible: revert the one commit. Output changes only where an echoed value is long
(> `Max_outputline` bytes) or is a bare numeral/identifier (now unquoted, as native).
