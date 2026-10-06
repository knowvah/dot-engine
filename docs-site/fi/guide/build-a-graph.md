---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Graafin rakentaminen koodissa

`createGraph` muodostaa muistinvaraisen graafin kirjoittamatta DOT-lähdekoodia. Käytä sitä,
kun graafin rakenne tulee sovelluksesi tietomallista eikä staattisesta DOT-merkkijonosta.

## Peruskäyttö

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

`createGraph` palauttaa `GvGraphBuilder`-olion. Sen `.graph`-ominaisuus on läpinäkymätön
`Graph`-objekti, jonka `render`, `getLayout` ja `getDrawOps` hyväksyvät.

## Valinnat

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Rakentajan metodit

| Metodi | Kuvaus |
|---|---|
| `addNode(name, attrs?)` | Lisää solmu; palauttaa `GvNode`-kahvan |
| `addEdge(tail, head, attrs?)` | Lisää kaari; `tail`/`head` voi olla `GvNode`-kahva tai nimimerkkijono |
| `addSubgraph(name, attrs?)` | Lisää nimetty aligraafi; palauttaa sisäkkäisen `GvGraphBuilder`-olion |
| `setAttr(k, v)` | Aseta graafitason attribuutti |
| `getAttr(k)` | Lue graafitason attribuutti |
| `.graph` | Taustalla oleva `Graph` (läpinäkymätön kahva asettelua/renderöintiä varten) |

## Attribuutit

Anna DOT-attribuuttien avain–arvo-parit tavallisina objekteina:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Mikä tahansa kelvollinen DOT-attribuutti hyväksytään; @knowvah/dot-engine välittää ne
asettelumoottorille muuttamattomina.

## Aligraafit

`addSubgraph` palauttaa aligraafiin rajatun rakentajan. Aligraafiin lisätyt solmut
ovat myös juurigraafin jäseniä:

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

## Verrattuna `parse`-funktioon

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

Sekä `parse` että `createGraph` tuottavat `Graph`-objektin, jonka voi antaa
`render`-, `getLayout`- ja `getDrawOps`-funktioille täysin samalla tavalla.
