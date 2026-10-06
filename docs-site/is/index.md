---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Graphviz í hreinu TypeScript
  tagline: DOT inn, SVG út — án C. Engin innbyggð Graphviz-keyrsluskrá, ekkert WASM. Hreint TypeScript sem keyrir í vafranum.
  actions:
    - theme: brand
      text: Fyrstu skref
      link: /is/guide/getting-started
    - theme: alt
      text: Opna sandkassann
      link: /is/playground
    - theme: alt
      text: Skoða á GitHub
      link: https://github.com/knowvah/dot-engine
features:
  - title: Trú C-útgáfu Graphviz
    details: Yfirfærsla línu fyrir línu á upprunalegu C-útfærslunni. Vélin dot samsvarar innbyggðu keyrsluskránni innan þröngra, ákvarðandi vikmarka (±0,01 á hnitum, nákvæmlega eins í öllu sem ekki er tölur) á golden-safninu.
  - title: Sjálfsprottin í vafra, engin keyrsluháð söfn
    details: Ekkert C — engin innbyggð Graphviz-keyrsluskrá, engin WASM-yfirfærsla, enginn teiknunarþjónn. Uppsetningarvélin sjálf er TypeScript — pakkaðu henni og gefðu út.
  - title: Allar átta uppsetningarvélarnar
    details: dot, neato, fdp, sfdp, circo, twopi, osage og patchwork — teiknaðar sem SVG.
  - title: Uppsetning og rúmfræði í kóða
    details: Ekki bara teikna — lestu reiknaðar staðsetningar hnúta, splínur leggja og mörk klasa til baka sem einfalda, JSON-raðanlega skyndimynd með getLayout(), án þess að þáttun á -Tplain þurfi til.
---

## Prófaðu

Ritillinn hér fyrir neðan keyrir raunverulega safnið í vafranum þínum. Breyttu
DOT-kóðanum til vinstri; SVG-myndin uppfærist jafnóðum.

<Playground height="360px" />

## Veldu leið

Nýr hér? Veldu dyrnar sem passa við það sem þú ert að gera:

| Ég vil… | Byrjaðu hér |
| --- | --- |
| Skilja hvernig hlutirnir passa saman | [Yfirlit (hugarlíkan)](/is/guide/overview) |
| Setja upp og teikna fyrsta grafið mitt | [Fyrstu skref](/is/guide/getting-started) |
| Leysa ákveðið verkefni | [Uppskriftasafn](/is/guide/recipes) |
| Fletta upp falli eða tegund | [API-tilvísun](/is/guide/api) · [Tegundir](/is/guide/types) |
| Gera tilraunir án uppsetningar | [Sandkassi](/is/playground) |

Kemur þú úr öðru verkfæri? Sjá [Frá C-skipanalínunni `dot`](/is/guide/migrate-from-c-cli)
eða [Frá JS-söfnum fyrir Graphviz](/is/guide/migrate-from-js-libs).

Fyrir tæmandi, sjálfvirkt mynduð föll og tegundalýsingar sjá
[myndaða API-tilvísun](/reference/). Viltu fella teiknuð gröf inn á síðu?
Lestu [Unnið með myndir](/is/guide/images) um innfellingu mynda og CSP.
