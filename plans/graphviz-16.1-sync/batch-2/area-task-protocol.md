# Area task protocol (T7–T11)

Every Batch 2 task follows this. The task file adds only its area specifics.

1. Read the area's rows in `.agent-notes/gv16-triage.md` (summary table first).
2. For each `port` row, read the C change: `git -C ~/git/graphviz show <commit>`
   (16.1 source at `~/git/graphviz`, 15.x at `~/git/graphviz-15`).
3. TDD per row. First write a test pinned to native 16.1.0 output or C semantics
   (a unit test from the C, or a golden/`pt-issue` case the row moves), and see
   it fail. Then port the change with `/** @see lib/...:fn */` kept, and see the
   test pass.
4. Diagnosis mode on any surprise (`~/.claude/rules/diagnosis.md`): instrument
   the port or a scratchpad copy of graphviz. Never edit the graphviz trees (STOP 12).
5. Remove every id that now passes from `test/golden/known-failing.json`. Never
   add an id (STOP 10).
6. Run typecheck, `npx vitest run`, and `bash test/golden/gates.sh` in the
   worktree. Do not run the survey or bench; the orchestrator does at land time.
7. Hand back:
   - the commit sha;
   - rows ported (commit → src fn);
   - ids removed from the ratchet;
   - rows found to be refactor-only after reading (with reason);
   - observations for `.agent-notes`.

Quality bar: TypeScript strict; no `any` outside documented C-interop
boundaries; 90/90/90 coverage on changed files; complexity limits (hook-enforced).
Port every branch of the C change, and keep the C function boundaries and order
(CLAUDE.md "The C Source Is Sacred").

Rollback: Reversible (revert the commit). Observability: N/A — library code; the
SLIs are the survey verdicts and the ratchet length.
