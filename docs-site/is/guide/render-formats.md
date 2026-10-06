---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Teikna á önnur snið

`render` raðar grafi upp og skilar streng á umbeðnu sniði. Það tekur við hvaða
`Graph` sem er, hvort sem það varð til með `parse` eða `createGraph`.

## Undirskrift

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` er sjálfgefið `'dot'`. Sjá [Uppsetningarvélar](/is/guide/engines) fyrir
allan listann.

## Snið

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

## Hvenær á að nota hvert snið

| Snið | Dæmigerð notkun |
|---|---|
| `'svg'` | Fella inn í vefsíður; læsilegt fólki; skalast án taps |
| `'dot'` | Villuleit; mata önnur graphviz-verkfæri með uppsetninguna varðveitta |
| `'xdot'` | Mata eigin teiknivél gegnum `getDrawOps` |
| `'json'` | Véllæsileg gögn um grafið fyrir verkfæri eða skoðun |
| `'plain'` | Létt rúmfræðiúttak; auðvelt að þátta í skriftum |
| `'plain-ext'` | Eins og `'plain'`, auk hnita porta á leggjum |
| `'imap'` | Myndakort á þjónshlið með smellanlegum svæðum fyrir `<img>`-tög |
| `'cmapx'` | `<map>`-stak á biðlarahlið fyrir `<img>`-tög |

## Dæmi

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

## Önnur uppsetningarvél

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Tengsl við `renderSvg`

`renderSvg(dot, engine)` er hentugt umbúðafall sem kallar á `parse` + `render`
í einu skrefi og býður aðeins SVG-úttak. Notaðu `render` beint þegar þú þarft
snið sem er ekki SVG eða þegar þú ert þegar með `Graph`-hlut í höndunum.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
