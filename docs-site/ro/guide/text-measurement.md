---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Măsurarea textului

Aranjarea dot are nevoie de lățimea și înălțimea fiecărei etichete pentru a dimensiona nodurile și a plasa
muchiile. @knowvah/dot-engine măsoară textul printr-un singur punct de extensie conectabil, 
`TextMeasurer`, și alege automat pe care să îl folosească — sau îl puteți seta
pe al dumneavoastră.

## Contractul

Există două obiective distincte, care cer măsurători diferite:

| Obiectiv | Măsurător | Determinist? | Kerning / modelare |
|------|----------|----------------|-------------------|
| **Aranjare reproductibilă** (aceeași ieșire peste tot) | model de metrici încorporat | da | nu |
| **Aranjare fidelă gazdei** (se potrivește cu fontul de randare) | canvas-ul platformei | nu (depinde de font) | da |

Graphviz nativ este el însuși fidel gazdei — ieșirea sa depinde de fonturile
instalate pe mașina care îl rulează. @knowvah/dot-engine vă lasă să alegeți: determinist
implicit, fidel gazdei când optați pentru asta.

## Rezolvare automată

Când nu setați un măsurător, @knowvah/dot-engine alege unul la fiecare randare:

1. un măsurător explicit setat prin `setTextMeasurer` (are prioritate dacă există);
2. **browser** (`document` disponibil) → `<canvas>`-ul paginii — fidel gazdei,
   măsurând cu același font cu care browserul va randa textul SVG;
3. **Node** → modelul de metrici determinist încorporat.

Biblioteca are **zero dependențe la rulare** și nu importă niciodată ea însăși o bibliotecă de fonturi sau
`canvas`, astfel încât pachetul pentru browser rămâne mic, iar valoarea implicită din Node nu
citește niciodată sistemul de fișiere.

## Măsurare fidelă gazdei în Node

Pentru ieșirea din Node ale cărei casete se potrivesc unui font anume (kerning și modelare reale),
instalați dependența peer opțională `canvas` și conectați-o o singură dată la pornire:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` este declarat ca **dependență peer opțională** — nu este instalat
decât dacă îl cereți. Când Node revine la modelul încorporat într-un
terminal interactiv, @knowvah/dot-engine afișează acest sfat o singură dată; îl puteți reduce la tăcere cu
`GV_FONT_QUIET=1`.

## Măsurători proprii

`setTextMeasurer` acceptă orice implementează `TextMeasurer`:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

Implementările încorporate sunt exportate pentru reutilizare: `CanvasTextMeasurer` (încadrează orice
context 2D), `EstimateTextMeasurer` (referința deterministă, fără hinting, care
corespunde lui `estimate_textspan_size` din graphviz fără interfață grafică — **aceasta este valoarea
implicită din Node**) și `LutTextMeasurer` (un tabel de căutare cu hinting pentru fiecare familie de fonturi,
disponibil opțional pentru o dimensionare mai apropiată, fără dependența nativă `canvas`).

## De ce această separare

Kerning-ul, ligaturile și lățimile glifelor non-ASCII depind de tabelele de modelare ale
fontului real — un tabel de lățimi pe caracter nu le poate reprezenta, iar valorile corecte
diferă de la un font la altul (un font monospațiat randează `<=` ca două celule; un font proporțional
apropie `VA` prin kerning). Aranjarea reproductibilă folosește, prin urmare, un model fix de metrici;
potrivirea cu un font real de randare cere măsurarea cu acel font, ceea ce face
măsurătorul bazat pe canvas.
