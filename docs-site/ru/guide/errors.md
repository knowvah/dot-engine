---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Ошибки и исключения

dot-engine выбрасывает ошибки двух видов. То, какой вид вы перехватываете,
показывает, кому нужно что-то менять.

## Два семейства, одно правило

| Семейство | Как распознать | Значение | Кто действует |
|--------|---------------------|---------|----------|
| Сбой dot-engine | `err instanceof DotEngineError` | dot-engine не справился с этим входом: некорректный DOT, фатальная ошибка, о которой сообщил бы и сам Graphviz, неподдерживаемая возможность Graphviz или баг dot-engine | Автор DOT либо отчёт об ошибке |
| Ошибка использования | стандартные `TypeError` / `RangeError` / `Error` с `err.code`, начинающимся с `ERR_` | Вызов был неверным: неправильный тип аргумента, неизвестное имя механизма или формата, неверный порядок вызовов | Вызывающий код |

Ветвитесь по `.code`, а не по тексту сообщения. Сообщения могут меняться между
релизами; коды стабильны.

Ошибки использования не являются `DotEngineError` и не реализуют `GvError`. Их
`name` остаётся `TypeError`, `RangeError` или `Error`, как в Node.js.

## Справочник по классам

Все четыре класса ниже расширяют `DotEngineError` и реализуют форму `GvError`
(`type`, `code`, `message`, `friendlyMessage`, необязательные `location` и
`expected`).

### `DotEngineError` (абстрактный)

Общий базовый класс. `instanceof DotEngineError` истинно для каждой ошибки,
которую dot-engine вызывает из-за своего входа. Напрямую его создать нельзя.
`type`, `code` и `friendlyMessage` определяются подклассами.

### `ParseError`

| Пункт | Значение |
|------|-------|
| Выбрасывается, когда | Исходный код DOT некорректен или использует неверный оператор ребра для данного вида графа |
| `type` | `syntax` |
| Коды | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Поля | `location` (`{ line, column, offset? }`), `expected` (ожидания парсера; только для `SYNTAX_*`), геттеры `line` и `column` |
| Действие вызывающего | Исправьте исходный код DOT. Покажите автору `location` и `friendlyMessage` |

`GENERIC_ERROR` у `ParseError` означает, что исходный код вложен так глубоко,
что у парсера закончился стек.

### `HtmlParseError`

| Пункт | Значение |
|------|-------|
| Выбрасывается, когда | Сегодня вызывающему не попадает никогда (см. ниже) |
| `type` | `semantic` |
| Коды | `HTML_PARSE_ERROR` |
| Поля | `tag` (проблемный токен). Без `location` и `expected` |
| Действие вызывающего | Нет. Чтобы найти некорректную метку, сравните отрендеренный вывод с ожидаемым |

Парсер HTML-подобных меток выбрасывает `HtmlParseError` при неизвестном
элементе, некорректном атрибуте или неуместных `<TABLE>`, `<HR>` или `<VR>`.
Этап компоновки перехватывает его и оставляет метку без содержимого, как это
делает Graphviz: граф всё равно отрисовывается, с пустой меткой. Ни одна
публичная функция его не пробрасывает.

`HtmlParseError` не экспортируется из корня пакета. Если одна из таких ошибок
всё же до вас дойдёт, её определяет
`err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'`.

### `RenderError`

| Пункт | Значение |
|------|-------|
| Выбрасывается, когда | Компоновка или рендеринг завершаются сбоем, о котором сообщил бы и сам Graphviz, граф называет недоступный механизм компоновки или граф использует возможность Graphviz, не портированную в dot-engine |
| `type` | `render` для `RENDER_ERROR`; `semantic` для `UNKNOWN_LAYOUT` и `UNSUPPORTED_FEATURE` |
| Коды | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Поля | `cause`, если сбой обернул другую ошибку. Без `location` |
| Действие вызывающего | `RENDER_ERROR`: измените граф. `UNKNOWN_LAYOUT`: исправьте атрибут `layout=`. `UNSUPPORTED_FEATURE`: избегайте этой возможности (например, sfdp с `rotation=45`; см. [таблицу](#unsupported-feature-reference)) |

### `InternalError`

| Пункт | Значение |
|------|-------|
| Выбрасывается, когда | Внутри dot-engine не выполняется проверка или инвариант, либо ошибка, не относящаяся к dot-engine, вырывается из конвейера компоновки или рендеринга |
| `type` | `render` |
| Коды | `INTERNAL_ERROR` |
| Поля | `cause` (исходная ошибка, если она была обёрнута) |
| Действие вызывающего | Сообщите об ошибке, приложив исходный код DOT, который её вызвал |

Ничто из того, что может изменить автор DOT, не позволит надёжно избежать
`InternalError`.

## Справочник по кодам

### `GvErrorCode`

| Код | Класс | `type` | Значение | Типичная причина | Действие вызывающего | Вызывается из |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Неожиданный токен | Опечатка, пропущенные `;` или `}` | Исправьте DOT в позиции `location` | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | Исходный код оборвался посреди оператора | Незакрытые `{`, `[` или строка | Исправьте DOT в позиции `location` | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` в неориентированном графе | `graph { a -> b }` | Используйте `--` | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` в орграфе | `digraph { a -- b }` | Используйте `->` | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Исходный код вложен слишком глубоко для разбора | Патологически вложенные подграфы | Сделайте DOT плоским | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Некорректная HTML-подобная метка | Неизвестный элемент, неверный атрибут | Нет: метка отрисовывается пустой | Нет (перехватывается внутри) |
| `RENDER_ERROR` | `RenderError` | `render` | Фатальная ошибка компоновки или рендеринга, о которой сообщил бы и Graphviz | Некорректный вход для этапа компоновки | Измените граф | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | Атрибут `layout=` графа называет незарегистрированный механизм | `layout="foo"` | Исправьте атрибут | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | Граф запрашивает возможность Graphviz, не портированную в dot-engine | sfdp с `rotation=45` | Избегайте этой возможности | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | Баг dot-engine | Не выполнившаяся проверка, чужое исключение | Сообщите об ошибке | `renderSvg`, `render`, `getDrawOps`, методы построителя, `GvcContext.layout` (без обёртки) |

### `UsageErrorCode`

| Код | Класс | Значение | Типичная причина | Действие вызывающего | Вызывается из |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Неверный тип, `null` или отсутствующий обязательный аргумент | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Исправьте вызов | Каждая публичная функция, принимающая аргументы |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Верный тип, неизвестное значение | Незарегистрированное имя механизма или формата; `getLayout(g, { yAxis: 'other' })` | Используйте зарегистрированное имя или допустимое значение | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Числовой аргумент вне допустимого диапазона | Зарезервирован | Исправьте вызов | Сегодня ни одна публичная функция его не вызывает |
| `ERR_INVALID_STATE` | `Error` | Вызов сделан в неверном состоянии | `getLayout` до компоновки | Сначала выполните компоновку (`render(g, ...)` или `ctx.layout`) | `getLayout` |

Незарегистрированный аргумент механизма отклоняется, даже если исходный код DOT
задаёт допустимый атрибут `layout=`. Аргумент проверяется первым.

## Справочник по `UNSUPPORTED_FEATURE` {#unsupported-feature-reference}

Каждое значение атрибута ниже заставляет компоновку выбросить `RenderError` с
кодом `UNSUPPORTED_FEATURE` там, где нативный Graphviz выполнил бы алгоритм,
не портированный в dot-engine. Альтернативой было бы отрисовать компоновку,
отличающуюся от Graphviz, ничего об этом не сказав. Проверка срабатывает только
тогда, когда выполняется условие из столбца «Срабатывает, когда»; тот же
атрибут в других случаях отрисовывается как обычно. Чтобы избежать ошибки,
удалите атрибут или замените его поддерживаемым значением.

| Механизм | Атрибут и значение | Срабатывает, когда | Необходимая возможность Graphviz |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | Всегда (после того как в графе 2+ узлов и `maxiter` не отрицателен) | Иерархическая стресс-мажоризация (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Только когда Graphviz построил бы ограничения: `diredgeconstraints` истинно или `hier*`, `overlap=ipsep`, либо в графе есть кластер верхнего уровня. Без ограничений он работает как стресс-мажоризация, как в Graphviz | Мажоризация с ограничениями (`stress_majorization_cola`) |
| neato | `start=self` | `mode` равен `major` (по умолчанию) или `ipsep` | Умная инициализация (`smart_ini`). При `mode=KK` или `mode=sgd` один раз за рендер пишет в лог `start=0 not supported with mode=self - ignored`, как Graphviz |
| neato | `model=subset` | `mode` равен `major` или `KK` | Модель расстояний subset |
| neato | `model=circuit` | `mode` равен `major`, либо `KK` на связном графе. `KK` на несвязном графе без `pack` и `packmode` пишет предупреждение и использует кратчайшие пути, как Graphviz | Модель расстояний circuit (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (без учёта регистра) | В графе (для twopi — в компоненте; для sfdp — во всём графе или в компоненте) 2+ узлов, и собственный подсчёт перекрытий Graphviz (`countOverlap`, проверяющий многоугольники узлов) больше 0. Узлы, которые лишь касаются по ограничивающему прямоугольнику, срабатывания не вызывают. circo доходит до него только для графа из одной компоненты (при нескольких компонентах Graphviz также игнорирует `overlap`). sfdp доходит до него, только если `overlap` не является режимом prism | Устранение перекрытий методом Вороного (`vAdjust`) |
| fdp | `overlap=` одно из `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | Режим достигается после `N:` попыток силовых итераций, то есть когда эти попытки не устраняют все перекрытия (или `N` равно 0 либо отсутствует). Префикс `N:` допустим, например `3:voronoi` | Соответствующий алгоритм корректировки `removeOverlapWith` |
| fdp | `splines=compound` | Всегда, с кластерами или без | Трассировка рёбер в обход кластеров (`compoundEdges`) |
| sfdp | `smoothing=` что угодно, кроме `none` или `0` | Всегда | `post_process_smoothing` |
| sfdp | `rotation=` любое ненулевое число | Всегда | `rotate()` перед устранением перекрытий |
| sfdp | `label_scheme=1` до `4` | Существует узел с именем `|edgelabel|...`, `overlap` разрешается в режим `prism`, и либо схема равна 3 или 4, либо схема равна 1 или 2, а попыток prism больше 0 (`overlap=prism` со счётчиком, а не `prism0` по умолчанию). Значения больше 4 считаются 0. Обычные метки рёбер срабатывания не вызывают | Обработка узлов меток рёбер (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (также `0`, `false`) | Любой граф хотя бы с одним узлом. Сообщение называет разрешённую схему | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (также `2`) | Любой граф хотя бы с одним узлом. Сообщение называет разрешённую схему | `spring_electrical_embedding_fast` |
| все механизмы | Форма узла, рисуемая особым случаем `round_corners`, который не портирован | Узел использует эту форму. Сообщение: `special shape N not yet ported` | Ветка рисования `round_corners` для этой формы. Это внутренняя защита от номера формы без случая рисования; не известно ни одной именованной формы, которая бы до неё доходила |

У большинства сообщений вид `<attribute>=<value>: <what> is not supported yet`.
Исключения — `smoothing` и `rotation` (в них названа недостающая процедура),
строки fdp и строка про формы, где используются формулировки, приведённые
выше. Ветвитесь по `err.code === 'UNSUPPORTED_FEATURE'`, а не по тексту.

Значения, выбирающие вариант по умолчанию (например, `quadtree=normal`, `true`,
`yes`, `1`), и принимаемые Graphviz значения, которые портированы (например,
`start=regular`, `start=random`, `model=mds`, `mode=KK`, `mode=sgd`,
`overlap=prism`, семейство `scale` и, для neato, twopi, circo и sfdp,
`overlap=oscale`, `vpsc` и режимы `ortho*` / `portho*`), отрисовываются как
обычно.

## Справочник по функциям

«Использование» означает `TypeError` с `ERR_INVALID_ARG_TYPE`, если в строке не
назван другой код.

| Функция | Что может выбросить |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Использование (`dotSource` или `engine` не строка); `TypeError` `ERR_INVALID_ARG_VALUE` (механизм не зарегистрирован); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Использование (`dotSource` или `engine` не строка); `TypeError` `ERR_INVALID_ARG_VALUE` (механизм не зарегистрирован). Больше ничего: каждый сбой из-за входного DOT возвращается в `errors` |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` не строка); `ParseError` |
| `render(g, format, opts?)` | Использование (`g`, `format` или `opts` неверного типа); `TypeError` `ERR_INVALID_ARG_VALUE` (механизм или формат не зарегистрированы); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Использование (`g` или `opts` неверного типа); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` не зарегистрирован); `RenderError`; `ParseError` (промежуточный xdot не удалось разобрать повторно: баг dot-engine); `InternalError` |
| `createGraph(opts?)` и методы построителя (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Использование (неверные типы аргументов, включая значения атрибутов, не являющиеся строками); `InternalError` (модели графа не удалось создать узел или подграф) |
| `addEdge(g, tail, head, name?)` (из `/api`) | Использование (`g`, `tail` или `head` не являются объектами; `name` не строка) |
| `getLayout(g, opts?)` | Использование (`g` или `opts` не объект); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` не равен `'up'` или `'down'`); `Error` `ERR_INVALID_STATE` (граф не скомпонован) |
| `new GvcContext(measurer, options?)` | Использование (у `measurer` нет функции `measure`; `options` не объект) |
| `ctx.register(plugin)` | Использование (не плагин рендерера и не механизм компоновки) |
| `ctx.layout(g, engine)` | Использование (`g` не объект, `engine` не строка); `TypeError` `ERR_INVALID_ARG_VALUE` (механизм не зарегистрирован); `RenderError` `UNKNOWN_LAYOUT`. Сбои механизма пробрасываются без обёртки |
| `ctx.freeLayout(g, engine)` | Использование; `TypeError` `ERR_INVALID_ARG_VALUE` (механизм не зарегистрирован). Сбои механизма пробрасываются без обёртки |
| `ctx.bestRenderer(format)` | Использование (`format` не строка); `TypeError` `ERR_INVALID_ARG_VALUE` (нет рендерера для `format`) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Использование (`ctx` не `GvcContext`, `g` не объект, `format` не строка); `TypeError` `ERR_INVALID_ARG_VALUE` (нет рендерера для `format`). Сбои рендеринга пробрасываются без обёртки |
| `setImageSizer(sizer)` | Использование (не функция и не `null`) |
| `setImageResolver(fn)` | Использование (не функция и не `null`) |
| `setTextMeasurer(measurer)` | Использование (не `TextMeasurer` и не `undefined`) |

### Какие функции оборачивают чужие исключения

| Функции | Поведение при неожиданном исключении (не от dot-engine) |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Оборачивается в `InternalError`; `cause` — исходная ошибка |
| `renderWithContext` и каждый метод `GvcContext` | **Не оборачивается.** Баг механизма доходит до вызывающего как то, что выбросил механизм, например обычный `TypeError` без `code` |

Если вы используете `GvcContext` напрямую, считайте ошибку, не являющуюся ни
`DotEngineError`, ни ошибкой использования, багом dot-engine.

## `tryRenderSvg` или `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| Некорректный DOT или сбой компоновки | Выбрасывает `DotEngineError` | Возвращает `{ errors: [one] }` |
| Неверные аргументы | Выбрасывает ошибку использования | Выбрасывает ошибку использования |
| Значение ошибки | `Error` со стеком и `cause` | Простые данные: `type`, `code`, `message`, `friendlyMessage`, а также `location` / `expected`, если они есть |
| Когда использовать | Сбой должен прервать вызывающий код | Вы ветвитесь по `code` или отправляете ошибку через `postMessage` либо в лог |

`tryRenderSvg` никогда не выбрасывает исключение ни для какого входного DOT. Он
выбрасывает его, только если сами аргументы недопустимы, а это баг в вызывающем
коде. Возвращаемые им объекты ошибок не содержат ни `cause`, ни трассировки
стека.

## Обёрнутые сбои и `cause`

Когда `renderSvg`, `render` или `getDrawOps` перехватывают ошибку, которую
dot-engine не вызывал, они выбрасывают `InternalError`, у которого `cause` —
исходная ошибка. `message` — это исходное сообщение.

`cause` неперечисляемо, поэтому `JSON.stringify(err)` его опускает. При
логировании проходите по цепочке явно (см. последний пример ниже).

## Проверки между бандлами

`instanceof DotEngineError` работает в пределах одной копии библиотеки. Если
могут быть загружены две копии (дублирующиеся бандлы, хост плагинов),
используйте `isGvError(e)`. Он проверяет наличие строковых `type` и `code` и
работает между копиями. Он также принимает простые объекты, возвращаемые
`tryRenderSvg`.

## Примеры

Разделите два семейства:

```ts
import { renderSvg, DotEngineError, ParseError } from '@knowvah/dot-engine';

function renderOrExplain(dot: string): string {
  try {
    return renderSvg(dot, 'dot');
  } catch (err: unknown) {
    if (err instanceof ParseError) {
      const { line, column } = err.location;
      return `DOT error at ${line}:${column}: ${err.friendlyMessage}`;
    }
    if (err instanceof DotEngineError) {
      return `${err.code}: ${err.friendlyMessage}`;
    }
    // A usage error: the call was wrong. Do not swallow it.
    throw err;
  }
}
```

Обработка результата `tryRenderSvg`:

```ts
import { tryRenderSvg } from '@knowvah/dot-engine';

const result = tryRenderSvg('digraph { a ->', 'dot');
if (result.svg !== undefined) {
  console.log(result.svg.length);
} else {
  const [first] = result.errors ?? [];
  console.error(first?.code, first?.location);
}
```

Запись в лог `InternalError` вместе с его причиной:

```ts
import { InternalError } from '@knowvah/dot-engine';

function describeChain(err: unknown): string[] {
  const lines: string[] = [];
  let current: unknown = err;
  while (current instanceof Error) {
    lines.push(`${current.name}: ${current.message}`);
    current = current.cause;
  }
  return lines;
}

export function logFailure(err: unknown): void {
  if (err instanceof InternalError) {
    // Report this: it is a dot-engine bug. `cause` is the original error.
    console.error(describeChain(err).join(' <- '));
  }
}
```

## См. также

- [Справочник API (избранное)](/ru/guide/api) — сигнатура каждой функции.
- [Типы](/ru/guide/types) — формы `GvError` и `RenderResult`.
- [Сгенерированный API (TypeDoc)](/reference/) — полные объединения `GvErrorCode` и `UsageErrorCode`.
