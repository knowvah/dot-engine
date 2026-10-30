# Batch 2b: images and colours

Runs as one wave with batch 2a, after T0, in parallel worktrees. These write-sets do not
overlap with 2a's or with each other's:

- T2 owns `poly-init.ts` and `shapes.ts`.
- T3 owns the fill sites.
- T4 owns `svg.ts`.
- T6 owns the image-type path.

T9 (batch 3) edits `shapes.ts` and `usershape.ts` again, so it waits for T2 and T6.

The native probes in `src/gvc/__fixtures__/p7/` are the spec (AD-7). Where the follow-up
text disagrees with native, native wins and the journal says so.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T2](T2-poly-init-keying.md) | Item 97: key `poly_init` on `usershape && name == custom` | typescript-pro | `src/common/poly-init.ts`, `src/common/shapes.ts` (+ tests) | T0 | [x] |
| [T3](T3-colon-fill-names.md) | Items 98–99: `":red"` in point-node and edge-arrowhead fills | typescript-pro | `src/common/poly-gencode.ts` (point path), `src/render/color-resolve.ts`, the T0-named arrow-fill site (+ tests) | T0 | [x] |
| [T4](T4-svg-rotation.md) | Item 100: `core_loadimage_svg` rotation branch | typescript-pro | `src/render/svg.ts` (+ tests) | T0 | [x] |
| [T6](T6-image-type.md) | Item 101: `imagetype` sniff, `No loadimage plugin`, `FT_NULL` | typescript-pro | `src/gvc/image-type.ts` (new), `src/gvc/usershape.ts`, `src/gvc/render-usershape.ts`, `src/render/json.ts` (+ tests) | T0 | [x] |
