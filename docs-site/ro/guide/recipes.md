---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Rețete

Fragmente orientate pe sarcini pentru acele părți ale traseului construire →
aranjare → citirea geometriei care nu sunt evidente numai din referința API.
Fiecare rețetă este un exemplu minimal, executabil, care folosește doar
suprafața publică `@knowvah/dot-engine` / `@knowvah/dot-engine/api` /
`@knowvah/dot-engine/render` — fără clase interne de model. Lista completă a
punctelor de intrare din care provin aceste fragmente o găsiți la
`/guide/api`.

## 1. Construiți un graf în cod și randați-l

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**De ce:** `createGraph` vă oferă un constructor atunci când structura
grafului provine din datele aplicației, nu dintr-un șir DOT static; `render`
aranjează graful și îl serializează într-un singur apel. API-ul complet de
construire (subgrafuri, atribute, comparația cu `parse`) se află la
`/guide/build-a-graph`.

## 2. Aranjați fără randare, apoi citiți geometria

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

**De ce:** `getLayout` este un simplu cititor al geometriei deja calculate —
nu execută el însuși aranjarea. Dacă îl apelați înainte ca vreun apel de
aranjare să fi rulat, aruncă o `Error` cu `code` `ERR_INVALID_STATE`
(„getLayout requires a laid-out graph”; vedeți [Erori și
excepții](/ro/guide/errors)), în loc să returneze coordonate vechi sau
nulificate. Dacă aveți nevoie doar de geometrie și niciodată de șirul randat,
aruncați valoarea returnată de `render` — efectul secundar de aranjare este
ceea ce plătiți de fapt.

## 3. Alegeți axa y pentru randatorul dumneavoastră

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**De ce:** graphviz calculează aranjarea într-un sistem de coordonate cu axa y
în sus; majoritatea consumatorilor (canvas, DOM, SVG în browser) o doresc în
jos. `getLayout` are implicit `'down'`, astfel că majoritatea apelanților nu au
nevoie niciodată de această opțiune. Formula exactă de inversare și diferența
dintre cele două moduri pentru `bounds` le descrie `/guide/geometry`.

## 4. Reconciliați cadrul SVG din `render()` cu cadrul din `getLayout()`

`render(g, 'svg')` și `getLayout(g)` descriu *același* graf aranjat, dar în
cadre de coordonate diferite, iar diferența nu se reduce la inversarea axei y:
emițătorul SVG al lui `render` neagă fiecare coordonată y înainte de a scrie o
primitivă de formă, apoi înfășoară întregul desen într-un singur `<g
transform="scale(..) rotate(..) translate(tx,ty)">` care înglobează
marginile paginii, chenarul și orice scalare/rotire din `size=`. `getLayout`
omite toate acestea — returnează coordonate de model normalizate la o origine
`(0, 0)`, fără nicio geometrie de pagină.

Pentru orice apel `render()`, cele două cadre diferă printr-o singură
translație constantă. În loc să rederivați formula de așezare în pagină din
GVC, derivați decalajul empiric dintr-un nod ale cărui poziții le aveți în
ambele cadre:

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

**De ce:** o singură potrivire determină complet decalajul, deoarece este o
translație pură, nu o scalare sau o rotire (presupunând `size=`/`rotate=`
implicite). Aveți nevoie de aceasta doar când citiți din SVG-ul brut ceva ce
`getLayout` nu expune — vedeți rețeta 5 pentru singurul caz frecvent în care
acest lucru este, în prezent, inevitabil.

## 5. Recuperați pozițiile etichetelor de muchie

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

**De ce:** `EdgeGeometry.label` este prezent doar pentru o muchie pentru al
cărei atribut `label` graphviz a plasat efectiv o etichetă centrată; muchiile
fără una omit pur și simplu câmpul. `getLayout` returnează doar *poziția*
calculată — nu șirul etichetei și nici caseta ei măsurată — așa că, dacă
randatorul dumneavoastră trebuie să deseneze el însuși eticheta, asociați
această poziție cu dimensiunea pe care ați măsurat-o deja, de partea
dumneavoastră, pentru textul respectiv (de exemplu returnând propria hartă de
dimensiuni de etichete per muchie, cu aceeași cheie pereche tail/head pe care
ați folosit-o la construirea muchiei).

Etichetele de port `taillabel` și `headlabel` se întorc în același mod, în
`tailLabel` și `headLabel`:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Fiecare este prezentă doar după ce aranjarea a plasat-o — aceeași condiție în
care `render()` emite `<text>`-ul etichetei — deci nu este nevoie să extrageți
pozițiile din SVG-ul randat.

Un `xlabel` se întoarce în `xlabel`, cu aceeași condiție de „doar dacă a fost
plasat”. Merită citit, nu aproximat: graphviz poziționează o etichetă externă
printr-o căutare bazată pe forțe între pozițiile candidate, nu prin decalarea
punctului de mijloc al spline-ului, deci nicio aritmetică pe `label` sau
`points` nu o reproduce.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Desenați-vă propriile vârfuri de săgeată

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**De ce:** când un capăt poartă o săgeată, aranjarea scurtează spline-ul
pentru a lăsa loc și înregistrează unde trebuie să ajungă săgeata — `ep` la
capătul-cap (head), `sp` la capătul-coadă (tail). Ambele lipsesc când acel
capăt nu are săgeată, deci verificările de mai sus servesc și ca „are acest
capăt nevoie de săgeată?”. Extrapolarea unui vârf din direcția finală a
spline-ului nimerește direcția, dar ghicește adâncimea; acestea sunt valorile
calculate chiar de graphviz.

Rețineți că sunt puncte de atașare pe conturul nodului. Randatorul propriu al
Graphviz retrage poligonul pe care îl desenează față de ele cu o valoare
dependentă de grosimea peniței, așa că desenați *până la* `ep`, nu vă
așteptați ca acesta să coincidă cu vârful unei săgeți randate.

## 6. Asociați numele clusterelor din @knowvah/dot-engine cu ale dumneavoastră

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

**De ce:** `ClusterGeometry.name` returnează exact numele pe care l-ați dat lui
`addSubgraph` — @knowvah/dot-engine nu inventează, nu renumerotează și nu
transformă în alt mod numele. Dacă modelul dumneavoastră de domeniu identifică
clusterele printr-un id propriu (nu printr-un nume acceptat de graphviz),
păstrați singur asocierea id-nume la construirea grafului și re-indexați
instantaneea `clusters` după aranjare; nu încercați să deduceți semnificația
din numele propriu al graphviz.

## 6b. Desenați-vă propriul bloc de titlu de cluster

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**De ce:** aranjarea rezervă loc pentru titlul clusterului în interiorul
casetei clusterului și apoi stabilește unde se așază — respectând `labelloc`,
`labeljust`, `rankdir` și dimensiunea măsurată a etichetei. `ClusterGeometry.label`
publică această plasare rezolvată, astfel că un consumator care își desenează
propriul bloc de titlu o citește, în loc să remăsoare textul și să rederiveze
un decalaj care trebuie să coincidă cu cel al motorului.

`label.x`/`label.y` sunt **centrul** spațiului etichetei, spre deosebire de
`x`/`y` ale casetei, care reprezintă un colț. `<text>`-ul emis de `render()`
poartă în schimb *linia de bază*, care se află sub centru — așa că, dacă
potriviți rezultatul randat, comparați centre cu centre, nu cu `y`-ul emis.

## 7. Adăugați multe muchii în siguranță

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

**De ce:** `addEdge` al constructorului rezolvă `tail`/`head` după nume și
creează nodul la prima utilizare dacă nu există încă — nu trebuie niciodată să
declarați nodurile în prealabil înainte de a lega o listă de muchii generată
din date. Pe un graf `strict`, repetarea aceleiași perechi `(tail, head)`
returnează muchia existentă în loc să adauge una paralelă, oglindind contractul
de deduplicare `agedge` din cgraph.

Dacă adăugați muchii pe un graf produs de `parse()` și nu de `createGraph()`,
folosiți direct `addEdge(g, tail, head, name?)` de nivel inferior din
`@knowvah/dot-engine`, pe referințe `Node` pe care le dețineți deja:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Semnătura completă a lui `addEdge` și comportamentul său de deduplicare în
grafurile stricte le găsiți la `/reference`.

## 8. Totul laolaltă

O funcție compactă care preia un mic graf de domeniu, îl aranjează și
returnează noduri și muchii poziționate:

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

Aceasta este forma pe care o construiesc cei mai mulți consumatori peste
`getLayout`: un singur punct de extensie care primește tipurile dumneavoastră
de noduri/muchii la intrare și returnează geometria poziționată, în convenția
dumneavoastră de coordonate, la ieșire.
