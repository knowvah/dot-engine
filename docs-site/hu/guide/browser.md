---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Használat böngészőben

A @knowvah/dot-engine nem használ csak Node-ban elérhető API-kat, és biztonságosan
becsomagolható a böngészőhöz. Ez az oldal a két dolgot tárgyalja, amelyet a
kliensoldali futtatáskor tudni kell.

## Csomagolás

A könyvtár egyszerű ES-modulokból áll. Bármely modern csomagoló (Vite, esbuild,
Rollup, webpack) bele tudja foglalni. Nincs külsővé teendő futásidejű függőség,
és nincs hosztolandó WASM-artefaktum.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

Ennek az oldalnak a [játszótere](/hu/playground) pontosan ezt teszi — importálja a
motort, és a böngészőben hívja a `renderSvg`-t, szerverrel való oda-vissza
kommunikáció nélkül.

## Szövegmérés

A Graphviznek szükség van a szövegméretekre a címkék méretezéséhez. A
@knowvah/dot-engine ezt automatikusan kezeli:

- **A böngészőben** (ha létezik `document`), a szöveget a natív `<canvas>` 2D
  kontextussal méri — a gazdagéphez hűen, hiszen ugyanazt a betűtípust használja,
  amellyel a böngésző az SVG-t rendereli.
- **Node-ban** alapértelmezés szerint a beépített **Estimate** mérőt használja —
  determinisztikus, fej nélküli futtatásra is biztonságos modellt, amely a Graphviz
  saját `estimate_textspan_size` függvényét tükrözi. A helyes elrendezéshez Node-ban
  nem kell `canvas` telepítése vagy betűtípusfájl; a gazdagéphez hűbb méretezéshez,
  natív canvas-függőség nélkül, opcionálisan elérhető egy hintelt keresőtáblás (LUT)
  mérő is. A mérő kifejezett kiválasztásáról lásd: [Szövegmérés](/hu/guide/text-measurement).

Az elrendezéshez egyik esetben sem kellenek betűtípusfájlok.

## Webes betűtípusok: miért fontos az előzetes betöltés

A címkeméretek a szöveg betűtípussal való méréséből származnak. Ha egy betűkészlet
`@font-face`-szel deklarált, de még nem töltődött be teljesen, a böngésző a
**tartalék** betűtípussal mér, és az elrendezés hibás lesz, amint megérkezik a
valódi betűtípus. Chromiumban, JetBrains Monóval mérve: egy címkedoboz **70,68 pt**
széles volt, ha a betűkészlet betöltése előtt mértek (tartalék), és **124,8 pt**,
miután betöltődött.

Az aszinkron belépési pontok (`renderSvgAsync`, `renderAsync`, `renderSvgInto`)
ezt elkerülik: összegyűjtik a betűtípusokat, amelyeket a gráf kérni fog,
betöltik őket a `document.fonts`-on keresztül, és csak azután futtatják az
elrendezést. A `renderSvgAsync` ugyanazt a 124,8 pt-ot adta, mint a betöltés utáni
mérés.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- A **`fontTimeoutMs`** (alapértelmezés: `3000`) egyetlen, az összes betűkészlet
  közös határideje, nem betűkészletenkénti.
- A **`fontIssues`** `{ face, reason }` elemek listája. A `reason: 'failed'` azt
  jelenti, hogy a betűkészlet hibázott (például 404), vagy a betöltése elutasításra
  került; a `reason: 'timeout'` azt, hogy a `fontTimeoutMs` alatt nem töltődött be.
  Mindkét esetben az elrendezés tartalék betűtípussal folytatódik. Minden problémát
  `console.warn` is jelez. A betűtípus-problémák soha nem utasítják el a Promise-t.
- **Korlátozás:** csak a `@font-face`-szel deklarált családok jelenthetők. A
  rendszerbetűtípus vagy az ismeretlen családnév „betöltöttként” oldódik fel (nincs
  mire várni), így egy elírt `fontname` soha nem kerül a `fontIssues` listájára.
- **Node-nak és Workereknek** nincs `document.fonts`-uk, ezért a betűtípusok
  előzetes betöltése kimarad, és a `fontIssues` értéke `[]`. A képkampók továbbra
  is működnek. Átadhat egy `fontSet`-et (bármit, aminek van `load(font)` metódusa)
  a sajátja megadásához.

## Renderelés egy oldalba: `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

A megadott azonosítójú elem gyermekeit a renderelt `<svg>`-vel (amelyet `element`
néven ad vissza) cseréli le, `DOMParser` és `importNode` használatával, soha nem
`innerHTML`-lel. A hiányzó azonosító `ERR_INVALID_ARG_VALUE` hibával utasítja el a
hívást. Az SVG alapértelmezés szerint megtisztított; adja át a `sanitize`-t a
saját tisztítója használatához, vagy a `trusted: true`-t a tisztítás kihagyásához.
Hogy a tisztító mit távolít el és mit hagy meg, azt a README „Security” szakasza
írja le; és tartson érvényben Content-Security-Policy-t.

## Külső képek: `setImageSizer`

Ha egy HTML-szerű címke külső képet tartalmaz (`<IMG SRC="logo.png"/>`), a
Graphviznek szüksége van a kép belső méreteire a cella méretezéséhez. (A csúcs
`image=` attribútuma nincs méretezve: a csúcs megtartja a normál dobozát, mint a
fej nélküli natív Graphvizben.) Mivel a könyvtár nem tud olvasni a fájlrendszerből,
Önnek kell megadnia egy méretezőt:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Ha a gráfjai soha nem hivatkoznak külső képekre, nem kell ezt meghívnia.
A képek aszinkron méretezéséhez (például betöltésükkel) adjon át a
`renderSvgAsync`-nek inkább egy aszinkron `imageSizer`-t; lásd: [Képek](/hu/guide/images).

## Web Workerek

Az elrendezés szinkron fut, ezért egy nagy gráf blokkolja azt a szálat, amelyen
fut. Futtassa Workerben, hogy az oldal reszponzív maradjon. A Workerben nincs
`document`, ezért a könyvtár `OffscreenCanvas`-szel méri a szöveget, az aszinkron
API pedig a Worker saját betűkészlet-halmazán (`self.fonts`) keresztül tölti be a
betűtípusokat.

A Workerben lévő betűtípusok különállnak az oldalétól: regisztrálja őket a
Workerben a `FontFace` API-val (a CSS `@font-face` szabályok nem érik el a
Workereket).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Workerben `renderSvgAsync`-kel (vagy `renderAsync`-kel) rendereljen, ne
`renderSvg`-vel, legalábbis amíg minden webes betűtípus be nem töltődött. A Chromium
akkor is a tartalék betűkészlettel méri tovább az adott betűtípus-sztringet, ha ezt
a pontos sztringet a Workerben a betűkészlet betöltése előtt mérték, még a betöltés
után is; az aszinkron API a mérés előtt tölti be a betűtípusokat, így sosem
ütközik ebbe.

## Mire ne számítson

A könyvtár célja az **SVG** (plusz a `json` / `xdot` / `dot` / képtérkép
szöveges formátumok). A rasztergrafikus kimenet (PNG/JPG), a PostScript/PDF és az
interaktív/grafikus háttérrendszerek hatókörön kívül esnek — ha más formátumra van
szüksége, alakítsa át az SVG-t a későbbi lépésben. A teljes hatókör-határt lásd:
[Ismert eltérések](/hu/divergences).

## Nagy gráfok: előrenderelés SVG-be

A nagyon nagy gráfok — nagyjából **>10 ezer csúcs vagy néhány MB DOT forráskód** —
futásidőben, a böngészőben gyakorlatilag nem rendezhetők el. Az elrendezés
(mincross, rangsorolás, spline-vezetés) szuperlineáris, így ez az upstream
Graphvizzel **közös méretplafon, nem erre a motorra jellemző korlátozás**: ilyen
bemeneteken a natív `dot`, a WASM-buildek (`@hpcc-js/wasm-graphviz`) és ez a motor
egyaránt időtúllépéssel vagy memóriahiánnyal ér véget. (Ez a motor **nem** szivárog
— renderelésenkénti heapje állandó; a korlát kizárólag a gráf mérete. A mért
összehasonlítást lásd a [teljesítmény-irányítópulton](/perf).)

Ekkora gráfoknál **egyszer, build időben renderelje meg, és a kapott `.svg`-t
szolgálja ki**, ahelyett hogy a böngészőben minden megtekintéskor elrendezné — ugyanez
a minta, amelyet natív `dot`-tal is használna, mivel az túl lassú ahhoz, hogy
kérésenként futtassák.

A [knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) build idejű
webhelyadapterei (az NPM-en publikálva) pontosan ezt teszik:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), build időben
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), build időben
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), build időben
- `@knowvah/dot-markdown-it` — keretrendszer-független markdown-it integráció

A dinamikus, felhasználó által megadott gráfoknál, ahol a build idejű renderelés
nem opció, tartsa az interaktív renderelést ésszerű méretű gráfokra, és
gyorsítótárazza a kibocsátott SVG-t.
