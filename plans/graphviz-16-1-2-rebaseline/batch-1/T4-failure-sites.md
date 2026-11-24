# T4 — regenerate the failure-site inventory (`test(T4)`, typescript-pro)

## Context
`test/corpus/failure-sites.json` (graceful-failure D5, #273) records `generatedFrom: { cRoot:
"graphviz-16.1.1/lib", oracle: "16.1.1" }` and C failure sites with `file:line`; 16.1.2's clang-format moved
many lines. The CLI merges, so hand-edited fields and hand-seeded rows survive. AD-5.

## Task
1. `failure-sites.test.ts:87`: expect `'16.1.2'` (read it from `ORACLE_VERSION` if the test can import it
   without a magic literal). Red.
2. Run `npx tsx test/tools/failure-sites/cli.ts --c ~/git/graphviz-16.1.2/lib --src src --out
   test/corpus/failure-sites.json`. Check `generatedFrom` reads 16.1.2 and `graphviz-16.1.2/lib` (fix the CLI's
   stamping only if it does not derive them; that is a write-set widening, stop 1, unless 1–3 lines in
   `cli.ts` — then report it).
3. Report counts by kind and class before → after, rows added/removed (C sites 16.1.2 added or removed), and any
   hand-edited row whose C anchor no longer resolves.

## Write-set
`test/corpus/failure-sites.json`, `test/corpus/failure-sites.test.ts`.

## Acceptance criteria
- Given the regenerated file, then `generatedFrom.oracle` is `16.1.2` and `cRoot` names `graphviz-16.1.2/lib`.
- Given `failure-sites.test.ts` and `test/tools/failure-sites/scan.test.ts`, then both pass.
- Given hand-edited rows, then each survives or the hand-back lists it with the reason.

## Observability / rollback
N/A. Reversible.
