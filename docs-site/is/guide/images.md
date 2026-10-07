---
sourceHash: caef116c0b8959819373d82660fc2c5014f4b538fd6e44c6110d42251eff3955
---
# Myndir

Hnútur með `image="logo.png"` (eða `<IMG SRC="logo.png">`-hólf í HTML-líku merki)
fær ekki punkta sína fellda inn sjálfgefið. @knowvah/dot-engine skilar
upptökunni **orðrétt**:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

Það sem birtir SVG-myndina — vafra-`<img>`/innfellt `<svg>`, Electron-skel,
smíði á stöðluðum vef — leysir þetta `href` sjálft. Þessi síða fjallar um
hvernig þetta href fær stærð við uppsetningu, þrjár leiðir til að láta punktana í raun
birtast og CSP-áhrif hverrar leiðar.

## Hvernig myndir flæða

1. Grafið lýsir `image="logo.png"` á hnút, eða HTML-líkt merki
   inniheldur `<IMG>`-hólf.
2. Fyrir HTML-líkt `<IMG>`-hólf þarf Graphviz **innbyggða
   breidd/hæð** myndarinnar til að ákvarða stærð hólfsins áður en það getur raðað nokkru öðru upp —
   safnið snertir aldrei skráakerfið eða netið til að komast að þessu, svo
   þú skráir mæli (`setImageSizer`, fjallað um í
   [Notkun í vafra](/is/guide/browser) og aftur hér fyrir neðan fyrir Node). Eigindið `image=` á hnút
   er **ekki** mælt af mælinum: eins og í innbyggðu Graphviz án skjás
   heldur hnúturinn venjulegum kassa sínum og myndin er teiknuð inn í hann.
3. Uppsetning keyrir með þeim víddum sem mælirinn þinn skilaði fyrir hvert `<IMG>`.
4. SVG-útgefandinn (`usershape()` í `src/render/svg.ts`) skrifar
   `<image xlink:href="...">` með kassanum sem reiknaður var í skrefi 3. Sjálfgefið er
   `href` hráa `src`-strengurinn, XML-umbreyttur, ekkert annað.
5. Valkvætt — ef þú kallaðir á `setImageResolver` og teiknaðir með
   `{ inlineImages: true }` — skrifar útgefandinn í staðinn
   `xlink:href="data:<mime>;base64,<bytes>"`, sjálfstæða `data:`-slóð (URI).
   Þetta er viðbót; innbyggt Graphviz gerir þetta ekki.

Mæling og innfelling eru tveir óháðir, sérskráðir tengipunktar: þú getur
mælt myndir án þess að fella þær inn (algengasta tilvikið — hýsa skrána), eða gert
hvort tveggja (sjálfstætt SVG).

## Mæling í Node og vafra

`setImageSizer` tekur `(src: string) => { w: number; h: number } | null` og
er kallað einu sinni fyrir hverja sérstaka `image=`/`<IMG>`-uppsprettu við uppsetningu. Það er
skráning á vísu alls ferlisins, sama mynstur og `setImageResolver` hér fyrir neðan — kallaðu á
það einu sinni áður en `render()`/`renderSvg()` er keyrt.

**Vafri** — mældu raunverulegu myndina, þar sem þú hefur þegar `Image` og
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

`setImageSizer` er samstillt kallsfall — það er ekkert `await` inni í því —
svo vafraleiðin leysir víddir fyrirfram (með `decode()`) í skyndiminni
áður en uppsetning keyrir og les síðan skyndiminnið samstillt.

**Node** — þar er enginn DOM-`Image` og safnið les ekki
skráakerfið fyrir þig. Annaðhvort harðkóðaðu þekktar víddir eða lestu þær sjálf/ur
(t.d. úr skrá með lýsigögnum, eða léttum PNG/JPEG-hausaþáttara sem þú leggur til) og
gefðu niðurstöðuna á sama hátt:

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

Ef grafin þín vísa aldrei í ytri myndir skaltu sleppa þessu alveg.

## Ósamstilltur mælir og leysir (fyrir hverja teikningu)

`setImageSizer` / `setImageResolver` eru samstilltar skráningar á vísu alls
ferlisins, svo vaframynstrið hér að ofan þarf að forhita skyndiminni. Ósamstilltu
inngangspunktarnir taka krókana **við hvert kall** og bíða eftir þeim fyrir þig:

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

- Hver krókur er kallaður **í mesta lagi einu sinni fyrir hvert sérstakt `src`**, samhliða, áður en
  uppsetning hefst. Vélin keyrir síðan venjulega samstillta uppsetningu sína á
  söfnuðum niðurstöðum.
- Krókur sem **kastar eða hafnar** er meðhöndlaður sem missir (`null`), nákvæmlega eins og
  samstilltur krókur sem skilar `null`: núllstærð fyrir mælinn, hrá `src`-gegnumleiðing fyrir
  leysinn.
- Þegar ósamstilltur krókur er gefinn fellur missir **ekki** aftur á alþjóðlega
  `setImageSizer` / `setImageResolver`. Þegar hann er ekki gefinn gilda alþjóðlegu
  eins og í `renderSvg`.
- Krókarnir gilda aðeins um þá einu teikningu; ekkert alþjóðlegt er skráð.
- `imageResolver` er aðeins spurður þegar `inlineImages` er `true`.
- `renderSvgInto` tekur við sömu valkostum.

## Að láta myndina birtast

Mæling kemur uppsetningunni í lag; hún lætur punktana ekki birtast hvar sem
SVG-myndin endar á að vera sýnd. Veldu eina af þremur leiðum.

### 1. Hýsa skrána {#host-the-file}

Berðu myndina fram á slóð (eða slóð miðað við þar sem SVG-myndin er
sýnd) sem vafrinn/notandinn getur sótt. Þetta er einfaldasti kosturinn og
krefst engrar aukavinnu við teikningu — en birtingarsamhengið þarf að geta
náð í þann uppruna, og ef SVG-myndin er sýnd þar sem ströng `img-src`-CSP gildir
þarf að heimila þann uppruna þar líka (sjá hér fyrir neðan).

### 2. Fella inn sem `data:`-slóð {#inline-as-a-data-uri}

Notaðu innfellingar-API-ið til að búa til einn sjálfstæðan SVG-streng án nokkurrar
ytri sóknar: `setImageResolver` skilar hráum bætum og
`render(g, 'svg', { inlineImages: true })` fellir þau inn.

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

`ImageResolver` getur einnig skilað `{ bytes: Uint8Array; mime?: string }` þegar
þú vilt tilgreina MIME-gerð skýrt (útgefandinn dregur annars eina ályktun
út frá skráarendingu uppsprettunnar — `.png` → `image/png`, `.svg` →
`image/svg+xml`, og svo framvegis, og fellur aftur á `application/octet-stream` fyrir
óþekktar endingar). Settu `setImageResolver(null)` til að hreinsa skráninguna.

::: tip
Veldu frekar innfellingu þegar SVG-myndin ferðast þangað sem ekki er hægt að sækja ytri
auðlindir við birtingu — póstforrit, ótengd skjöl, innfellingu með strangri CSP,
eða hvar sem þú vilt einn sjálfstæðan streng án frekari netbeiðni.
Fórnarkostnaðurinn er stærð úttaks: base64 þenur myndina út um ~33%, og
hún er afrituð í hverja SVG-mynd sem vísar í hana (engin endurnotkun skyndiminnis vafra
milli teikninga).
:::

`inlineImages` er sjálfgefið `false`; óstillt er úttakið bæti fyrir bæti eins
og gegnumleiðslan fyrir innfellingu. Það hefur aðeins áhrif á sniðið `svg` — það hefur engin áhrif
á `json`/`xdot`/`dot`/önnur textasnið. Missir (enginn leysir skráður, eða
leysirinn skilar `null` fyrir það `src`) fellur sjálfkrafa aftur á hráa `src`-gegnumleiðingu —
innfelling dofnar mjúklega, hún kastar aldrei.

### 3. Grunnmöppur í stíl `imagepath` {#imagepath-style-base-directories}

Eigindið `imagepath` á grafi í innbyggðu Graphviz segir C-keyrsluskránni hvaða
leitarmöppu í stíl skráakerfis/`GDFONTPATH` á að leysa afstæð `image=`-gildi gegn.
@knowvah/dot-engine útfærir ekki `imagepath` — yfirfærslan les aldrei myndagögn af diski sjálf,
svo það er engin slóð til að leysa gegn
(sjá [Þekkt frávik](/is/divergences) fyrir fullu umfangsmörkin). Ef
grafin þín nota afstæðar `image=`-slóðir skaltu leysa þær gegn eigin
grunnmöppu/slóð í því lagi sem smíðar DOT-frumkóðann eða í
`setImageSizer`/`ImageResolver`-afturköllunum þínum — báðar fá hráa `src`-strenginn
nákvæmlega eins og hann er skrifaður í grafinu, svo að bæta grunnslóð framan við strenginn
fyrir uppflettingu er eðlilegt og viðurkennt mynstur.

## CSP-leiðbeiningar

Ef grafin þín koma frá notendum (sandkassi, innfelling sem teiknar
hvaða DOT sem er) skaltu hugsa um `img-src`-stefnu síðunnar fyrirfram.

**Innfelldar myndir (`data:`-slóðir)** þurfa aðeins:

```
img-src 'self' data:
```

Sem HTTP-svarhaus:

```
Content-Security-Policy: img-src 'self' data:
```

Eða sem meta-tag á síðunni sem hýsir SVG-myndina:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

Þetta er þröngt — enginn ytri myndahýsill er nokkurn tíma hafður samband við, því bætin
eru þegar felld inn í SVG-strenginn.

**Hýstar myndir (valkostur 1 hér að ofan)** þurfa aftur á móti að birtingarsamhengið
sæki frá því sem myndirnar eru í raun. Ef graf frá notanda getur
vísað í hvaða `image=`-slóð sem er er oft óraunhæft að heimila alla mögulega hýsla,
svo sandkassa-/innfellingarsíða gæti þurft eitthvað rúmt:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
Gerðu aldrei `img-src *` (eða jafn rúma `img-src`-stefnu) að **vefsvæðisbundnu**
sjálfgefnu gildi. Afmarkaðu hana við tiltekna sandkassa-/innfellingarsíðu sem þarf að
teikna hvaða graf frá notanda sem er, meðhöndlaðu hana sem vísvitandi, skjalfesta
tilslökun fyrir þá síðu eingöngu og haltu CSP allra annarra síðna þröngri. Rúm
`img-src` leyfir illgjörnu grafi að leka gögnum um hliðarrásir myndaslóða
(t.d. með því að kóða gögn í fyrirspurnarbreytur gegn hýsli sem árásaraðili
stjórnar) eða hlaða óæskilegu fjarefni. Ef þú stjórnar myndasafninu skaltu frekar
fella inn (`data:`) og halda `img-src 'self'
data:` alls staðar.
:::

## Myndir sem vantar

Ef `setImageSizer` skilar `null` (eða enginn mælir er skráður) fyrir
tilvísaða uppsprettu fylgir @knowvah/dot-engine sömu C-trúu leið og
`gvusershape`-missir í innbyggðu Graphviz: það varar við og meðhöndlar myndina sem **núllstærð**,
sem hefur áhrif á uppsetningu hnútakassans í kringum hana. Ef
`setImageResolver`/`inlineImages` er í notkun og leysirinn missir fellur
útgefandinn aftur á hráa `src`-gegnumleiðingu í stað þess að fella inn — `href`
er samt skrifað, það leysist bara ekki nema eitthvað annað á
síðunni geti sótt það. Sjá [Þekkt frávik](/is/divergences) um hvað er innan og
utan umfangs fyrir meðhöndlun mynda/punktamynda almennt.
