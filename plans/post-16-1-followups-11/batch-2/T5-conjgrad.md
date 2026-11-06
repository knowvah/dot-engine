# T5: conjgrad's error on one line (131)

**Context:** `src/layout/neato/conjgrad.ts:209,326` call `agerrorf('conjugate_gradient: unexpected length 0 vector\n')`.
The port's `agerr` writers finish the line themselves and strip C's trailing `\n` at every call site
(`src/common/agerr.ts` header), so these print a blank second line on the console and an extra `\n` through `agseterrf`.
C has three such sites (`lib/neatogen/conjgrad.c:65,141,217`); check whether the port's two cover all three.

**Task:** drop the trailing `\n` at both sites; if C's third site has a port counterpart elsewhere, fix it too only if it
is in the write-set, else report it. Test in `src/layout/neato/conjgrad.test.ts` (existing or new): a zero-length vector
prints exactly one `console.error` call, `Error: conjugate_gradient: unexpected length 0 vector`, and an `agseterrf` sink
receives `['Error', ': ', 'conjugate_gradient: unexpected length 0 vector\n']`.

**Write-set:** `src/layout/neato/conjgrad.ts`, `src/layout/neato/conjgrad.test.ts`.
**Read-set:** `lib/neatogen/conjgrad.c`, `src/common/agerr.ts`.

**Acceptance criteria:**
- *Given* a zero-length vector, *when* `conjugate_gradient` runs, *then* one line is printed, matching C's text without a blank line.
- *Given* an `agseterrf` sink, *then* it receives C's three pieces with one trailing `\n`.

**Commit:** `fix(T5): print conjugate_gradient's error on one line`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
