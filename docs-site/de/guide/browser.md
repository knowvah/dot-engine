---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Im Browser verwenden

@knowvah/dot-engine verwendet keine reinen Node-APIs und lässt sich bedenkenlos für den
Browser bündeln. Diese Seite behandelt die beiden Dinge, die Sie beim clientseitigen
Betrieb wissen sollten.

## Bundling

Die Bibliothek besteht aus schlichten ES-Modulen. Jeder moderne Bundler (Vite, esbuild,
Rollup, webpack) kann sie einbinden. Es gibt keine Laufzeitabhängigkeiten zu
externalisieren und keine WASM-Artefakte zu hosten.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

Die [Spielwiese](/de/playground) dieser Site tut genau das — sie importiert die Engine und
ruft `renderSvg` im Browser auf, ohne Server-Roundtrip.

## Textvermessung

Graphviz benötigt Textabmessungen, um Labels zu dimensionieren. @knowvah/dot-engine
erledigt das automatisch:

- **Im Browser** (wenn `document` existiert) vermisst es Text mit dem nativen
  `<canvas>`-2D-Kontext — hostgetreu, da es dieselbe Schrift ist, mit der der Browser das
  SVG darstellt.
- **In Node** verwendet es standardmäßig den eingebauten **Estimate**-Measurer — ein
  deterministisches, headless-sicheres Modell, das `estimate_textspan_size` von Graphviz
  selbst nachbildet. Für ein korrektes Layout in Node sind weder eine `canvas`-Installation
  noch Schriftdateien nötig; ein gehinteter Nachschlagetabellen-Measurer (LUT) ist
  außerdem als Opt-in für genauere hostgetreue Größen ohne native Canvas-Abhängigkeit
  verfügbar. Siehe [Textvermessung](/de/guide/text-measurement), wie Sie einen Measurer
  explizit auswählen.

Für das Layout werden in keinem Fall Schriftdateien benötigt.

## Webfonts: warum Vorabladen wichtig ist

Label-Größen ergeben sich aus der Vermessung von Text mit einer Schrift. Wenn eine Schrift
mit `@font-face` deklariert, aber noch nicht fertig geladen ist, vermisst der Browser
stattdessen mit der **Ersatzschrift**, und das Layout ist falsch, sobald die echte Schrift
eintrifft. In Chromium mit JetBrains Mono gemessen: Ein Label-Kasten war **70,68 pt** breit,
wenn vor dem Laden der Schrift gemessen wurde (Ersatzschrift), und **124,8 pt** danach.

Die asynchronen Einstiegspunkte (`renderSvgAsync`, `renderAsync`, `renderSvgInto`)
vermeiden das: Sie sammeln die Schriften, die der Graph anfordern wird, laden sie über
`document.fonts` und führen erst dann das Layout aus. `renderSvgAsync` lieferte dieselben
124,8 pt wie die Vermessung nach dem Laden.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (Standard `3000`) ist eine einzige Frist für alle Schriftschnitte,
  nicht pro Schnitt.
- **`fontIssues`** ist eine Liste von `{ face, reason }`. `reason: 'failed'` bedeutet, dass
  der Schriftschnitt einen Fehler hatte (zum Beispiel ein 404) oder sein Laden abgelehnt
  wurde; `reason: 'timeout'` bedeutet, dass er innerhalb von `fontTimeoutMs` nicht geladen
  war. In beiden Fällen läuft das Layout mit einer Ersatzschrift weiter. Jedes Problem wird
  zusätzlich per `console.warn` ausgegeben. Schriftprobleme lehnen das Promise nie ab.
- **Einschränkung:** Nur mit `@font-face` deklarierte Familien können gemeldet werden.
  Eine Systemschrift oder ein unbekannter Familienname gilt als „geladen“ (es gibt nichts,
  worauf gewartet werden müsste), sodass ein falsch geschriebener `fontname` nie in
  `fontIssues` auftaucht.
- **Node und Worker** haben kein `document.fonts`, daher wird das Vorabladen von Schriften
  übersprungen und `fontIssues` ist `[]`. Bild-Hooks funktionieren weiterhin. Sie können ein
  `fontSet` übergeben (alles mit `load(font)`), um ein eigenes bereitzustellen.

## In eine Seite rendern: `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

Es ersetzt die Kindelemente des Elements mit der angegebenen ID durch das gerenderte
`<svg>` (als `element` zurückgegeben), unter Verwendung von `DOMParser` und `importNode`,
nie von `innerHTML`. Eine fehlende ID lehnt mit `ERR_INVALID_ARG_VALUE` ab. Das SVG wird
standardmäßig bereinigt; übergeben Sie `sanitize`, um Ihren eigenen Sanitizer zu verwenden,
oder `trusted: true`, um das Bereinigen zu überspringen. Was der Scrubber entfernt und
behält, steht im Abschnitt „Security“ der README; halten Sie außerdem eine
Content-Security-Policy aufrecht.

## Externe Bilder: `setImageSizer`

Wenn ein HTML-artiges Label ein externes Bild enthält
(`<IMG SRC="logo.png"/>`), benötigt Graphviz die intrinsischen Abmessungen dieses Bildes,
um die Zelle zu dimensionieren. (Das Attribut `image=` eines Knotens wird nicht vermessen:
Der Knoten behält seinen normalen Kasten, wie im headless nativen Graphviz.) Da die
Bibliothek das Dateisystem nicht lesen kann, stellen Sie einen Sizer bereit:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Wenn Ihre Graphen nie auf externe Bilder verweisen, müssen Sie das nicht aufrufen. Um
Bilder asynchron zu vermessen (zum Beispiel durch Laden), übergeben Sie stattdessen einen
asynchronen `imageSizer` an `renderSvgAsync`; siehe [Bilder](/de/guide/images).

## Web Worker

Das Layout läuft synchron, sodass ein großer Graph den Thread blockiert, auf dem er läuft.
Führen Sie es in einem Worker aus, damit die Seite reaktionsfähig bleibt. In einem Worker
gibt es kein `document`, daher vermisst die Bibliothek Text mit einem `OffscreenCanvas`,
und die asynchrone API lädt Schriften über den eigenen Font-Satz des Workers
(`self.fonts`).

Schriften in einem Worker sind von denen der Seite getrennt: Registrieren Sie sie im Worker
mit der `FontFace`-API (CSS-`@font-face`-Regeln erreichen Worker nicht).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Rendern Sie in einem Worker mit `renderSvgAsync` (oder `renderAsync`), nicht mit
`renderSvg`, zumindest bis jede Webfont geladen ist. Chromium vermisst einen
Font-String weiterhin mit dem Ersatzschnitt, wenn genau dieser String im Worker vor dem
Laden des Schnitts vermessen wurde, auch nachdem er geladen ist; die asynchrone API lädt
Schriften, bevor sie vermisst, und stößt daher nie darauf.

## Was Sie nicht erwarten sollten

Die Bibliothek zielt auf **SVG** (plus die Textformate `json` / `xdot` / `dot` /
Image-Map). Rasterausgabe (PNG/JPG), PostScript/PDF und interaktive/GUI-Backends liegen
außerhalb des Umfangs — konvertieren Sie das SVG nachgelagert, wenn Sie ein anderes Format
benötigen. Die vollständige Umfangsgrenze finden Sie unter
[Bekannte Abweichungen](/de/divergences).

## Große Graphen: vorab nach SVG rendern

Sehr große Graphen — grob **mehr als 10.000 Knoten oder einige MB DOT-Quelltext** — lassen
sich zur Laufzeit im Browser praktisch nicht anordnen. Das Layout (Mincross, Ranking,
Spline-Routing) ist superlinear, daher ist das eine **Skalierungsgrenze, die mit dem
Upstream-Graphviz geteilt wird, keine Einschränkung speziell dieser Engine**: Bei solchen
Eingaben laufen das native `dot`, die WASM-Builds (`@hpcc-js/wasm-graphviz`) und diese
Engine gleichermaßen in Zeitüberschreitungen oder gehen der Speicher aus. (Diese Engine
hat **kein** Speicherleck — ihr Heap pro Rendering bleibt flach; die Grenze ist
ausschließlich die Graphgröße. Den gemessenen Vergleich zeigt das
[Performance-Dashboard](/perf).)

Für Graphen dieser Größenordnung gilt: **einmal zur Build-Zeit rendern und das fertige
`.svg` ausliefern**, statt bei jedem Aufruf im Browser anzuordnen — dasselbe Muster, das
Sie auch mit dem nativen `dot` verwenden würden, da es für jede Anfrage zu langsam ist.

Die Build-Zeit-Site-Adapter in
[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (auf NPM veröffentlicht)
tun genau das:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), zur Build-Zeit
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), zur Build-Zeit
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), zur Build-Zeit
- `@knowvah/dot-markdown-it` — frameworkunabhängige markdown-it-Integration

Für dynamische, vom Benutzer gelieferte Graphen, bei denen Rendern zur Build-Zeit keine
Option ist, beschränken Sie das interaktive Rendern auf Graphen vernünftiger Größe und
cachen Sie das erzeugte SVG.
