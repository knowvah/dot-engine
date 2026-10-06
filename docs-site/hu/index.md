---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Graphviz, tiszta TypeScriptben
  tagline: DOT be, SVG ki — C nélkül. Nincs natív Graphviz bináris, nincs WASM. Tiszta TypeScript, a böngészőben fut.
  actions:
    - theme: brand
      text: Első lépések
      link: /hu/guide/getting-started
    - theme: alt
      text: A játszótér megnyitása
      link: /hu/playground
    - theme: alt
      text: Megtekintés a GitHubon
      link: https://github.com/knowvah/dot-engine
features:
  - title: Hű a C nyelvű Graphvizhez
    details: A kanonikus C implementáció soronkénti portolása. A dot motor a golden korpuszon szűk, determinisztikus tűréssel egyezik a natív binárissal (koordinátáknál ±0,01, a nem numerikus tartalomnál pontosan).
  - title: Böngészőnatív, futásidejű függőségek nélkül
    details: Nincs C — nincs natív Graphviz bináris, nincs WASM-portolás, nincs renderelő szerver. Maga az elrendezésmotor is TypeScript — csomagolja be, és szállítsa.
  - title: Mind a nyolc elrendezésmotor
    details: dot, neato, fdp, sfdp, circo, twopi, osage és patchwork — SVG-be renderelve.
  - title: Programozott elrendezés és geometria
    details: Nem csak renderelés — a kiszámított csúcspozíciókat, élspline-okat és klaszterhatárokat egyszerű, JSON-ba szerializálható pillanatképként olvashatja vissza a getLayout() segítségével, -Tplain feldolgozása nélkül.
---

## Próbálja ki

Az alábbi szerkesztő a valódi könyvtárat futtatja a böngészőjében. Szerkessze a
bal oldali DOT-ot; az SVG élőben frissül.

<Playground height="360px" />

## Válassza ki az útját

Újonnan érkezett? Válassza azt az ajtót, amelyik illik ahhoz, amit éppen csinál:

| Szeretném… | Itt kezdje |
| --- | --- |
| Megérteni, hogyan illeszkednek egymáshoz a részek | [Áttekintés — a gondolati modell](/hu/guide/overview) |
| Telepíteni, és megrenderelni az első gráfomat | [Első lépések](/hu/guide/getting-started) |
| Megoldani egy konkrét feladatot | [Receptgyűjtemény](/hu/guide/recipes) |
| Egy függvényt vagy típust megkeresni | [API-referencia](/hu/guide/api) · [Típusok](/hu/guide/types) |
| Telepítés nélkül kísérletezni | [Játszótér](/hu/playground) |

Másik eszközről érkezik? Lásd: [A C nyelvű `dot` parancssorból](/hu/guide/migrate-from-c-cli)
vagy [JS-es Graphviz-könyvtárakból](/hu/guide/migrate-from-js-libs).

A teljes, automatikusan generált szignatúrákért lásd a
[generált API-referenciát](/reference/). Renderelt gráfokat szeretne beágyazni egy oldalba?
Olvassa el a [Munka képekkel](/hu/guide/images) című részt a képek beágyazásáról és a CSP-ről.
