---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Graphviz i ren TypeScript
  tagline: DOT inn, SVG ut — uten C. Ingen innebygd Graphviz-binærfil, ingen WASM. Ren TypeScript som kjører i nettleseren.
  actions:
    - theme: brand
      text: Kom i gang
      link: /no/guide/getting-started
    - theme: alt
      text: Åpne lekeplassen
      link: /no/playground
    - theme: alt
      text: Se på GitHub
      link: https://github.com/knowvah/dot-engine
features:
  - title: Tro mot C-Graphviz
    details: En linje-for-linje-portering av den kanoniske C-implementasjonen. Motoren dot samsvarer med den innebygde binærfilen innenfor en stram, deterministisk toleranse (±0,01 på koordinater, eksakt for ikke-numerisk innhold) på golden-korpuset.
  - title: Nettleser-nativ, ingen kjøretidsavhengigheter
    details: Ingen C — ingen innebygd Graphviz-binærfil, ingen WASM-portering, ingen rendringsserver. Selve layoutmotoren er TypeScript — bunt den og lever den.
  - title: Alle åtte layoutmotorer
    details: dot, neato, fdp, sfdp, circo, twopi, osage og patchwork — rendret til SVG.
  - title: Programmatisk layout og geometri
    details: Ikke bare rendre — les tilbake beregnede nodeposisjoner, kantsplines og klyngegrenser som et vanlig, JSON-serialiserbart øyeblikksbilde via getLayout(), uten å parse -Tplain.
---

## Prøv det

Editoren under kjører det faktiske biblioteket, i nettleseren din. Rediger DOT
til venstre; SVG-en oppdateres live.

<Playground height="360px" />

## Velg din vei

Ny her? Velg døren som passer til det du holder på med:

| Jeg vil … | Start her |
| --- | --- |
| Forstå hvordan delene henger sammen | [Oversikt — den mentale modellen](/no/guide/overview) |
| Installere og rendre min første graf | [Komme i gang](/no/guide/getting-started) |
| Løse en konkret oppgave | [Oppskriftssamling](/no/guide/recipes) |
| Slå opp en funksjon eller en type | [API-referanse](/no/guide/api) · [Typer](/no/guide/types) |
| Eksperimentere uten å installere | [Lekeplass](/no/playground) |

Kommer du fra et annet verktøy? Se [Fra C-verktøyet `dot`](/no/guide/migrate-from-c-cli)
eller [Fra JS-graphviz-biblioteker](/no/guide/migrate-from-js-libs).

For uttømmende, automatisk genererte signaturer, se den
[genererte API-referansen](/reference/). Skal du bygge inn rendrede grafer på en side?
Les [Arbeid med bilder](/no/guide/images) for veiledning om bildeinnbygging og CSP.
