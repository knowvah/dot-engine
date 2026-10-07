---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Recept

Uppgiftsorienterade kodavsnitt för de delar av vägen bygg → layout → läs
geometri som inte framgår av API-referensen ensam. Varje recept är ett
minimalt, körbart exempel som bara använder den publika ytan
`@knowvah/dot-engine` / `@knowvah/dot-engine/api` / `@knowvah/dot-engine/render`
— inga interna modellklasser. Se `/guide/api` för hela listan över de
ingångspunkter som avsnitten hämtar från.

## 1. Bygg en graf i kod och rendera den

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Varför:** `createGraph` ger dig en byggare när grafens struktur kommer från
applikationsdata i stället för en statisk DOT-sträng; `render` lägger ut
grafen och serialiserar den i ett enda anrop. Hela byggar-API:t (delgrafer,
attribut, jämförelse med `parse`) finns i `/guide/build-a-graph`.

## 2. Lägg ut utan att rendera och läs sedan geometrin

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

**Varför:** `getLayout` är en ren läsare över geometri som redan beräknats —
den kör inte själv någon layout. Anropar du den innan något layoutanrop har
körts kastas ett `Error` med `code` `ERR_INVALID_STATE` (”getLayout requires a
laid-out graph”; se [Fel och undantag](/sv/guide/errors)) i stället för att
ge dig inaktuella eller nollställda koordinater. Behöver du bara geometrin och
aldrig den renderade strängen kan du kasta returvärdet från `render` — det är
layoutens sidoeffekt du egentligen betalar för.

## 3. Välj y-axel för din renderare

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Varför:** graphviz beräknar layouten i ett koordinatsystem där y pekar
uppåt; de flesta konsumenter (canvas, DOM, SVG i webbläsaren) vill ha y nedåt.
`getLayout` har som standard `'down'`, så de flesta anropare behöver aldrig
alternativet. Se `/guide/geometry` för den exakta vändningsformeln och hur
`bounds` skiljer sig mellan de två lägena.

## 4. Förena SVG-ramen från `render()` med ramen från `getLayout()`

`render(g, 'svg')` och `getLayout(g)` beskriver *samma* utlagda graf men i
olika koordinatramar, och skillnaden är inte bara vändningen av y-axeln:
`render`s SVG-utmatare negerar varje y-koordinat innan en formprimitiv skrivs
och lägger sedan hela ritningen i ett enda `<g transform="scale(..)
rotate(..) translate(tx,ty)">` som rymmer graphvizs sidmarginal, marginaler
och eventuell skalning eller rotation via `size=`. `getLayout` hoppar över allt
det — den returnerar modellkoordinater normaliserade till origo `(0, 0)` utan
någon sidgeometri alls.

För varje enskilt `render()`-anrop skiljer sig de två ramarna åt med en enda
konstant translation. I stället för att härleda GVC:s sidlayoutformel på nytt
kan du räkna fram förskjutningen empiriskt från en nod du redan har
positioner för i båda ramarna:

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

**Varför:** en enda träff bestämmer förskjutningen fullständigt, eftersom det
är en ren translation och inte en skalning eller rotation (förutsatt
standardvärden för `size=`/`rotate=`). Du behöver detta bara när du läser ut
något ur den råa SVG-koden som `getLayout` inte exponerar — se recept 5 för
det vanliga fall där det i dag är oundvikligt.

## 5. Återskapa positioner för kantetiketter

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

**Varför:** `EdgeGeometry.label` finns bara för en kant där graphviz faktiskt
har placerat en centrerad etikett för attributet `label`; kanter utan etikett
utelämnar helt enkelt fältet. `getLayout` returnerar bara den beräknade
*positionen* — inte etikettsträngen eller dess uppmätta ruta — så om din
renderare själv behöver rita etiketten kombinerar du positionen med den
storlek du redan mätt upp för etikettexten på din egen sida (till exempel
genom att ge tillbaka din egen storlekskarta per kant, nycklad med samma
tail/head-par som du använde när du byggde kanten).

Portetiketterna `taillabel` och `headlabel` kommer tillbaka på samma sätt,
som `tailLabel` och `headLabel`:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Var och en finns bara när layouten har placerat den — samma villkor under
vilket `render()` skriver etikettens `<text>` — så du behöver inte skrapa den
renderade SVG-koden för att få fram de här positionerna.

En `xlabel` kommer tillbaka som `xlabel`, med samma villkor att den bara finns
när den har placerats. Den är värd att läsa ut i stället för att approximera:
graphviz placerar en extern etikett genom en kraftsökning bland kandidatplatser,
inte genom att förskjuta splinens mittpunkt, så ingen aritmetik på `label`
eller `points` återskapar den.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Rita egna pilspetsar

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Varför:** när en ände har en pil förkortar layouten splinen för att ge plats
åt den och registrerar var pilen ska nå — `ep` vid head-änden, `sp` vid
tail-änden. Båda saknas när änden inte har någon pil, så kontrollerna ovan
fungerar också som ”behöver den här änden en pil alls”. Att extrapolera en spets
från splinens sista riktning ger rätt riktning men gissar djupet; det här är de
värden som graphviz självt beräknade.

Observera att de är fästpunkter på nodens kant. Graphvizs egen renderare
drar in polygonen den ritar från dem med ett belopp som beror på penwidth, så
rita *till* `ep` i stället för att förvänta dig att den motsvarar spetsen på en
renderad pil.

## 6. Koppla @knowvah/dot-engines klusternamn tillbaka till dina egna

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

**Varför:** `ClusterGeometry.name` ger tillbaka exakt det namn du gav
`addSubgraph` — @knowvah/dot-engine hittar inte på, numrerar om eller
transformerar det på något annat sätt. Om din domänmodell nycklar kluster med
ett eget id (inte ett namn som graphviz skulle acceptera) behåller du själv
kopplingen mellan id och namn medan du bygger grafen och nyckelsätter
ögonblicksbilden `clusters` på nytt efter layouten; försök inte utvinna
mening ur graphvizs eget namn.

## 6b. Rita ditt eget klustertitelblock

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Varför:** layouten reserverar plats för en klustertitel inuti klusterrutan
och avgör sedan var den hamnar — med hänsyn till `labelloc`, `labeljust`,
`rankdir` och etikettens egen uppmätta storlek. `ClusterGeometry.label`
publicerar den avgjorda placeringen, så en konsument som ritar ett eget
titelblock läser den i stället för att mäta om texten och härleda en
förskjutning som måste stämma med motorns.

`label.x`/`label.y` är **mitten** av etikettutrymmet, till skillnad från
rutans `x`/`y`, som är ett hörn. `<text>` som `render()` skriver bär i stället
*baslinjen*, som ligger under mitten — så om du jämför med renderad utdata ska
du jämföra mittpunkter med mittpunkter, inte med det utskrivna `y`.

## 7. Lägg till många kanter på ett säkert sätt

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

**Varför:** byggarens `addEdge` slår upp `tail`/`head` på namn och skapar
noden vid första användningen om den inte finns än — du behöver aldrig
fördeklarera noder innan du kopplar ihop en datadriven kantlista. På en
`strict`-graf returnerar upprepning av samma `(tail, head)`-par den befintliga
kanten i stället för att lägga till en parallell, vilket speglar cgraphs
dedupliceringskontrakt för `agedge`.

Om du lägger till kanter på en graf som skapats med `parse()` i stället för
`createGraph()` använder du den lågnivåvariant `addEdge(g, tail, head, name?)`
som finns i `@knowvah/dot-engine` direkt på `Node`-referenser du redan har:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Se `/reference` för den fullständiga signaturen för `addEdge` och hur den
deduplicerar på strikta grafer.

## 8. Allt samlat

En kompakt funktion som tar en liten domängraf, lägger ut den och returnerar
positionerade noder och kanter:

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

Det här är den form som de flesta konsumenter till sist bygger ovanpå
`getLayout`: en enda kopplingspunkt som tar in dina egna nod- och kanttyper och
ger tillbaka positionerad geometri i din egen koordinatkonvention.
