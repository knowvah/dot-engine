---
sourceHash: 724c941cdb4449b62d97fc99fbcfbbd209d304f41b096bc7948b89c1c51b222b
---
# Obrázky

Uzel s `image="logo.png"` (nebo buňka `<IMG SRC="logo.png">` v popisku ve stylu HTML)
ve výchozím nastavení nemá své pixely vložené. @knowvah/dot-engine vypíše
zdroj **doslovně**:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

Cokoli SVG zobrazuje — `<img>`/vložené `<svg>` v prohlížeči, shell Electronu,
sestavení statického webu — si tento `href` vyřeší samo. Tato stránka popisuje,
jak se velikost podle tohoto hrefu určuje při rozvržení, tři způsoby, jak pixely skutečně
zobrazit, a dopady každého z nich na CSP.

## Jak obrázky procházejí zpracováním

1. Graf deklaruje `image="logo.png"` u uzlu, nebo popisek ve stylu HTML
   obsahuje buňku `<IMG>`.
2. U buňky `<IMG>` v popisku ve stylu HTML potřebuje Graphviz **přirozenou
   šířku/výšku** obrázku, aby určil velikost buňky dříve, než může rozvrhnout cokoli dalšího — knihovna
   se kvůli tomu nikdy nedotýká souborového systému ani sítě, takže
   zaregistrujete měřič (`setImageSizer`, popsaný v části
   [Použití v prohlížeči](/cs/guide/browser) a níže znovu pro Node). Atribut uzlu
   `image=` měřič **neměří**: stejně jako nativní Graphviz bez displeje si
   uzel ponechá svůj běžný rámeček a obrázek se do něj vykreslí.
3. Rozvržení proběhne s rozměry, které váš měřič vrátil pro každé `<IMG>`.
4. Emitor SVG (`usershape()` ze `src/render/svg.ts`) zapíše
   `<image xlink:href="...">` s rámečkem vypočteným v kroku 3. Ve výchozím nastavení
   je `href` surový řetězec `src` s ošetřenými znaky XML, nic víc.
5. Volitelně — pokud jste zavolali `setImageResolver` a vykreslovali s
   `{ inlineImages: true }` — emitor místo toho zapíše
   `xlink:href="data:<mime>;base64,<bytes>"`, samostatné URI `data:`.
   To je doplněk; nativní Graphviz to nedělá.

Určování velikosti a vkládání obrázků přímo do SVG jsou dvě nezávislá, samostatně registrovaná rozhraní: velikost obrázků můžete
určovat bez jejich vkládání (běžný případ — soubor hostujete), nebo dělat
obojí (samostatné SVG).

## Určování velikosti v Node vs. v prohlížeči

`setImageSizer` přijímá `(src: string) => { w: number; h: number } | null` a
při rozvržení se na něj dotazuje jednou pro každý odlišný zdroj `image=`/`<IMG>`. Je to
registrace platná pro celý proces, stejný vzor jako u `setImageResolver` níže — zavolejte ji
jednou před `render()`/`renderSvg()`.

**Prohlížeč** — změřte skutečný obrázek, protože už máte `Image` a
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

`setImageSizer` je synchronní callback — uvnitř není žádné `await` —
takže cesta v prohlížeči rozměry předem zjistí (přes `decode()`) do mezipaměti
dříve, než rozvržení proběhne, a poté tuto mezipaměť čte synchronně.

**Node** — žádný DOM `Image` neexistuje a knihovna za vás nebude číst
souborový systém. Buď zadejte známé rozměry napevno, nebo je načtěte sami
(např. z manifestu nebo z lehkého parseru hlaviček PNG/JPEG, který dodáte) a
výsledek předejte stejným způsobem:

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

Pokud vaše grafy nikdy neodkazují na externí obrázky, tuto část úplně přeskočte.

## Asynchronní měřič a resolver (na vykreslení)

`setImageSizer` / `setImageResolver` jsou synchronní registrace platné pro celý proces,
takže vzor pro prohlížeč výše musí předem naplnit mezipaměť. Asynchronní
vstupní body přebírají háčky **při každém volání** a počkají na ně za vás:

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

- Každý háček se volá **nejvýše jednou pro každý odlišný `src`**, paralelně, před
  zahájením rozvržení. Modul pak spustí své běžné synchronní rozvržení nad
  nasbíranými výsledky.
- Háček, který **vyhodí výjimku nebo je odmítnut**, se bere jako minutí (`null`), přesně jako
  synchronní háček vracející `null`: nulová velikost u měřiče, předání surového `src`
  u resolveru.
- Je-li zadán asynchronní háček, minutí se **nevrací** ke globálnímu
  `setImageSizer` / `setImageResolver`. Není-li zadán, použijí se globální
  hodnoty jako v `renderSvg`.
- Háčky platí jen pro toto jedno vykreslení; nic globálního se neregistruje.
- `imageResolver` se používá jen tehdy, když je `inlineImages` rovno `true`.
- `renderSvgInto` přijímá stejné volby.

## Jak obrázek zobrazit

Určení velikosti zajistí správné rozvržení; nezajistí, že se pixely zobrazí
všude, kde SVG skončí. Vyberte jeden ze tří přístupů.

### 1. Hostovat soubor

Obrázek servírujte na URL (nebo na cestě relativní k místu, kde se SVG
zobrazuje), které prohlížeč/příjemce dokáže stáhnout. Je to nejjednodušší možnost a
nevyžaduje žádnou práci navíc při vykreslování — ale kontext zobrazení musí
mít k tomuto původu přístup, a pokud se SVG zobrazuje někde se striktním `img-src`
CSP, musí být tento původ povolen i tam (viz níže).

### 2. Vložit jako URI `data:`

Pomocí API pro vkládání z T1 vytvořte jeden samostatný řetězec SVG bez
jakéhokoli externího stahování: `setImageResolver` dodá surové bajty
a `render(g, 'svg', { inlineImages: true })` je vloží.

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

`ImageResolver` může také vrátit `{ bytes: Uint8Array; mime?: string }`, když
chcete typ MIME určit výslovně (emitor jinak typ odvodí z
přípony souboru zdroje — `.png` → `image/png`, `.svg` →
`image/svg+xml` a tak dále, a u neznámých přípon se vrátí k `application/octet-stream`).
Registraci zrušíte pomocí `setImageResolver(null)`.

::: tip
Vkládání upřednostněte, když SVG putuje někam, kde si v okamžiku zobrazení nemůže stáhnout externí
zdroje — e-mailoví klienti, offline dokumentace, vložení se striktním CSP
nebo kdekoli, kde chcete jeden samostatný řetězec bez následného síťového
požadavku. Cenou je velikost výstupu: base64 nafoukne obrázek asi o 33 % a
duplikuje se do každého SVG, které na něj odkazuje (bez opětovného použití mezipaměti prohlížeče
mezi vykresleními).
:::

`inlineImages` je ve výchozím nastavení `false`; bez nastavení je výstup bajt po bajtu shodný
s předávacím chováním z doby před vkládáním. Ovlivňuje jen formát `svg` — na
`json`/`xdot`/`dot`/ostatní textové formáty nemá vliv. Minutí (není zaregistrován resolver, nebo
resolver pro daný `src` vrátí `null`) automaticky přejde na předání
surového `src` — vkládání degraduje plynule, nikdy nevyhodí výjimku.

### 3. Základní adresáře ve stylu `imagepath`

Atribut grafu `imagepath` nativního Graphviz říká binárce v C vyhledávací adresář ve stylu
souborového systému/`GDFONTPATH`, vůči kterému se mají řešit relativní hodnoty `image=`.
@knowvah/dot-engine `imagepath` neimplementuje — portace nikdy sama nečte data obrázků z disku,
takže není vůči čemu cestu řešit
(úplnou hranici rozsahu najdete ve [Známých odchylkách](/cs/divergences)). Pokud
vaše grafy používají relativní cesty `image=`, vyřešte je vůči vlastnímu základnímu
adresáři/URL ve vrstvě, která sestavuje zdrojový kód DOT, nebo ve svých
callbacích `setImageSizer`/`ImageResolver` — oba dostávají surový řetězec `src`
přesně tak, jak je zapsán v grafu, takže jeho prefixování základní cestou
před vyhledáním je běžný, schválený vzor.

## Doporučení k CSP

Pokud jsou vaše grafy dodávány uživateli (hřiště, vložení, které vykresluje
libovolné DOT), promyslete si politiku `img-src` stránky předem.

**Vložené obrázky (URI `data:`)** vyžadují jen:

```
img-src 'self' data:
```

Jako hlavička odpovědi HTTP:

```
Content-Security-Policy: img-src 'self' data:
```

Nebo jako značka meta na stránce, která hostuje SVG:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

To je přísné — nikdy se nekontaktuje žádný externí hostitel obrázků, protože bajty
jsou už vloženy do řetězce SVG.

**Hostované obrázky (možnost 1 výše)** naproti tomu vyžadují, aby kontext zobrazení
stahoval odtud, kde obrázky skutečně leží. Pokud graf dodaný uživatelem může
odkazovat na libovolné URL v `image=`, je povolení každého možného hostitele
často nepraktické, takže stránka s hřištěm/vložením může potřebovat něco volného:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
Nikdy nenastavujte `img-src *` (ani jiný stejně volný `img-src`) jako **výchozí pro celý web**.
Omezte ho na konkrétní stránku s hřištěm/vložením, která musí vykreslovat
libovolné grafy dodané uživateli, berte to jako záměrné, zdokumentované
uvolnění jen pro tuto stránku a CSP všech ostatních stránek ponechte přísné. Volný
`img-src` umožňuje škodlivému grafu vynést data přes postranní kanály v URL obrázků
(např. zakódováním dat do parametrů dotazu vůči
hostiteli pod kontrolou útočníka) nebo načíst nežádoucí vzdálený obsah. Pokud ovládáte
sadu obrázků, raději použijte vkládání (`data:`) a všude ponechte `img-src 'self'
data:`.
:::

## Chybějící obrázky

Pokud `setImageSizer` vrátí `null` (nebo není zaregistrován žádný měřič) pro
odkazovaný zdroj, @knowvah/dot-engine se řídí stejnou cestou věrnou C jako minutí
`gvusershape` v nativním Graphviz: vypíše varování a obrázek bere jako **nulovou
velikost**, což ovlivní rozvržení rámečku uzlu kolem něj. Pokud
je v platnosti `setImageResolver`/`inlineImages` a resolver mine, emitor
přejde na předání surového `src` místo vkládání — `href` se přesto
zapíše, jen se nevyřeší, pokud ho nedokáže stáhnout něco jiného na
stránce. Co je u práce s obrázky/rastry obecně v rozsahu a mimo něj, viz [Známé odchylky](/cs/divergences).
