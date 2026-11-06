# T11: divergences ledger and locales (138)

**Context:** `docs/known-divergences.md` (included by `docs-site/divergences.md`; 23 translated copies at
`docs-site/<locale>/divergences.md` with a `sourceHash`) lags `test/corpus/PARITY.md`: A1's neato and fdp rows and the
"99.8/96.6" figures. Its non-goals line "`-Tplain` text output. Deferred" may be stale (the port renders `plain`). Part 11's
outcomes that change user-visible behaviour: long-string wrap in `xdot`/`dot` (T3), fdp `json` proxies (T4), and whatever T6
and T7 closed or parked.

**Task:** bring A1's neato and fdp rows and the percentage line in line with `test/corpus/PARITY.md` and the per-engine
`PARITY-*.md`; verify the `-Tplain` non-goal against the code and correct or remove it; record T6/T7 outcomes where the ledger
covers them; mirror every change into the 23 locale copies in their language and refresh each `sourceHash`.

**Write-set:** `docs/known-divergences.md`, `docs-site/*/divergences.md`.
**Read-set:** `test/corpus/PARITY.md`, `test/corpus/PARITY-*.md`, this mission's journal rows for T3, T4, T6, T7;
`scripts/i18n-hash.mjs`.

**Acceptance criteria:**
- *Given* the ledger, *then* every figure it quotes equals `PARITY.md` at head, and the `-Tplain` line matches the code.
- *Given* `npx vitest run test/docs` and `npm run docs:i18n-status`, *then* both pass with 0 stale × 23.

**Commit:** `docs(T11): bring the divergences ledger up to date`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
