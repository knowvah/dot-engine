---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Zostavenie grafu v kóde

`createGraph` vytvorí graf v pamäti bez písania zdrojového kódu DOT. Použite ho,
keď štruktúra grafu pochádza z dátového modelu vašej aplikácie a nie zo
statického reťazca DOT.

## Základné použitie

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

`createGraph` vracia `GvGraphBuilder`. Jeho vlastnosť `.graph` je nepriehľadný
objekt `Graph`, ktorý akceptujú `render`, `getLayout` a `getDrawOps`.

## Možnosti

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Metódy buildera

| Metóda | Popis |
|---|---|
| `addNode(name, attrs?)` | Pridá uzol; vráti handle `GvNode` |
| `addEdge(tail, head, attrs?)` | Pridá hranu; `tail`/`head` môže byť handle `GvNode` alebo reťazec s názvom |
| `addSubgraph(name, attrs?)` | Pridá pomenovaný podgraf; vráti vnorený `GvGraphBuilder` |
| `setAttr(k, v)` | Nastaví atribút na úrovni grafu |
| `getAttr(k)` | Prečíta atribút na úrovni grafu |
| `.graph` | Podkladový `Graph` (nepriehľadný handle pre rozloženie/vykreslenie) |

## Atribúty

Dvojice kľúč/hodnota atribútov DOT odovzdávajte ako obyčajné objekty:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Akceptuje sa každý platný atribút DOT; @knowvah/dot-engine ich odovzdáva
modulu rozloženia bez zmeny.

## Podgrafy

`addSubgraph` vracia builder viazaný na podgraf. Uzly pridané do
podgrafu sú zároveň členmi koreňového grafu:

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

## Porovnanie s `parse`

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

`parse` aj `createGraph` vytvárajú `Graph`, ktorý možno rovnako odovzdať do
`render`, `getLayout` a `getDrawOps`.
