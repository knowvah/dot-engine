---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Renderowanie do innych formatów

`render` układa graf i zwraca łańcuch znaków w żądanym formacie. Przyjmuje
dowolny `Graph` utworzony przez `parse` lub `createGraph`.

## Sygnatura

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` domyślnie ma wartość `'dot'`. Pełną listę znajdziesz w
[Silniki układu](/pl/guide/engines).

## Formaty

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

## Kiedy którego użyć

| Format | Typowe zastosowanie |
|---|---|
| `'svg'` | Osadzanie na stronach WWW; czytelny dla człowieka; skaluje się bez strat |
| `'dot'` | Debugowanie; ponowne podanie innym narzędziom Graphviz z zachowanym układem |
| `'xdot'` | Przekazanie własnemu rendererowi przez `getDrawOps` |
| `'json'` | Dane grafu w formie czytelnej dla maszyn, do narzędzi lub inspekcji |
| `'plain'` | Lekki zapis geometrii; łatwy do sparsowania w skryptach |
| `'plain-ext'` | Jak `'plain'`, plus współrzędne portów na krawędziach |
| `'imap'` | Mapa obrazu po stronie serwera dla znaczników `<img>` |
| `'cmapx'` | Element `<map>` po stronie klienta dla znaczników `<img>` |

## Przykłady

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

## Użycie innego silnika

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Związek z `renderSvg`

`renderSvg(dot, engine)` to funkcja pomocnicza, która wywołuje `parse` +
`render` w jednym kroku i jest ograniczona do wyjścia SVG. Użyj `render`
bezpośrednio, gdy potrzebujesz formatu innego niż SVG albo gdy masz już
obiekt `Graph`.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
