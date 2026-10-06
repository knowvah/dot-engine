---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Construire un graphe en code

`createGraph` construit un graphe en mémoire sans écrire de source DOT. Utilisez-le
lorsque la structure du graphe provient du modèle de données de votre application plutôt que d’une
chaîne DOT statique.

## Utilisation de base

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

`createGraph` renvoie un `GvGraphBuilder`. Sa propriété `.graph` est l’objet
`Graph` opaque accepté par `render`, `getLayout` et `getDrawOps`.

## Options

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Méthodes du constructeur

| Méthode | Description |
|---|---|
| `addNode(name, attrs?)` | Ajoute un nœud ; renvoie un handle `GvNode` |
| `addEdge(tail, head, attrs?)` | Ajoute une arête ; `tail`/`head` peuvent être un handle `GvNode` ou une chaîne de nom |
| `addSubgraph(name, attrs?)` | Ajoute un sous-graphe nommé ; renvoie un `GvGraphBuilder` imbriqué |
| `setAttr(k, v)` | Définit un attribut au niveau du graphe |
| `getAttr(k)` | Lit un attribut au niveau du graphe |
| `.graph` | Le `Graph` sous-jacent (handle opaque pour la disposition/le rendu) |

## Attributs

Passez les paires clé/valeur d’attributs DOT sous forme d’objets simples :

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Tout attribut DOT valide est accepté ; @knowvah/dot-engine les transmet au
moteur de disposition sans modification.

## Sous-graphes

`addSubgraph` renvoie un constructeur limité au sous-graphe. Les nœuds ajoutés à un
sous-graphe sont aussi membres du graphe racine :

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

## Comparaison avec `parse`

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

`parse` comme `createGraph` produisent un `Graph` qui peut être passé de la même façon à
`render`, `getLayout` et `getDrawOps`.
