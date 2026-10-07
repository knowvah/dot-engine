---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Tekstmåling

Dot-layout trenger bredden og høyden på hver etikett for å fastsette størrelsen på noder og plassere
kanter. @knowvah/dot-engine måler tekst gjennom ett enkelt utskiftbart koblingspunkt, 
`TextMeasurer`, og velger automatisk hvilken som skal brukes — eller du kan sette
din egen.

## Kontrakten

Det finnes to ulike mål, og de krever ulike målere:

| Mål | Måler | Deterministisk? | Kerning / shaping |
|------|----------|----------------|-------------------|
| **Reproduserbar layout** (samme utdata overalt) | innebygd metrikkmodell | ja | nei |
| **Vertstro layout** (samsvarer med renderingsfonten) | plattformens canvas | nei (fontavhengig) | ja |

Native Graphviz er selv vertstro — utdataene avhenger av fontene som er
installert på maskinen som kjører det. @knowvah/dot-engine lar deg velge: deterministisk
som standard, vertstro når du velger det.

## Automatisk valg

Når du ikke setter en måler, velger @knowvah/dot-engine én per rendering:

1. en eksplisitt måler satt via `setTextMeasurer` (vinner hvis den finnes);
2. **nettleser** (`document` tilgjengelig) → sidens `<canvas>` — vertstro,
   måler med den samme fonten nettleseren vil rendre SVG-teksten med;
3. **Node** → den innebygde deterministiske metrikkmodellen.

Biblioteket har **ingen kjøretidsavhengigheter** og importerer aldri et fontbibliotek eller
`canvas` selv, så nettleserbunten forblir liten, og Node-standarden
leser aldri filsystemet.

## Vertstro måling i Node

For Node-utdata der boksene passer til en bestemt font (ekte kerning og shaping),
installer den valgfrie peer-avhengigheten `canvas` og koble den inn én gang ved oppstart:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` er deklarert som en **valgfri peer-avhengighet** — den installeres ikke
med mindre du ber om det. Når Node faller tilbake til den innebygde modellen i en
interaktiv terminal, skriver @knowvah/dot-engine ut dette rådet én gang; slå det av med
`GV_FONT_QUIET=1`.

## Egne målere

`setTextMeasurer` godtar alt som implementerer `TextMeasurer`:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

Innebygde implementasjoner eksporteres for gjenbruk: `CanvasTextMeasurer` (pakker inn en hvilken som helst
2D-kontekst), `EstimateTextMeasurer` (den deterministiske, ikke-hintede referansen som
samsvarer med hodeløs Graphviz' `estimate_textspan_size` — **dette er Node-standarden**),
og `LutTextMeasurer` (en hintet oppslagstabell per fontfamilie,
tilgjengelig som et valg for tettere størrelsesberegning uten en innebygd `canvas`-avhengighet).

## Hvorfor denne delingen

Kerning, ligaturer og bredder for ikke-ASCII-glyfer avhenger av den faktiske fontens shaping-
tabeller — en bredde-tabell per tegn kan ikke representere dem, og de riktige verdiene
varierer fra font til font (en monospace-font rendrer `<=` som to celler; en proporsjonal font
kerner `VA` tettere). Reproduserbar layout bruker derfor en fast metrikkmodell;
å samsvare med en faktisk renderingsfont krever måling med den fonten, og det er det
canvas-baserte måleren gjør.
