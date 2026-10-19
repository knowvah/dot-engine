<!-- SPDX-License-Identifier: EPL-2.0 -->

# Repository Inventory

Repos analyzed: the current project (`dot-engine`) plus its directly related
sibling in `~/git`. It was already cloned locally; no new clones were
required.

| Repo | Language | Runtime | Framework | Database | Key Deps | Entry | Notes |
|------|----------|---------|-----------|----------|----------|-------|-------|
| dot-engine | TypeScript 6 (ES2022, strict) | Node >= 22 (Volta 26.3.1) + browser/Worker | none (zero runtime deps) | — | esbuild, peggy, vitest, vitepress, typedoc | `src/index.ts` → `renderSvg` / `renderSvgAsync` / `render` | This project; faithful port of C Graphviz |
| graphviz | C | native binary | none | — | CMake, libgvc | `lib/` (cgraph, dotgen, …) | Canonical C spec and conformance oracle (gitlab upstream, 16.1.0) |

## Per-repo detail

### dot-engine (this project)

- **Runtime versions**: TypeScript `^6.0.0` (6.0.3 installed), target ES2022,
  `module: NodeNext`, `strict: true`. `engines.node` is `>=22.0.0`; Volta pins
  Node 26.3.1. Designed to run in a browser with **zero runtime dependencies**
  and no Node-only APIs. `canvas` is an optional peer dependency that `src/`
  never imports. `@typescript/native-preview` (tsgo) backs the
  `typecheck:ts7` script.
- **Languages**: TypeScript only (plus a Peggy grammar compiled to the DOT
  parser).
- **Key components**: eight layout engines (`dot`, `neato`, `fdp`, `sfdp`,
  `twopi`, `circo`, `osage`, `patchwork`), a DOT parser, a render pipeline,
  a programmatic graph-builder API, and an async layer (`src/async/`) that
  prefetches fonts and images. 725 `.ts` files including colocated tests.
- **Databases**: none.
- **External services**: none. The I/O seams are caller-supplied hooks:
  `setImageSizer` (image intrinsic dimensions), `setImageResolver` (image
  bytes for `inlineImages`), `setTextMeasurer`, and the async options
  `imageSizer`, `imageResolver` and `fontSet` (a `FontFaceSet`-like, default
  `document.fonts` or the Worker's `self.fonts`).
- **Entry points**:
  - `@knowvah/dot-engine` (root) → `renderSvg(dot, engine)`, `tryRenderSvg`,
    `renderSvgAsync`, `renderSvgInto`, `render(ctx, g, format)` (as
    `renderWithContext`), `parse`, plus everything in `/api` and `/render`.
  - `@knowvah/dot-engine/api` → `createGraph`, `addEdge`, `getLayout` (geometry
    snapshot).
  - `@knowvah/dot-engine/render` → `render(g, format, opts)`, `renderAsync`,
    `getDrawOps`.
  - Output formats: `svg`, `json`, `dot`, `xdot`, `plain`, `imap`, `cmapx`.

### graphviz (C — canonical spec)

- **Runtime versions**: C, built natively with CMake; the oracle is the
  `oracle/16.1.0` branch of the local checkout (tag 16.1.0 plus one
  env-gated position-dump commit; see
  [ADR-0001](../adr/0001-graphviz-16.1-oracle.md)). The upstream is
  `gitlab.com/graphviz/graphviz`, not a fork. A separate 15.x build is kept
  only as a historical reference for bisecting 16.1 behaviour changes.
- **Languages**: primarily C, with build tooling.
- **Key components**: `lib/cgraph` (graph model), `lib/dotgen` (dot engine),
  `lib/neatogen`, `lib/circogen`, `lib/osage`, `lib/sfdpgen`, `lib/pathplan`,
  `lib/common`, `lib/label`, `lib/gvc`, `lib/cdt`, `lib/ast`.
- **Entry points**: the `dot`/`neato`/… CLIs and `libgvc`.
- **Role**: the canonical specification. dot-engine ports it module-by-module
  (`cdt` → `ast` → `cgraph` → `common` → engines → `gvc`).
