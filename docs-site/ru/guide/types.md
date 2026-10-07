---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Справочник по типам

Концептуальная карта публичных типов, сгруппированных по тому, откуда вы их
получаете: `createGraph`/`parse` (построение и проверка), `getLayout` (снимок
геометрии), `render`/`getDrawOps` (вывод) и корневой пакет (механизмы,
изображения, измерение текста, ошибки). В каждом пункте приведён блок формы,
скопированный из исходного кода, и однострочное назначение. Исчерпывающую
документацию по полям (включая унаследованные члены и JSDoc для каждого
свойства) см. в сгенерированном
[справочнике TypeDoc](/reference/).

Эта страница не повторяет пошаговый разбор системы координат — для него см.
[Чтение вычисленной геометрии](/ru/guide/geometry). Однако замечание об оси y
кратко повторяется везде, где поля типа зависят от системы координат.

## Построение и проверка (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Непрозрачный дескриптор внутренней графовой модели. Возвращается `parse()` и
`createGraph().graph`. Передавайте его в `render`, `getLayout` и `getDrawOps`;
не создавайте и не изучайте его напрямую — построитель и парсер — единственные
поддерживаемые способы его получить.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

Параметры для `createGraph`. `directed`/`strict` выбирают один из четырёх
`GraphKind` (ориентированный, неориентированный, строгий ориентированный,
строгий неориентированный); `name` задаёт имя графа (по умолчанию `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Непрозрачный дескриптор узла графа, возвращаемый `builder.addNode(...)`.
`setHtmlAttr` помечает значение как HTML-подобную метку (эквивалент
`label=<...>` в тексте DOT), чтобы механизм компоновки измерял его как разметку.

### `GvEdge`

```ts
interface GvEdge {
  readonly tail: string;
  readonly head: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Непрозрачный дескриптор ребра графа, возвращаемый `builder.addEdge(...)`.

### `GvGraphBuilder`

```ts
interface GvGraphBuilder {
  addNode(name: string, attrs?: Record<string, string>): GvNode;
  addEdge(
    tail: GvNode | string,
    head: GvNode | string,
    attrs?: Record<string, string>,
  ): GvEdge;
  addSubgraph(name: string, attrs?: Record<string, string>): GvGraphBuilder;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
  readonly graph: Graph;
}
```

Возвращается `createGraph(...)`. `addSubgraph` возвращает вложенный построитель,
привязанный к этому подграфу; узлы, добавленные через него, также являются
членами корневого графа. `.graph` — точка передачи в
`render`/`getLayout`/`getDrawOps`. См. [Построение графа в коде](/ru/guide/build-a-graph).

## Снимок геометрии (`getLayout`)

::: tip Система координат
Родные координаты graphviz направлены вверх по оси y (начало в левом нижнем
углу). `getLayout` по умолчанию использует `yAxis: 'down'` (начало в левом
верхнем углу, экранное соглашение) и отражает каждую координату y; передайте
`{ yAxis: 'up' }`, чтобы получить родные координаты graphviz. Полный разбор:
[Чтение вычисленной геометрии](/ru/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

Параметры для `getLayout`. По умолчанию `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

Простой, сериализуемый в JSON снимок вычисленной геометрии графа, возвращаемый
`getLayout(g, opts?)`. `clusters` перечисляет каждый подграф-кластер рекурсивно
(у каждого вложенного кластера своя запись); для графов без кластеров он пуст.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Общий ограничивающий прямоугольник в пунктах. При `yAxis: 'down'` `x`/`y`
нормализуются к `(0, 0)`. При `yAxis: 'up'` `x`/`y` — исходный левый нижний угол
ограничивающего прямоугольника графа.

### `NodeGeometry`

```ts
interface NodeGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Геометрия отдельного узла. `x`/`y` — центр узла. `width`/`height` заданы в
**пунктах** — модель хранит их в дюймах (`ND_width`/`ND_height`); `getLayout`
перед возвратом умножает их на 72.

### `EdgeGeometry`

```ts
interface EdgeGeometry {
  tail: string;
  head: string;
  points: { x: number; y: number }[];
  label?: { x: number; y: number };
  tailLabel?: { x: number; y: number };
  headLabel?: { x: number; y: number };
  xlabel?: { x: number; y: number };
  sp?: { x: number; y: number };
  ep?: { x: number; y: number };
}
```

Геометрия отдельного ребра. `points` объединяет по порядку все контрольные
точки кривых Безье проложенного сплайна (пусто, если у ребра нет проложенного
сплайна). `label` присутствует, только когда у ребра есть центральная метка.

`tailLabel` и `headLabel` — позиции меток портов `taillabel`/`headlabel`.
Каждая присутствует, только когда компоновка её разместила — при том же
условии, при котором `render()` выдаёт свой `<text>`, — поэтому метка порта,
которую не удалось разместить (например, у ребра без проложенного сплайна),
считается отсутствующей, а не меткой в начале координат.

`xlabel` — позиция внешней метки `xlabel`. В отличие от `label`, она выбирается
поиском принудительного размещения graphviz среди позиций-кандидатов вокруг
ребра, поэтому не выводится ни из `label`, ни из середины сплайна. На неё
действует то же правило «только размещённые»: объявленная xlabel, которую
поиску не удалось вписать, считается отсутствующей, точно так же как
`render()` отказывается её рисовать.

`sp` и `ep` — точки крепления стрелки на хвостовом и головном концах. Когда на
конце есть стрелка, сплайн укорачивается, чтобы оставить для неё место, и
стрелка простирается от конечной контрольной точки до этой точки, — так что
потребитель, рисующий собственные наконечники, читает остриё отсюда, а не
экстраполирует его. Каждая присутствует, только когда на этом конце
действительно есть стрелка, поэтому обычное ребро `digraph { a -> b }` сообщает
`ep` и не сообщает `sp`, а `arrowhead=none` не сообщает ни одной.

Это точки крепления на границе узла. Собственный рендерер Graphviz отступает от
них при рисовании многоугольника стрелки на величину, зависящую от penwidth,
поэтому `ep` — это точка, *к которой* нужно рисовать стрелку, а не копия
отрисованного острия.

### `ClusterGeometry`

```ts
interface ClusterGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: { x: number; y: number; width: number; height: number };
}
```

Ограничивающий прямоугольник отдельного кластера. `name` — имя подграфа-кластера
(например, `cluster6`); вложенные кластеры кодируют свою иерархию в имени, поэтому
явная ссылка на родителя не предоставляется. Следует тому же соглашению о
системе координат, что и `BoundsGeometry`.

`label` — размещение заголовка кластера, присутствует, только когда кластер его
объявляет. Его `x`/`y` — **центр** пространства метки — как у
`EdgeGeometry.label`, а не угол прямоугольника, как `x`/`y` выше, — а
`width`/`height` — измеренный размер текста, поэтому прямоугольник метки равен
`[x - width/2, x + width/2] × [y - height/2, y + height/2]` и всегда лежит
внутри прямоугольника кластера. Обратите внимание: это *центр* метки, тогда как
`<text>`, который выдаёт `render()`, несёт базовую линию, расположенную ниже.

## Рендеринг (`@knowvah/dot-engine/render`)

### `OutputFormat`

```ts
type OutputFormat =
  | 'svg'
  | 'dot'
  | 'xdot'
  | 'json'
  | 'plain'
  | 'plain-ext'
  | 'imap'
  | 'cmapx';
```

Закрытое объединение форматов, принимаемых `render(g, format, opts?)`. См.
[Рендеринг в другие форматы](/ru/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

Параметры для `render`. `engine` по умолчанию равен `'dot'`. `inlineImages`
(новое) по умолчанию равен `false`; при `true` генератор SVG встраивает внешние
изображения (`image=`/HTML `<IMG>`) как URI `data:`, обращаясь к разрешителю,
зарегистрированному через `setImageResolver`, — промах разрешителя или
отсутствие регистрации возвращает к передаче исходного `src` как есть. Не
действует на форматы, отличные от SVG. См. [Работа с изображениями](/ru/guide/images).

::: warning `yAxis` не является полем `RenderOptions`
Ориентация координат — забота только `getLayout`. Необработанные строки
форматов, создаваемые `render`, несут родные координаты с осью y вверх;
отражайте при постобработке, если вам нужна ось y вниз и вы не используете
`getLayout`.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

Параметры для `getDrawOps`. `engine` по умолчанию равен `'dot'`.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Разобранный результат одного потока атрибута xdot: декодированный массив
операций рисования плюс битовая маска флагов состояния разбора. `getDrawOps`
возвращает только сплющенный `XdotOp[]` по всем атрибутам рисования графа в
порядке отрисовки (граф → узел → ребро) — полную таблицу видов операций и
пример с canvas см. в разделе
[Собственный рендеринг с xdot](/ru/guide/xdot-drawops).

### `XdotOp`

```ts
type XdotOp =
  | { kind: 'filled_ellipse' | 'unfilled_ellipse'; ellipse: XdotRect }
  | { kind: 'filled_polygon' | 'unfilled_polygon'; polygon: XdotPolyline }
  | { kind: 'filled_bezier' | 'unfilled_bezier'; bezier: XdotPolyline }
  | { kind: 'polyline'; polyline: XdotPolyline }
  | { kind: 'text'; text: XdotText }
  | { kind: 'fill_color' | 'pen_color'; color: string }
  | { kind: 'grad_fill_color' | 'grad_pen_color'; gradColor: XdotColor }
  | { kind: 'font'; font: XdotFont }
  | { kind: 'style'; style: string }
  | { kind: 'image'; image: XdotImage }
  | { kind: 'fontchar'; fontchar: number };
```

Одна декодированная операция рисования xdot, различаемая по `kind`. Каждый
вариант несёт одно свойство данных, названное по его форме, — сужайте по `kind`
в `switch`, чтобы безопасно обратиться к нему. Координаты заданы в пунктах, в
родной системе с осью y вверх (для canvas с осью y вниз отразите — см.
руководство по ссылке выше).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

Разрешённый цвет заливки/обводки xdot: сплошной цвет либо линейный/радиальный
градиент (`XdotLinearGrad`/`XdotRadialGrad` несут `x0,y0,x1,y1[,r0,r1]` плюс
массив `stops: { frac: number; color: string }[]`).

## Корневой пакет (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Имя механизма компоновки. Реестр открыт (собственные механизмы можно
зарегистрировать в `GvcContext`), поэтому принимается любая строка;
`(string & {})` сохраняет автодополнение встроенных имён в редакторе, не
замыкая множество. См. [Механизмы компоновки](/ru/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Регистрирует колбэк, возвращающий собственные размеры внешнего изображения,
упомянутого в `image=` или в ячейке HTML `<IMG>`, для расчёта размеров при
компоновке. Возвращайте `null`, когда размер неизвестен (совпадает с поведением
C при отсутствующем изображении — ячейка нулевого размера плюс
предупреждение). Передайте `null` в `setImageSizer`, чтобы сбросить ранее
заданный измеритель. См. [Использование в браузере](/ru/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Регистрирует колбэк, возвращающий «сырые» байты внешнего изображения; к нему
обращаются, когда `RenderOptions.inlineImages` равен `true`. При возврате
«голого» `Uint8Array` тип MIME определяется по расширению файла в `src`. `null`
(от разрешителя или при отсутствии зарегистрированного) возвращает к передаче
исходного `src` как есть. См. [Работа с изображениями](/ru/guide/images).

### `TextMeasurer` / `TextSize`

```ts
interface TextMeasurer {
  measure(
    text: string,
    fontname: string,
    fontsize: number,
    flags?: { readonly bold?: boolean; readonly italic?: boolean },
  ): TextSize;
}

interface TextSize {
  w: number;
  h: number;
  yoffsetCenterline?: number;
  yoffsetLayout?: number;
}
```

Подключаемое измерение текста, устанавливаемое через `setTextMeasurer` (в
комплекте три встроенных: `EstimateTextMeasurer`, `LutTextMeasurer`,
`CanvasTextMeasurer`). `yoffsetCenterline`/`yoffsetLayout` — необязательные
вертикальные метрики (базовая линия→осевая линия, базовая линия→верхний
выносной элемент); опустите их, чтобы использовать значения по умолчанию,
откалиброванные по pango. См. [Измерение текста](/ru/guide/text-measurement).

### `RenderResult` и ошибки

```ts
interface RenderResult {
  svg?: string;   // present on success
  errors?: GvError[]; // present on failure; length <= 1 for v1
}

interface GvError {
  type: 'syntax' | 'semantic' | 'render';
  code: 'SYNTAX_ERROR' | 'SYNTAX_UNEXPECTED_EOF'
      | 'EDGE_OP_DIRECTED_IN_UNDIRECTED' | 'EDGE_OP_UNDIRECTED_IN_DIRECTED'
      | 'HTML_PARSE_ERROR' | 'RENDER_ERROR' | 'INTERNAL_ERROR'
      | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE' | 'GENERIC_ERROR';
  message: string;
  friendlyMessage: string;
  location?: { line: number; column: number; offset?: number };
  expected?: GvExpectation[];
}
```

`tryRenderSvg(dotSource, engine)` — аналог `renderSvg` в стиле результата: при
успехе он возвращает `{ svg }`, а при первой неудаче — `{ errors: [one] }`
вместо выбрасывания исключения. Он возвращает значение для любого входного DOT
и выбрасывает исключение только при недопустимых аргументах. Элементы `errors`
— простые данные без `cause` и без стека.

Каждая выбрасываемая ошибка dot-engine расширяет абстрактный `DotEngineError` и
реализует `GvError`:

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}

class ParseError extends DotEngineError {
  readonly type = 'syntax';
  readonly code: GvErrorCode;
  readonly friendlyMessage: string;
  readonly location: { line: number; column: number; offset?: number };
  readonly expected?: GvExpectation[];
  get line(): number;   // convenience getter -> location.line
  get column(): number; // convenience getter -> location.column
}

class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic'; // 'semantic' for UNKNOWN_LAYOUT / UNSUPPORTED_FEATURE
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
  readonly friendlyMessage: string;
}

class InternalError extends DotEngineError {
  readonly type = 'render';
  readonly code = 'INTERNAL_ERROR';
  readonly friendlyMessage: string;
}

function isGvError(e: unknown): e is GvError; // structural; works across bundles
```

`renderSvg` выбрасывает `ParseError` при некорректном исходном коде DOT,
`RenderError` при сбоях на этапе компоновки или рендеринга и `InternalError` при
баге dot-engine. Ошибки вызывающего приводят к стандартным `TypeError` /
`RangeError` / `Error`, у которых `code` — это `UsageErrorCode`
(`'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' | 'ERR_OUT_OF_RANGE' |
'ERR_INVALID_STATE'`); они не являются `GvError`. Тем, кому нужны структурированные
ошибки без `try`/`catch`, следует использовать `tryRenderSvg`. Каждый код
описан в разделе [Ошибки и исключения](/ru/guide/errors).

## Связи

```graphviz
digraph types {
  rankdir=LR;
  bgcolor="transparent";
  node [shape=box, style=rounded, fontname="Helvetica", fontsize=11];
  edge [fontname="Helvetica", fontsize=10];

  subgraph cluster_build {
    label="Build"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    createGraph; GvGraphBuilder; GvNode; GvEdge;
  }
  subgraph cluster_read {
    label="Layout + Read"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    LayoutSnapshot; NodeGeometry; EdgeGeometry; ClusterGeometry; BoundsGeometry;
  }
  subgraph cluster_render {
    label="Render"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    OutputString [label="string"];
    XdotOpArray [label="XdotOp[]"];
  }

  createGraph -> GvGraphBuilder;
  GvGraphBuilder -> GvNode [label="addNode"];
  GvGraphBuilder -> GvEdge [label="addEdge"];
  GvGraphBuilder -> "Graph" [label=".graph"];
  parse -> "Graph";

  "Graph" -> LayoutSnapshot [label="getLayout"];
  LayoutSnapshot -> NodeGeometry;
  LayoutSnapshot -> EdgeGeometry;
  LayoutSnapshot -> ClusterGeometry;
  LayoutSnapshot -> BoundsGeometry;

  "Graph" -> OutputString [label="render"];
  "Graph" -> XdotOpArray  [label="getDrawOps"];
}
```

## Какой тип от какого вызова

| Вызов | Возвращает |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (вложенный) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (выбрасывает `DotEngineError` или `TypeError` использования) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

Все поля каждого типа выше — включая те, что эта страница лишь кратко
описывает, — см. в сгенерированном [справочнике TypeDoc](/reference/).
Подробный разбор системы координат (с рабочими примерами) см. в разделе
[Чтение вычисленной геометрии](/ru/guide/geometry).
