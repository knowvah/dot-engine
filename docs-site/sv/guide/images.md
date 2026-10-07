---
sourceHash: 724c941cdb4449b62d97fc99fbcfbbd209d304f41b096bc7948b89c1c51b222b
---
# Bilder

En nod med `image="logo.png"` (eller en `<IMG SRC="logo.png">`-cell i en HTML-liknande
etikett) får som standard inte sina pixlar infogade. @knowvah/dot-engine skriver ut
källan **ordagrant**:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

Det som visar SVG:n — en webbläsares `<img>`/inbäddade `<svg>`, ett Electron-skal,
ett bygge av en statisk webbplats — löser själv upp den `href`:en. Den här sidan beskriver
hur den href:en dimensioneras under layouten, tre sätt att få pixlarna att
faktiskt synas, och vad vart och ett innebär för CSP.

## Så flödar bilder

1. Grafen deklarerar `image="logo.png"` på en nod, eller en HTML-liknande etikett
   innehåller en `<IMG>`-cell.
2. För en HTML-liknande `<IMG>`-cell behöver Graphviz bildens **egna
   bredd/höjd** för att dimensionera cellen innan något annat kan läggas ut — biblioteket
   rör aldrig filsystemet eller nätverket för att ta reda på det, så
   du registrerar en mätare (`setImageSizer`, beskriven i
   [Använd i webbläsaren](/sv/guide/browser) och igen nedan för Node). En nods
   `image=`-attribut dimensioneras **inte** av mätaren: precis som i huvudlös inbyggd
   Graphviz behåller noden sin vanliga ruta och bilden ritas in i den.
3. Layouten körs med de mått som din mätare returnerade för varje `<IMG>`.
4. SVG-emittern (`usershape()` i `src/render/svg.ts`) skriver
   `<image xlink:href="...">` med rutan som beräknades i steg 3. Som standard är
   `href` den råa `src`-strängen, XML-escapad, inget annat.
5. Valfritt — om du anropade `setImageResolver` och renderade med
   `{ inlineImages: true }` — skriver emittern i stället
   `xlink:href="data:<mime>;base64,<bytes>"`, en fristående `data:`-URI.
   Detta är ett tillägg; det är inget som inbyggd Graphviz gör.

Dimensionering och infogning är två oberoende, separat registrerade kopplingspunkter: du kan
dimensionera bilder utan att infoga dem (det vanliga fallet — hosta filen), eller göra
båda (fristående SVG).

## Dimensionering i Node respektive webbläsare

`setImageSizer` tar `(src: string) => { w: number; h: number } | null` och
anropas en gång per distinkt `image=`-/`<IMG>`-källa under layouten. Den är en
processglobal registrering, samma mönster som `setImageResolver` nedan — anropa
den en gång före `render()`/`renderSvg()`.

**Webbläsare** — mät den verkliga bilden, eftersom du redan har `Image` och
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

`setImageSizer` är en synkron callback — det finns ingen `await` i den —
så webbläsarvarianten förlöser måtten (via `decode()`) i en cache
innan layouten körs och läser sedan den cachen synkront.

**Node** — det finns ingen DOM-`Image`, och biblioteket läser inte
filsystemet åt dig. Antingen hårdkodar du kända mått, eller läser dem själv
(t.ex. från ett manifest, eller en lättviktig tolk för PNG-/JPEG-huvuden som du tillhandahåller) och
matar in resultatet på samma sätt:

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

Om dina grafer aldrig refererar till externa bilder kan du hoppa över detta helt.

## Asynkron mätare och hämtare (per rendering)

`setImageSizer` / `setImageResolver` är synkrona, processglobala
registreringar, så webbläsarmönstret ovan måste förvärma en cache. De asynkrona
ingångspunkterna tar krokarna **per anrop** och inväntar dem åt dig:

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

- Varje krok anropas **högst en gång per distinkt `src`**, parallellt, innan
  layouten startar. Motorn kör sedan sin vanliga synkrona layout mot de
  insamlade resultaten.
- En krok som **kastar eller avvisar** behandlas som en miss (`null`), precis som en
  synkron krok som returnerar `null`: storlek noll för mätaren, oförändrad `src` vidare
  för hämtaren.
- När en asynkron krok anges faller en miss **inte** tillbaka på den globala
  `setImageSizer` / `setImageResolver`. När den inte anges gäller de globala,
  som i `renderSvg`.
- Krokarna gäller bara den renderingen; ingenting globalt registreras.
- `imageResolver` anropas bara när `inlineImages` är `true`.
- `renderSvgInto` accepterar samma alternativ.

## Få bilden att synas

Dimensionering ger rätt layout; den får inte pixlarna att synas där
SVG:n än visas. Välj ett av tre tillvägagångssätt.

### 1. Hosta filen

Servera bilden på en URL (eller en sökväg relativt platsen där SVG:n
visas) som webbläsaren/konsumenten kan hämta. Detta är det enklaste alternativet och
kräver inget extra arbete vid rendering — men visningskontexten måste kunna
nå den ursprungsadressen, och om SVG:n visas någonstans med en strikt `img-src`-CSP
måste den ursprungsadressen tillåtlistas även där (se nedan).

### 2. Infoga som `data:`-URI

Använd T1:s infognings-API för att skapa en fristående SVG-sträng helt utan
externa hämtningar: `setImageResolver` levererar de råa byten, och
`render(g, 'svg', { inlineImages: true })` bäddar in dem.

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

`ImageResolver` får också returnera `{ bytes: Uint8Array; mime?: string }` när
du vill ange en MIME-typ uttryckligen (annars härleder emittern en
från källans filändelse — `.png` → `image/png`, `.svg` →
`image/svg+xml` och så vidare, med `application/octet-stream` som reserv för
okända ändelser). Anropa `setImageResolver(null)` för att rensa registreringen.

::: tip
Föredra infogning när SVG:n hamnar någonstans som inte kan hämta externa
resurser vid visningstillfället — e-postklienter, offlinedokumentation, en inbäddning med strikt CSP
eller var som helst där du vill ha en enda fristående sträng utan efterföljande
nätverksanrop. Priset är utdatans storlek: base64 ökar bildens storlek med ca 33 %, och
den dupliceras i varje SVG som refererar till den (ingen återanvändning av webbläsarcachen
mellan renderingar).
:::

`inlineImages` är som standard `false`; när det inte är satt är utdata byte-identisk med
passthrough-beteendet före infogningen. Det påverkar bara formatet `svg` — det har ingen effekt
på `json`/`xdot`/`dot`/andra textformat. En miss (ingen hämtare registrerad, eller
hämtaren returnerar `null` för den `src`) faller automatiskt tillbaka på den
oförändrade `src` — infogningen degraderar mjukt och kastar aldrig.

### 3. Basmappar i stil med `imagepath`

Den inbyggda Graphviz grafattribut `imagepath` talar om för C-binären en
sökmapp i stil med filsystem/`GDFONTPATH` att lösa relativa `image=`-värden
mot. @knowvah/dot-engine implementerar inte `imagepath` — porten läser aldrig bilddata
från disk själv, så det finns ingen sökväg att lösa mot
(se [Kända avvikelser](/sv/divergences) för hela omfattningsgränsen). Om dina
grafer använder relativa `image=`-sökvägar löser du dem mot din egen basmapp/-URL i
det lager som konstruerar DOT-källkoden eller i dina
`setImageSizer`-/`ImageResolver`-callbacks — båda får den råa `src`-strängen
exakt som den skrivits i grafen, så att sätta en basväg framför den
före uppslagning är ett normalt, sanktionerat mönster.

## Vägledning för CSP

Om dina grafer är användarlevererade (en lekplats, en inbäddning som renderar
godtycklig DOT) bör du tänka på sidans `img-src`-policy redan från början.

**Infogade bilder (`data:`-URI:er)** behöver bara:

```
img-src 'self' data:
```

Som ett HTTP-svarshuvud:

```
Content-Security-Policy: img-src 'self' data:
```

Eller som en meta-tagg på sidan som hostar SVG:n:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

Det är snävt — ingen extern bildvärd kontaktas någonsin, eftersom byten
redan är inbäddade i SVG-strängen.

**Hostade bilder (alternativ 1 ovan)** kräver däremot att visningskontexten
hämtar från var bilderna faktiskt ligger. Om en användarlevererad graf kan
referera till en godtycklig `image=`-URL är det ofta opraktiskt att tillåtlista varje möjlig värd,
så en lekplats-/inbäddningssida kan behöva något tillåtande:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
Gör aldrig `img-src *` (eller någon lika tillåtande `img-src`) till din **webbplatsövergripande**
standard. Avgränsa den till den specifika lekplats-/inbäddningssida som behöver rendera
godtyckliga användarlevererade grafer, behandla den som en medveten, dokumenterad
lättnad enbart för den sidan och håll varje annan sidas CSP snäv. En
tillåtande `img-src` låter en illasinnad graf läcka data via sidokanaler i bild-URL:er
(t.ex. genom att koda data i frågeparametrar mot en
värd som angriparen kontrollerar) eller läsa in oönskat fjärrinnehåll. Om du kontrollerar
bilduppsättningen, föredra infogning (`data:`) och behåll `img-src 'self'
data:` överallt.
:::

## Saknade bilder

Om `setImageSizer` returnerar `null` (eller ingen mätare är registrerad) för en
refererad källa följer @knowvah/dot-engine samma C-trogna väg som den inbyggda
Graphviz miss i `gvusershape`: det varnar och behandlar bilden som **storlek
noll**, vilket påverkar den nodruta som beräknas runt den. Om
`setImageResolver`/`inlineImages` används och hämtaren missar faller
emittern tillbaka på den oförändrade `src` i stället för att infoga — `href`
skrivs ändå, men den går inte att lösa upp om inte något annat på
sidan kan hämta den. Se [Kända avvikelser](/sv/divergences) för vad som ingår i och
ligger utanför omfattningen för bild-/rasterhantering i allmänhet.
