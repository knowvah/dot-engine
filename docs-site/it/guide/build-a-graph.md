---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Costruire un grafo nel codice

`createGraph` costruisce un grafo in memoria senza scrivere sorgente DOT. Usalo
quando la struttura del grafo proviene dal modello dati della tua applicazione anziché da una
stringa DOT statica.

## Uso di base

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

`createGraph` restituisce un `GvGraphBuilder`. La sua proprietà `.graph` è l'oggetto
opaco `Graph` accettato da `render`, `getLayout` e `getDrawOps`.

## Opzioni

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Metodi del builder

| Metodo | Descrizione |
|---|---|
| `addNode(name, attrs?)` | Aggiunge un nodo; restituisce un handle `GvNode` |
| `addEdge(tail, head, attrs?)` | Aggiunge un arco; `tail`/`head` possono essere un handle `GvNode` o una stringa di nome |
| `addSubgraph(name, attrs?)` | Aggiunge un sottografo con nome; restituisce un `GvGraphBuilder` annidato |
| `setAttr(k, v)` | Imposta un attributo a livello di grafo |
| `getAttr(k)` | Legge un attributo a livello di grafo |
| `.graph` | Il `Graph` sottostante (handle opaco per layout/render) |

## Attributi

Passa le coppie chiave/valore degli attributi DOT come semplici oggetti:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Qualsiasi attributo DOT valido è accettato; @knowvah/dot-engine li passa invariati al
motore di layout.

## Sottografi

`addSubgraph` restituisce un builder limitato al sottografo. I nodi aggiunti a un
sottografo sono anche membri del grafo radice:

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

## Confronto con `parse`

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

Sia `parse` sia `createGraph` producono un `Graph` che può essere passato in modo identico a
`render`, `getLayout` e `getDrawOps`.
