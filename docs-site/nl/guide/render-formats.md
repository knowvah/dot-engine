---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Renderen naar andere formaten

`render` legt een graaf uit en geeft een string terug in het gevraagde formaat.
De functie accepteert elke `Graph` die door `parse` of `createGraph` is
geproduceerd.

## Signatuur

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` heeft als standaardwaarde `'dot'`. Zie
[Lay-out-engines](/nl/guide/engines) voor de volledige lijst.

## Formaten

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

## Wanneer u welk formaat gebruikt

| Formaat | Typisch gebruik |
|---|---|
| `'svg'` | Insluiten in webpagina's; leesbaar voor mensen; schaalt zonder verlies |
| `'dot'` | Debuggen; opnieuw aanbieden aan andere graphviz-tools met behoud van de lay-out |
| `'xdot'` | Aanbieden aan een eigen renderer via `getDrawOps` |
| `'json'` | Machineleesbare graafgegevens voor tooling of inspectie |
| `'plain'` | Lichte geometrie-uitvoer; eenvoudig te parsen in scripts |
| `'plain-ext'` | Zoals `'plain'`, plus poortcoördinaten op kanten |
| `'imap'` | Server-side klikbare afbeeldingskaart voor `<img>`-tags |
| `'cmapx'` | Client-side `<map>`-element voor `<img>`-tags |

## Voorbeelden

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

## Een andere engine gebruiken

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Verband met `renderSvg`

`renderSvg(dot, engine)` is een gemaksomhulling die `parse` + `render` in één
stap aanroept en beperkt is tot SVG-uitvoer. Gebruik `render` rechtstreeks als u
een ander formaat dan SVG nodig hebt of als u al een `Graph`-object bezit.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
