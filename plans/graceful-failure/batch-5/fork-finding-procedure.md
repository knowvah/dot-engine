<!-- SPDX-License-Identifier: EPL-2.0 -->
# Fork-finding procedure (T10–T13)

Every batch-5 task follows these steps. The task file supplies the finding,
the recorded mechanism and the slug.

## Rules that apply to every step

- **Never open an MR** (stop 11). **Never** file anything on
  graphviz/graphviz (stop 11).
- **Never write to `~/git/graphviz*`.**
- **Never present a mechanism without instrumented values** (stop 9).
  Label anything unproven a hypothesis, and in that case **do not file**.
- The maintainer reads every line before any upstream MR (graphviz ban
  policy). Write the fix as small and plain as possible.
- Fork repo: `/Users/scottseely/git/sseely/graphviz`. `origin` is
  gitlab.com/sseely/graphviz and `upstream` is gitlab.com/graphviz/graphviz.
  Use absolute paths with `git -C`.

## Steps

1. **Check for a duplicate.**
   `glab issue list -R graphviz/graphviz --search "<keywords>" --all` and
   `glab mr list -R graphviz/graphviz --search "<keywords>" --all`.
   If one is found, record it in the draft and **stop this task** (push
   forward; no substitute).
2. **Check upstream main.** `git -C … fetch upstream`. Read the function at
   `upstream/main`. If it is already fixed, record the sha and stop this
   task.
3. **Repro.** Write a minimal `.dot` file and run it on the **pristine**
   oracle (`ORACLE_PRISTINE_DOT_BIN`, GVBINDIR from `oracle-paths.mjs`).
   Shrink it until removing any node, edge or attribute makes the defect
   vanish. Crashes: give the exit code over N runs. Undefined behaviour:
   use an ASan build if one is needed (next step).
4. **Instrument.** Create the worktree
   `git -C /Users/scottseely/git/sseely/graphviz worktree add /Users/scottseely/git/sseely/graphviz-wt/<slug> -b fix/<slug> upstream/main`.
   - Build it with CMake (bison/flex flags as in
     `test/corpus/build-carried-oracle.sh`), adding
     `-DCMAKE_C_FLAGS=-fsanitize=address` when that is useful.
   - Add temporary `fprintf(stderr, …)` tracing at the suspected site and
     capture the actual values (pointers, indices, sizes).
   - **Remove all tracing before committing.**
5. **Test commit.** "add a test case for <short description>". Write a
   pytest in the place graphviz keeps regression tests (follow
   `f9d1cc145` on branch `plain-canon-use-after-free` as the model), marked
   `@pytest.mark.xfail(strict=True)`. Run it: it must fail, and since the
   marker is there, it reports as xfail.
6. **Fix commit.** "<component> <function>: fix: <description>". Remove the
   marker and add a `### Fixed` entry under Unreleased in `CHANGELOG.md`.
   - Run the test: it must pass.
   - Run black, isort and pylint on the test, and `ci/clang_format.py` on
     the C file (if `output.c`, it is excluded).
   - Fork commits are unsigned (the fork has `commit.gpgsign=false`).
7. **Push.** `git -C /Users/scottseely/git/sseely/graphviz-wt/<slug> push origin fix/<slug>`.
8. **File the fork issue.** `glab issue create -R sseely/graphviz`. The
   body must include:
   - the repro `.dot` and the command;
   - observed versus expected behaviour;
   - the mechanism at `file:line` (as of `upstream/main`) with the
     instrumented values;
   - history: `git log -S'<key expression>' --oneline -- <file>`, naming
     the introducing commit if found;
   - what was checked and what was **not** checked;
   - the fix branch link;
   - "dot-engine port behaviour: <what the port does>".
9. **Write the draft** at `plans/graceful-failure/upstream-drafts/<slug>.md`:
   - the upstream issue text;
   - the MR description in the style of !5152;
   - the fork issue URL, branch and shas;
   - a checklist headed "maintainer must read every line".

## Acceptance criteria (every task)

- Given a duplicate upstream, or upstream main already fixed, when checked,
  then no fork issue is filed and the draft records why.
- Given the xfail test, when run against the fork build, then it reports
  xfail before the fix and passes after.
- Given the fork issue, when read, then it has the repro, `file:line`, the
  instrumented values, the `git log -S` history, and what was checked.
- Given the fork, when listed, then the branch `fix/<slug>` exists on
  `origin` and no MR exists for it.

## Observability, rollback, commit

- Observability: N/A.
- Rollback: reversible. The fork branch can be deleted and the issue
  closed.
- dot-engine commit (the draft only):
  `docs(plans): draft upstream fix for <slug>`.
