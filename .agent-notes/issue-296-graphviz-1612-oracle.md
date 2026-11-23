## Observation: 16.1.2 instrumentation needs a hand re-apply in fdpgen/layout.c
- **Context**: Building the pristine 16.1.2 bisect build (#296) on branch `oracle/16.1.2` (worktree `~/git/graphviz-16.1.2`)
- **Finding**: The `GVTS_POS_DUMP` commit (`45244c1d0` on `oracle/16.1.1`) is a stable-stamp merge, so `git cherry-pick` refuses it. Its diff applies to 16.1.2 except `lib/fdpgen/layout.c`, which 16.1.2 clang-formatted (`704a546e9`). Re-applied there by hand in the new style; `oracle/16.1.2` = `44d0d0b8`, second parent `2a26ec7d4` "Stable release 16.1.2", dated with the tag's commit date. `gen_version.py` reports `16.1.2`.
- **Impact**: The next version move hits the same thing: apply `git diff <merge>^1 <merge>`, resolve, then `commit-tree -p HEAD -p <release commit>`.
- **Confidence**: High

## Observation: 16.1.2 plugin SOVER is 8.0.17
- **Context**: Same build
- **Finding**: Plugins are `libgvplugin_*.8.0.17.dylib` (16.1.1: 8.0.16). Harnesses under `plans/` that relink a plugin with a `sed` on `link.txt` hardcode 8.0.15 or 8.0.16 (`issue-142`, `issue-161`, `post-16-1-followups-10/T14`, `-11/T8`; `issue-149/recapture.sh` takes `GV_SOVER`).
- **Impact**: Reusing one of them against 16.1.2 needs the version changed in a copy; `plans/` is archaeology and stays as it is.
- **Confidence**: High

## Observation: noaddr.patch does not apply to 16.1.2
- **Context**: #296 "done when" harness checks (part 10's `twice.c`, `subg-after-free.c`, `noaddr.patch`)
- **Finding**: `twice.c` and `subg-after-free.c` build against 16.1.2; `subg-after-free subg.gv dot plain s twice` gives 3 renders identical to the recorded output. `plans/post-16-1-followups-10/harness/T14/noaddr.patch` fails 3 of 4 hunks on 16.1.2's `lib/fdpgen/layout.c` (clang-format, `704a546e9`); it still applies to 16.1.1.
- **Impact**: A rerun of the T14 experiment on 16.1.2 needs the patch regenerated against the formatted file.
- **Confidence**: High

## Observation: Homebrew flex is unusable for pristine builds too
- **Context**: Configuring the pristine 16.1.2 build
- **Finding**: The 16.1.1 pristine was configured with `/opt/homebrew/opt/flex/bin/flex` when it was 2.6.4; Homebrew is now 2.6.16 (YY_BUF_SIZE 2048, see `build-carried-oracle.sh`). 16.1.2 pristine uses `/usr/bin/flex` (2.6.4).
- **Impact**: Any future pristine build must pass `-DFLEX_EXECUTABLE=/usr/bin/flex`.
- **Confidence**: High
