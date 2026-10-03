# Native oracle for engine ports

`/tmp/ghl` (the survey's headless GVBINDIR) links only `core` + `dot_layout`, so
neato/fdp/sfdp are not available there. For this mission use a scratch GVBINDIR
with all three plugins:

```sh
O=<scratchpad>/gvall; mkdir -p $O
for p in core dot_layout neato_layout; do
  ln -sf ~/git/graphviz/build/plugin/$p/libgvplugin_$p.* $O/
done
GVBINDIR=$O ~/git/graphviz/build/cmd/dot/dot -c
GVBINDIR=$O ~/git/graphviz/build/cmd/dot/dot -Kneato -Tplain in.gv
```

Compare node positions from `-Tplain` (or the xdot draw ops via the existing
`test/golden/compare-xdot.ts`) with the port's `render(parse(src), 'plain',
{ engine })`, within the engine's tolerance (ADR-4). Under estimate text
metrics (no pango plugin) both sides measure text identically.

Pitfalls (from error-hierarchy):
- Run comparison loops under `bash`, not `zsh` (zsh does not word-split
  unquoted variables).
- Never edit `src/` while a gate runs.

Record per port: the inputs, the command, max |Δ| per coordinate, and the verdict
in the decision journal.
