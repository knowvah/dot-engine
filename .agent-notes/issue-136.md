# issue-136 mission — observations (2026-11-10)

## Observation: a probe that pipes a UTF-8-decoded input to native invents a divergence
- **Context**: gate 6 of #136. The planning probe (`harness/node-fields.mts`) read each input with
  `readFileSync(file, 'utf8')` and passed the string to native on stdin.
- **Finding**: `graphs/b56.gv` is Latin-1. Decoding it as UTF-8 turns each accented letter into
  U+FFFD, native then measures three bytes where the file has one, and node widths come out wider
  (`Torwaechter.width` 1.4107 against 1.2487 from the file). Planning read the 33 differing fields
  as the freed-memory non-ASCII label class and excepted the id (AD-3). With the file path as
  native's input and `bd-job.ts`'s decode (UTF-8 if valid, else Latin-1) for the port, b56 equals
  native on every json0 node field under dot, neato, fdp, twopi, circo and osage.
- **Impact**: give native the file path, never a re-encoded string, and decode for the port as
  `test/tools/bd-job.ts` does. A "known non-ASCII class" verdict from a stdin probe needs
  re-checking against the file.
- **Confidence**: High (both probes' outputs, `file` reports `ISO-8859 text`)

## Observation: smoke ids x sfdp cannot be byte-equal to native in node `pos`
- **Context**: comparing head json0 node fields with native on all 49 smoke ids x 8 engines.
- **Finding**: 17 of the 49 sfdp rows differ in `pos` (249 fields with `graphs-polypoly` x osage's
  two), with `width` and `height` equal. 15 of the ids are `drift-exonerated` in
  `test/corpus/attribution-sfdp.json`; `graphs-ctext` and `graphs-shells` pass the sfdp xdot track
  at its 0.5 tolerance (deltas to 0.28) and still differ as strings. The other six non-dot
  engines were equal on every smoke row but `graphs-polypoly` x osage (accepted class A9).
- **Impact**: a queue brief whose pass condition is "no difference from native" on string values
  must leave sfdp out or name the accepted classes; #186 asks the maintainer how the queue's
  "changed output must equal native" rule applies to such rows.
- **Confidence**: High (`$TMPDIR` survey of 416 rows; registry files)

## Observation: native fdp is not deterministic on `graphs/fdp.gv`
- **Context**: the first survey pass reported 7 `pos` differences for `graphs-fdp` x fdp; a
  field-level recheck minutes later reported none.
- **Finding**: three consecutive native runs of `-Kfdp -Tjson0 graphs/fdp.gv` gave one layout
  twice (`e.pos` `296.98,18`, which the port prints) and another once (`268.63,18`).
  `parity-fdp.json` already marks the id `oracle-nondeterministic` for xdot.
- **Impact**: one native run is not a ref for this id; rerun before reading a difference as real.
- **Confidence**: High

## Observation: `render()` takes `json0` at runtime, so `bytediff.ts` can diff it
- **Context**: gate 5 for a json0-only change.
- **Finding**: `OutputFormat` omits `json0`, but the bundle's `render(graph, 'json0', ...)` works,
  and `BD_FORMATS=svg,xdot,json,plain,cmapx,json0` adds it to the smoke bytediff (2352 jobs, about
  two and a half minutes at 5 lanes). The default format list would have shown 0 changed jobs
  for this mission.
- **Impact**: a json0 change needs `json0` added to `BD_FORMATS`, or gate 5 passes vacuously.
- **Confidence**: High

## Observation: `json.ts` sits one line under its ratchet
- **Context**: replacing three `eff.set` lines with a call to `nodeLayoutAttrs`.
- **Finding**: the file was 723 lines on the base and is 722 now; the straightforward edit made it
  724 and would have tripped the brief's stop condition. `Map.set` chaining kept it under.
- **Impact**: the next change that adds lines to `json.ts` has to move code out first
  (`json-cluster-edge.ts` is the existing overflow file).
- **Confidence**: High
