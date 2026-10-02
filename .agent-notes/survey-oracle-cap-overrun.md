# Corpus survey: oracle cap overrun and very long tail

## Observation: native oracle ran far past ORACLE_TIMEOUT_MS
- **Context**: Fresh `test/corpus/survey.ts` run (GVBINDIR=/tmp/ghl) for the
  canvas-font-mapping gate, 2026-10-01.
- **Finding**: `dot -Tsvg tests/2593.dot` (parent = survey worker) was still
  running at 1h51m against a printed oracle cap of 4,716,270 ms (~79 min).
  End to end the survey took ~4.5 h. The tail is the over-cap ids
  `tree-share-examples-world` (port budget = 3 x recorded 4.8M ms = 4 h) and
  `2475_1`. Progress prints only every 50 inputs, so it sits at "900/939" for
  hours.
- **Impact**: (1) Run full sweeps detached (`nohup … & disown`). The Bash
  background limit (max 2 h) kills them. (2) An oracle cache populated by an
  earlier killed run lets over-cap ids that were `oracle-error` on the
  committed baseline get port-scored (`errored`/`timeout`). That shows up as
  verdict movement unrelated to the change under test. (3) The oracle-cap
  enforcement looks ineffective, cause not yet diagnosed.
- **Confidence**: High for the observations; the cap-enforcement cause is not
  investigated.
