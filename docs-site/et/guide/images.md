---
sourceHash: 724c941cdb4449b62d97fc99fbcfbbd209d304f41b096bc7948b89c1c51b222b
---
# Pildid

Sõlme, millel on `image="logo.png"` (või HTML-laadse sildi `<IMG SRC="logo.png">`
lahtri), piksleid vaikimisi ei manustata. @knowvah/dot-engine väljastab
allika **sõna-sõnalt**:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

Mis iganes SVG-d kuvab — brauseri `<img>`/sisemine `<svg>`, Electroni
kest, staatilise saidi ehitis — lahendab selle `href`-i ise. See leht käsitleb,
kuidas see href paigutuse ajal mõõtmed saab, kolme viisi, kuidas piksleid tegelikult
nähtavale tuua, ja igaühe CSP-tagajärgi.

## Kuidas pildid liiguvad

1. Graaf deklareerib sõlmel `image="logo.png"` või HTML-laadne silt
   sisaldab `<IMG>`-lahtrit.
2. HTML-laadse `<IMG>`-lahtri puhul vajab Graphviz pildi **omalaiust/-kõrgust**,
   et lahtri suurus määrata, enne kui saab midagi muud paigutada — teek ei puuduta
   selle väljaselgitamiseks kunagi failisüsteemi ega võrku, seega registreerite
   mõõtja (`setImageSizer`, mida käsitletakse jaotises
   [Kasutamine brauseris](/et/guide/browser) ja allpool uuesti Node'i jaoks). Sõlme
   `image=`-atribuuti mõõtja **ei mõõda**: nagu peata natiivne
   Graphviz, jätab sõlm oma tavalise kasti ja pilt joonistatakse selle sisse.
3. Paigutus töötab, kasutades mõõtmeid, mille teie mõõtja iga `<IMG>` kohta tagastas.
4. SVG-väljastaja (`src/render/svg.ts` funktsioon `usershape()`) kirjutab
   `<image xlink:href="...">` sammus 3 arvutatud kastiga. Vaikimisi on
   `href` toores `src`-string, XML-iks paomärgistatud, mitte midagi muud.
5. Valikuliselt — kui te kutsusite `setImageResolver` ja renderdasite
   `{ inlineImages: true }`-ga — kirjutab väljastaja selle asemel
   `xlink:href="data:<mime>;base64,<bytes>"`, isemajandava `data:` URI.
   See on lisafunktsioon; natiivne Graphviz seda ei tee.

Mõõtmine ja sisseehitamine on kaks sõltumatut, eraldi registreeritavat liidespunkti: saate
pilte mõõta neid sisse ehitamata (tavaline juhtum — majutage fail) või teha
mõlemat (isemajandav SVG).

## Mõõtmine Node'is vs. brauseris

`setImageSizer` võtab `(src: string) => { w: number; h: number } | null` ja
seda küsitakse paigutuse ajal üks kord iga erineva `image=`/`<IMG>` allika kohta. See on
protsessiülene registreerimine, sama muster nagu `setImageResolver` allpool — kutsuge
seda üks kord enne `render()`/`renderSvg()`.

**Brauser** — mõõtke päris pilti, kuna teil on juba `Image` ja
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

`setImageSizer` on sünkroonne tagasikutse — selle sees ei ole `await`-i —,
seega lahendab brauseriteekond mõõtmed (`decode()` abil) eelnevalt vahemällu,
enne kui paigutus töötab, ja loeb seejärel seda vahemälu sünkroonselt.

**Node** — seal ei ole DOM-i `Image`-it ja teek ei loe teie eest
failisüsteemi. Kas kodeerige teadaolevad mõõtmed kõvasti sisse või lugege need ise
(nt manifestist või teie antud kerge PNG/JPEG päise parserist) ja
andke tulemus edasi samamoodi:

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

Kui teie graafid ei viita kunagi välispiltidele, jätke see täielikult vahele.

## Asünkroonne mõõtja ja lahendaja (renderduse kohta)

`setImageSizer` / `setImageResolver` on sünkroonsed, protsessiülesed
registreeringud, seega peab ülaltoodud brauserimuster vahemälu eelsoojendama. Asünkroonsed
sisenemispunktid võtavad konksud **kutse kohta** ja ootavad need teie eest ära:

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

- Iga konksu kutsutakse **iga erineva `src` kohta kõige rohkem üks kord**, paralleelselt, enne
  paigutuse algust. Seejärel käitab mootor oma tavalise sünkroonse paigutuse kogutud
  tulemuste vastu.
- Konks, mis **viskab või lükatakse tagasi**, käsitletakse möödalaskmisena (`null`), täpselt nagu
  sünkroonne konks, mis tagastab `null`: mõõtja puhul nullsuurus, lahendaja puhul toore `src` läbilaskmine.
- Kui asünkroonne konks on antud, **ei** lange möödalaskmine tagasi globaalsele
  `setImageSizer` / `setImageResolver`-ile. Kui seda ei ole antud, kehtivad globaalsed
  nagu `renderSvg`-is.
- Konksud kehtivad ainult sellele ühele renderdusele; midagi globaalset ei registreerita.
- `imageResolver`-it küsitakse ainult siis, kui `inlineImages` on `true`.
- `renderSvgInto` aktsepteerib samu valikuid.

## Pildi nähtavale toomine

Mõõtmine seab paigutuse õigeks; see ei too piksleid nähtavale seal, kus
SVG lõpuks kuvatakse. Valige üks kolmest lähenemisest.

### 1. Majutage fail

Serveerige pilt URL-il (või teega, mis on suhteline sellele, kus SVG
kuvatakse), mille brauser/tarbija saab tuua. See on kõige lihtsam valik ja
ei vaja täiendavat renderdusaegset tööd — kuid kuvamiskontekst peab selle päritoluni
ulatuma ja kui SVG-d näidatakse kuskil range `img-src`
CSP-ga, tuleb see päritolu sinna samuti lubatud nimekirja lisada (vt allpool).

### 2. Ehitage sisse `data:` URI-na

Kasutage T1 sisseehitamise API-t, et toota üks isemajandav SVG-string ilma
välise toomiseta: `setImageResolver` annab toorbaidid ja
`render(g, 'svg', { inlineImages: true })` manustab need.

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

`ImageResolver` võib tagastada ka `{ bytes: Uint8Array; mime?: string }`, kui
soovite MIME-tüübi selgesõnaliselt määrata (muidu tuletab väljastaja selle
allika faililaiendist — `.png` → `image/png`, `.svg` →
`image/svg+xml` ja nii edasi, tundmatute laiendite puhul langeb tagasi väärtusele `application/octet-stream`).
Registreeringu tühistamiseks seadke `setImageResolver(null)`.

::: tip
Eelistage sisseehitamist, kui SVG liigub kuhugi, kus väliseid
ressursse kuvamise ajal tuua ei saa — e-posti kliendid, võrguühenduseta
dokumendid, range CSP-ga manus või kõikjal, kus soovite ühte isemajandavat stringi ilma
järelpäringuta võrku. Hind on väljundi suurus: base64 paisutab pilti ~33% ja
see dubleeritakse igasse SVG-sse, mis sellele viitab (brauseri vahemälu ei kasutata
renderduste vahel taaskasutusel).
:::

`inlineImages` on vaikimisi `false`; määramata jätmisel on väljund baithaaval identne
sisseehitamise-eelse läbilaskmisega. See mõjutab ainult `svg`-vormingut — see ei mõjuta
`json`/`xdot`/`dot`/muid tekstivorminguid. Möödalaskmine (lahendajat pole registreeritud või
lahendaja tagastab selle `src` jaoks `null`) langeb automaatselt tagasi toore `src`
läbilaskmisele — sisseehitamine taandub sujuvalt, see ei viska kunagi.

### 3. `imagepath`-laadsed baaskataloogid

Natiivse Graphvizi graafiatribuut `imagepath` ütleb C-binaarile failisüsteemi-/`GDFONTPATH`-laadse
otsingukataloogi, mille suhtes suhtelisi `image=`
väärtusi lahendada. @knowvah/dot-engine ei teosta `imagepath`-i — portimine
ei loe kunagi pildiandmeid ise kettalt, seega pole teed, mille suhtes lahendada
(täieliku ulatuse piiri kohta vt [Teadaolevad erinevused](/et/divergences)). Kui teie
graafid kasutavad suhtelisi `image=` teid, lahendage need oma baaskataloogi/URL-i
suhtes selles kihis, mis DOT-lähtekoodi koostab, või oma
`setImageSizer`/`ImageResolver` tagasikutsetes — mõlemad saavad toore `src`-stringi
täpselt nii, nagu see graafis kirjas on, seega on stringi ette baasitee
lisamine enne otsingut normaalne, lubatud muster.

## CSP juhised

Kui teie graafid on kasutaja antud (mänguväljak, manus, mis renderdab
suvalist DOT-i), mõelge lehe `img-src` poliitikale eelnevalt läbi.

**Sisseehitatud pildid (`data:` URI-d)** vajavad ainult:

```
img-src 'self' data:
```

HTTP vastuse päisena:

```
Content-Security-Policy: img-src 'self' data:
```

Või meta-sildina lehel, mis SVG-d majutab:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

See on kitsas — ühtegi välist pildimajutajat ei kontakteerita kunagi, sest baidid
on SVG-stringi juba manustatud.

**Majutatud pildid (valik 1 ülal)** seevastu vajavad, et kuvamiskontekst
tooks need sealt, kus pildid tegelikult asuvad. Kui kasutaja antud graaf saab
viidata suvalisele `image=` URL-ile, on iga võimaliku majutaja lubatud nimekirja lisamine
sageli ebapraktiline, seega võib mänguväljaku/manuse leht vajada midagi lubavat:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
Ärge kunagi tehke `img-src *` (või sama lubavat `img-src`-i) oma **kogu saidi**
vaikeväärtuseks. Piirake see konkreetse mänguväljaku/manuse lehega, mis peab renderdama
suvalisi kasutaja antud graafe, käsitlege seda tahtliku, dokumenteeritud
lõdvendusena ainult selle lehe jaoks ja hoidke iga teise lehe CSP kitsas. Lubav
`img-src` võimaldab pahatahtlikul graafil andmeid pildi-URL-i
kõrvalkanalite kaudu lekitada (nt kodeerides andmeid päringuparameetritesse ründaja
kontrollitava majutaja vastu) või laadida soovimatut kaugsisu. Kui te kontrollite
pildikomplekti, eelistage sisseehitamist (`data:`) ja hoidke kõikjal `img-src 'self'
data:`.
:::

## Puuduvad pildid

Kui `setImageSizer` tagastab viidatud allika jaoks `null` (või mõõtjat pole registreeritud),
järgib @knowvah/dot-engine sama C-truud teed nagu natiivse
Graphvizi `gvusershape`-i möödalaskmine: see hoiatab ja käsitleb pilti **nullsuurusena**,
mis mõjutab selle ümber arvutatud sõlmekasti paigutust. Kui
`setImageResolver`/`inlineImages` on mängus ja lahendaja laseb mööda, langeb
väljastaja tagasi toore `src` läbilaskmisele, mitte ei ehita sisse — `href`
kirjutatakse ikkagi, see lihtsalt ei lahendu, kui miski muu lehel seda tuua ei saa. Vt
[Teadaolevad erinevused](/et/divergences), mis on pildi-/rasterkäsitluse üldiselt ulatuses ja
mis väljaspool.
