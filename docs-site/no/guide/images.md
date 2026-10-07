---
sourceHash: 724c941cdb4449b62d97fc99fbcfbbd209d304f41b096bc7948b89c1c51b222b
---
# Bilder

En node med `image="logo.png"` (eller en `<IMG SRC="logo.png">`-celle i en
HTML-lignende etikett) får ikke pikslene sine innebygd som standard. @knowvah/dot-engine sender ut
kilden **ordrett**:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

Det som viser SVG-en — en nettleser-`<img>`/innebygd `<svg>`, et Electron-skall, et
statisk nettsted som bygges — løser denne `href`-en selv. Denne siden dekker
hvordan href-en får størrelse under layout, tre måter å få pikslene til å
vises på, og CSP-konsekvensene av hver av dem.

## Slik flyter bilder gjennom

1. Grafen deklarerer `image="logo.png"` på en node, eller en HTML-lignende etikett
   inneholder en `<IMG>`-celle.
2. For en HTML-lignende `<IMG>`-celle trenger Graphviz bildets **egenmål for
   bredde/høyde** for å fastsette cellens størrelse før noe annet kan legges ut — biblioteket
   rører aldri filsystemet eller nettverket for å finne ut av dette, så
   du registrerer en måler (`setImageSizer`, omtalt i
   [Bruk i nettleseren](/no/guide/browser) og igjen nedenfor for Node). En nodes
   `image=`-attributt får **ikke** størrelse fra måleren: som i hodeløs native
   Graphviz beholder noden sin vanlige boks, og bildet tegnes inn i den.
3. Layout kjører med målene måleren din returnerte for hver `<IMG>`.
4. SVG-emitteren (`usershape()` i `src/render/svg.ts`) skriver
   `<image xlink:href="...">` med boksen som ble beregnet i trinn 3. Som standard er
   `href` den rå `src`-strengen, XML-escapet, ingenting annet.
5. Valgfritt — hvis du kalte `setImageResolver` og rendret med
   `{ inlineImages: true }` — skriver emitteren i stedet
   `xlink:href="data:<mime>;base64,<bytes>"`, en selvstendig `data:`-URI.
   Dette er et tillegg; det er ikke noe native Graphviz gjør.

Måling og innbygging er to uavhengige, separat registrerte koblingspunkter: du kan
måle bilder uten å bygge dem inn (det vanlige tilfellet — host filen), eller gjøre
begge deler (selvstendig SVG).

## Måling i Node vs. nettleser

`setImageSizer` tar `(src: string) => { w: number; h: number } | null` og
spørres én gang per distinkte `image=`-/`<IMG>`-kilde under layout. Det er en
prosessglobal registrering, samme mønster som `setImageResolver` nedenfor — kall
den én gang før `render()`/`renderSvg()`.

**Nettleser** — mål det virkelige bildet, siden du allerede har `Image` og
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

`setImageSizer` er en synkron callback — det finnes ingen `await` i den —
så nettleserstien forhåndsløser dimensjoner (via `decode()`) inn i en hurtigbuffer
før layout kjører, og leser deretter denne hurtigbufferen synkront.

**Node** — det finnes ingen DOM-`Image`, og biblioteket leser ikke
filsystemet for deg. Enten hardkoder du kjente dimensjoner, eller du leser dem selv
(f.eks. fra et manifest, eller en lettvekts PNG-/JPEG-headerparser du leverer) og
gir resultatet videre på samme måte:

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

Hvis grafene dine aldri refererer til eksterne bilder, hopp helt over dette.

## Asynkron måler og løser (per rendering)

`setImageSizer` / `setImageResolver` er synkrone, prosessglobale
registreringer, så nettlesermønsteret ovenfor må forhåndsfylle en hurtigbuffer. De asynkrone
inngangspunktene tar krokene **per kall** og venter på dem for deg:

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

- Hver krok kalles **høyst én gang per distinkte `src`**, parallelt, før
  layout starter. Motoren kjører deretter sin vanlige synkrone layout mot de
  innsamlede resultatene.
- En krok som **kaster eller avviser** behandles som bom (`null`), akkurat som en
  synkron krok som returnerer `null`: størrelse null for måleren, rå `src` videresendt for
  løseren.
- Når en asynkron krok er gitt, faller en bom **ikke** tilbake til den globale
  `setImageSizer` / `setImageResolver`. Når den ikke er gitt, gjelder globalene
  som i `renderSvg`.
- Krokene gjelder bare for den ene renderingen; ingenting globalt registreres.
- `imageResolver` spørres bare når `inlineImages` er `true`.
- `renderSvgInto` godtar de samme alternativene.

## Få bildet til å vises

Måling gir riktig layout; det får ikke pikslene til å vises uansett hvor
SVG-en til slutt vises. Velg en av tre tilnærminger.

### 1. Host filen

Server bildet på en URL (eller en sti relativt til der SVG-en
vises) som nettleseren/forbrukeren kan hente. Dette er det enkleste alternativet og
krever ingen ekstra arbeid ved rendering — men visningskonteksten må kunne
nå den opprinnelsen, og hvis SVG-en vises et sted med en streng `img-src`-
CSP, må den opprinnelsen også tillates der (se nedenfor).

### 2. Bygg inn som `data:`-URI

Bruk T1s innbyggings-API for å produsere én selvstendig SVG-streng uten
noen ekstern henting i det hele tatt: `setImageResolver` leverer råbytene, og
`render(g, 'svg', { inlineImages: true })` bygger dem inn.

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

`ImageResolver` kan også returnere `{ bytes: Uint8Array; mime?: string }` når
du vil angi en MIME-type eksplisitt (ellers utleder emitteren en
fra kildens filtype — `.png` → `image/png`, `.svg` →
`image/svg+xml`, og så videre, med `application/octet-stream` som
reserve for ukjente filtyper). Kall `setImageResolver(null)` for å fjerne registreringen.

::: tip
Foretrekk innbygging når SVG-en skal til et sted som ikke kan hente eksterne
ressurser ved visning — e-postklienter, frakoblet dokumentasjon, en innebygging med streng CSP,
eller overalt der du vil ha én selvstendig streng uten oppfølgende nettverks-
forespørsel. Prisen er utdatastørrelsen: base64 blåser opp bildet med ~33 %, og
det dupliseres i hver SVG som refererer til det (ingen gjenbruk av nettleserens
hurtigbuffer mellom renderinger).
:::

`inlineImages` er `false` som standard; når den ikke er satt, er utdataene byte-identiske med
videresendingen fra før innbygging fantes. Den påvirker bare formatet `svg` — den har ingen effekt
på `json`/`xdot`/`dot`/andre tekstformater. En bom (ingen løser registrert, eller
løseren returnerer `null` for den `src`-en) faller automatisk tilbake til rå `src`-
videresending — innbygging degraderer pent, den kaster aldri.

### 3. Basiskataloger i `imagepath`-stil

Native Graphviz' grafattributt `imagepath` forteller C-binærfilen en
søkekatalog i filsystem-/`GDFONTPATH`-stil som relative `image=`-
verdier skal løses mot. @knowvah/dot-engine implementerer ikke `imagepath` — porteringen
leser aldri bildedata fra disk selv, så det finnes ingen sti å løse mot
(se [Kjente avvik](/no/divergences) for hele avgrensningen). Hvis
grafene dine bruker relative `image=`-stier, løs dem mot din egen basekatalog/URL
i det laget som konstruerer DOT-kildekoden, eller i dine
`setImageSizer`-/`ImageResolver`-callbacks — begge mottar den rå `src`-strengen
nøyaktig slik den står i grafen, så det er et normalt, godkjent mønster å sette en basesti
foran strengen før oppslag.

## CSP-veiledning

Hvis grafene dine leveres av brukere (en lekeplass, en innebygging som rendrer
vilkårlig DOT), tenk på sidens `img-src`-policy fra starten.

**Innebygde bilder (`data:`-URI-er)** trenger bare:

```
img-src 'self' data:
```

Som en HTTP-responsheader:

```
Content-Security-Policy: img-src 'self' data:
```

Eller som en meta-tagg på siden som hoster SVG-en:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

Det er stramt — ingen ekstern bildevert kontaktes noen gang, fordi bytene
allerede er bygd inn i SVG-strengen.

**Hostede bilder (alternativ 1 ovenfor)** trenger derimot at visningskonteksten
henter fra der bildene faktisk ligger. Hvis en brukerlevert graf kan
referere til en vilkårlig `image=`-URL, er det ofte upraktisk å tillate hver mulig vert,
så en lekeplass-/innebyggingsside kan trenge noe permissivt:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
Gjør aldri `img-src *` (eller en like permissiv `img-src`) til **standard for hele nettstedet**.
Avgrens den til den spesifikke lekeplass-/innebyggingssiden som trenger å rendre
vilkårlige brukerleverte grafer, behandle den som en bevisst, dokumentert
lempning for den siden alene, og hold CSP-en på alle andre sider stram. En
permissiv `img-src` lar en ondsinnet graf lekke data via bilde-URL-sidekanaler
(f.eks. ved å kode data i spørringsparametere mot en vert
som angriperen kontrollerer) eller laste uønsket eksternt innhold. Hvis du kontrollerer
bildesettet, foretrekk innbygging (`data:`) i stedet og behold `img-src 'self'
data:` overalt.
:::

## Manglende bilder

Hvis `setImageSizer` returnerer `null` (eller ingen måler er registrert) for en
referert kilde, følger @knowvah/dot-engine den samme C-trofaste stien som native
Graphviz' bom i `gvusershape`: den advarer og behandler bildet som **størrelse
null**, noe som påvirker nodeboksens layout rundt det. Hvis
`setImageResolver`/`inlineImages` er i bruk og løseren bommer, faller
emitteren tilbake til rå `src`-videresending i stedet for å bygge inn — `href`
blir fortsatt skrevet, den bare løses ikke med mindre noe annet på
siden kan hente den. Se [Kjente avvik](/no/divergences) for hva som er innenfor og
utenfor omfanget for bilde-/rasterhåndtering generelt.
