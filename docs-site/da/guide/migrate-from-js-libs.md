---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Migrering fra andre JS-Graphviz-biblioteker

viz.js / `@viz-js/viz`, `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`) og
`d3-graphviz` giver alle JavaScript adgang til Graphviz ved at kompilere den
rigtige C-Graphviz til **WebAssembly** og kalde ind i den. @knowvah/dot-engine
er en **TypeScript-portering** fra bunden — layoutmotorerne, parseren og
SVG-udsenderen er TypeScript-kildekode, ikke en kompileret binær.

Den forskel er hovedpointen, ikke en fodnote:

| | WASM-indpakninger (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Implementering | Rigtig C-Graphviz, kompileret til en `.wasm`-binær | Ren TypeScript-portering, intet kompileret artefakt |
| Modulinitialisering | Asynkron — instansiér/afvent WASM-modulet før første brug | Ingen — `import` og kald synkront |
| Bundle | Lever et `.wasm`-aktiv (hundredvis af KB til lave MB) ved siden af JS | Kun JS, kan tree-shakes |
| Fejlfinding | Træd gennem en WASM-blob (eller C-kildekode, hvis du har den) | Træd gennem den rigtige TypeScript med source maps |
| Trådmodel | Nogle builds kører layout i en Web Worker | Kører på den kaldende tråd, som enhver TS-funktion |
| Outputformater | Hvad den underliggende C-build blev kompileret med — typisk hele Graphviz-sættet, inklusive raster/PDF | SVG + tekstformaterne DOT/json/xdot/plain/imagemap — se nedenfor |

Hvis dit brugsscenarie er "kald en funktion, få SVG tilbage, ingen asynkron
ceremoni, intet WASM-aktiv at hoste" — så er det det, @knowvah/dot-engine er til.
Hvis dit brugsscenarie afhænger af raster- eller PDF-output, se
[Hvornår du bør blive ved WASM](#hvornar-du-bør-blive-ved-wasm) nedenfor.

## API-forskelle

De tre biblioteker har forskellig form; tabellen nedenfor er det almindelige
migreringstilfælde (omtrentligt — kontrollér mod hvert biblioteks egen
dokumentation; se kilderne under tabellen).

| Bibliotek | Typisk kald | @knowvah/dot-engine-ækvivalent |
|---|---|---|
| `@viz-js/viz` (efterfølger til viz.js) | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — asynkron, `Viz.instance()` afgiver et Promise | `renderSvg(dot, 'dot')` — synkron, intet instans-/init-trin |
| viz.js 2.x (ældre, `new Viz()`) | `new Viz().renderString(dot)` — returnerer et `Promise<string>` | `renderSvg(dot, 'dot')` — synkron |
| `@hpcc-js/wasm-graphviz` | `await Graphviz.load()` én gang, derefter `graphviz.dot(dot)` (synkron efter indlæsning) | `renderSvg(dot, engine)` — slet intet indlæsnings-/opvarmningstrin |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — binder output ind i DOM'en, animerer overgange | `renderSvg(dot, engine)` returnerer en SVG-**streng**; du indsætter den selv i DOM'en (fx `el.innerHTML = svg`) |

Hvert @knowvah/dot-engine-kald i højre kolonne er **synkront** — der er intet
modul at afvente, fordi der ikke er nogen WASM-binær at instansiere. Fjern
enhver `await`/`.then()` omkring et @knowvah/dot-engine-kald; den var aldrig
nødvendig.

- `@viz-js/viz`s `Viz.instance()` → Promise og metoden `renderSVGElement()` er
  dokumenteret på viz-js.com; bekræftet via projektets offentliggjorte
  brugseksempel på skrivetidspunktet.
- viz.js 2.x's `new Viz().renderString(dot)` er den API, der er dokumenteret
  for den (nu afløste) udgivelseslinje; hvis du har en aktuel installation, så
  kontrollér, om du i virkeligheden er på `@viz-js/viz`.
- Parret `Graphviz.load()` / `graphviz.dot()` i `@hpcc-js/wasm-graphviz` er
  bekræftet via pakkens offentliggjorte brugseksempel på skrivetidspunktet. Den
  separate, ældre pakke `@hpcc-js/wasm` udstillede desuden i tidligere
  udgivelser et kald `graphviz.layout(dot, format, engine)` — tjek din
  installerede versions egen dokumentation, før du forlader dig på den præcise
  signatur.
- Kæden `.graphviz().renderDot(dot)` i `d3-graphviz`, og at den internt bygger
  på `@hpcc-js/wasm`, er bekræftet via projektets offentliggjorte README på
  skrivetidspunktet.

### `renderDot`s DOM-binding ligger uden for omfanget her

`d3-graphviz` gør mere end at rendere SVG: det binder resultatet ind i en
D3-selektion, sammenligner gen-renderinger og animerer overgange mellem
layouts. @knowvah/dot-engine har slet ingen holdning til DOM — `renderSvg`/`render`
returnerer en almindelig streng. Hvis du vil have animerede overgange i
d3-graphviz-stil mellem to layouts, er det logik, du selv bygger oven på to
`renderSvg`-kald og din egen DOM-sammenligning (eller bliver ved med at bruge
d3-graphviz til netop den funktion — se nedenfor).

## Layoutdata uden at parse et strengformat

Alle tre WASM-biblioteker kan bede om Graphviz' egne JSON- eller
almindelige tekstformater, hvorefter du selv parser den streng for at få
knude-/kantkoordinater. @knowvah/dot-engine springer tekstomvejen over: kald
`getLayout(g)` (efter `render`) for direkte at få et typet,
JSON-serialiserbart snapshot — ingen `-Tjson`-/`-Tplain`-streng at parse.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes  → [{ name: 'a', x, y, width, height }, ...]
// layout.edges  → [{ tail: 'a', head: 'b', points: [...] }]
// layout.bounds → { x, y, width, height }
```

Se [Læs beregnet geometri](/da/guide/geometry) for snapshottets fulde form,
enheder og indstillingen `yAxis`.

## Hvornår du bør blive ved WASM

Vær ærlig over for dig selv om omfanget: @knowvah/dot-engine sigter mod SVG
plus tekstformaterne `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx`. Den
udsender **ikke** rasterformater (PNG/JPEG/GIF/...) eller PostScript/PDF/EPS —
det er en bevidst afgrænsning af omfanget, ikke et hul, der bare er uafsluttet.
Se [Kendte afvigelser](/da/divergences) for den præcise liste over ikke-mål.

Hvis din applikation har brug for `-Tpng`- eller `-Tpdf`-output direkte fra
layoutmotoren, dækker de WASM-baserede biblioteker ovenfor stadig det tilfælde
— fordi de kører den rigtige C-Graphviz, understøtter de de outputformater,
den build blev kompileret med. I det scenarie kan du enten blive ved med at
bruge WASM-biblioteket til den ene kodesti, eller rendere til `'svg'` med
@knowvah/dot-engine og konvertere SVG'en til raster/PDF efterfølgende med et
separat værktøj.

## Se også

- [Layoutmotorer](/da/guide/engines)
- [Render til andre formater](/da/guide/render-formats)
- [Læs beregnet geometri](/da/guide/geometry)
- [Kendte afvigelser](/da/divergences)
- [Kom godt i gang](/da/guide/getting-started)
