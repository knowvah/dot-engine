---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Oppskrifter

Oppgaveorienterte kodebiter for de delene av løypa bygg → layout → les
geometri som ikke går fram av API-referansen alene. Hver oppskrift er et
minimalt, kjørbart eksempel som bare bruker den offentlige flaten
`@knowvah/dot-engine` / `@knowvah/dot-engine/api` / `@knowvah/dot-engine/render`
— ingen interne modellklasser. Se `/guide/api` for den fullstendige listen over
inngangspunkter kodebitene henter fra.

## 1. Bygg en graf i kode og render den

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Hvorfor:** `createGraph` gir deg en byggeklasse når grafstrukturen kommer fra
applikasjonsdata i stedet for en statisk DOT-streng; `render` legger ut grafen
og serialiserer den i ett kall. Det fullstendige bygger-API-et (delgrafer,
attributter, sammenligning med `parse`) står i `/guide/build-a-graph`.

## 2. Legg ut uten å rendre, og les deretter geometrien

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

**Hvorfor:** `getLayout` er en ren leser over geometri som allerede er
beregnet — den kjører ikke layout selv. Kaller du den før noe layoutkall har
kjørt, kaster den en `Error` med `code` `ERR_INVALID_STATE` («getLayout requires
a laid-out graph»; se [Feil og unntak](/no/guide/errors)) i stedet for å levere
utdaterte eller nullstilte koordinater. Hvis du bare trenger geometrien og
aldri trenger den rendrede strengen, kaster du bare returverdien fra `render` —
det er layoutbivirkningen du egentlig betaler for.

## 3. Velg y-aksen for rendereren din

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Hvorfor:** graphviz beregner layout i et koordinatsystem med y oppover; de
fleste forbrukere (canvas, DOM, SVG i nettleseren) vil ha y nedover.
`getLayout` har `'down'` som standard, så de fleste kallere aldri trenger
valget. Se `/guide/geometry` for den nøyaktige snuformelen og for hvordan
`bounds` er forskjellig mellom de to modusene.

## 4. Avstem SVG-rammen fra `render()` med rammen fra `getLayout()`

`render(g, 'svg')` og `getLayout(g)` beskriver *den samme* utlagte grafen, men i
ulike koordinatrammer, og forskjellen er ikke bare snuingen av y-aksen:
SVG-emitteren i `render` negerer hver y-koordinat før den skriver et
formprimitiv, og pakker deretter hele tegningen inn i én
`<g transform="scale(..) rotate(..) translate(tx,ty)">` som tar opp i seg
graphvizs sidemarg, margin og all skalering eller rotasjon fra `size=`.
`getLayout` hopper over alt dette — den gir modellkoordinater normalisert til
origo `(0, 0)` uten noen sidegeometri i det hele tatt.

For ethvert enkelt `render()`-kall skiller de to rammene seg med én konstant
translasjon. I stedet for å utlede GVC-ets sidelayoutformel på nytt, kan du
utlede forskyvningen empirisk fra én node du allerede har posisjoner for i begge
rammene:

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

**Hvorfor:** ett treff bestemmer forskyvningen fullstendig, fordi den er en ren
translasjon, ikke en skalering eller rotasjon (forutsatt standard
`size=`/`rotate=`). Du trenger dette bare når du leser ut noe fra den rå SVG-en
som `getLayout` ikke eksponerer — se oppskrift 5 for det ene vanlige tilfellet
der det i dag er uunngåelig.

## 5. Finn posisjonene til kantetiketter

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

**Hvorfor:** `EdgeGeometry.label` finnes bare for en kant der graphviz faktisk
plasserte en sentrert etikett for attributtet `label`; kanter uten etikett
utelater bare feltet. `getLayout` gir bare den beregnede *posisjonen* — ikke
etikettstrengen eller dens målte boks — så hvis rendereren din selv må tegne
etiketten, kombinerer du denne posisjonen med den størrelsen du allerede har
målt for etikettteksten på din egen side (for eksempel ved å gi tilbake ditt
eget størrelseskart per kant, nøklet på det samme tail/head-paret som du brukte
da du bygde kanten).

Portetikettene `taillabel` og `headlabel` kommer tilbake på samme måte, på
`tailLabel` og `headLabel`:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Hver av dem finnes bare når layouten har plassert den — den samme betingelsen
som gjør at `render()` emitterer etikettens `<text>` — så du trenger ikke å
skrape den rendrede SVG-en for å finne disse posisjonene.

En `xlabel` kommer tilbake på `xlabel`, under den samme «bare hvis plassert»-
betingelsen. Den er verdt å lese ut i stedet for å tilnærme: graphviz plasserer
en ekstern etikett med et kraftsøk over kandidatposisjoner, ikke ved å forskyve
midtpunktet av splinen, så ingen aritmetikk på `label` eller `points` kan
gjenskape den.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Tegn dine egne pilspisser

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Hvorfor:** når en ende har en pil, forkorter layouten splinen for å gi plass
til den, og registrerer hvor pilen skal nå — `ep` i hode-enden, `sp` i
hale-enden. Begge mangler når enden ikke har noen pil, så sjekkene over fungerer
også som «trenger denne enden i det hele tatt en pil». Å ekstrapolere en spiss ut
fra splinens siste retning gir riktig retning, men gjetter dybden; dette er
verdiene graphviz selv beregnet.

Merk at de er festepunkter på nodegrensen. Graphvizs egen renderer rykker
polygonet den tegner inn fra dem med en mengde som avhenger av penwidth, så tegn
*til* `ep` i stedet for å forvente at den er lik spissen på en rendret pil.

## 6. Koble @knowvah/dot-engine-klyngenavn tilbake til dine egne

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

**Hvorfor:** `ClusterGeometry.name` gir tilbake nøyaktig det navnet du ga
`addSubgraph` — @knowvah/dot-engine finner ikke på, renummererer eller
transformerer det på noen måte. Hvis domenemodellen din nøkler klynger på sin
egen id (ikke et navn graphviz ville godta), holder du selv id-til-navn-
tilordningen mens du bygger grafen, og nøkler `clusters`-øyeblikksbildet på nytt
etter layout; ikke prøv å utlede mening fra graphvizs eget navn.

## 6b. Tegn din egen klyngetittelblokk

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Hvorfor:** layouten reserverer plass til en klyngetittel inne i klyngeboksen
og avgjør deretter hvor den havner — med hensyn til `labelloc`, `labeljust`,
`rankdir` og etikettens egen målte størrelse. `ClusterGeometry.label`
publiserer den avgjorte plasseringen, slik at en forbruker som tegner sin egen
tittelblokk leser den i stedet for å måle teksten på nytt og utlede en
forskyvning som må stemme med motorens.

`label.x`/`label.y` er **sentrum** av etikettområdet, i motsetning til `x`/`y`
for boksen, som er et hjørne. `<text>`-elementet `render()` emitterer bærer
derimot *grunnlinjen*, som ligger under sentrum — så hvis du sammenligner med
rendret utdata, sammenlign sentrum med sentrum, ikke med den emitterte `y`.

## 7. Legg til mange kanter trygt

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

**Hvorfor:** byggerens `addEdge` slår opp `tail`/`head` på navn og oppretter
noden ved første bruk hvis den ikke finnes ennå — du trenger aldri å
forhåndsdeklarere noder før du kobler opp en datadrevet kantliste. På en
`strict`-graf returnerer en gjentakelse av det samme paret `(tail, head)` den
eksisterende kanten i stedet for å legge til en parallell, i samsvar med
dedupliseringskontrakten til cgraphs `agedge`.

Hvis du legger kanter til en graf laget av `parse()` i stedet for
`createGraph()`, bruker du den laverenivå-funksjonen `addEdge(g, tail, head, name?)`
fra `@knowvah/dot-engine` direkte på `Node`-referanser du allerede har:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Se `/reference` for den fullstendige signaturen til `addEdge` og dens
dedupliseringsatferd for strikte grafer.

## 8. Alt satt sammen

En kompakt funksjon som tar en liten domenegraf, legger den ut og returnerer
posisjonerte noder og kanter:

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

Dette er formen de fleste forbrukere ender opp med å bygge oppå `getLayout`: ett
koblingspunkt som tar dine egne node-/kanttyper inn, og gir posisjonert geometri
i din egen koordinatkonvensjon ut.
