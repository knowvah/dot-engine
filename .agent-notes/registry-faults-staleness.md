# registry-faults-staleness — observations (2026-10-14)

## Observation: re-walking one id by deleting its JSONL row
- **Context**: re-staging the six 2784 json/map rows (T5).
- **Finding**: delete the row, then resume the walk into the same JSONL; only
  the deleted id renders. Before running, check that the resumed walk has
  nothing else pending: its items (parity.json conformant minus
  engine-exclusions) minus the JSONL ids must be exactly the deleted id. Also
  confirm the oracle cache hits: the signature hashes the binary path,
  GVBINDIR, format, engine and binary mtime. map-walk's engine mode appends the
  new row last, so its summary `.json` gets reordered. json-walk keeps item
  order.
- **Impact**: cheap targeted re-walks. Diff results per id, not by line.
- **Confidence**: High

## Observation: 2784 json/plain oracle-error rows show only a parser warning
- **Context**: writing the A10 Affected line (T6).
- **Finding**: json on twopi/neato/fdp/sfdp and plain on all five engines
  record `oracle-error` with errMsg = the 'badly delimited number' parser
  warning. These walks cap the oracle at 300 s, and native 2784 took
  249–1191 s in the engine walk, so the oracle was most likely killed by the
  timeout. The row does not say so directly.
- **Impact**: do not read the warning as the cause of these oracle errors.
- **Confidence**: Medium

## Observation: format detail pages render accepted fault rows as 0 diffs
- **Context**: dashboards regenerated after A10 moved into the registries.
- **Finding**: `parity-report.ts`'s json/map detail pages show an accepted
  port-error row as `#diffs 0` with an empty firstDiff. The engine pages and
  PARITY-JSON/MAP rosters render it properly.
- **Impact**: cosmetic follow-up candidate.
- **Confidence**: High
