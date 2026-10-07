---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Przepisy

Fragmenty zorientowane na zadania, dotyczące tych części ścieżki budowanie →
układ → odczyt geometrii, które nie są oczywiste z samej referencji API.
Każdy przepis to minimalny, działający przykład korzystający wyłącznie z
publicznej powierzchni `@knowvah/dot-engine` / `@knowvah/dot-engine/api` /
`@knowvah/dot-engine/render` — bez wewnętrznych klas modelu. Pełną listę
punktów wejścia, z których korzystają te fragmenty, znajdziesz w `/guide/api`.

## 1. Zbuduj graf w kodzie i wyrenderuj go

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Dlaczego:** `createGraph` daje konstruktor, gdy struktura grafu pochodzi z
danych aplikacji, a nie ze statycznego łańcucha DOT; `render` układa graf i
serializuje go jednym wywołaniem. Pełne API konstruktora (podgrafy, atrybuty,
porównanie z `parse`) opisuje `/guide/build-a-graph`.

## 2. Ułóż bez renderowania, potem odczytaj geometrię

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

**Dlaczego:** `getLayout` jest czystym czytnikiem już obliczonej geometrii —
sam nie uruchamia układu. Jeśli wywołasz go, zanim jakiekolwiek wywołanie
układu zostało wykonane, rzuci `Error` z `code` równym `ERR_INVALID_STATE`
(„getLayout requires a laid-out graph”; zobacz
[Błędy i wyjątki](/pl/guide/errors)), zamiast zwracać nieaktualne lub
wyzerowane współrzędne. Jeśli potrzebujesz samej geometrii i nigdy
wyrenderowanego łańcucha, odrzuć wartość zwracaną przez `render` — płacisz tak
naprawdę za efekt uboczny w postaci układu.

## 3. Wybierz oś y dla swojego renderera

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Dlaczego:** Graphviz oblicza układ w układzie współrzędnych z osią y
skierowaną w górę; większość odbiorców (canvas, DOM, SVG w przeglądarce)
chce osi y skierowanej w dół. `getLayout` domyślnie używa `'down'`, więc
większość wywołujących nigdy nie potrzebuje tej opcji. Dokładny wzór
odwrócenia oraz różnicę w `bounds` między oboma trybami opisuje
`/guide/geometry`.

## 4. Uzgodnij ramkę SVG z `render()` z ramką z `getLayout()`

`render(g, 'svg')` i `getLayout(g)` opisują *ten sam* ułożony graf, ale w
różnych ramkach współrzędnych, a różnica to nie tylko odwrócenie osi y:
emiter SVG w `render` neguje każdą współrzędną y przed zapisaniem prymitywu
kształtu, a następnie opakowuje cały rysunek w jeden
`<g transform="scale(..) rotate(..) translate(tx,ty)">`, który uwzględnia
dopełnienie strony, margines oraz skalowanie lub obrót z `size=`. `getLayout`
pomija to wszystko — zwraca współrzędne modelu znormalizowane do początku w
`(0, 0)`, bez jakiejkolwiek geometrii strony.

Dla pojedynczego wywołania `render()` obie ramki różnią się o jedno stałe
przesunięcie. Zamiast wyprowadzać na nowo wzór układu strony z GVC, wyznacz
przesunięcie empirycznie na podstawie jednego węzła, którego pozycje znasz w
obu ramkach:

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

**Dlaczego:** jedno dopasowanie w pełni wyznacza przesunięcie, ponieważ jest
to czyste przesunięcie, a nie skalowanie czy obrót (przy domyślnych
`size=`/`rotate=`). Potrzebujesz tego tylko wtedy, gdy odczytujesz z surowego
SVG coś, czego `getLayout` nie udostępnia — jedyny częsty przypadek, w którym
dziś nie da się tego uniknąć, opisuje przepis 5.

## 5. Odzyskaj pozycje etykiet krawędzi

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

**Dlaczego:** `EdgeGeometry.label` występuje tylko dla krawędzi, dla której
atrybut `label` faktycznie sprawił, że Graphviz umieścił wyśrodkowaną
etykietę; krawędzie bez niej po prostu pomijają to pole. `getLayout` zwraca
wyłącznie obliczoną *pozycję* — nie łańcuch etykiety ani jej zmierzony
prostokąt — więc jeśli Twój renderer sam rysuje etykietę, połącz tę pozycję z
rozmiarem, który został już zmierzony po Twojej stronie dla tekstu etykiety (np.
odsyłając własną mapę rozmiarów etykiet dla poszczególnych krawędzi,
kluczowaną tą samą parą tail/head, która posłużyła do zbudowania krawędzi).

Etykiety portów `taillabel` i `headlabel` wracają w ten sam sposób, w polach
`tailLabel` i `headLabel`:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Każda z nich występuje dopiero wtedy, gdy układ ją umieścił — to ten sam
warunek, przy którym `render()` emituje `<text>` etykiety — więc nie trzeba
przeszukiwać wyrenderowanego SVG, aby odzyskać te pozycje.

`xlabel` wraca w polu `xlabel`, pod tą samą bramką „tylko umieszczone”.
Warto go odczytać, a nie przybliżać: Graphviz pozycjonuje etykietę zewnętrzną
przez przeszukiwanie siłowe kandydackich miejsc, a nie przez przesunięcie
środka splajnu, więc żadna arytmetyka na `label` ani `points` jej nie
odtworzy.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Rysuj własne groty strzałek

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Dlaczego:** gdy koniec krawędzi ma strzałkę, układ skraca splajn, aby
zostawić na nią miejsce, i zapisuje, dokąd strzałka ma sięgać — `ep` na
końcu głowy, `sp` na końcu ogona. Oba są nieobecne, gdy dany koniec nie ma
strzałki, więc powyższe sprawdzenia pełnią zarazem rolę pytania „czy ten
koniec w ogóle potrzebuje strzałki”. Ekstrapolacja czubka z końcowego kierunku
splajnu trafia w kierunek, ale zgaduje głębokość; to są wartości, które
obliczył sam Graphviz.

Zauważ, że są to punkty zaczepienia na granicy węzła. Własny renderer
Graphviza cofa rysowany wielokąt względem nich o wartość zależną od
`penwidth`, więc rysuj *do* `ep`, zamiast oczekiwać, że będzie równe czubkowi
wyrenderowanej strzałki.

## 6. Odwzoruj nazwy klastrów z @knowvah/dot-engine z powrotem na swoje

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

**Dlaczego:** `ClusterGeometry.name` zwraca dokładnie tę nazwę, którą przekazano
w `addSubgraph` — @knowvah/dot-engine niczego nie wymyśla, nie
renumeruje ani nie przekształca. Jeśli Twój model domenowy kluczuje klastry
własnym identyfikatorem (a nie nazwą, którą Graphviz by zaakceptował),
prowadź mapowanie identyfikator-nazwa samodzielnie podczas budowania grafu i
po układzie przekluczuj migawkę `clusters`; nie próbuj wyciągać znaczenia z
nazwy nadanej przez Graphviz.

## 6b. Rysuj własny blok tytułu klastra

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Dlaczego:** układ rezerwuje miejsce na tytuł klastra wewnątrz ramki klastra,
a następnie rozstrzyga, gdzie ma on trafić — uwzględniając `labelloc`,
`labeljust`, `rankdir` oraz własny zmierzony rozmiar etykiety.
`ClusterGeometry.label` publikuje to rozstrzygnięte umiejscowienie, więc
odbiorca rysujący własny blok tytułu odczytuje je, zamiast ponownie mierzyć
tekst i wyprowadzać przesunięcie, które musi zgadzać się z tym z silnika.

`label.x`/`label.y` to **środek** miejsca na etykietę, w przeciwieństwie do
`x`/`y` ramki, które wskazują narożnik. `<text>` emitowany przez `render()`
niesie natomiast *linię bazową*, która leży poniżej środka — jeśli więc
dopasowujesz wyrenderowane wyjście, porównuj środki ze środkami, a nie z
emitowanym `y`.

## 7. Bezpiecznie dodawaj wiele krawędzi

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

**Dlaczego:** `addEdge` konstruktora rozwiązuje `tail`/`head` po nazwie i
tworzy węzeł przy pierwszym użyciu, jeśli jeszcze nie istnieje — nigdy nie
musisz wcześniej deklarować węzłów, zanim połączysz je krawędziami z listy
opartej na danych. W grafie `strict` powtórzenie tej samej pary
`(tail, head)` zwraca istniejącą krawędź zamiast dodawać równoległą, co
odzwierciedla kontrakt deduplikacji `agedge` z cgraph.

Jeśli dodajesz krawędzie do grafu uzyskanego z `parse()`, a nie z
`createGraph()`, użyj niższego poziomu `addEdge(g, tail, head, name?)` z
`@knowvah/dot-engine` bezpośrednio na referencjach `Node`, które już
posiadasz:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Pełną sygnaturę `addEdge` i jej zachowanie deduplikujące w grafach strict
znajdziesz w `/reference`.

## 8. Wszystko razem

Zwarta funkcja, która przyjmuje mały graf domenowy, układa go i zwraca
węzły oraz krawędzie z pozycjami:

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

To kształt, który większość odbiorców ostatecznie buduje nad `getLayout`:
jeden punkt rozszerzeń, który przyjmuje Twoje własne typy węzłów i krawędzi,
a zwraca geometrię z pozycjami w Twojej własnej konwencji współrzędnych.
