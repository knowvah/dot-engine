---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Migrácia z iných knižníc Graphviz pre JS

viz.js / `@viz-js/viz`, `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`)
a `d3-graphviz` všetky sprístupňujú Graphviz v JavaScripte tak, že skutočný
Graphviz v jazyku C skompilujú do **WebAssembly** a volajú ho. @knowvah/dot-engine
je od základov napísaný **port do TypeScriptu** — moduly rozloženia, parser
a emitor SVG sú zdrojový kód v TypeScripte, nie skompilovaná binárka.

Tento rozdiel je kľúčový, nie poznámka pod čiarou:

| | Obaly nad WASM (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Implementácia | Skutočný Graphviz v C skompilovaný do binárky `.wasm` | Čistý port do TypeScriptu, žiadny skompilovaný artefakt |
| Inicializácia modulu | Asynchrónna — pred prvým použitím treba modul WASM inštancovať/počkať naň | Žiadna — `import` a synchrónne volanie |
| Balík | K JS treba dodať aj súbor `.wasm` (stovky KB až nízke jednotky MB) | Iba JS, s odstraňovaním nepoužitého kódu (tree-shaking) |
| Ladenie | Krokovanie cez blob WASM (alebo zdrojový kód v C, ak ho máte) | Krokovanie skutočným TypeScriptom so source mapami |
| Model vlákien | Niektoré zostavenia spúšťajú rozloženie vo Web Workeri | Beží vo volajúcom vlákne ako každá funkcia v TS |
| Výstupné formáty | Čokoľvek, s čím bolo príslušné zostavenie v C skompilované — typicky celá sada Graphviz vrátane rastra/PDF | SVG + textové formáty DOT/json/xdot/plain/imagemap — pozrite nižšie |

Ak je váš prípad použitia „zavolať funkciu, dostať SVG, bez asynchrónneho
ceremoniálu a bez WASM súboru, ktorý treba hostiť“ — na to je určený
@knowvah/dot-engine. Ak váš prípad použitia závisí od rastrového alebo PDF
výstupu, pozrite si nižšie [Kedy zostať pri WASM](#when-to-stay-on-wasm).

## Rozdiely v API

Tieto tri knižnice majú rôzny tvar; tabuľka nižšie zachytáva bežný prípad
migrácie (približne — overte si v dokumentácii každej knižnice; pozrite
citácie pod tabuľkou).

| Knižnica | Typické volanie | Ekvivalent v @knowvah/dot-engine |
|---|---|---|
| `@viz-js/viz` (nástupca viz.js) | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — asynchrónne, `Viz.instance()` vracia Promise | `renderSvg(dot, 'dot')` — synchrónne, bez kroku inštancie/inicializácie |
| viz.js 2.x (staršia, `new Viz()`) | `new Viz().renderString(dot)` — vracia `Promise<string>` | `renderSvg(dot, 'dot')` — synchrónne |
| `@hpcc-js/wasm-graphviz` | jedenkrát `await Graphviz.load()`, potom `graphviz.dot(dot)` (po načítaní synchrónne) | `renderSvg(dot, engine)` — žiadny krok načítania/zahrievania |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — viaže výstup do DOM, animuje prechody | `renderSvg(dot, engine)` vracia **reťazec** SVG; do DOM ho vkladáte sami (napr. `el.innerHTML = svg`) |

Každé volanie @knowvah/dot-engine v pravom stĺpci je **synchrónne** — nie je
čo čakať, pretože neexistuje binárka WASM, ktorú by bolo treba inštancovať.
Zahoďte každé `await`/`.then()` okolo volania @knowvah/dot-engine; nikdy nebolo
potrebné.

- `Viz.instance()` → Promise a metóda `renderSVGElement()` v `@viz-js/viz` sú
  zdokumentované na viz-js.com; potvrdené publikovaným príkladom použitia
  projektu v čase písania.
- `new Viz().renderString(dot)` vo viz.js 2.x je API zdokumentované pre túto
  (už nahradenú) vetvu vydaní; ak používate aktuálnu inštaláciu, skontrolujte,
  či skutočne nie ste na `@viz-js/viz`.
- Dvojica `Graphviz.load()` / `graphviz.dot()` v `@hpcc-js/wasm-graphviz` je
  potvrdená publikovaným príkladom použitia balíka v čase písania. Samostatný,
  starší balík `@hpcc-js/wasm` v minulých vydaniach navyše sprístupňoval
  volanie `graphviz.layout(dot, format, engine)` — pred spoliehaním sa na
  presnú signatúru si pozrite dokumentáciu vašej nainštalovanej verzie.
- Reťazec `.graphviz().renderDot(dot)` v `d3-graphviz` a to, že je interne
  postavený na `@hpcc-js/wasm`, je potvrdené publikovaným súborom README
  projektu v čase písania.

### Väzba `renderDot` na DOM tu nepatrí do rozsahu

`d3-graphviz` robí viac než vykreslenie SVG: výsledok viaže do výberu D3,
porovnáva opakované vykreslenia a animuje prechody medzi rozloženiami.
@knowvah/dot-engine nemá k DOM žiadny názor — `renderSvg`/`render` vracajú
obyčajný reťazec. Ak chcete animované prechody medzi dvoma rozloženiami
v štýle d3-graphviz, je to logika, ktorú by ste postavili nad dvoma
volaniami `renderSvg` a vlastným porovnávaním DOM (alebo pri tejto jednej
funkcii ďalej používajte d3-graphviz — pozrite nižšie).

## Získanie údajov o rozložení bez spracúvania textového formátu

Všetky tri knižnice WASM možno požiadať o vlastné formáty JSON alebo čistého
textu Graphviz, ktorý potom musíte sami spracovať, aby ste získali súradnice
uzlov a hrán. @knowvah/dot-engine textovú obchádzku vynecháva: zavolajte
`getLayout(g)` (po `render`) a priamo dostanete typovanú snímku serializovateľnú
do JSON — bez reťazca `-Tjson`/`-Tplain`, ktorý by ste museli spracúvať.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes  → [{ name: 'a', x, y, width, height }, ...]
// layout.edges  → [{ tail: 'a', head: 'b', points: [...] }]
// layout.bounds → { x, y, width, height }
```

Úplný tvar snímky, jednotky a možnosť `yAxis` nájdete v časti
[Čítanie vypočítanej geometrie](/sk/guide/geometry).

## Kedy zostať pri WASM {#when-to-stay-on-wasm}

Buďte k sebe úprimní, pokiaľ ide o rozsah: @knowvah/dot-engine cieli na SVG
plus textové formáty `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx`.
**Nevytvára** rastrové formáty (PNG/JPEG/GIF/...) ani PostScript/PDF/EPS —
ide o zámernú hranicu rozsahu, nie o medzeru, ktorá je len nedokončená. Presný
zoznam necieľov nájdete v časti [Známe odchýlky](/sk/divergences).

Ak vaša aplikácia potrebuje výstup `-Tpng` alebo `-Tpdf` priamo z modulu
rozloženia, knižnice založené na WASM tento prípad stále pokrývajú — keďže
spúšťajú skutočný Graphviz v C, podporujú akékoľvek výstupné formáty, s ktorými
bolo dané zostavenie skompilované. V takom prípade buď pre túto jednu cestu
kódu ďalej používajte knižnicu WASM, alebo vykreslite do `'svg'` pomocou
@knowvah/dot-engine a SVG skonvertujte na raster/PDF neskôr samostatným
nástrojom.

## Pozrite aj

- [Moduly rozloženia](/sk/guide/engines)
- [Vykreslenie do iných formátov](/sk/guide/render-formats)
- [Čítanie vypočítanej geometrie](/sk/guide/geometry)
- [Známe odchýlky](/sk/divergences)
- [Začíname](/sk/guide/getting-started)
