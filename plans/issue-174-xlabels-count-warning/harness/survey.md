# Planning-time corpus sweep for the warning

Run 2026-11-17 on the 16.1.1 oracle (preflight passed for dot and neato).

**What ran.** Every `*.gv` and `*.dot` under `~/git/graphviz-16.1.1/tests`
(852 files), `-T dot`, stderr grepped for `labels positioned`, a 20 s
timeout per run, six in parallel (`find ... | xargs -P6 -n1 sweep-one.sh`):

- `dot` and `neato` (`sweep-one.sh` as committed);
- `fdp`, `circo`, `twopi`, `osage`, `sfdp`, `patchwork` (the same script with
  the engine list swapped).

**Result.** No corpus input makes native print the warning under any of the
eight engines. Inputs that ran past 20 s were not checked (the timeout drops
their stderr); none of the 22 label inputs below is among them.

The 22 inputs matching `xlabel|headlabel|taillabel|forcelabels` were also run
under all eight engines with a 60 s timeout: none warns.

```
144_no_ortho.dot 144_ortho.dot 1898.dot 1949.dot 2183.dot 2239.dot 2592.dot
2613.dot 2782.dot 2801.dot graphs/arrows.gv graphs/arrowsize.gv
graphs/colors.gv graphs/honda-tokoro.gv graphs/newarrows.gv graphs/url.gv
graphs/xlabels.gv linux.x86/arrows_dot.gv macosx/arrows_dot.gv
nshare/arrows_dot.gv share/newarrows.gv windows/newarrows.gv
```

**Consequence for gate 6.** The corpus cannot show the warning appearing; it
can only show it appearing where it should not. Gate 6's corpus set is the 22
label inputs under all eight engines: every `headErr` must equal `baseErr`, and
`head` must equal `base`. The probes in `probes/` carry the positive cases.
