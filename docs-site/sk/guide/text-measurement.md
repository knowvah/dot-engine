---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Meranie textu

Rozloženie modulu dot potrebuje šírku a výšku každého popisku, aby určilo veľkosť uzlov a umiestnilo
hrany. @knowvah/dot-engine meria text cez jediný zásuvný bod, `TextMeasurer`, a
automaticky určí, ktorý použiť — alebo si môžete nastaviť
vlastný.

## Zmluva {#the-contract}

Existujú dva odlišné ciele a vyžadujú si rôzne merače:

| Cieľ | Merač | Deterministický? | Kerning / tvarovanie |
|------|----------|----------------|-------------------|
| **Reprodukovateľné rozloženie** (rovnaký výstup všade) | vstavaný metrický model | áno | nie |
| **Rozloženie verné hostiteľovi** (zodpovedá vykresľovanému písmu) | canvas platformy | nie (závisí od písma) | áno |

Samotný natívny graphviz je verný hostiteľovi — jeho výstup závisí od písiem
nainštalovaných na stroji, na ktorom beží. @knowvah/dot-engine vám dáva na výber: štandardne
deterministický, verný hostiteľovi, keď sa na to rozhodnete.

## Automatické určenie {#automatic-resolution}

Keď merač nenastavíte, @knowvah/dot-engine vyberie jeden pri každom vykreslení:

1. explicitný merač nastavený cez `setTextMeasurer` (ak existuje, má prednosť);
2. **prehliadač** (`document` je dostupný) → `<canvas>` stránky — verný hostiteľovi,
   meria sa rovnakým písmom, akým prehliadač vykreslí text SVG;
3. **Node** → vstavaný deterministický metrický model.

Knižnica má **nulové runtime závislosti** a sama nikdy neimportuje knižnicu písiem ani
`canvas`, takže balík pre prehliadač zostáva malý a predvolená voľba v Node nikdy
nečíta súborový systém.

## Meranie verné hostiteľovi v Node {#host-faithful-measurement-in-node}

Ak chcete pre Node výstup s rámčekmi zodpovedajúcimi konkrétnemu písmu (skutočný kerning a tvarovanie),
nainštalujte voliteľnú peer závislosť `canvas` a raz pri štarte ju prepojte:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` je deklarovaný ako **voliteľná peer závislosť** — nenainštaluje sa,
kým oň nepožiadate. Keď Node v interaktívnom termináli prejde na vstavaný model,
@knowvah/dot-engine vypíše túto radu raz; potlačíte ju pomocou
`GV_FONT_QUIET=1`.

## Vlastné merače {#custom-measurers}

`setTextMeasurer` akceptuje čokoľvek, čo implementuje `TextMeasurer`:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

Vstavané implementácie sú exportované na opätovné použitie: `CanvasTextMeasurer` (obalí akýkoľvek
2D kontext), `EstimateTextMeasurer` (deterministická referencia bez hintingu, ktorá
zodpovedá `estimate_textspan_size` v graphviz bez displeja — **toto je predvolená voľba
v Node**) a `LutTextMeasurer` (vyhľadávacia tabuľka s hintingom pre každú rodinu písma,
dostupná ako voliteľná možnosť pre bližšie určenie veľkosti bez natívnej závislosti na `canvas`).

## Prečo toto rozdelenie {#why-this-split}

Kerning, ligatúry a šírky glyfov mimo ASCII závisia od tvarovacích tabuliek
skutočného písma — tabuľka šírok jednotlivých znakov ich nevie vyjadriť a správne hodnoty
sa líšia podľa písma (neproporcionálne písmo vykreslí `<=` ako dve bunky; proporcionálne písmo
zbližuje `VA`). Reprodukovateľné rozloženie preto používa pevný metrický model;
zodpovedať skutočnému vykresľovanému písmu vyžaduje merať práve týmto písmom, čo je to,
čo robí merač podporovaný canvasom.
