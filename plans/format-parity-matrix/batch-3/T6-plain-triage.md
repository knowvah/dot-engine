<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — Plain triage (all 8 engines)

## Context
Run `plain-walk.ts` for dot, neato, fdp, sfdp, circo, twopi, osage, patchwork.
Every diverged item must be resolved: **fix** (src change so the oracle agrees on
re-run) or **accept** (registry entry + journaled mechanism). No unexplained
divergences.

## Task
1. Fresh sweep per engine (delete stale JSONL first) → `plain-parity-<engine>.json`.
2. For each divergence: instrument the C `write_plain` path, dump actual values,
   state the mechanism (`file:line`, causal chain, ruled-out) BEFORE any fix.
3. Real bug → fix in `src/render/map.ts` (never edit src while a sweep runs).
   Known first target: **label canonicalization** — `writePlainNode` emits
   `n.attrs.get('label')` raw and `writePlainEdge` emits `lbl.text` raw; C uses
   `canon(agraphof(...), text, buf)` (`output.c:158,202`). Port the canon so
   labels with spaces/quotes match.
4. ULP/iterative drift → add to `accepted-divergences-plain.json` + one-line
   journal (repo-root `plans/decision-journal.md`).
5. Re-run to confirm 0 unexplained divergences; verify **no regression** on
   existing SVG/xdot tracks (a `writePlain`-only change should not touch them,
   but confirm `npm test` + a dot xdot spot-check).

## Write-set
- `src/render/map.ts` (fixes)
- `test/corpus/accepted-divergences-plain.json`
- `test/corpus/plain-parity-*.json` (8 summary files)
- repo-root `plans/decision-journal.md`

## Read-set
- `lib/common/output.c:129` `write_plain`; `src/render/dot.ts` `agcanonEscape`
  (existing canon building block, ~line 651) — reuse or extend for plain labels.
- `../decisions.md`; `../../decision-journal.md` (project journal style).

## Acceptance criteria
- Given the 8 fresh sweeps, then every item is `pass`, `accepted`, or an
  excluded error — 0 unexplained `diverged`.
- Given each accepted item, then the registry has an entry AND the project
  journal has its mechanism.
- Given each fix, then `npm test` green and a `dot -Tplain` spot-check on a
  labeled-edge/spaced-label graph matches the oracle byte-for-byte.
- Given existing tracks, then their pass counts are unchanged (no regression).

## Observability / rollback
N/A. Reversible per fix (git). Each real fix = its own commit
(`fix(render): ...`); accepted-only batches = one `test(corpus): ...` commit.

## Quality bar
Per commit: `tsc` + `npm test` green; touched-track fresh sweep 0 regressions.
Stop per the mission stop conditions if a divergence is unclassifiable or a
location is churned 3+ times.
