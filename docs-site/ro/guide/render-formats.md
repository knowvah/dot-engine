---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Randare în alte formate

`render` aranjează un graf și emite un șir de caractere în formatul cerut.
Acceptă orice `Graph` produs de `parse` sau `createGraph`.

## Semnătură

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` are valoarea implicită `'dot'`. Lista completă o găsiți în
[Motoare de aranjare](/ro/guide/engines).

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

## Când se folosește fiecare

| Format | Utilizare tipică |
|---|---|
| `'svg'` | Încorporare în pagini web; lizibil pentru oameni; se scalează fără pierderi |
| `'dot'` | Depanare; retransmitere către alte instrumente graphviz cu aranjarea păstrată |
| `'xdot'` | Transmitere către un randator propriu prin `getDrawOps` |
| `'json'` | Date de graf lizibile de mașini, pentru instrumente sau inspecție |
| `'plain'` | Ieșire geometrică ușoară; ușor de analizat în scripturi |
| `'plain-ext'` | Ca `'plain'`, plus coordonatele porturilor pe muchii |
| `'imap'` | Hartă de imagine cu zone clicabile, pe partea de server, pentru etichete `<img>` |
| `'cmapx'` | Element `<map>` pe partea de client, pentru etichete `<img>` |

## Exemple

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

## Utilizarea unui alt motor

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Relația cu `renderSvg`

`renderSvg(dot, engine)` este un înveliș de conveniență care apelează `parse` +
`render` într-un singur pas și este limitat la ieșirea SVG. Folosiți direct
`render` când aveți nevoie de un format care nu este SVG sau când dețineți deja
un obiect `Graph`.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
