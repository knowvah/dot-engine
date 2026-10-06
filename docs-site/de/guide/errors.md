---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Fehler und Ausnahmen

dot-engine wirft zwei Arten von Fehlern. Welche Art Sie abfangen, verrät Ihnen,
wer etwas ändern muss.

## Zwei Familien, eine Regel

| Familie | Woran Sie sie erkennen | Bedeutung | Wer handelt |
|--------|---------------------|---------|----------|
| Fehler von dot-engine | `err instanceof DotEngineError` | dot-engine ist an dieser Eingabe gescheitert: fehlerhaftes DOT, ein fataler Fehler, den auch Graphviz selbst melden würde, ein nicht unterstütztes Graphviz-Feature oder ein Fehler in dot-engine | Die DOT-Autorin bzw. der DOT-Autor, oder ein Fehlerbericht |
| Verwendungsfehler | Standard-`TypeError` / `RangeError` / `Error` mit `err.code`, das mit `ERR_` beginnt | Der Aufruf war falsch: falscher Argumenttyp, unbekannter Engine- oder Formatname, falsche Aufrufreihenfolge | Der aufrufende Code |

Verzweigen Sie über `.code`, nicht über den Meldungstext. Meldungen können sich
zwischen Releases ändern; Codes sind stabil.

Verwendungsfehler sind keine `DotEngineError` und implementieren `GvError`
nicht. Ihr `name` bleibt `TypeError`, `RangeError` oder `Error`, wie in Node.js.

## Klassenreferenz

Alle vier Klassen unten erweitern `DotEngineError` und implementieren die Form
`GvError` (`type`, `code`, `message`, `friendlyMessage`, optional `location` und
`expected`).

### `DotEngineError` (abstrakt)

Die gemeinsame Basis. `instanceof DotEngineError` gilt für jeden Fehler, den
dot-engine über seine Eingabe auslöst. Die Klasse lässt sich nicht direkt
konstruieren. `type`, `code` und `friendlyMessage` werden von den Unterklassen
definiert.

### `ParseError`

| Punkt | Wert |
|------|-------|
| Wird geworfen, wenn | Der DOT-Quelltext ungültig ist oder den falschen Kantenoperator für die Art des Graphen verwendet |
| `type` | `syntax` |
| Codes | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Felder | `location` (`{ line, column, offset? }`), `expected` (Erwartungen des Parsers; nur bei `SYNTAX_*`), Getter `line` und `column` |
| Maßnahme des Aufrufers | Den DOT-Quelltext korrigieren. `location` und `friendlyMessage` der Autorin bzw. dem Autor anzeigen |

`GENERIC_ERROR` bei einem `ParseError` bedeutet, dass der Quelltext so tief
verschachtelt ist, dass dem Parser der Stack ausgegangen ist.

### `HtmlParseError`

| Punkt | Wert |
|------|-------|
| Wird geworfen, wenn | Er erreicht heute nie einen Aufrufer (siehe unten) |
| `type` | `semantic` |
| Codes | `HTML_PARSE_ERROR` |
| Felder | `tag` (das fehlerhafte Token). Kein `location` oder `expected` |
| Maßnahme des Aufrufers | Keine. Um ein fehlerhaftes Label zu finden, vergleichen Sie die gerenderte Ausgabe mit Ihrer Erwartung |

Der Parser für HTML-artige Labels löst `HtmlParseError` bei einem unbekannten
Element, einem fehlerhaften Attribut oder einem falsch platzierten `<TABLE>`,
`<HR>` oder `<VR>` aus. Die Layout-Stufe fängt ihn ab und gibt dem Label wie
Graphviz keinen Inhalt: Der Graph wird weiterhin gerendert, mit leerem Label.
Keine öffentliche Funktion reicht ihn weiter.

`HtmlParseError` wird nicht aus dem Paket-Root exportiert. Sollte doch einmal
einer bei Ihnen ankommen, identifiziert ihn
`err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'`.

### `RenderError`

| Punkt | Wert |
|------|-------|
| Wird geworfen, wenn | Layout oder Rendern auf eine Weise scheitert, die auch Graphviz selbst melden würde, der Graph eine nicht verfügbare Layout-Engine nennt oder der Graph ein Graphviz-Feature verwendet, das dot-engine nicht portiert hat |
| `type` | `render` bei `RENDER_ERROR`; `semantic` bei `UNKNOWN_LAYOUT` und `UNSUPPORTED_FEATURE` |
| Codes | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Felder | `cause`, wenn der Fehler einen anderen Fehler umhüllt. Kein `location` |
| Maßnahme des Aufrufers | `RENDER_ERROR`: den Graphen ändern. `UNKNOWN_LAYOUT`: das Attribut `layout=` korrigieren. `UNSUPPORTED_FEATURE`: das Feature vermeiden (zum Beispiel sfdp mit `rotation=45`; siehe die [Tabelle](#unsupported-feature-referenz)) |

### `InternalError`

| Punkt | Wert |
|------|-------|
| Wird geworfen, wenn | Eine Assertion oder Invariante in dot-engine fehlschlägt oder ein Fehler, der nicht von dot-engine stammt, aus der Layout- oder Render-Pipeline entweicht |
| `type` | `render` |
| Codes | `INTERNAL_ERROR` |
| Felder | `cause` (der ursprüngliche Fehler, wenn einer umhüllt wurde) |
| Maßnahme des Aufrufers | Einen Fehler mit dem auslösenden DOT-Quelltext melden |

Nichts, was die DOT-Autorin bzw. der DOT-Autor ändern kann, vermeidet einen
`InternalError` zuverlässig.

## Code-Referenz

### `GvErrorCode`

| Code | Klasse | `type` | Bedeutung | Typische Ursache | Maßnahme des Aufrufers | Ausgelöst von |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Unerwartetes Token | Tippfehler, fehlendes `;` oder `}` | DOT bei `location` korrigieren | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | Quelltext endete mitten in einer Anweisung | Nicht geschlossenes `{`, `[` oder nicht geschlossene Zeichenkette | DOT bei `location` korrigieren | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` in einem ungerichteten Graphen | `graph { a -> b }` | `--` verwenden | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` in einem digraph | `digraph { a -- b }` | `->` verwenden | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Quelltext zu tief verschachtelt zum Parsen | Pathologisch verschachtelte Teilgraphen | Das DOT abflachen | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Fehlerhaftes HTML-artiges Label | Unbekanntes Element, fehlerhaftes Attribut | Keine: das Label wird leer gerendert | Keine (intern abgefangen) |
| `RENDER_ERROR` | `RenderError` | `render` | Ein fataler Layout- oder Renderfehler, den auch Graphviz melden würde | Fehlerhafte Eingabe für eine Layout-Stufe | Den Graphen ändern | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | Das Attribut `layout=` des Graphen nennt keine registrierte Engine | `layout="foo"` | Das Attribut korrigieren | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | Der Graph verlangt ein Graphviz-Feature, das dot-engine nicht portiert hat | sfdp mit `rotation=45` | Das Feature vermeiden | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | Fehler in dot-engine | Fehlgeschlagene Assertion, fremder Throw | Einen Fehler melden | `renderSvg`, `render`, `getDrawOps`, Builder-Methoden, `GvcContext.layout` (nicht umhüllt) |

### `UsageErrorCode`

| Code | Klasse | Bedeutung | Typische Ursache | Maßnahme des Aufrufers | Ausgelöst von |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Falscher Typ, `null` oder ein fehlendes Pflichtargument | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Den Aufruf korrigieren | Jede öffentliche Funktion, die Argumente entgegennimmt |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Richtiger Typ, unbekannter Wert | Nicht registrierter Engine- oder Formatname; `getLayout(g, { yAxis: 'other' })` | Einen registrierten Namen oder einen erlaubten Wert verwenden | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Numerisches Argument außerhalb seines Bereichs | Reserviert | Den Aufruf korrigieren | Keine öffentliche Funktion löst ihn heute aus |
| `ERR_INVALID_STATE` | `Error` | Aufruf im falschen Zustand | `getLayout` vor dem Layout | Zuerst auslegen (`render(g, ...)` oder `ctx.layout`) | `getLayout` |

Ein nicht registriertes Engine-Argument wird auch dann abgelehnt, wenn der
DOT-Quelltext ein gültiges Attribut `layout=` setzt. Das Argument wird zuerst
geprüft.

## Referenz zu `UNSUPPORTED_FEATURE`-Fehlern {#unsupported-feature-referenz}

Jeder der folgenden Attributwerte lässt das Layout einen `RenderError` mit dem
Code `UNSUPPORTED_FEATURE` werfen, wo natives Graphviz einen Algorithmus
ausführen würde, den dot-engine nicht portiert hat. Die Alternative wäre
gewesen, ein Layout zu rendern, das von Graphviz abweicht, ohne das zu sagen.
Die Prüfung greift nur, wenn die Bedingung in der Spalte „Löst aus, wenn“
zutrifft; dasselbe Attribut anderswo rendert normal. Um den Fehler zu
vermeiden, entfernen Sie das Attribut oder ändern es auf einen unterstützten
Wert.

| Engine | Attribut und Wert | Löst aus, wenn | Benötigtes Graphviz-Feature |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | Immer (nachdem der Graph 2+ Knoten hat und `maxiter` nicht negativ ist) | Hierarchische Stress-Majorization (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Nur wenn Graphviz Constraints aufbauen würde: `diredgeconstraints` ist wahr oder `hier*`, `overlap=ipsep`, oder der Graph hat einen Cluster auf oberster Ebene. Ohne Constraints läuft es wie in Graphviz als Stress-Majorization | Eingeschränkte Majorization (`stress_majorization_cola`) |
| neato | `start=self` | `mode` ist `major` (der Standardwert) oder `ipsep` | Intelligente Initialisierung (`smart_ini`). Unter `mode=KK` oder `mode=sgd` protokolliert es wie Graphviz einmal pro Rendervorgang `start=0 not supported with mode=self - ignored` |
| neato | `model=subset` | `mode` ist `major` oder `KK` | Das Distanzmodell „subset“ |
| neato | `model=circuit` | `mode` ist `major`, oder `KK` bei einem zusammenhängenden Graphen. `KK` bei einem unzusammenhängenden Graphen ohne `pack` oder `packmode` protokolliert eine Warnung und verwendet kürzeste Wege, wie Graphviz | Das Distanzmodell „circuit“ (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (Groß-/Kleinschreibung egal) | Der Graph (bei twopi eine Komponente; bei sfdp der ganze Graph oder eine Komponente) hat 2+ Knoten, und Graphvizs eigene Überlappungszählung (`countOverlap`, die Knotenpolygone prüft) liegt über 0. Knoten, die sich nur durch ihre Begrenzungsbox berühren, lösen es nicht aus. circo erreicht es nur bei einem Graphen mit einer einzigen Komponente (bei mehreren Komponenten ignoriert Graphviz `overlap` ebenfalls). sfdp erreicht es nur, wenn `overlap` kein Prism-Modus ist | Voronoi-Überlappungsentfernung (`vAdjust`) |
| fdp | `overlap=` eines von `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | Der Modus wird nach den `N:`-Kräfteiterationsversuchen erreicht, also wenn diese Versuche nicht jede Überlappung beseitigen (oder `N` 0 ist oder fehlt). Das Präfix `N:` ist erlaubt, zum Beispiel `3:voronoi` | Der passende Adjust-Algorithmus von `removeOverlapWith` |
| fdp | `splines=compound` | Immer, mit oder ohne Cluster | Clustervermeidende Kantenführung (`compoundEdges`) |
| sfdp | `smoothing=` alles außer `none` oder `0` | Immer | `post_process_smoothing` |
| sfdp | `rotation=` jede Zahl ungleich null | Immer | `rotate()` vor der Überlappungsentfernung |
| sfdp | `label_scheme=1` bis `4` | Ein Knoten namens `|edgelabel|...` existiert, `overlap` löst zum Modus `prism` auf, und entweder ist das Schema 3 oder 4, oder das Schema ist 1 oder 2 und die Prism-Versuche liegen über 0 (`overlap=prism` mit einer Zahl, nicht das Standard-`prism0`). Werte über 4 zählen als 0. Gewöhnliche Kantenbeschriftungen lösen es nie aus | Behandlung von Kantenbeschriftungsknoten (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (auch `0`, `false`) | Jeder Graph mit mindestens einem Knoten. Die Meldung nennt das aufgelöste Schema | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (auch `2`) | Jeder Graph mit mindestens einem Knoten. Die Meldung nennt das aufgelöste Schema | `spring_electrical_embedding_fast` |
| alle Engines | Eine Knotenform, die von einem nicht portierten Sonderfall von `round_corners` gezeichnet wird | Der Knoten verwendet diese Form. Meldung: `special shape N not yet ported` | Der Zeichenzweig `round_corners` der Form. Das ist ein interner Wächter gegen eine Formnummer ohne Zeichenfall; von keiner benannten Form ist bekannt, dass sie ihn erreicht |

Die meisten Meldungen haben die Form `<attribute>=<value>: <what> is not supported yet`.
Ausnahmen sind `smoothing` und `rotation` (die die fehlende Routine nennen), die
fdp-Zeilen und die Zeile zur Form, die die oben genannten Formulierungen
verwenden. Verzweigen Sie über `err.code === 'UNSUPPORTED_FEATURE'`, nicht über
den Text.

Werte, die den Standard auswählen (zum Beispiel `quadtree=normal`, `true`,
`yes`, `1`), und die von Graphviz akzeptierten Werte, die portiert sind (zum
Beispiel `start=regular`, `start=random`, `model=mds`, `mode=KK`, `mode=sgd`,
`overlap=prism`, die Familie `scale` und, bei neato, twopi, circo und sfdp,
`overlap=oscale`, `vpsc` und die Modi `ortho*` / `portho*`), rendern normal.

## Referenz pro Funktion

„Verwendung“ bedeutet `TypeError` mit `ERR_INVALID_ARG_TYPE`, sofern eine Zeile
nicht einen anderen Code nennt.

| Funktion | Kann werfen |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Verwendung (`dotSource` oder `engine` keine Zeichenkette); `TypeError` `ERR_INVALID_ARG_VALUE` (Engine nicht registriert); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Verwendung (`dotSource` oder `engine` keine Zeichenkette); `TypeError` `ERR_INVALID_ARG_VALUE` (Engine nicht registriert). Sonst nichts: Jeder Fehler bei DOT-Eingabe wird in `errors` zurückgegeben |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` keine Zeichenkette); `ParseError` |
| `render(g, format, opts?)` | Verwendung (`g`, `format` oder `opts` falscher Typ); `TypeError` `ERR_INVALID_ARG_VALUE` (Engine oder Format nicht registriert); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Verwendung (`g` oder `opts` falscher Typ); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` nicht registriert); `RenderError`; `ParseError` (das xdot-Zwischenergebnis ließ sich nicht erneut parsen: ein Fehler in dot-engine); `InternalError` |
| `createGraph(opts?)` und Builder-Methoden (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Verwendung (falsche Argumenttypen, einschließlich Attributwerten, die keine Zeichenketten sind); `InternalError` (das Graphmodell konnte keinen Knoten oder Teilgraphen anlegen) |
| `addEdge(g, tail, head, name?)` (aus `/api`) | Verwendung (`g`, `tail` oder `head` kein Objekt; `name` keine Zeichenkette) |
| `getLayout(g, opts?)` | Verwendung (`g` oder `opts` kein Objekt); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` weder `'up'` noch `'down'`); `Error` `ERR_INVALID_STATE` (Graph nicht ausgelegt) |
| `new GvcContext(measurer, options?)` | Verwendung (`measurer` hat keine Funktion `measure`; `options` kein Objekt) |
| `ctx.register(plugin)` | Verwendung (weder Renderer-Plugin noch Layout-Engine) |
| `ctx.layout(g, engine)` | Verwendung (`g` kein Objekt, `engine` keine Zeichenkette); `TypeError` `ERR_INVALID_ARG_VALUE` (Engine nicht registriert); `RenderError` `UNKNOWN_LAYOUT`. Engine-Fehler werden unumhüllt weitergereicht |
| `ctx.freeLayout(g, engine)` | Verwendung; `TypeError` `ERR_INVALID_ARG_VALUE` (Engine nicht registriert). Engine-Fehler werden unumhüllt weitergereicht |
| `ctx.bestRenderer(format)` | Verwendung (`format` keine Zeichenkette); `TypeError` `ERR_INVALID_ARG_VALUE` (kein Renderer für `format`) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Verwendung (`ctx` kein `GvcContext`, `g` kein Objekt, `format` keine Zeichenkette); `TypeError` `ERR_INVALID_ARG_VALUE` (kein Renderer für `format`). Renderfehler werden unumhüllt weitergereicht |
| `setImageSizer(sizer)` | Verwendung (keine Funktion und nicht `null`) |
| `setImageResolver(fn)` | Verwendung (keine Funktion und nicht `null`) |
| `setTextMeasurer(measurer)` | Verwendung (kein `TextMeasurer` und nicht `undefined`) |

### Welche Funktionen fremde Throws umhüllen

| Funktionen | Verhalten bei einem unerwarteten Throw (der nicht von dot-engine stammt) |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Als `InternalError` umhüllt; `cause` ist der ursprüngliche Fehler |
| `renderWithContext` und jede Methode von `GvcContext` | **Nicht umhüllt.** Ein Fehler der Engine erreicht den Aufrufer als das, was die Engine geworfen hat, zum Beispiel ein schlichter `TypeError` ohne `code` |

Wenn Sie `GvcContext` direkt verwenden, behandeln Sie einen Fehler, der weder
ein `DotEngineError` noch ein Verwendungsfehler ist, als Fehler in dot-engine.

## `tryRenderSvg` oder `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| Fehlerhaftes DOT oder Layoutfehler | Wirft einen `DotEngineError` | Gibt `{ errors: [one] }` zurück |
| Ungültige Argumente | Wirft einen Verwendungsfehler | Wirft einen Verwendungsfehler |
| Fehlerwert | Ein `Error` mit Stack und `cause` | Schlichte Daten: `type`, `code`, `message`, `friendlyMessage`, dazu `location` / `expected`, wenn vorhanden |
| Verwenden, wenn | Der Fehler den Aufrufer abbrechen soll | Sie über `code` verzweigen oder den Fehler über `postMessage` oder in ein Log senden |

`tryRenderSvg` wirft bei keiner DOT-Eingabe. Sie wirft nur, wenn die Argumente
selbst ungültig sind, was ein Fehler im aufrufenden Code ist. Die
Fehlerobjekte, die sie zurückgibt, tragen weder `cause` noch einen Stacktrace.

## Umhüllte Fehler und `cause`

Fängt `renderSvg`, `render` oder `getDrawOps` einen Fehler, den dot-engine nicht
ausgelöst hat, wirft die Funktion einen `InternalError`, dessen `cause` der
ursprüngliche Fehler ist. Die `message` ist die ursprüngliche Meldung.

`cause` ist nicht aufzählbar, daher lässt `JSON.stringify(err)` es aus. Gehen
Sie die Kette beim Protokollieren ausdrücklich ab (siehe das letzte Beispiel
unten).

## Prüfungen über Bundle-Grenzen hinweg

`instanceof DotEngineError` funktioniert innerhalb einer Kopie der Bibliothek.
Können zwei Kopien geladen werden (doppelte Bundles, ein Plugin-Host),
verwenden Sie `isGvError(e)`. Die Funktion prüft auf eine Zeichenkette für
`type` und `code` und funktioniert über Kopien hinweg. Sie akzeptiert auch die
schlichten Objekte, die `tryRenderSvg` zurückgibt.

## Beispiele

Die beiden Familien trennen:

```ts
import { renderSvg, DotEngineError, ParseError } from '@knowvah/dot-engine';

function renderOrExplain(dot: string): string {
  try {
    return renderSvg(dot, 'dot');
  } catch (err: unknown) {
    if (err instanceof ParseError) {
      const { line, column } = err.location;
      return `DOT error at ${line}:${column}: ${err.friendlyMessage}`;
    }
    if (err instanceof DotEngineError) {
      return `${err.code}: ${err.friendlyMessage}`;
    }
    // A usage error: the call was wrong. Do not swallow it.
    throw err;
  }
}
```

Ein Ergebnis von `tryRenderSvg` behandeln:

```ts
import { tryRenderSvg } from '@knowvah/dot-engine';

const result = tryRenderSvg('digraph { a ->', 'dot');
if (result.svg !== undefined) {
  console.log(result.svg.length);
} else {
  const [first] = result.errors ?? [];
  console.error(first?.code, first?.location);
}
```

Einen `InternalError` mit seiner Ursache protokollieren:

```ts
import { InternalError } from '@knowvah/dot-engine';

function describeChain(err: unknown): string[] {
  const lines: string[] = [];
  let current: unknown = err;
  while (current instanceof Error) {
    lines.push(`${current.name}: ${current.message}`);
    current = current.cause;
  }
  return lines;
}

export function logFailure(err: unknown): void {
  if (err instanceof InternalError) {
    // Report this: it is a dot-engine bug. `cause` is the original error.
    console.error(describeChain(err).join(' <- '));
  }
}
```

## Siehe auch

- [API-Referenz (kuratiert)](/de/guide/api) für die Signatur jeder Funktion.
- [Typen](/de/guide/types) für die Formen `GvError` und `RenderResult`.
- [Generierte API (TypeDoc)](/reference/) für die vollständigen Unions `GvErrorCode` und `UsageErrorCode`.
