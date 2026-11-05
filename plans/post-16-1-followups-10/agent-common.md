# Common rules for part-10 task agents (read fully before starting)

You are one of several agents implementing one task of the mission `plans/post-16-1-followups-10/` in
dot-engine, a faithful TypeScript port of Graphviz. The C at `~/git/graphviz` (graphviz 16.1.0) is the
specification.

## Where you work
- Work ONLY inside your worktree (path given in your prompt). `node_modules` is a symlink; the parser is
  already generated. Never edit the main checkout at `/Users/scottseely/git/knowvah/dot-engine`, and never
  edit `~/git/graphviz` (read-only; you may compile scratch harnesses against its build tree, or rsync it to
  your scratch dir to add env-gated traces). Never write in `~/git/knowvah/plantuml-ts`.
- Read first, in your worktree: `CLAUDE.md`, your task spec, `plans/post-16-1-followups-10/decisions.md`, and
  `.agent-notes/post-16-1-followups-9.md`.
- T0's fixtures are committed under `src/layout/neato/__fixtures__/dim/`, `src/layout/sfdp/__fixtures__/dim/` and
  `src/layout/pack/__fixtures__/cc-reuse/`. T0's rows are in `plans/post-16-1-followups-10/decision-journal.md`.
  Older native harnesses are under `plans/post-16-1-followups-{7,8,9}/harness/`.
- Oracle: `~/git/graphviz/build/cmd/dot/dot` (16.1.0). Use
  `GVBINDIR=/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/ghl16-all`
  for every engine (dot may also use `/tmp/ghl`). Never use homebrew dot or WASM.
- Scratch files go in your own scratch dir (given in your prompt), not the repo.

## How you work
- TDD: tests first, from the native fixtures or harness values. Assertions on specific values.
- Diagnosis mode for every discrepancy (`~/.claude/rules/diagnosis.md`): instrument, dump actual values, state
  the mechanism before changing code.
- Port faithfully: keep C function boundaries, every branch, C order; no optimizing or simplifying. Every ported
  symbol carries `/** @see lib/...:fn */`. Hazards: C calloc zeroes (coerce `?? 0`), int assignment truncates,
  `round()` is half-away-from-zero, C `float` needs `Math.fround`/`Float32Array`.
- TypeScript strict, no `any`, browser-safe (no Node built-ins or `process.env` in `src/`), ES modules,
  `// SPDX-License-Identifier: EPL-2.0` on new files.
- Complexity limits are enforced by a PostToolUse hook that BLOCKS writes: 500 lines/file, 30 NLOC/function, CCN 10,
  5 parameters. A file already over 500 lines may not grow. Never add to any complexity-ignore list. Split along C
  function boundaries (AD-11).
- Golden Gate 4 is a per-file line-count ratchet (`test/golden/line-limit-baseline.txt`). Check it if you touch a
  listed file.
- The 22 ipsep and 49 model probes must stay green (stop 7). Never unfuse the stress kernel.
- Diagnostics text is native byte for byte, via `agerr.ts`; warnings go to `console.warn`. To compare multi-format
  stderr use the context API (`createDefaultContext` + `ctx.layout` + `renderWithContext`), not repeated `render()`
  calls.
- Layouts that vary with `pow`, `hypot` or similar are accepted (PR 119). If a new layout fixture fails under the libm
  gate in the README, replay macOS's values in the test as `kk-large` does (`models-probes.test.ts`). Do not change
  runtime code for it.
- `grep` here is ugrep and skips some sources as binary (`src/render/json.ts`): use `/usr/bin/grep` or `grep -a`.
- Stay inside your write-set. If you need any other file, STOP and report (stop 1).
- If the same check fails 3 times on the same approach, stop and report the diagnosis artifact. If native behaviour
  can't be reached within your budget or the write-set, do not commit partial work: report the full artifact (park).

## Gates you run (in your worktree) before committing
`npm run typecheck` (exit 0), your test files via `npx vitest run <files>`, the libm gate on any new layout fixture test,
then `npm test` once (exit 0). Do not run `test/golden/gates.sh`, bytediff, surveys or walks: the orchestrator runs those
when landing your commit. If `npm test` fails only in `xdot-public.branch.test.ts` on a 5 s timeout, rerun that file alone.

## Commit
- Exactly one commit per task, with the subject your spec gives. Conventional Commits, subject ≤72 chars, lowercase, no
  period; all lines ≤80; a body (why, not what) when more than 3 files change; NO attribution of any kind.
- Write the message to a file in your scratch dir, then run, as a standalone command (never chained with `&&`):
  `git -c commit.gpgsign=false commit -F <msgfile>`
- Never push, open a PR, sign, rebase, `git reset --hard`, or touch `main` or the mission branch. Do not write
  `plans/**/decision-journal.md`, `plans/decision-journal.md`, `plans/post-16.1-followups/README.md` or `.agent-notes/`:
  report those findings in your hand-back.

## Hand-back (your final message; return only this, no preamble or summary)
```
TASK: TN   STATUS: done | parked | stopped(<stop #>)
COMMIT: <sha> <subject>        (or none)
FILES: <one per line, with +/- line counts>
TESTS: typecheck <rc>; <test files> <pass/fail counts>; npm test <counts>; libm gate <result or n/a>
ARTIFACT: mechanism / origin file:line / causal chain / ruled out
NATIVE-VS-SPEC: any place native contradicted the spec or follow-up text
JOURNAL: 1-3 journal-ready sentences (evidence paths included)
NOTES: .agent-notes-worthy observations (factual, one per line) or "none"
FOLLOW-UPS: pre-existing problems found outside your write-set, or "none"
```
