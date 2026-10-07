---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Graphviz v čistom TypeScripte
  tagline: DOT dnu, SVG von — bez C. Žiadna natívna binárka Graphviz, žiadny WASM. Čistý TypeScript, beží v prehliadači.
  actions:
    - theme: brand
      text: Začíname
      link: /sk/guide/getting-started
    - theme: alt
      text: Otvoriť ihrisko
      link: /sk/playground
    - theme: alt
      text: Zobraziť na GitHube
      link: https://github.com/knowvah/dot-engine
features:
  - title: Verné pôvodnému C Graphviz
    details: Riadok po riadku portovaná kanonická implementácia v C. Modul dot sa na korpuse golden testov zhoduje s natívnou binárkou v úzkej deterministickej tolerancii (±0,01 pri súradniciach, nečíselný obsah presne).
  - title: Natívne v prehliadači, žiadne runtime závislosti
    details: Žiadne C — žiadna natívna binárka Graphviz, žiadny port do WASM, žiadny vykresľovací server. Samotný modul rozloženia je napísaný v TypeScripte — zbaľte ho a nasaďte.
  - title: Všetkých osem modulov rozloženia
    details: dot, neato, fdp, sfdp, circo, twopi, osage a patchwork — vykreslené do SVG.
  - title: Programové rozloženie a geometria
    details: Nielen vykresľovanie — vypočítané polohy uzlov, splajny hrán a hranice klastrov si prečítate späť ako obyčajný snímok serializovateľný do JSON cez getLayout(), bez parsovania -Tplain.
---

## Vyskúšajte

Editor nižšie spúšťa skutočnú knižnicu priamo vo vašom prehliadači. Upravujte DOT
vľavo; SVG sa aktualizuje naživo.

<Playground height="360px" />

## Vyberte si cestu

Ste tu noví? Vyberte si dvere podľa toho, čo práve robíte:

| Chcem… | Začnite tu |
| --- | --- |
| Pochopiť, ako do seba jednotlivé časti zapadajú | [Prehľad — mentálny model](/sk/guide/overview) |
| Nainštalovať a vykresliť svoj prvý graf | [Začíname](/sk/guide/getting-started) |
| Vyriešiť konkrétnu úlohu | [Kuchárka receptov](/sk/guide/recipes) |
| Vyhľadať funkciu alebo typ | [Referencia API](/sk/guide/api) · [Typy](/sk/guide/types) |
| Experimentovať bez inštalácie | [Ihrisko](/sk/playground) |

Prichádzate z iného nástroja? Pozrite si [Z nástroja `dot` v C](/sk/guide/migrate-from-c-cli)
alebo [Z JS knižníc pre Graphviz](/sk/guide/migrate-from-js-libs).

Vyčerpávajúce, automaticky generované signatúry nájdete vo
[vygenerovanej referencii API](/reference/). Vkladáte vykreslené grafy na stránku?
Prečítajte si [Prácu s obrázkami](/sk/guide/images), kde je vloženie obrázkov a odporúčania k CSP.
