---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Použitie v prehliadači

@knowvah/dot-engine nepoužíva žiadne API určené iba pre Node a dá sa bezpečne zbaliť pre prehliadač. Táto
stránka pokrýva dve veci, ktoré treba vedieť pri behu na strane klienta.

## Zbaľovanie {#bundling}

Knižnica sú obyčajné moduly ES. Zahrnúť ju môže ktorýkoľvek moderný bundler (Vite, esbuild, Rollup,
webpack). Nie sú žiadne runtime závislosti, ktoré by bolo treba externalizovať, a žiadne
artefakty WASM, ktoré by bolo treba hostiť.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

[Ihrisko](/sk/playground) tohto webu robí presne toto — importuje
modul a volá `renderSvg` v prehliadači, bez komunikácie so serverom.

## Meranie textu {#text-measurement}

Graphviz potrebuje rozmery textu, aby mohol určiť veľkosť popiskov. @knowvah/dot-engine to rieši
automaticky:

- **V prehliadači** (keď existuje `document`) meria text pomocou
  natívneho 2D kontextu `<canvas>` — verne voči hostiteľovi, pretože ide o rovnaké písmo,
  akým prehliadač vykresľuje SVG.
- **V Node** sa štandardne používa vstavaný merač **Estimate** — deterministický
  model bezpečný pre prostredie bez displeja, ktorý odráža vlastnú funkciu Graphviz
  `estimate_textspan_size`. Na správne rozloženie v Node nie je potrebná inštalácia `canvas`
  ani súbory písem; ako voliteľná možnosť je k dispozícii aj merač s indexovanou vyhľadávacou
  tabuľkou (LUT) pre bližšie určenie veľkosti verné hostiteľovi bez natívnej
  závislosti na canvase. Ako merač zvoliť explicitne, nájdete v [Meranie textu](/sk/guide/text-measurement).

Na rozloženie nie sú v žiadnom prípade potrebné súbory písem.

## Webové písma: prečo záleží na predbežnom načítaní {#web-fonts-why-prefetching-matters}

Veľkosti popiskov vychádzajú z merania textu s písmom. Ak je rez deklarovaný
cez `@font-face`, ale ešte sa nedokončilo jeho načítanie, prehliadač meria namiesto neho
**záložným** písmom a rozloženie je po príchode skutočného písma nesprávne.
Namerané v Chromiu s písmom JetBrains Mono: rámček popisku mal šírku **70,68 pt**, keď sa
meral pred načítaním rezu (záložné písmo), a **124,8 pt** po jeho načítaní.

Asynchrónne vstupné body (`renderSvgAsync`, `renderAsync`, `renderSvgInto`) tomu predchádzajú:
zozbierajú písma, ktoré graf bude požadovať, načítajú ich cez
`document.fonts` a až potom spustia rozloženie. `renderSvgAsync` vytvoril
rovnakých 124,8 pt ako meranie po načítaní.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (štandardne `3000`) je jedna lehota spoločná pre všetky rezy, nie
  pre každý rez zvlášť.
- **`fontIssues`** je zoznam `{ face, reason }`. `reason: 'failed'` znamená, že
  rez skončil chybou (napríklad 404) alebo jeho načítanie bolo zamietnuté; `reason: 'timeout'`
  znamená, že sa nenačítal v rámci `fontTimeoutMs`. V oboch prípadoch rozloženie pokračuje
  so záložným písmom. Každý problém sa tiež vypíše cez `console.warn`. Problémy s písmami nikdy
  nezamietnu promise.
- **Obmedzenie:** nahlásiť sa dajú iba rodiny deklarované cez `@font-face`.
  Systémové písmo alebo neznámy názov rodiny sa vyhodnotí ako „načítané“ (nie je na čo
  čakať), takže nesprávne napísané `fontname` sa v `fontIssues` nikdy neuvedie.
- **Node a Workers** nemajú `document.fonts`, preto sa predbežné načítanie písiem vynechá a
  `fontIssues` je `[]`. Háčiky pre obrázky stále fungujú. Môžete odovzdať `fontSet`
  (čokoľvek s `load(font)`) a dodať si vlastný.

## Vykreslenie do stránky: `renderSvgInto` {#rendering-into-a-page-rendersvginto}

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

Potomkov prvku s daným id nahradí vykresleným
`<svg>` (vráteným ako `element`), pričom použije `DOMParser` a `importNode`, nikdy
nie `innerHTML`. Chýbajúce id zamietne promise s `ERR_INVALID_ARG_VALUE`. SVG sa
štandardne čistí; odovzdajte `sanitize`, ak chcete použiť vlastný čistič, alebo `trusted: true`,
ak čistenie chcete preskočiť. Čo čistič odstraňuje a čo ponecháva, nájdete v sekcii „Security“ v README;
ponechajte tiež zavedenú Content-Security-Policy.

## Externé obrázky: `setImageSizer` {#external-images-setimagesizer}

Keď HTML-like popisok obsahuje externý obrázok
(`<IMG SRC="logo.png"/>`), Graphviz potrebuje na určenie veľkosti bunky vlastné rozmery
tohto obrázka. (Atribút `image=` uzla sa nemeria: uzol si ponechá
svoj bežný rámček, ako v natívnom Graphviz bez displeja.) Keďže knižnica nemôže
čítať súborový systém, dodáte merač:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Ak vaše grafy nikdy neodkazujú na externé obrázky, toto nemusíte volať.
Ak chcete veľkosť obrázkov určovať asynchrónne (napríklad ich načítaním), odovzdajte namiesto toho asynchrónny
`imageSizer` do `renderSvgAsync`; pozrite si [Obrázky](/sk/guide/images).

## Web Workers {#web-workers}

Rozloženie beží synchrónne, takže veľký graf blokuje vlákno, na ktorom beží. Spustite ho
vo Worker, aby stránka zostala responzívna. Vo Worker nie je
`document`, takže knižnica meria text cez `OffscreenCanvas` a
asynchrónne API načíta písma cez vlastnú sadu písiem Workera (`self.fonts`).

Písma vo Worker sú oddelené od písiem stránky: zaregistrujte ich vo Worker
cez API `FontFace` (pravidlá CSS `@font-face` do Workerov nesiahajú).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Vo Worker vykresľujte cez `renderSvgAsync` (alebo `renderAsync`), nie `renderSvg`,
aspoň kým sa nenačíta každé webové písmo. Chromium pokračuje v meraní reťazca písma
so záložným rezom, ak sa presne tento reťazec vo Worker zmeral pred
načítaním rezu, a to aj po jeho načítaní; asynchrónne API načíta písma pred
meraním, takže na to nikdy nenarazí.

## Čo nečakať {#what-not-to-expect}

Knižnica cieli na **SVG** (plus textové formáty `json` / `xdot` / `dot` / mapa obrázka).
Rastrový výstup (PNG/JPG), PostScript/PDF a interaktívne/GUI backendy
sú mimo rozsahu — ak potrebujete iný formát, SVG skonvertujte následne. Úplnú hranicu rozsahu nájdete v
[Známych odchýlkach](/sk/divergences).

## Veľké grafy: vopred vykreslite do SVG {#large-graphs-pre-render-to-svg}

Veľmi veľké grafy — približne **>10 000 uzlov alebo niekoľko MB zdrojového kódu DOT** — sa
za behu v prehliadači nedajú prakticky rozložiť. Rozloženie (mincross, určovanie rankov,
vedenie splajnov) je superlineárne, takže ide o **strop škálovania spoločný
s upstream Graphviz, nie o obmedzenie špecifické pre tento modul**: pri takých vstupoch
natívny `dot`, buildy do WASM (`@hpcc-js/wasm-graphviz`) aj tento modul rovnako
prekročia časový limit alebo im dôjde pamäť. (Tento modul **neuniká** — halda
na jedno vykreslenie je plochá; limit je výlučne veľkosť grafu. Nameranú porovnávaciu hodnotu nájdete na
[dashboarde výkonu](/perf).)

Pri grafoch takého rozsahu **vykreslite raz pri buildu a servírujte výsledný
`.svg`**, namiesto rozloženia v prehliadači pri každom zobrazení — rovnaký vzor,
aký by ste použili aj s natívnym `dot`, keďže je príliš pomalý na spúšťanie pri každom požiadavku.

Adaptéry webov pre čas buildu v
[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (publikované na NPM)
robia presne toto:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), v čase buildu
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), v čase buildu
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), v čase buildu
- `@knowvah/dot-markdown-it` — integrácia markdown-it nezávislá od frameworku

Pri dynamických grafoch dodaných používateľom, kde vykreslenie v čase buildu nepripadá do úvahy,
obmedzte interaktívne vykresľovanie na grafy primeranej veľkosti a vyslané SVG cacheujte.
