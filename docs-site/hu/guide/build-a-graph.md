---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Gráf felépítése kódból

A `createGraph` memóriabeli gráfot épít DOT forráskód írása nélkül. Akkor használja,
amikor a gráf szerkezete az alkalmazás adatmodelljéből származik, nem egy statikus
DOT-sztringből.

## Alapvető használat

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

A `createGraph` egy `GvGraphBuilder`-t ad vissza. Az ennek `.graph` tulajdonsága az
átlátszatlan `Graph` objektum, amelyet a `render`, a `getLayout` és a `getDrawOps`
elfogad.

## Beállítások

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Az építő metódusai

| Metódus | Leírás |
|---|---|
| `addNode(name, attrs?)` | Csúcs hozzáadása; `GvNode` kezelőt ad vissza |
| `addEdge(tail, head, attrs?)` | Él hozzáadása; a `tail`/`head` lehet `GvNode` kezelő vagy névsztring |
| `addSubgraph(name, attrs?)` | Elnevezett részgráf hozzáadása; beágyazott `GvGraphBuilder`-t ad vissza |
| `setAttr(k, v)` | Gráfszintű attribútum beállítása |
| `getAttr(k)` | Gráfszintű attribútum kiolvasása |
| `.graph` | Az alapul szolgáló `Graph` (átlátszatlan kezelő az elrendezéshez/rendereléshez) |

## Attribútumok

A DOT attribútum kulcs–érték párjait egyszerű objektumként adja át:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Bármely érvényes DOT attribútum elfogadott; a @knowvah/dot-engine változtatás nélkül
továbbítja őket az elrendezésmotornak.

## Részgráfok

Az `addSubgraph` a részgráfra hatókörözött építőt ad vissza. A részgráfhoz
hozzáadott csúcsok egyben a gyökérgráf tagjai is:

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

## Összehasonlítás a `parse`-zal

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

Mind a `parse`, mind a `createGraph` olyan `Graph`-ot állít elő, amely azonos módon
átadható a `render`, a `getLayout` és a `getDrawOps` függvénynek.
