---
sourceHash: 724c941cdb4449b62d97fc99fbcfbbd209d304f41b096bc7948b89c1c51b222b
---
# Billeder

En knude med `image="logo.png"` (eller en `<IMG SRC="logo.png">`-celle i en
HTML-lignende etiket) får som standard ikke sine pixels indlejret. @knowvah/dot-engine
udsender kilden **ordret**:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

Det, der viser SVG'en — en browsers `<img>`/inline-`<svg>`, et Electron-skal, et
statisk site-build — opløser selv denne `href`. Denne side dækker, hvordan den href
dimensioneres under layout, tre måder at få pixels til faktisk at vise sig, og
CSP-konsekvenserne af hver.

## Sådan flyder billeder igennem

1. Grafen deklarerer `image="logo.png"` på en knude, eller en HTML-lignende etiket
   indeholder en `<IMG>`-celle.
2. For en HTML-lignende `<IMG>`-celle har Graphviz brug for billedets **iboende
   bredde/højde** for at dimensionere cellen, før noget andet kan lægges ud —
   biblioteket rører aldrig filsystemet eller netværket for at finde ud af det, så
   du registrerer en måler (`setImageSizer`, behandlet i
   [Brug i browseren](/da/guide/browser) og igen nedenfor for Node). En knudes
   `image=`-attribut dimensioneres **ikke** af målen: ligesom i headless native
   Graphviz beholder knuden sin normale boks, og billedet tegnes ind i den.
3. Layout kører med de dimensioner, din måler returnerede for hver `<IMG>`.
4. SVG-udsenderen (`usershape()` i `src/render/svg.ts`) skriver
   `<image xlink:href="...">` med den boks, der blev beregnet i trin 3. Som standard
   er `href` den rå `src`-streng, XML-escapet, intet andet.
5. Valgfrit — hvis du kaldte `setImageResolver` og renderede med
   `{ inlineImages: true }` — skriver udsenderen i stedet
   `xlink:href="data:<mime>;base64,<bytes>"`, en selvstændig `data:`-URI.
   Dette er et tillæg; det er ikke noget, native Graphviz gør.

Dimensionering og indlejring er to uafhængige, separat registrerede snitflader: du kan
dimensionere billeder uden at indlejre dem (det almindelige tilfælde — host filen), eller
gøre begge dele (selvstændig SVG).

## Dimensionering i Node vs. browser

`setImageSizer` tager `(src: string) => { w: number; h: number } | null` og
konsulteres én gang pr. distinkt `image=`-/`<IMG>`-kilde under layout. Det er en
procesglobal registrering, samme mønster som `setImageResolver` nedenfor — kald den
én gang før `render()`/`renderSvg()`.

**Browser** — mål det rigtige billede, da du allerede har `Image` og
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

`setImageSizer` er et synkront callback — der er ingen `await` i det — så
browserstien forhåndsopløser dimensionerne (via `decode()`) til en cache, før
layout kører, og læser derefter den cache synkront.

**Node** — der findes ikke noget DOM-`Image`, og biblioteket læser ikke
filsystemet for dig. Enten hardkod kendte dimensioner, eller læs dem selv
(f.eks. fra et manifest eller en let PNG-/JPEG-headerparser, du leverer) og
send resultatet videre på samme måde:

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

Hvis dine grafer aldrig refererer til eksterne billeder, kan du springe dette helt over.

## Asynkron måler og opløser (pr. render)

`setImageSizer` / `setImageResolver` er synkrone, procesglobale
registreringer, så browsermønstret ovenfor må forhåndsopvarme en cache. De asynkrone
indgangspunkter tager krogene **pr. kald** og afventer dem for dig:

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

- Hver krog kaldes **højst én gang pr. distinkt `src`**, parallelt, før
  layout starter. Motoren kører derefter sit normale synkrone layout mod de
  indsamlede resultater.
- En krog, der **kaster eller afvises**, behandles som en miss (`null`), præcis som en
  synkron krog, der returnerer `null`: nul størrelse for måleren, rå `src`-videregivelse for
  opløseren.
- Når en asynkron krog er angivet, falder en miss **ikke** tilbage til den globale
  `setImageSizer` / `setImageResolver`. Når den ikke er angivet, gælder de globale
  som i `renderSvg`.
- Krogene gælder kun for det ene render; intet globalt registreres.
- `imageResolver` konsulteres kun, når `inlineImages` er `true`.
- `renderSvgInto` accepterer de samme valgmuligheder.

## Få billedet til at vise sig

Dimensionering får layoutet rigtigt; det får ikke pixels til at vise sig, hvor
end SVG'en ender med at blive vist. Vælg én af tre fremgangsmåder.

### 1. Host filen

Server billedet på en URL (eller en sti relativt til det sted, hvor SVG'en
vises), som browseren/forbrugeren kan hente. Det er den enkleste mulighed og
kræver intet ekstra arbejde ved rendering — men visningskonteksten skal kunne
nå den oprindelse, og hvis SVG'en vises et sted med en stram `img-src`-CSP, skal den
oprindelse også tillades dér (se nedenfor).

### 2. Indlejr som en `data:`-URI

Brug T1's indlejrings-API til at producere én selvstændig SVG-streng helt uden
eksterne hentninger: `setImageResolver` leverer rå bytes, og
`render(g, 'svg', { inlineImages: true })` indlejrer dem.

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

`ImageResolver` kan også returnere `{ bytes: Uint8Array; mime?: string }`, når
du vil angive en MIME-type eksplicit (udsenderen udleder ellers én
fra kildens filendelse — `.png` → `image/png`, `.svg` →
`image/svg+xml` og så videre, med `application/octet-stream` som reserve for
ukendte endelser). Kald `setImageResolver(null)` for at rydde registreringen.

::: tip
Foretræk indlejring, når SVG'en rejser et sted hen, der ikke kan hente eksterne
ressourcer på visningstidspunktet — e-mailklienter, offlinedokumentation, en
indlejring med stram CSP, eller hvor som helst, hvor du vil have én selvstændig streng uden
efterfølgende netværksanmodning. Prisen er outputstørrelsen: base64 puster billedet ~33 % op, og
det duplikeres ind i hver SVG, der refererer til det (ingen genbrug af browsercache
på tværs af renders).
:::

`inlineImages` er som standard `false`; uden angivelse er outputtet byte-identisk med
den tidligere videregivelse uden indlejring. Det påvirker kun formatet `svg` — det har ingen virkning
på `json`/`xdot`/`dot`/andre tekstformater. En miss (ingen opløser registreret, eller
opløseren returnerer `null` for den `src`) falder automatisk tilbage til den rå `src`-videregivelse —
indlejring forringes elegant, den kaster aldrig.

### 3. Basisbiblioteker i stil med `imagepath`

Native Graphviz' grafattribut `imagepath` fortæller C-binæren et
filsystem-/`GDFONTPATH`-agtigt søgebibliotek, som relative `image=`-værdier
skal opløses mod. @knowvah/dot-engine implementerer ikke `imagepath` — porteringen læser aldrig
billeddata fra disk selv, så der er ingen sti at opløse mod
(se [Kendte afvigelser](/da/divergences) for den fulde afgrænsning). Hvis dine
grafer bruger relative `image=`-stier, så opløs dem mod dit eget basisbibliotek/din
egen URL i det lag, der konstruerer DOT-kildekoden, eller i dine
`setImageSizer`-/`ImageResolver`-callbacks — begge modtager den rå `src`-streng
nøjagtigt som skrevet i grafen, så at sætte en basissti foran strengen
før opslag er et normalt, godkendt mønster.

## CSP-vejledning

Hvis dine grafer er brugerleverede (en legeplads, en indlejring, der renderer
vilkårlig DOT), så tænk over sidens `img-src`-politik fra starten.

**Indlejrede billeder (`data:`-URI'er)** kræver kun:

```
img-src 'self' data:
```

Som HTTP-svarheader:

```
Content-Security-Policy: img-src 'self' data:
```

Eller som et meta-tag på den side, der hoster SVG'en:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

Det er stramt — ingen ekstern billedvært kontaktes nogensinde, fordi bytes
allerede er indlejret i SVG-strengen.

**Hostede billeder (mulighed 1 ovenfor)** kræver derimod, at visningskonteksten
henter fra de steder, hvor billederne faktisk ligger. Hvis en brugerleveret graf kan
referere til en vilkårlig `image=`-URL, er det ofte upraktisk at tillade hver mulig vært,
så en legeplads-/indlejringsside kan have brug for noget tilladende:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
Gør aldrig `img-src *` (eller en lige så tilladende `img-src`) til din **site-dækkende**
standard. Afgræns den til den specifikke legeplads-/indlejringsside, der skal rendere
vilkårlige brugerleverede grafer, behandl den som en bevidst, dokumenteret
lempelse for netop den side, og hold alle andre siders CSP stram. En
tilladende `img-src` lader en ondsindet graf udsmugle data via billed-URL-sidekanaler
(f.eks. ved at kode data i forespørgselsparametre mod en
angriberkontrolleret vært) eller indlæse uønsket fjernindhold. Hvis du kontrollerer
billedsættet, så foretræk indlejring (`data:`) og hold `img-src 'self'
data:` overalt.
:::

## Manglende billeder

Hvis `setImageSizer` returnerer `null` (eller ingen måler er registreret) for en
refereret kilde, følger @knowvah/dot-engine den samme C-tro sti som native
Graphviz' `gvusershape`-miss: den advarer og behandler billedet som **nul
størrelse**, hvilket påvirker det knudeboks-layout, der beregnes omkring det. Hvis
`setImageResolver`/`inlineImages` er i spil, og opløseren misser, falder
udsenderen tilbage til den rå `src`-videregivelse frem for at indlejre — `href`
bliver stadig skrevet, den vil bare ikke opløses, medmindre noget andet på
siden kan hente den. Se [Kendte afvigelser](/da/divergences) for, hvad der er inden for og
uden for omfanget af billed-/rasterhåndtering generelt.
