---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Notkun í vafra

@knowvah/dot-engine notar engin API sem eru bundin við Node og er óhætt að pakka fyrir vafrann. Þessi
síða fjallar um þau tvö atriði sem gott er að vita þegar keyrt er hjá notanda.

## Pökkun

Safnið er venjulegar ES-einingar. Hvaða nútímapakkari sem er (Vite, esbuild, Rollup,
webpack) getur tekið það með. Það eru engin keyrsluháð söfn til að útiloka og engir
WASM-gripir til að hýsa.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

[Sandkassi](/is/playground) þessa vefs gerir nákvæmlega þetta — hann flytur inn
vélina og kallar á `renderSvg` í vafranum, án ferðar til þjóns.

## Textamæling

Graphviz þarf stærðir texta til að ákvarða stærð merkja. @knowvah/dot-engine sér um þetta
sjálfkrafa:

- **Í vafranum** (þegar `document` er til) mælir það texta með
  innbyggða `<canvas>` 2D-samhenginu — sem fylgir hýsilnum, því það er sama letrið og
  vafrinn teiknar SVG-myndina með.
- **Í Node** notar það sjálfgefið innbyggða **Estimate**-mælinn — ákvarðandi
  líkan sem er óhætt að keyra án skjás og speglar `estimate_textspan_size` í Graphviz sjálfu.
  Engin uppsetning á `canvas` og engar leturskrár þarf til að
  fá rétta uppsetningu í Node; mælir með tilsniðinni uppflettitöflu (LUT) er einnig
  í boði sem valkostur til að fá nær hýsilnum stærðir án innbyggðs
  canvas-háðs. Sjá [Textamæling](/is/guide/text-measurement) um hvernig
  á að velja mæli með skýrum hætti.

Engar leturskrár þarf til uppsetningar í neinu tilviki.

## Vefletur: hvers vegna forhleðsla skiptir máli

Stærðir merkja koma úr því að mæla texta með letri. Ef leturgerð er lýst með
`@font-face` en hefur ekki lokið við að hlaðast mælir vafrinn með
**vara**letrinu í staðinn og uppsetningin verður röng þegar rétta letrið berst.
Mælt í Chromium með JetBrains Mono: merkjakassi var **70,68 pt** á breidd þegar
hann var mældur áður en leturgerðin hlóðst (varaletur) og **124,8 pt** eftir að hún hafði hlaðist.

Ósamstilltu inngangspunktarnir (`renderSvgAsync`, `renderAsync`, `renderSvgInto`) forðast
þetta: þeir safna letrunum sem grafið mun biðja um, hlaða þeim í gegnum
`document.fonts` og keyra uppsetninguna fyrst þá. `renderSvgAsync` skilaði
sömu 124,8 pt og mæling eftir hleðslu.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (sjálfgefið `3000`) er einn frestur sem allar leturgerðir deila, ekki
  fyrir hverja leturgerð.
- **`fontIssues`** er listi af `{ face, reason }`. `reason: 'failed'` þýðir að
  leturgerðin féll (til dæmis 404) eða hleðslu hennar var hafnað; `reason: 'timeout'`
  þýðir að hún hafði ekki hlaðist innan `fontTimeoutMs`. Í báðum tilvikum heldur uppsetning áfram
  með varaletri. Hvert vandamál er einnig skrifað með `console.warn`. Leturvandamál hafna aldrei
  fyrirheitinu (promise).
- **Takmörkun:** aðeins er hægt að skýra frá leturfjölskyldum sem lýst er með `@font-face`.
  Kerfisletur eða óþekkt nafn á leturfjölskyldu telst „hlaðið“ (það er ekkert
  að bíða eftir), svo `fontname` með stafsetningarvillu birtist aldrei í `fontIssues`.
- **Node og Workers** hafa ekki `document.fonts`, svo forhleðslu leturs er sleppt og
  `fontIssues` er `[]`. Myndakrókar virka áfram. Þú getur gefið `fontSet`
  (hvað sem er með `load(font)`) til að leggja til þitt eigið.

## Teikna inn á síðu: `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

Það skiptir út börnum þáttarins með gefnu auðkenni fyrir teiknaða
`<svg>` (skilað sem `element`), með `DOMParser` og `importNode`, aldrei
`innerHTML`. Auðkenni sem vantar hafnar með `ERR_INVALID_ARG_VALUE`. SVG-myndin er
hreinsuð sjálfgefið; gefðu `sanitize` til að nota þinn eigin hreinsara eða `trusted: true`
til að sleppa hreinsun. Sjá kaflann „Security“ í README um hvað hreinsarinn
fjarlægir og heldur, og hafðu Content-Security-Policy í gildi.

## Ytri myndir: `setImageSizer`

Þegar HTML-líkt merki inniheldur ytri mynd
(`<IMG SRC="logo.png"/>`) þarf Graphviz innbyggðar víddir myndarinnar til að
ákvarða stærð hólfsins. (Eigindið `image=` á hnút er ekki mælt: hnúturinn heldur
venjulegum kassa sínum, eins og í innbyggðu Graphviz án skjás.) Þar sem safnið getur ekki
lesið skráakerfið gefur þú mæli:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Ef grafin þín vísa aldrei í ytri myndir þarftu ekki að kalla á þetta.
Til að mæla myndir ósamstillt (til dæmis með því að hlaða þeim) skaltu gefa ósamstilltan
`imageSizer` til `renderSvgAsync` í staðinn; sjá [Myndir](/is/guide/images).

## Web Workers

Uppsetning keyrir samstillt, svo stórt graf stíflar þráðinn sem það keyrir á. Keyrðu
það í Worker til að halda síðunni svarandi. Inni í Worker er ekkert
`document`, svo safnið mælir texta með `OffscreenCanvas` og
ósamstillta API-ið hleður letri í gegnum letursafn Workersins sjálfs (`self.fonts`).

Letur í Worker eru aðskilin frá letrum síðunnar: skráðu þau í Workernum
með `FontFace`-API-inu (CSS-reglur `@font-face` ná ekki til Workers).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Teiknaðu með `renderSvgAsync` (eða `renderAsync`) í Worker, ekki `renderSvg`,
að minnsta kosti þar til hvert vefletur hefur hlaðist. Chromium heldur áfram að mæla leturstreng
með varaleturgerðinni ef nákvæmlega þessi strengur var mældur í Workernum áður en
leturgerðin hlóðst, jafnvel eftir að hún hefur hlaðist; ósamstillta API-ið hleður letri áður en það
mælir, svo það lendir aldrei í þessu.

## Við hverju má ekki búast

Safnið beinist að **SVG** (auk textasniðanna `json` / `xdot` / `dot` / myndakort).
Punktamyndaúttak (PNG/JPG), PostScript/PDF og gagnvirkir/myndrænir bakendar
eru utan umfangs — umbreyttu SVG-myndinni síðar ef þú þarft annað snið. Sjá
[Þekkt frávik](/is/divergences) fyrir fullu umfangsmörkin.

## Stór gröf: forteiknaðu á SVG

Mjög stór gröf — grófleg mörk **>10 þús. hnútar eða nokkur MB af DOT-frumkóða** — er
óraunhæft að raða upp á keyrslutíma í vafranum. Uppsetning (mincross, þrepun,
splínuleiðing) er ofurlínuleg, svo þetta er **sameiginlegt þakmark á kvarða með upprunalega
Graphviz, ekki takmörkun sértæk fyrir þessa vél**: á slíku inntaki renna innbyggða `dot`,
WASM-byggingarnar (`@hpcc-js/wasm-graphviz`) og þessi vél öll út á tíma eða verða uppiskroppa með
minni. (Þessi vél lekur **ekki** — haugur hennar fyrir hverja teikningu er flatur; mörkin eru eingöngu
stærð grafsins. Sjá
[afkastayfirlitið](/perf) fyrir mældan samanburð.)

Fyrir gröf á þeim kvarða **teiknaðu einu sinni við byggingu og berðu fram `.svg`-skrána**
sem út kemur í stað þess að raða upp í vafranum við hverja birtingu — sama mynstur og
þú myndir nota jafnvel með innbyggðu `dot`, þar sem það er of hægt til að keyra fyrir hverja beiðni.

Millistykkin fyrir vefi við byggingu í
[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (gefin út á NPM)
gera einmitt þetta:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), við byggingu
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), við byggingu
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), við byggingu
- `@knowvah/dot-markdown-it` — markdown-it-samþætting óháð ramma

Fyrir kvik gröf frá notendum þar sem teikning við byggingu er ekki valkostur
skaltu halda gagnvirkri teikningu við hæfilega stór gröf og geyma SVG-úttakið í skyndiminni.
