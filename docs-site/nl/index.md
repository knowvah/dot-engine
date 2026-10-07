---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Graphviz, in pure TypeScript
  tagline: DOT erin, SVG eruit — zonder C. Geen native Graphviz-binary, geen WASM. Pure TypeScript, draait in de browser.
  actions:
    - theme: brand
      text: Aan de slag
      link: /nl/guide/getting-started
    - theme: alt
      text: Open de speeltuin
      link: /nl/playground
    - theme: alt
      text: Bekijk op GitHub
      link: https://github.com/knowvah/dot-engine
features:
  - title: Trouw aan het C-Graphviz
    details: Een regel-voor-regelport van de canonieke C-implementatie. De engine dot komt op het golden-corpus overeen met de native binary binnen een strakke, deterministische tolerantie (±0,01 bij coördinaten, exact bij niet-numerieke inhoud).
  - title: Browser-native, geen runtime-afhankelijkheden
    details: Geen C — geen native Graphviz-binary, geen WASM-port, geen renderserver. De lay-out-engine zelf is TypeScript — bundel hem en lever hem uit.
  - title: Alle acht lay-out-engines
    details: dot, neato, fdp, sfdp, circo, twopi, osage en patchwork — gerenderd naar SVG.
  - title: Programmatische lay-out en geometrie
    details: Niet alleen renderen — lees berekende knooppunten, kantsplines en clustergrenzen terug als een eenvoudige, naar JSON serialiseerbare momentopname via getLayout(), zonder -Tplain te hoeven parsen.
---

## Probeer het uit

De editor hieronder voert de echte bibliotheek uit in uw browser. Bewerk de DOT
links; de SVG wordt live bijgewerkt.

<Playground height="360px" />

## Kies uw route

Nieuw hier? Kies de ingang die past bij wat u wilt doen:

| Ik wil… | Begin hier |
| --- | --- |
| Begrijpen hoe de onderdelen samenwerken | [Overzicht — het denkmodel](/nl/guide/overview) |
| Installeren en mijn eerste graaf renderen | [Aan de slag](/nl/guide/getting-started) |
| Een concrete taak oplossen | [Receptenboek](/nl/guide/recipes) |
| Een functie of type opzoeken | [API-referentie](/nl/guide/api) · [Typen](/nl/guide/types) |
| Experimenteren zonder te installeren | [Speeltuin](/nl/playground) |

Komt u van een ander hulpmiddel? Zie [Vanaf de C-commandoregel `dot`](/nl/guide/migrate-from-c-cli)
of [Vanaf JS-graphviz-bibliotheken](/nl/guide/migrate-from-js-libs).

Voor uitputtende, automatisch gegenereerde signaturen zie de
[gegenereerde API-referentie](/reference/). Wilt u gerenderde grafen in een pagina insluiten?
Lees [Werken met afbeeldingen](/nl/guide/images) voor inlining van afbeeldingen en CSP.
