---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# 渲染为其他格式

`render` 会对图进行布局，并以所请求的格式输出字符串。它接受由 `parse` 或 `createGraph` 生成的任意 `Graph`。

## 签名

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` 默认为 `'dot'`。完整列表参见[布局引擎](/zh-cn/guide/engines)。

## 格式

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

## 各格式的适用场景

| 格式 | 典型用途 |
|---|---|
| `'svg'` | 嵌入网页；人类可读；可无损缩放 |
| `'dot'` | 调试；在保留布局的前提下交给其他 Graphviz 工具 |
| `'xdot'` | 通过 `getDrawOps` 交给自定义渲染器 |
| `'json'` | 供工具或检查使用的机器可读图数据 |
| `'plain'` | 轻量的几何输出；便于在脚本中解析 |
| `'plain-ext'` | 与 `'plain'` 类似，另外在边上附带端口坐标 |
| `'imap'` | 用于 `<img>` 标签的服务器端可点击图像映射 |
| `'cmapx'` | 用于 `<img>` 标签的客户端 `<map>` 元素 |

## 示例

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

## 使用其他引擎

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## 与 `renderSvg` 的关系

`renderSvg(dot, engine)` 是一个便捷封装，一步完成 `parse` + `render`，且仅限于 SVG 输出。需要非 SVG 格式，或已持有 `Graph` 对象时，请直接使用 `render`。

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
