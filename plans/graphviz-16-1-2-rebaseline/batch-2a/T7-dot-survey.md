# T7 — dot survey (`test(T7)`)

## Commands
1. `rm -f test/corpus/parity-1612-probe.json`
2. `caffeinate -i env SURVEY_CONCURRENCY=5 PARITY_OUT=parity-1612-probe.json npx tsx test/corpus/survey.ts > $BASE/logs/T7.log 2>&1`
   (defaults: 16.1.2 carried, `/tmp/ghl1612-carried`). About 1–4 h (`world.gv` dominates).
3. Two gates, both kept as the change list:
   - vs the committed registry: `npx tsx test/corpus/rules-gate.ts test/corpus/parity-1612-probe.json test/corpus/parity.json > $BASE/diff/T7-gate-committed.txt`
   - vs the fresh 16.1.1 baseline at main's port (AD-4): `npx tsx test/corpus/rules-gate.ts test/corpus/parity-1612-probe.json $BASE/old/parity-9007464d.json > $BASE/diff/T7-gate.txt`
   Differences between the two outputs are registry staleness (port commits since the registry was written).
4. `mv test/corpus/parity-1612-probe.json test/corpus/parity.json`; `npm run survey:dashboard` (writes
   `PARITY-dot.md`).

## Write-set
`test/corpus/parity.json`, `test/corpus/PARITY-dot.md`.

## Acceptance criteria
- Given the new `parity.json`, then its oracle version is 16.1.2 and its id set equals the old one.
- Given `$BASE/diff/T7-gate.txt` and `$BASE/diff/parity.tsv` (built against `parity-9007464d.json`), then every
  transition count (conformant, structural-match, diverged, errored, oracle-error) is in the journal, with
  oracle-error against the baseline's 10.
- Given the probe file, then it no longer exists in the worktree.

## Observability / rollback
Journal row: runtime, load, counts. Reversible.
