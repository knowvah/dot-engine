<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 4 — verify the transfer, don't inherit it

Attribution proves exoneration on the xdot surface; the json/map classes inherit
it. D3 requires re-running the same injection against `compareJson` before any id
is absorbed, because the equivalent check is what caught a fabricated finding in
PR #37.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T4 | [Verify json-surface transfer](./T4-json-transfer-verify.md) | executor | `evidence/json-transfer.md` | T3 | [x] |
