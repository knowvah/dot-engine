# T1: `chore(T1)`: preflight the oracle and keep its caches out of /tmp (item 22)

**Context:**
- 2026-10-17: an overnight `/tmp` clean deleted `/tmp/ghl/config8` and emptied the survey
  cache. The survey's only check is `dot -V` (`test/corpus/survey.ts:570`), so 946 ids
  became `oracle-error` and `GATE PASS` was vacuous. The same clean removed `config8` from
  the walk plugin dir (`…/dfc80e32-…/scratchpad/ghl16-all`).
- Without their caches, native fdp/sfdp re-render and drift run to run, so walk deltas on
  those engines then reflect the oracle, not the port.
- Caches today: `survey.ts:54` (`ORACLE_CACHE` ?? `$TMPDIR/dot-corpus-oracle/<sig>`),
  `engine-walk.ts:256` (`ENGINE_ORACLE_CACHE` ?? `$TMPDIR/dot-corpus-xdot-oracle/<engine>/<sig>`),
  and the json / plain / map / agwrite walks (`$TMPDIR/dot-corpus-{json,plain,map,agwrite}-oracle*`).
  Signatures hash `(binary, GVBINDIR, binary mtime)`.

**Task (tests first):**
1. New `test/corpus/oracle-env.ts`:
   - `oracleCacheRoot(kind: string, sig: string): string` →
     `$XDG_CACHE_HOME/dot-engine/oracle/<kind>/<sig>`, `$XDG_CACHE_HOME` defaulting to
     `~/.cache`.
   - `oraclePreflight(dotBin: string, gvbindir: string, engine: string): void` renders
     `digraph{a->b}` with `-K<engine> -Tsvg`; throws with a message that contains
     `GVBINDIR=<gvbindir> <dotBin> -c` when the exit is non-zero, stderr says
     `not recognized` / `no layout engine support`, or stdout lacks `<svg`. It also checks
     `-V` reports 16.1.0.
2. Route every oracle cache through `oracleCacheRoot`, keeping each script's existing env
   override (`ORACLE_CACHE`, `ENGINE_ORACLE_CACHE`, and any others found). The `kind` keeps
   today's directory name minus the `dot-corpus-` prefix, so a copied cache keeps its sig.
3. Call `oraclePreflight` before the first render in `survey.ts`, `engine-walk.ts`, and the
   json / plain / map / format / dot walks.
4. Amend `docs/adr/0001-graphviz-16.1-oracle.md`: the cache root, the preflight, and the
   recovery command.
5. Executor step (not committed code): copy each `$TMPDIR/dot-corpus-*` cache to its new
   root once (`rsync -a`), and journal sizes before/after.

**Write-set:** `test/corpus/oracle-env.ts`, `test/corpus/oracle-env.test.ts`,
`test/corpus/{survey,engine-walk,json-walk,plain-walk,map-walk,format-walk,dot-walk}.ts`
(only those with an oracle cache or oracle call), `docs/adr/0001-graphviz-16.1-oracle.md`.
**Read-set:** `test/corpus/survey.ts:41-60,348-370,565-600`,
`test/corpus/engine-walk.ts:100-110,235-330`; `grep -n "tmpdir()" test/corpus/*-walk.ts`.

**Interface output (consumed by T3 and every later walk):** the two functions above;
cache paths unchanged except for the root.

**Acceptance criteria:**
- *Given* a plugin dir copy without `config8`, *when* the survey starts, *then* it exits
  non-zero before any render and prints `GVBINDIR=<dir> <dot> -c`.
- *Given* `ORACLE_CACHE` is set, *then* the survey uses it; *given* it is unset and
  `XDG_CACHE_HOME=/x`, *then* the cache is `/x/dot-engine/oracle/oracle/<sig>`.
- *Given* the one-time copy has run, *when* the survey runs with no other change, *then*
  it renders 0 ids natively (all cache hits).
- *Given* a healthy oracle, *then* every walk's results are unchanged (no `src/` change).

**Observability:** preflight failure message only. **Rollback:** reversible (tooling only;
the old `$TMPDIR` caches stay in place).
