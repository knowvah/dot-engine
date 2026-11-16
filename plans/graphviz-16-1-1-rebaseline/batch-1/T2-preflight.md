# T2 — preflight (orchestrator, no commit)

## Steps
1. `mkdir -p $BASE/{logs,old}`. Record `uptime`.
2. Plugin dirs: `sh test/corpus/gen-headless-gvbindir.sh` and its `all` mode (T1). Check:
   `~/git/graphviz-16.1.1/build/cmd/dot/dot -V` prints `16.1.1`; both dirs link `*.8.0.16.dylib`; `config8` exists.
3. 16.1.0 dirs for T9: `/tmp/ghl` (rebuild with `GRAPHVIZ_BUILD=~/git/graphviz/build sh
   test/corpus/gen-headless-gvbindir.sh /tmp/ghl` if missing) and `$BASE/ghl16-all` (same plus neato_layout,
   8.0.15). `dot -V` prints `16.1.0`.
4. Render `digraph{a->b}` with each of the 8 engines on both oracles, `-Txdot`; all exit 0.
5. Port unchanged (AD-4): build the bundle of `9c7c65b6` and of HEAD from clean `git archive` exports
   (`npm run parser:regen && npm run build:js`); sha256 of `dist/index.js` equal. Keep both bundles in `$BASE`.
6. Copy every committed `test/corpus/*.jsonl`, every registry and report this mission regenerates, and
   `test/golden/refs{,-xdot}/` to `$BASE/old/` (the T3–T11 diff source). Do not delete anything here: each
   regenerating task deletes **its own** JSONL immediately before its run, so the other registries stay valid
   for the gates meanwhile.
7. Baseline gates on HEAD: typecheck, `npm test`, goldens, corpus + docs. Record counts.
8. Journal row: versions, plugin sonames, bundle hashes, gate counts, load.

## Acceptance criteria
- Given the preflight, then `dot -V` is 16.1.1 (16.1.0 for the T9 oracle) and every engine renders on both.
- Given the two bundles, then their sha256 are equal; otherwise STOP (stop 3).
- Given `$BASE/old/`, then it holds the 16.1.0 copy of every file T3–T8 regenerate.

## Observability / rollback
Journal row only. Reversible: restore JSONL from `$BASE/old/` or git.
