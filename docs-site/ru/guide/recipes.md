---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Рецепты

Фрагменты кода, ориентированные на задачи, для тех частей пути «построение →
компоновка → чтение геометрии», которые не очевидны из одного лишь справочника
API. Каждый рецепт — минимальный работающий пример, использующий только
публичную поверхность `@knowvah/dot-engine` / `@knowvah/dot-engine/api` /
`@knowvah/dot-engine/render` — без внутренних классов модели. Полный список точек
входа, из которых взяты эти фрагменты, см. в `/guide/api`.

## 1. Построение графа в коде и его рендеринг

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Почему:** `createGraph` даёт построитель, когда структура графа берётся из
данных приложения, а не из статической строки DOT; `render` выполняет
компоновку графа и сериализует его одним вызовом. Полный API построителя
(подграфы, атрибуты, сравнение с `parse`) описан в `/guide/build-a-graph`.

## 2. Компоновка без рендеринга и чтение геометрии

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

**Почему:** `getLayout` — чистый читатель уже вычисленной геометрии: сам он
компоновку не запускает. Если вызвать его до какого-либо вызова компоновки, он
выбросит `Error` с `code` `ERR_INVALID_STATE` («getLayout requires a laid-out
graph»; см. [Ошибки и исключения](/ru/guide/errors)), вместо того чтобы вернуть
устаревшие или обнулённые координаты. Если вам нужна только геометрия, а
отрендеренная строка не нужна, отбросьте возвращаемое значение `render` — вы на
самом деле платите именно за побочный эффект компоновки.

## 3. Выбор оси y для вашего рендерера

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Почему:** graphviz вычисляет компоновку в системе координат с осью y вверх;
большинству потребителей (canvas, DOM, SVG в браузере) нужна ось y вниз.
`getLayout` по умолчанию использует `'down'`, поэтому большинству вызывающих
этот параметр не нужен. Точную формулу отражения и то, чем различается `bounds`
в двух режимах, см. в `/guide/geometry`.

## 4. Согласование системы координат SVG из `render()` с системой из `getLayout()`

`render(g, 'svg')` и `getLayout(g)` описывают *один и тот же* скомпонованный
граф, но в разных системах координат, и различие не сводится к отражению оси y:
генератор SVG в `render` меняет знак каждой координаты y перед записью
графического примитива, а затем оборачивает весь рисунок в один
`<g transform="scale(..) rotate(..) translate(tx,ty)">`, учитывающий поля
страницы graphviz, отступы и любое масштабирование `size=`/поворот. `getLayout`
всё это пропускает — он возвращает координаты модели, нормализованные к началу
`(0, 0)`, вообще без геометрии страницы.

Для любого одиночного вызова `render()` эти две системы различаются на один
постоянный сдвиг. Вместо того чтобы заново выводить формулу компоновки страницы
из GVC, найдите смещение эмпирически по одному узлу, позиции которого у вас уже
есть в обеих системах:

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

**Почему:** одного совпадения достаточно, чтобы полностью определить смещение,
потому что это чистый сдвиг, а не масштаб и не поворот (при `size=`/`rotate=` по
умолчанию). Это нужно только тогда, когда вы читаете из «сырого» SVG то, что
`getLayout` не раскрывает, — единственный распространённый случай, где
сегодня без этого не обойтись, см. в рецепте 5.

## 5. Восстановление позиций меток рёбер

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

**Почему:** `EdgeGeometry.label` присутствует только для ребра, для которого
graphviz действительно разместил центрированную метку по атрибуту `label`; у
рёбер без неё это поле просто отсутствует. `getLayout` возвращает только
вычисленную *позицию* — не строку метки и не её измеренный прямоугольник, —
поэтому, если ваш рендерер должен рисовать метку сам, сочетайте эту позицию с
тем размером, который вы уже измерили для текста этой метки на своей стороне
(например, возвращая собственную карту размеров меток по рёбрам, ключом которой
служит та же пара tail/head, что вы использовали при построении ребра).

Метки портов `taillabel` и `headlabel` возвращаются так же — в `tailLabel` и
`headLabel`:

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Каждая присутствует, только когда компоновка её разместила — при том же
условии, при котором `render()` выдаёт `<text>` метки, — поэтому нет нужды
выковыривать эти позиции из отрендеренного SVG.

`xlabel` возвращается в `xlabel` при том же правиле «только размещённые». Её
стоит читать, а не приближать: graphviz размещает внешнюю метку силовым поиском
по позициям-кандидатам, а не смещением от середины сплайна, поэтому никакая
арифметика над `label` или `points` её не воспроизводит.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Рисование собственных наконечников стрелок

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Почему:** когда на конце есть стрелка, компоновка укорачивает сплайн, чтобы
оставить для неё место, и записывает, докуда стрелка должна доходить, — `ep` на
головном конце, `sp` на хвостовом. Обе отсутствуют, когда на этом конце стрелки
нет, поэтому проверки выше заодно отвечают на вопрос «нужна ли на этом конце
стрелка вообще». Экстраполяция острия по конечному направлению сплайна даёт
верное направление, но угадывает глубину; здесь — значения, которые вычислил сам
graphviz.

Учтите, что это точки крепления на границе узла. Собственный рендерер Graphviz
отступает от них при рисовании многоугольника на величину, зависящую от
penwidth, поэтому рисуйте *к* `ep`, а не ожидайте, что она совпадёт с остриём
отрисованной стрелки.

## 6. Сопоставление имён кластеров @knowvah/dot-engine с вашими

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

**Почему:** `ClusterGeometry.name` возвращает ровно то имя, которое вы передали в
`addSubgraph`, — @knowvah/dot-engine не придумывает, не перенумеровывает и никак
иначе не преобразует его. Если ваша предметная модель идентифицирует кластеры
собственным id (не именем, которое принял бы graphviz), храните соответствие
id→имя сами при построении графа и перекладывайте снимок `clusters` под свои
ключи после компоновки; не пытайтесь извлекать смысл из собственного имени
graphviz.

## 6b. Рисование собственного блока заголовка кластера

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Почему:** компоновка резервирует место под заголовок кластера внутри
прямоугольника кластера, а затем определяет, куда его поместить, — с учётом
`labelloc`, `labeljust`, `rankdir` и собственного измеренного размера метки.
`ClusterGeometry.label` публикует это определённое размещение, поэтому
потребитель, рисующий собственный блок заголовка, читает его, а не заново
измеряет текст и не выводит смещение, которое должно совпасть с вычисленным
механизмом.

`label.x`/`label.y` — это **центр** пространства метки, в отличие от `x`/`y`
прямоугольника, где это угол. `<text>`, который выдаёт `render()`, вместо этого
несёт *базовую линию*, лежащую ниже центра, — поэтому, если вы сопоставляете с
отрендеренным выводом, сравнивайте центры с центрами, а не с выданным `y`.

## 7. Безопасное добавление множества рёбер

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

**Почему:** `addEdge` построителя разрешает `tail`/`head` по имени и создаёт
узел при первом использовании, если его ещё нет, — вам никогда не нужно заранее
объявлять узлы перед подключением управляемого данными списка рёбер. В `strict`
графе повтор той же пары `(tail, head)` возвращает существующее ребро вместо
добавления параллельного, повторяя контракт дедупликации `agedge` из cgraph.

Если вы добавляете рёбра в граф, полученный из `parse()`, а не из
`createGraph()`, используйте низкоуровневый `addEdge(g, tail, head, name?)` из
`@knowvah/dot-engine` непосредственно для ссылок `Node`, которые у вас уже есть:

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Полную сигнатуру `addEdge` и поведение его дедупликации в строгих графах см. в
`/reference`.

## 8. Собираем всё вместе

Компактная функция, которая принимает небольшой предметный граф, выполняет его
компоновку и возвращает узлы и рёбра с позициями:

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

Именно такую форму большинство потребителей в итоге строит поверх `getLayout`:
один шов, который принимает ваши собственные типы узлов и рёбер и возвращает
геометрию с позициями в вашем собственном соглашении о координатах.
