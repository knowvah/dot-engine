---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# In andere Formate rendern

`render` legt einen Graphen aus und gibt eine Zeichenkette im gewünschten Format
zurück. Die Funktion akzeptiert jeden `Graph`, den `parse` oder `createGraph`
erzeugt hat.

## Signatur

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` hat den Standardwert `'dot'`. Die vollständige Liste finden Sie unter
[Layout-Engines](/de/guide/engines).

## Formate

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

## Wann welches Format

| Format | Typischer Einsatz |
|---|---|
| `'svg'` | In Webseiten einbetten; menschenlesbar; verlustfrei skalierbar |
| `'dot'` | Debugging; mit erhaltenem Layout an andere Graphviz-Werkzeuge weiterreichen |
| `'xdot'` | Über `getDrawOps` an einen eigenen Renderer übergeben |
| `'json'` | Maschinenlesbare Graphdaten für Werkzeuge oder zur Inspektion |
| `'plain'` | Schlanke Geometrieausgabe; in Skripten leicht zu parsen |
| `'plain-ext'` | Wie `'plain'`, zusätzlich mit Port-Koordinaten an den Kanten |
| `'imap'` | Serverseitige klickbare Image-Map für `<img>`-Tags |
| `'cmapx'` | Clientseitiges `<map>`-Element für `<img>`-Tags |

## Beispiele

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

## Eine andere Engine verwenden

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Zusammenhang mit `renderSvg`

`renderSvg(dot, engine)` ist ein Komfort-Wrapper, der `parse` und `render` in
einem Schritt aufruft und auf SVG-Ausgabe beschränkt ist. Verwenden Sie
`render` direkt, wenn Sie ein anderes Format als SVG benötigen oder bereits ein
`Graph`-Objekt besitzen.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
