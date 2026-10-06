---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Renderöinti muihin muotoihin

`render` asettelee graafin ja tuottaa merkkijonon pyydetyssä muodossa. Se
hyväksyy minkä tahansa `Graph`-olion, jonka `parse` tai `createGraph` on
tuottanut.

## Allekirjoitus

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine`-oletusarvo on `'dot'`. Katso täysi luettelo sivulta
[Asettelumoottorit](/fi/guide/engines).

## Muodot

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

## Milloin mitäkin käytetään

| Muoto | Tyypillinen käyttö |
|---|---|
| `'svg'` | Upotus verkkosivuille; ihmisen luettavissa; skaalautuu häviöttä |
| `'dot'` | Virheenjäljitys; syöttö takaisin muille graphviz-työkaluille asettelu säilyttäen |
| `'xdot'` | Syöte omalle renderöijälle `getDrawOps`-funktion kautta |
| `'json'` | Koneluettava graafidata työkaluille tai tarkasteluun |
| `'plain'` | Kevyt geometriatuloste; helppo jäsentää skripteissä |
| `'plain-ext'` | Kuten `'plain'`, mutta kaarille lisätään porttien koordinaatit |
| `'imap'` | Palvelinpuolen napsautettava kuvakartta `<img>`-tageille |
| `'cmapx'` | Asiakaspuolen `<map>`-elementti `<img>`-tageille |

## Esimerkkejä

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

## Toisen moottorin käyttö

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Suhde `renderSvg`-funktioon

`renderSvg(dot, engine)` on apufunktio, joka kutsuu `parse`- ja `render`-
funktioita yhdessä vaiheessa ja tuottaa vain SVG:tä. Käytä `render`-funktiota
suoraan, kun tarvitset muun kuin SVG-muodon tai kun sinulla on jo `Graph`-olio.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
