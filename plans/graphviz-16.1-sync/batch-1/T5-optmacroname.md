# T5 — Parser: grammar.y `optmacroname`

**Agent:** typescript-pro. **Depends on:** T0. **Rollback:** Reversible.
**Observability:** N/A — parser change; the warning goes through the port's
existing warning channel.

## Context

AD-7. 16.1.0 `lib/cgraph/grammar.y`:
`attrstmt : attrtype optmacroname attrlist {attrstmt(scanner,$1,$2);}` and
`optmacroname : atom '=' | /* empty */`. `attrstmt()` (~355) calls `nomacros()`
when a macro name is present. `nomacros()` (346) is
`agwarningf("attribute macros not implemented")`, and the attributes are still
applied. The port's `AttrStmt` (`src/parser/dot.pegjs`) has no macro name (noted
in `.agent-notes/pt-tracker-2-observations.md`). `AttrListReq` (one or more
bracket groups) came from the previous mission's fix for issue 27.

## Task

1. Add the optional `atom '='` between the attr type and `AttrListReq`.
   Whitespace and comment handling must follow the existing rules.
2. On a macro name, emit the warning exactly as C does, through the port's
   existing warning mechanism (find how other `agwarningf` sites are ported),
   and apply the attributes unchanged.
3. Tests first: parser cases (`node a = [shape=box]`, `edge e = [color=red]`,
   `graph g = [rankdir=LR]`, quoted and HTML atoms, and a missing bracket list
   still rejected per issue 27), plus a render golden against native 16.1.0
   (`test/golden/optmacroname.test.ts` + input/ref). The golden asserts that the
   attributes took effect and that the warning text matches native stderr.

## Acceptance

- Given `digraph{node a = [shape=box]; x}`, when rendered, then `x` is a box,
  the warning `attribute macros not implemented` is emitted, and the SVG matches native.
- Given `node a = ;` or `node a =` with no bracket list, then a ParseError,
  matching native rejection.
- Given the existing parser suite, then it stays green.

## Write-set

`src/parser/dot.pegjs`, `src/parser/parser.test.ts`,
`test/golden/optmacroname.test.ts`, `test/golden/inputs/optmacroname.dot`,
`test/golden/refs/optmacroname.svg`.

## Commit

`fix(parser): accept and ignore attribute macro names as graphviz does`
