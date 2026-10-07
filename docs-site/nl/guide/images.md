---
sourceHash: 724c941cdb4449b62d97fc99fbcfbbd209d304f41b096bc7948b89c1c51b222b
---
# Afbeeldingen

Een knoop met `image="logo.png"` (of een `<IMG SRC="logo.png">`-cel in een HTML-achtig label)
krijgt standaard zijn pixels niet ingesloten. @knowvah/dot-engine schrijft de
bron **letterlijk** weg:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

Wat de SVG ook weergeeft — een browser-`<img>`/inline-`<svg>`, een Electron-shell,
een build van een statische site — lost die `href` zelf op. Deze pagina behandelt
hoe die href tijdens de lay-out een afmeting krijgt, drie manieren om de pixels daadwerkelijk
zichtbaar te maken, en de CSP-gevolgen van elk daarvan.

## Hoe afbeeldingen doorlopen

1. De graaf declareert `image="logo.png"` op een knoop, of een HTML-achtig label
   bevat een `<IMG>`-cel.
2. Voor een HTML-achtige `<IMG>`-cel heeft Graphviz de **intrinsieke
   breedte/hoogte** van de afbeelding nodig om de cel te dimensioneren voordat iets anders kan worden ingedeeld — de
   bibliotheek raakt nooit het bestandssysteem of het netwerk aan om dit te achterhalen, dus
   registreert u een sizer (`setImageSizer`, behandeld in
   [Gebruik in de browser](/nl/guide/browser) en hieronder nogmaals voor Node). Het attribuut
   `image=` van een knoop wordt **niet** door de sizer gedimensioneerd: net als in headless native
   Graphviz behoudt de knoop zijn normale kader en wordt de afbeelding erin getekend.
3. De lay-out draait met de afmetingen die uw sizer voor elke `<IMG>` teruggaf.
4. De SVG-emitter (`usershape()` in `src/render/svg.ts`) schrijft
   `<image xlink:href="...">` met het in stap 3 berekende kader. Standaard is de
   `href` de ruwe `src`-string, XML-geëscaped, verder niets.
5. Optioneel — als u `setImageResolver` hebt aangeroepen en hebt gerenderd met
   `{ inlineImages: true }` — schrijft de emitter in plaats daarvan
   `xlink:href="data:<mime>;base64,<bytes>"`, een op zichzelf staande `data:`-URI.
   Dit is een toevoeging; het is niet iets wat native Graphviz doet.

Dimensioneren en inlinen zijn twee onafhankelijke, afzonderlijk geregistreerde koppelpunten: u kunt
afbeeldingen dimensioneren zonder ze in te lijnen (het gebruikelijke geval — het bestand hosten), of
beide doen (zelfstandige SVG).

## Dimensioneren in Node versus browser

`setImageSizer` neemt `(src: string) => { w: number; h: number } | null` en
wordt tijdens de lay-out eenmaal per afzonderlijke `image=`-/`<IMG>`-bron geraadpleegd. Het is een
procesbrede registratie, hetzelfde patroon als `setImageResolver` hieronder — roep het
eenmalig aan vóór `render()`/`renderSvg()`.

**Browser** — meet de echte afbeelding, aangezien u `Image` en
`decode()` al hebt:

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

`setImageSizer` is een synchrone callback — er staat geen `await` in —
dus het browserpad bepaalt de afmetingen vooraf (via `decode()`) in een cache
voordat de lay-out draait en leest die cache vervolgens synchroon.

**Node** — er is geen DOM-`Image`, en de bibliotheek leest het
bestandssysteem niet voor u. Codeer bekende afmetingen vast, of lees ze zelf uit
(bijv. uit een manifest, of een lichtgewicht PNG/JPEG-headerparser die u zelf levert) en
geef het resultaat op dezelfde manier door:

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

Verwijzen uw grafen nooit naar externe afbeeldingen, sla dit dan helemaal over.

## Asynchrone sizer en resolver (per rendering)

`setImageSizer` / `setImageResolver` zijn synchrone, procesbrede
registraties, dus het browserpatroon hierboven moet een cache vooraf vullen. De asynchrone
ingangen nemen de hooks **per aanroep** en wachten er voor u op:

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

- Elke hook wordt **hooguit eenmaal per afzonderlijke `src`** aangeroepen, parallel, vóór
  de start van de lay-out. De engine voert daarna zijn normale synchrone lay-out uit op de
  verzamelde resultaten.
- Een hook die **een fout gooit of afwijst**, wordt als een misser (`null`) behandeld, precies zoals een
  synchrone hook die `null` teruggeeft: afmeting nul voor de sizer, ruwe `src`-doorgave voor
  de resolver.
- Wanneer een asynchrone hook is opgegeven, valt een misser **niet** terug op de globale
  `setImageSizer` / `setImageResolver`. Als hij niet is opgegeven, gelden de globale hooks
  zoals in `renderSvg`.
- De hooks gelden alleen voor die ene rendering; er wordt niets globaal geregistreerd.
- `imageResolver` wordt alleen geraadpleegd wanneer `inlineImages` `true` is.
- `renderSvgInto` accepteert dezelfde opties.

## De afbeelding zichtbaar maken

Dimensioneren zorgt dat de lay-out klopt; het maakt de pixels niet zichtbaar op de plek waar de
SVG uiteindelijk wordt weergegeven. Kies een van drie werkwijzen.

### 1. Het bestand hosten

Serveer de afbeelding op een URL (of een pad relatief aan de plek waar de SVG wordt
weergegeven) die de browser/consument kan ophalen. Dit is de eenvoudigste optie en
vergt geen extra werk tijdens het renderen — maar de weergavecontext moet die herkomst
kunnen bereiken, en als de SVG wordt getoond op een plek met een strikte `img-src`-CSP, moet die
herkomst daar ook op de toelatingslijst staan (zie hieronder).

### 2. Inlinen als `data:`-URI

Gebruik de inlining-API van T1 om één zelfstandige SVG-string te produceren zonder
enige externe fetch: `setImageResolver` levert ruwe bytes aan, en
`render(g, 'svg', { inlineImages: true })` sluit ze in.

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

`ImageResolver` mag ook `{ bytes: Uint8Array; mime?: string }` teruggeven wanneer
u een MIME-type expliciet wilt opgeven (de emitter leidt er anders een af
uit de bestandsextensie van de bron — `.png` → `image/png`, `.svg` →
`image/svg+xml`, enzovoort, met terugval op `application/octet-stream` voor
onbekende extensies). Met `setImageResolver(null)` wist u de registratie.

::: tip
Geef de voorkeur aan inlinen wanneer de SVG ergens naartoe gaat waar externe
bronnen tijdens het weergeven niet kunnen worden opgehaald — e-mailclients, offlinedocumentatie, een insluiting met strikte CSP,
of overal waar u één zelfstandige string wilt zonder vervolgverzoek over het netwerk. De afweging is de uitvoergrootte: base64 blaast de afbeelding ~33% op, en
ze wordt gedupliceerd in elke SVG die ernaar verwijst (geen hergebruik van de browsercache
tussen renderings).
:::

`inlineImages` staat standaard op `false`; ongezet is de uitvoer byte-voor-byte identiek aan de
doorgave van vóór het inlinen. Het beïnvloedt alleen het formaat `svg` — het heeft geen effect
op `json`/`xdot`/`dot`/andere tekstformaten. Een misser (geen resolver geregistreerd, of
de resolver geeft `null` terug voor die `src`) valt automatisch terug op de ruwe `src`-doorgave —
inlinen degradeert soepel en gooit nooit een fout.

### 3. Basismappen in de stijl van `imagepath`

Het graafattribuut `imagepath` van native Graphviz vertelt de C-binary een zoekmap in de stijl van
bestandssysteem/`GDFONTPATH` waartegen relatieve `image=`-waarden worden opgelost.
@knowvah/dot-engine implementeert `imagepath` niet — de port leest zelf nooit afbeeldingsdata van schijf,
dus er is geen pad om tegen op te lossen
(zie [Bekende afwijkingen](/nl/divergences) voor de volledige reikwijdtegrens). Als uw
grafen relatieve `image=`-paden gebruiken, los ze dan op tegen uw eigen basismap/-URL in de
laag die de DOT-broncode opbouwt of in uw
`setImageSizer`-/`ImageResolver`-callbacks — beide ontvangen de ruwe `src`-string
precies zoals in de graaf geschreven, dus het voorzien van een basispad als string-prefix
vóór het opzoeken is een normaal, geoorloofd patroon.

## CSP-richtlijnen

Als uw grafen door gebruikers worden aangeleverd (een speeltuin, een insluiting die
willekeurige DOT rendert), denk dan vooraf na over het `img-src`-beleid van de pagina.

**Ingesloten afbeeldingen (`data:`-URI's)** hebben alleen nodig:

```
img-src 'self' data:
```

Als HTTP-responsheader:

```
Content-Security-Policy: img-src 'self' data:
```

Of als meta-tag in de pagina die de SVG host:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

Dat is strak — er wordt nooit contact gelegd met een externe afbeeldingshost, omdat de bytes
al in de SVG-string zijn ingesloten.

**Gehoste afbeeldingen (optie 1 hierboven)** daarentegen vereisen dat de weergavecontext
ophaalt van waar die afbeeldingen daadwerkelijk staan. Als een door een gebruiker aangeleverde graaf
naar een willekeurige `image=`-URL kan verwijzen, is het op de toelatingslijst zetten van elke mogelijke host
vaak onpraktisch, dus een speeltuin-/insluitpagina heeft mogelijk iets ruimers nodig:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
Maak `img-src *` (of een even ruim `img-src`) nooit uw **sitebrede**
standaard. Beperk het tot de specifieke speeltuin-/insluitpagina die willekeurige door gebruikers aangeleverde grafen
moet renderen, behandel het als een bewuste, gedocumenteerde
versoepeling voor alleen die pagina, en houd de CSP van elke andere pagina strak. Een
ruim `img-src` laat een kwaadaardige graaf gegevens weglekken via
zijkanalen in afbeeldings-URL's (bijv. gegevens coderen in queryparameters naar een
host van een aanvaller) of ongewenste externe inhoud laden. Als u de
afbeeldingenset beheert, geef dan de voorkeur aan inlinen (`data:`) en houd overal `img-src 'self'
data:` aan.
:::

## Ontbrekende afbeeldingen

Als `setImageSizer` `null` teruggeeft (of er geen sizer is geregistreerd) voor een
verwezen bron, volgt @knowvah/dot-engine hetzelfde C-getrouwe pad als een `gvusershape`-misser van
native Graphviz: het geeft een waarschuwing en behandelt de afbeelding als **afmeting
nul**, wat de lay-out van het kader van de knoop eromheen beïnvloedt. Als
`setImageResolver`/`inlineImages` in het spel is en de resolver mist, valt de
emitter terug op de ruwe `src`-doorgave in plaats van in te lijnen — de
`href` wordt nog steeds geschreven, maar lost niet op tenzij iets anders op de
pagina hem kan ophalen. Zie [Bekende afwijkingen](/nl/divergences) voor wat wel en niet onder
de verwerking van afbeeldingen/rasters in het algemeen valt.
