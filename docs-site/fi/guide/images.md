---
sourceHash: caef116c0b8959819373d82660fc2c5014f4b538fd6e44c6110d42251eff3955
---
# Kuvat

Solmun, jolla on `image="logo.png"` (tai HTML-tyyppisen nimiön `<IMG SRC="logo.png">`-solun),
pikseleitä ei upoteta oletuksena. @knowvah/dot-engine tuottaa
lähteen **sellaisenaan**:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

Mikä tahansa SVG:n näyttävä taho — selaimen `<img>`/sisäinen `<svg>`, Electron-kuori,
staattisen sivuston käännös — ratkaisee tuon `href`-arvon itse. Tämä sivu käsittelee,
miten href mitoitetaan asettelun aikana, kolme tapaa saada pikselit todella
näkyviin ja kunkin CSP-vaikutukset.

## Miten kuvat kulkevat

1. Graafi julistaa solmulle `image="logo.png"`, tai HTML-tyyppinen nimiö
   sisältää `<IMG>`-solun.
2. HTML-tyyppisen `<IMG>`-solun kohdalla Graphviz tarvitsee kuvan **luontaisen
   leveyden/korkeuden** solun mitoittamiseen, ennen kuin se voi asetella mitään muuta — kirjasto
   ei koskaan kosketa tiedostojärjestelmään tai verkkoon selvittääkseen sitä, joten
   rekisteröit mittaajan (`setImageSizer`, katso
   [Käyttö selaimessa](/fi/guide/browser) ja uudelleen alla Nodea varten). Solmun
   `image=`-attribuuttia mittaaja **ei** mitoita: kuten ilman selainta ajettavassa natiivissa
   Graphvizissa, solmu säilyttää normaalin laatikkonsa ja kuva piirretään sen sisään.
3. Asettelu ajetaan käyttäen mittoja, jotka mittaajasi palautti kullekin `<IMG>`-solulle.
4. SVG-emitteri (`src/render/svg.ts`-tiedoston `usershape()`) kirjoittaa
   `<image xlink:href="...">` vaiheessa 3 lasketulla laatikolla. Oletuksena
   `href` on raaka `src`-merkkijono, XML-escapattuna, ei mitään muuta.
5. Valinnaisesti — jos kutsuit `setImageResolver`-funktiota ja renderöit asetuksella
   `{ inlineImages: true }` — emitteri kirjoittaa sen sijaan
   `xlink:href="data:<mime>;base64,<bytes>"`, itsenäisen `data:`-URI:n.
   Tämä on lisäys; natiivi Graphviz ei tee sitä.

Mitoitus ja upotus ovat kaksi toisistaan riippumatonta, erikseen rekisteröitävää
liitäntäkohtaa: voit mitoittaa kuvat upottamatta niitä (yleinen tapaus — isännöi tiedosto) tai
tehdä molemmat (itsenäinen SVG).

## Mitoitus Nodessa vs. selaimessa

`setImageSizer` ottaa funktion `(src: string) => { w: number; h: number } | null`, ja sitä
kysytään kerran jokaista erillistä `image=`/`<IMG>`-lähdettä kohden asettelun aikana. Se on
prosessin laajuinen rekisteröinti, sama malli kuin alla olevassa `setImageResolver`-funktiossa — kutsu
sitä kerran ennen `render()`/`renderSvg()`-kutsua.

**Selain** — mittaa todellinen kuva, sillä sinulla on jo `Image` ja
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

`setImageSizer` on synkroninen takaisinkutsu — sen sisällä ei ole `await`-lausetta —
joten selainpolussa mitat selvitetään etukäteen (`decode()`-kutsulla) välimuistiin
ennen asettelun ajoa ja luetaan sitten kyseistä välimuistia synkronisesti.

**Node** — DOM:n `Image`-oliota ei ole, eikä kirjasto lue
tiedostojärjestelmää puolestasi. Joko kovakoodaa tunnetut mitat tai lue ne itse
(esim. manifestista tai itse toimittamallasi kevyellä PNG/JPEG-otsikkojäsentimellä) ja
syötä tulos samalla tavalla:

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

Jos graafisi eivät koskaan viittaa ulkoisiin kuviin, ohita tämä kokonaan.

## Asynkroninen mittaaja ja ratkaisija (renderöintikohtaisesti)

`setImageSizer` / `setImageResolver` ovat synkronisia, prosessin laajuisia
rekisteröintejä, joten yllä oleva selainmalli joutuu lämmittämään välimuistin etukäteen. Asynkroniset
sisääntulopisteet ottavat koukut **kutsukohtaisesti** ja odottavat ne puolestasi:

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

- Kutakin koukkua kutsutaan **enintään kerran jokaista erillistä `src`-arvoa kohden**, rinnakkain,
  ennen asettelun alkua. Moottori ajaa sitten tavallisen synkronisen asettelunsa
  kerättyjä tuloksia vasten.
- Koukku, joka **heittää poikkeuksen tai hylkää**, käsitellään ohituksena (`null`), täsmälleen kuten
  synkroninen koukku, joka palauttaa `null`: mittaajalla nollakoko, ratkaisijalla raaka `src`
  sellaisenaan läpi.
- Kun asynkroninen koukku on annettu, ohitus **ei** palaa globaaliin
  `setImageSizer` / `setImageResolver` -funktioon. Kun sitä ei ole annettu, globaalit pätevät
  kuten `renderSvg`-funktiossa.
- Koukut koskevat vain sitä yhtä renderöintiä; mitään globaalia ei rekisteröidä.
- `imageResolver`-koukkua kysytään vain, kun `inlineImages` on `true`.
- `renderSvgInto` hyväksyy samat valinnat.

## Kuvan saaminen näkyviin

Mitoitus saa asettelun oikeaksi; se ei saa pikseleitä näkymään siellä, missä
SVG päätyykin näytettäväksi. Valitse yksi kolmesta lähestymistavasta.

### 1. Isännöi tiedosto

Tarjoa kuva URL-osoitteessa (tai polussa suhteessa paikkaan, jossa SVG
näytetään), jonka selain/kuluttaja voi hakea. Tämä on yksinkertaisin vaihtoehto ja
ei vaadi lisätyötä renderöintihetkellä — mutta näyttökontekstin on tavoitettava
kyseinen alkuperä, ja jos SVG näytetään jossain, missä on tiukka `img-src`-
CSP, kyseinen alkuperä on sallittava myös siellä (katso alla).

### 2. Upota `data:`-URI:na

Käytä upotus-API:a tuottaaksesi yhden itsenäisen SVG-merkkijonon ilman
ulkoista hakua lainkaan: `setImageResolver` toimittaa raakatavut, ja
`render(g, 'svg', { inlineImages: true })` upottaa ne.

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

`ImageResolver` voi palauttaa myös `{ bytes: Uint8Array; mime?: string }`, kun
haluat määrittää MIME-tyypin eksplisiittisesti (muuten emitteri päättelee sen
lähteen tiedostopäätteestä — `.png` → `image/png`, `.svg` →
`image/svg+xml` ja niin edelleen, ja tuntemattomilla päätteillä käytetään arvoa `application/octet-stream`).
Tyhjennä rekisteröinti kutsulla `setImageResolver(null)`.

::: tip
Suosi upottamista, kun SVG kulkee paikkaan, joka ei voi hakea ulkoisia
resursseja näyttöhetkellä — sähköpostiohjelmiin, offline-dokumentaatioon, tiukan CSP:n upotukseen
tai mihin tahansa, missä haluat yhden itsenäisen merkkijonon ilman jatkoverkkopyyntöä.
Vastapainona on tulosteen koko: base64 paisuttaa kuvaa noin 33 %, ja
se monistetaan jokaiseen sitä käyttävään SVG:hen (ei selaimen välimuistin uudelleenkäyttöä
renderöintien välillä).
:::

`inlineImages` on oletuksena `false`; asettamattomana tuloste on tavu tavulta sama kuin
upotusta edeltävässä läpivientitilassa. Se vaikuttaa vain `svg`-muotoon — sillä ei ole vaikutusta
`json`-/`xdot`-/`dot`-/muihin tekstimuotoihin. Ohitus (ratkaisijaa ei ole rekisteröity tai
ratkaisija palauttaa kyseiselle `src`-arvolle `null`) palaa automaattisesti raakaan
`src`-läpivientiin — upotus heikkenee sulavasti, se ei koskaan heitä poikkeusta.

### 3. `imagepath`-tyyliset perushakemistot

Natiivin Graphvizin `imagepath`-graafiattribuutti kertoo C-binäärille
tiedostojärjestelmän/`GDFONTPATH`-tyylisen hakuhakemiston, jota vasten suhteelliset `image=`-
arvot ratkaistaan. @knowvah/dot-engine ei toteuta `imagepath`-attribuuttia — porttaus ei
koskaan lue kuvadataa levyltä itse, joten ei ole polkua, jota vasten ratkaista
(katso [Tunnetut poikkeamat](/fi/divergences) täydestä rajauksesta). Jos
graafisi käyttävät suhteellisia `image=`-polkuja, ratkaise ne oman perushakemistosi/URL:si
suhteen siinä kerroksessa, joka muodostaa DOT-lähdekoodin, tai omissa
`setImageSizer`-/`ImageResolver`-takaisinkutsuissasi — molemmat saavat raa'an `src`-merkkijonon
täsmälleen sellaisena kuin se on kirjoitettu graafiin, joten perushakemiston etuliitteen
lisääminen merkkijonoon ennen hakua on normaali, hyväksytty malli.

## CSP-ohjeistus

Jos graafisi ovat käyttäjän toimittamia (leikkikenttä, upotus, joka renderöi
mielivaltaista DOT:ia), mieti sivun `img-src`-käytäntöä heti alussa.

**Upotetut kuvat (`data:`-URI:t)** tarvitsevat vain:

```
img-src 'self' data:
```

HTTP-vastausotsakkeena:

```
Content-Security-Policy: img-src 'self' data:
```

Tai meta-tagina SVG:n isännöivällä sivulla:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

Se on tiukka — mitään ulkoista kuvapalvelinta ei koskaan kontaktoida, koska tavut
on jo upotettu SVG-merkkijonoon.

**Isännöidyt kuvat (yllä oleva vaihtoehto 1)** sen sijaan edellyttävät, että näyttökonteksti
hakee kuvat sieltä, missä ne todella sijaitsevat. Jos käyttäjän toimittama graafi voi
viitata mielivaltaiseen `image=`-URL-osoitteeseen, kaikkien mahdollisten isäntien sallittaminen on
usein epäkäytännöllistä, joten leikkikenttä-/upotussivu saattaa tarvita jotain sallivaa:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
Älä koskaan tee `img-src *`-käytännöstä (tai yhtä sallivasta `img-src`-käytännöstä) **koko sivuston**
oletusta. Rajaa se tiettyyn leikkikenttä-/upotussivuun, joka tarvitsee mielivaltaisten
käyttäjän toimittamien graafien renderöintiä, kohtele sitä tarkoituksellisena, dokumentoituna
höllennyksenä vain kyseiselle sivulle ja pidä kaikkien muiden sivujen CSP tiukkana. Salliva
`img-src` antaa haitallisen graafin vuotaa dataa kuva-URL:n
sivukanavien kautta (esim. koodaamalla dataa kyselyparametreihin hyökkääjän hallitsemaa
isäntää vasten) tai ladata ei-toivottua etäsisältöä. Jos hallitset
kuvajoukon, suosi upottamista (`data:`) ja pidä `img-src 'self'
data:` kaikkialla.
:::

## Puuttuvat kuvat

Jos `setImageSizer` palauttaa `null` (tai mittaajaa ei ole rekisteröity) viitatulle
lähteelle, @knowvah/dot-engine noudattaa samaa C-uskollista polkua kuin natiivin
Graphvizin `gvusershape`-ohitus: se varoittaa ja käsittelee kuvan **nollakokoisena**,
mikä vaikuttaa sen ympärille laskettuun solmulaatikon asetteluun. Jos
`setImageResolver`/`inlineImages` on käytössä ja ratkaisija ohittaa, emitteri
palaa raakaan `src`-läpivientiin upottamisen sijaan — `href` kirjoitetaan silti,
se vain ei ratkea, ellei jokin muu sivulla voi hakea sitä. Katso [Tunnetut poikkeamat](/fi/divergences),
mikä kuuluu ja ei kuulu kuva-/rasterikäsittelyn piiriin yleisesti.
