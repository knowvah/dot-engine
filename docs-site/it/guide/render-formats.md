---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Rendering in altri formati

`render` calcola il layout di un grafo ed emette una stringa nel formato
richiesto. Accetta qualsiasi `Graph` prodotto da `parse` o `createGraph`.

## Firma

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` vale `'dot'` per impostazione predefinita. Per l'elenco completo vedi
[Motori di layout](/it/guide/engines).

## Formati

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

## Quando usare ciascun formato

| Formato | Uso tipico |
|---|---|
| `'svg'` | Da incorporare nelle pagine web; leggibile; scala senza perdita di qualità |
| `'dot'` | Debug; da passare ad altri strumenti Graphviz mantenendo il layout |
| `'xdot'` | Da passare a un renderer personalizzato tramite `getDrawOps` |
| `'json'` | Dati del grafo leggibili da macchina, per strumenti o ispezione |
| `'plain'` | Output leggero della geometria; facile da analizzare negli script |
| `'plain-ext'` | Come `'plain'`, con in più le coordinate delle porte sugli archi |
| `'imap'` | Mappa immagine lato server cliccabile per i tag `<img>` |
| `'cmapx'` | Elemento `<map>` lato client per i tag `<img>` |

## Esempi

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

## Usare un motore diverso

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Rapporto con `renderSvg`

`renderSvg(dot, engine)` è un wrapper di comodo che chiama `parse` + `render`
in un solo passo ed è limitato all'output SVG. Usa direttamente `render` quando
ti serve un formato diverso da SVG o quando hai già in mano un oggetto `Graph`.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
