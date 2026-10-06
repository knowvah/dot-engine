---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Použití v prohlížeči

@knowvah/dot-engine nepoužívá žádná API určená jen pro Node a lze ho bezpečně zabalit pro prohlížeč. Tato
stránka pokrývá dvě věci, které je třeba znát při běhu na straně klienta.

## Bundling

Knihovna jsou obyčejné moduly ES. Zahrnout ji může libovolný moderní bundler (Vite, esbuild, Rollup,
webpack). Nejsou žádné závislosti za běhu, které by bylo třeba externalizovat, a žádné
artefakty WASM, které by bylo třeba hostovat.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

[Hřiště](/cs/playground) na této stránce dělá přesně tohle — importuje
modul a volá `renderSvg` v prohlížeči, bez komunikace se serverem.

## Měření textu

Graphviz potřebuje rozměry textu, aby určil velikost popisků. @knowvah/dot-engine to řeší
automaticky:

- **V prohlížeči** (když existuje `document`) měří text pomocí
  nativního 2D kontextu `<canvas>` — věrně hostiteli, protože jde o stejné písmo,
  kterým prohlížeč vykresluje SVG.
- **V Node** se ve výchozím nastavení používá vestavěný měřič **Estimate** —
  deterministický model bezpečný pro prostředí bez displeje, který zrcadlí vlastní
  `estimate_textspan_size` z Graphviz. Ke správnému rozvržení v Node není třeba instalovat
  `canvas` ani soubory písem; k dispozici je také jako volitelná možnost měřič
  s hintovanou vyhledávací tabulkou (LUT) pro bližší velikosti věrné hostiteli bez nativní
  závislosti na canvasu. Jak měřič vybrat explicitně, viz [Měření textu](/cs/guide/text-measurement).

K rozvržení nejsou v žádném případě potřeba soubory písem.

## Webová písma: proč záleží na předběžném načtení

Velikosti popisků vycházejí z měření textu určitým písmem. Pokud je řez deklarován
pomocí `@font-face`, ale ještě se nedokončilo jeho načítání, prohlížeč měří místo toho
**záložním** písmem a po příchodu skutečného písma je rozvržení špatně.
Naměřeno v Chromiu s JetBrains Mono: rámeček popisku byl **70,68 pt** široký, když se
měřilo před načtením řezu (záložní písmo), a **124,8 pt** po jeho načtení.

Asynchronní vstupní body (`renderSvgAsync`, `renderAsync`, `renderSvgInto`) tomu
předcházejí: shromáždí písma, která graf bude požadovat, načtou je přes
`document.fonts` a teprve poté spustí rozvržení. `renderSvgAsync` dal
stejných 124,8 pt jako měření po načtení.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (výchozí `3000`) je jedna lhůta sdílená všemi řezy, nikoli
  lhůta na řez.
- **`fontIssues`** je seznam `{ face, reason }`. `reason: 'failed'` znamená, že
  řez skončil chybou (například 404) nebo jeho načtení bylo odmítnuto; `reason: 'timeout'`
  znamená, že se nenačetl do `fontTimeoutMs`. V obou případech rozvržení pokračuje
  se záložním písmem. Každý problém se navíc vypíše přes `console.warn`. Problémy s písmy nikdy
  neodmítnou promise.
- **Omezení:** hlásit lze jen rodiny deklarované pomocí `@font-face`.
  Systémové písmo nebo neznámý název rodiny se vyhodnotí jako „načteno“ (není na co
  čekat), takže chybně napsaný `fontname` se v `fontIssues` nikdy neobjeví.
- **Node a Workery** nemají `document.fonts`, takže se předběžné načítání písem přeskočí a
  `fontIssues` je `[]`. Háčky pro obrázky dál fungují. Můžete předat `fontSet`
  (cokoli s metodou `load(font)`) a dodat vlastní.

## Vykreslení do stránky: `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

Nahradí potomky prvku s daným id vykresleným
`<svg>` (vráceným jako `element`), a to pomocí `DOMParser` a `importNode`, nikdy ne
přes `innerHTML`. Chybějící id odmítne s `ERR_INVALID_ARG_VALUE`. SVG se
ve výchozím nastavení čistí; předejte `sanitize`, chcete-li použít vlastní čistič, nebo `trusted: true`,
chcete-li čištění přeskočit. Co čistič odstraňuje a ponechává, najdete v sekci „Security“ v README;
a ponechte zavedenou Content-Security-Policy.

## Externí obrázky: `setImageSizer`

Když popisek ve stylu HTML obsahuje externí obrázek
(`<IMG SRC="logo.png"/>`), Graphviz potřebuje vlastní rozměry tohoto obrázku, aby
určil velikost buňky. (Atribut `image=` uzlu se neměří: uzel si ponechá svůj
běžný rámeček, stejně jako v nativním Graphviz bez displeje.) Protože knihovna nemůže
číst souborový systém, dodáte měřič:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Pokud vaše grafy nikdy neodkazují na externí obrázky, tuto funkci volat nemusíte.
Chcete-li velikosti obrázků zjišťovat asynchronně (například jejich načtením), předejte místo toho asynchronní
`imageSizer` do `renderSvgAsync`; viz [Obrázky](/cs/guide/images).

## Web Workery

Rozvržení běží synchronně, takže velký graf zablokuje vlákno, na kterém běží. Spusťte
ho ve Workeru, aby stránka zůstala responzivní. Uvnitř Workeru není
`document`, takže knihovna měří text pomocí `OffscreenCanvas` a
asynchronní API načítá písma přes vlastní sadu písem Workeru (`self.fonts`).

Písma ve Workeru jsou oddělená od písem stránky: registrujte je ve Workeru
pomocí API `FontFace` (pravidla CSS `@font-face` do Workerů nedosáhnou).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Ve Workeru vykreslujte pomocí `renderSvgAsync` (nebo `renderAsync`), nikoli `renderSvg`,
alespoň dokud se nenačte každé webové písmo. Chromium nadále měří řetězec písma
záložním řezem, pokud byl přesně tento řetězec ve Workeru změřen dříve, než se
řez načetl, i po jeho načtení; asynchronní API načítá písma dříve, než
měří, takže na to nikdy nenarazí.

## Co nečekat

Knihovna míří na **SVG** (plus textové formáty `json` / `xdot` / `dot` / mapa obrázku).
Rastrový výstup (PNG/JPG), PostScript/PDF a interaktivní/GUI backendy
jsou mimo rozsah — potřebujete-li jiný formát, převeďte SVG následně. Úplnou hranici rozsahu najdete ve
[Známých odchylkách](/cs/divergences).

## Velké grafy: předem vykreslit do SVG

Velmi velké grafy — zhruba **>10 tis. uzlů nebo několik MB zdrojového kódu DOT** — je
nepraktické rozvrhovat za běhu v prohlížeči. Rozvržení (mincross, určování ranků, vedení
splinů) je nadlineární, takže jde o **strop měřítka sdílený s
upstream Graphviz, nikoli omezení specifické pro tento modul**: u takových vstupů
nativní `dot`, sestavení WASM (`@hpcc-js/wasm-graphviz`) i tento modul všechny
narazí na časový limit nebo jim dojde paměť. (Tento modul **neuniká** — jeho
halda na jedno vykreslení je plochá; limitem je výhradně velikost grafu. Naměřené srovnání viz
[dashboard výkonu](/perf).)

U grafů takového rozsahu **vykreslete jednou při sestavení a servírujte výsledné
`.svg`**, místo abyste rozvrhovali v prohlížeči při každém zobrazení — stejný vzor,
jaký byste použili i s nativním `dot`, protože ten je příliš pomalý na spuštění při každém požadavku.

Adaptéry webů pro sestavení v
[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (publikované na NPM)
dělají přesně toto:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), při sestavení
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), při sestavení
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), při sestavení
- `@knowvah/dot-markdown-it` — integrace markdown-it nezávislá na frameworku

U dynamických grafů dodaných uživatelem, kde vykreslení při sestavení nepřipadá v úvahu,
omezte interaktivní vykreslování na grafy rozumné velikosti a vydané SVG ukládejte do mezipaměti.
