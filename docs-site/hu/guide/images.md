---
sourceHash: 724c941cdb4449b62d97fc99fbcfbbd209d304f41b096bc7948b89c1c51b222b
---
# Képek

Az `image="logo.png"` attribútumú csúcs (vagy egy HTML-szerű címke
`<IMG SRC="logo.png">` cellája) képpontjait alapértelmezés szerint nem ágyazza be.
A @knowvah/dot-engine a forrást **szó szerint** kiadja:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

Bármi jeleníti is meg az SVG-t — böngészős `<img>`/beágyazott `<svg>`, Electron-héj,
statikus webhely buildje —, az maga oldja fel ezt a `href`-et. Ez az oldal azt
tárgyalja, hogyan kap méretet ez a href az elrendezés során, három módot arra, hogy
a képpontok ténylegesen megjelenjenek, és mindegyik CSP-vonzatait.

## Hogyan haladnak a képek

1. A gráf `image="logo.png"`-t deklarál egy csúcson, vagy egy HTML-szerű címke
   `<IMG>` cellát tartalmaz.
2. HTML-szerű `<IMG>` cellánál a Graphviznek szüksége van a kép **belső
   szélességére/magasságára** a cella méretezéséhez, mielőtt bármi mást elrendezhetne —
   a könyvtár ennek kiderítéséhez soha nem nyúl a fájlrendszerhez vagy a hálózathoz,
   ezért Ön regisztrál egy méretezőt (`setImageSizer`, tárgyalva a
   [Használat böngészőben](/hu/guide/browser) oldalon, és alább még egyszer Node-hoz).
   A csúcs `image=` attribútumát a méretező **nem** méretezi: a fej nélküli natív
   Graphvizhez hasonlóan a csúcs megtartja a normál dobozát, és a kép beléje rajzolódik.
3. Az elrendezés azokkal a méretekkel fut, amelyeket a méretezője az egyes `<IMG>`
   elemekhez visszaadott.
4. Az SVG-kibocsátó (a `src/render/svg.ts` `usershape()` függvénye) a 3. lépésben
   kiszámított dobozzal írja ki az `<image xlink:href="...">`-et. Alapértelmezés
   szerint a `href` a nyers `src` sztring, XML-escape-elve, semmi más.
5. Opcionálisan — ha meghívta a `setImageResolver`-t, és `{ inlineImages: true }`
   mellett renderelt — a kibocsátó ehelyett `xlink:href="data:<mime>;base64,<bájtok>"`
   értéket ír, egy önálló `data:` URI-t. Ez kiegészítés; a natív Graphviz ezt nem
   csinálja.

A méretezés és a beágyazás két független, külön regisztrált bővítési pont: méretezhet
képeket beágyazás nélkül (a gyakori eset — a fájlt hosztolja), vagy mindkettőt
(önálló SVG).

## Méretezés Node-ban és böngészőben

A `setImageSizer` `(src: string) => { w: number; h: number } | null` függvényt vár,
és az elrendezés során minden különböző `image=`/`<IMG>` forrásnál egyszer hívódik
meg. Folyamatszintű (globális) regisztráció, ugyanaz a minta, mint az alábbi
`setImageResolver`-nél — egyszer hívja meg a `render()`/`renderSvg()` előtt.

**Böngésző** — mérje meg a valódi képet, hiszen már megvan az `Image` és a
`decode()`:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

const cache = new Map<string, { w: number; h: number }>();

async function warmImageSizes(sources: string[]): Promise<void> {
  for (const src of sources) {
    const img = new Image();
    img.src = src;
    await img.decode();
    cache.set(src, { w: img.naturalWidth, h: img.naturalHeight });
  }
}

// setImageSizer itself must be synchronous, so pre-warm the cache first
// (e.g. await warmImageSizes([...]) before calling render/renderSvg).
setImageSizer((src) => cache.get(src) ?? null);
```

A `setImageSizer` szinkron visszahívás — nincs benne `await` —, ezért a böngészős
út az elrendezés futása előtt (a `decode()`-on keresztül) előre feloldja a
méreteket egy gyorsítótárba, majd szinkron módon abból olvas.

**Node** — nincs DOM `Image`, és a könyvtár nem olvassa Ön helyett a fájlrendszert.
Vagy írja be fixen az ismert méreteket, vagy olvassa ki őket maga (pl. egy
jegyzékből, vagy egy Ön által biztosított könnyű PNG/JPEG-fejléc-értelmezőből), és
ugyanígy adja át az eredményt:

```ts
import { setImageSizer } from '@knowvah/dot-engine';
import { readFileSync } from 'node:fs';

// Simplest: fixed dimensions known ahead of time.
setImageSizer((src) => (src === 'logo.png' ? { w: 64, h: 64 } : null));

// Or: derive dimensions in your app layer (disk, S3 head request, a
// manifest file you maintain) and hand back the result synchronously.
const manifest = new Map(
  Object.entries(JSON.parse(readFileSync('image-manifest.json', 'utf8'))),
);
setImageSizer((src) => (manifest.get(src) as { w: number; h: number }) ?? null);
```

Ha a gráfjai soha nem hivatkoznak külső képekre, hagyja ki ezt teljesen.

## Aszinkron méretező és feloldó (renderelésenként)

A `setImageSizer` / `setImageResolver` szinkron, folyamatszintű regisztráció, ezért a
fenti böngészős mintának elő kell melegítenie egy gyorsítótárat. Az aszinkron
belépési pontok a kampókat **hívásonként** veszik át, és Ön helyett megvárják őket:

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg } = await renderSvgAsync(
  'digraph { a [label=<<TABLE><TR><TD><IMG SRC="logo.png"/></TD></TR></TABLE>>] }',
  'dot',
  {
    imageSizer: async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return { w: img.naturalWidth, h: img.naturalHeight };
    },
    inlineImages: true,
    imageResolver: async (src) => {
      const res = await fetch(src);
      return { bytes: new Uint8Array(await res.arrayBuffer()), mime: res.headers.get('content-type') ?? undefined };
    },
  },
);
```

- Minden kampót **különböző `src`-nként legfeljebb egyszer** hív meg párhuzamosan,
  az elrendezés megkezdése előtt. A motor ezután a szokásos szinkron elrendezést
  futtatja a begyűjtött eredményeken.
- Az a kampó, amely **kivételt dob vagy elutasít**, találatmulasztásnak (`null`)
  számít, pontosan úgy, mint a `null`-t visszaadó szinkron kampó: a méretezőnél
  nulla méret, a feloldónál a nyers `src` átengedése.
- Ha aszinkron kampót adtak meg, a mulasztás **nem** esik vissza a globális
  `setImageSizer` / `setImageResolver`-re. Ha nem adtak meg, a globálisok érvényesek,
  mint a `renderSvg`-nél.
- A kampók csak arra az egy renderelésre vonatkoznak; semmi globális nem regisztrálódik.
- Az `imageResolver`-t csak akkor hívja meg, ha az `inlineImages` értéke `true`.
- A `renderSvgInto` ugyanezeket a beállításokat fogadja.

## A kép megjelenítése

A méretezés helyessé teszi az elrendezést; nem teszi láthatóvá a képpontokat ott,
ahol az SVG végül megjelenik. Válasszon a három megközelítés közül.

### 1. A fájl hosztolása

Szolgálja ki a képet egy URL-en (vagy az SVG megjelenítési helyéhez viszonyított
útvonalon), amelyet a böngésző/fogyasztó le tud kérni. Ez a legegyszerűbb
lehetőség, és nem igényel külön renderelési idejű munkát — de a megjelenítési
környezetnek el kell érnie azt a származási helyet, és ha az SVG-t szigorú `img-src`
CSP-vel rendelkező helyen mutatják, ott is engedélyezni kell azt a származást
(lásd alább).

### 2. Beágyazás `data:` URI-ként

Használja a T1 beágyazási API-ját, hogy egyetlen önálló SVG-sztringet állítson
elő külső lekérés nélkül: a `setImageResolver` szolgáltatja a nyers bájtokat, a
`render(g, 'svg', { inlineImages: true })` pedig beágyazza őket.

```ts
import { render, setImageResolver } from '@knowvah/dot-engine';
import type { ImageResolver } from '@knowvah/dot-engine';

const images = new Map<string, Uint8Array>([
  ['logo.png', /* Uint8Array of the PNG bytes, e.g. fetched or bundled */ new Uint8Array()],
]);

const resolver: ImageResolver = (src) => images.get(src) ?? null;

setImageResolver(resolver);

const svg = render(g, 'svg', { inlineImages: true });
```

Az `ImageResolver` `{ bytes: Uint8Array; mime?: string }` értéket is visszaadhat,
ha kifejezetten MIME-típust szeretne megadni (a kibocsátó egyébként a forrás
fájlkiterjesztéséből következtet — `.png` → `image/png`, `.svg` →
`image/svg+xml`, és így tovább, ismeretlen kiterjesztésnél az
`application/octet-stream`-re esve vissza). A regisztráció törléséhez
használja a `setImageResolver(null)`-t.

::: tip
Részesítse előnyben a beágyazást, ha az SVG olyan helyre utazik, amely a
megjelenítéskor nem tud külső erőforrásokat lekérni — levelezőkliensek,
offline dokumentáció, szigorú CSP-s beágyazás, vagy bárhol, ahol egyetlen
önálló sztringet szeretne utólagos hálózati kérés nélkül. Az ár a kimenet
mérete: a base64 a képet ~33%-kal megnöveli, és minden rá hivatkozó SVG-be
megkettőződik (nincs böngésző-gyorsítótár-újrahasznosítás a renderelések között).
:::

Az `inlineImages` alapértelmezése `false`; beállítás nélkül a kimenet bájtra azonos a
beágyazás előtti átengedéssel. Csak az `svg` formátumra hat — a
`json`/`xdot`/`dot`/egyéb szöveges formátumokra nincs hatása. A mulasztás (nincs
regisztrált feloldó, vagy a feloldó az adott `src`-re `null`-t ad) automatikusan
a nyers `src` átengedésére esik vissza — a beágyazás kecsesen romlik, soha nem dob
kivételt.

### 3. `imagepath`-stílusú alapkönyvtárak

A natív Graphviz `imagepath` gráfattribútuma megmondja a C binárisnak, melyik
fájlrendszer-/`GDFONTPATH`-stílusú keresési könyvtárhoz viszonyítva oldja fel a
relatív `image=` értékeket. A @knowvah/dot-engine nem implementálja az
`imagepath`-t — a portolás soha nem olvas képadatot a lemezről, így nincs mihez
viszonyítani az útvonalat (a teljes hatókör-határt lásd: [Ismert eltérések](/hu/divergences)).
Ha a gráfjai relatív `image=` útvonalakat használnak, oldja fel őket a saját alap
könyvtárához/URL-jéhez képest abban a rétegben, amely a DOT forráskódot
összeállítja, vagy a `setImageSizer`/`ImageResolver` visszahívásaiban — mindkettő
a nyers `src` sztringet kapja pontosan úgy, ahogy a gráfban le van írva, így az
alapútvonallal való előtagolás keresés előtt normális, jóváhagyott minta.

## CSP-útmutató

Ha a gráfjai felhasználó által megadottak (játszótér, tetszőleges DOT-ot renderelő
beágyazás), előre gondolja végig az oldal `img-src` szabályzatát.

**A beágyazott képekhez (`data:` URI-k)** elég:

```
img-src 'self' data:
```

HTTP-válaszfejlécként:

```
Content-Security-Policy: img-src 'self' data:
```

Vagy meta címkeként az SVG-t hosztoló oldalon:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

Ez szigorú — soha nem keresnek fel külső képhosztot, mert a bájtok már be vannak
ágyazva az SVG-sztringbe.

**A hosztolt képekhez (a fenti 1. lehetőség)** ezzel szemben a megjelenítési
környezetnek le kell kérnie a képeket onnan, ahol ténylegesen vannak. Ha egy
felhasználó által megadott gráf tetszőleges `image=` URL-re hivatkozhat, minden
lehetséges host engedélyezőlistára tétele gyakran kivitelezhetetlen, így egy
játszótér-/beágyazásoldalnak megengedőbb beállításra lehet szüksége:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
Soha ne tegye az `img-src *`-ot (vagy bármely hasonlóan megengedő `img-src`-t)
**webhely-szintű** alapértelmezéssé. Korlátozza arra a konkrét
játszótér-/beágyazásoldalra, amelynek tetszőleges, felhasználó által megadott
gráfokat kell renderelnie, kezelje szándékos, dokumentált lazításként csak arra az
oldalra, és tartsa szigorúan az összes többi oldal CSP-jét. A megengedő `img-src`
lehetővé teszi, hogy egy rosszindulatú gráf adatokat szivárogtasson ki
képURL-mellékcsatornákon át (pl. az adatokat lekérdezési paraméterekbe kódolva egy
támadó által felügyelt hoston), vagy nemkívánatos távoli tartalmat töltsön be. Ha Ön
irányítja a képkészletet, inkább a beágyazást (`data:`) válassza, és mindenhol
tartsa az `img-src 'self' data:`-t.
:::

## Hiányzó képek

Ha a `setImageSizer` `null`-t ad vissza (vagy nincs regisztrált méretező) egy
hivatkozott forrásra, a @knowvah/dot-engine ugyanazt a C-hű utat követi, mint a natív
Graphviz `gvusershape`-mulasztása: figyelmeztet, és a képet **nulla méretűnek**
tekinti, ami a körülötte kiszámított csúcsdoboz-elrendezésre hat. Ha a
`setImageResolver`/`inlineImages` játékban van, és a feloldó mulaszt, a kibocsátó
beágyazás helyett a nyers `src` átengedésére esik vissza — a `href` ekkor is
kiírásra kerül, csak nem oldódik fel, hacsak az oldalon valami más le nem tudja
kérni. A képek/raszterek kezelésének hatókörén belüli és kívüli részeiről
általánosságban lásd: [Ismert eltérések](/hu/divergences).
