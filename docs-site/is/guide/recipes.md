---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Uppskriftir

Verkefnamiðaðir bútar fyrir þá hluta leiðarinnar smíða → uppsetning → lesa
rúmfræði sem ekki eru augljósir af API-tilvísuninni einni saman. Hver uppskrift
er lágmarksdæmi sem keyrir og notar eingöngu opinbera yfirborðið
`@knowvah/dot-engine` / `@knowvah/dot-engine/api` / `@knowvah/dot-engine/render` —
engar innri módelklasa. Heildarlista yfir þá aðgangspunkta sem þessir bútar sækja í
er að finna undir `/guide/api`.

## 1. Smíða graf í kóða og teikna það

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Hvers vegna:** `createGraph` gefur þér smið (builder) þegar uppbygging grafsins
kemur úr gögnum forritsins en ekki úr kyrrstæðum DOT-streng; `render` raðar
grafinu upp og raðgerir það í einu kalli. Allt smiðs-API (hlutnet, eigindi,
samanburður við `parse`) er í `/guide/build-a-graph`.

## 2. Raða upp án þess að teikna, lesa síðan rúmfræðina

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

**Hvers vegna:** `getLayout` er hreinn lesari yfir rúmfræði sem þegar hefur verið
reiknuð — það keyrir ekki uppsetningu sjálft. Ef þú kallar á það áður en
uppsetning hefur verið keyrð kastar það `Error` með `code` `ERR_INVALID_STATE`
(„getLayout requires a laid-out graph“; sjá
[Villur og undantekningar](/is/guide/errors)) í stað þess að skila úreltum eða
núlluðum hnitum. Ef þú þarft aðeins rúmfræðina og aldrei teiknaða strenginn
skaltu henda skilagildi `render` — það er hliðaráhrifin, uppsetningin, sem þú ert
í raun að borga fyrir.

## 3. Velja y-ásinn fyrir teiknivélina þína

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Hvers vegna:** graphviz reiknar uppsetningu í y-upp hnitakerfi; flestir
notendur (canvas, DOM, SVG í vafra) vilja y-niður. `getLayout` er sjálfgefið
`'down'`, svo flestir kallendur þurfa aldrei valkostinn. Sjá `/guide/geometry`
fyrir nákvæma speglunarformúlu og hvernig `bounds` er ólíkt milli stillinganna
tveggja.

## 4. Samræma SVG-ramma `render()` við ramma `getLayout()`

`render(g, 'svg')` og `getLayout(g)` lýsa *sama* uppsetta grafinu en í ólíkum
hnitarömmum, og munurinn er ekki aðeins y-ásspeglunin: SVG-útgefandi `render`
neitar hverju y-hniti áður en það skrifar formfrumstæðu, og vefur síðan alla
teikninguna inn í eitt `<g transform="scale(..)
rotate(..) translate(tx,ty)">` sem tekur með fyllingu síðu (padding) í graphviz,
spássíu og alla `size=`/snúningsskölun. `getLayout` sleppir öllu þessu — það
skilar módelhnitum sem eru stöðluð að upphafspunktinum `(0, 0)` án nokkurrar
síðurúmfræði.

Fyrir hvert stakt kall á `render()` eru rammarnir tveir ólíkir um eina fasta
hliðrun. Frekar en að leiða aftur út síðuuppsetningarformúlu GVC skaltu leiða
hliðrunina út með reynslu úr einum hnút sem þú hefur þegar staðsetningar fyrir í
báðum römmum:

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

**Hvers vegna:** ein samsvörun ákvarðar hliðrunina að fullu því hún er hrein
hliðrun, ekki skölun eða snúningur (miðað við sjálfgefin `size=`/`rotate=`).
Þú þarft þetta aðeins þegar þú lest eitthvað úr hráa SVG-inu sem `getLayout`
birtir ekki — sjá uppskrift 5 fyrir það eina algenga tilvik þar sem það er
óhjákvæmilegt í dag.

## 5. Endurheimta staðsetningar leggjamerkimiða

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

**Hvers vegna:** `EdgeGeometry.label` er aðeins til staðar fyrir legg þar sem
graphviz setti í raun miðjaðan merkimiða fyrir `label`-eigindið; leggir án þess
sleppa einfaldlega reitnum. `getLayout` skilar aðeins reiknaðri *staðsetningu* —
ekki merkimiðastrengnum eða mældum kassa hans — svo ef teiknivélin þín þarf að
teikna merkimiðann sjálf skaltu para þessa staðsetningu við þá stærð sem þú
mældir þegar fyrir textann hjá þér (t.d. með því að endurnota þitt eigið
stærðakort merkimiða fyrir hvern legg, lyklað á sama tail/head-par og þú notaðir
til að smíða legginn).

Port-merkimiðarnir `taillabel` og `headlabel` skila sér á sama hátt, í
`tailLabel` og `headLabel`:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Hvor um sig er aðeins til staðar þegar uppsetningin hefur sett hann — sama skilyrði
og þegar `render()` gefur út `<text>` merkimiðans — svo ekki þarf að skrapa teiknaða
SVG-ið til að endurheimta þessar staðsetningar.

`xlabel` skilar sér í `xlabel`, með sama skilyrði um að hafa verið settur. Betra
er að lesa hann en að áætla hann: graphviz staðsetur ytri merkimiða með kraftaleit
yfir frambjóðendareiti, ekki með því að hliðra miðpunkti splínunnar, svo engin
reikningsaðgerð á `label` eða `points` endurskapar hann.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Teikna eigin örvarhausa

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Hvers vegna:** þegar endi ber ör styttir uppsetningin splínuna til að rýma fyrir
henni og skráir hvar örin á að ná til — `ep` við haus-endann, `sp` við hala-endann.
Hvort tveggja vantar þegar endinn hefur enga ör, svo athuganirnar hér að ofan
tvöfaldast sem „þarf þessi endi ör yfirleitt“. Að framlengja odd út frá lokastefnu
splínunnar gefur rétta stefnu en giskar á dýptina; þetta eru gildin sem graphviz
reiknaði sjálft.

Athugaðu að þetta eru festipunktar á jaðri hnútsins. Eigin teiknivél Graphviz
færir marghyrninginn sem hún teiknar inn á við frá þeim um magn sem fer eftir
penwidth, svo teiknaðu *að* `ep` í stað þess að búast við að það jafngildi oddi
teiknaðrar örvar.

## 6. Varpa klasaheitum @knowvah/dot-engine aftur á þín eigin

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

**Hvers vegna:** `ClusterGeometry.name` endurómar nákvæmlega það heiti sem þú gafst
`addSubgraph` — @knowvah/dot-engine býr ekki til, endurnúmerar né breytir því á
annan hátt. Ef lénslíkanið þitt lyklar klasa á eigið auðkenni (ekki heiti sem
graphviz myndi taka gilt) skaltu halda utan um vörpunina auðkenni-í-heiti sjálf
meðan þú smíðar grafið og endurlykla `clusters`-skyndimyndina eftir uppsetningu;
ekki reyna að endurheimta merkingu úr heiti graphviz sjálfs.

## 6b. Teikna eigin titilblokk klasa

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Hvers vegna:** uppsetningin frátekur pláss fyrir titil klasa inni í klasakassanum
og ákvarðar svo hvar hann lendir — með tilliti til `labelloc`, `labeljust`,
`rankdir` og eigin mældrar stærðar merkimiðans. `ClusterGeometry.label` birtir þá
ákvörðuðu staðsetningu, svo notandi sem teiknar eigin titilblokk les hana í stað
þess að mæla textann aftur og leiða út hliðrun sem þarf að stemma við
hliðrun vélarinnar.

`label.x`/`label.y` eru **miðja** merkimiðarýmisins, ólíkt `x`/`y` kassans, sem er
horn. `<text>` sem `render()` gefur út ber hins vegar *grunnlínuna*, sem liggur
neðan við miðjuna — svo ef þú ert að bera saman við teiknað úttak skaltu bera
miðju saman við miðju, ekki við útgefið `y`.

## 7. Bæta mörgum leggjum við á öruggan hátt

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

**Hvers vegna:** `addEdge` í smiðnum leysir `tail`/`head` upp eftir heiti og
býr til hnútinn við fyrstu notkun ef hann er ekki til — þú þarft aldrei að
lýsa hnútum yfir fyrirfram áður en þú tengir gagnadrifinn leggjalista. Í `strict`
grafi skilar endurtekið `(tail, head)`-par núverandi legg í stað þess að bæta
við samsíða legg, í samræmi við afritunarsamning `agedge` í cgraph.

Ef þú ert að bæta leggjum við graf sem `parse()` bjó til en ekki `createGraph()`,
notaðu lægra stigs `addEdge(g, tail, head, name?)` úr
`@knowvah/dot-engine` beint á `Node`-tilvísanir sem þú heldur þegar á:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Sjá `/reference` fyrir fulla undirskrift `addEdge` og hegðun hennar við
afritun í strict-grafi.

## 8. Allt saman

Lítið fall sem tekur lítið lénsgraf, raðar því upp og skilar staðsettum hnútum
og leggjum:

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

Þetta er sú lögun sem flestir notendur enda á að smíða ofan á `getLayout`: einn
tengipunktur sem tekur við þínum eigin hnúta- og leggjategundum og skilar
staðsettri rúmfræði í þínu eigin hnitakerfi.
