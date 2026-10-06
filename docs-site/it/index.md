---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Graphviz in puro TypeScript
  tagline: DOT in ingresso, SVG in uscita — senza C. Nessun binario nativo di Graphviz, nessun WASM. Puro TypeScript, funziona nel browser.
  actions:
    - theme: brand
      text: Primi passi
      link: /it/guide/getting-started
    - theme: alt
      text: Apri l'area di prova
      link: /it/playground
    - theme: alt
      text: Vedi su GitHub
      link: https://github.com/knowvah/dot-engine
features:
  - title: Fedele al Graphviz in C
    details: Un porting riga per riga dell'implementazione canonica in C. Il motore dot coincide con il binario nativo entro una tolleranza deterministica stretta (±0,01 sulle coordinate, esatto sui contenuti non numerici) sul corpus golden.
  - title: Nativo del browser, zero dipendenze a runtime
    details: Nessun C — nessun binario nativo di Graphviz, nessun porting WASM, nessun server di rendering. Il motore di layout stesso è TypeScript — includilo nel bundle e distribuiscilo.
  - title: Tutti e otto i motori di layout
    details: dot, neato, fdp, sfdp, circo, twopi, osage e patchwork — renderizzati in SVG.
  - title: Layout e geometria programmatici
    details: Non limitarti al rendering — rileggi le posizioni calcolate dei nodi, le spline degli archi e i limiti dei cluster come istantanea semplice e serializzabile in JSON tramite getLayout(), senza alcun parsing di -Tplain.
---

## Provalo

L'editor qui sotto esegue la vera libreria, nel tuo browser. Modifica il DOT
a sinistra; l'SVG si aggiorna dal vivo.

<Playground height="360px" />

## Scegli il tuo percorso

Sei nuovo? Scegli la porta che corrisponde a ciò che stai facendo:

| Voglio… | Parti da qui |
| --- | --- |
| Capire come si incastrano i pezzi | [Panoramica — il modello mentale](/it/guide/overview) |
| Installare e renderizzare il mio primo grafo | [Primi passi](/it/guide/getting-started) |
| Risolvere un compito concreto | [Ricettario](/it/guide/recipes) |
| Consultare una funzione o un tipo | [Riferimento API](/it/guide/api) · [Tipi](/it/guide/types) |
| Sperimentare senza installare nulla | [Area di prova](/it/playground) |

Vieni da un altro strumento? Vedi [Dalla CLI `dot` in C](/it/guide/migrate-from-c-cli)
oppure [Dalle librerie JS per Graphviz](/it/guide/migrate-from-js-libs).

Per le firme complete, generate automaticamente, vedi il
[riferimento API generato](/reference/). Vuoi incorporare in una pagina i grafi renderizzati?
Leggi [Lavorare con le immagini](/it/guide/images) per l'inlining delle immagini e le indicazioni sulla CSP.
