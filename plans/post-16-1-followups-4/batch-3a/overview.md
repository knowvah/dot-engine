# Batch 3a: clip/arith fidelity and striped clusters

Parallel worktrees after batch 2 (run alongside 3b and 3c). Write-sets are disjoint. Each
FMA task (T10–T13) needs T0's disassembly and follows AD-4: one commit per site, output
only toward the oracle, a no-fusion finding recorded and left unchanged. T14 → T24
(`device-cluster.ts`). Batch 3 gate: survey + walks of the affected engines after 3a–3c
land.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T10](T10-splines-clip.md) | Item 48: `SplineClipHelper` DIST, `sphereCtx`, `bezierClip` | typescript-pro | `src/common/splines-clip.ts` | T0 | [ ] |
| [T11](T11-compound-clip.md) | Item 49: compound dist, `clipToNodes` `endp -= 3` | typescript-pro | `src/layout/dot/compound.ts`, `edge-route-routing.ts` | T0 | [ ] |
| [T12](T12-tail-arrow-clip.md) | Item 50: `tailArrowEndClip` as C's reversed form | typescript-pro | `src/layout/dot/edge-route-clip.ts` | T0 | [ ] |
| [T13](T13-cdt-sqrt3.md) | Item 51: GTS enclosing-triangle constants | typescript-pro | `src/layout/neato/cdt-surface.ts` | T0 | [ ] |
| [T14](T14-striped-clusters.md) | Item 62: draw cluster `style=striped` | typescript-pro | `src/gvc/device-cluster.ts`, `src/render/svg-cluster.ts`, xdot cluster path | T6 | [ ] |
