---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Sestavení grafu v kódu

`createGraph` vytvoří graf v paměti bez psaní zdrojového kódu DOT. Použijte ho,
když struktura grafu pochází z datového modelu vaší aplikace, a ne ze
statického řetězce DOT.

## Základní použití

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

`createGraph` vrací `GvGraphBuilder`. Jeho vlastnost `.graph` je neprůhledný
objekt `Graph`, který přijímají `render`, `getLayout` a `getDrawOps`.

## Volby

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Metody builderu

| Metoda | Popis |
|---|---|
| `addNode(name, attrs?)` | Přidá uzel; vrací úchyt `GvNode` |
| `addEdge(tail, head, attrs?)` | Přidá hranu; `tail`/`head` může být úchyt `GvNode` nebo řetězec s názvem |
| `addSubgraph(name, attrs?)` | Přidá pojmenovaný podgraf; vrací vnořený `GvGraphBuilder` |
| `setAttr(k, v)` | Nastaví atribut na úrovni grafu |
| `getAttr(k)` | Přečte atribut na úrovni grafu |
| `.graph` | Podkladový `Graph` (neprůhledný úchyt pro rozvržení/vykreslení) |

## Atributy

Dvojice klíč/hodnota atributů DOT předávejte jako obyčejné objekty:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Přijat je libovolný platný atribut DOT; @knowvah/dot-engine je předá
modulu rozvržení beze změny.

## Podgrafy

`addSubgraph` vrací builder omezený na podgraf. Uzly přidané do
podgrafu jsou zároveň členy kořenového grafu:

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

## Srovnání s `parse`

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

`parse` i `createGraph` vytvářejí `Graph`, který lze stejným způsobem předat
funkcím `render`, `getLayout` a `getDrawOps`.
