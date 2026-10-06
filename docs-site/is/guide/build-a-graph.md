---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Smíða graf í kóða

`createGraph` smíðar graf í minni án þess að skrifa DOT-frumkóða. Notaðu það
þegar uppbygging grafsins kemur úr gagnalíkani forritsins þíns frekar en úr
föstum DOT-streng.

## Grunnnotkun

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });

const a = b.addNode('a', { shape: 'box', label: 'Start' });
const c = b.addNode('c', { label: 'End' });

b.addEdge(a, c, { label: 'goes to' });
// Nodes can also be referenced by name string:
b.addEdge('a', 'c', { style: 'dashed' });

const svg = render(b.graph, 'svg');
```

`createGraph` skilar `GvGraphBuilder`. Eigindi hans `.graph` er ógegnsæi
`Graph`-hluturinn sem `render`, `getLayout` og `getDrawOps` taka við.

## Valkostir

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Aðferðir smiðsins

| Aðferð | Lýsing |
|---|---|
| `addNode(name, attrs?)` | Bætir við hnút; skilar `GvNode`-haldi |
| `addEdge(tail, head, attrs?)` | Bætir við legg; `tail`/`head` getur verið `GvNode`-hald eða nafnastrengur |
| `addSubgraph(name, attrs?)` | Bætir við nefndu hlutneti; skilar nestuðum `GvGraphBuilder` |
| `setAttr(k, v)` | Setur eigindi á grafstigi |
| `getAttr(k)` | Les eigindi á grafstigi |
| `.graph` | Undirliggjandi `Graph` (ógegnsætt hald fyrir uppsetningu/teikningu) |

## Eigindi

Gefðu DOT-eigindi sem lykil/gildi-pör í venjulegum hlutum:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Hvaða gilt DOT-eigindi sem er er tekið við; @knowvah/dot-engine sendir þau áfram til
uppsetningarvélarinnar óbreytt.

## Hlutnet

`addSubgraph` skilar smið sem afmarkast við hlutnetið. Hnútar sem bætt er við
hlutnet eru einnig meðlimir rótargrafsins:

```ts
const b = createGraph({ directed: true, name: 'pipeline' });

const cluster = b.addSubgraph('cluster_build', { label: 'CI', style: 'filled' });
cluster.addNode('compile');
cluster.addNode('test');
cluster.addEdge('compile', 'test');

b.addNode('deploy');
b.addEdge('test', 'deploy');

const svg = render(b.graph, 'svg');
```

## Samanborið við `parse`

```ts
// DOT string — convenient for static graphs
import { parse, render } from '@knowvah/dot-engine';
const g = parse('digraph { a -> b }');
const svg = render(g, 'svg');

// Builder — convenient when graph structure comes from code
import { createGraph, render } from '@knowvah/dot-engine';
const b = createGraph();
b.addEdge('a', 'b');
const svg2 = render(b.graph, 'svg');
```

Bæði `parse` og `createGraph` búa til `Graph` sem hægt er að gefa til
`render`, `getLayout` og `getDrawOps` á nákvæmlega sama hátt.
