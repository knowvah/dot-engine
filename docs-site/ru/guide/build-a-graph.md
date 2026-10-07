---
sourceHash: e65b96269cc394feac60d63c38c8f4ced8058d06a593f90fd14ed9606f9a6efa
---
# Построение графа в коде

`createGraph` строит граф в памяти без написания исходного кода DOT. Используйте его,
когда структура графа берётся из модели данных вашего приложения, а не из статической
строки DOT.

## Базовое использование

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });

const a = b.addNode('a', { shape: 'box', label: 'Start' });
const c = b.addNode('c', { label: 'End' });

b.addEdge(a, c, { label: 'goes to' });
// Nodes can also be referenced by name string:
b.addEdge('a', 'c', { style: 'dashed' });

const svg = render(b.graph, 'svg');
```

`createGraph` возвращает `GvGraphBuilder`. Его свойство `.graph` — непрозрачный объект
`Graph`, который принимают `render`, `getLayout` и `getDrawOps`.

## Параметры

```ts
createGraph(opts?: {
  directed?: boolean;  // default true
  strict?:   boolean;  // default false — strict graph forbids multi-edges
  name?:     string;   // graph name, default ''
}): GvGraphBuilder
```

## Методы построителя

| Метод | Описание |
|---|---|
| `addNode(name, attrs?)` | Добавить узел; возвращает дескриптор `GvNode` |
| `addEdge(tail, head, attrs?)` | Добавить ребро; `tail`/`head` может быть дескриптором `GvNode` или строкой с именем |
| `addSubgraph(name, attrs?)` | Добавить именованный подграф; возвращает вложенный `GvGraphBuilder` |
| `setAttr(k, v)` | Задать атрибут уровня графа |
| `getAttr(k)` | Прочитать атрибут уровня графа |
| `.graph` | Нижележащий `Graph` (непрозрачный дескриптор для компоновки/рендеринга) |

## Атрибуты

Передавайте пары «ключ/значение» атрибутов DOT как обычные объекты:

```ts
b.addNode('server', { shape: 'cylinder', fillcolor: '#d0e8ff', style: 'filled' });
b.setAttr('rankdir', 'LR');
```

Принимается любой допустимый атрибут DOT; @knowvah/dot-engine передаёт их механизму
компоновки без изменений.

## Подграфы

`addSubgraph` возвращает построитель, ограниченный областью подграфа. Узлы, добавленные
в подграф, также являются членами корневого графа:

```ts
const b = createGraph({ directed: true, name: 'pipeline' });

const cluster = b.addSubgraph('cluster_build', { label: 'CI', style: 'filled' });
cluster.addNode('compile');
cluster.addNode('test');
cluster.addEdge('compile', 'test');

b.addNode('deploy');
b.addEdge('test', 'deploy');

const svg = render(b.graph, 'svg');
```

## Сравнение с `parse`

```ts
// DOT string — convenient for static graphs
import { parse, render } from '@knowvah/dot-engine';
const g = parse('digraph { a -> b }');
const svg = render(g, 'svg');

// Builder — convenient when graph structure comes from code
import { createGraph, render } from '@knowvah/dot-engine';
const b = createGraph();
b.addEdge('a', 'b');
const svg2 = render(b.graph, 'svg');
```

И `parse`, и `createGraph` создают `Graph`, который одинаково можно передавать в
`render`, `getLayout` и `getDrawOps`.
