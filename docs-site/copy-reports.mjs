// SPDX-License-Identifier: EPL-2.0
//
// Mirror the generated corpus reports (test/corpus/PARITY-dot.md, PERF.md) into the
// VitePress site as parity.md / perf.md so they publish on GitHub Pages. Run as
// the first step of `docs:dev` / `docs:build` (see package.json), so CI's
// `npm run docs:build` picks them up automatically. The copies are gitignored —
// the source files in test/corpus are the originals; edit those, never these.
//
// Each source has relative links written for its test/corpus location; rewrite
// them to site paths so they resolve on the published site.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

const REPORTS = [
  {
    src: '../test/corpus/PARITY-dot.md',
    dst: 'parity.md',
    rewrites: [
      [/\]\(\.\.\/\.\.\/docs\/known-divergences\.md(#[^)]*)?\)/g, '](/divergences$1)'],
      [/\]\(\.\.\/\.\.\/docs\/conformance\.md\)/g, '](/conformance)'],
      [/\]\(\.\.\/\.\.\/plans\/([^)]+)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/plans/$1)'],
      [/\]\(\.\/PARITY\.md\)/g, '](/engines)'],
      [/\]\(\.\/PARITY-dot\.md\)/g, '](/parity)'],
      [/\]\(\.\/PARITY-(circo|twopi|osage|patchwork|neato|fdp|sfdp)\.md\)/g, '](/parity-$1)'],
      [/\]\(\.\/PARITY-XDOT\.md\)/g, '](/parity-xdot)'],
      [/\]\(\.\/PARITY-JSON\.md\)/g, '](/parity-json)'],
      [/\]\(\.\/(parity[^)]*\.json[l]?)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
      [/\]\(\.\/(accepted-divergences[^)]*\.json)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
    ],
  },
  {
    src: '../test/corpus/PARITY.md',
    dst: 'engines.md',
    rewrites: [
      [/\]\(\.\.\/\.\.\/docs\/known-divergences\.md(#[^)]*)?\)/g, '](/divergences$1)'],
      [/\]\(\.\.\/\.\.\/docs\/conformance\.md\)/g, '](/conformance)'],
      [/\]\(\.\.\/\.\.\/plans\/([^)]+)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/plans/$1)'],
      [/\]\(\.\/PARITY\.md\)/g, '](/engines)'],
      [/\]\(\.\/PARITY-dot\.md\)/g, '](/parity)'],
      [/\]\(\.\/PARITY-(circo|twopi|osage|patchwork|neato|fdp|sfdp)\.md\)/g, '](/parity-$1)'],
      [/\]\(\.\/PARITY-XDOT\.md\)/g, '](/parity-xdot)'],
      [/\]\(\.\/PARITY-JSON\.md\)/g, '](/parity-json)'],
      // map-conformance (BEGIN)
      [/\]\(\.\/PARITY-MAP\.md\)/g, '](/parity-map)'],
      // map-conformance (END)
      // format-parity-matrix (BEGIN): PARITY.md's Tracks table and per-track
      // dashboard list link to the 22 new plain/json/map per-engine reports.
      [/\]\(\.\/PARITY-dot-plain\.md\)/g, '](/parity-dot-plain)'],
      // dot-agwrite track: the `-Tdot` (agwrite) dashboard row.
      [/\]\(\.\/PARITY-dot-dot\.md\)/g, '](/parity-dot-dot)'],
      [
        /\]\(\.\/PARITY-(circo|twopi|osage|patchwork|neato|fdp|sfdp)-(plain|json|map)\.md\)/g,
        '](/parity-$1-$2)',
      ],
      // format-parity-matrix (END)
      [/\]\(\.\/(parity[^)]*\.json[l]?)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
      [/\]\(\.\/(accepted-divergences[^)]*\.json)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
    ],
  },
  {
    src: '../test/corpus/PARITY-XDOT.md',
    dst: 'parity-xdot.md',
    rewrites: [
      [/\]\(\.\.\/\.\.\/docs\/known-divergences\.md(#[^)]*)?\)/g, '](/divergences$1)'],
      [/\]\(\.\.\/\.\.\/docs\/conformance\.md\)/g, '](/conformance)'],
      [/\]\(\.\.\/\.\.\/plans\/([^)]+)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/plans/$1)'],
      [/\]\(\.\/PARITY\.md\)/g, '](/engines)'],
      [/\]\(\.\/PARITY-dot\.md\)/g, '](/parity)'],
      [/\]\(\.\/PARITY-(circo|twopi|osage|patchwork|neato|fdp|sfdp)\.md\)/g, '](/parity-$1)'],
      [/\]\(\.\/(parity[^)]*\.json[l]?)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
      [/\]\(\.\/(accepted-divergences[^)]*\.json)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
      [/\]\(\.\/(xdot-parity\.json)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
    ],
  },
  // map-conformance (BEGIN): dot (imagemap) dashboard mirror — twin of the
  // PARITY-XDOT.md block above.
  {
    src: '../test/corpus/PARITY-MAP.md',
    dst: 'parity-map.md',
    rewrites: [
      [/\]\(\.\.\/\.\.\/docs\/known-divergences\.md(#[^)]*)?\)/g, '](/divergences$1)'],
      [/\]\(\.\.\/\.\.\/docs\/conformance\.md\)/g, '](/conformance)'],
      [/\]\(\.\.\/\.\.\/plans\/([^)]+)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/plans/$1)'],
      [/\]\(\.\/PARITY\.md\)/g, '](/engines)'],
      [/\]\(\.\/PARITY-dot\.md\)/g, '](/parity)'],
      [/\]\(\.\/PARITY-(circo|twopi|osage|patchwork|neato|fdp|sfdp)\.md\)/g, '](/parity-$1)'],
      [/\]\(\.\/PARITY-XDOT\.md\)/g, '](/parity-xdot)'],
      [/\]\(\.\/(parity[^)]*\.json[l]?)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
      [/\]\(\.\/(accepted-divergences[^)]*\.json)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
      [/\]\(\.\/(map-parity\.json)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
    ],
  },
  // map-conformance (END)
  {
    src: '../test/corpus/PARITY-JSON.md',
    dst: 'parity-json.md',
    rewrites: [
      [/\]\(\.\.\/\.\.\/docs\/known-divergences\.md(#[^)]*)?\)/g, '](/divergences$1)'],
      [/\]\(\.\.\/\.\.\/docs\/conformance\.md\)/g, '](/conformance)'],
      [/\]\(\.\.\/\.\.\/plans\/([^)]+)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/plans/$1)'],
      [/\]\(\.\/PARITY\.md\)/g, '](/engines)'],
      [/\]\(\.\/PARITY-dot\.md\)/g, '](/parity)'],
      [/\]\(\.\/PARITY-(circo|twopi|osage|patchwork|neato|fdp|sfdp)\.md\)/g, '](/parity-$1)'],
      [/\]\(\.\/PARITY-XDOT\.md\)/g, '](/parity-xdot)'],
      [/\]\(\.\/PARITY-JSON\.md\)/g, '](/parity-json)'],
      [/\]\(\.\/(parity[^)]*\.json[l]?)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
      [/\]\(\.\/(accepted-divergences[^)]*\.json)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
      [/\]\(\.\/(json-parity\.json)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
    ],
  },
  {
    src: '../test/corpus/PARITY-circo.md',
    dst: 'parity-circo.md',
    rewrites: [
      [/\]\(\.\.\/\.\.\/docs\/known-divergences\.md(#[^)]*)?\)/g, '](/divergences$1)'],
      [/\]\(\.\.\/\.\.\/docs\/conformance\.md\)/g, '](/conformance)'],
      [/\]\(\.\.\/\.\.\/plans\/([^)]+)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/plans/$1)'],
      [/\]\(\.\/PARITY\.md\)/g, '](/engines)'],
      [/\]\(\.\/PARITY-dot\.md\)/g, '](/parity)'],
      [/\]\(\.\/PARITY-(circo|twopi|osage|patchwork|neato|fdp|sfdp)\.md\)/g, '](/parity-$1)'],
      [/\]\(\.\/PARITY-XDOT\.md\)/g, '](/parity-xdot)'],
      [/\]\(\.\/PARITY-JSON\.md\)/g, '](/parity-json)'],
      [/\]\(\.\/(parity[^)]*\.json[l]?)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
      [/\]\(\.\/(accepted-divergences[^)]*\.json)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
    ],
  },
  {
    src: '../test/corpus/PARITY-twopi.md',
    dst: 'parity-twopi.md',
    rewrites: [
      [/\]\(\.\.\/\.\.\/docs\/known-divergences\.md(#[^)]*)?\)/g, '](/divergences$1)'],
      [/\]\(\.\.\/\.\.\/docs\/conformance\.md\)/g, '](/conformance)'],
      [/\]\(\.\.\/\.\.\/plans\/([^)]+)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/plans/$1)'],
      [/\]\(\.\/PARITY\.md\)/g, '](/engines)'],
      [/\]\(\.\/PARITY-dot\.md\)/g, '](/parity)'],
      [/\]\(\.\/PARITY-(circo|twopi|osage|patchwork|neato|fdp|sfdp)\.md\)/g, '](/parity-$1)'],
      [/\]\(\.\/PARITY-XDOT\.md\)/g, '](/parity-xdot)'],
      [/\]\(\.\/PARITY-JSON\.md\)/g, '](/parity-json)'],
      [/\]\(\.\/(parity[^)]*\.json[l]?)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
      [/\]\(\.\/(accepted-divergences[^)]*\.json)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
    ],
  },
  {
    src: '../test/corpus/PARITY-osage.md',
    dst: 'parity-osage.md',
    rewrites: [
      [/\]\(\.\.\/\.\.\/docs\/known-divergences\.md(#[^)]*)?\)/g, '](/divergences$1)'],
      [/\]\(\.\.\/\.\.\/docs\/conformance\.md\)/g, '](/conformance)'],
      [/\]\(\.\.\/\.\.\/plans\/([^)]+)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/plans/$1)'],
      [/\]\(\.\/PARITY\.md\)/g, '](/engines)'],
      [/\]\(\.\/PARITY-dot\.md\)/g, '](/parity)'],
      [/\]\(\.\/PARITY-(circo|twopi|osage|patchwork|neato|fdp|sfdp)\.md\)/g, '](/parity-$1)'],
      [/\]\(\.\/PARITY-XDOT\.md\)/g, '](/parity-xdot)'],
      [/\]\(\.\/PARITY-JSON\.md\)/g, '](/parity-json)'],
      [/\]\(\.\/(parity[^)]*\.json[l]?)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
      [/\]\(\.\/(accepted-divergences[^)]*\.json)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
    ],
  },
  {
    src: '../test/corpus/PARITY-patchwork.md',
    dst: 'parity-patchwork.md',
    rewrites: [
      [/\]\(\.\.\/\.\.\/docs\/known-divergences\.md(#[^)]*)?\)/g, '](/divergences$1)'],
      [/\]\(\.\.\/\.\.\/docs\/conformance\.md\)/g, '](/conformance)'],
      [/\]\(\.\.\/\.\.\/plans\/([^)]+)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/plans/$1)'],
      [/\]\(\.\/PARITY\.md\)/g, '](/engines)'],
      [/\]\(\.\/PARITY-dot\.md\)/g, '](/parity)'],
      [/\]\(\.\/PARITY-(circo|twopi|osage|patchwork|neato|fdp|sfdp)\.md\)/g, '](/parity-$1)'],
      [/\]\(\.\/PARITY-XDOT\.md\)/g, '](/parity-xdot)'],
      [/\]\(\.\/PARITY-JSON\.md\)/g, '](/parity-json)'],
      [/\]\(\.\/(parity[^)]*\.json[l]?)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
      [/\]\(\.\/(accepted-divergences[^)]*\.json)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
    ],
  },
  {
    src: '../test/corpus/PARITY-neato.md',
    dst: 'parity-neato.md',
    rewrites: [
      [/\]\(\.\.\/\.\.\/docs\/known-divergences\.md(#[^)]*)?\)/g, '](/divergences$1)'],
      [/\]\(\.\.\/\.\.\/docs\/conformance\.md\)/g, '](/conformance)'],
      [/\]\(\.\.\/\.\.\/plans\/([^)]+)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/plans/$1)'],
      [/\]\(\.\/PARITY\.md\)/g, '](/engines)'],
      [/\]\(\.\/PARITY-dot\.md\)/g, '](/parity)'],
      [/\]\(\.\/PARITY-(circo|twopi|osage|patchwork|neato|fdp|sfdp)\.md\)/g, '](/parity-$1)'],
      [/\]\(\.\/PARITY-XDOT\.md\)/g, '](/parity-xdot)'],
      [/\]\(\.\/PARITY-JSON\.md\)/g, '](/parity-json)'],
      [/\]\(\.\/(parity[^)]*\.json[l]?)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
      [/\]\(\.\/(accepted-divergences[^)]*\.json)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
    ],
  },
  {
    src: '../test/corpus/PARITY-fdp.md',
    dst: 'parity-fdp.md',
    rewrites: [
      [/\]\(\.\.\/\.\.\/docs\/known-divergences\.md(#[^)]*)?\)/g, '](/divergences$1)'],
      [/\]\(\.\.\/\.\.\/docs\/conformance\.md\)/g, '](/conformance)'],
      [/\]\(\.\.\/\.\.\/plans\/([^)]+)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/plans/$1)'],
      [/\]\(\.\/PARITY\.md\)/g, '](/engines)'],
      [/\]\(\.\/PARITY-dot\.md\)/g, '](/parity)'],
      [/\]\(\.\/PARITY-(circo|twopi|osage|patchwork|neato|fdp|sfdp)\.md\)/g, '](/parity-$1)'],
      [/\]\(\.\/PARITY-XDOT\.md\)/g, '](/parity-xdot)'],
      [/\]\(\.\/PARITY-JSON\.md\)/g, '](/parity-json)'],
      [/\]\(\.\/(parity[^)]*\.json[l]?)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
      [/\]\(\.\/(accepted-divergences[^)]*\.json)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
    ],
  },
  {
    src: '../test/corpus/PARITY-sfdp.md',
    dst: 'parity-sfdp.md',
    rewrites: [
      [/\]\(\.\.\/\.\.\/docs\/known-divergences\.md(#[^)]*)?\)/g, '](/divergences$1)'],
      [/\]\(\.\.\/\.\.\/docs\/conformance\.md\)/g, '](/conformance)'],
      [/\]\(\.\.\/\.\.\/plans\/([^)]+)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/plans/$1)'],
      [/\]\(\.\/PARITY\.md\)/g, '](/engines)'],
      [/\]\(\.\/PARITY-dot\.md\)/g, '](/parity)'],
      [/\]\(\.\/PARITY-(circo|twopi|osage|patchwork|neato|fdp|sfdp)\.md\)/g, '](/parity-$1)'],
      [/\]\(\.\/PARITY-XDOT\.md\)/g, '](/parity-xdot)'],
      [/\]\(\.\/PARITY-JSON\.md\)/g, '](/parity-json)'],
      [/\]\(\.\/(parity[^)]*\.json[l]?)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
      [/\]\(\.\/(accepted-divergences[^)]*\.json)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
    ],
  },
  {
    src: '../test/corpus/PERF.md',
    dst: 'perf.md',
    // ./PARITY.md (sibling in test/corpus) -> the site's /parity page
    rewrites: [[/\]\(\.\/PARITY\.md\)/g, '](/parity)']],
  },
];

// format-parity-matrix (BEGIN): per-engine dashboards for the plain/plain-ext
// and json output formats, plus imagemap, mirroring the per-engine xdot
// dashboards above (PARITY-circo.md etc.). These reports only ever contain
// one relative link (../../docs/conformance.md) — no self-references to
// sibling PARITY-*.md files — so the standard rewrite set used by the xdot
// dashboards above covers them; generate all 22 entries from it rather than
// hand-duplicating the array 22 times.
const STANDARD_REWRITES = [
  [/\]\(\.\.\/\.\.\/docs\/known-divergences\.md(#[^)]*)?\)/g, '](/divergences$1)'],
  [/\]\(\.\.\/\.\.\/docs\/conformance\.md\)/g, '](/conformance)'],
  [/\]\(\.\.\/\.\.\/plans\/([^)]+)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/plans/$1)'],
  [/\]\(\.\/PARITY\.md\)/g, '](/engines)'],
  [/\]\(\.\/PARITY-dot\.md\)/g, '](/parity)'],
  [/\]\(\.\/PARITY-(circo|twopi|osage|patchwork|neato|fdp|sfdp)\.md\)/g, '](/parity-$1)'],
  [/\]\(\.\/PARITY-XDOT\.md\)/g, '](/parity-xdot)'],
  [/\]\(\.\/PARITY-JSON\.md\)/g, '](/parity-json)'],
  [/\]\(\.\/(parity[^)]*\.json[l]?)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
  [/\]\(\.\/(accepted-divergences[^)]*\.json)\)/g, '](https://github.com/knowvah/dot-engine/blob/main/test/corpus/$1)'],
];
const FORMAT_MATRIX_ENGINES = [
  'circo',
  'twopi',
  'osage',
  'patchwork',
  'neato',
  'fdp',
  'sfdp',
];
const FORMAT_MATRIX_SURFACES = ['plain', 'json', 'map'];

// dot's SVG/xdot/json/imagemap dashboards are already mirrored above
// (PARITY-dot.md, PARITY-XDOT.md, PARITY-JSON.md, PARITY-MAP.md); plain is
// the one dot-specific report still missing a mirror.
REPORTS.push({
  src: '../test/corpus/PARITY-dot-plain.md',
  dst: 'parity-dot-plain.md',
  rewrites: STANDARD_REWRITES,
});
// dot-agwrite track: the `-Tdot` (agwrite) dashboard.
REPORTS.push({
  src: '../test/corpus/PARITY-dot-dot.md',
  dst: 'parity-dot-dot.md',
  rewrites: STANDARD_REWRITES,
});
for (const engine of FORMAT_MATRIX_ENGINES) {
  for (const surface of FORMAT_MATRIX_SURFACES) {
    REPORTS.push({
      src: `../test/corpus/PARITY-${engine}-${surface}.md`,
      dst: `parity-${engine}-${surface}.md`,
      rewrites: STANDARD_REWRITES,
    });
  }
}
// format-parity-matrix (END)

for (const { src, dst, rewrites } of REPORTS) {
  let md = readFileSync(here(src), 'utf8');
  for (const [re, to] of rewrites) md = md.replace(re, to);
  const note =
    `<!-- Mirrored from ${src.replaceAll('../', '')} by docs-site/copy-reports.mjs ` +
    `at docs build time. Edit the source report, not this copy. -->\n`;
  writeFileSync(here(dst), note + md);
  process.stderr.write(`copy-reports: wrote docs-site/${dst}\n`);
}
