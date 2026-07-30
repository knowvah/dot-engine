<!-- SPDX-License-Identifier: EPL-2.0 -->
# T6 — address the ids that did not exonerate (CONDITIONAL)

**Agent:** `debugger` for diagnosis, then `typescript-pro` if a fix is applied
**Depends on:** T3, T4 · **Commit:** one per fix, plus one for the diagnosis

**Skip this task entirely if every id came back `drift-exonerated` in T3 and
`transferVerified` in T4** (P4). Record the skip in the journal and move to T7.

## Context

Two populations can reach this task:

- **`not-cleared` from T3** — injecting the oracle's own positions did *not* zero
  the diffs, so something downstream of the solver differs. This is a candidate
  real port defect.
- **`transferVerified: false` from T4** — exonerated on xdot but still diverging
  on json. Per D5 this is a candidate real defect *first*; json-surface
  attribution is built only if diagnosis proves the drift is genuine and xdot's
  comparator structurally cannot see it.

## Task

**Diagnose before proposing anything.** Per `~/.claude/rules/diagnosis.md`, the
deliverable is a mechanism, not a symptom that stopped reproducing. Produce:

- **Mechanism** — the specific cause in one or two sentences.
- **Origin** — `file:line` where it originates.
- **Causal chain** — why the observed diff follows from that cause.
- **Ruled out** — what was eliminated and the evidence that eliminated it. An
  empty "ruled out" on a non-trivial defect means the cause was guessed.

Instrument before hypothesising: dump actual values from both sides. The C source
at `~/git/graphviz` is the canonical specification — when the port and the oracle
disagree, the default stance is "my port differs, find where", and the C behaviour
wins unless it is a documented oracle bug.

Then apply **D4's tiering**:

1. mechanism confined to harness/comparator code → fix in-mission;
2. bounded, single-mechanism `src/` change → fix, gated on a **fresh** full corpus
   sweep with 0 regressions (S15);
3. anything broader → **stop (S10)**, hand over the diagnosis, let the fix be its
   own mission. This is a legitimate successful outcome, not a failure.

## Before assuming a defect, rule out the known false-positive classes

- **ULP-nondeterminism (S11).** The native oracle's own pre-routing dump is not
  reproducible: two invocations differ by ~8e-15 in (5.8e-13 pt) while the final
  output is byte-identical. The port amplifies that through sensitive edge
  routing, and one observed run crossed a spline-segmentation threshold and
  changed an edge's `_draw_` **op count** — so the flip can present as a
  *structural* diff, not merely numeric. Re-run before believing any single
  `not-cleared`.
- **Dropped dump lines.** See T3's trap 2 (`GVTS_CLUST_BB`).
- **Tolerance mismatch.** Compare at the track's own tolerance (±0.5 iterative),
  not `compareJson`'s 0.01 default — otherwise sub-threshold drift reads as a
  defect.

## Write-set

**Conditional and bounded by the tier:**
- always: `plans/attribute-and-address-new-divergences/decision-journal.md`,
  and a diagnosis note under `plans/attribute-and-address-new-divergences/`
- tier 1: `test/corpus/**` (name the exact files before editing)
- tier 2: `src/**` (one bounded mechanism) + its co-located tests + every parity
  artifact the fresh sweep regenerates
- tier 3: documentation only

Modifying a file outside the tier you declared is **S1: stop**.

## Read-set

- [decisions.md#d4](../decisions.md), [#d5](../decisions.md)
- T3's verdict table, T4's `evidence/json-transfer.md`
- the diverging id's own rows in `json-parity-<engine>.json` (`firstDiff`,
  `maxDelta`, `maxDeltaPath`) to locate the first divergence
- the relevant C source under `~/git/graphviz/lib/` for the mechanism at issue

## Acceptance criteria

1. **Given** a `not-cleared` id, **when** diagnosed, **then** the mechanism,
   origin `file:line`, causal chain, and ruled-out list are all recorded — before
   any fix is proposed.
2. **Given** the mechanism is confined to harness/comparator code, **when** fixed,
   **then** `npm run typecheck` is clean and `npm test` green.
3. **Given** a fix touches `src/`, **when** applied, **then** a **fresh**
   (deleted-JSONL) full corpus sweep reports **0 regressions**; if it cannot be
   made to, revert the fix and escalate rather than committing.
4. **Given** the diagnosis shows a known false-positive class, **then** it is
   documented as such and the port is left unchanged.

## Observability requirements

N/A for tier 1/3. For tier 2, the observable surface is the full parity sweep —
`rules-gate` regression count is the gate, and the journal must record the
before/after verdict counts for every affected track.

## Rollback

Tier 1/3: **Reversible.** Tier 2: **Reversible**, but the revert must also restore
the parity artifacts the sweep regenerated — revert the whole commit, not the
`src/` file alone, or the artifacts will assert a behaviour the code no longer has.

## Commit

Tier 1: `fix(corpus): <mechanism>` · Tier 2: `fix(<scope>): <mechanism>`
Tier 3: `docs(corpus): diagnose <id> divergence mechanism`
Body must contain the four-part diagnosis artifact.
