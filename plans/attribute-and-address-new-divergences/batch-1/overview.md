<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 1 — unblock the harness

`engine-walk.ts`'s hard-coded 90s port timeout makes heavy ids record `timeout`,
and a `timeout` row is invisible to attribution. Nothing else in this mission can
proceed until it scales.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | [Scale engine-walk's render budget](./T1-engine-walk-budget.md) | typescript-pro | `engine-walk.ts`, `engine-walk.test.ts` | — | [x] |

No sweep runs in this batch.
