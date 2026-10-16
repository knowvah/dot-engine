# T1: `chore(T1)`: default `GVBINDIR` to the 16.1 oracle plugin dir

**Context:** `test/corpus/bench.mjs:40`, `capture-native.mjs:24` and `survey.ts:41`
default `GVBINDIR` to `/tmp/gvplugins`. That directory has been deleted, and its plugin
set added about 55 ms to every native render, which inflated the August `PERF.md`
baseline. The oracle per CLAUDE.md and ADR-0001 is `/tmp/ghl`.

**Task:** change the three defaults to `/tmp/ghl`. Add
`test/corpus/gvbindir-defaults.test.ts`, a fitness test that reads the three files as
text and asserts each defaults to `/tmp/ghl` and that none mentions `/tmp/gvplugins`.
Write the test first.

**Write-set:** the 3 scripts and the new test. **Read-set:** the lines above;
`package.json` `survey` script (already `${GVBINDIR:-/tmp/ghl}`).

**Acceptance criteria:**
- *Given* the corpus scripts, *when* the fitness test runs, *then* each script's default
  is exactly `'/tmp/ghl'`.
- *Given* any `test/corpus/*.{ts,mjs}`, *when* the fitness test scans it, *then* no
  `'/tmp/gvplugins'` default remains.

**Observability:** N/A. **Rollback:** reversible.
