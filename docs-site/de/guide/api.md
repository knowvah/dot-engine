---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# API-Referenz

Die öffentliche Oberfläche ist bewusst klein gehalten. Die meisten Aufrufer
brauchen nur `renderSvg`. Welchen Einstiegspunkt Sie verwenden, steht im
[Überblick](/de/guide/overview); die Formen, die jede Funktion entgegennimmt und
zurückgibt, beschreibt [Typen](/de/guide/types), und die generierte
[Referenz](/reference/) enthält erschöpfende Signaturen, jedes Feld und jede
Überladung.

> Typdeklarationen (`.d.ts`) erzeugt `npm run build` (der Schritt `build:types`
> führt `tsc -p tsconfig.build.json` aus). Die `exports`-Map der `package.json`
> verdrahtet für jeden Einstiegspunkt die Bedingungen `types`, sodass
> `@knowvah/dot-engine`, `@knowvah/dot-engine/api` und
> `@knowvah/dot-engine/render` in Editoren und nachgelagerten Builds ihre Typen
> auflösen.
>
> Der Build erzeugt außerdem Deklarations-Maps (`.d.ts.map`) und
> JS-Source-Maps, und das Paket liefert seine `src/`-Quellen mit — „Zur
> Definition springen“ führt also direkt zum echten TypeScript, sodass sich der
> Code leicht lesen und ein PR leicht eröffnen lässt.

Diese Seite ist nach den drei Einstiegspunkten gegliedert (der
[Überblick](/de/guide/overview) erklärt, wann Sie zu welchem greifen): das
Root-Paket `@knowvah/dot-engine` (Parsen und Rendern in einem Aufruf sowie
prozessglobale Konfiguration), `@knowvah/dot-engine/api` (einen Graphen im Code
aufbauen, berechnete Geometrie zurücklesen) und `@knowvah/dot-engine/render`
(Mehrformat-Ausgabe und rohe Zeichenoperationen). Jede Funktion unten wird auch
vom Root-Paket re-exportiert (`export * from './api/index.js'` /
`export * from './render/index.js'` in `src/index.ts`) — alles aus
`@knowvah/dot-engine` zu importieren funktioniert, aber die Unterpfad-Importe
machen deutlicher, welche Schicht Sie berühren.

## `@knowvah/dot-engine` (Root)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Parst den DOT-Quelltext, führt die genannte [Layout-Engine](/de/guide/engines)
aus, rendert nach SVG und gibt die SVG-Zeichenkette zurück. Das ist der
Komfort-Wrapper für den Ein-Aufruf-Fall: Er konstruiert einen `GvcContext`,
registriert die acht eingebauten Engines und den SVG-Renderer, legt aus,
rendert und gibt das Layout frei — wenn Sie diese Schritte getrennt brauchen,
siehe unten [`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext).

- **`dotSource`** — Quelltext des Graphen in der Sprache DOT.
- **`engine`** — `EngineName`: eine der eingebauten (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) oder ein beliebiger
  eigenregistrierter Name.
- **Wirft** einen `DotEngineError` bei jedem Problem mit der Eingabe:
  `ParseError`, wenn `dotSource` ungültig ist, `RenderError`, wenn Layout oder
  Rendern fehlschlägt, `InternalError` (mit `cause`) bei einem Fehler in
  dot-engine. Einen `TypeError` mit `code` `ERR_INVALID_ARG_TYPE` /
  `ERR_INVALID_ARG_VALUE`, wenn `dotSource` oder `engine` ungültig ist
  (einschließlich eines nicht registrierten Engine-Namens). Siehe
  [Fehler und Ausnahmen](/de/guide/errors).

Vollständige Signatur, JSDoc und die Feldliste von `GvError`:
[Referenz](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

Geschwisterfunktion von `renderSvg` im Result-Stil. Kehrt bei jeder DOT-Eingabe
zurück (wirft nie): `{ svg }` bei Erfolg oder `{ errors: [one] }` beim ersten
Fehler; `svg` und `errors` schließen sich gegenseitig aus. Sie wirft nur bei
ungültigen Argumenten (`TypeError` `ERR_INVALID_ARG_TYPE` /
`ERR_INVALID_ARG_VALUE`). Jeder Eintrag in `errors` sind schlichte,
JSON-serialisierbare Daten (`type`, `code`, `message`, `friendlyMessage`, dazu
`location` / `expected`, wenn vorhanden; kein `cause`, kein Stacktrace); er lässt
sich daher gefahrlos über eine Worker-/postMessage-Grenze senden oder in ein Log
serialisieren. Bevorzugen Sie sie gegenüber `renderSvg` + `try`/`catch`, wenn der
Aufrufer anhand von `code` / `type` verzweigen will, statt eine Ausnahme zu
fangen. Siehe [Fehler und Ausnahmen](/de/guide/errors).
[Referenz](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Parst DOT in das Graphmodell im Speicher, **ohne** es auszulegen. Nützlich, um
den Graphen zu untersuchen oder zu transformieren — oder ihn vor dem Rendern an
`getLayout` aus `@knowvah/dot-engine/api` bzw. `render` aus
`@knowvah/dot-engine/render` zu übergeben.

- **Wirft** `ParseError` bei Syntaxfehlern oder Verstößen gegen die
  Kantenrichtung (z. B. `->` in einem ungerichteten Graphen). `ParseError`
  erweitert `DotEngineError` und implementiert `GvError` mit `type: 'syntax'`; er
  trägt ein `location: { line, column, offset? }`. `TypeError`
  `ERR_INVALID_ARG_TYPE`, wenn `dotSource` keine Zeichenkette ist.
  [Fehler und Ausnahmen](/de/guide/errors), [Referenz](/reference/).

### `DotEngineError` / `RenderError` / `InternalError`

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}
class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic';
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
}
class InternalError extends DotEngineError {
  readonly type: 'render';
  readonly code: 'INTERNAL_ERROR';
}
function isGvError(e: unknown): e is GvError;
```

`instanceof DotEngineError` bedeutet: dot-engine ist an dieser Eingabe
gescheitert. `RenderError` deckt bekannte Layout-/Renderfehler ab (`type` ist
`semantic` bei `UNKNOWN_LAYOUT` und `UNSUPPORTED_FEATURE`). `InternalError` ist
ein Fehler in dot-engine; `cause` enthält den ursprünglichen Fehler, wenn einer
umhüllt wurde. Fehler des Aufrufers werfen stattdessen einen Standard-`TypeError`
/ `RangeError` / `Error` mit einem `code`. `isGvError` prüft auf eine
Zeichenkette für `type` und `code` und funktioniert daher auch über doppelte
Bundles hinweg. Jeden Code und was jede Funktion werfen kann, beschreibt
[Fehler und Ausnahmen](/de/guide/errors), die Form von `GvError`
[Typen](/de/guide/types), und die Mitgliederliste von `GvErrorCode` die
[Referenz](/reference/).

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Registriert (oder löscht, mit `null`) den prozessglobalen Textvermesser, der
beim Layout zur Bemessung von Beschriftungen herangezogen wird. Das Löschen
fällt auf den Standard der Bibliothek zurück (Browser: `CanvasTextMeasurer`;
headless/Node: `EstimateTextMeasurer`, sofern kein LUT-Vermesser verdrahtet
ist — die vollständige Auflösungsreihenfolge und die zusammen mit diesen
Funktionen exportierten Implementierungen `CanvasTextMeasurer` /
`EstimateTextMeasurer` / `LutTextMeasurer` beschreibt
[Textvermessung](/de/guide/text-measurement)).
[Referenz](/reference/).

### `setImageSizer` / `setImageResolver`

Zwei verwandte, aber unterschiedliche Konfigurationsnähte für Bilder — beide
sind prozessglobale Register nach demselben Muster (einen Callback registrieren,
mit `null` löschen) und beide bleiben wirkungslos, bis ein Aufrufer einen
registriert:

- **`setImageSizer`** — meldet die *intrinsischen Abmessungen* eines externen
  Bildes, damit die Layout-Engine vor dem Rendern Platz für eine HTML-`<IMG>`-Zelle
  oder ein Knotenattribut `image=` reservieren kann. Gibt der Callback `null`
  zurück (oder ist kein Sizer registriert), entsteht das Verhalten des nativen
  Graphviz bei fehlendem Bild: eine Warnung und Größe null.
- **`setImageResolver`** (neu — siehe unten [`inlineImages`](#inlineimages)) —
  liefert die eigentlichen Bild-*Bytes*, damit der SVG-Renderer sie als
  `data:`-URI inlinen kann, statt `xlink:href="src"` unverändert durchzureichen.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` darf ein bloßes `Uint8Array` zurückgeben (der MIME-Typ wird aus
der Dateiendung von `src` abgeleitet — `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`,
`.webp`; alles andere fällt auf `application/octet-stream` zurück) oder
`{ bytes, mime }`, um den MIME-Typ ausdrücklich zu setzen. Geben Sie `null`
zurück, wenn sich `src` nicht auflösen lässt — der Renderer fällt dann auf das
unveränderte Durchreichen von `src` zurück, genau wie wenn kein Resolver
registriert wäre. Das Registrieren eines Resolvers hat für sich genommen keine
Wirkung; er wird nur befragt, wenn die Option `inlineImages` von `render` den
Wert `true` hat (unten). Ein durchgespieltes Beispiel steht unter
[Mit Bildern arbeiten](/de/guide/images), beide Callback-Typen in der
[Referenz](/reference/).

### `renderSvgAsync` / `renderSvgInto`

```ts
function renderSvgAsync(
  dotSource: string,
  engine: EngineName,
  opts?: AsyncSvgOptions,
): Promise<{ svg: string; fontIssues: FontIssue[] }>;

function renderSvgInto(
  id: string,
  src: string,
  engine: EngineName,
  opts?: RenderSvgIntoOptions,
): Promise<{ element: SVGSVGElement; fontIssues: FontIssue[] }>;

type FontIssue = { face: string; reason: 'failed' | 'timeout' };
type AsyncSvgOptions = Omit<AsyncRenderOptions, 'engine'>;
interface RenderSvgIntoOptions extends AsyncSvgOptions {
  sanitize?: (svg: string) => string;
  trusted?: boolean;
  document?: Document;
}
```

`renderSvgAsync` ist das asynchrone Gegenstück zu `renderSvg`: Es lädt die
Webfonts und Bilddaten, die der Graph braucht, vorab, legt dann aus und rendert.
`renderSvgInto` rendert und ersetzt die Kinder des Elements mit der ID `id`,
wobei das SVG standardmäßig bereinigt wird (`trusted: true` überspringt das;
`sanitize` ersetzt den eingebauten Bereiniger). Fehler, einschließlich
ungültiger Argumente, sind Promise-Ablehnungen mit denselben Fehlerklassen wie
bei `renderSvg`; eine fehlende Element-ID lehnt mit `ERR_INVALID_ARG_VALUE` ab.
Schriftprobleme lehnen nie ab; sie kommen in `fontIssues` zurück. Siehe
[Im Browser verwenden](/de/guide/browser) und
[Mit Bildern arbeiten](/de/guide/images) sowie die [Referenz](/reference/).

### `GvcContext` / `renderWithContext`

```ts
class GvcContext {
  constructor(measurer: TextMeasurer, options?: { debug?: DebugOptions });
  register(plugin: LayoutEngine | RendererPlugin): void;
  layout(g: Graph, engineName: EngineName): void;
  freeLayout(g: Graph, engineName: EngineName): void;
}

function renderWithContext(ctx: GvcContext, g: Graph, format: string): string;
```

Orchestrierung auf niedrigerer Ebene für Aufrufer, die Layout und Rendern als
getrennte Schritte steuern müssen. `renderSvg` ist ein Komfort-Wrapper genau
darüber: einen Kontext konstruieren, Engines/Renderer registrieren, `layout`,
`renderWithContext`, `freeLayout`. Greifen Sie nur dann direkt dazu, wenn Sie
diese Kontrolle brauchen — zum Beispiel, um eine Teilmenge der Engines zu
registrieren, eine eigene `LayoutEngine` oder ein `RendererPlugin` hinzuzufügen
oder denselben ausgelegten Graphen in mehrere Formate zu rendern, ohne das
Layout erneut auszuführen (einmal `layout` aufrufen, dann `renderWithContext`
für jedes Format, dann `freeLayout`). [Referenz](/reference/).

## `@knowvah/dot-engine/api`

Programmatischer Aufbau, sicheres Einfügen von Kanten und Auslesen berechneter
Geometrie — die Schicht, um einen Graphen ohne handgeschriebenen DOT-Text
aufzubauen und sein Layout als schlichte Daten zurückzulesen.
`LayoutSnapshot` und seine verschachtelten Formen beschreibt
[Typen](/de/guide/types).

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Erzeugt einen frischen Graphen, bereit zur Übergabe an `render` / `getLayout` /
`getDrawOps`. Standardwerte: `directed: true`, `strict: false`, `name: ''`.
Gibt einen `GvGraphBuilder` zurück — `addNode`, `addEdge`, `addSubgraph`,
`setAttr`/`getAttr`, `setHtmlAttr` (für HTML-Tabellen-Labels) und eine
Eigenschaft `.graph`, die das opake `Graph`-Handle bereitstellt. Siehe
[Einen Graphen im Code aufbauen](/de/guide/build-a-graph) und die
[Referenz](/reference/) für die vollständigen Schnittstellen
`GvGraphBuilder`/`GvNode`/`GvEdge`.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Hilfsfunktion auf niedrigerer Ebene zum Einfügen von Kanten, auf der
`GvGraphBuilder.addEdge` aufsetzt — direkt exportiert für Aufrufer, die mit den
internen `Node`-/`Edge`-Referenzen arbeiten (z. B. Kanten, die zu einem von
`parse()` zurückgegebenen Graphen hinzugefügt werden), statt mit den opaken
Handles `GvNode`/`GvEdge` des Builders. Die meisten Aufrufer sollten stattdessen
`createGraph(...).addEdge(tail, head, attrs?)` verwenden.

- **`name`** — Kantenschlüssel; Standardwert `''` (anonym). Wird bei der
  Deduplizierung strikter Graphen ignoriert, die allein über `(tail, head)`
  abgleicht (bei ungerichteten Graphen symmetrisch).
- **Gibt** die neue Kante **zurück**, oder die vorhandene, wenn `g` strikt ist
  und bereits eine Kante `(tail, head)` existiert (entspricht `agedge` mit
  `cflag=1`).

Siehe [Einen Graphen im Code aufbauen](/de/guide/build-a-graph) und die
[Referenz](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Gibt einen schlichten, JSON-serialisierbaren Snapshot der berechneten Geometrie
des Graphen zurück — Knotenpositionen, Kontrollpunkte der Kanten-Splines,
Kantenbeschriftungen, Begrenzungsboxen der Cluster und die Gesamtgrenzen des
Graphen — alles in Punkt.

- **`g`** — muss bereits ausgelegt sein (über `render(g, ...)`, `getDrawOps(g)`
  oder `ctx.layout(g, engine)`); `getLayout` auf einem noch nicht ausgelegten
  Graphen aufzurufen, wirft, statt stillschweigend Geometrie aus lauter Nullen
  zurückzugeben.
- **`opts.yAxis`** — Standardwert `'down'`: Bildschirmkoordinaten, Ursprung
  oben links, y wächst nach unten, und `bounds` wird auf `(0, 0)` normalisiert.
  `'up'` liefert native Graphviz-Koordinaten (Ursprung unten links, y wächst
  nach oben) mit `bounds.x`/`bounds.y` an der rohen linken unteren Ecke.
- **Wirft** `Error` mit `code` `ERR_INVALID_STATE`, wenn `g` nicht ausgelegt
  wurde; `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` bei
  ungültigem `g` oder `opts`. Siehe [Fehler und Ausnahmen](/de/guide/errors).

`width`/`height` der Knoten werden in Punkt umgerechnet (das interne Modell
speichert Zoll); jede andere Koordinate ist bereits in Punkt. Das
Koordinatensystem beschreibt
[Berechnete Geometrie auslesen](/de/guide/geometry), die vollständigen
Feldlisten von `LayoutSnapshot`, `NodeGeometry`, `EdgeGeometry`,
`ClusterGeometry` und `BoundsGeometry` stehen in [Typen](/de/guide/types) und
der [Referenz](/reference/).

### `Graph`

Opaker Handle-Typ, aus dem internen Modell re-exportiert. Nur der *Typ* wird
bereitgestellt (nicht die veränderliche Klasse) — annotieren Sie damit eine
Variable, die das `.graph` eines Builders oder ein `parse()`-Ergebnis hält, aber
konstruieren oder inspizieren Sie seine Felder nicht direkt; verwenden Sie den
Builder, `getLayout` oder `getDrawOps`, um Zustand wieder auszulesen.
[Referenz](/reference/).

## `@knowvah/dot-engine/render`

Mehrformat-Ausgabe und Zugriff auf rohe Zeichenoperationen — die Schicht zum
Rendern eines bereits geparsten oder per Builder konstruierten Graphen.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Legt einen Graphen aus und rendert ihn in die Zeichenkette des gewünschten
Formats.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — Layout-Engine (Standardwert `'dot'`).
- **`opts.inlineImages`** — siehe [unten](#inlineimages).
- **Wirft** `RenderError` bei Layout- oder Renderfehlern; `InternalError` bei
  einem Fehler in dot-engine; `TypeError` mit einem `code` bei ungültigen
  Argumenten (einschließlich einer nicht registrierten Engine oder eines
  nicht registrierten Formats). Siehe [Fehler und Ausnahmen](/de/guide/errors).

`opts.engine` entspricht dem Parameter `engine` von `renderSvg`; `format` ist
die Achse, die `renderSvg` nicht bereitstellt (`renderSvg` ist fest auf `'svg'`
verdrahtet). Siehe [In andere Formate rendern](/de/guide/render-formats) und die
[Referenz](/reference/) für die vollständige Union `OutputFormat` und die Form
von `RenderOptions`.

#### `inlineImages`

`RenderOptions.inlineImages` (Standardwert `false`) inlined externe Bilder als
`data:`-URIs, statt `xlink:href="src"` unverändert durchzureichen. Die Option
bleibt wirkungslos, solange kein Resolver über `setImageResolver` (oben)
registriert ist — und wirkungslos bei Nicht-SVG-Formaten. Ist sie nicht gesetzt,
ist die Ausgabe byteidentisch zu der vor Einführung dieser Option.

```ts
import { setImageResolver } from '@knowvah/dot-engine';
import { render } from '@knowvah/dot-engine/render';
import { parse } from '@knowvah/dot-engine';

setImageResolver((src) => {
  // Return the bytes for any src your DOT source references via
  // `image="..."` or an HTML <IMG SRC="...">; null for anything else.
  if (src === 'logo.png') return fetchLogoBytesSync(); // Uint8Array
  return null;
});

const g = parse('digraph { a [image="logo.png" shape=none label=""]; }');
const svg = render(g, 'svg', { inlineImages: true });
// svg now embeds `xlink:href="data:image/png;base64,..."` for the `a` node
// instead of `xlink:href="logo.png"`.
```

Die vollständige Anleitung, einschließlich der Auflösung über `fetch` im Browser
und über das Dateisystem in Node, steht unter
[Mit Bildern arbeiten](/de/guide/images).

### `renderAsync`

```ts
function renderAsync(
  g:      Graph,
  format: OutputFormat,
  opts?:  AsyncRenderOptions,
): Promise<{ output: string; fontIssues: FontIssue[] }>;

interface AsyncRenderOptions extends RenderOptions {
  imageSizer?: (src: string) => Promise<{ w: number; h: number } | null>;
  imageResolver?: (
    src: string,
  ) => Promise<{ bytes: Uint8Array; mime?: string } | Uint8Array | null>;
  fontTimeoutMs?: number; // default 3000
  fontSet?: FontSetLike;  // default document.fonts when present
}
```

Asynchrones Gegenstück zu `render`: dieselben Formate und Optionen
`engine`/`inlineImages`, dazu asynchrone Bild-Hooks pro Aufruf und
Schrift-Vorabladen. Jeder Bild-Hook läuft höchstens einmal pro eindeutigem
`src`; ein Throw oder Reject zählt als Fehlschlag. Die Ausgabe ist für die
Markup-Formate unbereinigtes Markup; siehe den Abschnitt „Security“ der README.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Legt `g` aus, rendert nach xdot und gibt ein flaches, typisiertes Array von
Zeichenoperationen zurück — Knotenformen, Textabschnitte, Farben und Schriften
als Werte einer diskriminierten Union (in einem `switch` auf `op.kind`
eingrenzen) —, um einen eigenen Canvas-/WebGL-/PDF-Renderer zu speisen, ohne
SVG oder die Zeichenkettenkodierung von xdot anzufassen. `opts.engine` hat den
Standardwert `DEFAULT_DRAW_ENGINE` (`'dot'`).

- **Wirft** `ParseError`, wenn sich die xdot-Zwischenausgabe nicht erneut parsen
  lässt (ein Fehler in dot-engine; in der Praxis nicht zu erwarten);
  `RenderError` bei Layout-/Renderfehlern; `InternalError` bei jedem anderen
  Fehler in dot-engine; `TypeError` mit einem `code` bei ungültigen Argumenten.
  Siehe [Fehler und Ausnahmen](/de/guide/errors).

Die Liste der Operationsarten und ein durchgespieltes Canvas-Beispiel stehen
unter [Eigenes Rendering mit xdot](/de/guide/xdot-drawops), die vollständige
Union `XdotOp` und die Formen `Xdot`/`XdotColor` in [Typen](/de/guide/types)
und der [Referenz](/reference/).
