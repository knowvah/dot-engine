---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Tekstin mittaus

`dot`-asettelu tarvitsee jokaisen nimiön leveyden ja korkeuden solmujen mitoitukseen ja
kaarten sijoitteluun. @knowvah/dot-engine mittaa tekstin yhden vaihdettavan liitäntäkohdan,
`TextMeasurer`-rajapinnan, kautta ja valitsee käytettävän automaattisesti — tai voit asettaa
oman.

## Sopimus

Tavoitteita on kaksi erillistä, ja ne vaativat eri mittaajat:

| Tavoite | Mittaaja | Deterministinen? | Kerning / muotoilu (shaping) |
|------|----------|----------------|-------------------|
| **Toistettava asettelu** (sama tulos kaikkialla) | sisäänrakennettu mittamalli | kyllä | ei |
| **Isäntäympäristöä myötäilevä asettelu** (vastaa renderöintifonttia) | alustan canvas | ei (riippuu fontista) | kyllä |

Natiivi graphviz on itse isäntäympäristöä myötäilevä — sen tuotos riippuu sen
ajavalle koneelle asennetuista fonteista. @knowvah/dot-engine antaa valita: oletuksena
deterministinen, isäntäympäristöä myötäilevä, kun otat sen käyttöön.

## Automaattinen valinta

Kun et aseta mittaajaa, @knowvah/dot-engine valitsee sellaisen renderöintikohtaisesti:

1. `setTextMeasurer`-funktiolla asetettu eksplisiittinen mittaaja (voittaa, jos on);
2. **selain** (`document` saatavilla) → sivun `<canvas>` — isäntäympäristöä myötäilevä,
   mittaa samalla fontilla, jolla selain renderöi SVG-tekstin;
3. **Node** → sisäänrakennettu deterministinen mittamalli.

Kirjastolla on **nolla ajonaikaista riippuvuutta**, eikä se koskaan tuo fonttikirjastoa tai
`canvas`-pakettia itse, joten selaimeen niputettu paketti pysyy pienenä ja Noden oletus ei
koskaan lue tiedostojärjestelmää.

## Isäntäympäristöä myötäilevä mittaus Nodessa

Jos haluat Node-tulosteen, jonka laatikot sopivat tiettyyn fonttiin (oikea kerning ja muotoilu),
asenna valinnainen `canvas`-vertaisriippuvuus ja kytke se kerran käynnistyksessä:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` on ilmoitettu **valinnaiseksi vertaisriippuvuudeksi** — sitä ei asenneta,
ellet pyydä sitä. Kun Node palaa sisäänrakennettuun malliin
interaktiivisessa terminaalissa, @knowvah/dot-engine tulostaa tämän neuvon kerran; vaimenna se
asetuksella `GV_FONT_QUIET=1`.

## Omat mittaajat

`setTextMeasurer` hyväksyy minkä tahansa `TextMeasurer`-rajapinnan toteutuksen:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

Sisäänrakennetut toteutukset viedään uudelleenkäytettäviksi: `CanvasTextMeasurer` (kääri mikä
tahansa 2D-konteksti), `EstimateTextMeasurer` (deterministinen, hintaamaton referenssi, joka
vastaa headless-graphvizin `estimate_textspan_size`-funktiota — **tämä on Noden
oletus**) ja `LutTextMeasurer` (hinting-ohjattu fonttiperhekohtainen hakutaulukko,
valinnaisena käyttöön otettavissa tarkempaan mitoitukseen ilman natiivia `canvas`-riippuvuutta).

## Miksi tämä jako

Kerning, ligatuurit ja ei-ASCII-glyfien leveydet riippuvat varsinaisen fontin muotoilu-
taulukoista — merkkikohtainen leveystaulukko ei voi esittää niitä, ja oikeat arvot
vaihtelevat fontista toiseen (tasalevyinen fontti renderöi `<=` kahtena solukkona; suhteellinen fontti
kernaa `VA`-parin tiiviimmäksi). Toistettava asettelu käyttää siksi kiinteää mittamallia;
todellista renderöintifonttia vastaava mittaus vaatii mittaamista kyseisellä fontilla, minkä
canvas-pohjainen mittaaja tekee.
