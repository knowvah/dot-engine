---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Textvermessung

Das dot-Layout benötigt Breite und Höhe jedes Labels, um Knoten zu dimensionieren und
Kanten zu platzieren. @knowvah/dot-engine vermisst Text über eine einzige austauschbare
Nahtstelle, den `TextMeasurer`, und ermittelt automatisch, welcher verwendet wird — oder
Sie setzen Ihren eigenen.

## Der Vertrag

Es gibt zwei verschiedene Ziele, die unterschiedliche Measurer erfordern:

| Ziel | Measurer | Deterministisch? | Kerning / Shaping |
|------|----------|------------------|-------------------|
| **Reproduzierbares Layout** (überall dieselbe Ausgabe) | eingebautes Metrikmodell | ja | nein |
| **Hostgetreues Layout** (passt zur Rendering-Schrift) | das Canvas der Plattform | nein (schriftabhängig) | ja |

Das native Graphviz selbst ist hostgetreu — seine Ausgabe hängt von den Schriften ab, die
auf dem ausführenden Rechner installiert sind. @knowvah/dot-engine lässt Ihnen die Wahl:
standardmäßig deterministisch, hostgetreu, wenn Sie sich dafür entscheiden.

## Automatische Auflösung

Wenn Sie keinen Measurer setzen, wählt @knowvah/dot-engine pro Rendering einen aus:

1. ein explizit über `setTextMeasurer` gesetzter Measurer (hat Vorrang, falls vorhanden);
2. **Browser** (`document` verfügbar) → das `<canvas>` der Seite — hostgetreu, vermisst
   mit derselben Schrift, mit der der Browser den SVG-Text darstellt;
3. **Node** → das eingebaute deterministische Metrikmodell.

Die Bibliothek hat **keine Laufzeitabhängigkeiten** und importiert selbst nie eine
Schriftbibliothek oder `canvas`, sodass das Browser-Bundle klein bleibt und der
Node-Standard nie das Dateisystem liest.

## Hostgetreue Vermessung in Node

Für Node-Ausgaben, deren Kästen zu einer bestimmten Schrift passen (echtes Kerning und
Shaping), installieren Sie den optionalen Peer `canvas` und verdrahten ihn einmal beim
Start:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` ist als **optionale Peer-Abhängigkeit** deklariert — es wird nur installiert,
wenn Sie es anfordern. Wenn Node in einem interaktiven Terminal auf das eingebaute Modell
zurückfällt, gibt @knowvah/dot-engine diesen Hinweis einmalig aus; mit `GV_FONT_QUIET=1`
unterdrücken Sie ihn.

## Eigene Measurer

`setTextMeasurer` akzeptiert alles, was `TextMeasurer` implementiert:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

Eingebaute Implementierungen werden zur Wiederverwendung exportiert: `CanvasTextMeasurer`
(umhüllt einen beliebigen 2D-Kontext), `EstimateTextMeasurer` (die deterministische,
ungehintete Referenz, die `estimate_textspan_size` des Headless-Graphviz entspricht —
**das ist der Node-Standard**) und `LutTextMeasurer` (eine gehintete Nachschlagetabelle
pro Schriftfamilie, als Opt-in verfügbar für genauere Größen ohne native
`canvas`-Abhängigkeit).

## Warum diese Aufteilung

Kerning, Ligaturen und die Breiten nicht-ASCII-Glyphen hängen von den Shaping-Tabellen der
tatsächlichen Schrift ab — eine Breitentabelle pro Zeichen kann sie nicht abbilden, und die
richtigen Werte unterscheiden sich je Schrift (eine Monospace-Schrift stellt `<=` als zwei
Zellen dar; eine Proportionalschrift unterschneidet `VA` enger). Reproduzierbares Layout
verwendet daher ein festes Metrikmodell; die Anpassung an eine echte Rendering-Schrift
erfordert die Vermessung mit dieser Schrift, und genau das leistet der Canvas-gestützte
Measurer.
