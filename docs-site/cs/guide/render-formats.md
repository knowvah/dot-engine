---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Vykreslení do jiných formátů

`render` rozvrhne graf a vrátí řetězec v požadovaném formátu. Přijímá libovolný
`Graph` vytvořený funkcí `parse` nebo `createGraph`.

## Signatura

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` má výchozí hodnotu `'dot'`. Úplný seznam najdete v části
[Moduly rozvržení](/cs/guide/engines).

## Formáty

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

## Kdy který použít

| Formát | Typické použití |
|---|---|
| `'svg'` | Vložení do webových stránek; čitelný pro člověka; škáluje bez ztráty kvality |
| `'dot'` | Ladění; opětovné předání jiným nástrojům Graphviz se zachovaným rozvržením |
| `'xdot'` | Předání vlastnímu vykreslovači přes `getDrawOps` |
| `'json'` | Strojově čitelná data grafu pro nástroje nebo kontrolu |
| `'plain'` | Odlehčený výstup geometrie; snadno se zpracovává ve skriptech |
| `'plain-ext'` | Jako `'plain'`, navíc se souřadnicemi portů na hranách |
| `'imap'` | Serverová klikací mapa obrázku pro značky `<img>` |
| `'cmapx'` | Klientský element `<map>` pro značky `<img>` |

## Příklady

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

## Použití jiného modulu rozvržení

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Vztah k `renderSvg`

`renderSvg(dot, engine)` je pohodlný obal, který zavolá `parse` + `render`
v jednom kroku a je omezený na výstup SVG. Funkci `render` používejte přímo,
když potřebujete jiný formát než SVG nebo když už objekt `Graph` máte.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
