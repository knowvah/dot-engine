---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Migrering fra andre JS-Graphviz-biblioteker

viz.js / `@viz-js/viz`, `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`) og
`d3-graphviz` gir alle JavaScript-tilgang til Graphviz ved å kompilere den
ekte C-versjonen av Graphviz til **WebAssembly** og kalle inn i den.
@knowvah/dot-engine er en **TypeScript-portering** skrevet fra bunnen av —
layoutmotorene, parseren og SVG-emitteren er TypeScript-kildekode, ikke en
kompilert binærfil.

Den forskjellen er hovedpoenget, ikke en fotnote:

| | WASM-innpakninger (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Implementasjon | Ekte C-Graphviz, kompilert til en `.wasm`-binærfil | Ren TypeScript-portering, ingen kompilert artefakt |
| Modulinitialisering | Asynkron — instansier/avvent WASM-modulen før første bruk | Ingen — `import` og kall synkront |
| Bundle | Lever en `.wasm`-ressurs (hundrevis av KB til lave MB) ved siden av JS | Bare JS, kan tree-shakes |
| Feilsøking | Gå gjennom en WASM-blob (eller C-kildekoden, hvis du har den) | Gå gjennom den virkelige TypeScript-koden med source maps |
| Trådmodell | Noen bygg kjører layout i en Web Worker | Kjører på kallende tråd, som enhver TS-funksjon |
| Utdataformater | Det den underliggende C-bygget ble kompilert med — typisk hele Graphviz-settet, inkludert raster/PDF | SVG + tekstformatene DOT/json/xdot/plain/imagemap — se under |

Hvis bruksområdet ditt er «kall en funksjon, få SVG tilbake, ingen
async-seremoni, ingen WASM-ressurs å hoste» — det er det @knowvah/dot-engine er
til for. Hvis bruksområdet ditt avhenger av raster- eller PDF-utdata, se
[Når du bør bli på WASM](#when-to-stay-on-wasm) nedenfor.

## API-forskjeller

De tre bibliotekene har ulike former; tabellen under er det vanlige
migreringstilfellet (omtrentlig — kontroller mot hvert biblioteks egen
dokumentasjon; se kildehenvisningene under hver rad).

| Bibliotek | Typisk kall | @knowvah/dot-engine-ekvivalent |
|---|---|---|
| `@viz-js/viz` (etterfølger til viz.js) | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — asynkron, `Viz.instance()` løser et Promise | `renderSvg(dot, 'dot')` — synkron, ingen instans-/init-steg |
| viz.js 2.x (eldre, `new Viz()`) | `new Viz().renderString(dot)` — returnerer et `Promise<string>` | `renderSvg(dot, 'dot')` — synkron |
| `@hpcc-js/wasm-graphviz` | `await Graphviz.load()` én gang, deretter `graphviz.dot(dot)` (synkron etter lasting) | `renderSvg(dot, engine)` — ikke noe laste-/oppvarmingssteg i det hele tatt |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — binder utdata inn i DOM-en, animerer overganger | `renderSvg(dot, engine)` returnerer en SVG-**streng**; du setter den inn i DOM-en selv (f.eks. `el.innerHTML = svg`) |

Hvert @knowvah/dot-engine-kall i høyre kolonne er **synkront** — det finnes ingen
modul å avvente, fordi det ikke finnes noen WASM-binærfil å instansiere. Fjern
all `await`/`.then()` rundt et @knowvah/dot-engine-kall; den var aldri
nødvendig.

- `@viz-js/viz`s `Viz.instance()` → Promise og metoden `renderSVGElement()` er
  dokumentert på viz-js.com; bekreftet via prosjektets publiserte brukseksempel
  da dette ble skrevet.
- viz.js 2.x sin `new Viz().renderString(dot)` er API-et som er dokumentert for
  den (nå avløste) utgivelseslinjen; hvis du har en nyere installasjon, sjekk om
  du egentlig bruker `@viz-js/viz`.
- Paret `Graphviz.load()` / `graphviz.dot()` i `@hpcc-js/wasm-graphviz` er
  bekreftet via pakkens publiserte brukseksempel da dette ble skrevet. Den
  separate, eldre pakken `@hpcc-js/wasm` eksponerte i tillegg et kall
  `graphviz.layout(dot, format, engine)` i tidligere utgivelser — sjekk
  dokumentasjonen til din installerte versjon før du stoler på den nøyaktige
  signaturen.
- Kjeden `.graphviz().renderDot(dot)` i `d3-graphviz`, og at den er bygget på
  `@hpcc-js/wasm` internt, er bekreftet via prosjektets publiserte README da
  dette ble skrevet.

### DOM-bindingen i `renderDot` ligger utenfor omfanget her

`d3-graphviz` gjør mer enn å rendre SVG: det binder resultatet inn i et
D3-utvalg, sammenligner (diff) gjenrenderinger og animerer overganger mellom
layouter. @knowvah/dot-engine har ingen mening om DOM-en overhodet —
`renderSvg`/`render` returnerer en vanlig streng. Hvis du vil ha animerte
overganger i d3-graphviz-stil mellom to layouter, er det logikk du må bygge
oppå to `renderSvg`-kall og din egen DOM-diffing (eller fortsette å bruke
d3-graphviz for akkurat den funksjonen — se under).

## Få layoutdata uten å tolke et strengformat

Alle de tre WASM-bibliotekene kan be om Graphvizs egne JSON- eller
ren-tekst-formater, og så tolker du den strengen selv for å få node-/
kantkoordinater. @knowvah/dot-engine hopper over tekstrundturen: kall
`getLayout(g)` (etter `render`) for å få et typet, JSON-serialiserbart
øyeblikksbilde direkte — ingen `-Tjson`-/`-Tplain`-streng å tolke.

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

Se [Les beregnet geometri](/no/guide/geometry) for den fullstendige formen på
øyeblikksbildet, enhetene og valget `yAxis`.

## Når du bør bli på WASM {#when-to-stay-on-wasm}

Vær ærlig med deg selv om omfanget: @knowvah/dot-engine retter seg mot SVG pluss
tekstformatene `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx`. Den
emitterer **ikke** rasterformater (PNG/JPEG/GIF/...) eller PostScript/PDF/EPS —
det er en bevisst avgrensning av omfanget, ikke et hull som bare ikke er
ferdig ennå. Se [Kjente avvik](/no/divergences) for den nøyaktige listen over
ikke-mål.

Hvis applikasjonen din trenger `-Tpng`- eller `-Tpdf`-utdata direkte fra
layoutmotoren, dekker de WASM-baserte bibliotekene over fortsatt det tilfellet —
fordi de kjører den ekte C-versjonen av Graphviz, støtter de de utdataformatene
det bygget ble kompilert med. I det scenarioet kan du enten fortsette å bruke
WASM-biblioteket for akkurat den kodestien, eller rendre til `'svg'` med
@knowvah/dot-engine og konvertere SVG-en til raster/PDF nedstrøms med et eget
verktøy.

## Se også

- [Layoutmotorer](/no/guide/engines)
- [Render til andre formater](/no/guide/render-formats)
- [Les beregnet geometri](/no/guide/geometry)
- [Kjente avvik](/no/divergences)
- [Komme i gang](/no/guide/getting-started)
