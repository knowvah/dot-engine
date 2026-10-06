---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Receptek

Feladatorientált kódrészletek az építés → elrendezés → geometria-kiolvasás
útvonal azon részeihez, amelyek az API-referenciából önmagában nem
nyilvánvalóak. Minden recept egy minimális, futtatható példa, amely kizárólag a
nyilvános `@knowvah/dot-engine` / `@knowvah/dot-engine/api` /
`@knowvah/dot-engine/render` felületet használja — belső modellosztályok nélkül.
A belépési pontok teljes listáját, amelyekből ezek a kódrészletek merítenek, lásd
itt: `/guide/api`.

## 1. Gráf felépítése kódból és renderelése

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Miért:** a `createGraph` építőt ad a kezébe, ha a gráf szerkezete
alkalmazásadatokból származik, nem pedig statikus DOT-sztringből; a `render`
egyetlen hívással elrendezi a gráfot és szerializálja. A teljes építő-API
(részgráfok, attribútumok, összehasonlítás a `parse`-zal) itt található:
`/guide/build-a-graph`.

## 2. Elrendezés renderelés nélkül, majd a geometria kiolvasása

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

**Miért:** a `getLayout` tisztán olvasó függvény az már kiszámított geometria
fölött — az elrendezést maga nem futtatja le. Ha azelőtt hívja meg, hogy bármely
elrendezéshívás lefutott volna, `Error`-t dob `ERR_INVALID_STATE` `code` értékkel
(„getLayout requires a laid-out graph”; lásd: [Hibák és kivételek](/hu/guide/errors)),
ahelyett hogy elavult vagy kinullázott koordinátákat adna vissza. Ha csak a
geometriára van szüksége, és a renderelt sztringre soha, a `render` visszatérési
értékét egyszerűen dobja el — valójában az elrendezés mellékhatásáért fizet.

## 3. Az y-tengely megválasztása a renderelőjéhez

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Miért:** a Graphviz felfelé növekvő y-tengelyű koordináta-rendszerben számolja
az elrendezést; a legtöbb felhasználó (canvas, DOM, SVG a böngészőben)
lefelé növekvő y-t szeretne. A `getLayout` alapértelmezése `'down'`, így a
legtöbb hívónak soha nincs szüksége az opcióra. A pontos tükrözési képletet és
azt, hogy a `bounds` miben különbözik a két módban, lásd itt: `/guide/geometry`.

## 4. A `render()` SVG-keretének és a `getLayout()` keretének összehangolása

A `render(g, 'svg')` és a `getLayout(g)` ugyanazt az elrendezett gráfot írja le,
de különböző koordinátakeretben, és a különbség nem csupán az y-tengely
tükrözése: a `render` SVG-kibocsátója minden y-koordinátát negál, mielőtt
alakzat-primitívet írna, majd az egész rajzot egyetlen
`<g transform="scale(..) rotate(..) translate(tx,ty)">` elembe csomagolja, amely
magába foglalja a Graphviz oldalkitöltését, margóját és az esetleges
`size=`/forgatás szerinti skálázást. A `getLayout` mindezt kihagyja — modell-
koordinátákat ad vissza, `(0, 0)` origóra normalizálva, oldalgeometria nélkül.

Bármely egyetlen `render()` hívásnál a két keret egyetlen állandó eltolásban
különbözik. A GVC oldalelrendezési képletének újraszármaztatása helyett az
eltolást tapasztalati úton érdemes meghatározni egy olyan csúcsból, amelynek
mindkét keretben ismeri a pozícióját:

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

**Miért:** egyetlen egyezés teljesen meghatározza az eltolást, mert az tiszta
eltolás, nem skálázás vagy forgatás (az alapértelmezett `size=`/`rotate=`
feltételezésével). Csak akkor van erre szükség, ha olyasmit olvas ki a nyers
SVG-ből, amit a `getLayout` nem tesz elérhetővé — az 5. receptben látható az az
egy gyakori eset, ahol ez ma elkerülhetetlen.

## 5. Élfeliratok pozíciójának visszanyerése

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

**Miért:** az `EdgeGeometry.label` csak olyan élnél van jelen, amelynek
`label` attribútumához a Graphviz ténylegesen középre igazított feliratot
helyezett el; az anélküli élek egyszerűen kihagyják a mezőt. A `getLayout`
kizárólag a kiszámított *pozíciót* adja vissza — a felirat sztringjét vagy a
megmért dobozát nem —, így ha a renderelőjének magának kell kirajzolnia a
feliratot, párosítsa ezt a pozíciót azzal a mérettel, amelyet a felirat szövegére
a saját oldalán már megmért (például úgy, hogy visszaadja a saját, élenkénti
felirat-méret térképét, ugyanazzal a tail/head párral kulcsolva, amellyel az élt
felépítette).

A `taillabel` és a `headlabel` portfeliratok ugyanígy érkeznek vissza, a
`tailLabel` és a `headLabel` mezőben:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Mindegyik csak akkor van jelen, ha az elrendezés elhelyezte — ugyanazon feltétel
mellett, amelynél a `render()` kibocsátja a felirat `<text>` elemét —, így nincs
szükség a renderelt SVG kaparására ezeknek a pozícióknak a visszanyeréséhez.

Az `xlabel` az `xlabel` mezőben érkezik vissza, ugyanezzel a csak-elhelyezett
feltétellel. Érdemes kiolvasni, nem pedig közelíteni: a Graphviz a külső feliratot
a jelölt helyek közötti erőalapú kereséssel pozícionálja, nem a spline
felezőpontjának eltolásával, így a `label` vagy a `points` semmilyen számtani
átalakítása nem reprodukálja.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Saját nyílhegyek rajzolása

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Miért:** ha egy végen nyíl van, az elrendezés megrövidíti a splinet, hogy helyet
hagyjon neki, és rögzíti, hová kell a nyílnak elérnie — az `ep` a fej, az `sp` a
farok végén. Mindkettő hiányzik, ha az adott végen nincs nyíl, így a fenti
ellenőrzések egyben azt is megmondják, hogy az adott végnek egyáltalán kell-e
nyíl. A hegy extrapolálása a spline utolsó irányából az irányt eltalálja, de a
mélységet csak találgatja; ezek azok az értékek, amelyeket maga a Graphviz
számított ki.

Vegye figyelembe, hogy ezek a csúcs határán lévő csatlakozási pontok. A Graphviz
saját renderelője a kirajzolt sokszöget ezektől a vonalvastagságtól függő
mértékben beljebb húzza, ezért az `ep`-ig rajzoljon, ne várja, hogy az egyenlő
legyen egy renderelt nyíl hegyével.

## 6. A @knowvah/dot-engine klaszternevek visszatérképezése a sajátjaira

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

**Miért:** a `ClusterGeometry.name` pontosan azt a nevet adja vissza, amelyet az
`addSubgraph`-nak adott — a @knowvah/dot-engine nem talál ki, nem számoz át és
nem alakít át semmit. Ha a doménmodellje a klasztereket saját azonosítóval
kulcsolja (nem olyan névvel, amelyet a Graphviz elfogadna), az azonosító–név
leképezést tartsa maga a gráf építése közben, és az elrendezés után kulcsolja át
újra a `clusters` pillanatképet; ne próbáljon értelmet kinyerni a Graphviz saját
nevéből.

## 6b. Saját klasztercímblokk rajzolása

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Miért:** az elrendezés helyet foglal a klaszter címének a klaszterdobozon belül,
majd feloldja, hová kerül — figyelembe véve a `labelloc`, a `labeljust`, a
`rankdir` és a felirat saját megmért méretét. A `ClusterGeometry.label` ezt a
feloldott elhelyezést teszi közzé, így a saját címblokkját rajzoló felhasználó
ezt olvassa ki ahelyett, hogy újra megmérné a szöveget, és újraszármaztatna egy
eltolást, amelynek egyeznie kell a motoréval.

A `label.x`/`label.y` a felirathely **középpontja**, szemben a doboz `x`/`y`
értékével, amely egy sarok. A `render()` által kibocsátott `<text>` ehelyett az
*alapvonalat* hordozza, amely a középpont alatt van — tehát ha renderelt
kimenettel veti össze, a középpontot a középponttal hasonlítsa össze, ne a
kibocsátott `y`-nal.

## 7. Sok él biztonságos hozzáadása

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

**Miért:** az építő `addEdge` metódusa név szerint oldja fel a `tail`/`head`
értéket, és ha a csúcs még nem létezik, az első használatkor létrehozza — adatvezérelt
éllista bekötése előtt soha nem kell előre deklarálnia a csúcsokat. `strict`
gráfon ugyanannak a `(tail, head)` párnak az ismételt megadása a meglévő élt adja
vissza párhuzamos él hozzáadása helyett, tükrözve a cgraph `agedge`
deduplikációs szerződését.

Ha a `parse()` által, nem pedig a `createGraph()` által előállított gráfhoz ad
hozzá éleket, használja az alacsonyabb szintű `addEdge(g, tail, head, name?)`
függvényt a `@knowvah/dot-engine`-ből közvetlenül, a már birtokolt `Node`
hivatkozásokon:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Az `addEdge` teljes szignatúráját és a strict gráfokra vonatkozó deduplikációs
viselkedését lásd itt: `/reference`.

## 8. Összefoglalás

Egy tömör függvény, amely egy kis doménbeli gráfot vesz át, elrendezi, és
pozicionált csúcsokat és éleket ad vissza:

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

Ez az az alak, amelyet a legtöbb felhasználó a `getLayout` fölé épít: egyetlen
bővítési pont, amely a saját csúcs-/éltípusait veszi be, és a saját
koordináta-konvenciójában adja vissza a pozicionált geometriát.
