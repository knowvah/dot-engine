---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Tekstmåling

Dot-layout har brug for bredden og højden af hver etiket for at dimensionere knuder og
placere kanter. @knowvah/dot-engine måler tekst gennem én enkelt udskiftelig
snitflade, `TextMeasurer`, og finder automatisk ud af, hvilken der skal bruges — eller
du kan angive din egen.

## Kontrakten

Der er to adskilte mål, og de kræver forskellige målere:

| Mål | Måler | Deterministisk? | Kerning / shaping |
|------|----------|----------------|-------------------|
| **Reproducerbart layout** (samme output overalt) | indbygget metrikmodel | ja | nej |
| **Værtstro layout** (matcher renderingsskrifttypen) | platformens canvas | nej (afhænger af skrifttypen) | ja |

Native graphviz er selv værtstro — dets output afhænger af de skrifttyper, der er
installeret på den maskine, der kører det. @knowvah/dot-engine lader dig vælge:
deterministisk som standard, værtstro, når du tilvælger det.

## Automatisk opløsning

Når du ikke angiver en måler, vælger @knowvah/dot-engine én pr. render:

1. en eksplicit måler angivet via `setTextMeasurer` (vinder, hvis den findes);
2. **browser** (`document` tilgængelig) → sidens `<canvas>` — værtstro,
   måler med den samme skrifttype, som browseren vil rendere SVG-teksten med;
3. **Node** → den indbyggede deterministiske metrikmodel.

Biblioteket har **ingen runtime-afhængigheder** og importerer aldrig selv et
skrifttypebibliotek eller `canvas`, så browserbundlen forbliver lille, og
Node-standarden aldrig læser filsystemet.

## Værtstro måling i Node

For Node-output, hvor boksene passer til en bestemt skrifttype (ægte kerning og shaping),
installér den valgfri peer `canvas` og tilslut den én gang ved opstart:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` er deklareret som en **valgfri peer-afhængighed** — den installeres ikke,
medmindre du beder om den. Når Node falder tilbage til den indbyggede model i en
interaktiv terminal, udskriver @knowvah/dot-engine dette råd én gang; slå det fra med
`GV_FONT_QUIET=1`.

## Egne målere

`setTextMeasurer` accepterer alt, der implementerer `TextMeasurer`:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

Indbyggede implementeringer eksporteres til genbrug: `CanvasTextMeasurer` (ombryd en vilkårlig
2D-kontekst), `EstimateTextMeasurer` (den deterministiske, uhintede reference, der
matcher headless graphviz' `estimate_textspan_size` — **dette er Node-standarden**),
og `LutTextMeasurer` (en hintet opslagstabel pr. skrifttypefamilie,
tilgængelig som tilvalg for tættere dimensionering uden en native `canvas`-afhængighed).

## Hvorfor denne opdeling

Kerning, ligaturer og bredder af ikke-ASCII-glyffer afhænger af den faktiske skrifttypes
shaping-tabeller — en bredde-tabel pr. tegn kan ikke repræsentere dem, og de rigtige
værdier er forskellige fra skrifttype til skrifttype (en monospace-skrifttype renderer `<=` som to celler; en
proportional skrifttype kernerer `VA` tættere). Reproducerbart layout bruger derfor en fast
metrikmodel; at matche en rigtig renderingsskrifttype kræver måling med netop den skrifttype, hvilket
er det, den canvas-baserede måler gør.
