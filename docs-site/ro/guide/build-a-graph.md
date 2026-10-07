---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Construirea unui graf în cod

`createGraph` construiește un graf în memorie fără a scrie sursă DOT. Folosiți-l
atunci când structura grafului provine din modelul de date al aplicației dumneavoastră, nu
dintr-un șir DOT static.

## Utilizare de bază

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

`createGraph` returnează un `GvGraphBuilder`. Proprietatea sa `.graph` este obiectul opac
`Graph` acceptat de `render`, `getLayout` și `getDrawOps`.

## Opțiuni

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Metodele constructorului

| Metodă | Descriere |
|---|---|
| `addNode(name, attrs?)` | Adaugă un nod; returnează un handle `GvNode` |
| `addEdge(tail, head, attrs?)` | Adaugă o muchie; `tail`/`head` poate fi un handle `GvNode` sau un șir cu nume |
| `addSubgraph(name, attrs?)` | Adaugă un subgraf cu nume; returnează un `GvGraphBuilder` imbricat |
| `setAttr(k, v)` | Setează un atribut la nivel de graf |
| `getAttr(k)` | Citește un atribut la nivel de graf |
| `.graph` | `Graph`-ul de bază (handle opac pentru aranjare/randare) |

## Atribute

Transmiteți perechi cheie/valoare de atribute DOT ca obiecte simple:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Orice atribut DOT valid este acceptat; @knowvah/dot-engine le transmite motorului de
aranjare neschimbate.

## Subgrafuri

`addSubgraph` returnează un constructor cu domeniul limitat la subgraf. Nodurile adăugate
într-un subgraf sunt de asemenea membre ale grafului rădăcină:

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

## Comparație cu `parse`

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

Atât `parse`, cât și `createGraph` produc un `Graph` care poate fi transmis identic către
`render`, `getLayout` și `getDrawOps`.
