// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect, vi } from 'vitest';
import { clustInLayer, parseLayers, selectedLayer, type LayerInfo } from './layers.js';
import { parse, renderSvg } from '../index.js';

function infoFor(layers: string): LayerInfo {
  return parseLayers({ attrs: new Map([['layers', layers]]) } as never);
}

describe('layers — parse + selectedLayer', () => {
  it('parses the layer list (index 1..N) with the default separator', () => {
    const L = infoFor('a:b:c');
    expect(L.numLayers).toBe(3);
    expect(L.layerIDs).toEqual([null, 'a', 'b', 'c']);
  });

  it('numLayers is 1 when there is no layers attribute', () => {
    expect(parseLayers({ attrs: new Map() } as never).numLayers).toBe(1);
  });

  it('a named spec selects only its layer', () => {
    const L = infoFor('a:b:c');
    expect(selectedLayer(L, 2, 'b')).toBe(true);
    expect(selectedLayer(L, 1, 'b')).toBe(false);
  });

  it('a range spec selects the inclusive interval', () => {
    const L = infoFor('a:b:c:d');
    expect(selectedLayer(L, 3, 'b:d')).toBe(true);
    expect(selectedLayer(L, 1, 'b:d')).toBe(false);
  });

  it('"all" and numeric and comma-list specs work', () => {
    const L = infoFor('a:b:c');
    expect(selectedLayer(L, 3, 'all')).toBe(true);
    expect(selectedLayer(L, 2, '2')).toBe(true);
    expect(selectedLayer(L, 3, 'a,c')).toBe(true);
  });
});

describe('layers — SVG output', () => {
  const SRC = 'digraph G { layers="one:two"; a [layer="two"]; b; a -> b; }';

  it('wraps the drawing in one <g class="layer"> per layer', () => {
    const svg = renderSvg(SRC, 'dot');
    expect((svg.match(/class="layer"/g) ?? []).length).toBe(2);
    expect(svg).toContain('<g id="one" class="layer">');
    expect(svg).toContain('<g id="two" class="layer">');
  });

  it('prefixes ids on layers after the first; nodes also get the suffix', () => {
    const svg = renderSvg(SRC, 'dot');
    expect(svg).toContain('two_graph0'); // graph group: prefix only
    expect(svg).toMatch(/two_node\d+_two/); // node: prefix + suffix
  });

  it('renders a single pass (no layer groups) when there is no layers attr', () => {
    const svg = renderSvg('digraph G { a -> b; }', 'dot');
    expect(svg).not.toContain('class="layer"');
  });
});

describe('layers — parseLayerselect list shape', () => {
  const withSel = (sel: string): LayerInfo =>
    parseLayers({ attrs: new Map([['layers', 'a:b:c'], ['layerselect', sel]]) } as never);

  it('single name gives [1, 2, numLayers+1]', () => {
    expect(withSel('b').layerList).toEqual([1, 2, 4]);
  });
  it('list gives [2, 2, 3, numLayers+1]', () => {
    expect(withSel('b,c').layerList).toEqual([2, 2, 3, 4]);
  });
  it('range gives every layer inside', () => {
    expect(withSel('a:c').layerList).toEqual([3, 1, 2, 3, 4]);
  });
  it('no match yields null and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(withSel('zz').layerList).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      'Warning: The layerselect attribute "zz" does not match any layer specifed by the layers attribute - ignored.',
    );
    warn.mockRestore();
  });
  it('absent layerselect leaves layerList null', () => {
    expect(infoFor('a:b:c').layerList).toBeNull();
  });
});

// @see lib/common/emit.c:1593 clust_in_layer
describe('layers — clustInLayer', () => {
  const CLUSTER = 'cluster_c';
  const TWO_LAYERS = 'layers="l1:l2";';

  /** `[in l1, in l2]` for `cluster_c` of a graph with the given body. */
  function inLayers(body: string): boolean[] {
    const g = parse(`digraph G { ${body} }`);
    const info = parseLayers(g);
    const sg = g.subgraphs.get(CLUSTER)!;
    return [1, 2].map((layerNum) => clustInLayer(info, layerNum, sg));
  }

  it('the cluster\'s own layer selects it', () => {
    expect(inLayers(`${TWO_LAYERS} subgraph ${CLUSTER} { layer=l2; b }`)).toEqual([false, true]);
  });

  it('a non-matching layer rejects it even when a node of it is in the layer', () => {
    expect(inLayers(`${TWO_LAYERS} subgraph ${CLUSTER} { layer=l2; b [layer=l1] }`)).toEqual([false, true]);
  });

  it('with no layer, a node\'s layer decides', () => {
    expect(inLayers(`${TWO_LAYERS} subgraph ${CLUSTER} { b [layer=l2] }`)).toEqual([false, true]);
  });

  it('a node with no layer and no edge in the cluster is in every layer', () => {
    expect(inLayers(`${TWO_LAYERS} subgraph ${CLUSTER} { b }`)).toEqual([true, true]);
  });

  it('an edge declared inside the cluster puts its unlayered nodes in its layer only', () => {
    expect(inLayers(`${TWO_LAYERS} subgraph ${CLUSTER} { b; c; b -> c [layer=l2] }`)).toEqual([false, true]);
  });

  it('an edge declared at the root does not count', () => {
    expect(inLayers(`${TWO_LAYERS} subgraph ${CLUSTER} { b } a -> b [layer=l2]`)).toEqual([true, true]);
  });

  it('a root layer declared before the cluster is the cluster\'s default', () => {
    expect(inLayers(`${TWO_LAYERS} layer=l2; subgraph ${CLUSTER} { b }`)).toEqual([false, true]);
  });

  it('is true for every cluster when there is one layer', () => {
    expect(inLayers(`subgraph ${CLUSTER} { layer=l2; b [layer=l1] }`)).toEqual([true, true]);
  });
});
