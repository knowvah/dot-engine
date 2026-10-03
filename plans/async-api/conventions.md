# Conventions shared by every task

## Quality bar
- TDD (tests first). Strict TS, no `any`, SPDX header on new files.
- Complexity hook: ≤30 NLOC/function, CCN ≤10, ≤5 params (options object), files ≤500 lines.
- No module-level mutable `let` (test/architecture/module-globals.fitness.test.ts).
- Browser-safe: no Node built-ins; feature-detect `document`, `document.fonts`.
- Tests run in vitest's node environment: stub `FontFaceSet` with a small fake;
  use `@xmldom/xmldom` (devDependency) for DOM documents; never add jsdom.
- Agents run only `npx tsc --noEmit --stableTypeOrdering`, `npx tsgo --noEmit`,
  `npx vitest run <their files>`; no npm scripts, no git commit/stash/checkout.

## Observability / rollback (every task)
Observability: N/A — library, no new observable operations (fontIssues +
console.warn are the user-visible signal). Rollback: Reversible (revert commit).

## Corpus gate
Sync output must not change. Reuse the v2-silent-gaps harness
(`<scratchpad>/gate/{one.mjs,jobs.sh,run.sh}`; see
plans/v2-silent-gaps/corpus-gate.md): esbuild bundle of 1ca08402 as base, every
golden input × 8 engines × {svg, xdot} + corpus dot/svg, run detached; diff must
be empty (a one-side timeout is re-rendered alone on both bundles).

## Browser check (T6)
Python venv in the scratchpad (`python3 -m venv`, `pip install playwright`),
reuse ~/Library/Caches/ms-playwright or system Chrome. Serve a scratch page that
imports `dist/index.js` (after `npm run build:js`) and loads a `@font-face` web
font; verify: renderSvgInto inserts an `<svg>` into `#graph`; measured label
width with the web font differs from the fallback; a 1 ms timeout yields a
`timeout` issue; a `javascript:` href is scrubbed. Record values in the journal.
