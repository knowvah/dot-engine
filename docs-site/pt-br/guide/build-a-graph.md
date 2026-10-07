---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Construir um grafo em código

`createGraph` constrói um grafo na memória sem escrever código-fonte DOT. Use-o
quando a estrutura do grafo vem do modelo de dados da sua aplicação, e não de uma
string DOT estática.

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

`createGraph` retorna um `GvGraphBuilder`. Sua propriedade `.graph` é o objeto
`Graph` opaco aceito por `render`, `getLayout` e `getDrawOps`.

## Opções

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Métodos do construtor

| Método | Descrição |
|---|---|
| `addNode(name, attrs?)` | Adiciona um nó; retorna um identificador `GvNode` |
| `addEdge(tail, head, attrs?)` | Adiciona uma aresta; `tail`/`head` podem ser um identificador `GvNode` ou uma string de nome |
| `addSubgraph(name, attrs?)` | Adiciona um subgrafo nomeado; retorna um `GvGraphBuilder` aninhado |
| `setAttr(k, v)` | Define um atributo no nível do grafo |
| `getAttr(k)` | Lê um atributo no nível do grafo |
| `.graph` | O `Graph` subjacente (identificador opaco para layout/renderização) |

## Atributos

Passe pares chave/valor de atributos DOT como objetos simples:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Qualquer atributo DOT válido é aceito; o @knowvah/dot-engine os repassa ao
mecanismo de layout sem alteração.

## Subgrafos

`addSubgraph` retorna um construtor com escopo no subgrafo. Os nós adicionados a
um subgrafo também são membros do grafo raiz:

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

## Comparação com `parse`

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

Tanto `parse` quanto `createGraph` produzem um `Graph` que pode ser passado a
`render`, `getLayout` e `getDrawOps` de forma idêntica.
