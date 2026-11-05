# post-16-1-followups-10 mission — observations (2026-11-04)

## Observation: native segfaults on a T op in a graph _draw_ or _background
- **Context**: T4 golden inputs for `init_xdot`'s replay.
- **Finding**: `emit_xdot`'s `xd_text` passes `op->span`, built only by `xdotBB` (`neatoinit.c:560`, neato `-n`). Under dot, `digraph G { _draw_="T 25 25 0 20 3 -run "; a->b }` exits 139. `init_xdot` reads `_background` first and ignores `_draw_` when it is set. A hand-typed op with a wrong length prefix parses with no warning and silently changes the output.
- **Impact**: no native ref exists for text ops in a replay; check a probe's drawn output, not only its stderr.
- **Confidence**: High

## Observation: native plain prints freed memory for non-ASCII labels
- **Context**: T5, `graphs-b56`.
- **Finding**: `canon` (`lib/common/output.c:103-108`) frees the refstr `agstrcanon` returned, because `_agstrcanon` treats `!isascii` as an id char and returns its argument. One varying byte then NUL prints as the label, in the first render too.
- **Impact**: a `plain` comparison with native on non-ASCII labels is unreliable.
- **Confidence**: High

## Observation: sfdp's drift is the repulsive pow's last bit
- **Context**: T2, item 121.
- **Finding**: with the real macOS `pow` given to the port, 288 of 292 non-passing ids have bit-identical solver traces. Math.pow at y=2 and y=0.5 misses macOS `pow` (1283 and 1330 per 1M) and at y=1.5, 2.8, 3 misses 0; armPow misses about 0.17% everywhere. macOS `pow(x,2)` differs from `x*x` on 1283 of 1M.
- **Impact**: part 8's "Math.pow is the platform libm" has exceptions at y=2 and y=0.5. `harness/T2/libmpow.c`, a Node-API addon, tests a libm hypothesis across the corpus without recording values.
- **Confidence**: High for the counts; the reason V8 differs at y=2 is unknown.

## Observation: native sfdp with overlap=false did not repeat on the ids sampled
- **Context**: T2.
- **Finding**: `nshare-overlap_neato` gave 4 different `xfinal[0]` last bits in 4 runs, and `linux.x86-neatosplines_neato1` gave 3 xdot hashes in 12 runs. Cause not traced.
- **Impact**: sample native several times before reading a miss on these as a port bug.
- **Confidence**: High for the two ids; other `overlap=false` ids are inferred.

## Observation: the dot writer builds node pos apart from write-back
- **Context**: T1 (uncommitted at this note).
- **Finding**: `src/render/dot/agwrite.ts` `nodeAttrs` builds `pos` itself, and `write-back.ts` does so for `attach_attrs`; a `pos` change needs both. `initLayout`'s hasPos branch in `stress-kernel.ts` copied only x and y.
- **Impact**: task specs that name only one writer miss the other.
- **Confidence**: High

## Observation: circo's port decomposes the real graph where C decomposes a derived one
- **Context**: T3 (held at this note).
- **Finding**: `circular.ts:91` calls `ccomps(g)`; C's `circularinit.c:126` calls `ccomps(dg)`. Harmless until `ccomps` reuses a user's subgraph. twopi and sfdp `agdelete` each component (`twopiinit.c:146`, `sfdpinit.c:289`), which removes a reused user subgraph from `dot` output; circo, neato and osage print it.
- **Impact**: any `ccomps` behaviour change on user subgraphs reaches circo.
- **Confidence**: High
