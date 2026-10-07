---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Рендеринг в другие форматы

`render` выполняет компоновку графа и возвращает строку в запрошенном формате.
Функция принимает любой `Graph`, созданный с помощью `parse` или `createGraph`.

## Сигнатура

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` по умолчанию равен `'dot'`. Полный список см. в разделе
[Механизмы компоновки](/ru/guide/engines).

## Форматы

```ts
type OutputFormat =
  | 'svg'        // SVG markup
  | 'dot'        // DOT source with layout attributes added
  | 'xdot'       // DOT + xdot draw instructions (_draw_ attributes)
  | 'json'       // Full graph as JSON (graphviz json format)
  | 'plain'      // Whitespace-separated node/edge geometry (plain text)
  | 'plain-ext'  // plain, extended with port info
  | 'imap'       // HTML image-map (server-side; clickable areas)
  | 'cmapx';     // HTML client-side image-map
```

## Когда какой формат использовать

| Формат | Типичное применение |
|---|---|
| `'svg'` | Встраивание в веб-страницы; читаем человеком; масштабируется без потерь |
| `'dot'` | Отладка; повторная передача другим инструментам graphviz с сохранением компоновки |
| `'xdot'` | Передача собственному рендереру через `getDrawOps` |
| `'json'` | Машиночитаемые данные графа для инструментов или проверки |
| `'plain'` | Компактный вывод геометрии; легко разбирать в скриптах |
| `'plain-ext'` | Как `'plain'`, плюс координаты портов у рёбер |
| `'imap'` | Серверная карта-изображение с активными областями для тегов `<img>` |
| `'cmapx'` | Клиентский элемент `<map>` для тегов `<img>` |

## Примеры

```ts
import { parse, render } from '@knowvah/dot-engine';

const g = parse(`
  digraph {
    rankdir = LR;
    a [label="Node A"];
    b [label="Node B"];
    a -> b [label="edge"];
  }
`);

// SVG — most common output
const svg = render(g, 'svg');

// Annotated DOT (layout coordinates embedded)
const laid = render(g, 'dot');

// JSON for inspection
const json = render(g, 'json');

// Plain-text geometry
const plain = render(g, 'plain');
```

## Использование другого механизма компоновки

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Связь с `renderSvg`

`renderSvg(dot, engine)` — удобная обёртка, которая вызывает `parse` и `render`
за один шаг и поддерживает только вывод в SVG. Используйте `render`
напрямую, когда нужен формат, отличный от SVG, или когда у вас уже есть объект
`Graph`.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
