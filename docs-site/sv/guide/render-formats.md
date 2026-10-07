---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Rendera till andra format

`render` lägger ut en graf och returnerar en sträng i det begärda formatet. Den
accepterar vilken `Graph` som helst som skapats med `parse` eller `createGraph`.

## Signatur

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` är som standard `'dot'`. Se [Layoutmotorer](/sv/guide/engines) för hela
listan.

## Format

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

## När du använder vilket

| Format | Typisk användning |
|---|---|
| `'svg'` | Bädda in på webbsidor; läsbart för människor; skalar utan förlust |
| `'dot'` | Felsökning; mata vidare till andra graphviz-verktyg med layouten bevarad |
| `'xdot'` | Mata en egen renderare via `getDrawOps` |
| `'json'` | Maskinläsbar grafdata för verktyg eller inspektion |
| `'plain'` | Lättviktig geometriutdata; enkel att tolka i skript |
| `'plain-ext'` | Som `'plain'`, plus portkoordinater på kanter |
| `'imap'` | Serversidig klickbar bildkarta för `<img>`-taggar |
| `'cmapx'` | Klientsidigt `<map>`-element för `<img>`-taggar |

## Exempel

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

## Använda en annan motor

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Förhållande till `renderSvg`

`renderSvg(dot, engine)` är en bekvämlighetsfunktion som anropar `parse` +
`render` i ett enda steg och är begränsad till SVG-utdata. Använd `render`
direkt när du behöver ett annat format än SVG eller när du redan har ett
`Graph`-objekt.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
