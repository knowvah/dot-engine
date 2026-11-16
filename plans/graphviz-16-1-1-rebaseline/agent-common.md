# Common rules for #147 task agents (read fully before starting)

You implement one task of the mission `plans/graphviz-16-1-1-rebaseline/` in dot-engine, a faithful
TypeScript port of Graphviz. This mission moves the oracle from graphviz 16.1.0 to 16.1.1. It changes test
infrastructure, registries and docs only: **never edit `src/`**.

## Where you work
- Only in the worktree `~/git/knowvah/dot-engine-1611` (or the path in your prompt). `node_modules` is a
  symlink; run `npm run parser:regen` once if `src/parser/dot.js` is missing. Never edit the main checkout
  `/Users/scottseely/git/knowvah/dot-engine`, `~/git/graphviz`, `~/git/graphviz-16.1.1` or
  `~/git/knowvah/plantuml-ts`.
- Read first: project `CLAUDE.md`, your task file, [decisions.md](decisions.md), `docs/adr/0002-graphviz-16.1.1-oracle.md`,
  `test/corpus/oracle-paths.mjs`. Notes worth reading: `.agent-notes/post-16-1-followups-3.md` (native harness
  technique). Known last-bit libm variance (macOS `pow`, `hypot`, `sin`/`cos`/`atan2`) is accepted, not a change.
- Oracles: 16.1.1 `~/git/graphviz-16.1.1/build/cmd/dot/dot` with `GVBINDIR=/tmp/ghl1611` (dot) or
  `/tmp/ghl1611-all` (other engines); 16.1.0 `~/git/graphviz/build/cmd/dot/dot` with `/tmp/ghl` or the
  16.1.0 all-engines dir named in your prompt. Never use homebrew dot or WASM.
- Scratch files go in the scratch dir in your prompt, not the repo.

## How you work
- TDD for any script change: the test first, asserting specific values.
- Diagnosis mode for every discrepancy (`~/.claude/rules/diagnosis.md`): read the C, dump actual values, state
  mechanism, origin `file:line`, causal chain and what you ruled out.
- Native fdp, sfdp, neato and twopi are nondeterministic on some ids: compare against ≥8 native runs before
  calling a difference real.
- No magic literals: oracle paths come only from `test/corpus/oracle-paths.mjs` (the fitness test enforces it).
- Every new file carries `// SPDX-License-Identifier: EPL-2.0` (or the comment form of its language).

## What you hand back
- Do not commit, and do not write `decision-journal.md`, `plans/decision-journal.md`, `.agent-notes/` or GitHub
  issues: the orchestrator does.
- Return only the structured result your task file asks for: files changed, gate results with counts, findings
  as one line each. No preamble, no trailing summary.
- If you would need a file outside your write-set, or a `src/` change, stop and say so.
