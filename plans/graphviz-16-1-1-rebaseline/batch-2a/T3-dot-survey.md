# T3 — dot survey (`test(T3)`)

## Commands
1. `rm -f test/corpus/parity-1611-probe.json`
2. `caffeinate -i env SURVEY_CONCURRENCY=5 PARITY_OUT=parity-1611-probe.json npx tsx test/corpus/survey.ts > $BASE/logs/T3.log 2>&1`
   (defaults: 16.1.1, `/tmp/ghl1611`). About 3 h historically (`world.gv` alone ~2.5 h).
3. `npx tsx test/corpus/rules-gate.ts test/corpus/parity-1611-probe.json test/corpus/parity.json > $BASE/diff/T3-gate.txt`
   — expected to FAIL; its regression and improvement lists are the change list.
4. `mv test/corpus/parity-1611-probe.json test/corpus/parity.json`; `npm run survey:dashboard` (writes `PARITY-dot.md`).

## Write-set
`test/corpus/parity.json`, `test/corpus/PARITY-dot.md`.

## Acceptance criteria
- Given the new `parity.json`, then `oracleVersion` is 16.1.1 and it has 950 ids.
- Given `$BASE/diff/T3-gate.txt` and `$BASE/diff/parity.tsv`, then every transition count (conformant,
  structural, diverged, errored, oracle-error) is in the journal; `counts.oracle-error` is recorded against the
  16.1.0 value 14 (expected to fall: `2778`, `2854_1`, `2855` no longer crash natively).
- Given the probe file, then it no longer exists in the worktree.

## Observability / rollback
Journal row: runtime, load, counts. Reversible.
