---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Budowanie grafu w kodzie

`createGraph` tworzy graf w pamięci bez pisania źródła DOT. Używaj go, gdy struktura
grafu pochodzi z modelu danych Twojej aplikacji, a nie ze statycznego ciągu DOT.

## Podstawowe użycie

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

`createGraph` zwraca `GvGraphBuilder`. Jego właściwość `.graph` to nieprzezroczysty
obiekt `Graph` akceptowany przez `render`, `getLayout` i `getDrawOps`.

## Opcje

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Metody buildera

| Metoda | Opis |
|---|---|
| `addNode(name, attrs?)` | Dodaje węzeł; zwraca uchwyt `GvNode` |
| `addEdge(tail, head, attrs?)` | Dodaje krawędź; `tail`/`head` może być uchwytem `GvNode` lub ciągiem z nazwą |
| `addSubgraph(name, attrs?)` | Dodaje nazwany podgraf; zwraca zagnieżdżony `GvGraphBuilder` |
| `setAttr(k, v)` | Ustawia atrybut na poziomie grafu |
| `getAttr(k)` | Odczytuje atrybut na poziomie grafu |
| `.graph` | Bazowy `Graph` (nieprzezroczysty uchwyt dla układu/renderowania) |

## Atrybuty

Przekazuj pary klucz/wartość atrybutów DOT jako zwykłe obiekty:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Akceptowany jest każdy poprawny atrybut DOT; @knowvah/dot-engine przekazuje je
silnikowi układu bez zmian.

## Podgrafy

`addSubgraph` zwraca builder ograniczony do podgrafu. Węzły dodane do podgrafu są
również członkami grafu głównego:

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

## Porównanie z `parse`

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

Zarówno `parse`, jak i `createGraph` tworzą `Graph`, który można przekazać do
`render`, `getLayout` i `getDrawOps` w identyczny sposób.
