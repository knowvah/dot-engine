---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Graphviz v čistém TypeScriptu
  tagline: DOT na vstupu, SVG na výstupu — bez C. Žádná nativní binárka Graphviz, žádný WASM. Čistý TypeScript, běží v prohlížeči.
  actions:
    - theme: brand
      text: Začínáme
      link: /cs/guide/getting-started
    - theme: alt
      text: Otevřít hřiště
      link: /cs/playground
    - theme: alt
      text: Zobrazit na GitHubu
      link: https://github.com/knowvah/dot-engine
features:
  - title: Věrný původnímu C Graphviz
    details: Řádek po řádku přenesená kanonická implementace v C. Modul dot se na korpusu golden testů shoduje s nativní binárkou v úzké deterministické toleranci (±0,01 u souřadnic, přesná shoda u nečíselného obsahu).
  - title: Nativní pro prohlížeč, bez závislostí za běhu
    details: Žádné C — žádná nativní binárka Graphviz, žádná WASM portace, žádný vykreslovací server. Samotný modul rozvržení je napsaný v TypeScriptu — zabalte ho a nasaďte.
  - title: Všech osm modulů rozvržení
    details: dot, neato, fdp, sfdp, circo, twopi, osage a patchwork — vykreslené do SVG.
  - title: Programové rozvržení a geometrie
    details: Nejen vykreslování — vypočtené pozice uzlů, spliny hran a hranice clusterů si přes getLayout() přečtete zpět jako obyčejný snímek serializovatelný do JSON, bez parsování -Tplain.
---

## Vyzkoušejte si to

Editor níže spouští skutečnou knihovnu přímo ve vašem prohlížeči. Upravte DOT
vlevo; SVG se aktualizuje živě.

<Playground height="360px" />

## Vyberte si cestu

Jste tu poprvé? Vyberte si dveře, které odpovídají tomu, co děláte:

| Chci… | Začněte zde |
| --- | --- |
| Pochopit, jak do sebe díly zapadají | [Přehled — mentální model](/cs/guide/overview) |
| Nainstalovat a vykreslit první graf | [Začínáme](/cs/guide/getting-started) |
| Vyřešit konkrétní úlohu | [Kuchařka receptů](/cs/guide/recipes) |
| Vyhledat funkci nebo typ | [Reference API](/cs/guide/api) · [Typy](/cs/guide/types) |
| Experimentovat bez instalace | [Hřiště](/cs/playground) |

Přicházíte z jiného nástroje? Podívejte se na [Z C nástroje `dot`](/cs/guide/migrate-from-c-cli)
nebo [Z JS knihoven pro Graphviz](/cs/guide/migrate-from-js-libs).

Úplné, automaticky generované signatury najdete v
[generované referenci API](/reference/). Vkládáte vykreslené grafy do stránky?
Přečtěte si [Práce s obrázky](/cs/guide/images), kde je vložení obrázků přímo do SVG a doporučení k CSP.
