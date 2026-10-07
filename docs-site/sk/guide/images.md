---
sourceHash: 724c941cdb4449b62d97fc99fbcfbbd209d304f41b096bc7948b89c1c51b222b
---
# Obrázky

Uzol s `image="logo.png"` (alebo bunka `<IMG SRC="logo.png">` v HTML-like popisku)
štandardne nemá vložené pixely. @knowvah/dot-engine vyšle zdroj
**doslovne**:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

Čokoľvek zobrazuje SVG — `<img>`/inline `<svg>` v prehliadači, shell Electronu,
build statického webu — si tento `href` rozlišuje samo. Táto stránka sa venuje tomu,
ako sa tento href pri rozložení veľkostne určuje, trom spôsobom, ako docieliť, aby sa pixely
skutočne zobrazili, a dôsledkom každého z nich pre CSP.

## Ako obrázky prechádzajú systémom {#how-images-flow}

1. Graf deklaruje `image="logo.png"` pri uzle alebo HTML-like popisok
   obsahuje bunku `<IMG>`.
2. Pri bunke `<IMG>` v HTML-like popisku Graphviz potrebuje **vlastnú
   šírku/výšku** obrázka, aby mohol určiť veľkosť bunky skôr, než môže rozložiť čokoľvek iné —
   knižnica sa nikdy nedotkne súborového systému ani siete, aby to zistila, takže
   zaregistrujete merač (`setImageSizer`, opísaný v časti
   [Použitie v prehliadači](/sk/guide/browser) a znova nižšie pre Node). Atribút uzla
   `image=` merač **nemeria**: podobne ako natívny Graphviz bez displeja si
   uzol ponechá svoj bežný rámček a obrázok sa do neho nakreslí.
3. Rozloženie beží s rozmermi, ktoré váš merač vrátil pre každý `<IMG>`.
4. Emitor SVG (`usershape()` v `src/render/svg.ts`) zapíše
   `<image xlink:href="...">` s rámčekom vypočítaným v kroku 3. Štandardne je
   `href` surový reťazec `src`, s únikmi XML a nič viac.
5. Voliteľne — ak ste zavolali `setImageResolver` a vykresľovali s
   `{ inlineImages: true }` — emitor namiesto toho zapíše
   `xlink:href="data:<mime>;base64,<bytes>"`, samostatný URI `data:`.
   Je to doplnková funkcia; natívny Graphviz to nerobí.

Určovanie veľkosti a vkladanie sú dva nezávislé, samostatne registrované zásuvné body: obrázky môžete
veľkostne určiť bez vloženia (bežný prípad — súbor hostujete), alebo robiť
oboje (samostatné SVG).

## Určovanie veľkosti v Node vs. v prehliadači {#sizing-in-node-vs-browser}

`setImageSizer` berie `(src: string) => { w: number; h: number } | null` a
volá sa raz pre každý odlišný zdroj `image=`/`<IMG>` počas rozloženia. Je to
procesovo globálna registrácia, rovnaký vzor ako `setImageResolver` nižšie — zavolajte
ju raz pred `render()`/`renderSvg()`.

**Prehliadač** — zmerajte skutočný obrázok, keďže už máte `Image` a
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

`setImageSizer` je synchrónny callback — vo vnútri nie je žiadne `await` —
takže cesta v prehliadači vopred zistí rozmery (cez `decode()`) do cache
skôr, než rozloženie začne, a potom túto cache číta synchrónne.

**Node** — neexistuje DOM `Image` a knižnica za vás nebude čítať
súborový systém. Buď pevne zadajte známe rozmery, alebo ich prečítajte sami
(napr. z manifestu alebo z ľahkého parsera hlavičiek PNG/JPEG, ktorý dodáte) a
výsledok odovzdajte rovnakým spôsobom:

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

Ak vaše grafy nikdy neodkazujú na externé obrázky, toto úplne preskočte.

## Asynchrónny merač a resolver (pri každom vykreslení) {#async-sizer-and-resolver-per-render}

`setImageSizer` / `setImageResolver` sú synchrónne, procesovo globálne
registrácie, takže vyššie uvedený vzor pre prehliadač musí vopred naplniť cache. Asynchrónne
vstupné body preberajú háčiky **pri každom volaní** a počkajú na ne za vás:

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

- Každý háčik sa volá **najviac raz pre každý odlišný `src`**, paralelne, pred
  začiatkom rozloženia. Modul potom spustí svoje bežné synchrónne rozloženie nad
  zozbieranými výsledkami.
- Háčik, ktorý **vyhodí výnimku alebo zamietne promise**, sa považuje za minutie (`null`), presne ako
  synchrónny háčik vracajúci `null`: nulová veľkosť pre merač, priepustenie
  surového `src` pre resolver.
- Keď je zadaný asynchrónny háčik, minutie **nepreklopí** na globálne
  `setImageSizer` / `setImageResolver`. Keď zadaný nie je, uplatnia sa globálne
  ako pri `renderSvg`.
- Háčiky sa uplatnia iba na toto jedno vykreslenie; nič globálne sa neregistruje.
- `imageResolver` sa volá iba vtedy, keď je `inlineImages` rovné `true`.
- `renderSvgInto` akceptuje rovnaké možnosti.

## Ako obrázok zobraziť {#making-the-image-appear}

Určenie veľkosti zabezpečí správne rozloženie; nespôsobí, že sa pixely zobrazia všade, kde
sa SVG nakoniec zobrazí. Vyberte jeden z troch prístupov.

### 1. Hostovať súbor {#1-host-the-file}

Servírujte obrázok na URL (alebo na ceste relatívnej k miestu, kde sa SVG
zobrazuje), ktorú vie prehliadač/spotrebiteľ načítať. Je to najjednoduchšia možnosť a
nevyžaduje žiadnu prácu navyše pri vykresľovaní — ale zobrazovací kontext musí
mať k tomuto pôvodu prístup, a ak sa SVG zobrazuje niekde so striktným `img-src`
CSP, tento pôvod musí byť tam tiež povolený (pozri nižšie).

### 2. Vložiť ako URI `data:` {#2-inline-as-a-data-uri}

Použite inlining API z T1 na vytvorenie jedného samostatného reťazca SVG bez
akéhokoľvek externého načítania: `setImageResolver` dodáva surové bajty
a `render(g, 'svg', { inlineImages: true })` ich vloží.

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

`ImageResolver` môže tiež vrátiť `{ bytes: Uint8Array; mime?: string }`, keď
chcete výslovne určiť typ MIME (emitor ho inak odvodí z
prípony súboru zdroja — `.png` → `image/png`, `.svg` →
`image/svg+xml` a podobne, pri neznámych príponách sa vráti k `application/octet-stream`).
Registráciu zrušíte pomocou `setImageResolver(null)`.

::: tip
Vkladanie uprednostnite, keď SVG putuje niekam, kde sa pri zobrazení nedajú načítať externé
zdroje — e-mailoví klienti, offline dokumentácia, embed so striktným CSP,
alebo kdekoľvek, kde chcete jeden samostatný reťazec bez následnej sieťovej
požiadavky. Kompromisom je veľkosť výstupu: base64 nafúkne obrázok o ~33 % a
duplikuje sa do každého SVG, ktoré naň odkazuje (žiadne opätovné použitie cache prehliadača
medzi vykresleniami).
:::

`inlineImages` je štandardne `false`; keď nie je nastavené, výstup je bajt po bajte zhodný
s priepustením spred zavedenia vkladania. Ovplyvňuje iba formát `svg` — nemá vplyv
na `json`/`xdot`/`dot`/iné textové formáty. Minutie (nie je zaregistrovaný resolver alebo
resolver vráti `null` pre daný `src`) automaticky prejde na priepustenie
surového `src` — vkladanie sa degraduje elegantne, nikdy nevyhodí výnimku.

### 3. Základné adresáre v štýle `imagepath` {#3-imagepath-style-base-directories}

Atribút grafu `imagepath` natívneho Graphviz hovorí binárke v C, v akom
adresári v štýle súborového systému/`GDFONTPATH` má hľadať relatívne hodnoty `image=`.
@knowvah/dot-engine `imagepath` neimplementuje — port nikdy sám
nečíta obrazové dáta z disku, takže nie je voči čomu cestu rozlišovať
(úplnú hranicu rozsahu nájdete v [Známych odchýlkach](/sk/divergences)). Ak vaše
grafy používajú relatívne cesty `image=`, rozlíšte ich voči vlastnému základnému
adresáru/URL vo vrstve, ktorá zostavuje zdrojový kód DOT, alebo vo svojich
callbackoch `setImageSizer`/`ImageResolver` — oba dostanú surový reťazec `src`
presne tak, ako je napísaný v grafe, takže pridanie základnej cesty ako prefixu
pred vyhľadaním je bežný, schválený vzor.

## Odporúčania k CSP {#csp-guidance}

Ak sú vaše grafy dodávané používateľmi (ihrisko, embed, ktorý vykresľuje
ľubovoľný DOT), zamyslite sa nad politikou `img-src` stránky hneď od začiatku.

**Vložené obrázky (URI `data:`)** potrebujú iba:

```
img-src 'self' data:
```

Ako hlavičku odpovede HTTP:

```
Content-Security-Policy: img-src 'self' data:
```

Alebo ako značku meta na stránke, ktorá hostuje SVG:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

To je prísne — nikdy sa nekontaktuje žiadny externý hostiteľ obrázkov, pretože bajty
sú už vložené v reťazci SVG.

**Hostované obrázky (možnosť 1 vyššie)** naopak vyžadujú, aby zobrazovací kontext
načítaval odtiaľ, kde obrázky skutočne sú. Ak sa graf dodaný používateľom môže
odkazovať na ľubovoľné URL v `image=`, povoliť každého možného hostiteľa je
často nepraktické, takže stránka s ihriskom/embedom môže potrebovať niečo voľné:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
Nikdy nerobte z `img-src *` (ani z inak rovnako voľného `img-src`) predvolenú voľbu pre **celý web**.
Obmedzte ho na konkrétnu stránku s ihriskom/embedom, ktorá musí vykresľovať
ľubovoľné grafy dodané používateľmi, berte ho ako zámerné, zdokumentované
uvoľnenie iba pre tú stránku a CSP každej inej stránky ponechajte prísne. Voľné
`img-src` umožňuje zlomyseľnému grafu odcudziť dáta cez bočné kanály v URL obrázkov
(napr. zakódovaním dát do parametrov dopytu voči hostiteľovi
ovládanému útočníkom) alebo načítať nežiaduci vzdialený obsah. Ak máte kontrolu
nad sadou obrázkov, uprednostnite vkladanie (`data:`) a všade ponechajte `img-src 'self'
data:`.
:::

## Chýbajúce obrázky {#missing-images}

Ak `setImageSizer` vráti `null` (alebo nie je zaregistrovaný žiadny merač) pre
odkazovaný zdroj, @knowvah/dot-engine sleduje rovnakú cestu verne podľa C ako pri minutí
`gvusershape` v natívnom Graphviz: vypíše varovanie a obrázok považuje za **nulovej
veľkosti**, čo ovplyvní rozloženie rámčeka uzla okolo neho. Ak je v hre
`setImageResolver`/`inlineImages` a resolver minie, emitor
sa vráti k priepusteniu surového `src` namiesto vkladania — `href`
sa stále zapíše, len sa nerozlíši, pokiaľ ho nevie načítať niečo iné
na stránke. Čo je v rozsahu a mimo rozsahu pre prácu s obrázkami/rastrom všeobecne, nájdete v
[Známych odchýlkach](/sk/divergences).
