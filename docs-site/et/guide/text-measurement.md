---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Teksti mõõtmine

Dot-paigutus vajab iga sildi laiust ja kõrgust, et sõlmede suurust määrata ja
servi paigutada. @knowvah/dot-engine mõõdab teksti ühe ühendatava liidespunkti,
`TextMeasurer`-i kaudu ning valib kasutatava automaatselt — või saate seada
oma enda.

## Leping

Eesmärke on kaks ja need nõuavad erinevaid mõõtjaid:

| Eesmärk | Mõõtja | Deterministlik? | Kerning / kujundus (shaping) |
|------|----------|----------------|-------------------|
| **Reprodutseeritav paigutus** (sama väljund igal pool) | sisseehitatud mõõdumudel | jah | ei |
| **Hostiga kooskõlas paigutus** (ühtib renderdusfondiga) | platvormi canvas | ei (sõltub fondist) | jah |

Natiivne Graphviz ise on hostiga kooskõlas — selle väljund sõltub fontidest,
mis on selle käitamise masinasse paigaldatud. @knowvah/dot-engine laseb teil valida: vaikimisi deterministlik,
hostiga kooskõlas, kui seda soovite.

## Automaatne lahendamine

Kui te mõõtjat ei sea, valib @knowvah/dot-engine ühe iga renderduse jaoks:

1. `setTextMeasurer` kaudu seatud selgesõnaline mõõtja (võidab, kui olemas);
2. **brauser** (`document` on saadaval) → lehe `<canvas>` — hostiga kooskõlas,
   mõõdab sama fondiga, millega brauser SVG teksti renderdab;
3. **Node** → sisseehitatud deterministlik mõõdumudel.

Teegil on **null käitusaegset sõltuvust** ja see ei impordi kunagi fonditeeki ega
`canvas`-i ennast, nii et brauseri komplekt jääb väikeseks ja Node'i vaikimisi
mõõtja ei loe kunagi failisüsteemi.

## Hostiga kooskõlas mõõtmine Node'is

Node'i väljundi jaoks, mille kastid sobivad konkreetse fondiga (päris kerning ja kujundus),
paigaldage valikuline peer-pakett `canvas` ja ühendage see ühe korra käivitusel:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` on deklareeritud **valikulise peer-sõltuvusena** — seda ei paigaldata,
kui te seda ei küsi. Kui Node kasutab interaktiivses terminalis varuvariandina sisseehitatud
mudelit, trükib @knowvah/dot-engine selle nõuande ühe korra; vaigistage see
`GV_FONT_QUIET=1`-ga.

## Kohandatud mõõtjad

`setTextMeasurer` aktsepteerib kõike, mis teostab `TextMeasurer`-i:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

Sisseehitatud teostused on korduskasutuseks eksporditud: `CanvasTextMeasurer` (mähib mis tahes
2D-konteksti), `EstimateTextMeasurer` (deterministlik, vihjestamata etalon, mis
ühtib peata Graphvizi `estimate_textspan_size`-iga — **see on Node'i
vaikimisi mõõtja**) ja `LutTextMeasurer` (vihjestatud kirjapere-põhine otsingutabel,
saadaval valikuliselt täpsema mõõtmise jaoks ilma natiivse `canvas`-sõltuvuseta).

## Miks see jaotus

Kerning, ligatuurid ja mitte-ASCII glüüfide laiused sõltuvad tegeliku fondi kujundustabelitest
— märgipõhine laiusetabel ei suuda neid esitada ning õiged väärtused
erinevad fonditi (monospace-font renderdab `<=` kahe lahtrina; proportsionaalne font
kerniseb `VA` lähemale). Reprodutseeritav paigutus kasutab seetõttu fikseeritud mõõdumudelit;
päris renderdusfondiga ühtimiseks tuleb mõõta selle fondiga, mida
canvas-põhine mõõtja teebki.
