# Architecture decisions — registry-faults-staleness (locked)

Approved by the user 2026-10-14 (Phase 3). Rollback class for the whole
mission: **Reversible** (additive schema; revert restores prior state).

## AD-1 Fault-acceptance shape {#ad-1}

Per-id registry entries gain two optional fields:
`verdict?: "port-error" | "timeout"` (absent ⇒ `"diverged"`, today's meaning)
and `errIncludes?: string`, **required** when `verdict` is `"port-error"` and
**forbidden** otherwise. One entry per (engine, id) stays the rule. Rejected:
a separate `faults` section (two lookup paths), encoding in `class` (fragile).

## AD-2 Which registries carry the fields {#ad-2}

Only `accepted-divergences-engines.json`, `-json.json`, `-map.json` — the only
registries with A10 rows (plain's 2784 rows are oracle-errors). plain,
dot-format and xdot schemas are unchanged.

## AD-3 Where fault acceptance resolves {#ad-3}

Where `diverged` acceptance already resolves for that registry:
- engines → report-time join in `test/corpus/parity-report.ts`
  (accepted fault rows leave the fault table, count as `accepted`);
- json/map → walk-time in `json-walk.ts` / `map-walk.ts` (row verdict
  `accepted`, `errMsg` kept); the six committed 2784 json/map rows are
  re-walked so artifacts reflect it.

## AD-4 Staleness rule {#ad-4}

For every per-id entry, the committed walk row for (engine, id) must exist and
its raw outcome must match the declared verdict:
- `diverged` ↔ row `diverged` or `accepted`;
- `port-error` ↔ row `port-error` or `accepted`, and every error text
  (`err`, `errMsg`, or both map formats' `errMsg`) contains `errIncludes`;
- `timeout` ↔ row `timeout` or `accepted`;
- row `oracle-error` / `oracleError` ⇒ **exempt** (no reference to verify);
- anything else, or an absent row ⇒ **stale**.

An entry with no `engine` (json: `share-Latin1`, `windows-Latin1`) applies to
every engine's walk, as `json-walk.ts:358-375` resolves it, so it is checked
against all 8 json artifacts (each must match or be oracle-error); both are
`accepted` in all 8 today. The `dot` engine's artifacts carry no suffix
(`json-parity.jsonl`, `map-parity.jsonl`).

Planned retirements under this rule: fdp `1879` in engines/json/map (now a
`splines=compound` port-error — a tracked gap, not an acceptance) and
dot-format `1435` (absent: dot-walk walks only SVG-conformant ids). Kept as
exempt: json fdp `1652`, plain circo `2108` (oracle-error rows).

## AD-5 Staleness test structure {#ad-5}

Pure helper `test/corpus/registry-staleness.ts` (row normalizers + `staleReason`)
and one table-driven `registry-staleness.test.ts`: one table row per registry
(registry file, entry extractor, artifact path fn, verdict key, error key),
reading committed `.jsonl` (same approach as `accepted-divergences.test.ts`
reading `parity.json`). The helper is unit-tested on synthetic rows.

## AD-6 Class entries out of scope {#ad-6}

Attribution-computed class entries (`{ class: true, attributionFile }`) are
skipped by the staleness check: membership is recomputed, never enumerated.
Attribution files predating 16.1 is follow-up 3, not this mission.

## AD-7 Error matching {#ad-7}

`errIncludes` is a case-sensitive substring test. Engine rows: `err`. json
rows: `errMsg`. map rows: both `cmapx.errMsg` and `imap.errMsg` must contain
it. No regex, no exact match.
