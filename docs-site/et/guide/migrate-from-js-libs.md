---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Üleminek teistelt JS-i Graphvizi teekidelt

viz.js / `@viz-js/viz`, `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`) ja
`d3-graphviz` annavad kõik JavaScriptile juurdepääsu Graphvizile, kompileerides
päris C-keelse Graphvizi **WebAssembly**-ks ja kutsudes seda. @knowvah/dot-engine
on nullist tehtud **TypeScripti portimine** — paigutusmootorid, parser ja
SVG-emitter on TypeScripti lähtekood, mitte kompileeritud binaar.

See erinevus on põhisisu, mitte allmärkus:

| | WASM-ümbrised (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Teostus | Päris C-keelne Graphviz, kompileeritud `.wasm`-binaariks | Puhas TypeScripti portimine, kompileeritud artefakti ei ole |
| Mooduli lähtestamine | Asünkroonne — enne esmakasutust tuleb WASM-moodul instantseerida/oodata | Puudub — `import` ja kutsuge sünkroonselt |
| Komplekt (bundle) | JS-i kõrval tuleb tarnida `.wasm`-vara (sadu KB kuni paar MB) | Ainult JS, toetab tree-shaking’ut |
| Silumine | Samm-sammuline läbimine WASM-blobis (või C-lähtekoodis, kui see on olemas) | Samm-sammuline läbimine päris TypeScriptis lähtekaartidega |
| Lõimemudel | Mõned versioonid käivitavad paigutuse Web Workeris | Töötab kutsuvas lõimes nagu iga TS-funktsioon |
| Väljundvormingud | Mis iganes alusena oleva C-versiooniga kompileeriti — tavaliselt Graphvizi täielik komplekt, sh raster/PDF | SVG + tekstivormingud DOT/json/xdot/plain/imagemap — vt allpool |

Kui teie kasutusjuhtum on „kutsuda funktsioon, saada SVG tagasi, ilma
asünkroonse tseremoonia ja hostimist vajava WASM-varata“ — selleks
@knowvah/dot-engine mõeldud ongi. Kui teie kasutusjuhtum sõltub raster- või
PDF-väljundist, vt allpool [Millal jääda WASM-i juurde](#millal-jaada-wasm-i-juurde).

## API erinevused

Kolmel teegil on erinev kuju; allolev tabel on tavaline üleminekujuhtum
(ligikaudne — kontrollige iga teegi enda dokumentatsiooni vastu; vt viiteid iga
rea all).

| Teek | Tüüpiline kutse | @knowvah/dot-engine'i vaste |
|---|---|---|
| `@viz-js/viz` (viz.js-i järglane) | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — asünkroonne, `Viz.instance()` lahendab Promise'i | `renderSvg(dot, 'dot')` — sünkroonne, instantsi/lähtestamise sammu ei ole |
| viz.js 2.x (vana, `new Viz()`) | `new Viz().renderString(dot)` — tagastab `Promise<string>` | `renderSvg(dot, 'dot')` — sünkroonne |
| `@hpcc-js/wasm-graphviz` | `await Graphviz.load()` üks kord, seejärel `graphviz.dot(dot)` (pärast laadimist sünkroonne) | `renderSvg(dot, engine)` — laadimis-/soojendussamm puudub täielikult |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — seob väljundi DOM-iga, animeerib üleminekuid | `renderSvg(dot, engine)` tagastab SVG-**sõne**; DOM-i lisate selle ise (nt `el.innerHTML = svg`) |

Iga parempoolse veeru @knowvah/dot-engine'i kutse on **sünkroonne** — ootamiseks
ei ole moodulit, sest instantseerida pole ühtegi WASM-binaari. Eemaldage kõik
`await`/`.then()`, mis ümbritsevad @knowvah/dot-engine'i kutset; neid ei olnud
kunagi vaja.

- `@viz-js/viz`-i `Viz.instance()` → Promise ja meetod `renderSVGElement()` on
  dokumenteeritud aadressil viz-js.com; kinnitatud projekti avaldatud
  kasutusnäite kaudu kirjutamise ajal.
- viz.js 2.x `new Viz().renderString(dot)` on selle (nüüdseks asendatud)
  väljalaskeliini jaoks dokumenteeritud API; kui teil on praegune paigaldus,
  kontrollige, kas te tegelikult kasutate `@viz-js/viz`-i.
- `@hpcc-js/wasm-graphviz`-i paar `Graphviz.load()` / `graphviz.dot()` on
  kinnitatud paketi avaldatud kasutusnäite kaudu kirjutamise ajal. Eraldiseisev,
  vanem pakett `@hpcc-js/wasm` pakkus varasemates väljalasetes lisaks kutset
  `graphviz.layout(dot, format, engine)` — kontrollige enne täpsele signatuurile
  toetumist oma paigaldatud versiooni enda dokumentatsiooni.
- `d3-graphviz`-i ahel `.graphviz().renderDot(dot)` ja asjaolu, et see on
  seespidiselt ehitatud `@hpcc-js/wasm`-ile, on kinnitatud projekti avaldatud
  README kaudu kirjutamise ajal.

### `renderDot`-i DOM-seostamine jääb siin ulatusest välja

`d3-graphviz` teeb enamat kui SVG renderdamine: see seob tulemuse D3 valikuga,
võrdleb uuesti renderdamisi ja animeerib üleminekuid paigutuste vahel.
@knowvah/dot-engine'il ei ole DOM-i kohta mingit seisukohta — `renderSvg`/`render`
tagastavad tavalise sõne. Kui soovite d3-graphvizi stiilis animeeritud
üleminekuid kahe paigutuse vahel, on see loogika, mille ehitaksite kahe
`renderSvg` kutse ja oma DOM-i võrdluse peale (või jätkake selle konkreetse
funktsiooni jaoks d3-graphvizi kasutamist — vt allpool).

## Paigutusandmete saamine ilma sõnevormingut parsimata

Kõigilt kolmelt WASM-teegilt saab küsida Graphvizi enda JSON- või lihttekstivorminguid,
seejärel parsite selle sõne ise, et saada sõlmede/servade koordinaadid.
@knowvah/dot-engine jätab teksti ringi vahele: kutsuge `getLayout(g)` (pärast
`render`-it), et saada otse tüübitud, JSON-iks serialiseeritav hetktõmmis —
parsida ei ole vaja `-Tjson`/`-Tplain` sõnet.

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

Hetktõmmise täieliku kuju, ühikud ja `yAxis` valiku leiate jaotisest
[Arvutatud geomeetria lugemine](/et/guide/geometry).

## Millal jääda WASM-i juurde

Olge enda vastu aus ulatuse osas: @knowvah/dot-engine sihib SVG-d ning
tekstivorminguid `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx`. See
**ei** väljasta rastervorminguid (PNG/JPEG/GIF/...) ega PostScripti/PDF-i/EPS-i —
need on tahtlik ulatuse piir, mitte lihtsalt lõpetamata lünk. Täpse
mitte-eesmärkide loendi leiate jaotisest
[Teadaolevad erinevused](/et/divergences).

Kui teie rakendus vajab `-Tpng` või `-Tpdf` väljundit otse paigutusmootorist,
katavad selle juhtumi endiselt ülalnimetatud WASM-põhised teegid — kuna need
käitavad päris C-keelset Graphvizi, toetavad nad kõiki väljundvorminguid, millega
see versioon kompileeriti. Sel juhul kas jätkake selle ühe koodiharu jaoks
WASM-teegi kasutamist või renderdage @knowvah/dot-engine'iga `'svg'`-ks ja
teisendage SVG järgmises etapis eraldi tööriistaga rastriks/PDF-iks.

## Vt ka

- [Paigutusmootorid](/et/guide/engines)
- [Renderdamine teistesse vormingutesse](/et/guide/render-formats)
- [Arvutatud geomeetria lugemine](/et/guide/geometry)
- [Teadaolevad erinevused](/et/divergences)
- [Alustamine](/et/guide/getting-started)
