---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Recepty

Úlohově zaměřené úryvky pro ty části cesty sestavení → rozvržení → čtení
geometrie, které nejsou z reference API samotné zřejmé. Každý recept je
minimální spustitelný příklad využívající pouze veřejné rozhraní
`@knowvah/dot-engine` / `@knowvah/dot-engine/api` /
`@knowvah/dot-engine/render` — žádné interní třídy modelu.
Úplný seznam vstupních bodů, ze kterých tyto úryvky vycházejí, najdete na
`/guide/api`.

## 1. Sestavení grafu v kódu a jeho vykreslení

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Proč:** `createGraph` vám dá builder, když struktura grafu pochází z dat
aplikace, a ne ze statického řetězce DOT; `render` graf rozvrhne a serializuje
jediným voláním. Úplné API builderu (podgrafy, atributy, srovnání s `parse`)
je na `/guide/build-a-graph`.

## 2. Rozvržení bez vykreslení a následné čtení geometrie

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

**Proč:** `getLayout` je čistě čtecí funkce nad již vypočtenou geometrií —
rozvržení sama nespouští. Zavoláte-li ji dříve, než proběhne jakékoli volání
rozvržení, vyhodí `Error` s `code` `ERR_INVALID_STATE` („getLayout requires a
laid-out graph“; viz [Chyby a výjimky](/cs/guide/errors)), místo aby vrátila
zastaralé nebo vynulované souřadnice. Pokud potřebujete jen geometrii a
vykreslený řetězec nikdy nepotřebujete, návratovou hodnotu `render` zahoďte —
platíte právě za vedlejší efekt rozvržení.

## 3. Volba osy y pro váš vykreslovač

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Proč:** Graphviz počítá rozvržení v souřadnicovém systému s osou y
směřující nahoru; většina konzumentů (canvas, DOM, SVG v prohlížeči) chce osu y
směřující dolů. `getLayout` má výchozí hodnotu `'down'`, takže většina volajících
tuto volbu nikdy nepotřebuje. Přesný vzorec převrácení a rozdíl v `bounds` mezi
oběma režimy popisuje `/guide/geometry`.

## 4. Sladění rámce SVG z `render()` s rámcem z `getLayout()`

`render(g, 'svg')` a `getLayout(g)` popisují *tentýž* rozvržený graf, ale
v různých souřadnicových rámcích, a rozdíl není jen v převrácení osy y:
emitor SVG ve `render` před zápisem primitiva tvaru zneguje každou souřadnici y
a pak celou kresbu obalí jediným `<g transform="scale(..)
rotate(..) translate(tx,ty)">`, který zahrnuje odsazení stránky Graphviz,
okraje a případné škálování či rotaci podle `size=`. `getLayout` to vše
vynechává — vrací souřadnice modelu normalizované k počátku `(0, 0)` bez
jakékoli geometrie stránky.

Pro jakékoli jedno volání `render()` se oba rámce liší jedním konstantním
posunem. Místo odvozování vzorce pro rozvržení stránky v GVC odvoďte posun
empiricky z jednoho uzlu, jehož pozice máte v obou rámcích:

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

**Proč:** jedna shoda posun plně určuje, protože jde o čistý posun, nikoli
o změnu měřítka nebo rotaci (za předpokladu výchozích `size=`/`rotate=`).
Potřebujete to jen tehdy, když ze surového SVG čtete něco, co `getLayout`
nezpřístupňuje — jediný běžný případ, kdy se tomu dnes nelze vyhnout, popisuje
recept 5.

## 5. Zjištění pozic popisků hran

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

**Proč:** `EdgeGeometry.label` existuje pouze u hrany, pro jejíž atribut
`label` Graphviz skutečně umístil vystředěný popisek; hrany bez něj pole
jednoduše vynechávají. `getLayout` vrací pouze vypočtenou *pozici* — ne řetězec
popisku ani jeho změřený rámeček — takže pokud váš vykreslovač musí popisek
nakreslit sám, spárujte tuto pozici s velikostí, kterou jste pro text popisku
už změřili na své straně (například vrácením vlastní mapy velikostí popisků
jednotlivých hran, klíčované stejnou dvojicí tail/head, jakou jste hranu
sestavili).

Popisky portů `taillabel` a `headlabel` se vracejí stejným způsobem, v polích
`tailLabel` a `headLabel`:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Každý z nich existuje, jen když jej rozvržení umístilo — za stejné podmínky,
za které `render()` vypíše `<text>` popisku — takže pro zjištění těchto pozic
není třeba zpracovávat vykreslené SVG.

`xlabel` se vrací v poli `xlabel`, za stejné podmínky umístění. Stojí za to jej
číst, a ne aproximovat: Graphviz umisťuje externí popisek silovým
prohledáváním kandidátních míst, nikoli posunem od středu splinu, takže jej
žádná aritmetika nad `label` nebo `points` nezreprodukuje.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Vlastní hroty šipek

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Proč:** když konec nese šipku, rozvržení spline zkrátí, aby pro ni nechalo
místo, a zaznamená, kam má šipka dosáhnout — `ep` na konci u hlavy, `sp` na
konci u ocasu. Obě chybí, pokud daný konec šipku nemá, takže výše uvedené
kontroly zároveň slouží jako „potřebuje tento konec vůbec šipku?“.
Extrapolace špičky ze závěrečného směru splinu určí správně směr, ale hloubku
jen odhadne; toto jsou hodnoty, které vypočetl samotný Graphviz.

Všimněte si, že jde o body připojení na hranici uzlu. Vlastní vykreslovač
Graphviz od nich odsazuje mnohoúhelník, který kreslí, o hodnotu závislou na
`penwidth`, takže kreslete *k* bodu `ep` a neočekávejte, že se bude rovnat
špičce vykreslené šipky.

## 6. Zpětné mapování názvů clusterů z @knowvah/dot-engine na vaše vlastní

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

**Proč:** `ClusterGeometry.name` vrací přesně ten název, který jste předali
`addSubgraph` — @knowvah/dot-engine jej nevymýšlí, nepřečísluje ani jinak
neupravuje. Pokud váš doménový model klíčuje clustery vlastním id (ne názvem,
který by Graphviz přijal), udržujte si mapování id na název sami při sestavování
grafu a snímek `clusters` po rozvržení překlíčujte; nesnažte se z názvu
Graphviz vyčítat význam.

## 6b. Vlastní blok s titulkem clusteru

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Proč:** rozvržení vyhradí uvnitř rámečku clusteru místo pro titulek a pak
určí, kam patří — s ohledem na `labelloc`, `labeljust`, `rankdir` a vlastní
změřenou velikost popisku. `ClusterGeometry.label` toto vyřešené umístění
zveřejňuje, takže konzument, který kreslí vlastní blok titulku, jej čte,
místo aby text znovu měřil a odvozoval posun, který se musí shodovat s posunem
modulu.

`label.x`/`label.y` jsou **střed** prostoru popisku, na rozdíl od `x`/`y`
rámečku, které označují roh. `<text>`, který `render()` vypíše, nese místo toho
*účaří*, které leží pod středem — pokud tedy porovnáváte s vykresleným
výstupem, porovnávejte středy se středy, nikoli s vypsaným `y`.

## 7. Bezpečné přidání mnoha hran

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

**Proč:** `addEdge` v builderu určí `tail`/`head` podle názvu a uzel při prvním
použití vytvoří, pokud ještě neexistuje — nikdy nemusíte uzly předem deklarovat
před napojením datově řízeného seznamu hran. Na grafu `strict` opakování téže
dvojice `(tail, head)` vrátí existující hranu místo přidání paralelní,
v souladu s deduplikačním kontraktem `agedge` v cgraph.

Pokud přidáváte hrany do grafu vytvořeného funkcí `parse()` a ne
`createGraph()`, použijte nízkoúrovňovou funkci `addEdge(g, tail, head, name?)`
z `@knowvah/dot-engine` přímo nad odkazy na `Node`, které již máte:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Úplnou signaturu `addEdge` a její chování při deduplikaci ve strict grafu
najdete na `/reference`.

## 8. Vše dohromady

Kompaktní funkce, která vezme malý doménový graf, rozvrhne jej a vrátí
umístěné uzly a hrany:

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

Toto je tvar, který většina konzumentů nakonec nad `getLayout` vybuduje: jedno
rozhraní, které přijímá vaše vlastní typy uzlů a hran a vrací umístěnou
geometrii ve vaší vlastní souřadnicové konvenci.
