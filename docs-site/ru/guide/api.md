---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# Справочник API

Публичная поверхность намеренно невелика. Большинству вызывающих нужен только
`renderSvg`. Какую точку входа использовать, см. в разделе
[Обзор](/ru/guide/overview); формы, которые принимает и возвращает каждая
функция, описаны в разделе [Типы](/ru/guide/types), а сгенерированный
[Справочник](/reference/) содержит исчерпывающие сигнатуры, каждое поле и
каждую перегрузку.

> Объявления типов (`.d.ts`) создаются командой `npm run build` (шаг
> `build:types` запускает `tsc -p tsconfig.build.json`). Карта `exports` в
> `package.json` связывает условия `types` с каждой точкой входа, поэтому
> `@knowvah/dot-engine`, `@knowvah/dot-engine/api` и `@knowvah/dot-engine/render`
> разрешают типы в редакторах и в downstream-сборках.
>
> Сборка также создаёт карты объявлений (`.d.ts.map`) и source map для JS, а
> пакет поставляется вместе со своими исходниками `src/`, поэтому «перейти к
> определению» ведёт прямо в настоящий TypeScript, что упрощает чтение кода и
> открытие PR.

Эта страница организована по трём точкам входа ([Обзор](/ru/guide/overview)
объясняет, когда к какой обращаться): корневой пакет `@knowvah/dot-engine`
(разбор и рендеринг одним вызовом, плюс глобальная для процесса конфигурация),
`@knowvah/dot-engine/api` (построение графа в коде, чтение вычисленной
геометрии) и `@knowvah/dot-engine/render` (вывод в нескольких форматах и «сырые»
операции рисования). Каждая функция ниже также реэкспортируется из корневого
пакета (`export * from './api/index.js'` / `export * from './render/index.js'`
в `src/index.ts`) — импорт всего из `@knowvah/dot-engine` работает, но импорты
по подпутям явнее показывают, с каким слоем вы работаете.

## `@knowvah/dot-engine` (корень)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Разбирает исходный код DOT, запускает указанный [механизм компоновки](/ru/guide/engines),
рендерит в SVG и возвращает строку SVG. Это удобная обёртка в один вызов: она
создаёт `GvcContext`, регистрирует восемь встроенных механизмов и рендерер SVG,
выполняет компоновку, рендеринг и освобождает компоновку — если эти шаги нужно
разделить, см. ниже [`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext).

- **`dotSource`** — исходный код графа на языке DOT.
- **`engine`** — `EngineName`: один из встроенных (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) или любое имя, зарегистрированное
  пользователем.
- **Выбрасывает** `DotEngineError` при любой проблеме со входом: `ParseError`,
  если `dotSource` некорректен, `RenderError`, если компоновка или рендеринг
  завершились сбоем, `InternalError` (с `cause`) при баге dot-engine.
  `TypeError` с `code` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`, если
  `dotSource` или `engine` недопустимы (включая имя механизма, которое не
  зарегистрировано). См. [Ошибки и исключения](/ru/guide/errors).

Полная сигнатура, JSDoc и список полей `GvError`: [Справочник](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

Родственная `renderSvg` функция в стиле результата. Для любого входного DOT она
возвращает значение (никогда не выбрасывает исключение): `{ svg }` при успехе
или `{ errors: [one] }` при первой неудаче; `svg` и `errors` взаимоисключающи.
Исключение выбрасывается только при недопустимых аргументах (`TypeError`
`ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`). Каждый элемент `errors` —
простые, сериализуемые в JSON данные (`type`, `code`, `message`,
`friendlyMessage`, а также `location` / `expected`, если они есть; без `cause` и
трассировки стека), поэтому его безопасно передавать через границу
worker/postMessage или сериализовать в лог. Предпочитайте её связке
`renderSvg` + `try`/`catch`, когда вызывающему коду нужно ветвиться по `code` /
`type`, а не перехватывать исключение. См. [Ошибки и исключения](/ru/guide/errors).
[Справочник](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Разбирает DOT в графовую модель в памяти **без** компоновки. Полезно для
проверки или преобразования графа — либо для передачи его в `getLayout` из
`@knowvah/dot-engine/api` или в `render` из `@knowvah/dot-engine/render` — до
рендеринга.

- **Выбрасывает** `ParseError` при синтаксических ошибках или нарушениях
  направления рёбер (например, `->` в неориентированном графе). `ParseError`
  расширяет `DotEngineError` и реализует `GvError` с `type: 'syntax'`; он несёт
  `location: { line, column, offset? }`. `TypeError` `ERR_INVALID_ARG_TYPE`,
  если `dotSource` не строка. [Ошибки и исключения](/ru/guide/errors),
  [Справочник](/reference/).

### `DotEngineError` / `RenderError` / `InternalError`

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}
class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic';
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
}
class InternalError extends DotEngineError {
  readonly type: 'render';
  readonly code: 'INTERNAL_ERROR';
}
function isGvError(e: unknown): e is GvError;
```

`instanceof DotEngineError` означает, что dot-engine не справился с этим входом.
`RenderError` охватывает известные сбои компоновки и рендеринга (`type` равен
`semantic` для `UNKNOWN_LAYOUT` и `UNSUPPORTED_FEATURE`). `InternalError` — это
баг dot-engine; `cause` хранит исходную ошибку, если она была обёрнута. Ошибки
вызывающего вместо этого приводят к стандартным `TypeError` / `RangeError` /
`Error` с `code`. `isGvError` проверяет наличие строковых `type` и `code`,
поэтому работает между дублирующимися бандлами. Все коды и то, что может
выбросить каждая функция, см. в разделе [Ошибки и исключения](/ru/guide/errors),
форму `GvError` — в разделе [Типы](/ru/guide/types), а список членов
`GvErrorCode` — в [Справочнике](/reference/).

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Регистрирует (или сбрасывает, при `null`) глобальный для процесса измеритель
текста, к которому обращается компоновка для определения размеров меток. После
сброса используется значение библиотеки по умолчанию (браузер:
`CanvasTextMeasurer`; headless/Node: `EstimateTextMeasurer`, если не подключён
LUT-измеритель — полный порядок выбора и реализации `CanvasTextMeasurer` /
`EstimateTextMeasurer` / `LutTextMeasurer`, экспортируемые вместе с этими
функциями, см. в разделе [Измерение текста](/ru/guide/text-measurement)).
[Справочник](/reference/).

### `setImageSizer` / `setImageResolver`

Две родственные, но различные точки настройки изображений — обе являются
глобальными для процесса реестрами с одним и тем же шаблоном (зарегистрировать
колбэк, передать `null` для сброса), и обе не делают ничего, пока вызывающий
код не зарегистрирует колбэк:

- **`setImageSizer`** — сообщает *собственные размеры* внешнего изображения,
  чтобы механизм компоновки мог зарезервировать место под ячейку HTML `<IMG>`
  или атрибут узла `image=` до рендеринга. Возврат `null` (или отсутствие
  зарегистрированного измерителя) воспроизводит поведение нативного Graphviz при
  отсутствующем изображении: предупреждение и нулевой размер.
- **`setImageResolver`** (новое — см. ниже [`inlineImages`](#inlineimages)) —
  предоставляет сами *байты* изображения, чтобы рендерер SVG мог встроить их
  как URI `data:` вместо того, чтобы выдавать `xlink:href="src"` как есть.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` может вернуть «голый» `Uint8Array` (MIME определяется по
расширению файла в `src` — `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`, `.webp`; всё
остальное сводится к `application/octet-stream`) либо `{ bytes, mime }`, чтобы
задать тип MIME явно. Возвращайте `null`, когда `src` разрешить нельзя —
рендерер вернётся к передаче исходного `src` как есть, как если бы
разрешитель не был зарегистрирован. Регистрация разрешителя сама по себе ничего
не меняет; к нему обращаются только тогда, когда параметр `inlineImages` у
`render` равен `true` (ниже). Рабочий пример см. в разделе
[Работа с изображениями](/ru/guide/images), а оба типа колбэков — в
[Справочнике](/reference/).

### `renderSvgAsync` / `renderSvgInto`

```ts
function renderSvgAsync(
  dotSource: string,
  engine: EngineName,
  opts?: AsyncSvgOptions,
): Promise<{ svg: string; fontIssues: FontIssue[] }>;

function renderSvgInto(
  id: string,
  src: string,
  engine: EngineName,
  opts?: RenderSvgIntoOptions,
): Promise<{ element: SVGSVGElement; fontIssues: FontIssue[] }>;

type FontIssue = { face: string; reason: 'failed' | 'timeout' };
type AsyncSvgOptions = Omit<AsyncRenderOptions, 'engine'>;
interface RenderSvgIntoOptions extends AsyncSvgOptions {
  sanitize?: (svg: string) => string;
  trusted?: boolean;
  document?: Document;
}
```

`renderSvgAsync` — асинхронный аналог `renderSvg`: он заранее загружает
веб-шрифты и данные изображений, нужные графу, а затем выполняет компоновку и
рендеринг. `renderSvgInto` рендерит и заменяет дочерние элементы элемента с
идентификатором `id`, по умолчанию очищая SVG (`trusted: true` пропускает
очистку; `sanitize` заменяет встроенный очиститель). Сбои, включая неверные
аргументы, — это отклонения промиса с теми же классами ошибок, что и у
`renderSvg`; отсутствующий идентификатор элемента отклоняется с
`ERR_INVALID_ARG_VALUE`. Проблемы со шрифтами никогда не приводят к отклонению;
они возвращаются в `fontIssues`. См. [Использование в браузере](/ru/guide/browser)
и [Работа с изображениями](/ru/guide/images), а также [Справочник](/reference/).

### `GvcContext` / `renderWithContext`

```ts
class GvcContext {
  constructor(measurer: TextMeasurer, options?: { debug?: DebugOptions });
  register(plugin: LayoutEngine | RendererPlugin): void;
  layout(g: Graph, engineName: EngineName): void;
  freeLayout(g: Graph, engineName: EngineName): void;
}

function renderWithContext(ctx: GvcContext, g: Graph, format: string): string;
```

Низкоуровневая оркестрация для вызывающих, которым нужно выполнять компоновку и
рендеринг отдельными шагами. `renderSvg` — удобная обёртка именно над этим:
создать контекст, зарегистрировать механизмы и рендереры, `layout`,
`renderWithContext`, `freeLayout`. Обращайтесь к ним напрямую, только когда
нужен такой контроль — например, чтобы зарегистрировать подмножество
механизмов, добавить собственный `LayoutEngine` или `RendererPlugin`, либо
отрендерить один и тот же скомпонованный граф в несколько форматов без
повторной компоновки (вызовите `layout` один раз, затем `renderWithContext` для
каждого формата, затем `freeLayout`). [Справочник](/reference/).

## `@knowvah/dot-engine/api`

Программное построение, безопасная вставка рёбер и чтение вычисленной геометрии
— слой для построения графа без ручного написания текста DOT и чтения его
компоновки обратно в виде простых данных. О `LayoutSnapshot` и его вложенных
формах см. в разделе [Типы](/ru/guide/types).

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Создаёт новый граф, готовый к передаче в `render` / `getLayout` /
`getDrawOps`. Значения по умолчанию: `directed: true`, `strict: false`,
`name: ''`. Возвращает `GvGraphBuilder` — `addNode`, `addEdge`, `addSubgraph`,
`setAttr`/`getAttr`, `setHtmlAttr` (для меток в виде HTML-таблиц) и свойство
`.graph`, предоставляющее непрозрачный дескриптор `Graph`. См.
[Построение графа в коде](/ru/guide/build-a-graph) и [Справочник](/reference/)
— там полные интерфейсы `GvGraphBuilder`/`GvNode`/`GvEdge`.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Низкоуровневый помощник вставки рёбер, на котором основан
`GvGraphBuilder.addEdge` — экспортируется напрямую для вызывающих, которые
работают с внутренними ссылками `Node`/`Edge` (например, с рёбрами, добавленными
в граф, возвращённый `parse()`), а не с непрозрачными дескрипторами
`GvNode`/`GvEdge` построителя. Большинству вызывающих следует использовать
`createGraph(...).addEdge(tail, head, attrs?)`.

- **`name`** — ключ ребра; по умолчанию `''` (анонимное). Игнорируется при
  дедупликации в строгом графе, которая сопоставляет только по `(tail, head)`
  (симметрично для неориентированных графов).
- **Возвращает** новое ребро или существующее, если `g` строгий и ребро
  `(tail, head)` уже есть (повторяет `agedge` с `cflag=1`).

См. [Построение графа в коде](/ru/guide/build-a-graph) и
[Справочник](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Возвращает простой, сериализуемый в JSON снимок вычисленной геометрии графа —
позиции узлов, контрольные точки сплайнов рёбер, метки рёбер, ограничивающие
прямоугольники кластеров и общие границы графа — всё в пунктах.

- **`g`** — должен быть уже скомпонован (через `render(g, ...)`, `getDrawOps(g)`
  или `ctx.layout(g, engine)`); вызов `getLayout` для ещё не скомпонованного
  графа выбрасывает исключение, а не молча возвращает нулевую геометрию.
- **`opts.yAxis`** — по умолчанию `'down'`: экранные координаты, начало в
  левом верхнем углу, y растёт вниз, а `bounds` нормализуется к `(0, 0)`.
  `'up'` возвращает родные координаты Graphviz (начало в левом нижнем углу, y
  растёт вверх), а `bounds.x`/`bounds.y` указывают на исходный левый нижний угол.
- **Выбрасывает** `Error` с `code` `ERR_INVALID_STATE`, если `g` не был
  скомпонован; `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` при
  неверных `g` или `opts`. См. [Ошибки и исключения](/ru/guide/errors).

`width`/`height` узлов преобразуются в пункты (внутренняя модель хранит
дюймы); все остальные координаты уже в пунктах. Описание систем координат см. в
разделе [Чтение вычисленной геометрии](/ru/guide/geometry), а полные списки
полей `LayoutSnapshot`, `NodeGeometry`, `EdgeGeometry`, `ClusterGeometry` и
`BoundsGeometry` — в разделе [Типы](/ru/guide/types) и [Справочнике](/reference/).

### `Graph`

Непрозрачный тип-дескриптор, реэкспортируемый из внутренней модели.
Публикуется только *тип* (не изменяемый класс) — используйте его для
аннотации переменной, содержащей `.graph` построителя или результат `parse()`,
но не создавайте его и не обращайтесь к его полям напрямую; для чтения
состояния используйте построитель, `getLayout` или `getDrawOps`.
[Справочник](/reference/).

## `@knowvah/dot-engine/render`

Вывод в нескольких форматах и прямой доступ к операциям рисования — слой для
рендеринга уже разобранного `parse` или построенного через построитель графа.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Выполняет компоновку и рендерит граф в строку запрошенного формата.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — механизм компоновки (по умолчанию `'dot'`).
- **`opts.inlineImages`** — см. [ниже](#inlineimages).
- **Выбрасывает** `RenderError` при сбое компоновки или рендеринга;
  `InternalError` при баге dot-engine; `TypeError` с `code` при недопустимых
  аргументах (включая незарегистрированный механизм или формат). См.
  [Ошибки и исключения](/ru/guide/errors).

`opts.engine` повторяет параметр `engine` у `renderSvg`; `format` — ось,
которую `renderSvg` не раскрывает (`renderSvg` жёстко привязан к `'svg'`). См.
[Рендеринг в другие форматы](/ru/guide/render-formats) и
[Справочник](/reference/) — там полное объединение `OutputFormat` и форма
`RenderOptions`.

#### `inlineImages`

`RenderOptions.inlineImages` (по умолчанию `false`) встраивает внешние
изображения как URI `data:` вместо передачи исходного `xlink:href="src"` как
есть. Не действует, пока через `setImageResolver` (выше) не зарегистрирован
разрешитель, — а также не действует на форматы, отличные от SVG. Если параметр
не задан, вывод побайтно совпадает с тем, что было до появления этого
параметра.

```ts
import { setImageResolver } from '@knowvah/dot-engine';
import { render } from '@knowvah/dot-engine/render';
import { parse } from '@knowvah/dot-engine';

setImageResolver((src) => {
  // Return the bytes for any src your DOT source references via
  // `image="..."` or an HTML <IMG SRC="...">; null for anything else.
  if (src === 'logo.png') return fetchLogoBytesSync(); // Uint8Array
  return null;
});

const g = parse('digraph { a [image="logo.png" shape=none label=""]; }');
const svg = render(g, 'svg', { inlineImages: true });
// svg now embeds `xlink:href="data:image/png;base64,..."` for the `a` node
// instead of `xlink:href="logo.png"`.
```

Полное руководство, включая разрешение через `fetch` в браузере и из файловой
системы в Node, см. в разделе [Работа с изображениями](/ru/guide/images).

### `renderAsync`

```ts
function renderAsync(
  g:      Graph,
  format: OutputFormat,
  opts?:  AsyncRenderOptions,
): Promise<{ output: string; fontIssues: FontIssue[] }>;

interface AsyncRenderOptions extends RenderOptions {
  imageSizer?: (src: string) => Promise<{ w: number; h: number } | null>;
  imageResolver?: (
    src: string,
  ) => Promise<{ bytes: Uint8Array; mime?: string } | Uint8Array | null>;
  fontTimeoutMs?: number; // default 3000
  fontSet?: FontSetLike;  // default document.fonts when present
}
```

Асинхронный аналог `render`: те же форматы и параметры `engine`/`inlineImages`,
плюс асинхронные хуки изображений для отдельного вызова и предварительная
загрузка шрифтов. Каждый хук изображений выполняется не более одного раза для
каждого различного `src`; выброшенное исключение или отклонение считается
промахом. Вывод для разметочных форматов — неочищенная разметка; см. раздел
«Security» в README.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Выполняет компоновку `g`, рендерит в xdot и возвращает плоский типизированный
массив операций рисования — формы узлов, текстовые фрагменты, цвета и шрифты
как значения размеченного объединения (сужайте по `op.kind` в `switch`) — для
передачи собственному рендереру canvas/WebGL/PDF без обращения к SVG или
строковому кодированию xdot. `opts.engine` по умолчанию равен
`DEFAULT_DRAW_ENGINE` (`'dot'`).

- **Выбрасывает** `ParseError`, если промежуточный вывод xdot не удаётся
  разобрать повторно (баг dot-engine; на практике не ожидается); `RenderError`
  при сбое компоновки или рендеринга; `InternalError` при любом другом баге
  dot-engine; `TypeError` с `code` при недопустимых аргументах. См.
  [Ошибки и исключения](/ru/guide/errors).

Список видов операций и рабочий пример с canvas см. в разделе
[Собственный рендеринг с xdot](/ru/guide/xdot-drawops), а полное объединение
`XdotOp` и формы `Xdot`/`XdotColor` — в разделе [Типы](/ru/guide/types) и
[Справочнике](/reference/).
