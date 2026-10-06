---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Käyttö selaimessa

@knowvah/dot-engine ei käytä pelkästään Nodelle tarkoitettuja API:ja, ja sen voi turvallisesti niputtaa
selainta varten. Tämä sivu käsittelee kaksi asiaa, jotka on hyvä tietää asiakaspuolella ajettaessa.

## Niputtaminen

Kirjasto on tavallisia ES-moduuleja. Mikä tahansa moderni niputtaja (Vite, esbuild, Rollup,
webpack) osaa sisällyttää sen. Ajonaikaisia riippuvuuksia, joita pitäisi jättää ulkopuolelle,
ei ole, eikä WASM-artefakteja tarvitse isännöidä.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

Tämän sivuston [leikkikenttä](/fi/playground) tekee täsmälleen näin — se tuo
moottorin ja kutsuu `renderSvg`-funktiota selaimessa ilman palvelinkierrosta.

## Tekstin mittaus

Graphviz tarvitsee tekstin mitat nimiöiden mitoitukseen. @knowvah/dot-engine hoitaa tämän
automaattisesti:

- **Selaimessa** (kun `document` on olemassa) se mittaa tekstin
  natiivilla `<canvas>`-2D-kontekstilla — isäntäympäristöä myötäillen, sillä se on sama fontti, jolla
  selain renderöi SVG:n.
- **Nodessa** oletuksena on sisäänrakennettu **Estimate**-mittaaja — deterministinen,
  ilman selainta toimiva malli, joka peilaa Graphvizin omaa
  `estimate_textspan_size`-funktiota. Oikeaan asetteluun Nodessa ei tarvita `canvas`-asennusta
  eikä fonttitiedostoja; hinting-ohjattu hakutaulukko- (LUT) mittaaja on myös
  valinnaisesti käytettävissä tarkempaan isäntäympäristöä myötäilevään mitoitukseen ilman natiivia
  canvas-riippuvuutta. Katso [Tekstin mittaus](/fi/guide/text-measurement), miten
  mittaaja valitaan eksplisiittisesti.

Fonttitiedostoja ei tarvita asettelua varten missään tapauksessa.

## Verkkofontit: miksi ennakkolataus on tärkeää

Nimiöiden koot saadaan mittaamalla tekstiä fontilla. Jos kirjasin on julistettu
`@font-face`-säännöllä mutta sen lataus ei ole valmistunut, selain mittaa **varafontilla**
ja asettelu menee väärin, kun oikea fontti saapuu.
Mitattuna Chromiumissa JetBrains Monolla: nimiölaatikko oli **70,68 pt** leveä, kun
mittaus tehtiin ennen kirjasimen latautumista (varafontti), ja **124,8 pt** sen latauduttua.

Asynkroniset sisääntulopisteet (`renderSvgAsync`, `renderAsync`, `renderSvgInto`) välttävät
tämän: ne keräävät fontit, joita graafi pyytää, lataavat ne `document.fonts`-rajapinnan kautta ja
vasta sitten ajavat asettelun. `renderSvgAsync` tuotti saman
124,8 pt:n kuin latauksen jälkeen mitattaessa.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (oletus `3000`) on yksi kaikille kirjasimille yhteinen takaraja,
  ei kirjasinkohtainen.
- **`fontIssues`** on lista `{ face, reason }`-olioita. `reason: 'failed'` tarkoittaa, että
  kirjasin aiheutti virheen (esimerkiksi 404) tai sen lataus hylättiin; `reason: 'timeout'`
  tarkoittaa, ettei se ollut latautunut `fontTimeoutMs`-ajassa. Molemmissa tapauksissa asettelu jatkuu
  varafontilla. Jokaisesta ongelmasta tulee myös `console.warn`. Fonttiongelmat eivät koskaan
  hylkää promisea.
- **Rajoitus:** vain `@font-face`-säännöllä julistetut perheet voidaan raportoida.
  Järjestelmäfontti tai tuntematon perheen nimi ratkeaa ”ladattuna” (ei ole mitään
  odotettavaa), joten väärin kirjoitettua `fontname`-arvoa ei koskaan listata `fontIssues`-listaan.
- **Nodessa ja Workereissa** ei ole `document.fonts`-rajapintaa, joten fonttien ennakkolataus ohitetaan ja
  `fontIssues` on `[]`. Kuvakoukut toimivat silti. Voit antaa `fontSet`-arvon
  (mikä tahansa, jolla on `load(font)`) oman toteutuksesi.

## Renderöinti sivulle: `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

Se korvaa annetun id:n omaavan elementin lapset renderöidyllä
`<svg>`-elementillä (palautetaan nimellä `element`) käyttäen `DOMParser`- ja `importNode`-kutsuja, ei koskaan
`innerHTML`:ää. Puuttuva id hylkää promisen virheellä `ERR_INVALID_ARG_VALUE`. SVG
puhdistetaan oletuksena; anna `sanitize` käyttääksesi omaa puhdistinta tai `trusted: true`
ohittaaksesi puhdistuksen. Katso READMEn ”Security”-osiosta, mitä puhdistin
poistaa ja säilyttää, ja pidä Content-Security-Policy käytössä.

## Ulkoiset kuvat: `setImageSizer`

Kun HTML-tyyppinen nimiö sisältää ulkoisen kuvan
(`<IMG SRC="logo.png"/>`), Graphviz tarvitsee kuvan luontaiset mitat solun
mitoitukseen. (Solmun `image=`-attribuuttia ei mitoiteta: solmu säilyttää
normaalin laatikkonsa, kuten ilman selainta ajettavassa natiivissa Graphvizissa.) Koska kirjasto ei voi
lukea tiedostojärjestelmää, annat mittaajan:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Jos graafisi eivät koskaan viittaa ulkoisiin kuviin, tätä ei tarvitse kutsua.
Jos haluat mitoittaa kuvat asynkronisesti (esimerkiksi lataamalla ne), anna asynkroninen
`imageSizer` `renderSvgAsync`-funktiolle; katso [Kuvat](/fi/guide/images).

## Web Workerit

Asettelu ajetaan synkronisesti, joten suuri graafi tukkii säikeen, jolla se ajetaan. Aja
se Workerissa, jotta sivu pysyy responsiivisena. Workerin sisällä ei ole
`document`-oliota, joten kirjasto mittaa tekstin `OffscreenCanvas`-oliolla ja
asynkroninen API lataa fontit Workerin omasta fonttijoukosta (`self.fonts`).

Workerin fontit ovat erillisiä sivun fonteista: rekisteröi ne Workerissa
`FontFace`-API:lla (CSS:n `@font-face`-säännöt eivät yllä Workereihin).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Renderöi Workerissa `renderSvgAsync`-funktiolla (tai `renderAsync`-funktiolla), ei `renderSvg`-funktiolla,
ainakin siihen asti, kunnes kukin verkkofontti on latautunut. Chromium jatkaa fonttimerkkijonon mittaamista
varakirjasimella, jos kyseinen tarkka merkkijono mitattiin Workerissa ennen
kirjasimen latautumista, vielä sen latauduttuakin; asynkroninen API lataa fontit ennen kuin se
mittaa, joten se ei koskaan osu tähän.

## Mitä ei kannata odottaa

Kirjasto kohdistuu **SVG:hen** (sekä `json`- / `xdot`- / `dot`- / kuvakarttatekstimuotoihin).
Rasteritulostus (PNG/JPG), PostScript/PDF ja interaktiiviset/GUI-taustat
ovat rajauksen ulkopuolella — muunna SVG jälkikäteen, jos tarvitset toisen muodon. Katso
[Tunnetut poikkeamat](/fi/divergences) täydestä rajauksesta.

## Suuret graafit: esirenderöi SVG:ksi

Hyvin suuria graafeja — noin **>10 000 solmua tai muutama Mt DOT-lähdekoodia** — on
epäkäytännöllistä asetella ajonaikaisesti selaimessa. Asettelu (mincross, rankkaus,
splinien reititys) on superlineaarista, joten tämä on **alkuperäisen Graphvizin kanssa jaettu
mittakaavakatto, ei tälle moottorille ominainen rajoitus**: tällaisilla syötteillä
natiivi `dot`, WASM-versiot (`@hpcc-js/wasm-graphviz`) ja tämä moottori kaikki
aikakatkaisevat tai muisti loppuu yhtä lailla. (Tämä moottori **ei** vuoda muistia — sen
renderöintikohtainen keko pysyy tasaisena; raja on yksinomaan graafin koko. Katso
[suorituskykynäkymä](/perf) mitatusta vertailusta.)

Tämän mittakaavan graafeille **renderöi kerran käännösaikana ja tarjoa syntynyt
`.svg`** sen sijaan, että asettelisit selaimessa joka katselukerralla — sama malli,
jota käyttäisit natiivin `dot`:in kanssakin, koska se on liian hidas ajettavaksi pyyntökohtaisesti.

Käännösaikaiset sivustoadapterit paketissa
[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (julkaistu NPM:ssä)
tekevät juuri tämän:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), käännösaikainen
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), käännösaikainen
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), käännösaikainen
- `@knowvah/dot-markdown-it` — kehyksestä riippumaton markdown-it-integraatio

Dynaamisille, käyttäjän toimittamille graafeille, joille käännösaikainen renderöinti ei ole vaihtoehto,
pidä interaktiivinen renderöinti kohtuullisen kokoisissa graafeissa ja välimuistita tuotettu SVG.
