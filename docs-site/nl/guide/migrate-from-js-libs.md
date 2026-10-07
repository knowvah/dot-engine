---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Migreren vanaf andere JS-Graphviz-bibliotheken

viz.js / `@viz-js/viz`, `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`) en
`d3-graphviz` geven allemaal JavaScript-toegang tot Graphviz door de echte
C-Graphviz te compileren naar **WebAssembly** en die aan te roepen.
@knowvah/dot-engine is een **TypeScript-port** vanaf nul — de lay-out-engines,
de parser en de SVG-emitter zijn TypeScript-broncode, geen gecompileerde
binary.

Dat verschil is de hoofdzaak, geen voetnoot:

| | WASM-wrappers (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Implementatie | Echte C-Graphviz, gecompileerd tot een `.wasm`-binary | Pure TypeScript-port, geen gecompileerd artefact |
| Module-initialisatie | Asynchroon — de WASM-module instantiëren/afwachten vóór het eerste gebruik | Geen — `import` en synchroon aanroepen |
| Bundel | Een `.wasm`-asset (honderden KB tot enkele MB) naast de JS meeleveren | Alleen JS, tree-shakeable |
| Debuggen | Door een WASM-blob stappen (of door de C-broncode, als u die hebt) | Door de echte TypeScript stappen met source maps |
| Threadingmodel | Sommige builds voeren de lay-out uit in een Web Worker | Draait op de aanroepende thread, zoals elke TS-functie |
| Uitvoerformaten | Wat de onderliggende C-build ook is meegecompileerd — doorgaans de volledige Graphviz-set, inclusief raster/PDF | SVG + de tekstformaten DOT/json/xdot/plain/imagemap — zie hieronder |

Als uw use case is "een functie aanroepen, SVG terugkrijgen, geen asynchrone
plechtigheid, geen WASM-asset om te hosten" — daarvoor is @knowvah/dot-engine
bedoeld. Als uw use case afhankelijk is van raster- of PDF-uitvoer, zie dan
[Wanneer u bij WASM blijft](#when-to-stay-on-wasm) hieronder.

## API-verschillen

De drie bibliotheken hebben elk een andere vorm; de onderstaande tabel is het
gangbare migratiegeval (bij benadering — controleer aan de hand van de eigen
documentatie van elke bibliotheek; zie de bronvermeldingen onder elke rij).

| Bibliotheek | Typische aanroep | Equivalent in @knowvah/dot-engine |
|---|---|---|
| `@viz-js/viz` (opvolger van viz.js) | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — asynchroon, `Viz.instance()` resolveert een Promise | `renderSvg(dot, 'dot')` — synchroon, geen instantie-/initstap |
| viz.js 2.x (legacy, `new Viz()`) | `new Viz().renderString(dot)` — geeft een `Promise<string>` terug | `renderSvg(dot, 'dot')` — synchroon |
| `@hpcc-js/wasm-graphviz` | eenmalig `await Graphviz.load()`, daarna `graphviz.dot(dot)` (na het laden synchroon) | `renderSvg(dot, engine)` — helemaal geen laad-/opwarmstap |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — bindt de uitvoer in de DOM, animeert overgangen | `renderSvg(dot, engine)` geeft een SVG-**string** terug; u voegt die zelf in de DOM in (bijvoorbeeld `el.innerHTML = svg`) |

Elke @knowvah/dot-engine-aanroep in de rechterkolom is **synchroon** — er is geen
module om op te wachten, omdat er geen WASM-binary is om te instantiëren. Laat
elke `await`/`.then()` rond een @knowvah/dot-engine-aanroep weg; die was nooit
nodig.

- De Promise van `Viz.instance()` van `@viz-js/viz` en de methode
  `renderSVGElement()` zijn gedocumenteerd op viz-js.com; bevestigd via het
  gepubliceerde gebruiksvoorbeeld van het project op het moment van schrijven.
- `new Viz().renderString(dot)` van viz.js 2.x is de API die voor die (inmiddels
  vervangen) releaselijn is gedocumenteerd; als u een actuele installatie hebt,
  controleer dan of u in feite op `@viz-js/viz` zit.
- Het paar `Graphviz.load()` / `graphviz.dot()` van `@hpcc-js/wasm-graphviz` is
  op het moment van schrijven bevestigd via het gepubliceerde gebruiksvoorbeeld
  van het pakket. Het afzonderlijke, oudere pakket `@hpcc-js/wasm` bood in
  eerdere releases bovendien een aanroep `graphviz.layout(dot, format, engine)`
  — controleer de eigen documentatie van uw geïnstalleerde versie voordat u op
  de exacte signatuur vertrouwt.
- De keten `.graphviz().renderDot(dot)` van `d3-graphviz`, en het feit dat die
  intern op `@hpcc-js/wasm` is gebouwd, is op het moment van schrijven bevestigd
  via de gepubliceerde README van het project.

### De DOM-binding van `renderDot` valt hier buiten de scope

`d3-graphviz` doet meer dan SVG renderen: het bindt het resultaat in een
D3-selectie, vergelijkt hernieuwde renders en animeert overgangen tussen
lay-outs. @knowvah/dot-engine heeft helemaal geen mening over de DOM —
`renderSvg`/`render` geven een gewone string terug. Als u animaties in de stijl
van d3-graphviz tussen twee lay-outs wilt, is dat logica die u bovenop twee
`renderSvg`-aanroepen en uw eigen DOM-vergelijking bouwt (of u blijft
d3-graphviz voor precies die functie gebruiken — zie hieronder).

## Lay-outgegevens verkrijgen zonder een stringformaat te parsen

Alle drie de WASM-bibliotheken kunnen om de eigen JSON- of platte-tekstformaten
van Graphviz worden gevraagd, waarna u die string zelf parseert om knoop-/
kantcoördinaten te krijgen. @knowvah/dot-engine slaat die tekstomweg over: roep
`getLayout(g)` aan (na `render`) voor rechtstreeks een getypeerde, naar JSON te
serialiseren momentopname — geen `-Tjson`-/`-Tplain`-string om te parsen.

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

Zie [Berekende geometrie uitlezen](/nl/guide/geometry) voor de volledige vorm van
de momentopname, de eenheden en de optie `yAxis`.

## Wanneer u bij WASM blijft {#when-to-stay-on-wasm}

Wees eerlijk tegenover uzelf over de scope: @knowvah/dot-engine richt zich op
SVG plus de tekstformaten `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx`.
Het geeft **geen** rasterformaten (PNG/JPEG/GIF/...) of PostScript/PDF/EPS uit —
dat is een bewuste scopegrens, geen leemte die gewoon nog niet is afgemaakt. Zie
[Bekende afwijkingen](/nl/divergences) voor de exacte lijst met niet-doelen.

Als uw applicatie `-Tpng`- of `-Tpdf`-uitvoer rechtstreeks uit de lay-out-engine
nodig heeft, dekken de bovenstaande WASM-bibliotheken dat geval nog steeds —
omdat ze de echte C-Graphviz draaien, ondersteunen ze alle uitvoerformaten
waarmee die build is gecompileerd. In dat scenario kunt u de WASM-bibliotheek
voor dat ene codepad blijven gebruiken, of met @knowvah/dot-engine naar `'svg'`
renderen en de SVG verderop in de keten met een afzonderlijke tool omzetten
naar raster/PDF.

## Zie ook

- [Lay-out-engines](/nl/guide/engines)
- [Renderen naar andere formaten](/nl/guide/render-formats)
- [Berekende geometrie uitlezen](/nl/guide/geometry)
- [Bekende afwijkingen](/nl/divergences)
- [Aan de slag](/nl/guide/getting-started)
