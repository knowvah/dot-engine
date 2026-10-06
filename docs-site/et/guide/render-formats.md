---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Renderdamine teistesse vormingutesse

`render` paigutab graafi ja annab tulemuse sõnena soovitud vormingus. See
aktsepteerib mis tahes `Graph`-i, mille on loonud `parse` või `createGraph`.

## Signatuur

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` vaikeväärtus on `'dot'`. Täieliku loendi leiate jaotisest
[Paigutusmootorid](/et/guide/engines).

## Vormingud

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

## Millal mida kasutada

| Vorming | Tüüpiline kasutus |
|---|---|
| `'svg'` | Veebilehtedele lisamine; inimloetav; skaleerub kadudeta |
| `'dot'` | Silumine; paigutuse säilimisega edasi andmine teistele Graphvizi tööriistadele |
| `'xdot'` | Oma renderdajale andmine `getDrawOps` kaudu |
| `'json'` | Masinloetavad graafiandmed tööriistadele või kontrollimiseks |
| `'plain'` | Kerge geomeetriaväljund; skriptides lihtne parsida |
| `'plain-ext'` | Nagu `'plain'`, lisaks portide koordinaadid servadel |
| `'imap'` | Serveripoolne klõpsatav pildikaart `<img>`-siltide jaoks |
| `'cmapx'` | Kliendipoolne `<map>`-element `<img>`-siltide jaoks |

## Näited

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

## Teise mootori kasutamine

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Seos funktsiooniga `renderSvg`

`renderSvg(dot, engine)` on mugavusfunktsioon, mis kutsub `parse` ja `render`
ühe sammuga ning piirdub SVG-väljundiga. Kasutage otse `render`-it, kui vajate
muud vormingut kui SVG või kui teil on juba olemas `Graph`-objekt.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
