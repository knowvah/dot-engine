---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Graafi koostamine koodis

`createGraph` koostab mälusisese graafi ilma DOT-lähtekoodi kirjutamata. Kasutage seda
siis, kui graafi struktuur tuleb teie rakenduse andmemudelist, mitte
staatilisest DOT-stringist.

## Põhikasutus

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

`createGraph` tagastab `GvGraphBuilder`-i. Selle `.graph` omadus on läbipaistmatu
`Graph`-objekt, mida aktsepteerivad `render`, `getLayout` ja `getDrawOps`.

## Valikud

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Koostaja meetodid

| Meetod | Kirjeldus |
|---|---|
| `addNode(name, attrs?)` | Lisab sõlme; tagastab `GvNode` käepideme |
| `addEdge(tail, head, attrs?)` | Lisab serva; `tail`/`head` võib olla `GvNode` käepide või nimestring |
| `addSubgraph(name, attrs?)` | Lisab nimega alamgraafi; tagastab pesastatud `GvGraphBuilder`-i |
| `setAttr(k, v)` | Seab graafitaseme atribuudi |
| `getAttr(k)` | Loeb graafitaseme atribuuti |
| `.graph` | Aluseks olev `Graph` (läbipaistmatu käepide paigutuse/renderduse jaoks) |

## Atribuudid

Andke DOT-i atribuutide võtme/väärtuse paarid tavaliste objektidena:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Aktsepteeritakse iga kehtivat DOT-i atribuuti; @knowvah/dot-engine annab need
paigutusmootorile edasi muutmata kujul.

## Alamgraafid

`addSubgraph` tagastab alamgraafile piiritletud koostaja. Alamgraafi lisatud
sõlmed on ka juurgraafi liikmed:

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

## Võrdlus funktsiooniga `parse`

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

Nii `parse` kui ka `createGraph` toodavad `Graph`-i, mille saab ühtemoodi anda
funktsioonidele `render`, `getLayout` ja `getDrawOps`.
