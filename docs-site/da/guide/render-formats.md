---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Render til andre formater

`render` lægger en graf ud og udsender en streng i det ønskede format. Den
accepterer enhver `Graph`, som er skabt af `parse` eller `createGraph`.

## Signatur

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` er som standard `'dot'`. Se [Layoutmotorer](/da/guide/engines) for den
fulde liste.

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

## Hvornår du bruger hvilket

| Format | Typisk anvendelse |
|---|---|
| `'svg'` | Indlejres på websider; menneskelæsbart; skalerer uden tab |
| `'dot'` | Fejlfinding; kan sendes videre til andre graphviz-værktøjer med layoutet bevaret |
| `'xdot'` | Sendes til en egen renderer via `getDrawOps` |
| `'json'` | Maskinlæsbare grafdata til værktøjer eller inspektion |
| `'plain'` | Letvægts-geometriudskrift; nem at parse i scripts |
| `'plain-ext'` | Som `'plain'`, plus portkoordinater på kanter |
| `'imap'` | Server-side klikbart billedkort til `<img>`-tags |
| `'cmapx'` | Klient-side `<map>`-element til `<img>`-tags |

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

## Brug af en anden motor

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Forhold til `renderSvg`

`renderSvg(dot, engine)` er en bekvemmelighedsindpakning, der kalder `parse` +
`render` i ét trin og er begrænset til SVG-udskrift. Brug `render` direkte, når
du har brug for et andet format end SVG, eller når du allerede har et
`Graph`-objekt.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
