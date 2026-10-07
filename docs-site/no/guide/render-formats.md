---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Render til andre formater

`render` legger ut en graf og gir tilbake en streng i det formatet du ber om.
Den godtar enhver `Graph` som er laget av `parse` eller `createGraph`.

## Signatur

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` er som standard `'dot'`. Se [Layoutmotorer](/no/guide/engines) for den
fullstendige listen.

## Formater

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

## Når du bruker hvilket

| Format | Typisk bruk |
|---|---|
| `'svg'` | Innebygging på nettsider; lesbart for mennesker; skalerer uten tap |
| `'dot'` | Feilsøking; send videre til andre graphviz-verktøy med layouten bevart |
| `'xdot'` | Mat en egen renderer via `getDrawOps` |
| `'json'` | Maskinlesbare grafdata for verktøy eller inspeksjon |
| `'plain'` | Lettvekts geometriutdata; enkelt å tolke i skript |
| `'plain-ext'` | Som `'plain'`, pluss portkoordinater på kantene |
| `'imap'` | Tjenerside klikkbart bildekart for `<img>`-tagger |
| `'cmapx'` | Klientside `<map>`-element for `<img>`-tagger |

## Eksempler

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

## Bruke en annen motor

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Forholdet til `renderSvg`

`renderSvg(dot, engine)` er en praktisk innpakning som kaller `parse` + `render`
i ett steg og er begrenset til SVG-utdata. Bruk `render` direkte når du trenger
et format som ikke er SVG, eller når du allerede har et `Graph`-objekt.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
