---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Typen-Referenz

Eine konzeptionelle Karte der öffentlichen Typen, gruppiert danach, woher Sie
sie erhalten: `createGraph`/`parse` (aufbauen + untersuchen), `getLayout`
(Geometrie-Snapshot), `render`/`getDrawOps` (Ausgabe) und das Root-Paket
(Engines, Bilder, Textvermessung, Fehler). Jeder Eintrag zeigt einen aus dem
Quelltext kopierten Formblock und einen Einzeiler zum Zweck. Die erschöpfende
Dokumentation Feld für Feld (einschließlich geerbter Mitglieder und JSDoc zu
jeder Eigenschaft) finden Sie in der generierten
[TypeDoc-Referenz](/reference/).

Diese Seite wiederholt nicht die Durchführung zum Koordinatensystem — dafür
siehe [Berechnete Geometrie auslesen](/de/guide/geometry). Den Hinweis zur
y-Achse nennt sie jedoch kurz erneut, wo immer die Felder eines Typs vom
Koordinatensystem abhängen.

## Aufbauen + untersuchen (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Ein opaker Handle auf das interne Graphmodell. Wird von `parse()` und von
`createGraph().graph` zurückgegeben. Übergeben Sie ihn an `render`, `getLayout`
und `getDrawOps`; konstruieren oder inspizieren Sie ihn nicht direkt — Builder
und Parser sind die einzigen unterstützten Wege, einen zu erzeugen.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

Optionen für `createGraph`. `directed`/`strict` wählen eine der vier
`GraphKind`s (gerichtet, ungerichtet, strikt gerichtet, strikt ungerichtet);
`name` setzt den Namen des Graphen (Standardwert `''`).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Opaker Handle für einen Graphknoten, den `builder.addNode(...)` zurückgibt.
`setHtmlAttr` kennzeichnet den Wert als HTML-artiges Label (entspricht
`label=<...>` im DOT-Text), sodass die Layout-Engine es als Markup vermisst.

### `GvEdge`

```ts
interface GvEdge {
  readonly tail: string;
  readonly head: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Opaker Handle für eine Graphkante, die `builder.addEdge(...)` zurückgibt.

### `GvGraphBuilder`

```ts
interface GvGraphBuilder {
  addNode(name: string, attrs?: Record<string, string>): GvNode;
  addEdge(
    tail: GvNode | string,
    head: GvNode | string,
    attrs?: Record<string, string>,
  ): GvEdge;
  addSubgraph(name: string, attrs?: Record<string, string>): GvGraphBuilder;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
  readonly graph: Graph;
}
```

Wird von `createGraph(...)` zurückgegeben. `addSubgraph` liefert einen
verschachtelten Builder, der auf diesen Teilgraphen beschränkt ist; über ihn
hinzugefügte Knoten sind zugleich Mitglieder des Root-Graphen. `.graph` ist der
Übergabepunkt an `render`/`getLayout`/`getDrawOps`. Siehe
[Einen Graphen im Code aufbauen](/de/guide/build-a-graph).

## Geometrie-Snapshot (`getLayout`)

::: tip Koordinatensystem
Native Graphviz-Koordinaten haben nach oben zeigendes y (Ursprung unten links).
`getLayout` verwendet standardmäßig `yAxis: 'down'` (Ursprung oben links,
Bildschirmkonvention) und spiegelt jede y-Koordinate; übergeben Sie
`{ yAxis: 'up' }` für native Graphviz-Koordinaten. Vollständige Durchführung:
[Berechnete Geometrie auslesen](/de/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

Optionen für `getLayout`. Standardwert `yAxis: 'down'`.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

Schlichter, JSON-serialisierbarer Snapshot der berechneten Geometrie eines
Graphen, zurückgegeben von `getLayout(g, opts?)`. `clusters` listet jeden
Cluster-Teilgraphen rekursiv auf (verschachtelte Cluster erhalten jeweils einen
eigenen Eintrag); bei Graphen ohne Cluster ist die Liste leer.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Gesamte Begrenzungsbox, in Punkt. Mit `yAxis: 'down'` sind `x`/`y` auf `(0, 0)`
normalisiert. Mit `yAxis: 'up'` sind `x`/`y` die rohe linke untere Ecke der
Begrenzungsbox des Graphen.

### `NodeGeometry`

```ts
interface NodeGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Geometrie pro Knoten. `x`/`y` sind der Knotenmittelpunkt. `width`/`height` sind
in **Punkt** — das Modell speichert sie in Zoll (`ND_width`/`ND_height`);
`getLayout` multipliziert vor der Rückgabe mit 72.

### `EdgeGeometry`

```ts
interface EdgeGeometry {
  tail: string;
  head: string;
  points: { x: number; y: number }[];
  label?: { x: number; y: number };
  tailLabel?: { x: number; y: number };
  headLabel?: { x: number; y: number };
  xlabel?: { x: number; y: number };
  sp?: { x: number; y: number };
  ep?: { x: number; y: number };
}
```

Geometrie pro Kante. `points` verkettet jeden Bézier-Kontrollpunkt des
geführten Splines in Reihenfolge (leer, wenn die Kante keinen geführten Spline
hat). `label` ist nur vorhanden, wenn die Kante eine mittige Beschriftung trägt.

`tailLabel` und `headLabel` sind die Positionen der Port-Beschriftungen
`taillabel`/`headlabel`. Jede ist nur vorhanden, sobald das Layout sie
platziert hat — unter derselben Bedingung, unter der `render()` ihr `<text>`
ausgibt —, sodass eine Port-Beschriftung, die sich nicht platzieren ließ (etwa
bei einer Kante ohne geführten Spline), als fehlend gemeldet wird statt als
Beschriftung im Ursprung.

`xlabel` ist die Position der externen Beschriftung `xlabel`. Anders als
`label` wird sie von Graphvizs Kräftesuche über Kandidatenpositionen rund um die
Kante gewählt und lässt sich daher weder aus `label` noch aus dem Mittelpunkt
des Splines ableiten. Es gilt dieselbe Nur-wenn-platziert-Regel: Ein deklariertes
xlabel, das die Suche nicht unterbringen konnte, wird als fehlend gemeldet,
genau wie `render()` es nicht zeichnet.

`sp` und `ep` sind die Pfeilansatzpunkte am Tail- und am Head-Ende. Trägt ein
Ende einen Pfeil, wird der Spline gekürzt, um Platz dafür zu lassen, und der
Pfeil reicht vom letzten Kontrollpunkt bis zu diesem Punkt — ein Verbraucher, der
eigene Pfeilspitzen zeichnet, liest die Spitze also hier aus, statt eine zu
extrapolieren. Jeder ist nur vorhanden, wenn dieses Ende tatsächlich einen Pfeil
hat; eine einfache Kante `digraph { a -> b }` meldet daher `ep` und kein `sp`,
und `arrowhead=none` meldet keines von beiden.

Das sind die Ansatzpunkte auf dem Knotenrand. Graphvizs eigener Renderer rückt
das Pfeilpolygon, das er daraus zeichnet, um einen von der Strichstärke
abhängigen Betrag nach innen; `ep` ist also der Punkt, *bis zu* dem ein Pfeil zu
zeichnen ist, keine Kopie der gerenderten Spitze.

### `ClusterGeometry`

```ts
interface ClusterGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: { x: number; y: number; width: number; height: number };
}
```

Begrenzungsbox pro Cluster. `name` ist der Name des Cluster-Teilgraphen (z. B.
`cluster6`); verschachtelte Cluster kodieren ihre Hierarchie im Namen, daher
wird kein expliziter Verweis auf das Elternelement bereitgestellt. Es gilt
dieselbe Koordinatenkonvention wie bei `BoundsGeometry`.

`label` ist die Platzierung des Cluster-Titels, nur vorhanden, wenn der Cluster
einen deklariert. Seine `x`/`y` sind der **Mittelpunkt** des Beschriftungsraums
— passend zu `EdgeGeometry.label`, nicht die Boxecke `x`/`y` oben — und
`width`/`height` sind die gemessene Textgröße, sodass die Beschriftungsbox
`[x - width/2, x + width/2] × [y - height/2, y + height/2]` ist und stets
innerhalb der Cluster-Box liegt. Beachten Sie, dass dies der *Mittelpunkt* der
Beschriftung ist, während das `<text>`, das `render()` ausgibt, die Grundlinie
trägt, die tiefer liegt.

## Rendern (`@knowvah/dot-engine/render`)

### `OutputFormat`

```ts
type OutputFormat =
  | 'svg'
  | 'dot'
  | 'xdot'
  | 'json'
  | 'plain'
  | 'plain-ext'
  | 'imap'
  | 'cmapx';
```

Geschlossene Union der Formate, die `render(g, format, opts?)` akzeptiert. Siehe
[In andere Formate rendern](/de/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

Optionen für `render`. `engine` hat den Standardwert `'dot'`. `inlineImages`
(neu) hat den Standardwert `false`; ist es `true`, inlined der SVG-Emitter
externe Bilder (`image=`/HTML-`<IMG>`) als `data:`-URIs, indem er den über
`setImageResolver` registrierten Resolver befragt — bei einem Fehlschlag des
Resolvers oder ohne Registrierung fällt er auf das unveränderte Durchreichen von
`src` zurück. Wirkungslos bei Nicht-SVG-Formaten. Siehe
[Mit Bildern arbeiten](/de/guide/images).

::: warning `yAxis` ist kein Feld von `RenderOptions`
Die Koordinatenorientierung ist allein eine Angelegenheit von `getLayout`. Die
rohen Formatzeichenketten, die `render` erzeugt, tragen native Koordinaten mit
nach oben zeigendem y; spiegeln Sie in der Nachbearbeitung, wenn Sie nach unten
zeigendes y brauchen und nicht über `getLayout` gehen.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

Optionen für `getDrawOps`. `engine` hat den Standardwert `'dot'`.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Geparstes Ergebnis eines xdot-Attributstroms: das dekodierte Array der
Zeichenoperationen plus eine Bitmaske mit Parse-Statusflags. `getDrawOps` gibt
nur das abgeflachte `XdotOp[]` über jedes Zeichenattribut des Graphen zurück, in
Zeichenreihenfolge (Graph → Knoten → Kante) — die vollständige Tabelle der
Operationsarten und ein Canvas-Beispiel stehen unter
[Eigenes Rendering mit xdot](/de/guide/xdot-drawops).

### `XdotOp`

```ts
type XdotOp =
  | { kind: 'filled_ellipse' | 'unfilled_ellipse'; ellipse: XdotRect }
  | { kind: 'filled_polygon' | 'unfilled_polygon'; polygon: XdotPolyline }
  | { kind: 'filled_bezier' | 'unfilled_bezier'; bezier: XdotPolyline }
  | { kind: 'polyline'; polyline: XdotPolyline }
  | { kind: 'text'; text: XdotText }
  | { kind: 'fill_color' | 'pen_color'; color: string }
  | { kind: 'grad_fill_color' | 'grad_pen_color'; gradColor: XdotColor }
  | { kind: 'font'; font: XdotFont }
  | { kind: 'style'; style: string }
  | { kind: 'image'; image: XdotImage }
  | { kind: 'fontchar'; fontchar: number };
```

Eine einzelne dekodierte xdot-Zeichenoperation, diskriminiert über `kind`. Jede
Variante trägt eine Nutzlast-Eigenschaft, die nach ihrer Form benannt ist —
grenzen Sie in einem `switch` auf `kind` ein, um sicher darauf zuzugreifen.
Koordinaten sind in Punkt im nativen Rahmen mit nach oben zeigendem y (für eine
Canvas mit nach unten zeigendem y spiegeln — siehe die oben verlinkte Anleitung).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

Eine aufgelöste xdot-Füll-/Strichfarbe: eine Volltonfarbe oder ein linearer bzw.
radialer Farbverlauf (`XdotLinearGrad`/`XdotRadialGrad` tragen jeweils
`x0,y0,x1,y1[,r0,r1]` plus ein Array `stops: { frac: number; color: string }[]`).

## Root-Paket (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Ein Name einer Layout-Engine. Das Register ist offen (eigene Engines lassen sich
an einem `GvcContext` registrieren), daher wird jede Zeichenkette akzeptiert;
`(string & {})` erhält die Editor-Autovervollständigung für die eingebauten,
ohne die Menge zu schließen. Siehe [Layout-Engines](/de/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Registriert einen Callback, der die intrinsischen Abmessungen eines externen
Bildes zurückgibt, das über `image=` oder eine HTML-`<IMG>`-Zelle referenziert
wird, zur Bemessung im Layout. Geben Sie `null` zurück, wenn die Größe unbekannt
ist (entspricht dem Verhalten von C bei fehlendem Bild — eine Zelle der Größe
null plus eine Warnung). Übergeben Sie `null` an `setImageSizer`, um einen zuvor
gesetzten Sizer zu löschen. Siehe [Im Browser verwenden](/de/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Registriert einen Callback, der die rohen Bytes eines externen Bildes
zurückgibt und befragt wird, wenn `RenderOptions.inlineImages` den Wert `true`
hat. Bei einer Rückgabe eines bloßen `Uint8Array` wird der MIME-Typ aus der
Dateiendung von `src` abgeleitet. `null` (vom Resolver oder ohne registrierten
Resolver) fällt auf das unveränderte Durchreichen von `src` zurück. Siehe
[Mit Bildern arbeiten](/de/guide/images).

### `TextMeasurer` / `TextSize`

```ts
interface TextMeasurer {
  measure(
    text: string,
    fontname: string,
    fontsize: number,
    flags?: { readonly bold?: boolean; readonly italic?: boolean },
  ): TextSize;
}

interface TextSize {
  w: number;
  h: number;
  yoffsetCenterline?: number;
  yoffsetLayout?: number;
}
```

Austauschbare Textvermessung, installiert über `setTextMeasurer` (drei
eingebaute werden mitgeliefert: `EstimateTextMeasurer`, `LutTextMeasurer`,
`CanvasTextMeasurer`). `yoffsetCenterline`/`yoffsetLayout` sind optionale
vertikale Metriken (Grundlinie→Mittellinie, Grundlinie→Oberlänge); lassen Sie
sie weg, um auf die an Pango kalibrierten Standardwerte zurückzufallen. Siehe
[Textvermessung](/de/guide/text-measurement).

### `RenderResult` und Fehler

```ts
interface RenderResult {
  svg?: string;   // present on success
  errors?: GvError[]; // present on failure; length <= 1 for v1
}

interface GvError {
  type: 'syntax' | 'semantic' | 'render';
  code: 'SYNTAX_ERROR' | 'SYNTAX_UNEXPECTED_EOF'
      | 'EDGE_OP_DIRECTED_IN_UNDIRECTED' | 'EDGE_OP_UNDIRECTED_IN_DIRECTED'
      | 'HTML_PARSE_ERROR' | 'RENDER_ERROR' | 'INTERNAL_ERROR'
      | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE' | 'GENERIC_ERROR';
  message: string;
  friendlyMessage: string;
  location?: { line: number; column: number; offset?: number };
  expected?: GvExpectation[];
}
```

`tryRenderSvg(dotSource, engine)` ist das Gegenstück im Result-Stil zu
`renderSvg`: Sie gibt bei Erfolg `{ svg }` zurück oder beim ersten Fehler
`{ errors: [one] }`, statt zu werfen. Sie kehrt bei jeder DOT-Eingabe zurück und
wirft nur bei ungültigen Argumenten. Einträge in `errors` sind schlichte Daten
ohne `cause` und ohne Stack.

Jeder geworfene Fehler von dot-engine erweitert das abstrakte `DotEngineError`
und implementiert `GvError`:

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}

class ParseError extends DotEngineError {
  readonly type = 'syntax';
  readonly code: GvErrorCode;
  readonly friendlyMessage: string;
  readonly location: { line: number; column: number; offset?: number };
  readonly expected?: GvExpectation[];
  get line(): number;   // convenience getter -> location.line
  get column(): number; // convenience getter -> location.column
}

class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic'; // 'semantic' for UNKNOWN_LAYOUT / UNSUPPORTED_FEATURE
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
  readonly friendlyMessage: string;
}

class InternalError extends DotEngineError {
  readonly type = 'render';
  readonly code = 'INTERNAL_ERROR';
  readonly friendlyMessage: string;
}

function isGvError(e: unknown): e is GvError; // structural; works across bundles
```

`renderSvg` wirft `ParseError` bei ungültigem DOT-Quelltext, `RenderError` bei
Fehlern in der Layout-/Renderstufe und `InternalError` bei einem Fehler in
dot-engine. Fehler des Aufrufers werfen einen Standard-`TypeError` /
`RangeError` / `Error`, dessen `code` ein `UsageErrorCode` ist
(`'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' | 'ERR_OUT_OF_RANGE' |
'ERR_INVALID_STATE'`); das sind keine `GvError`s. Aufrufer, die strukturierte
Fehler ohne `try`/`catch` wollen, sollten stattdessen `tryRenderSvg` verwenden.
Jeden Code beschreibt [Fehler und Ausnahmen](/de/guide/errors).

## Zusammenhänge

```graphviz
digraph types {
  rankdir=LR;
  bgcolor="transparent";
  node [shape=box, style=rounded, fontname="Helvetica", fontsize=11];
  edge [fontname="Helvetica", fontsize=10];

  subgraph cluster_build {
    label="Build"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    createGraph; GvGraphBuilder; GvNode; GvEdge;
  }
  subgraph cluster_read {
    label="Layout + Read"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    LayoutSnapshot; NodeGeometry; EdgeGeometry; ClusterGeometry; BoundsGeometry;
  }
  subgraph cluster_render {
    label="Render"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    OutputString [label="string"];
    XdotOpArray [label="XdotOp[]"];
  }

  createGraph -> GvGraphBuilder;
  GvGraphBuilder -> GvNode [label="addNode"];
  GvGraphBuilder -> GvEdge [label="addEdge"];
  GvGraphBuilder -> "Graph" [label=".graph"];
  parse -> "Graph";

  "Graph" -> LayoutSnapshot [label="getLayout"];
  LayoutSnapshot -> NodeGeometry;
  LayoutSnapshot -> EdgeGeometry;
  LayoutSnapshot -> ClusterGeometry;
  LayoutSnapshot -> BoundsGeometry;

  "Graph" -> OutputString [label="render"];
  "Graph" -> XdotOpArray  [label="getDrawOps"];
}
```

## Welcher Typ aus welchem Aufruf stammt

| Aufruf | Gibt zurück |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (verschachtelt) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (wirft `DotEngineError` oder einen `TypeError` bei Verwendungsfehlern) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

Jedes Feld jedes oben genannten Typs — auch derjenigen, die diese Seite nur
zusammenfasst — finden Sie in der generierten
[TypeDoc-Referenz](/reference/). Die ausführliche Darstellung des
Koordinatensystems (mit durchgespielten Beispielen) steht unter
[Berechnete Geometrie auslesen](/de/guide/geometry).
