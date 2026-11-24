# Decision journal — graphviz 16.1.2 re-baseline (#297)

Append-only. Each row also goes to `plans/decision-journal.md`.

| Date | Task | Decision / observation | Evidence |
|---|---|---|---|
| 2026-11-24 | planning | T2 and T3 land as one commit: T2 moves `ORACLE_CORPUS_ROOT` to 16.1.2's `tests/`, after which `corpus-manifest.test.ts` fails until T3's manifest holds the 7 new inputs; landing T3 first fails the same test the other way. | `test/corpus/corpus-manifest.test.ts:54-57`, `gvbindir-defaults.test.ts:255` |
