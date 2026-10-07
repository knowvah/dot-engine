---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Een graaf bouwen in code

`createGraph` construeert een graaf in het geheugen, zonder DOT-broncode te schrijven.
Gebruik het wanneer de graafstructuur uit het datamodel van uw toepassing komt en
niet uit een statische DOT-string.

## Basisgebruik

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

`createGraph` geeft een `GvGraphBuilder` terug. De eigenschap `.graph` ervan is het
ondoorzichtige `Graph`-object dat `render`, `getLayout` en `getDrawOps` accepteren.

## Opties

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Builder-methoden

| Methode | Beschrijving |
|---|---|
| `addNode(name, attrs?)` | Voegt een knoop toe; geeft een `GvNode`-handle terug |
| `addEdge(tail, head, attrs?)` | Voegt een kant toe; `tail`/`head` kunnen een `GvNode`-handle of een naamstring zijn |
| `addSubgraph(name, attrs?)` | Voegt een benoemde subgraaf toe; geeft een geneste `GvGraphBuilder` terug |
| `setAttr(k, v)` | Stelt een attribuut op graafniveau in |
| `getAttr(k)` | Leest een attribuut op graafniveau |
| `.graph` | De onderliggende `Graph` (ondoorzichtige handle voor lay-out/rendering) |

## Attributen

Geef DOT-attribuutsleutel/-waardeparen mee als gewone objecten:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Elk geldig DOT-attribuut wordt geaccepteerd; @knowvah/dot-engine geeft het ongewijzigd door aan
de lay-out-engine.

## Subgrafen

`addSubgraph` geeft een builder terug die tot de subgraaf is beperkt. Knopen die aan een
subgraaf worden toegevoegd, zijn tegelijk lid van de rootgraaf:

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

## Vergeleken met `parse`

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

Zowel `parse` als `createGraph` levert een `Graph` op die op identieke wijze aan `render`,
`getLayout` en `getDrawOps` kan worden doorgegeven.
