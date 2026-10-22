# T5: one agerr writer (item 36, AD-5)

**Context:** `lib/cgraph/agerror.c:out` prints `Error`/`Warning` + `: ` (not for AGPREV),
formats the message, and hands every piece to `default_usererrf` (`agerror.c:65`), which
writes each character with `gv_iscntrl(c) && !gv_isspace(c)` (0x00–0x1F except
`\t\n\v\f\r`, and 0x7F) as `\%03o`. The port prints messages as they are, so a raw `\x01`
in an HTML label's error context shows as the byte, not `\001`. The port's stderr sites:
`grep -rn 'console\.\(warn\|error\)(' src | grep -v '\.test\.'` (44 sites, 28 files) plus
`consoleLine`/`StderrLines`/`agerrLine` in `src/common/htmltable-attr-warn.ts:250-290`.

**Task:**
1. `src/common/agerr.ts`: port `out` + `default_usererrf` as
   `agerr(level: 'error' | 'warning' | 'prev', msg: string): void` (plus thin
   `agerrorf`/`agwarningf` if they read better at call sites), keeping the port's channel
   rule (`console.warn` for warnings, `console.error` otherwise, as `consoleLine` does).
2. Classify every site against its C counterpart (agerr/agwarningf/agerrorf/AGPREV vs
   `fprintf(stderr)`/`fputs`). Route agerr ones through the writer; leave the rest raw.
   Journal table: site, C counterpart, routed yes/no.
3. `consoleLine` delegates to the writer, so `StderrLines` keeps its join semantics.

**Write-set:** `src/common/agerr.ts` (+ test, new) and the files the grep lists whose sites
are agerr in C, including `src/common/htmltable-attr-warn.ts`. Not `src/parser/dot.js`
(generated: edit `dot.pegjs`, then `npm run parser:regen`).
**Read-set:** `~/git/graphviz/lib/cgraph/agerror.c:60-140`, `lib/util/gv_ctype.h`, each
site's C source.

**Interface output (T10–T13):** `agerr(level, msg)` from `src/common/agerr.ts`.

**Acceptance criteria:**
- *Given* an HTML label error whose context holds `\x01` and `\x7f`, *when* probed,
  *then* stderr shows `\001` and `\177` exactly as native.
- *Given* a message with `\t` or `\n`, *then* those stay raw.
- *Given* the full suite, goldens and byte-identity over the whole applicable corpus
  (console included), *then* the only console changes are escaped control characters.

**Observability:** N/A. **Rollback:** reversible.
