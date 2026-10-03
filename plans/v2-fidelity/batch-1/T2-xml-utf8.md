# T2: `gvXmlEscape` UTF-8 entities from code points

## Context

Read `CLAUDE.md` and `../decisions.md` ADR-5. `src/util/xml.ts` `utf8Entity` /
`utf8ByteLen` / `decodeUtf8` (around lines 130-185) port C's byte-level decode
(`~/git/graphviz/lib/util/xml.c:109-175`) but run it on JS UTF-16 code units, so
`'ÿ'` (U+00FF) throws "malformed UTF-8". In C, `flags.utf8` is set only by
`xml.c`'s standalone tool (`:219`); no library caller sets it, in C or the
port. The defect is latent but real.

## Task

In UTF-8 mode, a character > 0x7F is emitted as `&#x<hex code point>;`, using
`codePointAt` (advance 2 units for astral characters). That equals C's decoded
scalar for valid UTF-8 input. A lone surrogate (the JS analogue of malformed
UTF-8) throws the same `RenderError RENDER_ERROR` as today. Lowercase hex,
matching C's `PRIx32`. Keep the existing function boundaries where you can, and
journal any merge.

## Oracle

Build C's tool: `clang -DTEST_XML -I ~/git/graphviz/lib -I
~/git/graphviz/build ~/git/graphviz/lib/util/xml.c -o <scratch>/xmltool`
(adjust includes/defines until it compiles). Run `xmltool --utf8 in out` on a
UTF-8 file containing `ÿ é 中 😀 & < x`, and require byte-identical output from
the port.

## Write-set

`src/util/xml.ts`, `src/util/xml.utf8.test.ts` (new).

## Acceptance criteria

- utf8 mode: `'ÿ'` → `&#xff;`, `'中'` → `&#x4e2d;`, `'😀'` → `&#x1f600;`
  (one entity, not two).
- Output matches C's tool byte-for-byte on the oracle file (paste both into the
  journal row).
- A lone surrogate `'\ud800'` throws `RenderError` with code `RENDER_ERROR`.
- With utf8 off, output is unchanged for all existing tests.

## Quality bar

TDD (tests first). Strict TS, no `any`, SPDX header on new files, `@see` C
references on every ported symbol. Complexity limits: ≤30 NLOC/function,
CCN ≤10, ≤5 params. Run `npx tsc --noEmit --stableTypeOrdering`, `npx tsgo
--noEmit` and your own tests only; do not run npm scripts (pre-scripts race
with parallel agents). Do not git commit, push, stash or checkout.

## Observability

N/A — no new observable operations.

## Rollback

Reversible (revert commit); irreversible in practice once 2.0.0 publishes.

## Commit

`fix(xml): escape UTF-8 by code point instead of UTF-16 unit`
