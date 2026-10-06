---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Opskrifter

Opgaveorienterede kodestumper til de dele af stien bygge → layout → læs
geometri, som ikke er indlysende alene ud fra API-referencen. Hver opskrift er
et minimalt, kørbart eksempel, der kun bruger den offentlige overflade
`@knowvah/dot-engine` / `@knowvah/dot-engine/api` / `@knowvah/dot-engine/render`
— ingen interne modelklasser. Se `/guide/api` for den fulde liste over de
indgangspunkter, kodestumperne trækker på.

## 1. Byg en graf i kode og render den

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Hvorfor:** `createGraph` giver dig en builder, når grafens struktur kommer
fra applikationsdata frem for en statisk DOT-streng; `render` lægger grafen ud
og serialiserer den i ét kald. Den fulde builder-API (undergrafer, attributter,
sammenligning med `parse`) findes i `/guide/build-a-graph`.

## 2. Læg ud uden at rendere, og læs derefter geometrien

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

**Hvorfor:** `getLayout` er en ren læser over allerede beregnet geometri — den
kører ikke selv layout. Kalder du den, før noget layoutkald er kørt, kaster den
en `Error` med `code` `ERR_INVALID_STATE` ("getLayout requires a laid-out
graph"; se [Fejl og undtagelser](/da/guide/errors)) i stedet for at give
forældede eller nulstillede koordinater tilbage. Hvis du kun har brug for
geometrien og aldrig for den renderede streng, så kassér `render`s
returværdi — det er layoutbivirkningen, du i virkeligheden betaler for.

## 3. Vælg y-aksen til din renderer

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Hvorfor:** graphviz beregner layout i et y-op-koordinatsystem; de fleste
forbrugere (canvas, DOM, SVG i browseren) vil have y-ned. `getLayout` bruger
som standard `'down'`, så de fleste kaldere aldrig behøver indstillingen. Se
`/guide/geometry` for den præcise vendingsformel, og for hvordan `bounds`
adskiller sig mellem de to tilstande.

## 4. Afstem SVG-rammen fra `render()` med rammen fra `getLayout()`

`render(g, 'svg')` og `getLayout(g)` beskriver den *samme* udlagte graf, men i
forskellige koordinatrammer, og forskellen er ikke kun vendingen af y-aksen:
`render`s SVG-udsender negerer hver y-koordinat, før den skriver en
formprimitiv, og pakker derefter hele tegningen ind i ét
`<g transform="scale(..) rotate(..) translate(tx,ty)">`, der indregner
graphviz' sidepolstring, margen og eventuel skalering/rotation fra
`size=`. `getLayout` springer alt det over — den returnerer modelkoordinater
normaliseret til et `(0, 0)`-origo uden nogen sidegeometri overhovedet.

For ethvert enkelt `render()`-kald adskiller de to rammer sig med én konstant
translation. I stedet for at udlede GVC's sidelayoutformel på ny kan du finde
forskydningen empirisk ud fra én knude, du allerede har positioner for i begge
rammer:

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

**Hvorfor:** ét match fastlægger forskydningen fuldstændigt, fordi det er en
ren translation og hverken skalering eller rotation (forudsat standardværdier
for `size=`/`rotate=`). Du har kun brug for dette, når du læser noget ud af den
rå SVG, som `getLayout` ikke eksponerer — se opskrift 5 for det ene almindelige
tilfælde, hvor det i dag er uundgåeligt.

## 5. Gendan placeringen af kantetiketter

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

**Hvorfor:** `EdgeGeometry.label` findes kun for en kant, hvor graphviz faktisk
har placeret en centreret etiket for attributten `label`; kanter uden en
udelader blot feltet. `getLayout` returnerer kun den beregnede *position* — ikke
etiketstrengen eller dens målte boks — så hvis din renderer selv skal tegne
etiketten, så par positionen med den størrelse, du allerede har målt for
etiketteksten hos dig selv (fx ved at give dit eget kort over etiketstørrelser
pr. kant tilbage, nøglet på det samme tail/head-par, som du brugte til at bygge
kanten).

Portetiketterne `taillabel` og `headlabel` kommer tilbage på samme måde, på
`tailLabel` og `headLabel`:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Hver af dem findes først, når layout har placeret den — den samme betingelse,
under hvilken `render()` udsender etikettens `<text>` — så du behøver ikke
skrabe den renderede SVG for at gendanne disse positioner.

En `xlabel` kommer tilbage på `xlabel`, under samme kun-hvis-placeret-regel. Den
bør aflæses frem for tilnærmes: graphviz placerer en ekstern etiket ved en
kraftsøgning over kandidatpladser, ikke ved at forskyde splinens midtpunkt, så
ingen regning på `label` eller `points` kan genskabe den.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Tegn dine egne pilespidser

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Hvorfor:** når en ende har en pil, forkorter layout splinen for at give plads
til den og noterer, hvor pilen skal nå hen — `ep` ved hovedenden, `sp` ved
halen. Begge mangler, når den ende ikke har nogen pil, så kontrollerne ovenfor
fungerer også som "behøver denne ende overhovedet en pil". At ekstrapolere en
spids ud fra splinens sidste retning rammer retningen, men gætter dybden; disse
er de værdier, graphviz selv har beregnet.

Bemærk, at de er fæstepunkter på knudens kant. Graphviz' egen renderer rykker
den polygon, den tegner, ind fra dem med et beløb, der afhænger af penwidth, så
tegn *hen til* `ep` frem for at forvente, at den er lig med en renderet pils
spids.

## 6. Kortlæg @knowvah/dot-engine-clusternavne tilbage til dine egne

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

**Hvorfor:** `ClusterGeometry.name` giver præcis det navn tilbage, du gav til
`addSubgraph` — @knowvah/dot-engine opfinder, omnummererer eller transformerer
det ikke på nogen måde. Hvis din domænemodel nøgler clustre på sit eget id (ikke
et navn, graphviz ville acceptere), så før selv id-til-navn-kortlægningen, mens
du bygger grafen, og nøgl `clusters`-snapshottet om efter layout; forsøg ikke at
udlede mening af graphviz' eget navn.

## 6b. Tegn din egen cluster-titelblok

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Hvorfor:** layout reserverer plads til en cluster-titel inde i clusterboksen
og afgør derefter, hvor den skal placeres — under hensyn til `labelloc`,
`labeljust`, `rankdir` og etikettens egen målte størrelse.
`ClusterGeometry.label` offentliggør den afgjorte placering, så en forbruger,
der tegner sin egen titelblok, læser den i stedet for at måle teksten igen og
udlede en forskydning, som skal passe med motorens.

`label.x`/`label.y` er **midten** af etiketpladsen, i modsætning til boksens
`x`/`y`, som er et hjørne. `<text>`-elementet, som `render()` udsender, bærer i
stedet *grundlinjen*, som ligger under midten — så hvis du sammenligner med
renderet output, så sammenlign midter med midter, ikke med det udsendte `y`.

## 7. Tilføj mange kanter sikkert

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

**Hvorfor:** builderens `addEdge` slår `tail`/`head` op på navn og opretter
knuden ved første brug, hvis den ikke findes endnu — du behøver aldrig at
fordeklarere knuder, før du kobler en datadrevet kantliste på. På en
`strict`-graf returnerer gentagelse af det samme `(tail, head)`-par den
eksisterende kant i stedet for at tilføje en parallel, i overensstemmelse med
cgraphs deduplikeringskontrakt for `agedge`.

Hvis du tilføjer kanter til en graf, der er skabt af `parse()` frem for
`createGraph()`, så brug den lavere niveaus `addEdge(g, tail, head, name?)` fra
`@knowvah/dot-engine` direkte på `Node`-referencer, du allerede har fat i:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Se `/reference` for den fulde signatur for `addEdge` og dens
deduplikeringsadfærd på strict-grafer.

## 8. Sæt det hele sammen

En kompakt funktion, der tager en lille domænegraf, lægger den ud og returnerer
placerede knuder og kanter:

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

Det er den form, de fleste forbrugere ender med at bygge oven på `getLayout`:
én snitflade, der tager dine egne knude-/kanttyper ind og returnerer placeret
geometri i din egen koordinatkonvention ud.
