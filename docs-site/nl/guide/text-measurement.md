---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Tekstmeting

De dot-lay-out heeft de breedte en hoogte van elk label nodig om knopen te dimensioneren en
kanten te plaatsen. @knowvah/dot-engine meet tekst via één enkel verwisselbaar
koppelpunt, de `TextMeasurer`, en bepaalt automatisch welke wordt gebruikt — of
u stelt uw eigen in.

## Het contract

Er zijn twee verschillende doelen, die om verschillende meters vragen:

| Doel | Meter | Deterministisch? | Kerning / shaping |
|------|-------|------------------|-------------------|
| **Reproduceerbare lay-out** (overal dezelfde uitvoer) | ingebouwd metriekmodel | ja | nee |
| **Hostgetrouwe lay-out** (past bij het renderlettertype) | het canvas van het platform | nee (lettertypeafhankelijk) | ja |

Het native Graphviz zelf is hostgetrouw — de uitvoer hangt af van de lettertypen die
zijn geïnstalleerd op de machine waarop het draait. @knowvah/dot-engine laat u kiezen:
standaard deterministisch, hostgetrouw wanneer u daarvoor kiest.

## Automatische bepaling

Als u geen meter instelt, kiest @knowvah/dot-engine er per rendering een:

1. een expliciet via `setTextMeasurer` ingestelde meter (heeft voorrang indien aanwezig);
2. **browser** (`document` beschikbaar) → de `<canvas>` van de pagina — hostgetrouw,
   meet met hetzelfde lettertype waarmee de browser de SVG-tekst weergeeft;
3. **Node** → het ingebouwde deterministische metriekmodel.

De bibliotheek heeft **geen runtime-afhankelijkheden** en importeert zelf nooit een
lettertypebibliotheek of `canvas`, zodat de browserbundel klein blijft en de
Node-standaard nooit het bestandssysteem leest.

## Hostgetrouwe meting in Node

Voor Node-uitvoer waarvan de kaders passen bij een bepaald lettertype (echte kerning en
shaping) installeert u de optionele peer `canvas` en koppelt u die eenmalig bij het
opstarten:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` is gedeclareerd als **optionele peer-afhankelijkheid** — het wordt alleen geïnstalleerd
als u erom vraagt. Wanneer Node in een interactieve terminal terugvalt op het ingebouwde model,
toont @knowvah/dot-engine dit advies eenmalig; met `GV_FONT_QUIET=1`
onderdrukt u het.

## Eigen meters

`setTextMeasurer` accepteert alles wat `TextMeasurer` implementeert:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

Ingebouwde implementaties worden geëxporteerd voor hergebruik: `CanvasTextMeasurer`
(omhult een willekeurige 2D-context), `EstimateTextMeasurer` (de deterministische,
ongehinte referentie die overeenkomt met `estimate_textspan_size` van headless Graphviz —
**dit is de Node-standaard**) en `LutTextMeasurer` (een gehinte opzoektabel
per lettertypefamilie, als opt-in beschikbaar voor nauwkeurigere afmetingen zonder native
`canvas`-afhankelijkheid).

## Waarom deze tweedeling

Kerning, ligaturen en de breedtes van niet-ASCII-glyfen hangen af van de shaping-tabellen van het
daadwerkelijke lettertype — een breedtetabel per teken kan ze niet weergeven, en de
juiste waarden verschillen per lettertype (een monospace-lettertype toont `<=` als twee
cellen; een proportioneel lettertype kernt `VA` dichter). Reproduceerbare lay-out
gebruikt daarom een vast metriekmodel; aansluiten op een echt renderlettertype
vereist meten met dat lettertype, en dat is precies wat de op canvas gebaseerde
meter doet.
