<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 3 — earn a verdict

Run the injection-attribution harness over the ids T2 newly marked `diverged`.
`injectedDiffs === 0` ⇒ `drift-exonerated`, which is what the computed A1-drift
class consumes.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T3 | [Attribute the newly diverged ids](./T3-attribution.md) | executor | `attribution-{neato,fdp,sfdp}.json(l)` | T2 | [x] |

Two traps documented in the task file have already produced false findings here:
the `injectedDiffs` initializer, and the `GVTS_CLUST_BB` dump filter.
