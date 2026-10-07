---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Diğer biçimlere işleme

`render`, bir grafı yerleştirir ve istenen biçimde bir dize üretir. `parse` veya
`createGraph` ile oluşturulmuş her `Graph` nesnesini kabul eder.

## İmza

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` varsayılan olarak `'dot'` değerini alır. Tam liste için
[Yerleşim motorları](/tr/guide/engines) sayfasına bakın.

## Biçimler

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

## Hangisi ne zaman kullanılır

| Biçim | Tipik kullanım |
|---|---|
| `'svg'` | Web sayfalarına gömme; insan tarafından okunabilir; kayıpsız ölçeklenir |
| `'dot'` | Hata ayıklama; yerleşimi korunmuş hâlde diğer graphviz araçlarına yeniden besleme |
| `'xdot'` | `getDrawOps` aracılığıyla özel bir işleyiciye besleme |
| `'json'` | Araçlar veya inceleme için makine tarafından okunabilir graf verisi |
| `'plain'` | Hafif geometri çıktısı; betiklerde ayrıştırması kolay |
| `'plain-ext'` | `'plain'` gibi, ayrıca kenarlardaki port koordinatları |
| `'imap'` | `<img>` etiketleri için sunucu taraflı tıklanabilir görsel haritası |
| `'cmapx'` | `<img>` etiketleri için istemci taraflı `<map>` öğesi |

## Örnekler

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

## Farklı bir motor kullanma

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## `renderSvg` ile ilişkisi

`renderSvg(dot, engine)`, `parse` + `render` çağrılarını tek adımda yapan,
yalnızca SVG çıktısıyla sınırlı bir kolaylık sarmalayıcısıdır. SVG dışında bir
biçime ihtiyaç duyduğunuzda ya da elinizde zaten bir `Graph` nesnesi
olduğunda doğrudan `render` kullanın.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
