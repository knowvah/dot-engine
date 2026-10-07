// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { EN_COMPONENTS, pickStrings } from '../../docs-site/.vitepress/theme/strings.js';
import { LOCALES } from '../../docs-site/.vitepress/i18n.js';

interface Entry {
  id: string;
  engine: string;
  toleranceClass: string;
  input: string;
  description: string;
}
type Showcase = Record<string, unknown>;
interface CopyGoldens {
  EN_SHOWCASE: { blurbs: Record<string, string> } & Record<string, unknown>;
  fillTemplate(t: string, vars: Record<string, string | number>): string;
  resolveShowcase(o: Showcase | undefined): { blurbs: Record<string, string> } & Record<string, string>;
  localizeGoldens(
    entries: Entry[],
    translations: Record<string, unknown>,
  ): { entries: Entry[]; missingIds: string[] };
  renderShowcaseIndex(
    prefix: string,
    order: string[],
    counts: Record<string, number>,
    strings: Showcase | undefined,
  ): string;
  renderEnginePage(engine: string, count: number, strings: Showcase | undefined): string;
  yamlScalar(value: string): string;
  listLocalePrefixes(dir: string): string[];
}

const here = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));
const mod = (await import(
  pathToFileURL(here('../../docs-site/copy-goldens.mjs')).href
)) as CopyGoldens;

const FIX = 'fixtures/goldens/';
const MANIFEST = JSON.parse(readFileSync(here(`${FIX}manifest.json`), 'utf8')) as Entry[];
const XX = JSON.parse(readFileSync(here(`${FIX}locales/goldens/xx.json`), 'utf8')) as Record<
  string,
  unknown
>;
const ORDER = ['dot', 'neato'];
const COUNTS = { dot: 2, neato: 1 };

describe('localizeGoldens', () => {
  it('translates covered ids, keeps English for the rest and names it', () => {
    const { entries, missingIds } = mod.localizeGoldens(MANIFEST, XX);
    expect(entries.map((e) => e.description)).toEqual([
      'Ferst gulden',
      'Second golden',
      'Therd gulden',
    ]);
    expect(missingIds).toEqual(['g-two']);
  });

  it('never treats $-keys as ids and does not mutate the manifest', () => {
    const { entries, missingIds } = mod.localizeGoldens(MANIFEST, { $showcase: {} });
    expect(missingIds).toEqual(['g-one', 'g-two', 'g-three']);
    expect(entries).toEqual(MANIFEST);
    expect(MANIFEST[0]?.description).toBe('First golden');
  });
});

describe('showcase rendering', () => {
  it('fills placeholders and leaves unknown ones intact', () => {
    expect(mod.fillTemplate('{a}-{b}-{c}', { a: 1, b: 'x' })).toBe('1-x-{c}');
  });

  it('merges overrides over English per key and per engine blurb', () => {
    const s = mod.resolveShowcase({ indexTitle: 'T', blurbs: { dot: 'D' } });
    expect(s.indexTitle).toBe('T');
    expect(s.indexHeading).toBe('Showcase — the golden corpus');
    expect(s.blurbs.dot).toBe('D');
    expect(s.blurbs.neato).toBe(mod.EN_SHOWCASE.blurbs.neato);
  });

  it('renders English index with unprefixed links', () => {
    const md = mod.renderShowcaseIndex('', ORDER, COUNTS, undefined);
    expect(md).toContain('- [**dot**](/showcase/dot) — Hierarchical, layered layout for directed graphs. _(2 goldens)_');
    expect(md).toContain('one of **3 golden test cases**');
    expect(md).toContain('(see [Conformance](/conformance)).');
  });

  it('prefixes every internal link and translates prose for xx', () => {
    const md = mod.renderShowcaseIndex('xx', ORDER, COUNTS, XX.$showcase as Showcase);
    expect(md).toContain('title: Shoecase\n');
    expect(md).toContain('# Shoecase - the gulden corpus');
    expect(md).toContain('- [**dot**](/xx/showcase/dot) — Layerd layout. _(2 goldens)_');
    expect(md).toContain('- [**neato**](/xx/showcase/neato) — Spring-model');
    expect(md).toContain('(see [Conformens](/xx/conformance)).');
    expect(md).not.toContain('](/conformance)');
    expect(md).not.toContain('](/showcase/');
  });

  it('quotes a translated title that YAML cannot read as a plain scalar', () => {
    const md = mod.renderEnginePage('dot', 2, { engineTitle: '{engine}: golden' } as Showcase);
    expect(md.startsWith('---\ntitle: "dot: golden"\n---\n')).toBe(true);
    expect(mod.yamlScalar('dot goldens')).toBe('dot goldens');
    expect(mod.yamlScalar('#1 "x"')).toBe('"#1 \\"x\\""');
  });

  it('renders an engine page with translated heading and the gallery tag', () => {
    const md = mod.renderEnginePage('dot', 2, XX.$showcase as Showcase);
    expect(md).toBe(`---
title: dot goldens
---

# dot - 2 guldens

Layerd layout. Each graph below is rendered live in your browser by the library.

<GoldenGallery engine="dot" />
`);
  });
});

describe('listLocalePrefixes', () => {
  it('lists only *.ts modules, not subdirectories or other files', () => {
    expect(mod.listLocalePrefixes(here(`${FIX}locales`))).toEqual(['xx']);
  });

  it('returns no locales for a missing directory', () => {
    expect(mod.listLocalePrefixes(here(`${FIX}nope`))).toEqual([]);
  });
});

describe('GoldenGallery strings', () => {
  const SRC = readFileSync(
    here('../../docs-site/.vitepress/theme/GoldenGallery.vue'),
    'utf8',
  );
  const XX_STRINGS = { ...EN_COMPONENTS, close: 'Clos', rendering: 'rendrin…' };

  it('resolves the active locale and falls back to English at the root', () => {
    expect(pickStrings('xx-XX', { 'xx-XX': XX_STRINGS }).close).toBe('Clos');
    expect(pickStrings('en-US', { 'xx-XX': XX_STRINGS }).rendering).toBe('rendering…');
  });

  it('uses component strings and no Node built-ins or i18n.ts', () => {
    expect(SRC).toContain("pickStrings(lang.value, theme.value.componentsByLang)");
    expect(SRC).not.toMatch(/from 'node:/);
    expect(SRC).not.toMatch(/from '\.\.\/i18n/);
    for (const usage of [
      't.value.renderFailed',
      't.clickToEnlarge',
      't.rendering',
      't.dotSource',
      't.close',
    ]) {
      expect(SRC).toContain(usage);
    }
  });
});

/**
 * Golden ids in `test/golden/manifest.json` when the shipped translations were
 * completed (decision 2). Every registered locale must translate all of
 * these; an id added to the manifest later falls back to English in the
 * gallery and is reported by `docs:i18n-status`, not failed here.
 */
const FROZEN_GOLDEN_IDS: readonly string[] = [
  'dot-simple-box', 'dot-record-node', 'dot-html-label', 'dot-cluster',
  'dot-cluster-external-edge', 'dot-nested-cluster', 'dot-edge-styles',
  'dot-disconnected', 'dot-edge-dirs', 'neato-simple', 'neato-weighted',
  'neato-diamond', 'neato-cluster', 'neato-disconnected', 'neato-polygon',
  'neato-circle', 'fdp-simple', 'fdp-cluster', 'fdp-disconnected',
  'fdp-edge-both', 'fdp-large', 'fdp-nested-cluster', 'sfdp-simple',
  'sfdp-medium', 'sfdp-large', 'sfdp-disconnected', 'sfdp-weighted',
  'circo-simple', 'circo-biconn', 'circo-star', 'circo-html-label',
  'circo-disconnected', 'circo-record', 'twopi-star', 'twopi-chain',
  'twopi-tree', 'twopi-root-attr', 'twopi-disconnected', 'twopi-ranksep',
  'osage-simple', 'osage-nested', 'osage-sortv', 'osage-array-mode',
  'osage-labels', 'osage-empty-cluster', 'patchwork-simple',
  'patchwork-weighted', 'patchwork-cluster', 'patchwork-nested',
  'patchwork-default-area', 'patchwork-html-label', 'twopi-single-node',
  'circo-single-node', 'osage-deep-nesting', 'patchwork-single-node',
  'sfdp-single-node', 'neato-tiny-multi-edge', 'fdp-tiny-self-loop',
  'dot-constraint-false', 'dot-self-loop', 'circo-self-loop', 'dot-minlen',
  'twopi-self-loop', 'dot-rankdir-lr', 'dot-rankdir-bt', 'dot-multi-edge',
  'dot-rankdir-rl', 'dot-head-tail-label', 'dot-node-xlabel',
  'dot-edge-label', 'dot-edge-xlabel', 'dot-graph-label',
  'dot-labels-combined', 'dot-html-node-label', 'dot-html-node-xlabel',
  'dot-html-edge-label', 'dot-html-edge-xlabel', 'dot-html-head-tail-label',
  'dot-html-graph-label', 'dot-html-cluster-label', 'dot-html-fonts',
  'dot-html-table-styling', 'dot-html-combined', 'dot-node-fillcolor',
  'dot-node-pencolor', 'dot-node-penwidth', 'dot-node-style-dashed',
  'dot-node-style-dotted', 'dot-node-style-bold', 'dot-node-filled-default',
  'dot-edge-color', 'dot-edge-penwidth', 'dot-edge-style-dashed',
  'dot-edge-colored-arrow', 'dot-graph-bgcolor', 'dot-cluster-filled',
  'dot-cluster-bgcolor', 'dot-styled-combined', 'mc-node-gradient-linear',
  'mc-node-gradient-radial', 'mc-node-gradient-frac',
  'mc-node-gradient-angle', 'mc-node-box-gradient', 'mc-cluster-gradient',
  'mc-graph-bgcolor-gradient', 'mc-node-striped', 'mc-node-striped-weighted',
  'mc-edge-multicolor', 'mc-edge-multicolor-3', 'mc-combined',
  'dot-edge-multicolor-semi', 'dot-edge-multicolor-semi-3',
  'dot-undirected-simple', 'dot-undirected-tree', 'dot-undirected-multirank',
  'dot-node-penwidth-edge-clip', 'dot-port-compass-aligned',
  'dot-port-steering-east', 'dot-port-steering-west',
  'dot-port-record-aligned', 'dot-ortho-chain', 'dot-ortho-branch',
  'dot-ortho-multirank', 'dot-ortho-label', 'dot-curved-single',
  'dot-curved-parallel', 'dot-compound-splines', 'dot-curved-cycle',
  'dot-compound-lhead', 'dot-long-edge-straight', 'dot-long-edge-p2',
  'dot-long-edge-polyline', 'dot-point-shape', 'dot-rounded-clusters-mrecord',
  'dot-record-fill-pen', 'dot-bgcolor-x11name', 'dot-node-setlinewidth',
  'dot-style-funlimit', 'dot-edge-fontcolor-scheme',
  'dot-cluster-peripheries0', 'dot-label-xml-entity', 'dot-string-no-concat',
  'dot-cluster-id-attr', 'dot-node-class-attr', 'dot-id-stylesheet',
  'dot-unicode-name', 'dot-arrow-dot', 'dot-arrow-crow', 'dot-arrow-box',
  'dot-arrow-diamond', 'dot-arrow-tee', 'dot-arrow-curve',
  'dot-arrow-compound', 'dot-arrow-side', 'dot-htmltable-grad-linear',
  'dot-htmltable-grad-radial', 'dot-htmltable-rounded-grad',
  'dot-label-blank-lines', 'dot-size-scaling', 'dot-long-edge-order',
  'concentrate-b135', 'concentrate-167', 'parallel-multirank-min',
  'edge-order-min', 'parallel-cluster-ldbxtried',
  'dot-cluster-labeled-minlen0', 'dot-pack-flat-label',
  'dot-pack-flat-label-vnode', 'dot-pack-concentrate', 'dot-pack-record',
  'dot-pack-samehead', 'dot-pack-ordering', 'dot-pack-headtail-label',
  'dot-conc-headtail', 'dot-conc-samehead', 'dot-record-splines',
  'dot-cluster-samehead', 'dot-record-xlabel', 'dot-pack-constraint',
  'dot-pack-fixedsize', 'dot-pack-selfloop',
  'dot-gap-compound-newrank-samehead', 'dot-gap-concentrate-html-ports',
  'dot-gap-record-invis-ratio', 'dot-gap-xlabel-headtail',
  'dot-gap-selfloop-record-html', 'dot-gap-rankdir-ranksame-splines',
  'dot-gap-ports-xlabel-samehead', 'dot-gap-ordering-invis',
  'dot-gap-headtail-record', 'dot-pack-portlabel-angle',
  'dot-newrank-minlen0', 'dot-newrank-cluster-ranksame',
  'dot-pack-cluster-edgelabel', 'dot-pack-cluster-minlen0',
  'dot-pack-cluster-minlen0-edgelabel', 'dot-pack-cluster-ranksame',
  'dot-pack-nestedcluster-ranksame', 'dot-pack-cluster-compound',
  'dot-cluster-edgelabel-ranksame', 'dot-pack-cluster-rankdir',
  'dot-pack-cluster-ordering-constraint', 'dot-pack-cluster-concentrate',
  'dot-pack-cluster-rankdir-edgelabel',
  'dot-pack-cluster-minlen0-ranksame-edgelabel',
  'dot-pack-cluster-concentrate-edgelabel', 'dot-newrank-compact-weak',
  'dot-newrank-compact-single', 'dot-newrank-compact-three',
  'dot-newrank-compact-nested', 'dot-newrank-compact-mixed', 'dot-phase',
  'dot-clusterrank-none', 'dot-mclimit', 'dot-fontnames-svg',
  'dot-fontnames-ps', 'dot-labelfloat', 'dot-labelfontname', 'dot-landscape',
  'dot-layerlistsep', 'dot-quantum', 'dot-resolution', 'dot-samplepoints',
  'circo-mindist', 'circo-oneblock', 'patchwork-inset', 'neato-epsilon',
  'neato-maxiter', 'neato-start', 'neato-overlap-scaling',
  'neato-overlap-shrink', 'neato-pin', 'neato-multispline', 'dot-shape-zoo',
  'dot-compound-clip', 'dot-ortho-parallel', 'neato-ratio-aspect',
  'dot-xlabels', 'c90-rank-zoo', 'c90-cdt-concentrate-corridor',
  'c90-circo-chord', 'c90-circo-artic-tree', 'c90-circo-bowtie',
  'c90-circo-parallel', 'c90-circo-wheel6', 'c90-neato-overlap-ratio',
  'c90-dot-flat-adj-both-arrows',
];

/** Frozen ids `translations` lacks (absent, non-string or blank). */
function missingFrozenIds(translations: Record<string, unknown>): string[] {
  return FROZEN_GOLDEN_IDS.filter((id) => {
    const value = translations[id];
    return typeof value !== 'string' || value.trim() === '';
  });
}

describe('shipped locales translate every frozen golden id', () => {
  it('names the id a locale is missing', () => {
    const all = Object.fromEntries(FROZEN_GOLDEN_IDS.map((id) => [id, 'x']));
    const [first] = FROZEN_GOLDEN_IDS;
    expect(missingFrozenIds({ ...all, [first!]: undefined })).toEqual([first]);
    expect(missingFrozenIds({ ...all, [first!]: ' ' })).toEqual([first]);
    expect(FROZEN_GOLDEN_IDS).toHaveLength(247);
  });

  for (const prefix of Object.keys(LOCALES).sort()) {
    it(`${prefix} covers all ${FROZEN_GOLDEN_IDS.length} frozen ids`, () => {
      const file = here(`../../docs-site/.vitepress/locales/goldens/${prefix}.json`);
      const translations = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
      expect(missingFrozenIds(translations).map((id) => `${prefix}: ${id}`)).toEqual([]);
    });
  }
});
