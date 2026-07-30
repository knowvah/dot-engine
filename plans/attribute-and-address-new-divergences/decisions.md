<!-- SPDX-License-Identifier: EPL-2.0 -->
# Architecture decisions

Approved by the user 2026-07-30 (all five, as recommended). Treat every entry
here as **locked**. If execution discovers a conflicting constraint, stop and log
it to [decision-journal.md](./decision-journal.md) — do not silently override.

## D1 — `engine-walk.ts` gets a scaled, overridable render budget

**Context.** It hard-codes a 90s port timeout and 300s oracle timeout with no
scaling and no env override — the only one of the five walkers like this — and it
already manufactures phantom `timeout` rows (`2108` on all 3 xdot tracks,
`1652` on fdp while rendering fine on neato/sfdp). A `timeout` row is invisible
to attribution, which filters `status === 'diverged'`.

**Decision.** Scale it the way `survey.ts` now does:
`max(FLOOR, MULT x native, MULT x recorded portMs)`, plus env overrides. Reuse
that shape rather than inventing a second vocabulary (see
`test/corpus/survey.ts` `renderBudgetMs`, landed in `b7d106e5`).

**Consequences.** All five walkers become consistent and the phantom-timeout
class is fixed rather than one symptom. **Accepted risk:** ids that previously
died at 90s will now render, so `2108` and `1652`@fdp are expected to flip out
of `timeout` — any that land on `diverged` become new attribution work. Stop
condition S8 bounds that growth.

**Rejected.** A bare env override + 300s default (fixes 2621, leaves the class);
special-casing 2621 by hand (leaves the trap for the next id).

## D2 — the xdot re-walk resumes; it is not fresh

**Context.** CLAUDE.md mandates a fresh sweep before committing *routing*
changes. A fresh 910 x 3 iterative sweep is hours.

**Decision.** Resume-walk, adding only the missing ids per engine. No `src/`
file is touched in T1/T2, so existing rows cannot have changed.

**Consequences.** Minutes instead of hours. **A fresh sweep becomes mandatory
the moment T6 edits `src/`** — that is stop/gate territory, not a judgement call.

## D3 — class transfer to json/map must be verified per id, not inherited

**Context.** Attribution proves exoneration on the **xdot** surface; the json and
map classes inherit it. That inheritance held for 113/115 ids in PR #37 — but
only because it was checked, and the check is what caught the `GVTS_CLUST_BB`
filter bug that had fabricated 8 false "cluster polygon defects".

**Decision.** Before letting the class absorb a newly-exonerated id, re-run the
same injection against `compareJson` at the walker's own tolerance (±0.5 for
iterative engines, `json-walk.ts:318`) and require `injectedDiffs === 0`.

**Consequences.** 3-7 extra renders. Acceptance stays earned rather than
vacuous. An id that fails to transfer is escalated to T6, never absorbed.

## D4 — "addressed" is tiered; a real defect may end the mission early

**Context.** A `not-cleared` verdict implies a genuine port defect. Fixing `src/`
here requires a full corpus sweep with 0 regressions, and the scope is unknowable
until the mechanism is known.

**Decision.** Always produce the mechanism first — cause, `file:line`, causal
chain, and what was ruled out (per `~/.claude/rules/diagnosis.md`). Then:
1. mechanism confined to harness/comparator code → fix in-mission;
2. bounded single-mechanism `src/` change → fix, gated on a fresh full sweep
   with 0 regressions;
3. anything broader → **stop**, hand over the diagnosis, let the fix be its own
   mission.

**Consequences.** The mission always delivers understanding; it does not promise
a fix it cannot bound. Tier 3 is a legitimate, successful outcome.

## D5 — contingency: exonerated on xdot, diverged on json

**Context.** Attribution only ever sees xdot-diverged ids. An id that is
*conformant* on xdot but *diverged* on json can never earn class membership.
May not arise: all 3 ids are large graphs on iterative engines and will very
likely diverge on xdot too.

**Decision.** Diagnose it as a candidate **real defect** first. Only if the
diagnosis shows it is genuine drift that xdot's comparator structurally cannot
see, productionize json-surface attribution (`--surface json|xdot`, emitting
`attribution-json-<engine>.json`, with the json registry class retargeted).

**Consequences.** No speculative harness build. **Explicitly rejected:** a
hand-written per-id acceptance row — that is exactly the stale hand roster PR #37
deleted.
