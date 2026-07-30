<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 2 — bring the xdot tracks to the 910-id universe

Attribution reads its work list from `parity-<engine>.json`. The 3 target ids are
absent from all three iterative xdot tracks, so they must enter first.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T2 | [Resume-walk xdot for neato/fdp/sfdp](./T2-xdot-rewalk.md) | executor | `parity-{neato,fdp,sfdp}.json(l)` | T1 | [ ] |

Engines run **sequentially**, concurrency <= 4, oracle cache warm. Concurrent
heavy sweeps were measured to inflate wall time 3.8-5.7x and produce false
timeouts.
