---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Graphviz, în TypeScript pur
  tagline: DOT la intrare, SVG la ieșire — fără C. Fără binar Graphviz nativ, fără WASM. TypeScript pur, rulează în browser.
  actions:
    - theme: brand
      text: Primii pași
      link: /ro/guide/getting-started
    - theme: alt
      text: Deschideți zona de testare
      link: /ro/playground
    - theme: alt
      text: Vedeți pe GitHub
      link: https://github.com/knowvah/dot-engine
features:
  - title: Fidel față de Graphviz în C
    details: Un port linie cu linie al implementării canonice în C. Motorul dot se potrivește cu binarul nativ într-o toleranță deterministă strânsă (±0.01 la coordonate, conținut nenumeric identic) pe corpusul golden.
  - title: Nativ în browser, fără dependențe la rulare
    details: Fără C — fără binar Graphviz nativ, fără port WASM, fără server de randare. Motorul de aranjare este el însuși TypeScript — includeți-l în pachet și publicați.
  - title: Toate cele opt motoare de aranjare
    details: dot, neato, fdp, sfdp, circo, twopi, osage și patchwork — randate în SVG.
  - title: Aranjare și geometrie programatică
    details: Nu doar randați — citiți înapoi pozițiile calculate ale nodurilor, spline-urile muchiilor și limitele clusterelor ca instantaneu JSON simplu, serializabil, prin getLayout(), fără a analiza -Tplain.
---

## Încercați

Editorul de mai jos rulează biblioteca reală, în browserul dumneavoastră. Editați
DOT-ul din stânga; SVG-ul se actualizează live.

<Playground height="360px" />

## Alegeți-vă drumul

Sunteți nou aici? Alegeți ușa care se potrivește cu ceea ce faceți:

| Vreau să… | Începeți aici |
| --- | --- |
| Înțeleg cum se îmbină piesele | [Prezentare generală — modelul mental](/ro/guide/overview) |
| Instalez și randez primul meu graf | [Primii pași](/ro/guide/getting-started) |
| Rezolv o sarcină concretă | [Carte de rețete](/ro/guide/recipes) |
| Caut o funcție sau un tip | [Referință API](/ro/guide/api) · [Tipuri](/ro/guide/types) |
| Experimentez fără instalare | [Zonă de testare](/ro/playground) |

Veniți de la un alt instrument? Vedeți [De la CLI-ul dot în C](/ro/guide/migrate-from-c-cli)
sau [De la bibliotecile JS pentru Graphviz](/ro/guide/migrate-from-js-libs).

Pentru semnături exhaustive, generate automat, vedeți
[referința API generată](/reference/). Încorporați grafuri randate într-o pagină?
Citiți [Lucrul cu imagini](/ro/guide/images) pentru încorporarea imaginilor și ghidul CSP.
