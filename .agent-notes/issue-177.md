# issue #177: edge-label map area ids

Nothing novel in the library. Two observations about the queue's harness tools.

## Observation: `rowcheck.mjs` diff counts are one-sided
- **Context**: the extra probe `htmllabel.gv` in imap showed `baseDiff 0`, `headDiff 0`, `unchanged`, while native prints one more line than the port (`rect cell ...`, #252).
- **Finding**: `baseDiff` and `headDiff` in `plans/issue-17{6,7}-*/harness/rowcheck.mjs` count the port's lines that are missing from native (`extra(port, native)`), not native's lines missing from the port. A row with `0 0 unchanged` can still lack a native line; only the verdict `native` means byte equality.
- **Impact**: to claim a row equals native, read the verdict or `cmp` the outputs. A `toward` verdict with `headDiff 0` means the port is a strict subset of native's lines.
- **Confidence**: High (read in the script; reproduced on `htmllabel.gv`)

## Observation: bytediff's saved outputs carry a stderr trailer and are in job order
- **Context**: comparing `<out.json>.d/<n>.b.txt` with native stdout after a smoke bytediff reported 7 diffs.
- **Finding**: each saved file is the job's stdout followed by `\n--stderr--\n` and its stderr, so a plain `cmp` against native stdout always fails by two lines. `index.txt` lists `<n> <id>|<engine>|<format>` in job order (dot, neato, fdp, sfdp, twopi, circo, osage, patchwork), not alphabetically.
- **Impact**: cut the file at the last `\n--stderr--` before comparing, and take the engine of each `<n>` from `index.txt`.
- **Confidence**: High
