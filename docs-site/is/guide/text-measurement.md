---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Textamæling

Uppsetning með dot þarf breidd og hæð hvers merkis til að ákvarða stærð hnúta og staðsetja
leggi. @knowvah/dot-engine mælir texta í gegnum einn skiptanlegan tengipunkt,
`TextMeasurer`, og velur sjálfkrafa hvern á að nota — eða þú getur sett
þinn eigin.

## Samningurinn

Markmiðin eru tvö ólík og þau kalla á mismunandi mæla:

| Markmið | Mælir | Ákvarðandi? | Stafabilsstilling / mótun |
|------|----------|----------------|-------------------|
| **Endurtakanleg uppsetning** (sama úttak alls staðar) | innbyggt mælilíkan | já | nei |
| **Uppsetning sem fylgir hýsilnum** (samsvarar teikniletrinu) | canvas pallsins | nei (háð letri) | já |

Upprunalega graphviz fylgir sjálft hýsilnum — úttak þess fer eftir letrunum
sem eru uppsett á vélinni sem keyrir það. @knowvah/dot-engine lætur þig velja: ákvarðandi
sjálfgefið, fylgir hýsilnum þegar þú velur það.

## Sjálfvirkt val

Þegar þú setur ekki mæli velur @knowvah/dot-engine einn við hverja teikningu:

1. skýrt settan mæli með `setTextMeasurer` (sigrar ef hann er til);
2. **vafri** (`document` er til) → `<canvas>` síðunnar — fylgir hýsilnum,
   mælir með sama letri og vafrinn mun teikna SVG-textann með;
3. **Node** → innbyggða ákvarðandi mælilíkanið.

Safnið hefur **engin keyrsluháð söfn** og flytur aldrei sjálft inn leturssafn eða
`canvas`, svo vafrapakkinn helst lítill og sjálfgefið í Node les aldrei
skráakerfið.

## Mæling sem fylgir hýsilnum í Node

Fyrir úttak í Node þar sem kassarnir passa tilteknu letri (raunveruleg
stafabilsstilling og mótun) skaltu setja upp valfrjálsa jafningjapakkann `canvas` og tengja hann einu sinni við ræsingu:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` er lýstur sem **valfrjáls jafningjaháður pakki** — hann er ekki settur upp
nema þú biðjir um hann. Þegar Node fellur aftur á innbyggða líkanið í
gagnvirkri skel prentar @knowvah/dot-engine þessi ráð einu sinni; þaggaðu þau niður með
`GV_FONT_QUIET=1`.

## Eigin mælar

`setTextMeasurer` tekur við hverju sem útfærir `TextMeasurer`:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

Innbyggðar útfærslur eru fluttar út til endurnotkunar: `CanvasTextMeasurer` (vefur um hvaða
2D-samhengi sem er), `EstimateTextMeasurer` (ákvarðandi viðmiðið án tilsniðningar sem
samsvarar `estimate_textspan_size` í graphviz án skjás — **þetta er sjálfgefið í
Node**) og `LutTextMeasurer` (tilsniðin uppflettitafla fyrir hverja leturfjölskyldu,
í boði sem valkostur fyrir nær hýsilnum stærðir án innbyggðs `canvas`-háðs).

## Hvers vegna þessi skipting

Stafabilsstilling (kerning), bandstafir (ligatures) og breidd stafa sem ekki eru ASCII ráðast af mótunartöflum
raunverulega letursins — breiddartafla fyrir hvern staf getur ekki lýst þeim, og réttu gildin
eru ólík eftir letri (einbilsletur teiknar `<=` sem tvö hólf; hlutfallsletur
færir `VA` nær hvort öðru). Endurtakanleg uppsetning notar því fast mælilíkan;
til að samsvara raunverulegu teikniletri þarf að mæla með því letri, sem er það sem
canvas-mælirinn gerir.
