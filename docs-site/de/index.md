---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Graphviz in reinem TypeScript
  tagline: DOT rein, SVG raus — ohne C. Kein natives Graphviz-Binary, kein WASM. Reines TypeScript, läuft im Browser.
  actions:
    - theme: brand
      text: Erste Schritte
      link: /de/guide/getting-started
    - theme: alt
      text: Spielwiese öffnen
      link: /de/playground
    - theme: alt
      text: Auf GitHub ansehen
      link: https://github.com/knowvah/dot-engine
features:
  - title: Treu zum C-Graphviz
    details: Eine zeilenweise Portierung der kanonischen C-Implementierung. Die Engine dot stimmt auf dem Golden-Korpus mit dem nativen Binary bis auf eine enge, deterministische Toleranz überein (±0,01 bei Koordinaten, exakt bei nicht numerischen Inhalten).
  - title: Browser-nativ, keine Laufzeitabhängigkeiten
    details: Kein C — kein natives Graphviz-Binary, keine WASM-Portierung, kein Rendering-Server. Die Layout-Engine selbst ist TypeScript — bündeln und ausliefern.
  - title: Alle acht Layout-Engines
    details: dot, neato, fdp, sfdp, circo, twopi, osage und patchwork — gerendert als SVG.
  - title: Programmatisches Layout und Geometrie
    details: Nicht nur rendern — lesen Sie berechnete Knotenpositionen, Kanten-Splines und Cluster-Grenzen als schlichten, JSON-serialisierbaren Snapshot über getLayout() zurück, ganz ohne -Tplain-Parsing.
---

## Ausprobieren

Der Editor unten führt die echte Bibliothek in Ihrem Browser aus. Bearbeiten Sie
das DOT auf der linken Seite; das SVG aktualisiert sich live.

<Playground height="360px" />

## Ihr Einstieg

Neu hier? Wählen Sie die Tür, die zu Ihrem Vorhaben passt:

| Ich möchte … | Hier beginnen |
| --- | --- |
| Verstehen, wie die Teile zusammenspielen | [Überblick — das Denkmodell](/de/guide/overview) |
| Installieren und meinen ersten Graphen rendern | [Erste Schritte](/de/guide/getting-started) |
| Eine konkrete Aufgabe lösen | [Rezeptsammlung](/de/guide/recipes) |
| Eine Funktion oder einen Typ nachschlagen | [API-Referenz](/de/guide/api) · [Typen](/de/guide/types) |
| Ohne Installation experimentieren | [Spielwiese](/de/playground) |

Sie kommen von einem anderen Werkzeug? Siehe [Von der C-Kommandozeile `dot`](/de/guide/migrate-from-c-cli)
oder [Von JS-Graphviz-Bibliotheken](/de/guide/migrate-from-js-libs).

Für vollständige, automatisch generierte Signaturen siehe die
[generierte API-Referenz](/reference/). Sie möchten gerenderte Graphen in eine Seite einbetten?
Lesen Sie [Mit Bildern arbeiten](/de/guide/images) zu Bild-Inlining und CSP.
