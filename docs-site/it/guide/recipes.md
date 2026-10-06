---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Ricette

Frammenti orientati ai compiti per le parti del percorso costruzione → layout →
lettura della geometria che non risultano ovvie dal solo riferimento API. Ogni
ricetta è un esempio minimo ed eseguibile che usa soltanto la superficie
pubblica di `@knowvah/dot-engine` / `@knowvah/dot-engine/api` /
`@knowvah/dot-engine/render`, senza classi interne del modello. Per l'elenco
completo dei punti di ingresso da cui attingono questi frammenti vedi
`/guide/api`.

## 1. Costruire un grafo nel codice e renderizzarlo

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Perché:** `createGraph` ti dà un builder quando la struttura del grafo
proviene dai dati dell'applicazione anziché da una stringa DOT statica;
`render` calcola il layout del grafo e lo serializza in un'unica chiamata.
L'API completa del builder (sottografi, attributi, confronto con `parse`) si
trova in `/guide/build-a-graph`.

## 2. Calcolare il layout senza renderizzare, poi leggere la geometria

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

// render() triggers layout as a side effect and leaves the computed
// geometry on the graph. Call it (or the lower-level ctx.layout) BEFORE
// getLayout(), even if you don't need render()'s return value.
render(b.graph, 'svg');

const layout = getLayout(b.graph);
for (const n of layout.nodes) {
  console.log(n.name, n.x, n.y, n.width, n.height);
}
```

**Perché:** `getLayout` è un semplice lettore della geometria già calcolata:
non esegue il layout da sé. Se lo chiami prima che sia stata eseguita una
qualsiasi chiamata di layout, lancia un `Error` con `code` `ERR_INVALID_STATE`
("getLayout requires a laid-out graph"; vedi
[Errori ed eccezioni](/it/guide/errors)) anziché restituire coordinate obsolete
o azzerate. Se ti serve solo la geometria e mai la stringa renderizzata,
scarta il valore restituito da `render`: ciò che paghi davvero è l'effetto
collaterale del layout.

## 3. Scegliere l'asse y per il tuo renderer

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Perché:** Graphviz calcola il layout in un sistema di coordinate con y verso
l'alto; la maggior parte dei consumatori (canvas, DOM, SVG nel browser) vuole
y verso il basso. `getLayout` usa `'down'` per impostazione predefinita, quindi
la maggior parte di chi lo chiama non ha mai bisogno dell'opzione. Vedi
`/guide/geometry` per la formula esatta di inversione e per come `bounds`
differisce tra le due modalità.

## 4. Riconciliare il riquadro SVG di `render()` con quello di `getLayout()`

`render(g, 'svg')` e `getLayout(g)` descrivono lo *stesso* grafo con il layout
calcolato, ma in sistemi di coordinate diversi, e la differenza non è solo
l'inversione dell'asse y: l'emettitore SVG di `render` nega ogni coordinata y
prima di scrivere una primitiva di forma, poi racchiude l'intero disegno in un
unico `<g transform="scale(..) rotate(..) translate(tx,ty)">` che incorpora il
padding della pagina, il margine ed eventuali scalature o rotazioni dovute a
`size=`. `getLayout` salta tutto questo: restituisce coordinate del modello
normalizzate con origine in `(0, 0)` e nessuna geometria di pagina.

Per ogni singola chiamata a `render()`, i due sistemi di riferimento
differiscono per una traslazione costante. Anziché rideterminare la formula di
impaginazione di GVC, ricava lo scostamento in modo empirico da un nodo di cui
hai già le posizioni in entrambi i sistemi:

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('start');
b.addNode('end');
b.addEdge('start', 'end');

const svg = render(b.graph, 'svg');
const layout = getLayout(b.graph);

/** Bounding-box center of a `<g id="nodeN" class="node">` block's own
 *  `<polygon points="...">`, keyed by the node name in its `<title>`. */
function svgNodeCenter(svg: string, name: string): { x: number; y: number } | undefined {
  const block = new RegExp(
    `<g id="node\\d+" class="node">\\s*<title>${name}</title>([\\s\\S]*?)</g>`,
  ).exec(svg)?.[1];
  const pts = block !== undefined ? /points="([^"]+)"/.exec(block)?.[1] : undefined;
  if (pts === undefined) return undefined;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const pair of pts.trim().split(/\s+/)) {
    const [x, y] = pair.split(',').map(Number);
    xs.push(x ?? 0);
    ys.push(y ?? 0);
  }
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

const anchor = layout.nodes[0]!;
const rendered = svgNodeCenter(svg, anchor.name)!;
const offset = { dx: rendered.x - anchor.x, dy: rendered.y - anchor.y };

// offset is a pure translation for this render() call. Apply it to any
// other coordinate you scrape out of the same svg string to convert it
// into getLayout()'s frame:
// { x: scrapedX - offset.dx, y: scrapedY - offset.dy }
```

**Perché:** una sola corrispondenza determina completamente lo scostamento,
perché si tratta di una pura traslazione, non di una scala o di una rotazione
(supponendo i valori predefiniti di `size=`/`rotate=`). Ti serve solo quando
leggi dall'SVG grezzo qualcosa che `getLayout` non espone: vedi la ricetta 5
per l'unico caso comune in cui oggi è inevitabile.

## 5. Recuperare le posizioni delle etichette degli archi

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client');
b.addNode('server');
b.addEdge('client', 'server', { label: 'HTTP GET' });

render(b.graph, 'svg');
const layout = getLayout(b.graph);

for (const e of layout.edges) {
  if (e.label !== undefined) {
    console.log(`${e.tail} -> ${e.head} label center: (${e.label.x}, ${e.label.y})`);
  }
}
```

**Perché:** `EdgeGeometry.label` è presente solo per un arco per il quale
Graphviz ha effettivamente collocato un'etichetta centrata a partire
dall'attributo `label`; gli archi che non ne hanno una omettono semplicemente
il campo. `getLayout` restituisce solo la *posizione* calcolata, non la
stringa dell'etichetta né il suo riquadro misurato: se il tuo renderer deve
disegnare l'etichetta da sé, abbina questa posizione alla dimensione che hai
già misurato per quel testo dalla tua parte (per esempio restituendo la tua
mappa delle dimensioni delle etichette per arco, indicizzata dalla stessa
coppia tail/head che hai usato per costruire l'arco).

Le etichette di porta `taillabel` e `headlabel` tornano nello stesso modo, in
`tailLabel` e `headLabel`:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Ciascuna è presente solo se il layout l'ha collocata, la stessa condizione in
cui `render()` emette il `<text>` dell'etichetta, quindi non c'è bisogno di
analizzare l'SVG renderizzato per recuperare queste posizioni.

Un `xlabel` torna in `xlabel`, con lo stesso criterio di presenza solo se
collocato. Conviene leggerlo anziché approssimarlo: Graphviz posiziona
un'etichetta esterna con una ricerca a forze tra gli slot candidati, non con
uno scostamento dal punto medio della spline, quindi nessun calcolo su `label`
o `points` lo riproduce.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Disegnare le proprie punte di freccia

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Perché:** quando un'estremità porta una freccia, il layout accorcia la spline
per lasciarle spazio e registra dove la freccia deve arrivare: `ep` all'estremità
head, `sp` a quella tail. Entrambi sono assenti quando quell'estremità non ha
una freccia, perciò i controlli qui sopra valgono anche come "questa estremità
ha bisogno di una freccia?". Estrapolare la punta dalla direzione finale della
spline dà la direzione giusta ma ne indovina la profondità; questi sono i
valori calcolati da Graphviz stesso.

Nota che sono punti di attacco sul bordo del nodo. Il renderer di Graphviz
arretra da essi il poligono che disegna di una quantità che dipende dallo
spessore del tratto (penwidth): disegna quindi *fino a* `ep` anziché aspettarti
che coincida con la punta di una freccia renderizzata.

## 6. Mappare i nomi dei cluster di @knowvah/dot-engine sui tuoi

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });

// graphviz only treats a subgraph as a cluster when its name starts with
// the literal prefix "cluster". Generate one synthetic name per caller
// cluster id and remember the reverse mapping before layout runs.
const idByName = new Map<string, string>();
function addCluster(id: string, label: string) {
  const name = `cluster${idByName.size}`;
  idByName.set(name, id);
  return b.addSubgraph(name, { label });
}

const web = addCluster('web-tier', 'Web');
web.addNode('lb');
web.addNode('app1');
web.addEdge('lb', 'app1');

b.addNode('db');
b.addEdge('app1', 'db');

render(b.graph, 'svg');
const layout = getLayout(b.graph);

const clustersByCallerId = new Map(
  layout.clusters.map((c) => [idByName.get(c.name) ?? c.name, c]),
);
// clustersByCallerId.get('web-tier') -> { name, x, y, width, height }
```

**Perché:** `ClusterGeometry.name` restituisce esattamente il nome che hai dato
a `addSubgraph`: @knowvah/dot-engine non lo inventa, non lo rinumera né lo
trasforma in altro modo. Se il tuo modello di dominio identifica i cluster con
un proprio id (non con un nome che Graphviz accetterebbe), mantieni tu la
mappatura id-nome mentre costruisci il grafo e reindicizza l'istantanea di
`clusters` dopo il layout; non cercare di ricavare significato dal nome
assegnato da Graphviz.

## 6b. Disegnare il proprio blocco del titolo del cluster

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Perché:** il layout riserva spazio per il titolo di un cluster dentro il
riquadro del cluster e poi stabilisce dove collocarlo, rispettando `labelloc`,
`labeljust`, `rankdir` e la dimensione misurata dell'etichetta stessa.
`ClusterGeometry.label` pubblica questa collocazione risolta, così un
consumatore che disegna il proprio blocco del titolo la legge, invece di
rimisurare il testo e rideterminare uno scostamento che deve concordare con
quello del motore.

`label.x`/`label.y` sono il **centro** dello spazio dell'etichetta, a
differenza di `x`/`y` del riquadro, che è un angolo. Il `<text>` emesso da
`render()` porta invece la *linea di base*, che si trova sotto il centro:
quindi, se confronti con l'output renderizzato, confronta centri con centri,
non con la `y` emessa.

## 7. Aggiungere molti archi in modo sicuro

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true, strict: true });

const dependencies: Array<[string, string]> = [
  ['build', 'test'],
  ['test', 'deploy'],
  ['build', 'lint'],
  ['lint', 'test'],
  ['build', 'test'], // duplicate -- collapsed on a strict graph, not doubled
];

for (const [from, to] of dependencies) {
  b.addEdge(from, to);
}

const svg = render(b.graph, 'svg');
```

**Perché:** `addEdge` del builder risolve `tail`/`head` per nome e crea il nodo
al primo utilizzo se non esiste ancora: non devi mai dichiarare i nodi in
anticipo prima di collegare un elenco di archi guidato dai dati. In un grafo
`strict`, ripetere la stessa coppia `(tail, head)` restituisce l'arco esistente
anziché aggiungerne uno parallelo, rispecchiando il contratto di
deduplicazione di `agedge` di cgraph.

Se aggiungi archi a un grafo prodotto da `parse()` anziché da `createGraph()`,
usa direttamente il più basso livello `addEdge(g, tail, head, name?)` di
`@knowvah/dot-engine` sui riferimenti `Node` che hai già in mano:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Per la firma completa di `addEdge` e il suo comportamento di deduplicazione nei
grafi strict vedi `/reference`.

## 8. Mettere tutto insieme

Una funzione compatta che prende un piccolo grafo di dominio, ne calcola il
layout e restituisce nodi e archi posizionati:

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';
import type { LayoutSnapshot } from '@knowvah/dot-engine';

interface DomainNode {
  id: string;
  label: string;
}

interface DomainEdge {
  from: string;
  to: string;
  label?: string;
}

interface PositionedGraph {
  nodes: Array<{ id: string; x: number; y: number; width: number; height: number }>;
  edges: Array<{
    from: string;
    to: string;
    points: { x: number; y: number }[];
    label?: { x: number; y: number };
  }>;
  width: number;
  height: number;
}

function layoutDomainGraph(nodes: DomainNode[], edges: DomainEdge[]): PositionedGraph {
  const b = createGraph({ directed: true });
  for (const n of nodes) b.addNode(n.id, { label: n.label });
  for (const e of edges) {
    b.addEdge(e.from, e.to, e.label !== undefined ? { label: e.label } : {});
  }

  // render() triggers layout; getLayout() reads the geometry it left behind.
  render(b.graph, 'svg');
  const snap: LayoutSnapshot = getLayout(b.graph);

  return {
    nodes: snap.nodes.map((n) => ({
      id: n.name,
      // graphviz reports the node CENTER; convert to top-left if your
      // renderer expects that instead.
      x: n.x - n.width / 2,
      y: n.y - n.height / 2,
      width: n.width,
      height: n.height,
    })),
    edges: snap.edges.map((e) => ({
      from: e.tail,
      to: e.head,
      points: e.points,
      ...(e.label !== undefined ? { label: e.label } : {}),
    })),
    width: snap.bounds.width,
    height: snap.bounds.height,
  };
}
```

Questa è la forma che la maggior parte dei consumatori finisce per costruire
sopra `getLayout`: un unico punto di estensione che accetta i tuoi tipi di
nodo/arco e restituisce la geometria posizionata nella tua convenzione di
coordinate.
