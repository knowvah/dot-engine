---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Bygg en graf i kod

`createGraph` konstruerar en graf i minnet utan att du skriver DOT-källkod. Använd det
när grafens struktur kommer från din applikations datamodell i stället för från en
statisk DOT-sträng.

## Grundläggande användning

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

`createGraph` returnerar en `GvGraphBuilder`. Dess egenskap `.graph` är det ogenomskinliga
`Graph`-objekt som `render`, `getLayout` och `getDrawOps` tar emot.

## Alternativ

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Byggarens metoder

| Metod | Beskrivning |
|---|---|
| `addNode(name, attrs?)` | Lägg till en nod; returnerar ett `GvNode`-handtag |
| `addEdge(tail, head, attrs?)` | Lägg till en kant; `tail`/`head` kan vara ett `GvNode`-handtag eller en namnsträng |
| `addSubgraph(name, attrs?)` | Lägg till en namngiven delgraf; returnerar en nästlad `GvGraphBuilder` |
| `setAttr(k, v)` | Sätt ett attribut på grafnivå |
| `getAttr(k)` | Läs ett attribut på grafnivå |
| `.graph` | Den underliggande `Graph` (ogenomskinligt handtag för layout/rendering) |

## Attribut

Skicka DOT-attribut som nyckel/värde-par i vanliga objekt:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Alla giltiga DOT-attribut accepteras; @knowvah/dot-engine skickar dem vidare till
layoutmotorn oförändrade.

## Delgrafer

`addSubgraph` returnerar en byggare avgränsad till delgrafen. Noder som läggs till i en
delgraf är också medlemmar i rotgrafen:

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

## Jämfört med `parse`

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

Både `parse` och `createGraph` producerar en `Graph` som kan skickas till
`render`, `getLayout` och `getDrawOps` på exakt samma sätt.
