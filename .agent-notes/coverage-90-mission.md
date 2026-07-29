<!-- SPDX-License-Identifier: EPL-2.0 -->

# coverage-90 mission notes (2026-07-28)

## Observation: four dormant port bugs found by branch-coverage tests
- **Context**: test-only coverage mission; agents compared uncovered branches
  against the C spec before asserting.
- **Finding**: (1) xdot parseString truncation accepted as success (C: NULL);
  (2) record.ts attrBool missing gv_isdigit guard; (3) `<TH>` HTML label
  hangs the parser (infinite token re-read; C dispatches TH as row synonym,
  htmllex.c:614,669); (4) DtBag.delete misses non-root duplicates (bagInsert
  threads .right, findByIdentity walks .left). All `.todo`-skipped in the
  corresponding *.branch.test.ts files.
- **Impact**: each needs a small src fix + un-skip of its todo test. The TH
  hang is DoS-shaped for library consumers feeding untrusted HTML labels.
- **Confidence**: High (each reproduced/instrumented by the finding agent).

## Observation: coverage tooling quirks in this repo
- **Context**: parallel coverage runs during the mission.
- **Finding**: default config emits json-summary only — regenerate
  coverage-final.json via `--coverage.reporter=json` when per-branch maps are
  needed. Concurrent `vitest --coverage` runs collide on `coverage/.tmp`;
  use `--coverage.reportsDirectory` for isolation. Bare `grep` misdetects
  src/layout/fdp/cluster-edges.ts as binary — use `grep -a`.
- **Impact**: future coverage work should keep these three workarounds.
- **Confidence**: High.

## Observation: golden suite count pin location
- **Context**: adding manifest entries for new fixtures.
- **Finding**: the pin is `test/golden/suite.test.ts` ("manifest has N
  entries"); now 247. gen-xdot-refs regenerates ALL deterministic refs but is
  byte-stable against committed refs (verified twice this mission).
- **Impact**: manifest merges must bump the pin; xdot regen is safe.
- **Confidence**: High.
