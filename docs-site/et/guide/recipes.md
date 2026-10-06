---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Retseptid

Ülesandekesksed lõigud nende build → layout → read-geometry tee osade jaoks,
mis ei selgu ainuüksi API teatmikust. Iga retsept on minimaalne töötav näide,
mis kasutab ainult avalikku pinda `@knowvah/dot-engine` /
`@knowvah/dot-engine/api` / `@knowvah/dot-engine/render` — ühtegi sisemist
mudeliklassi ei kasutata. Nende lõikude aluseks olevate sisendpunktide täieliku
loendi leiate aadressilt `/guide/api`.

## 1. Graafi koostamine koodis ja renderdamine

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Miks:** `createGraph` annab teile koostaja (builder), kui teie graafi
struktuur tuleb rakenduse andmetest, mitte staatilisest DOT-sõnest; `render`
paigutab graafi ja serialiseerib selle ühe kutsega. Täielik koostaja API
(alamgraafid, atribuudid, võrdlus `parse`-iga) asub aadressil
`/guide/build-a-graph`.

## 2. Paigutamine ilma renderdamiseta, seejärel geomeetria lugemine

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

**Miks:** `getLayout` on puhas lugeja juba arvutatud geomeetria kohal — see ei
käivita ise paigutust. Kui kutsute seda enne, kui ükski paigutuskutse on
töötanud, viskab see `Error`-i koodiga `ERR_INVALID_STATE` („getLayout requires
a laid-out graph“; vt [Vead ja erandid](/et/guide/errors)), selle asemel et
anda tagasi aegunud või nullitud koordinaate. Kui vajate ainult geomeetriat ega
vaja kunagi renderdatud sõne, jätke `render`-i tagastusväärtus kasutamata —
tegelikult maksate just paigutuse kõrvalmõju eest.

## 3. Renderdaja y-telje valimine

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Miks:** Graphviz arvutab paigutuse y-teljega ülespoole suunatud
koordinaadistikus; enamik tarbijaid (canvas, DOM, brauseris olev SVG) soovib
y-telge allapoole. `getLayout` kasutab vaikimisi väärtust `'down'`, nii et
enamik kutsujaid ei vaja seda valikut kunagi. Täpse ümberpööramisvalemi ja selle
kohta, kuidas `bounds` kahes režiimis erineb, vt `/guide/geometry`.

## 4. Funktsiooni `render()` SVG-raami ja funktsiooni `getLayout()` raami ühitamine

`render(g, 'svg')` ja `getLayout(g)` kirjeldavad *sama* paigutatud graafi, kuid
erinevates koordinaatraamides, ning erinevus ei piirdu y-telje ümberpööramisega:
`render`-i SVG-emitter muudab enne kujundi primitiivi kirjutamist iga
y-koordinaadi vastandmärgiliseks ja mähib seejärel kogu joonise ühte
elementi `<g transform="scale(..) rotate(..) translate(tx,ty)">`, mis sisaldab
Graphvizi lehe polsterduse, ääriste ning mis tahes `size=`/pööramisskaleerimise.
`getLayout` jätab kõik selle vahele — see tagastab mudelikoordinaadid,
normaliseeritud alguspunkti `(0, 0)` järgi, ilma igasuguse lehegeomeetriata.

Iga üksiku `render()` kutse puhul erinevad need kaks raami ühe konstantse
nihke võrra. Selle asemel et GVC lehepaigutuse valemit uuesti tuletada, tuletage
nihe empiiriliselt ühest sõlmest, mille positsioonid on teil mõlemas raamis
olemas:

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

**Miks:** üks vaste määrab nihke täielikult, sest tegu on puhta nihkega, mitte
skaleerimise ega pööramisega (eeldades vaikimisi `size=`/`rotate=`). Vajate seda
ainult siis, kui loete toor-SVG-st midagi, mida `getLayout` ei paljasta — ühe
levinud juhtumi, kus see on praegu vältimatu, leiate retseptist 5.

## 5. Servasiltide positsioonide taastamine

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

**Miks:** `EdgeGeometry.label` on olemas ainult serva puhul, mille `label`
atribuudi jaoks Graphviz tegelikult tsentreeritud sildi paigutas; servad, millel
seda pole, jätavad välja lihtsalt ära. `getLayout` tagastab ainult arvutatud
*positsiooni* — mitte sildi sõnet ega selle mõõdetud kasti —, nii et kui teie
renderdaja peab sildi ise joonistama, siduge see positsioon mis tahes suurusega,
mille olete selle sildi teksti jaoks oma poolel juba mõõtnud (nt tagastades oma
serva-põhise sildisuuruste kaardi, mille võti on sama tail/head-paar, millega
serva koostasite).

Siltide `taillabel` ja `headlabel` (pordisildid) tulevad tagasi samamoodi,
väljadel `tailLabel` ja `headLabel`:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Kumbki on olemas alles siis, kui paigutus selle paigutas — see on sama tingimus,
mille korral `render()` väljastab sildi `<text>`-i —, seega ei ole vaja
renderdatud SVG-d kraapida, et neid positsioone taastada.

`xlabel` tuleb tagasi väljal `xlabel`, sama „ainult paigutatud“ tingimuse all.
Seda tasub lugeda, mitte ligikaudselt arvutada: Graphviz positsioneerib
välissildi jõuotsinguga kandidaatkohtade üle, mitte splaini keskpunkti nihutades,
seega ei taasta seda ükski aritmeetika väljade `label` või `points` põhjal.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Oma nooleotste joonistamine

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Miks:** kui otsal on nool, lühendab paigutus splaini, et jätta sellele ruumi,
ja salvestab, kuhu nool peaks ulatuma — `ep` pea otsas, `sp` saba otsas. Mõlemad
puuduvad, kui sellel otsal noolt ei ole, seega toimivad ülaltoodud kontrollid
ühtlasi küsimusena „kas see ots vajab üldse noolt“. Tipu ekstrapoleerimine
splaini viimasest suunast annab suuna õigesti, kuid sügavuse arvab ära; need on
väärtused, mille Graphviz ise arvutas.

Pange tähele, et need on kinnituspunktid sõlme piiril. Graphvizi enda renderdaja
nihutab sellest joonistatava hulknurga sissepoole joonepaksusest sõltuva hulga
võrra, seega joonistage *kuni* `ep`-ni, mitte ärge eeldage, et see võrdub
renderdatud noole tipuga.

## 6. @knowvah/dot-engine'i klastrinimede seostamine oma nimedega

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

**Miks:** `ClusterGeometry.name` kajastab tagasi täpselt seda nime, mille andsite
`addSubgraph`-ile — @knowvah/dot-engine ei leiuta, nummerda ümber ega muul viisil
teisenda seda. Kui teie domeenimudel võtmestab klastrid oma id-ga (mitte nimega,
mida Graphviz aktsepteeriks), hoidke id-nime vastendust ise graafi koostamise
ajal ja võtmestage `clusters` hetktõmmis pärast paigutust ümber; ärge püüdke
Graphvizi enda nimest tähendust taastada.

## 6b. Oma klastri tiitliploki joonistamine

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Miks:** paigutus reserveerib klastri kasti sees tiitli jaoks ruumi ja lahendab
seejärel, kuhu see läheb — arvestades `labelloc`, `labeljust`, `rankdir` ja
sildi enda mõõdetud suurust. `ClusterGeometry.label` avaldab selle lahendatud
paigutuse, nii et oma tiitliplokki joonistav tarbija loeb selle kätte, selle
asemel et teksti uuesti mõõta ja tuletada nihe, mis peab mootoriga kokku
langema.

`label.x`/`label.y` on sildiruumi **keskpunkt**, erinevalt kasti `x`/`y`-st,
mis on nurk. `render()` väljastatav `<text>` kannab hoopis *baasjoont*, mis
asub keskpunktist allpool — seega kui võrdlete renderdatud väljundiga, võrrelge
keskpunkte keskpunktidega, mitte väljastatud `y`-ga.

## 7. Paljude servade turvaline lisamine

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

**Miks:** koostaja `addEdge` lahendab `tail`/`head` nime järgi ja loob sõlme
esmakordsel kasutamisel, kui seda veel ei ole — te ei pea kunagi sõlmi enne
andmepõhise servaloendi ühendamist eelnevalt deklareerima. `strict` graafis
tagastab sama `(tail, head)` paari kordamine olemasoleva serva, selle asemel et
lisada paralleelne, peegeldades cgraphi `agedge` dedubleerimisleppe.

Kui lisate servi graafile, mille on loonud `parse()`, mitte `createGraph()`,
kasutage madalama taseme `addEdge(g, tail, head, name?)` funktsiooni paketist
`@knowvah/dot-engine` otse `Node`-viidetele, mis teil juba on:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Täieliku `addEdge` signatuuri ja selle strict-graafi dedubleerimiskäitumise
leiate aadressilt `/reference`.

## 8. Kõik kokku

Kompaktne funktsioon, mis võtab väikese domeenigraafi, paigutab selle ja
tagastab positsioneeritud sõlmed ja servad:

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

See on kuju, mille enamik tarbijaid `getLayout`-i peale lõpuks ehitab: üks
liidespunkt, mis võtab sisse teie enda sõlme-/servatüübid ja tagastab
positsioneeritud geomeetria teie enda koordinaadikokkuleppes.
