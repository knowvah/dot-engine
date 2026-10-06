---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Construir un grafo en código

`createGraph` construye un grafo en memoria sin escribir código fuente DOT. Úsalo
cuando la estructura del grafo proviene del modelo de datos de tu aplicación en lugar de una
cadena DOT estática.

## Uso básico

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

`createGraph` devuelve un `GvGraphBuilder`. Su propiedad `.graph` es el objeto
`Graph` opaco que aceptan `render`, `getLayout` y `getDrawOps`.

## Opciones

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Métodos del constructor

| Método | Descripción |
|---|---|
| `addNode(name, attrs?)` | Añade un nodo; devuelve un manejador `GvNode` |
| `addEdge(tail, head, attrs?)` | Añade una arista; `tail`/`head` pueden ser un manejador `GvNode` o una cadena con el nombre |
| `addSubgraph(name, attrs?)` | Añade un subgrafo con nombre; devuelve un `GvGraphBuilder` anidado |
| `setAttr(k, v)` | Define un atributo a nivel de grafo |
| `getAttr(k)` | Lee un atributo a nivel de grafo |
| `.graph` | El `Graph` subyacente (manejador opaco para diseño/renderizado) |

## Atributos

Pasa los pares clave/valor de atributos DOT como objetos simples:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Se acepta cualquier atributo DOT válido; @knowvah/dot-engine se los pasa al
motor de diseño sin modificarlos.

## Subgrafos

`addSubgraph` devuelve un constructor limitado al subgrafo. Los nodos añadidos a un
subgrafo también son miembros del grafo raíz:

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

## Comparación con `parse`

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

Tanto `parse` como `createGraph` producen un `Graph` que se puede pasar de forma idéntica a
`render`, `getLayout` y `getDrawOps`.
