---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Migrering fra kommandolinjeverktøyet `dot`

De innebygde C-programmene `dot`/`neato`/`fdp`/... leser en `.dot`-fil (eller
stdin) og skriver en rendret fil (eller stdout). @knowvah/dot-engine har ikke noe
filsystem: den tar en DOT-**streng** inn og gir en rendret **streng** ut (eller,
med `getLayout`, et vanlig JavaScript-geometriobjekt i stedet for en streng du
må tolke).

```bash
dot -Kneato -Tsvg input.dot -o output.svg
```

```ts
import { renderSvg } from '@knowvah/dot-engine';
import { readFileSync, writeFileSync } from 'node:fs';

const dot = readFileSync('input.dot', 'utf8');
const svg = renderSvg(dot, 'neato');
writeFileSync('output.svg', svg);
```

Fillesingen og -skrivingen over er din kode, ikke bibliotekets —
@knowvah/dot-engine rører aldri disken. Det er også det som gjør at den fungerer
uendret i en nettleserfane der det ikke finnes noen `input.dot` å lese.

## `-K<engine>` — layoutmotoren

`-K` velger layoutmotor; @knowvah/dot-engine tar samme navn som argumentet
`engine` til `renderSvg` eller feltet `opts.engine` i `render`. Alle åtte
motorene er portert:

| `-K`-verdi | @knowvah/dot-engine `engine`-streng |
|---|---|
| `-Kdot` | `'dot'` (også standard for `render` når `engine` utelates) |
| `-Kneato` | `'neato'` |
| `-Kfdp` | `'fdp'` |
| `-Ksfdp` | `'sfdp'` |
| `-Kcirco` | `'circo'` |
| `-Ktwopi` | `'twopi'` |
| `-Kosage` | `'osage'` |
| `-Kpatchwork` | `'patchwork'` |

```ts
renderSvg(dot, 'neato');
render(g, 'svg', { engine: 'neato' });
```

Se [Layoutmotorer](/no/guide/engines) for hva hver av dem gjør og hvilken
samsvarsklasse den har.

## `-T<format>` — utdataformatet

`renderSvg` kan bare gi SVG; bruk `render(g, format, opts?)` til alt annet.
@knowvah/dot-engines `OutputFormat`-union dekker disse `-T`-målene:

| `-T`-verdi | @knowvah/dot-engine `format`-streng | Merknader |
|---|---|---|
| `-Tsvg` | `'svg'` | også `renderSvg`s eneste utdata |
| `-Tdot` | `'dot'` | DOT-kildekode med layoutattributter (`pos`, `bb`, ...) lagt til |
| `-Txdot` | `'xdot'` | DOT + xdot-instruksjoner i `_draw_`/`_ldraw_` |
| `-Tjson` | `'json'` | hele grafen som JSON |
| `-Tplain` | `'plain'` | mellomromseparert node-/kantgeometri |
| `-Tplain-ext` | `'plain-ext'` | `plain`, pluss portkoordinater på kantene |
| `-Timap` | `'imap'` | tjenerside HTML-bildekart |
| `-Tcmapx` | `'cmapx'` | klientside HTML-element `<map>` |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Støttes ikke:** rasterformater (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps`, og grafiske/interaktive backends. Dette er en bevisst
avgrensning av omfanget — se [Kjente avvik](/no/divergences) for den
fullstendige listen over ikke-mål. Hvis du trenger et rasterbilde, render til
`'svg'` og konverter videre nedstrøms (en hodeløs nettleser, `resvg` eller
lignende).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — attributter

Kommandolinjens globale attributtflagg setter en standardverdi på hver
graf/node/kant fra kommandolinjen. @knowvah/dot-engine har ingen
kommandolinjeflagg — sett de samme attributtene direkte i DOT-kildekoden, eller
via bygger-API-et hvis du konstruerer grafen i kode:

```bash
dot -Gsize=6,6 -Nshape=box -Ecolor=blue -Tsvg input.dot
```

```ts
// DOT source — put the defaults in a top-level attribute statement
const dot = `
  digraph {
    graph [size="6,6"];
    node  [shape=box];
    edge  [color=blue];
    a -> b;
  }
`;
const svg = renderSvg(dot, 'dot');
```

```ts
// Builder — set per-node/per-edge attrs where you create each one
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.setAttr('size', '6,6');
b.addNode('a', { shape: 'box' });
b.addNode('b', { shape: 'box' });
b.addEdge('a', 'b', { color: 'blue' });
const svg = render(b.graph, 'svg');
```

Se [Bygg en graf i kode](/no/guide/build-a-graph) for det fullstendige
bygger-API-et.

## Få geometri som kommandolinjen ikke kan gi deg direkte

`-Tplain` finnes nettopp for at skript skal kunne skrape node-/kantkoordinater
ut av tekstutdata. @knowvah/dot-engine hopper over rundturen: kall `getLayout(g)`
etter `render` for å få et typet, JSON-serialiserbart øyeblikksbilde av hver
nodeposisjon, hver kantspline og den samlede avgrensningsboksen — ingen
tekstformat å tolke.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes[0] → { name: 'a', x, y, width, height }
```

Se [Les beregnet geometri](/no/guide/geometry) for den fullstendige formen på
øyeblikksbildet og valget `yAxis` (innebygd graphviz har y oppover; nettlesere
har y nedover).

## Skrifter og bilder: kommandolinjeverktøyet leser filsystemet ditt, @knowvah/dot-engine gjør ikke det

Innebygde `dot` måler tekst med de skriftene som er installert på maskinen, og
løser opp `image="..."`-attributter ved å lese filer relativt til
arbeidskatalogen. @knowvah/dot-engine har ingen tilgang til filsystemet, så begge
deler injiseres av vertsapplikasjonen i stedet for å leses fra disk:

- **Tekstmåling** — `setTextMeasurer` installerer en `TextMeasurer`; biblioteket
  velger automatisk en fornuftig standard (nettleser-canvas, eller en
  deterministisk metrikkmodell i Node) hvis du ikke setter noen. Se
  [Tekstmåling](/no/guide/text-measurement).
- **Bilder** — `setImageSizer` (og `setImageResolver` for innlining) lar deg
  selv levere iboende bildedimensjoner og bildedata, siden @knowvah/dot-engine
  ikke kan sjekke en fil på dine vegne. Se
  [Arbeid med bilder](/no/guide/images).

## Se også

- [Layoutmotorer](/no/guide/engines)
- [Render til andre formater](/no/guide/render-formats)
- [Les beregnet geometri](/no/guide/geometry)
- [Kjente avvik](/no/divergences)
- [Komme i gang](/no/guide/getting-started)
