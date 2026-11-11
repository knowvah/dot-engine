# Follow-up issues to file (issue #167)

Both defects were reproduced against the 16.1.0 oracle at planning. The planning session
could not file them: `gh issue create` was denied there. T1 files them under the queue
rules (`gh issue create --label follow-up --label bug`), after checking that neither
already exists. Neither is part of #167.

## 1. dot/xdot: attribute names are printed without canonicalization

C prints every attribute name through `write_canonstr` (`lib/cgraph/write.c:290` in
`write_dict`, `:502` in `write_nondefault_attrs`). The port concatenates the raw key
(`src/render/dot/attrs.ts:173,205,294,329,341,371,408`), so a name that needs quotes is
printed bare and the output does not reparse.

Evidence, `digraph { "my attr"=1; node [label=x, "n k"=2]; a ["x y"=3]; a -> b ["e k"=4]; }`,
`-Tdot`: native prints `"my attr"=1`, `"n k"=2`, `"x y"=3`; the port prints `my attr=1`,
`n k=2`, `x y=3`. `-Txdot` differs too.

**Done when:** a native ref with attribute names that need quotes, on graph, node and edge
scopes and in the default statements, is byte-equal on `-Tdot` and `-Txdot`.

## 2. html-like node and subgraph names keep the port's marker outside dot/xdot

Found while planning #167, which fixes only how `-Tdot`/`-Txdot` print such names and the
root graph's name. The parser keeps the port's html marker (U+0001,
`src/common/html-string.ts`) on node and subgraph names, and code that reads `n.name` or
a subgraph's name sees it.

Evidence, 16.1.0 oracle,
`digraph <root h> { subgraph <cluster_a> { x [label=y]; } <nn>; <cc> [label="\N"]; <aa> -> <bb> [label="\T to \H"]; }`:

- `subgraph <cluster_a>` is a cluster in native (`-Tsvg` has `clust1` and
  `<title>cluster_a</title>`). The port lays out no cluster, because the marker hides the
  `cluster` prefix, so the layout differs (native bb 303.32 x 140.8, port 287.32 x 124.8).
- `-Tplain`: native prints `node <nn> ...` with an empty label field. The port prints the
  name quoted, with the marker, and repeats it as the label.
- `-Tsvg` holds 18 U+0001 bytes in titles, comments and text, and `-Tplain` 12. The port
  also warns `no value for width of ASCII character 1`.

**Done when:** that input is byte-equal to native on `-Tsvg`, `-Tplain`, `-Tjson0` and
`-Tdot`, and no output contains U+0001.
