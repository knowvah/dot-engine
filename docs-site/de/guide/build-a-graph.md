---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Einen Graphen im Code aufbauen

`createGraph` konstruiert einen Graphen im Speicher, ohne DOT-Quelltext zu schreiben.
Verwenden Sie es, wenn die Graphstruktur aus dem Datenmodell Ihrer Anwendung stammt und
nicht aus einem statischen DOT-String.

## Grundlegende Verwendung

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

`createGraph` gibt einen `GvGraphBuilder` zurück. Seine Eigenschaft `.graph` ist das
opake `Graph`-Objekt, das `render`, `getLayout` und `getDrawOps` akzeptieren.

## Optionen

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Builder-Methoden

| Methode | Beschreibung |
|---|---|
| `addNode(name, attrs?)` | Fügt einen Knoten hinzu; gibt ein `GvNode`-Handle zurück |
| `addEdge(tail, head, attrs?)` | Fügt eine Kante hinzu; `tail`/`head` können ein `GvNode`-Handle oder ein Namens-String sein |
| `addSubgraph(name, attrs?)` | Fügt einen benannten Teilgraphen hinzu; gibt einen verschachtelten `GvGraphBuilder` zurück |
| `setAttr(k, v)` | Setzt ein Attribut auf Graphebene |
| `getAttr(k)` | Liest ein Attribut auf Graphebene |
| `.graph` | Der zugrunde liegende `Graph` (opakes Handle für Layout/Rendering) |

## Attribute

Übergeben Sie DOT-Attribut-Schlüssel/-Wert-Paare als schlichte Objekte:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Jedes gültige DOT-Attribut wird akzeptiert; @knowvah/dot-engine reicht es unverändert an
die Layout-Engine durch.

## Teilgraphen

`addSubgraph` gibt einen auf den Teilgraphen beschränkten Builder zurück. Knoten, die einem
Teilgraphen hinzugefügt werden, sind zugleich Mitglieder des Wurzelgraphen:

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

## Vergleich mit `parse`

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

Sowohl `parse` als auch `createGraph` erzeugen einen `Graph`, der identisch an `render`,
`getLayout` und `getDrawOps` übergeben werden kann.
