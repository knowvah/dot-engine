---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Kodla graf oluşturma

`createGraph`, DOT kaynağı yazmadan bellekte bir graf oluşturur. Graf yapısı statik bir
DOT dizgisinden değil, uygulamanızın veri modelinden geldiğinde kullanın.

## Temel kullanım

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

`createGraph`, bir `GvGraphBuilder` döndürür. `.graph` özelliği, `render`, `getLayout` ve
`getDrawOps` tarafından kabul edilen opak `Graph` nesnesidir.

## Seçenekler

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Oluşturucu yöntemleri

| Yöntem | Açıklama |
|---|---|
| `addNode(name, attrs?)` | Bir düğüm ekler; bir `GvNode` tutamacı döndürür |
| `addEdge(tail, head, attrs?)` | Bir kenar ekler; `tail`/`head` bir `GvNode` tutamacı veya ad dizgisi olabilir |
| `addSubgraph(name, attrs?)` | Adlandırılmış bir alt graf ekler; iç içe bir `GvGraphBuilder` döndürür |
| `setAttr(k, v)` | Graf düzeyinde bir öznitelik ayarlar |
| `getAttr(k)` | Graf düzeyinde bir özniteliği okur |
| `.graph` | Temeldeki `Graph` (yerleşim/işleme için opak tutamaç) |

## Öznitelikler

DOT öznitelik anahtar/değer çiftlerini düz nesneler olarak geçirin:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Geçerli her DOT özniteliği kabul edilir; @knowvah/dot-engine bunları yerleşim motoruna
değiştirmeden iletir.

## Alt graflar

`addSubgraph`, alt grafa kapsamlanmış bir oluşturucu döndürür. Bir alt grafa eklenen
düğümler aynı zamanda kök grafın da üyesidir:

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

## `parse` ile karşılaştırma

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

Hem `parse` hem de `createGraph`, `render`, `getLayout` ve `getDrawOps` işlevlerine aynı
şekilde geçirilebilen bir `Graph` üretir.
