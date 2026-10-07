---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Recepty

Úlohovo orientované úryvky pre tie časti cesty zostavenie → rozloženie →
čítanie geometrie, ktoré nie sú zrejmé zo samotnej referencie API. Každý
recept je minimálny spustiteľný príklad využívajúci iba verejné rozhranie
`@knowvah/dot-engine` / `@knowvah/dot-engine/api` /
`@knowvah/dot-engine/render` — žiadne interné triedy modelu.
Úplný zoznam vstupných bodov, z ktorých tieto úryvky vychádzajú, nájdete
v `/guide/api`.

## 1. Zostavenie grafu v kóde a jeho vykreslenie

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Prečo:** `createGraph` vám poskytne builder, keď štruktúra grafu pochádza
z údajov aplikácie, a nie zo statického reťazca DOT; `render` vytvorí
rozloženie grafu a serializuje ho jediným volaním. Úplné API buildera
(podgrafy, atribúty, porovnanie s `parse`) je v `/guide/build-a-graph`.

## 2. Rozloženie bez vykreslenia a následné čítanie geometrie

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

**Prečo:** `getLayout` je čisto čítací nástroj nad už vypočítanou geometriou —
rozloženie sám nespúšťa. Ak ho zavoláte skôr, než sa vykoná akékoľvek volanie
rozloženia, vyhodí `Error` s `code` `ERR_INVALID_STATE` („getLayout requires
a laid-out graph“; pozrite [Chyby a výnimky](/sk/guide/errors)), namiesto
toho, aby vrátil zastarané alebo vynulované súradnice. Ak potrebujete iba
geometriu a vykreslený reťazec nikdy nepotrebujete, návratovú hodnotu `render`
zahoďte — platíte práve za vedľajší účinok v podobe rozloženia.

## 3. Voľba osi y pre váš vykresľovač

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Prečo:** Graphviz počíta rozloženie v súradnicovom systéme s osou y
smerujúcou nahor; väčšina spotrebiteľov (canvas, DOM, SVG v prehliadači)
chce os y smerujúcu nadol. `getLayout` má predvolene `'down'`, takže väčšina
volajúcich túto možnosť nikdy nepotrebuje. Presný vzorec prevrátenia a to,
ako sa `bounds` líšia medzi oboma režimami, opisuje `/guide/geometry`.

## 4. Zosúladenie rámca SVG z `render()` s rámcom z `getLayout()`

`render(g, 'svg')` a `getLayout(g)` opisujú *ten istý* graf s vypočítaným
rozložením, ale v rôznych súradnicových rámcoch, a rozdiel nie je len
v prevrátení osi y: emitor SVG v `render` neguje každú súradnicu y pred
zapísaním základného tvaru a potom celú kresbu obalí jedným prvkom
`<g transform="scale(..) rotate(..) translate(tx,ty)">`, ktorý zahŕňa odsadenie
stránky, okraj a prípadné škálovanie či otočenie podľa `size=`. `getLayout` to
všetko preskočí — vracia súradnice modelu normalizované na počiatok `(0, 0)`
bez akejkoľvek geometrie stránky.

Pri každom jednotlivom volaní `render()` sa tieto dva rámce líšia o jeden
konštantný posun. Namiesto odvodzovania vzorca rozloženia stránky v GVC
odvoďte posun empiricky z jedného uzla, ktorého polohu poznáte v oboch
rámcoch:

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

**Prečo:** jedna zhoda posun plne určuje, pretože ide o čistý posun, nie
o zmenu mierky alebo otočenie (za predpokladu predvolených `size=`/`rotate=`).
Toto potrebujete len vtedy, keď z nespracovaného SVG čítate niečo, čo
`getLayout` nesprístupňuje — jediný bežný prípad, keď sa tomu zatiaľ nedá
vyhnúť, je v recepte 5.

## 5. Získanie polôh popisov hrán

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

**Prečo:** `EdgeGeometry.label` sa vyskytuje len pri hrane, pre ktorej
atribút `label` Graphviz skutočne umiestnil centrovaný popis; hrany bez neho
toto pole jednoducho vynechajú. `getLayout` vracia iba vypočítanú *polohu* —
nie reťazec popisu ani jeho zmeraný rámik — takže ak váš vykresľovač potrebuje
popis nakresliť sám, skombinujte túto polohu s veľkosťou, ktorú ste pre daný
text popisu už zmerali na svojej strane (napr. spätným použitím vlastnej
mapy veľkostí popisov pre jednotlivé hrany, kľúčovanej rovnakou dvojicou
tail/head, akú ste použili pri vytváraní hrany).

Popisy portov `taillabel` a `headlabel` sa vracajú rovnako, v poliach
`tailLabel` a `headLabel`:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Každý sa vyskytuje, až keď ho rozloženie umiestnilo — za rovnakej podmienky,
za akej `render()` vypíše `<text>` popisu — takže na získanie týchto polôh
netreba prehľadávať vykreslené SVG.

`xlabel` sa vracia v poli `xlabel` s rovnakou podmienkou „len ak bol
umiestnený“. Oplatí sa ho prečítať, a nie približne dopočítať: Graphviz
umiestňuje externý popis silovým vyhľadávaním medzi kandidátnymi pozíciami,
nie posunom od stredu splinu, takže žiadny výpočet z `label` alebo `points`
ho nezreprodukuje.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Vlastné kreslenie hrotov šípok

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Prečo:** keď má niektorý koniec šípku, rozloženie skráti spline, aby pre
ňu urobilo miesto, a zaznamená, kam má šípka siahať — `ep` na konci pri head,
`sp` na konci pri tail. Ak daný koniec šípku nemá, príslušné pole chýba, takže
vyššie uvedené kontroly zároveň slúžia ako otázka „potrebuje tento koniec
vôbec šípku“. Odhad hrotu extrapoláciou zo záverečného smeru splinu trafí
smer, ale hĺbku len hádá; tieto hodnoty sú tie, ktoré vypočítal samotný
Graphviz.

Všimnite si, že ide o body pripojenia na hranici uzla. Vlastný vykresľovač
Graphviz od nich odsadí polygón, ktorý kreslí, o hodnotu závislú od `penwidth`,
takže kreslite *k* `ep` a nečakajte, že sa bude rovnať hrotu vykreslenej
šípky.

## 6. Mapovanie názvov klastrov z @knowvah/dot-engine späť na vaše

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

**Prečo:** `ClusterGeometry.name` vracia presne ten názov, ktorý ste dali
`addSubgraph` — @knowvah/dot-engine ho nevymýšľa, nečísluje znova ani inak
neupravuje. Ak váš doménový model kľúčuje klastre vlastným identifikátorom
(nie názvom, ktorý by Graphviz prijal), uchovávajte si mapovanie identifikátor
→ názov sami počas zostavovania grafu a po rozložení prekľúčujte snímku
`clusters`; nesnažte sa z vlastných názvov Graphviz vyvodzovať význam.

## 6b. Vlastné kreslenie bloku názvu klastra

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Prečo:** rozloženie vyhradí v rámčeku klastra miesto pre jeho názov a potom
určí, kam patrí — s ohľadom na `labelloc`, `labeljust`, `rankdir` a vlastnú
zmeranú veľkosť popisu. `ClusterGeometry.label` túto určenú polohu zverejňuje,
takže spotrebiteľ kresliaci vlastný blok názvu ju prečíta, namiesto toho, aby
text znova meral a odvodzoval odsadenie, ktoré sa musí zhodovať s odsadením
modulu rozloženia.

`label.x`/`label.y` sú **stred** priestoru popisu, na rozdiel od `x`/`y`
rámčeka, ktoré predstavujú roh. `<text>`, ktorý vypisuje `render()`, nesie
namiesto toho *základnú čiaru*, ktorá leží pod stredom — takže ak porovnávate
s vykresleným výstupom, porovnávajte stredy so stredmi, nie s vypísaným `y`.

## 7. Bezpečné pridávanie mnohých hrán

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

**Prečo:** `addEdge` buildera vyhľadá `tail`/`head` podľa názvu a ak uzol
ešte neexistuje, pri prvom použití ho vytvorí — uzly nikdy nemusíte vopred
deklarovať, kým zapájate zoznam hrán riadený údajmi. V grafe `strict`
opakovaná dvojica `(tail, head)` vráti existujúcu hranu namiesto pridania
paralelnej, čo zodpovedá zmluve cgraph `agedge` o odstraňovaní duplicít.

Ak pridávate hrany do grafu vytvoreného pomocou `parse()` a nie
`createGraph()`, použite nízkoúrovňové `addEdge(g, tail, head, name?)`
z `@knowvah/dot-engine` priamo na referenciách `Node`, ktoré už máte:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Úplnú signatúru `addEdge` a jeho správanie pri odstraňovaní duplicít v strict
grafoch nájdete v `/reference`.

## 8. Všetko dohromady

Kompaktná funkcia, ktorá prevezme malý doménový graf, vytvorí jeho rozloženie
a vráti umiestnené uzly a hrany:

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

Toto je tvar, ktorý väčšina spotrebiteľov nakoniec postaví nad `getLayout`:
jeden zásuvný bod, ktorý na vstupe prijme vaše vlastné typy uzlov a hrán
a na výstupe vráti umiestnenú geometriu vo vašej vlastnej súradnicovej
konvencii.
