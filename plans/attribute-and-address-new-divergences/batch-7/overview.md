<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 7 — close out

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T7 | [Regenerate dashboards, final gates](./T7-closeout.md) | executor | `PARITY*.md`, journals | T5, T6 | [x] |

Sole writer of the generated dashboards. Also owns the PR-title decision:
`test:`/`chore:` unless T6 landed a `src/` fix.
