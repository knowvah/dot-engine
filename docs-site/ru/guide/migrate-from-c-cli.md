---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Миграция с утилиты командной строки `dot`

Бинарники `dot`/`neato`/`fdp`/... на C читают файл `.dot` (или stdin) и пишут
отрендеренный файл (или stdout). У @knowvah/dot-engine нет файловой системы:
он принимает на вход **строку** DOT и возвращает отрендеренную **строку** (или,
с `getLayout`, обычный JavaScript-объект с геометрией вместо строки, которую
нужно разбирать).

```bash
dot -Kneato -Tsvg input.dot -o output.svg
```

```ts
import { renderSvg } from '@knowvah/dot-engine';
import { readFileSync, writeFileSync } from 'node:fs';

const dot = readFileSync('input.dot', 'utf8');
const svg = renderSvg(dot, 'neato');
writeFileSync('output.svg', svg);
```

Чтение и запись файлов в примере выше — это ваш код, а не библиотеки:
@knowvah/dot-engine никогда не обращается к диску. Именно поэтому он работает без
изменений во вкладке браузера, где нет никакого `input.dot` для чтения.

## `-K<engine>` — механизм компоновки

`-K` выбирает механизм компоновки; @knowvah/dot-engine принимает то же имя в
качестве аргумента `engine` для `renderSvg` или поля `opts.engine` для `render`.
Портированы все восемь механизмов:

| Значение `-K` | Строка `engine` в @knowvah/dot-engine |
|---|---|
| `-Kdot` | `'dot'` (также значение по умолчанию для `render`, если `engine` не указан) |
| `-Kneato` | `'neato'` |
| `-Kfdp` | `'fdp'` |
| `-Ksfdp` | `'sfdp'` |
| `-Kcirco` | `'circo'` |
| `-Ktwopi` | `'twopi'` |
| `-Kosage` | `'osage'` |
| `-Kpatchwork` | `'patchwork'` |

```ts
renderSvg(dot, 'neato');
render(g, 'svg', { engine: 'neato' });
```

Что делает каждый механизм и к какому классу соответствия он относится, см. в
разделе [Механизмы компоновки](/ru/guide/engines).

## `-T<format>` — формат вывода

`renderSvg` работает только с SVG; для всего остального используйте
`render(g, format, opts?)`. Объединение `OutputFormat` в @knowvah/dot-engine
охватывает следующие цели `-T`:

| Значение `-T` | Строка `format` в @knowvah/dot-engine | Примечания |
|---|---|---|
| `-Tsvg` | `'svg'` | также единственный вывод `renderSvg` |
| `-Tdot` | `'dot'` | исходный код DOT с добавленными атрибутами компоновки (`pos`, `bb`, ...) |
| `-Txdot` | `'xdot'` | DOT + инструкции xdot `_draw_`/`_ldraw_` |
| `-Tjson` | `'json'` | полный граф в виде JSON |
| `-Tplain` | `'plain'` | геометрия узлов и рёбер, разделённая пробельными символами |
| `-Tplain-ext` | `'plain-ext'` | `plain` плюс координаты портов у рёбер |
| `-Timap` | `'imap'` | серверная HTML-карта-изображение |
| `-Tcmapx` | `'cmapx'` | клиентский HTML-элемент `<map>` |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Не поддерживаются:** растровые форматы (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps`, а также графические/интерактивные бэкенды. Это
намеренная граница области применения — полный список того, что не входит в
цели проекта, см. в разделе [Известные расхождения](/ru/divergences). Если вам
нужен растр, отрендерите в `'svg'` и конвертируйте дальше по цепочке
(headless-браузер, `resvg` или аналог).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — атрибуты

Глобальные флаги атрибутов в CLI задают значение по умолчанию для каждого
графа, узла или ребра из командной строки. У @knowvah/dot-engine нет флагов
командной строки — задавайте те же атрибуты прямо в исходном коде DOT или через
API построителя, если вы строите граф в коде:

```bash
dot -Gsize=6,6 -Nshape=box -Ecolor=blue -Tsvg input.dot
```

```ts
// DOT source — put the defaults in a top-level attribute statement
const dot = `
  digraph {
    graph [size="6,6"];
    node  [shape=box];
    edge  [color=blue];
    a -> b;
  }
`;
const svg = renderSvg(dot, 'dot');
```

```ts
// Builder — set per-node/per-edge attrs where you create each one
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.setAttr('size', '6,6');
b.addNode('a', { shape: 'box' });
b.addNode('b', { shape: 'box' });
b.addEdge('a', 'b', { color: 'blue' });
const svg = render(b.graph, 'svg');
```

Полный API построителя см. в разделе [Построение графа в коде](/ru/guide/build-a-graph).

## Геометрия, которую CLI напрямую не отдаёт

`-Tplain` существует именно для того, чтобы скрипты могли вытаскивать координаты
узлов и рёбер из текстового вывода. @knowvah/dot-engine обходится без этого
обходного пути: вызовите `getLayout(g)` после `render`, и вы получите типизированный,
сериализуемый в JSON снимок позиции каждого узла, сплайна каждого ребра и общего
ограничивающего прямоугольника — без текстового формата, который нужно
разбирать.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes[0] → { name: 'a', x, y, width, height }
```

Полную форму снимка и параметр `yAxis` (у нативного graphviz ось y направлена
вверх, в браузерах — вниз) см. в разделе
[Чтение вычисленной геометрии](/ru/guide/geometry).

## Шрифты и изображения: CLI читает вашу файловую систему, @knowvah/dot-engine — нет

Нативный `dot` измеряет текст теми шрифтами, которые установлены на машине, и
разрешает атрибуты `image="..."`, читая файлы относительно рабочего каталога. У
@knowvah/dot-engine нет доступа к файловой системе, поэтому и то и другое
передаётся приложением-хостом, а не читается с диска:

- **Измерение текста** — `setTextMeasurer` устанавливает `TextMeasurer`;
  если вы его не задали, библиотека автоматически выбирает разумное значение по
  умолчанию (canvas браузера или детерминированную метрическую модель в Node).
  См. [Измерение текста](/ru/guide/text-measurement).
- **Изображения** — `setImageSizer` (и `setImageResolver` для встраивания)
  позволяют самостоятельно передать собственные размеры изображений и данные
  изображений, поскольку @knowvah/dot-engine не может обратиться к файлу от вашего
  имени. См. [Работа с изображениями](/ru/guide/images).

## См. также

- [Механизмы компоновки](/ru/guide/engines)
- [Рендеринг в другие форматы](/ru/guide/render-formats)
- [Чтение вычисленной геометрии](/ru/guide/geometry)
- [Известные расхождения](/ru/divergences)
- [Начало работы](/ru/guide/getting-started)
