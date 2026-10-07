---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Vykreslenie do iných formátov

`render` vytvorí rozloženie grafu a vráti reťazec v požadovanom formáte.
Prijíma ľubovoľný `Graph` vytvorený pomocou `parse` alebo `createGraph`.

## Signatúra

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` má predvolenú hodnotu `'dot'`. Úplný zoznam nájdete v časti
[Moduly rozloženia](/sk/guide/engines).

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

## Kedy použiť ktorý formát

| Formát | Typické použitie |
|---|---|
| `'svg'` | Vloženie do webových stránok; čitateľný pre človeka; škáluje bez straty kvality |
| `'dot'` | Ladenie; opätovné odovzdanie iným nástrojom Graphviz so zachovaným rozložením |
| `'xdot'` | Odovzdanie vlastnému vykresľovaču cez `getDrawOps` |
| `'json'` | Strojovo čitateľné údaje o grafe pre nástroje alebo kontrolu |
| `'plain'` | Odľahčený geometrický výstup; v skriptoch sa ľahko spracúva |
| `'plain-ext'` | Ako `'plain'`, plus súradnice portov na hranách |
| `'imap'` | Serverová klikateľná mapa obrázka pre značky `<img>` |
| `'cmapx'` | Klientsky element `<map>` pre značky `<img>` |

## Príklady

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

## Použitie iného modulu rozloženia

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Vzťah k `renderSvg`

`renderSvg(dot, engine)` je pohodlný obal, ktorý volá `parse` + `render`
v jednom kroku a obmedzuje sa na výstup SVG. `render` použite priamo vtedy,
keď potrebujete iný formát než SVG alebo keď už objekt `Graph` máte.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
