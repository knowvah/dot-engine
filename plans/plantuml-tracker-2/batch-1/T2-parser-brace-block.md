# T2 — Issue 27: reject `node { … }` (and `edge`/`graph`)

**Agent:** typescript-pro. **Depends on:** T0. **Rollback:** Reversible.
**Observability:** N/A — no new observable operations.

## Context

plantuml-ts issue 27: `digraph g { node { shape=box } a -> b }` renders in the
port; native dot exits 1 with `syntax error in line 1 near '{'`. Likely mechanism
(verify before editing): `src/parser/dot.pegjs` `AttrList` (≈line 70) has an
empty alternative, so `node` with no `[...]` parses as an attr statement and the
`{ … }` then parses as an anonymous subgraph. C `lib/cgraph/grammar.y:190-200`:
`attrstmt : attrtype optmacroname attrlist`, `attrlist : optattr '[' optattrdefs ']'`
— at least one bracket group is required.

## Task

1. TDD: add failing parser tests, then fix the grammar so an attr statement
   requires ≥1 `[ … ]` group, exactly as `grammar.y`.
2. `npm run parser:regen` runs automatically in pretest/pretypecheck.
3. Do NOT change `ParseError`'s message format or fields (AD-4).
4. `test/golden/pt-issue-27.test.ts`: render `test/golden/inputs/pt-issue-27.dot`
   → expect `ParseError`, `code === 'SYNTAX_ERROR'`.

## Acceptance

- Given `digraph g { node { shape=box } a -> b }`, when parsed, then `ParseError`
  with code `SYNTAX_ERROR` is thrown.
- Given `edge { }` / `graph { }` / bare `node;`, when parsed, then each throws
  (verify each against native dot first; match native accept/reject exactly).
- Given `node [shape=box]`, `node [a=1][b=2]`, `subgraph { a }`, `{ a b }`,
  `graph [rankdir=LR]`, when parsed, then all are accepted with unchanged ASTs.
- Given the full `~/git/graphviz/tests` corpus, then no file that native accepts
  is rejected (survey parse-error count unchanged).

## Read-set

`src/parser/dot.pegjs:45-110`, `~/git/graphviz/lib/cgraph/grammar.y:150-260`,
`src/parser/parser.test.ts` (existing patterns), `src/parser/index.ts:20-60`.

## Write-set

`src/parser/dot.pegjs`, `src/parser/parser.test.ts`, `test/golden/pt-issue-27.test.ts`.
(`src/parser/dot.js` is generated — commit it only if it is tracked.)

## Commit

`fix(parser): reject attribute statement without a bracket list`
