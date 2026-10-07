---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Graphviz i ren TypeScript
  tagline: DOT in, SVG ut — utan C. Ingen inbyggd Graphviz-binär, ingen WASM. Ren TypeScript som körs i webbläsaren.
  actions:
    - theme: brand
      text: Kom igång
      link: /sv/guide/getting-started
    - theme: alt
      text: Öppna lekplatsen
      link: /sv/playground
    - theme: alt
      text: Visa på GitHub
      link: https://github.com/knowvah/dot-engine
features:
  - title: Trogen C-versionen av Graphviz
    details: En rad-för-rad-portering av den kanoniska C-implementationen. Motorn dot överensstämmer med den inbyggda binären inom en snäv, deterministisk tolerans (±0,01 på koordinater, exakt på allt icke-numeriskt innehåll) på golden-korpusen.
  - title: Webbläsarnativ, inga körtidsberoenden
    details: Inget C — ingen inbyggd Graphviz-binär, ingen WASM-portering, ingen renderingsserver. Själva layoutmotorn är TypeScript — paketera den och leverera.
  - title: Alla åtta layoutmotorer
    details: dot, neato, fdp, sfdp, circo, twopi, osage och patchwork — renderade till SVG.
  - title: Programmatisk layout och geometri
    details: Rendera inte bara — läs tillbaka beräknade nodpositioner, kantsplines och klustergränser som en enkel, JSON-serialiserbar ögonblicksbild via getLayout(), helt utan att tolka -Tplain.
---

## Prova själv

Editorn nedan kör det riktiga biblioteket i din webbläsare. Redigera DOT-koden
till vänster; SVG:n uppdateras direkt.

<Playground height="360px" />

## Välj din väg

Ny här? Välj den dörr som passar det du vill göra:

| Jag vill … | Börja här |
| --- | --- |
| Förstå hur delarna hänger ihop | [Översikt — den mentala modellen](/sv/guide/overview) |
| Installera och rendera min första graf | [Kom igång](/sv/guide/getting-started) |
| Lösa en konkret uppgift | [Receptsamling](/sv/guide/recipes) |
| Slå upp en funktion eller typ | [API-referens](/sv/guide/api) · [Typer](/sv/guide/types) |
| Experimentera utan att installera | [Lekplats](/sv/playground) |

Kommer du från ett annat verktyg? Se [Från C-verktyget `dot`](/sv/guide/migrate-from-c-cli)
eller [Från JS-bibliotek för Graphviz](/sv/guide/migrate-from-js-libs).

För uttömmande, automatiskt genererade signaturer, se den
[genererade API-referensen](/reference/). Ska du bädda in renderade grafer på en sida?
Läs [Arbeta med bilder](/sv/guide/images) för vägledning om infogning av bilder och CSP.
