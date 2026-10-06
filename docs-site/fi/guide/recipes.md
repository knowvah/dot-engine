---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Reseptit

Tehtäväkeskeisiä pätkiä niihin rakenna → asettele → lue geometria -polun
kohtiin, jotka eivät käy ilmi pelkästä API-viitteestä. Jokainen resepti on
minimaalinen, ajettavissa oleva esimerkki, jossa käytetään vain julkista
`@knowvah/dot-engine` / `@knowvah/dot-engine/api` / `@knowvah/dot-engine/render`
-rajapintaa — ei sisäisiä mallin luokkia.
Katso `/guide/api` täydestä luettelosta niistä sisääntulopisteistä, joihin nämä pätkät perustuvat.

## 1. Rakenna graafi koodissa ja renderöi se

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Miksi:** `createGraph` antaa rakentajan (builder) silloin, kun graafin rakenne
tulee sovelluksen datasta eikä staattisesta DOT-merkkijonosta; `render`
asettelee graafin ja serialisoi sen yhdellä kutsulla. Täysi rakentajan API
(aligraafit, attribuutit, vertailu `parse`-funktioon) on kohdassa
`/guide/build-a-graph`.

## 2. Asettele ilman renderöintiä ja lue sitten geometria

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

**Miksi:** `getLayout` on puhdas lukija jo laskettujen geometrioiden päällä —
se ei aja asettelua itse. Jos kutsut sitä ennen kuin mikään asettelukutsu on
ajettu, se heittää `Error`-virheen, jonka `code` on `ERR_INVALID_STATE`
("getLayout requires a laid-out graph"; katso
[Virheet ja poikkeukset](/fi/guide/errors)), sen sijaan että palauttaisi
vanhentuneita tai nollattuja koordinaatteja. Jos tarvitset vain geometrian etkä
koskaan renderöityä merkkijonoa, hylkää `render`-funktion paluuarvo — juuri
asettelun sivuvaikutuksesta maksat.

## 3. Valitse y-akseli renderöijällesi

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Miksi:** graphviz laskee asettelun y-ylös-koordinaatistossa; useimmat
käyttäjät (canvas, DOM, SVG selaimessa) haluavat y-alas. `getLayout`
käyttää oletuksena arvoa `'down'`, joten useimpien kutsujien ei tarvitse
koskaan käyttää tätä valitsinta. Katso `/guide/geometry` täsmällisestä
käännökseen käytettävästä kaavasta ja siitä, miten `bounds` eroaa
näiden kahden tilan välillä.

## 4. Sovita `render()`-funktion SVG-kehys `getLayout()`-kehykseen

`render(g, 'svg')` ja `getLayout(g)` kuvaavat *samaa* asettelua saanutta
graafia, mutta eri koordinaattikehyksissä, eikä ero ole pelkkä y-akselin
käännös: `render`-funktion SVG-lähetin negatoi jokaisen y-koordinaatin ennen
kuin se kirjoittaa muotoprimitiivin, ja kietoo sitten koko piirroksen yhteen
`<g transform="scale(..)
rotate(..) translate(tx,ty)">`-elementtiin, joka sisältää graphvizin
sivun täytön (padding), marginaalin ja mahdollisen `size=`-/kiertoskaalauksen.
`getLayout` ohittaa kaiken tämän — se palauttaa mallin koordinaatit
normalisoituna `(0, 0)`-origoon ilman mitään sivugeometriaa.

Yksittäisessä `render()`-kutsussa nämä kaksi kehystä eroavat toisistaan yhdellä
vakiosiirrolla. Sen sijaan että johtaisit GVC:n sivuasettelukaavan uudelleen,
johda siirtymä empiirisesti yhdestä solmusta, jonka sijainnit tiedät
molemmissa kehyksissä:

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

**Miksi:** yksi osuma määrittää siirtymän täysin, koska kyse on puhtaasta
siirrosta eikä skaalauksesta tai kierrosta (olettaen oletusarvoiset
`size=`/`rotate=`). Tarvitset tätä vain silloin, kun luet raa'asta SVG:stä
jotakin, mitä `getLayout` ei tarjoa — katso resepti 5, jossa on yksi yleinen
tapaus, jossa tämä on nykyisin väistämätöntä.

## 5. Kaarten selitteiden sijaintien selvittäminen

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

**Miksi:** `EdgeGeometry.label` on olemassa vain kaarelle, jonka `label`-
attribuutille graphviz todella sijoitti keskitetyn selitteen; kaaret ilman
sitä jättävät kentän pois. `getLayout` palauttaa vain lasketun *sijainnin* —
ei selitteen merkkijonoa eikä sen mitattua laatikkoa — joten jos renderöijäsi
piirtää selitteen itse, yhdistä tämä sijainti siihen kokoon, jonka olet jo
mitannut kyseiselle selitetekstille omalla puolellasi (esim. palauttamalla
oman kaarikohtaisen selitekokokarttasi, avaimena sama tail/head-pari, jota
käytit kaaren rakentamiseen).

Porttiselitteet `taillabel` ja `headlabel` palautuvat samalla tavalla kentissä
`tailLabel` ja `headLabel`:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Kukin on olemassa vasta, kun asettelu on sijoittanut sen — samalla ehdolla,
jolla `render()` lähettää selitteen `<text>`-elementin — joten renderöityä
SVG:tä ei tarvitse kaapia näiden sijaintien selvittämiseksi.

`xlabel` palautuu kentässä `xlabel`, samalla vain-sijoitettu-ehdolla. Se
kannattaa lukea eikä arvioida: graphviz sijoittaa ulkoisen selitteen
voimahaulla ehdokaspaikkojen joukosta, ei siirtämällä splinen keskipistettä,
joten mikään `label`- tai `points`-arvoille tehty laskutoimitus ei tuota
samaa tulosta.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Piirrä omat nuolenkärkesi

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Miksi:** kun kaaren pää on varustettu nuolella, asettelu lyhentää splineä
jättääkseen sille tilaa ja tallentaa, mihin nuolen pitäisi ulottua — `ep`
head-päässä, `sp` tail-päässä. Molemmat puuttuvat, kun kyseisessä päässä ei ole
nuolta, joten yllä olevat tarkistukset toimivat samalla kysymyksenä "tarvitseeko
tämä pää nuolta lainkaan". Kärjen ekstrapolointi splinen viimeisestä
suunnasta saa suunnan oikein mutta arvaa syvyyden; nämä ovat arvot, jotka
graphviz itse laski.

Huomaa, että ne ovat kiinnityspisteitä solmun reunalla. Graphvizin oma
renderöijä sisentää piirtämänsä monikulmion niistä viivanpaksuudesta
riippuvalla määrällä, joten piirrä *kohti* pistettä `ep` äläkä odota sen
vastaavan renderöidyn nuolen kärkeä.

## 6. Yhdistä @knowvah/dot-engine-klusterien nimet takaisin omiisi

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

**Miksi:** `ClusterGeometry.name` palauttaa täsmälleen sen nimen, jonka annoit
`addSubgraph`-kutsulle — @knowvah/dot-engine ei keksi, numeroi uudelleen tai
muuten muunna sitä. Jos oma toimialuemallisi avaimistaa klusterit omalla
tunnisteellaan (ei nimellä, jonka graphviz hyväksyisi), pidä
tunniste–nimi-kartta itse yllä graafia rakentaessasi ja avaimista
`clusters`-tilannekuva uudelleen asettelun jälkeen; älä yritä päätellä
merkitystä graphvizin omasta nimestä.

## 6b. Piirrä oma klusterin nimiölohko

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Miksi:** asettelu varaa klusterin laatikon sisältä tilaa klusterin
nimiölle ja ratkaisee sitten, minne se sijoitetaan — ottaen huomioon
`labelloc`, `labeljust`, `rankdir` ja selitteen oman mitatun koon.
`ClusterGeometry.label` julkaisee tämän ratkaistun sijoittelun, joten oman
nimiölohkonsa piirtävä käyttäjä lukee sen sen sijaan, että mittaisi tekstin
uudelleen ja johtaisi siirtymän, jonka pitäisi olla yhtäpitävä moottorin
kanssa.

`label.x`/`label.y` ovat selitetilan **keskipiste**, toisin kuin laatikon
`x`/`y`, joka on kulma. `render()`-funktion lähettämä `<text>` kantaa sen
sijaan *perusviivan*, joka on keskipisteen alapuolella — joten jos vertaat
renderöityyn tulosteeseen, vertaa keskipisteitä keskipisteisiin, älä
lähetettyyn `y`-arvoon.

## 7. Lisää paljon kaaria turvallisesti

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

**Miksi:** rakentajan `addEdge` ratkaisee `tail`/`head` nimen perusteella ja
luo solmun ensimmäisellä käyttökerralla, jos sitä ei vielä ole — solmuja ei
tarvitse esitellä etukäteen ennen datalähtöisen kaarilistan kytkemistä.
`strict`-graafissa saman `(tail, head)`-parin toistaminen palauttaa olemassa
olevan kaaren rinnakkaisen kaaren lisäämisen sijaan, mikä jäljittelee cgraphin
`agedge`-deduplikointisopimusta.

Jos lisäät kaaria graafiin, jonka on tuottanut `parse()` eikä `createGraph()`,
käytä alemman tason `addEdge(g, tail, head, name?)`-funktiota paketista
`@knowvah/dot-engine` suoraan `Node`-viitteille, jotka jo hallitset:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Katso `/reference` täydestä `addEdge`-allekirjoituksesta ja sen
strict-graafin deduplikointikäyttäytymisestä.

## 8. Kaikki yhteen

Tiivis funktio, joka ottaa pienen toimialueen graafin, asettelee sen ja
palauttaa sijoitetut solmut ja kaaret:

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

Tämä on se muoto, jonka useimmat käyttäjät päätyvät rakentamaan `getLayout`-
funktion päälle: yksi liitäntäkohta, joka ottaa sisään omat solmu- ja
kaarityyppisi ja palauttaa sijoitetun geometrian omassa koordinaattikäytännössäsi.
