---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Siirtyminen muista JS-Graphviz-kirjastoista

viz.js / `@viz-js/viz`, `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`) ja
`d3-graphviz` antavat kaikki JavaScriptille pääsyn Graphvizin käyttöön
kääntämällä oikean C-kielisen Graphvizin **WebAssemblyksi** ja kutsumalla sitä.
@knowvah/dot-engine on alusta alkaen tehty **TypeScript-porttaus** —
asettelumoottorit, jäsennin ja SVG-lähetin ovat TypeScript-lähdekoodia, eivät
käännetty binääri.

Tämä ero on pääasia, ei alaviite:

| | WASM-kääreet (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Toteutus | Oikea C-kielinen Graphviz, käännetty `.wasm`-binääriksi | Puhdas TypeScript-porttaus, ei käännettyä artefaktia |
| Moduulin alustus | Asynkroninen — WASM-moduuli instansioidaan ja odotetaan ennen ensimmäistä käyttöä | Ei lainkaan — `import` ja kutsu synkronisesti |
| Paketti | `.wasm`-resurssi (satoja kt – muutama Mt) toimitetaan JS:n rinnalla | Vain JS, tree-shaking-yhteensopiva |
| Virheenjäljitys | Askellus WASM-blobin läpi (tai C-lähdekoodin läpi, jos se on saatavilla) | Askellus oikean TypeScriptin läpi lähdekarttojen kanssa |
| Säiemalli | Jotkin koontiversiot ajavat asettelun Web Workerissa | Ajetaan kutsuvassa säikeessä kuten mikä tahansa TS-funktio |
| Tulostemuodot | Mitkä tahansa, joilla taustalla oleva C-koontiversio käännettiin — tyypillisesti koko Graphviz-joukko, mukaan lukien raster/PDF | SVG + DOT/json/xdot/plain/imagemap-tekstimuodot — katso alla |

Jos käyttötapauksesi on "kutsu funktiota, saat SVG:n takaisin, ei asynkronista
seremoniaa, ei WASM-resurssia isännöitäväksi" — siihen @knowvah/dot-engine on
tarkoitettu. Jos käyttötapauksesi riippuu raster- tai PDF-tulosteesta, katso
alla [Milloin pysyä WASMissa](#milloin-pysya-wasmissa).

## API-erot

Kolmella kirjastolla on eri muoto; alla oleva taulukko on yleinen
siirtymätapaus (likimääräinen — tarkista kunkin kirjaston omasta
dokumentaatiosta; katso lähteet kunkin rivin alta).

| Kirjasto | Tyypillinen kutsu | @knowvah/dot-engine-vastine |
|---|---|---|
| `@viz-js/viz` (viz.js:n seuraaja) | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — asynkroninen, `Viz.instance()` ratkaisee Promisen | `renderSvg(dot, 'dot')` — synkroninen, ei instanssi-/alustusvaihetta |
| viz.js 2.x (vanha, `new Viz()`) | `new Viz().renderString(dot)` — palauttaa `Promise<string>`-arvon | `renderSvg(dot, 'dot')` — synkroninen |
| `@hpcc-js/wasm-graphviz` | `await Graphviz.load()` kerran, sitten `graphviz.dot(dot)` (latauksen jälkeen synkroninen) | `renderSvg(dot, engine)` — ei lataus-/lämmitysvaihetta lainkaan |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — sitoo tulosteen DOMiin, animoi siirtymät | `renderSvg(dot, engine)` palauttaa SVG-**merkkijonon**; lisäät sen DOMiin itse (esim. `el.innerHTML = svg`) |

Jokainen oikean sarakkeen @knowvah/dot-engine-kutsu on **synkroninen** — ei ole
moduulia odotettavaksi, koska ei ole WASM-binääriä instansioitavaksi. Poista
kaikki @knowvah/dot-engine-kutsua ympäröivät `await`/`.then()` -rakenteet; niitä ei
koskaan tarvittu.

- `@viz-js/viz`:n `Viz.instance()` → Promise ja `renderSVGElement()`-metodi on
  dokumentoitu osoitteessa viz-js.com; vahvistettu projektin julkaistun
  käyttöesimerkin perusteella kirjoitushetkellä.
- viz.js 2.x:n `new Viz().renderString(dot)` on kyseisen (nyt korvatun)
  julkaisulinjan dokumentoitu API; jos käytössäsi on nykyinen asennus,
  tarkista, oletko todellisuudessa `@viz-js/viz`:ssä.
- `@hpcc-js/wasm-graphviz`:n `Graphviz.load()` / `graphviz.dot()` -pari on
  vahvistettu paketin julkaistun käyttöesimerkin perusteella kirjoitushetkellä.
  Erillinen, vanhempi `@hpcc-js/wasm`-paketti tarjosi lisäksi aiemmissa
  julkaisuissa `graphviz.layout(dot, format, engine)` -kutsun — tarkista
  asentamasi version oma dokumentaatio ennen kuin luotat tarkkaan
  allekirjoitukseen.
- `d3-graphviz`:n `.graphviz().renderDot(dot)` -ketju ja se, että se on
  sisäisesti rakennettu `@hpcc-js/wasm`:n päälle, on vahvistettu projektin
  julkaistun README:n perusteella kirjoitushetkellä.

### `renderDot`:n DOM-sidonta on tässä rajattu pois

`d3-graphviz` tekee enemmän kuin renderöi SVG:tä: se sitoo tuloksen D3-
valintaan, vertailee uudelleenrenderöinnit ja animoi siirtymät asettelujen
välillä. @knowvah/dot-engine:llä ei ole DOMista mitään mielipidettä —
`renderSvg`/`render` palauttavat tavallisen merkkijonon. Jos haluat
d3-graphviz-tyylisiä animoituja siirtymiä kahden asettelun välillä, se on
logiikkaa, jonka rakentaisit kahden `renderSvg`-kutsun ja oman DOM-vertailusi
päälle (tai jatkat d3-graphvizin käyttöä juuri tätä ominaisuutta varten —
katso alla).

## Asetteludata ilman merkkijonomuodon jäsentämistä

Kaikilta kolmelta WASM-kirjastolta voi pyytää Graphvizin omaa JSON- tai
plain-tekstimuotoa, jonka jälkeen jäsennät merkkijonon itse saadaksesi
solmujen/kaarten koordinaatit. @knowvah/dot-engine ohittaa tekstikierroksen:
kutsu `getLayout(g)` (`render`-funktion jälkeen) saadaksesi tyypitetyn,
JSON-serialisoitavan tilannekuvan suoraan — ei `-Tjson`-/`-Tplain`-merkkijonoa
jäsennettäväksi.

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

Täysi tilannekuvan muoto, yksiköt ja `yAxis`-valitsin ovat sivulla
[Lasketun geometrian lukeminen](/fi/guide/geometry).

## Milloin pysyä WASMissa

Ole rehellinen itsellesi laajuudesta: @knowvah/dot-engine kohdistuu SVG:hen
sekä `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx`-tekstimuotoihin.
Se **ei** tuota rasterimuotoja (PNG/JPEG/GIF/...) eikä PostScriptiä/PDF:ää/EPS:ää
— ne ovat tietoinen rajaus, eivät pelkästään keskeneräinen aukko. Katso
täsmällinen tavoitteiden ulkopuolisten asioiden luettelo sivulta
[Tunnetut poikkeamat](/fi/divergences).

Jos sovelluksesi tarvitsee `-Tpng`- tai `-Tpdf`-tulosteen suoraan
asettelumoottorista, yllä mainitut WASM-pohjaiset kirjastot kattavat edelleen
tämän tapauksen — koska ne ajavat oikeaa C-kielistä Graphvizia, ne tukevat
mitä tahansa tulostemuotoja, joilla kyseinen koontiversio käännettiin. Tässä
tilanteessa joko jatka WASM-kirjaston käyttöä juuri tässä yhdessä
koodipolussa, tai renderöi muotoon `'svg'` @knowvah/dot-engine:llä ja muunna
SVG rasteriksi/PDF:ksi jatkokäsittelyssä erillisellä työkalulla.

## Katso myös

- [Asettelumoottorit](/fi/guide/engines)
- [Renderöinti muihin muotoihin](/fi/guide/render-formats)
- [Lasketun geometrian lukeminen](/fi/guide/geometry)
- [Tunnetut poikkeamat](/fi/divergences)
- [Aloitus](/fi/guide/getting-started)
