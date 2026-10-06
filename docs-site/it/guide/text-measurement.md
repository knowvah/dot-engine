---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Misurazione del testo

Il layout di dot ha bisogno di larghezza e altezza di ogni etichetta per dimensionare i nodi e collocare
gli archi. @knowvah/dot-engine misura il testo attraverso un unico punto di estensione collegabile, il
`TextMeasurer`, e risolve automaticamente quale usare — oppure puoi impostare il
tuo.

## Il contratto

Ci sono due obiettivi distinti, che richiedono misuratori diversi:

| Obiettivo | Misuratore | Deterministico? | Crenatura / shaping |
|------|----------|----------------|-------------------|
| **Layout riproducibile** (stesso output ovunque) | modello di metriche integrato | sì | no |
| **Layout fedele all'host** (coincide con il font di rendering) | il canvas della piattaforma | no (dipende dal font) | sì |

Lo stesso Graphviz nativo è fedele all'host — il suo output dipende dai font
installati sulla macchina che lo esegue. @knowvah/dot-engine ti lascia scegliere: deterministico
per impostazione predefinita, fedele all'host quando lo attivi.

## Risoluzione automatica

Quando non imposti un misuratore, @knowvah/dot-engine ne sceglie uno a ogni rendering:

1. un misuratore esplicito impostato tramite `setTextMeasurer` (vince se presente);
2. **browser** (`document` disponibile) → il `<canvas>` della pagina — fedele all'host,
   misura con lo stesso font con cui il browser renderizzerà il testo dell'SVG;
3. **Node** → il modello di metriche deterministico integrato.

La libreria ha **zero dipendenze a runtime** e non importa mai da sola una libreria di font né
`canvas`, quindi il bundle per il browser resta piccolo e il valore predefinito di Node non
legge mai il filesystem.

## Misurazione fedele all'host in Node

Per un output Node i cui riquadri si adattino a un font specifico (crenatura e shaping reali),
installa la peer opzionale `canvas` e collegala una volta all'avvio:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` è dichiarato come **peer dependency opzionale** — non viene installato
a meno che tu non lo richieda. Quando Node ripiega sul modello integrato in un
terminale interattivo, @knowvah/dot-engine stampa questo avviso una volta sola; silenzialo con
`GV_FONT_QUIET=1`.

## Misuratori personalizzati

`setTextMeasurer` accetta qualsiasi cosa implementi `TextMeasurer`:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

Le implementazioni integrate sono esportate per il riuso: `CanvasTextMeasurer` (avvolge qualsiasi
contesto 2D), `EstimateTextMeasurer` (il riferimento deterministico e senza hinting che
coincide con `estimate_textspan_size` di Graphviz headless — **è il valore
predefinito di Node**) e `LutTextMeasurer` (una tabella di ricerca con hinting per famiglia di font,
disponibile su richiesta per un dimensionamento più fedele senza una dipendenza da `canvas` nativo).

## Perché questa suddivisione

Crenatura, legature e larghezze dei glifi non ASCII dipendono dalle tabelle di shaping
del font effettivo — una tabella di larghezze per carattere non può rappresentarle, e i valori corretti
cambiano da font a font (un font monospazio renderizza `<=` come due celle; un font proporzionale
crena `VA` più stretto). Il layout riproducibile usa quindi un modello di metriche fisso;
farlo coincidere con un font di rendering reale richiede di misurare con quel font, ed è ciò che
fa il misuratore basato su canvas.
