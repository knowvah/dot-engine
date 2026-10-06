---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Renderizar a otros formatos

`render` calcula el diseño de un grafo y emite una cadena en el formato
solicitado. Acepta cualquier `Graph` producido por `parse` o `createGraph`.

## Firma

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` tiene como valor predeterminado `'dot'`. Consulta
[Motores de diseño](/es/guide/engines) para ver la lista completa.

## Formatos

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

## Cuándo usar cada uno

| Formato | Uso típico |
|---|---|
| `'svg'` | Incrustar en páginas web; legible para las personas; escala sin pérdida |
| `'dot'` | Depuración; volver a pasarlo a otras herramientas de Graphviz conservando el diseño |
| `'xdot'` | Pasarlo a un renderizador propio mediante `getDrawOps` |
| `'json'` | Datos del grafo legibles por máquinas, para herramientas o inspección |
| `'plain'` | Salida de geometría ligera; fácil de analizar en scripts |
| `'plain-ext'` | Como `'plain'`, más las coordenadas de puerto en las aristas |
| `'imap'` | Mapa de imagen del lado del servidor con áreas clicables para etiquetas `<img>` |
| `'cmapx'` | Elemento `<map>` del lado del cliente para etiquetas `<img>` |

## Ejemplos

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

## Usar un motor distinto

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Relación con `renderSvg`

`renderSvg(dot, engine)` es una función de conveniencia que llama a `parse` +
`render` en un solo paso y se limita a la salida SVG. Usa `render` directamente
cuando necesites un formato distinto de SVG o cuando ya tengas un objeto
`Graph`.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
