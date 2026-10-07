---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Recepten

Taakgerichte fragmenten voor de onderdelen van het pad bouwen → lay-out →
geometrie uitlezen die uit de API-referentie alleen niet vanzelfsprekend zijn.
Elk recept is een minimaal, uitvoerbaar voorbeeld dat uitsluitend het publieke
oppervlak van `@knowvah/dot-engine` / `@knowvah/dot-engine/api` /
`@knowvah/dot-engine/render` gebruikt — geen interne modelklassen. Zie
`/guide/api` voor de volledige lijst met toegangspunten waaruit deze
fragmenten putten.

## 1. Een graaf in code bouwen en renderen

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Waarom:** `createGraph` geeft u een builder wanneer de structuur van uw graaf
uit applicatiegegevens komt in plaats van uit een statische DOT-string;
`render` legt de graaf uit en serialiseert die in één aanroep. De volledige
builder-API (subgrafen, attributen, vergelijking met `parse`) staat in
`/guide/build-a-graph`.

## 2. Lay-out zonder renderen, daarna de geometrie uitlezen

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

**Waarom:** `getLayout` is een zuivere lezer over reeds berekende geometrie —
het voert zelf geen lay-out uit. Roept u het aan voordat er een lay-out-aanroep
heeft gedraaid, dan werpt het een `Error` met `code` `ERR_INVALID_STATE`
("getLayout requires a laid-out graph"; zie [Fouten en
uitzonderingen](/nl/guide/errors)) in plaats van verouderde of op nul gezette
coördinaten terug te geven. Als u alleen de geometrie nodig hebt en de
gerenderde string nooit, negeer dan de returnwaarde van `render` — het
neveneffect van de lay-out is waar u daadwerkelijk voor betaalt.

## 3. De y-as kiezen voor uw renderer

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Waarom:** graphviz berekent de lay-out in een y-omhoog-coördinatenstelsel; de
meeste afnemers (canvas, DOM, SVG in de browser) willen y-omlaag. `getLayout`
gebruikt standaard `'down'`, zodat de meeste aanroepers de optie nooit nodig
hebben. Zie `/guide/geometry` voor de exacte spiegelformule en voor hoe
`bounds` tussen de twee modi verschilt.

## 4. Het SVG-frame van `render()` afstemmen op het frame van `getLayout()`

`render(g, 'svg')` en `getLayout(g)` beschrijven *dezelfde* uitgelegde graaf,
maar in verschillende coördinatenframes, en het verschil is meer dan alleen de
spiegeling van de y-as: de SVG-emitter van `render` keert het teken van elke
y-coördinaat om voordat een vormprimitief wordt
geschreven, en verpakt daarna de hele tekening in één `<g
transform="scale(..) rotate(..) translate(tx,ty)">` die de paginavulling
(padding), de marge en eventuele `size=`-/rotatieschaling van graphviz
verwerkt. `getLayout` slaat dat alles over — het geeft modelcoördinaten terug,
genormaliseerd naar een oorsprong `(0, 0)` zonder enige paginageometrie.

Voor elke afzonderlijke `render()`-aanroep verschillen de twee frames door één
constante translatie. In plaats van de paginalay-outformule van GVC opnieuw af
te leiden, bepaalt u de offset empirisch aan de hand van één knoop waarvan u de
posities in beide frames al hebt:

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

**Waarom:** één overeenkomst bepaalt de offset volledig, omdat het een zuivere
translatie is en geen schaling of rotatie (uitgaande van de standaardwaarden
voor `size=`/`rotate=`). U hebt dit alleen nodig wanneer u iets uit de ruwe SVG
leest dat `getLayout` niet blootstelt — zie recept 5 voor het ene veelvoorkomende
geval waarin dat vandaag onvermijdelijk is.

## 5. Posities van kantlabels achterhalen

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

**Waarom:** `EdgeGeometry.label` is alleen aanwezig voor een kant waarvoor
graphviz daadwerkelijk een gecentreerd label heeft geplaatst op basis van het
attribuut `label`; kanten zonder label laten het veld eenvoudig weg.
`getLayout` geeft alleen de berekende *positie* terug — niet de labelstring of
het gemeten kader ervan — dus als uw renderer het label zelf moet tekenen,
combineer dan deze positie met de afmeting die u zelf al voor die labeltekst
hebt gemeten (bijvoorbeeld door uw eigen label-afmetingenmap per kant terug te
geven, met als sleutel hetzelfde tail/head-paar dat u gebruikte om de kant te
bouwen).

De poortlabels `taillabel` en `headlabel` komen op dezelfde manier terug, op
`tailLabel` en `headLabel`:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Elk is alleen aanwezig zodra de lay-out het heeft geplaatst — dezelfde
voorwaarde waaronder `render()` de `<text>` van het label uitgeeft — dus u hoeft
de gerenderde SVG niet te doorzoeken om deze posities te achterhalen.

Een `xlabel` komt terug op `xlabel`, onder dezelfde alleen-indien-geplaatst-
voorwaarde. Het is de moeite waard het uit te lezen in plaats van te benaderen:
graphviz positioneert een extern label via een krachtgestuurde zoektocht over
kandidaatposities, niet door het midden van de spline te verschuiven, dus geen
enkele rekensom op `label` of `points` reproduceert het.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Eigen pijlpunten tekenen

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Waarom:** wanneer een uiteinde een pijl heeft, verkort de lay-out de spline
om ruimte voor die pijl te laten en legt vast waar de pijl moet aankomen — `ep`
aan het head-uiteinde, `sp` aan de tail. Beide ontbreken wanneer dat uiteinde
geen pijl heeft, dus de bovenstaande controles dienen tevens als "heeft dit
uiteinde überhaupt een pijl nodig". Een punt extrapoleren uit de laatste
richting van de spline levert de richting goed op, maar raadt de diepte; dit
zijn de waarden die graphviz zelf heeft berekend.

Merk op dat het aanhechtpunten op de knoopgrens zijn. De eigen renderer van
Graphviz trekt de veelhoek die hij tekent daar, afhankelijk van de lijndikte,
een stukje vanaf in, dus teken *naar* `ep` toe in plaats van te verwachten dat
het gelijk is aan de punt van een gerenderde pijl.

## 6. Clusternamen van @knowvah/dot-engine terugvertalen naar de uwe

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

**Waarom:** `ClusterGeometry.name` geeft precies de naam terug die u aan
`addSubgraph` hebt gegeven — @knowvah/dot-engine verzint, hernummert of
transformeert die op geen enkele wijze. Als uw domeinmodel clusters op een eigen
id indexeert (en niet op een naam die graphviz zou accepteren), houd dan zelf de
koppeling van id naar naam bij tijdens het bouwen van de graaf en herindexeer
de momentopname `clusters` na de lay-out; probeer geen betekenis te herleiden
uit de eigen naam van graphviz.

## 6b. Eigen cluster-titelblok tekenen

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Waarom:** de lay-out reserveert ruimte voor een clustertitel binnen het
clusterkader en bepaalt vervolgens waar die komt te staan — met inachtneming van
`labelloc`, `labeljust`, `rankdir` en de eigen gemeten afmeting van het label.
`ClusterGeometry.label` publiceert die bepaalde plaatsing, zodat een afnemer die
een eigen titelblok tekent die uitleest in plaats van de tekst opnieuw te meten
en een offset opnieuw af te leiden die met die van de engine moet overeenkomen.

`label.x`/`label.y` zijn het **midden** van de labelruimte, anders dan `x`/`y`
van het kader, dat een hoek is. De `<text>` die `render()` uitgeeft bevat in
plaats daarvan de *basislijn*, die onder het midden ligt — dus als u gerenderde
uitvoer vergelijkt, vergelijk dan midden met midden, niet met de uitgegeven `y`.

## 7. Veel kanten veilig toevoegen

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

**Waarom:** de `addEdge` van de builder bepaalt `tail`/`head` op naam en maakt
de knoop bij het eerste gebruik aan als die nog niet bestaat — u hoeft knopen
nooit vooraf te declareren voordat u een gegevensgestuurde kantenlijst
aansluit. Bij een `strict`-graaf geeft het herhalen van hetzelfde paar
`(tail, head)` de bestaande kant terug in plaats van een parallelle toe te
voegen, in overeenstemming met het dedupliceringscontract van `agedge` in
cgraph.

Als u kanten toevoegt aan een graaf die door `parse()` is geproduceerd in plaats
van door `createGraph()`, gebruik dan de lagere `addEdge(g, tail, head, name?)`
uit `@knowvah/dot-engine` rechtstreeks op `Node`-verwijzingen die u al bezit:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Zie `/reference` voor de volledige signatuur van `addEdge` en het
dedupliceringsgedrag bij strict-grafen.

## 8. Alles samengevoegd

Een compacte functie die een kleine domeingraaf neemt, uitlegt en de
gepositioneerde knopen en kanten teruggeeft:

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

Dit is de vorm waarop de meeste afnemers uiteindelijk voortbouwen op
`getLayout`: één koppelpunt dat uw eigen knoop-/kanttypen aanneemt en
gepositioneerde geometrie in uw eigen coördinatenconventie teruggeeft.
