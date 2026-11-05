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

## Observation: dir=none is not undirected under mode=hier
- **Context**: T7, finding graphs that reach `mode=hier`'s smart init at `dim=2`.
- **Finding**: `dfsCycle` (`lib/neatogen/neatoinit.c:680-705`) treats `edists == 0` edges as out-edges and reverses back edges, so `dir=none` edges gain a direction and a connected 2-D graph takes IMDS. Reaching smart init at `dim=2` takes a graph with no edges and pinned nodes, or edges too short for `abs_tol` (`len=0.001`).
- **Impact**: count `embed_graph` and `IMDS_given_dim` hits before trusting a fixture's name for the path it takes.
- **Confidence**: High (agent's lldb counts; not re-run by the orchestrator)

## Observation: a harness call site does not reproduce the library's inlined vector shapes
- **Context**: T7, unit fixtures for the `mult_*` routines.
- **Finding**: `right_mult_with_vector_d` compiled at a harness call site was scalar and all-fused; the copies inlined in `_power_iteration` and `_stress_majorization_kD_mkernel` are 8-wide per their disassembly.
- **Impact**: a harness mismatch on these routines is not evidence of a port defect; read `otool` of the plugin per site.
- **Confidence**: Medium (agent-reported)

## Observation: the complexity hook does not reliably stop subagent writes
- **Context**: T1 and T7.
- **Finding**: T1's `userPos` (CCN 13) and T7's `selectPivots` (33 NLOC) were written with no block. The cause is not traced. The orchestrator's own Edit was blocked in the same session.
- **Impact**: run lizard on every task's `src/` files at landing; a quiet hook proves nothing.
- **Confidence**: High for the two cases; cause unknown

## Observation: native heap corruption under mode=hier with very short edges
- **Context**: orchestrator's T7 check.
- **Finding**: `mode=hier dim=3` with `len=0.001` dies by SIGBUS, SIGSEGV or SIGTRAP in 3 of 8 runs at 19 nodes and 8 of 8 at 27; 8 of 8 survive at 11, 38 and 58. The port renders and matches each surviving run.
- **Impact**: a native crash on this path may be size-dependent; repeat before fixing a fixture on one run.
- **Confidence**: High for the counts; the overrun's site is not proven

## Observation: fdp's second layouts vary with heap addresses
- **Context**: T14, `graphs-fdp` and `1581`.
- **Finding**: `lib/fdpgen/layout.c:466,501,637` compare node pointers, so the first cycle's frees and ASLR choose derived-edge direction and port order. Twelve stock runs give 2 classes on `graphs-fdp` `plain` (1 and 11) and `1581` `dot` (8 and 4). `harness/T14/noaddr.patch` orders by `ND_id` behind `GVTS_NOADDR=1` and repeats 8 of 8.
- **Impact**: repeat native before reading a second-render fdp miss as a port bug. Other fdp "process-global" rows may share this; only these two were measured.
- **Confidence**: High for the two ids

## Observation: a scratch plugin relink can write through a symlink
- **Context**: T14, rebuilding the neato plugin.
- **Finding**: relinking from `build/plugin/neato_layout/CMakeFiles/.../link.txt` with rebuilt `.o` files first works, with the gts path corrected to `/opt/homebrew/opt/gts`. Remove any symlink at the `-o` path first, or the link writes into the shared plugin dir.
- **Impact**: an unremoved symlink would corrupt `ghl16-all`, the oracle's plugin dir.
- **Confidence**: Medium (agent-reported)

## Observation: Edit refuses a file holding a raw NUL
- **Context**: T14, `src/layout/fdp/cluster-edges.ts`.
- **Finding**: the file's `edgeKey` held a raw NUL, so Edit refused it, `grep` treats it as binary, and `git diff` shows no text without `-a`. It now uses `\0`.
- **Impact**: other `src/` files with raw control bytes hide from `grep`; use `/usr/bin/grep -a`.
- **Confidence**: High
