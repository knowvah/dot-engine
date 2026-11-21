<!-- SPDX-License-Identifier: EPL-2.0 -->
# T3: Failure-site scanner

## Context

We need an inventory of where graphviz's C code fails (D5), joined to the
port's counterparts. Every ported symbol in `src/` carries a
`/** @see <path>:<function> */` tag, for example
`@see lib/common/emit.c:pop_obj_state (assert(obj) at emit.c:135)`. Formats
vary: some tags have a `lib/` prefix and some do not. The C source is
`~/git/graphviz-16.1.1/lib/` (read-only). The port's error classes are in
`src/errors.ts`: `InternalError`, `RenderError`, `ParseError` and
`HtmlParseError`.

## Task

Write **pure functions first**, then a thin CLI (testability rules).
Tests come first.

- `scanC(path: string, text: string): CSite[]` finds `exit(`,
  `graphviz_exit(`, `abort()`, `UNREACHABLE()`, `agerrorf(`, and
  `agerr(AGERR` followed by a `return` of a negative value or `NULL` within
  the same statement block. It records the enclosing function name
  (`ast-grep` via the `@ast-grep/napi` dev dependency if it is present,
  otherwise a brace-depth parser with tests), the line, and the first
  string-literal message. It excludes `assert(`.
- `scanPort(path: string, text: string): PortSite[]` finds
  `throw new (InternalError|RenderError|Error)(`, `agerr(`/`agerrorf`-style
  calls, and every `@see` tag. It records the enclosing symbol.
- `join(cSites, portSites): FailureSiteRow[]` links rows by `@see` C
  file + function and normalizes the `lib/` prefix. A C site whose function
  has no `@see` gets `port: null` and class `not-ported`. A port throw with
  no C site gets `c: null` and class `port-only`. Everything else is
  `unclassified`.
- Row ids are line-free and stable:
  `${cFile}#${cFunction}#${kind}#${n}`, or
  `port#${file}#${symbol}#${n}`, where `n` is the ordinal within the
  function.
- `cli.ts`: `npx tsx test/tools/failure-sites/cli.ts --c <libRoot> --src src --out <json>`.
  It merges with an existing registry and preserves the hand-edited fields
  (`class` if not `unclassified`, `status`, `links`, `note`). It prints
  counts by kind and class.

## Interface contract (output; consumed by T4, T7 and T14)

```ts
type CKind = 'exit'|'graphviz_exit'|'abort'|'UNREACHABLE'|'agerrorf'|'agerr-return'|'native-crash';
type PortBehaviour = 'throws-internal'|'throws-render'|'throws-error'|'agerr'|'agerr-recover'|'renders'|'absent';
type SiteClass = 'mirror'|'graceful'|'upstream-fix'|'port-bug'|'not-ported'|'port-only'|'unclassified';
interface FailureSiteRow {
  id: string;
  c: { file: string; function: string; kind: CKind; line: number; message: string | null } | null;
  port: { file: string; symbol: string; behaviour: PortBehaviour } | null;
  class: SiteClass;
  status: 'none' | 'proposed' | 'filed' | 'merged';
  links: { forkIssue?: string; forkBranch?: string; upstreamMr?: string; dotEngineIssue?: string; divergence?: string };
  note: string;
}
interface FailureSiteRegistry { generatedFrom: { cRoot: string; oracle: '16.1.1' }; rows: FailureSiteRow[] }
```

`c.line` is informational only (as of 16.1.1); it is never part of the id.

## Write-set

`test/tools/failure-sites/scan.ts`, `test/tools/failure-sites/scan.test.ts`,
`test/tools/failure-sites/cli.ts`.

## Read-set

- `src/errors.ts:100-140`
- Examples of `@see` tags: `src/gvc/job.ts:370-378`,
  `src/layout/dot/pack-components.ts:260-270`, `src/label/rectangle.ts:70-90`
- `package.json` (check for `@ast-grep/napi`; do not add dependencies
  without a stop)

## Acceptance criteria

- Given a C fixture containing `exit`, `graphviz_exit`, `UNREACHABLE`,
  `agerrorf`+`return -1` and an `assert`, when scanned, then exactly 4
  sites are returned, each with its enclosing function, and the `assert` is
  excluded.
- Given a TS fixture with `@see lib/x.c:fn` and `throw new InternalError`,
  when joined with a C site in `x.c:fn`, then the row links them with
  behaviour `throws-internal`.
- Given a C function with no `@see` in the port, when joined, then the row
  has `port: null` and class `not-ported`.
- Given an existing registry with a hand-set `class` and `links`, when the
  CLI re-runs, then those fields are preserved and the ids are unchanged.

## Quality bar

- 90% line, branch and function coverage on `scan.ts`.
- Lizard limits apply: functions of at most 30 NLOC, CCN of at most 10.
- No `any`.

## Observability

N/A: test tooling only.

## Rollback

Reversible.

## Commit

`test(tools): add failure-site scanner for c fatal paths`
