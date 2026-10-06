---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Byg en graf i kode

`createGraph` konstruerer en graf i hukommelsen uden at skrive DOT-kildekode. Brug
den, når grafstrukturen kommer fra din applikations datamodel frem for fra en
statisk DOT-streng.

## Grundlæggende brug

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

`createGraph` returnerer en `GvGraphBuilder`. Dens `.graph`-egenskab er det uigennemsigtige
`Graph`-objekt, som `render`, `getLayout` og `getDrawOps` accepterer.

## Valgmuligheder

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Builder-metoder

| Metode | Beskrivelse |
|---|---|
| `addNode(name, attrs?)` | Tilføj en knude; returnerer et `GvNode`-håndtag |
| `addEdge(tail, head, attrs?)` | Tilføj en kant; `tail`/`head` kan være et `GvNode`-håndtag eller en navnestreng |
| `addSubgraph(name, attrs?)` | Tilføj en navngiven delgraf; returnerer en indlejret `GvGraphBuilder` |
| `setAttr(k, v)` | Angiv en attribut på grafniveau |
| `getAttr(k)` | Læs en attribut på grafniveau |
| `.graph` | Den underliggende `Graph` (uigennemsigtigt håndtag til layout/render) |

## Attributter

Angiv DOT-attributters nøgle/værdi-par som almindelige objekter:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Enhver gyldig DOT-attribut accepteres; @knowvah/dot-engine sender dem uændret videre
til layoutmotoren.

## Delgrafer

`addSubgraph` returnerer en builder afgrænset til delgrafen. Knuder, der tilføjes til
en delgraf, er også medlemmer af rodgrafen:

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

## Sammenlignet med `parse`

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

Både `parse` og `createGraph` producerer en `Graph`, der kan gives til
`render`, `getLayout` og `getDrawOps` på identisk vis.
