<!-- SPDX-License-Identifier: EPL-2.0 -->

# Architecture decisions (approved)

## AD-1 — Plain comparator design
- **Context:** raw text diff of `plain` output drowns in float formatting and is
  useless for iterative engines.
- **Decision:** parse `plain` into structured records (graph / node / edge
  lines), compare fields positionally with ±0.01 numeric tolerance and exact
  non-numeric — same model as `test/golden/compare-xdot.ts`.
- **Consequences:** reusable, engine-agnostic; needs a small plain-format parser.

## AD-2 — Single "plain" track (covers plain + plain-ext)
- **Context:** `plain` and `plain-ext` differ only by edge port info.
- **Decision:** one walker renders both; report one **"plain"** track per engine
  whose verdict covers `plain` and validates `plain-ext` as a superset.
- **Consequences:** matrix stays readable; a divergence in either format fails
  the cell.

## AD-3 — Parameterize json/map walkers in place
- **Context:** `json-walk.ts` / `map-walk.ts` are dot-only.
- **Decision:** add an `engine` argument (mirroring `engine-walk.ts`) →
  `json-parity-<engine>.json` / `map-parity-<engine>.json`; also thread engine
  through `render-one-json.ts` / `render-one-map.ts` and the oracle command
  (`dot -K<engine> -T<fmt>`). No per-engine file clones.
- **Consequences:** one walker per format; smaller diff; consistent with the
  established pattern.

## AD-4 — Iterative engines get structural comparison
- **Context:** neato/fdp/sfdp drift positionally; exact-coord comparison is noise
  (this is why `format-walk.ts` is position-agnostic).
- **Decision:** deterministic engines (dot/circo/twopi/osage/patchwork) →
  full ±0.01 field comparison; iterative engines (neato/fdp/sfdp) →
  position-agnostic structural comparison (record/field presence + non-numeric
  exact), verdict labeled distinctly.
- **Consequences:** avoids a flood of false "diverged"; iterative tracks report
  structural conformance, not geometry.

## Operational (Phase 4)
- **Rollback:** Reversible (dev infra + git-revertible src fixes; no data/schema).
- **Backwards compat:** the src fixes change `render(g,'plain')` output
  (fillcolor, edge labels, label canonicalization) — an output-changing bug fix
  toward oracle-correctness. Non-breaking in spirit; note in commit + journal.
  No versioning action for this pre-1.0 dev-track library.
- SLIs/alerts/on-call/scalability: **N/A** — Node-only dev/test infra.
