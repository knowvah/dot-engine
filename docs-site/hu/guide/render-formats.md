---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Renderelés más formátumokba

A `render` elrendez egy gráfot, és a kért formátumban sztringet állít elő. Bármely
`Graph`-ot elfogad, amelyet a `parse` vagy a `createGraph` hozott létre.

## Szignatúra

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

Az `engine` alapértéke `'dot'`. A teljes listát lásd az
[Elrendezésmotorok](/hu/guide/engines) oldalon.

## Formátumok

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

## Melyiket mikor használjuk

| Formátum | Tipikus felhasználás |
|---|---|
| `'svg'` | Weboldalakba ágyazás; ember számára olvasható; veszteség nélkül skálázható |
| `'dot'` | Hibakeresés; a megőrzött elrendezéssel továbbadható más Graphviz-eszközöknek |
| `'xdot'` | Egyéni renderelőnek átadva a `getDrawOps` segítségével |
| `'json'` | Géppel olvasható gráfadatok eszközökhöz vagy vizsgálathoz |
| `'plain'` | Könnyű geometriai kimenet; szkriptekben egyszerű feldolgozni |
| `'plain-ext'` | Mint a `'plain'`, de az éleknél a portkoordinátákat is tartalmazza |
| `'imap'` | Kiszolgálóoldali, kattintható képtérkép `<img>` címkékhez |
| `'cmapx'` | Kliensoldali `<map>` elem `<img>` címkékhez |

## Példák

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

## Másik motor használata

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Kapcsolata a `renderSvg`-vel

A `renderSvg(dot, engine)` kényelmi burkoló, amely egy lépésben hívja a `parse`-t
és a `render`-t, és csak SVG-kimenetre korlátozódik. Közvetlenül a `render`-t
használja, ha nem SVG formátumra van szüksége, vagy ha már van `Graph`
objektuma.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
