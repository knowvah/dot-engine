---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Migration von der Kommandozeile `dot`

Die C-Programme `dot`/`neato`/`fdp`/... lesen eine `.dot`-Datei (oder stdin) und
schreiben eine gerenderte Datei (oder stdout). @knowvah/dot-engine hat kein
Dateisystem: Es nimmt eine DOT-**Zeichenkette** entgegen und gibt eine
gerenderte **Zeichenkette** zurück (oder, mit `getLayout`, ein schlichtes
JavaScript-Geometrieobjekt statt einer Zeichenkette, die Sie erst parsen
müssten).

```bash
dot -Kneato -Tsvg input.dot -o output.svg
```

```ts
import { renderSvg } from '@knowvah/dot-engine';
import { readFileSync, writeFileSync } from 'node:fs';

const dot = readFileSync('input.dot', 'utf8');
const svg = renderSvg(dot, 'neato');
writeFileSync('output.svg', svg);
```

Das Lesen und Schreiben der Dateien oben ist Ihr Code, nicht der der Bibliothek —
@knowvah/dot-engine berührt nie die Festplatte. Genau deshalb läuft es
unverändert in einem Browser-Tab, in dem es keine `input.dot` zu lesen gibt.

## `-K<engine>` — die Layout-Engine

`-K` wählt die Layout-Engine; @knowvah/dot-engine nimmt denselben Namen als
Argument `engine` von `renderSvg` oder als Feld `opts.engine` von `render`. Alle
acht Engines sind portiert:

| `-K`-Wert | @knowvah/dot-engine-Zeichenkette `engine` |
|---|---|
| `-Kdot` | `'dot'` (auch der Standardwert von `render`, wenn `engine` fehlt) |
| `-Kneato` | `'neato'` |
| `-Kfdp` | `'fdp'` |
| `-Ksfdp` | `'sfdp'` |
| `-Kcirco` | `'circo'` |
| `-Ktwopi` | `'twopi'` |
| `-Kosage` | `'osage'` |
| `-Kpatchwork` | `'patchwork'` |

```ts
renderSvg(dot, 'neato');
render(g, 'svg', { engine: 'neato' });
```

Was jede Engine leistet und welcher Konformitätsklasse sie angehört, steht unter
[Layout-Engines](/de/guide/engines).

## `-T<format>` — das Ausgabeformat

`renderSvg` kann nur SVG; für alles andere verwenden Sie
`render(g, format, opts?)`. Die Union `OutputFormat` von @knowvah/dot-engine
deckt diese `-T`-Ziele ab:

| `-T`-Wert | @knowvah/dot-engine-Zeichenkette `format` | Hinweise |
|---|---|---|
| `-Tsvg` | `'svg'` | auch die einzige Ausgabe von `renderSvg` |
| `-Tdot` | `'dot'` | DOT-Quelltext mit ergänzten Layoutattributen (`pos`, `bb`, ...) |
| `-Txdot` | `'xdot'` | DOT + xdot-Anweisungen `_draw_`/`_ldraw_` |
| `-Tjson` | `'json'` | vollständiger Graph als JSON |
| `-Tplain` | `'plain'` | durch Leerraum getrennte Knoten-/Kantengeometrie |
| `-Tplain-ext` | `'plain-ext'` | `plain`, zusätzlich mit Port-Koordinaten an den Kanten |
| `-Timap` | `'imap'` | serverseitige HTML-Image-Map |
| `-Tcmapx` | `'cmapx'` | clientseitiges HTML-Element `<map>` |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Nicht unterstützt:** Rasterformate (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps` sowie GUI- und interaktive Backends. Das ist eine
bewusste Grenze des Umfangs — die vollständige Liste der Nicht-Ziele finden Sie
unter [Bekannte Abweichungen](/de/divergences). Wenn Sie ein Rasterbild
brauchen, rendern Sie nach `'svg'` und konvertieren nachgelagert (ein
Headless-Browser, `resvg` oder Ähnliches).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — Attribute

Die globalen Attribut-Flags der CLI setzen von der Kommandozeile aus einen
Standardwert für jeden Graphen, Knoten bzw. jede Kante. @knowvah/dot-engine hat
keine Kommandozeilen-Flags — setzen Sie dieselben Attribute direkt im
DOT-Quelltext oder über die Builder-API, wenn Sie den Graphen im Code
aufbauen:

```bash
dot -Gsize=6,6 -Nshape=box -Ecolor=blue -Tsvg input.dot
```

```ts
// DOT source — put the defaults in a top-level attribute statement
const dot = `
  digraph {
    graph [size="6,6"];
    node  [shape=box];
    edge  [color=blue];
    a -> b;
  }
`;
const svg = renderSvg(dot, 'dot');
```

```ts
// Builder — set per-node/per-edge attrs where you create each one
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.setAttr('size', '6,6');
b.addNode('a', { shape: 'box' });
b.addNode('b', { shape: 'box' });
b.addEdge('a', 'b', { color: 'blue' });
const svg = render(b.graph, 'svg');
```

Die vollständige Builder-API steht unter
[Einen Graphen im Code aufbauen](/de/guide/build-a-graph).

## Geometrie, die die CLI nicht direkt liefern kann

`-Tplain` existiert genau dafür, dass Skripte Knoten- und Kantenkoordinaten aus
Textausgabe herauslesen können. @knowvah/dot-engine erspart diesen Umweg: Rufen
Sie nach `render` `getLayout(g)` auf, um einen typisierten, JSON-serialisierbaren
Snapshot jeder Knotenposition, jedes Kanten-Splines und der gesamten
Begrenzungsbox zu erhalten — ohne Textformat, das Sie parsen müssten.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes[0] → { name: 'a', x, y, width, height }
```

Die vollständige Form des Snapshots und die Option `yAxis` (natives Graphviz hat
nach oben zeigendes y, Browser nach unten zeigendes) beschreibt
[Berechnete Geometrie auslesen](/de/guide/geometry).

## Schriften und Bilder: Die CLI liest Ihr Dateisystem, @knowvah/dot-engine nicht

Natives `dot` vermisst Text mit den Schriften, die auf dem Rechner installiert
sind, und löst `image="..."`-Attribute auf, indem es Dateien relativ zum
Arbeitsverzeichnis liest. @knowvah/dot-engine hat keinen Dateisystemzugriff;
beides wird daher von der Host-Anwendung injiziert, statt von der Festplatte
gelesen zu werden:

- **Textvermessung** — `setTextMeasurer` installiert einen `TextMeasurer`; die
  Bibliothek wählt automatisch einen sinnvollen Standard (Browser-Canvas oder
  ein deterministisches Metrikmodell in Node), wenn Sie keinen setzen. Siehe
  [Textvermessung](/de/guide/text-measurement).
- **Bilder** — `setImageSizer` (und `setImageResolver` zum Inlining) erlauben
  es Ihnen, die intrinsischen Bildabmessungen und die Bilddaten selbst
  bereitzustellen, da @knowvah/dot-engine in Ihrem Auftrag keine Datei
  abfragen kann. Siehe [Mit Bildern arbeiten](/de/guide/images).

## Siehe auch

- [Layout-Engines](/de/guide/engines)
- [In andere Formate rendern](/de/guide/render-formats)
- [Berechnete Geometrie auslesen](/de/guide/geometry)
- [Bekannte Abweichungen](/de/divergences)
- [Erste Schritte](/de/guide/getting-started)
