# T5 — preflight (orchestrator, no commit)

## Steps
1. `mkdir -p $BASE/{logs,old,diff}`. Record `uptime`.
2. Plugin dirs (rebuild any missing `config8`):
   - 16.1.2 carried: `GRAPHVIZ_BUILD=~/git/sseely/graphviz-carried-1612/build sh test/corpus/gen-headless-gvbindir.sh /tmp/ghl1612-carried`
     and `… all /tmp/ghl1612-carried-all`.
   - 16.1.2 pristine: `sh test/corpus/gen-headless-gvbindir.sh` and `… all` (defaults after T2).
   - 16.1.1 carried for T12: `/tmp/ghl1611-carried{,-all}` with `GRAPHVIZ_BUILD=~/git/sseely/graphviz-carried/build`.
   Check each: `dot -V` prints `16.1.2` (16.1.1 for the T12 dirs); the 16.1.2 dirs link `*.8.0.17.dylib`
   (16.1.1: `8.0.16`); `config8` exists.
3. Render `digraph{a->b}` with each of the 8 engines on the 16.1.2 carried, 16.1.2 pristine and 16.1.1 carried
   builds, `-Txdot`; all exit 0.
4. `npx tsx test/corpus/carried-selfcheck.ts` (read its header for what it compares with a non-empty patch
   series); exit 0, or stop 4.
5. Port unchanged (AD-4): build the bundle of `c6d794a9` and of HEAD from clean `git archive` exports
   (`npm run parser:regen && npm run build:js`); sha256 of `dist/index.js` equal. Keep both in `$BASE`.
6. Copy every committed `test/corpus/*.jsonl`, every registry and report this mission regenerates, and
   `test/golden/refs{,-xdot}/` to `$BASE/old/`; copy the main checkout's
   `.claude/mission-logs/survey/9007464d-parity.json` to `$BASE/old/parity-9007464d.json` (AD-4 dot baseline).
   Delete nothing: each regenerating task deletes **its own** JSONL immediately before its run.
7. Baseline gates on HEAD: typecheck, `npm test`, goldens, corpus + docs. Record counts.
8. Journal row: versions, plugin sonames, self-check result, bundle hashes, gate counts, load.

## Acceptance criteria
- Given the preflight, then both 16.1.2 builds report 16.1.2, plugins are 8.0.17, every engine renders on all
  three builds, and the self-check exits 0.
- Given the two bundles, then their sha256 are equal; otherwise STOP (stop 3).
- Given `$BASE/old/`, then it holds the 16.1.1 copy of every file T6–T14 regenerate, and the 9007464d survey.

## Observability / rollback
Journal row only. Reversible.
