# T7 — HTML labels: lexer, table model, emission order

**Agent:** typescript-pro. **Depends on:** T3, T4. Follow [area-task-protocol.md](area-task-protocol.md).

**Rollback:** Reversible. **Observability:** N/A — library code; the SLIs are
survey verdicts and the ratchet length.

## Context

16.1 `lib/common/htmllex.c` was substantially rewritten (209/217 lines changed
ignoring whitespace), and `htmltable.h`/`htmltable.c` and `textspan.h` changed.
`f0d07786b` "fix: adjust cell rendering order in HTML table emission" means 16.1
draws the table border before its cells, where 15.x drew the cells first
(plantuml-ts 34; fixture rubebe-45-sura795). Port side: `src/common/htmltable-*.ts`
(`htmltable-lex`, `htmltable-emit`, `htmltable-emit-fill`, `htmltable-emit-rules`,
`htmltable-pos*`), `src/common/html-*.ts`.

## Acceptance

- Given every T3 row for T7, then each is ported with a test, or recorded as refactor-only with a reason.
- Given the `pt-issue-34` cases, then they pass and are off the ratchet.
- Given HTML-label goldens and corpus ids that T3 says moved because of these
  commits, then they pass vs 16.1.0.
- Given lexer edge cases the rewrite touched (entities, malformed tags, the
  error text), then the port's behaviour matches native output and warnings.

## Write-set

`src/common/html*`, plus any `src/render/*` file that emits HTML tables if a T3
row names one, + their tests; `test/golden/known-failing.json` (removals).

## Commit

`fix(html): mirror graphviz 16.1 html lexing and table emission order`
