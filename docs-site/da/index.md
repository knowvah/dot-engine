---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Graphviz i ren TypeScript
  tagline: DOT ind, SVG ud — uden C. Ingen native Graphviz-binær, ingen WASM. Ren TypeScript, kører i browseren.
  actions:
    - theme: brand
      text: Kom i gang
      link: /da/guide/getting-started
    - theme: alt
      text: Åbn legepladsen
      link: /da/playground
    - theme: alt
      text: Se på GitHub
      link: https://github.com/knowvah/dot-engine
features:
  - title: Tro mod C-Graphviz
    details: En linje-for-linje-portering af den kanoniske C-implementering. Motoren dot matcher den native binær inden for en snæver, deterministisk tolerance (±0,01 på koordinater, nøjagtigt for ikke-numerisk indhold) på golden-korpusset.
  - title: Browser-native, ingen runtime-afhængigheder
    details: Ingen C — ingen native Graphviz-binær, ingen WASM-portering, ingen renderingsserver. Selve layoutmotoren er TypeScript — bundl den og send den afsted.
  - title: Alle otte layoutmotorer
    details: dot, neato, fdp, sfdp, circo, twopi, osage og patchwork — renderet til SVG.
  - title: Programmatisk layout + geometri
    details: Du kan ikke blot rendere — læs beregnede knudepositioner, kantsplines og clustergrænser tilbage som et almindeligt, JSON-serialiserbart snapshot via getLayout(), helt uden parsing af -Tplain.
---

## Prøv det

Editoren nedenfor kører det rigtige bibliotek i din browser. Redigér DOT til
venstre; SVG'en opdateres live.

<Playground height="360px" />

## Vælg din vej

Ny her? Vælg den dør, der passer til det, du skal i gang med:

| Jeg vil gerne… | Start her |
| --- | --- |
| Forstå, hvordan delene hænger sammen | [Overblik — den mentale model](/da/guide/overview) |
| Installere og rendere min første graf | [Kom godt i gang](/da/guide/getting-started) |
| Løse en konkret opgave | [Opskriftssamling](/da/guide/recipes) |
| Slå en funktion eller en type op | [API-reference](/da/guide/api) · [Typer](/da/guide/types) |
| Eksperimentere uden at installere | [Legeplads](/da/playground) |

Kommer du fra et andet værktøj? Se [Fra C-værktøjet `dot`](/da/guide/migrate-from-c-cli)
eller [Fra JS-graphviz-biblioteker](/da/guide/migrate-from-js-libs).

For fuldstændige, automatisk genererede signaturer se den
[genererede API-reference](/reference/). Vil du indlejre renderede grafer på en side?
Læs [Arbejd med billeder](/da/guide/images) om indlejring af billeder og CSP.
