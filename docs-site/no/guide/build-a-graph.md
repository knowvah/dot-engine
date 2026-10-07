---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Bygg en graf i kode

`createGraph` konstruerer en graf i minnet uten at du skriver DOT-kildekode. Bruk den
når grafstrukturen kommer fra applikasjonens datamodell i stedet for fra en
statisk DOT-streng.

## Grunnleggende bruk

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

`createGraph` returnerer en `GvGraphBuilder`. Egenskapen `.graph` er det ugjennomsiktige
`Graph`-objektet som `render`, `getLayout` og `getDrawOps` godtar.

## Alternativer

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Byggermetoder

| Metode | Beskrivelse |
|---|---|
| `addNode(name, attrs?)` | Legger til en node; returnerer et `GvNode`-håndtak |
| `addEdge(tail, head, attrs?)` | Legger til en kant; `tail`/`head` kan være et `GvNode`-håndtak eller en navnestreng |
| `addSubgraph(name, attrs?)` | Legger til en navngitt delgraf; returnerer en nøstet `GvGraphBuilder` |
| `setAttr(k, v)` | Setter et attributt på grafnivå |
| `getAttr(k)` | Leser et attributt på grafnivå |
| `.graph` | Den underliggende `Graph` (ugjennomsiktig håndtak for layout/render) |

## Attributter

Send DOT-attributter som nøkkel/verdi-par i vanlige objekter:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Alle gyldige DOT-attributter godtas; @knowvah/dot-engine sender dem videre til
layoutmotoren uendret.

## Delgrafer

`addSubgraph` returnerer en bygger avgrenset til delgrafen. Noder som legges til i en
delgraf er også medlemmer av rotgrafen:

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

## Sammenlignet med `parse`

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

Både `parse` og `createGraph` produserer en `Graph` som kan sendes til
`render`, `getLayout` og `getDrawOps` på nøyaktig samme måte.
