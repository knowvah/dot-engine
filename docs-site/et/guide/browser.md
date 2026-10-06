---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Kasutamine brauseris

@knowvah/dot-engine ei kasuta ühtegi ainult Node'ile mõeldud API-t ja seda on ohutu brauseri jaoks
komplekteerida. See leht käsitleb kahte asja, mida kliendipoolsel käitamisel teada tasub.

## Komplekteerimine

Teek on tavalised ES-moodulid. Iga tänapäevane komplekteerija (Vite, esbuild, Rollup,
webpack) saab selle kaasata. Väljajätmist vajavaid käitusaegseid sõltuvusi ei ole ja
majutada pole vaja ühtki WASM-artefakti.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

Selle saidi enda [mänguväljak](/et/playground) teeb täpselt seda — see impordib
mootori ja kutsub brauseris välja `renderSvg`, ilma serveripöördumiseta.

## Teksti mõõtmine

Graphviz vajab sildide suuruse määramiseks teksti mõõtmeid. @knowvah/dot-engine
tegeleb sellega automaatselt:

- **Brauseris** (kui `document` on olemas) mõõdab see teksti
  natiivse `<canvas>` 2D-kontekstiga — hostiga kooskõlas, sest see on sama font,
  millega brauser SVG-d renderdab.
- **Node'is** kasutab see vaikimisi sisseehitatud **Estimate**-mõõtjat —
  deterministlikku, peata keskkonnas ohutut mudelit, mis peegeldab Graphvizi enda
  `estimate_textspan_size`. Õige paigutuse saamiseks Node'is ei ole vaja ei
  `canvas`-i paigaldada ega fontifaile; valikuliselt on saadaval ka vihjestatud
  otsingutabeli (LUT) mõõtja, mis annab hostile lähedasema mõõdu ilma natiivse
  canvas-sõltuvuseta. Mõõtja selgesõnalise valimise kohta vt
  [Teksti mõõtmine](/et/guide/text-measurement).

Paigutuseks ei ole mingil juhul fontifaile vaja.

## Veebifondid: miks eellaadimine loeb

Sildi suurused tulevad teksti mõõtmisest fondiga. Kui kirjatüüp on deklareeritud
`@font-face`-iga, kuid pole veel laadimist lõpetanud, mõõdab brauser hoopis
**varufondiga** ja paigutus on vale, kui päris font kohale jõuab.
Chromiumis JetBrains Monoga mõõdetuna oli sildikasti laius **70,68 pt**, kui
mõõdeti enne kirjatüübi laadimist (varufont), ja **124,8 pt** pärast selle laadimist.

Asünkroonsed sisenemispunktid (`renderSvgAsync`, `renderAsync`, `renderSvgInto`) väldivad
seda: need koguvad fondid, mida graaf küsib, laadivad need läbi
`document.fonts` ja alles siis käivitavad paigutuse. `renderSvgAsync` andis
sama 124,8 pt kui mõõtmine pärast laadimist.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (vaikimisi `3000`) on üks kõigi kirjatüüpide ühine tähtaeg, mitte
  kirjatüübi kohta.
- **`fontIssues`** on `{ face, reason }` loend. `reason: 'failed'` tähendab, et
  kirjatüüp ebaõnnestus (näiteks 404) või selle laadimine lükati tagasi; `reason: 'timeout'`
  tähendab, et see ei olnud `fontTimeoutMs` jooksul laadinud. Mõlemal juhul jätkub paigutus
  varufondiga. Iga probleem logitakse ka `console.warn`-iga. Fondiprobleemid ei lükka
  lubadust kunagi tagasi.
- **Piirang:** teatada saab ainult `@font-face`-iga deklareeritud kirjaperedest.
  Süsteemifont või tundmatu kirjapere nimi lahendub kui „laaditud“ (pole midagi,
  mida oodata), seega valesti kirjutatud `fontname` ei ilmu kunagi `fontIssues` loendisse.
- **Node'is ja Workeris** ei ole `document.fonts`-i, seega fondi eellaadimine jäetakse vahele ja
  `fontIssues` on `[]`. Pildikonksud töötavad endiselt. Oma kirjatüüpide andmiseks saate anda
  `fontSet`-i (mis tahes objekti, millel on `load(font)`).

## Lehele renderdamine: `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

See asendab antud id-ga elemendi lapsed renderdatud
`<svg>`-ga (tagastatakse kui `element`), kasutades `DOMParser`-it ja `importNode`-i, mitte kunagi
`innerHTML`-i. Puuduv id lükatakse tagasi veaga `ERR_INVALID_ARG_VALUE`. SVG
puhastatakse vaikimisi; omaenda puhastaja kasutamiseks andke `sanitize` või
`trusted: true`, et puhastamine vahele jätta. Mida puhastaja eemaldab ja mida säilitab, vaadake
README „Security“ jaotisest, ning hoidke kehtivas Content-Security-Policy.

## Välispildid: `setImageSizer`

Kui HTML-laadne silt sisaldab välispilti
(`<IMG SRC="logo.png"/>`), vajab Graphviz lahtri suuruse määramiseks selle pildi omamõõtmeid.
(Sõlme `image=`-atribuuti ei mõõdeta: sõlm säilitab oma
tavalise kasti, nagu peata natiivses Graphvizis.) Kuna teek ei saa
failisüsteemi lugeda, annate mõõtja ise:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Kui teie graafid ei viita kunagi välispiltidele, ei pea te seda kutsuma.
Piltide asünkroonseks mõõtmiseks (näiteks neid laadides) andke selle asemel asünkroonne
`imageSizer` funktsioonile `renderSvgAsync`; vt [Pildid](/et/guide/images).

## Web Workerid

Paigutus töötab sünkroonselt, seega suur graaf blokeerib lõime, millel see töötab. Käitage
seda Workeris, et leht püsiks reageerimisvõimeline. Workeri sees ei ole
`document`-i, seega mõõdab teek teksti `OffscreenCanvas`-iga ja
asünkroonne API laadib fonte Workeri enda fondikomplekti (`self.fonts`) kaudu.

Workeri fondid on lehe omadest eraldi: registreerige need Workeris
`FontFace` API-ga (CSS-i `@font-face` reeglid Workeriteni ei jõua).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Renderdage Workeris funktsiooniga `renderSvgAsync` (või `renderAsync`), mitte `renderSvg`,
vähemalt seni, kuni iga veebifont on laadinud. Chromium jätkab fondistringi mõõtmist
varukirjatüübiga, kui seda täpset stringi mõõdeti Workeris enne
kirjatüübi laadimist, isegi pärast selle laadimist; asünkroonne API laadib fondid enne
mõõtmist ega puutu seega sellesse kunagi kokku.

## Mida mitte oodata

Teek on suunatud **SVG-le** (pluss tekstivormingutele `json` / `xdot` / `dot` / pildikaart).
Rasterväljund (PNG/JPG), PostScript/PDF ning interaktiivsed/graafilised taustaprogrammid
jäävad ulatusest välja — kui vajate muud vormingut, teisendage SVG hilisemas etapis. Täieliku ulatuse piiri kohta vt
[Teadaolevad erinevused](/et/divergences).

## Suured graafid: renderdage eelnevalt SVG-ks

Väga suuri graafe — umbes **>10 000 sõlme või paar MB DOT-lähtekoodi** — ei ole
brauseris käitusajal praktiline paigutada. Paigutus (mincross, rankimine,
splainide marsruutimine) on superlineaarne, seega on see **skaalalagi, mis on jagatud
ülesvoolu Graphvizi, mitte sellele mootorile omaga**: sellistel sisenditel jäävad natiivne
`dot`, WASM-ehitised (`@hpcc-js/wasm-graphviz`) ja see mootor kõik võrdselt
ajalimiidist maha või jäävad mälust ilma. (See mootor **ei leki** — selle
renderduskordne hunnik on lame; piiriks on rangelt graafi suurus. Mõõdetud võrdlust vaadake
[jõudluse ülevaatest](/perf).)

Sellise mastaabiga graafide puhul **renderdage üks kord ehitusajal ja serveerige saadud
`.svg`**, selle asemel et paigutada brauseris igal vaatamisel — sama muster,
mida kasutaksite ka natiivse `dot`-iga, sest see on päringu kohta käitamiseks liiga aeglane.

Ehitusaegsed saidiadapterid kogumikus
[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (avaldatud NPM-is)
teevad täpselt seda:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), ehitusajal
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), ehitusajal
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), ehitusajal
- `@knowvah/dot-markdown-it` — raamistikust sõltumatu markdown-it-integratsioon

Dünaamiliste, kasutaja antud graafide jaoks, kus ehitusaegne renderdamine ei ole võimalik,
piirake interaktiivne renderdamine mõistliku suurusega graafidega ja puhverdage väljastatud SVG.
