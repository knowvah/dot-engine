# issue-167 mission — observations (2026-11-10)

## Observation: the root graph's html-like name is plain text in cgraph
- **Context**: `digraph <h g> { ... }` printed `digraph "\x01h g" {` under `-Tdot`; native prints
  `digraph "h g" {`, while `subgraph <hs>` and a node `<n>` print angle-bracketed.
- **Finding**: the lexer interns an html string with `agstrdup_html(ctx->G, ...)`
  (`lib/cgraph/scan.l:233`). When the root's name is scanned `ctx->G` is still NULL, so the string
  lands in the global dictionary. `agopen` → `idmap` → `agstrdup(g, str)` (`lib/cgraph/id.c:52`,
  `refstr.c:401-415`) looks for an html ref with that pointer in the new graph's own dictionary,
  finds none, and copies the name as text. Names scanned later are interned in `G` and keep the
  flag. The port strips the marker from the root's name in `buildFromAst` (`src/parser/builder.ts`).
- **Impact**: a root `Graph.name` never starts with `HTML_STRING_MARK`; node and subgraph names
  can, and every reader of `n.name` outside dot/xdot still sees the marker (#206).
- **Confidence**: High

## Observation: `bd-job.ts` output is UTF-8 even when the input was read as latin1
- **Context**: gate 6, comparing corpus `1367` (not valid UTF-8) with native byte for byte.
- **Finding**: `test/tools/bd-job.ts` decodes an invalid-UTF-8 input as latin1 and writes the
  result with `process.stdout.write(string)`, i.e. as UTF-8. Native copies the raw byte, so a name
  byte 0x80 is `80` in native's output and `C2 80` in the job's, and an output that is equal looks
  unequal. Writing the string back with `Buffer.from(out, 'latin1')` when the input was latin1
  gives byte equality (`1367` on `-Tdot`/`-Txdot`).
- **Impact**: a byte comparison against native on a latin1-read corpus input (`1367`, `1472`) must
  encode the port's output in the input's encoding. Bundle-vs-bundle bytediffs are unaffected.
- **Confidence**: High

## Observation: native cannot print `2064` even without a layout
- **Context**: gate 6 asked for `2064` (13,719 html-like names, 5.2 MB) against native.
- **Finding**: `dot -Tcanon 2064.dot`, which runs no layout, did not finish in 300 s on the 16.1.0
  oracle; the recorded survey failure for `-Tsvg` is a timeout at 7,789 s. A sample made of the
  file's first 400 lines, its first 200 edge statements and `}` renders natively in seconds.
- **Impact**: evidence about `2064`'s names has to come from a truncated sample, not the full file.
- **Confidence**: High (the timing; the cause inside native was not looked at)

## Observation: native `-Tplain` prints byte 0x02 as the label of an html-named node
- **Context**: reproducing #206's evidence, `digraph <root h> { ... <nn>; ... }`, `-Kdot -Tplain`.
- **Finding**: native's line is `node <nn> 1.5972 1.4833 0.75 0.5 <0x02> solid ellipse ...`: the
  label field is one byte 0x02, the same on three runs, for every html-named node with the default
  label.
- **Impact**: a port fix for #206 has to reproduce that byte to be byte-equal on `-Tplain`; where
  it comes from in C is not diagnosed.
- **Confidence**: High (the output), Low (the cause)
