---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Migration von anderen JS-Graphviz-Bibliotheken

viz.js / `@viz-js/viz`, `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`) und
`d3-graphviz` geben JavaScript Zugriff auf Graphviz, indem sie das echte
C-Graphviz zu **WebAssembly** kompilieren und aufrufen. @knowvah/dot-engine ist
eine von Grund auf neu geschriebene **TypeScript-Portierung** — die
Layout-Engines, der Parser und der SVG-Emitter sind TypeScript-Quelltext, kein
kompiliertes Binary.

Dieser Unterschied ist die Hauptsache, keine Fußnote:

| | WASM-Wrapper (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Implementierung | Echtes C-Graphviz, zu einem `.wasm`-Binary kompiliert | Reine TypeScript-Portierung, kein kompiliertes Artefakt |
| Modul-Initialisierung | Asynchron — das WASM-Modul vor der ersten Verwendung instanziieren und abwarten | Keine — `import` und synchron aufrufen |
| Bundle | Ein `.wasm`-Asset (einige Hundert KB bis niedrige MB) zusätzlich zum JS ausliefern | Nur JS, Tree-Shaking möglich |
| Debugging | Durch einen WASM-Blob steppen (oder durch C-Quelltext, falls vorhanden) | Durch das echte TypeScript steppen, mit Source Maps |
| Threading-Modell | Manche Builds führen das Layout in einem Web Worker aus | Läuft im aufrufenden Thread wie jede TS-Funktion |
| Ausgabeformate | Was auch immer der zugrunde liegende C-Build enthielt — typischerweise der volle Graphviz-Satz, einschließlich Raster/PDF | SVG + die Textformate DOT/json/xdot/plain/imagemap — siehe unten |

Wenn Ihr Anwendungsfall lautet „eine Funktion aufrufen, SVG zurückbekommen, kein
asynchrones Zeremoniell, kein WASM-Asset zum Hosten“ — dafür ist
@knowvah/dot-engine gedacht. Hängt Ihr Anwendungsfall von Raster- oder
PDF-Ausgabe ab, lesen Sie unten [Wann Sie bei WASM bleiben sollten](#wann-sie-bei-wasm-bleiben-sollten).

## API-Unterschiede

Die drei Bibliotheken haben unterschiedliche Formen; die folgende Tabelle zeigt
den üblichen Migrationsfall (ungefähr — prüfen Sie gegen die jeweils eigene
Dokumentation; Belege unter der Tabelle).

| Bibliothek | Typischer Aufruf | Entsprechung in @knowvah/dot-engine |
|---|---|---|
| `@viz-js/viz` (Nachfolger von viz.js) | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — asynchron, `Viz.instance()` löst ein Promise auf | `renderSvg(dot, 'dot')` — synchron, kein Instanz-/Init-Schritt |
| viz.js 2.x (veraltet, `new Viz()`) | `new Viz().renderString(dot)` — liefert ein `Promise<string>` | `renderSvg(dot, 'dot')` — synchron |
| `@hpcc-js/wasm-graphviz` | einmal `await Graphviz.load()`, dann `graphviz.dot(dot)` (nach dem Laden synchron) | `renderSvg(dot, engine)` — überhaupt kein Lade-/Aufwärmschritt |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — bindet die Ausgabe ins DOM ein, animiert Übergänge | `renderSvg(dot, engine)` liefert eine SVG-**Zeichenkette**; Sie fügen sie selbst ins DOM ein (z. B. `el.innerHTML = svg`) |

Jeder Aufruf von @knowvah/dot-engine in der rechten Spalte ist **synchron** — es
gibt kein Modul abzuwarten, weil es kein WASM-Binary zu instanziieren gibt.
Entfernen Sie jedes `await`/`.then()` um einen Aufruf von @knowvah/dot-engine; es
war nie nötig.

- `Viz.instance()` → Promise und die Methode `renderSVGElement()` von
  `@viz-js/viz` sind auf viz-js.com dokumentiert; zum Zeitpunkt der
  Niederschrift bestätigt durch das veröffentlichte Verwendungsbeispiel des
  Projekts.
- `new Viz().renderString(dot)` von viz.js 2.x ist die für diese (inzwischen
  abgelöste) Release-Linie dokumentierte API; wenn Sie eine aktuelle
  Installation haben, prüfen Sie, ob Sie tatsächlich bei `@viz-js/viz` sind.
- Das Paar `Graphviz.load()` / `graphviz.dot()` von `@hpcc-js/wasm-graphviz` ist
  zum Zeitpunkt der Niederschrift durch das veröffentlichte Verwendungsbeispiel
  des Pakets bestätigt. Das separate, ältere Paket `@hpcc-js/wasm` bot in
  früheren Releases zusätzlich einen Aufruf `graphviz.layout(dot, format, engine)`
  an — prüfen Sie die Dokumentation Ihrer installierten Version, bevor Sie sich
  auf die genaue Signatur verlassen.
- Die Kette `.graphviz().renderDot(dot)` von `d3-graphviz` und dass es intern auf
  `@hpcc-js/wasm` aufbaut, ist zum Zeitpunkt der Niederschrift durch die
  veröffentlichte README des Projekts bestätigt.

### Die DOM-Anbindung von `renderDot` liegt hier außerhalb des Umfangs

`d3-graphviz` leistet mehr als SVG zu rendern: Es bindet das Ergebnis in eine
D3-Selektion ein, bildet Differenzen bei erneutem Rendern und animiert
Übergänge zwischen Layouts. @knowvah/dot-engine hat überhaupt keine Meinung zum
DOM — `renderSvg`/`render` liefern eine schlichte Zeichenkette. Wenn Sie
animierte Übergänge zwischen zwei Layouts im Stil von d3-graphviz wollen, ist
das Logik, die Sie auf zwei `renderSvg`-Aufrufen und Ihrem eigenen DOM-Diffing
aufbauen würden (oder Sie verwenden für genau dieses Feature weiterhin
d3-graphviz — siehe unten).

## Layoutdaten ohne Parsen eines Zeichenkettenformats

Bei allen drei WASM-Bibliotheken können Sie Graphvizs eigene Formate JSON oder
Plain Text anfordern und die Zeichenkette dann selbst parsen, um Knoten- und
Kantenkoordinaten zu erhalten. @knowvah/dot-engine erspart den Textumweg: Rufen
Sie `getLayout(g)` auf (nach `render`), um direkt einen typisierten,
JSON-serialisierbaren Snapshot zu erhalten — ohne `-Tjson`-/`-Tplain`-Zeichenkette
zum Parsen.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes  → [{ name: 'a', x, y, width, height }, ...]
// layout.edges  → [{ tail: 'a', head: 'b', points: [...] }]
// layout.bounds → { x, y, width, height }
```

Die vollständige Form des Snapshots, die Einheiten und die Option `yAxis`
beschreibt [Berechnete Geometrie auslesen](/de/guide/geometry).

## Wann Sie bei WASM bleiben sollten

Seien Sie ehrlich zum Umfang: @knowvah/dot-engine zielt auf SVG sowie die
Textformate `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx`. Es gibt
**keine** Rasterformate (PNG/JPEG/GIF/...) und kein PostScript/PDF/EPS aus —
das ist eine bewusste Grenze des Umfangs, keine bloß unfertige Lücke. Die genaue
Liste der Nicht-Ziele steht unter [Bekannte Abweichungen](/de/divergences).

Braucht Ihre Anwendung `-Tpng`- oder `-Tpdf`-Ausgabe direkt aus der
Layout-Engine, decken die oben genannten WASM-basierten Bibliotheken diesen Fall
weiterhin ab — da sie das echte C-Graphviz ausführen, unterstützen sie
beliebige Ausgabeformate, mit denen dieser Build kompiliert wurde. In diesem
Szenario nutzen Sie entweder für diesen einen Codepfad weiter die
WASM-Bibliothek oder rendern mit @knowvah/dot-engine nach `'svg'` und
konvertieren das SVG nachgelagert mit einem separaten Werkzeug in ein
Raster-/PDF-Format.

## Siehe auch

- [Layout-Engines](/de/guide/engines)
- [In andere Formate rendern](/de/guide/render-formats)
- [Berechnete Geometrie auslesen](/de/guide/geometry)
- [Bekannte Abweichungen](/de/divergences)
- [Erste Schritte](/de/guide/getting-started)
