---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Textmätning

Layouten i dot behöver bredd och höjd för varje etikett för att dimensionera noder och placera
kanter. @knowvah/dot-engine mäter text genom en enda utbytbar kopplingspunkt,
`TextMeasurer`, och väljer automatiskt vilken som används — eller så anger du
din egen.

## Kontraktet

Det finns två skilda mål, och de kräver olika mätare:

| Mål | Mätare | Deterministisk? | Kerning / formning |
|------|----------|----------------|-------------------|
| **Reproducerbar layout** (samma utdata överallt) | inbyggd mätmodell | ja | nej |
| **Värdtrogen layout** (matchar renderingstypsnittet) | plattformens canvas | nej (beror på typsnittet) | ja |

Inbyggd Graphviz är själv värdtrogen — dess utdata beror på de typsnitt som
är installerade på maskinen som kör den. @knowvah/dot-engine låter dig välja: deterministiskt
som standard, värdtroget när du väljer det.

## Automatiskt val

När du inte anger någon mätare väljer @knowvah/dot-engine en vid varje rendering:

1. en uttrycklig mätare angiven via `setTextMeasurer` (vinner om den finns);
2. **webbläsare** (`document` finns) → sidans `<canvas>` — värdtroget,
   med mätning i samma typsnitt som webbläsaren renderar SVG-texten med;
3. **Node** → den inbyggda deterministiska mätmodellen.

Biblioteket har **inga körtidsberoenden** och importerar aldrig ett typsnittsbibliotek eller
`canvas` självt, så webbläsarpaketet förblir litet och standardvalet i Node
aldrig läser filsystemet.

## Värdtrogen mätning i Node

För Node-utdata vars rutor passar ett visst typsnitt (äkta kerning och formning)
installerar du det valfria peer-beroendet `canvas` och kopplar in det en gång vid start:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` deklareras som ett **valfritt peer-beroende** — det installeras inte
om du inte ber om det. När Node faller tillbaka på den inbyggda modellen i en
interaktiv terminal skriver @knowvah/dot-engine ut det här rådet en gång; tysta det med
`GV_FONT_QUIET=1`.

## Egna mätare

`setTextMeasurer` accepterar vad som helst som implementerar `TextMeasurer`:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

Inbyggda implementationer exporteras för återanvändning: `CanvasTextMeasurer` (omsluter valfri
2D-kontext), `EstimateTextMeasurer` (den deterministiska, ohintade referensen som
matchar huvudlösa Graphviz `estimate_textspan_size` — **detta är standardvalet i
Node**) och `LutTextMeasurer` (en hintad uppslagstabell per typsnittsfamilj,
tillgänglig som tillval för närmare storleksberäkning utan ett inbyggt `canvas`-beroende).

## Varför den här uppdelningen

Kerning, ligaturer och breddmått för icke-ASCII-glyfer beror på det faktiska typsnittets
formningstabeller — en tabell med bredd per tecken kan inte representera dem, och de rätta värdena
skiljer sig mellan typsnitt (ett monospace-typsnitt renderar `<=` som två celler; ett proportionellt typsnitt
kernar `VA` tätare). Reproducerbar layout använder därför en fast mätmodell;
för att matcha ett verkligt renderingstypsnitt krävs mätning med just det typsnittet, vilket är vad
den canvasbaserade mätaren gör.
