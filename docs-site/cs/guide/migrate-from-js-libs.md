---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Migrace z jiných JS knihoven pro Graphviz

viz.js / `@viz-js/viz`, `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`) a
`d3-graphviz` všechny zpřístupňují Graphviz z JavaScriptu tím, že skutečný
Graphviz v C zkompilují do **WebAssembly** a volají jej. @knowvah/dot-engine je
**portace do TypeScriptu** napsaná od základu — moduly rozvržení, parser i
emitor SVG jsou zdrojový kód v TypeScriptu, nikoli zkompilovaná binárka.

Tento rozdíl je hlavní sdělení, ne poznámka pod čarou:

| | Obaly nad WASM (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Implementace | Skutečný Graphviz v C zkompilovaný do binárky `.wasm` | Čistá portace do TypeScriptu, žádný zkompilovaný artefakt |
| Inicializace modulu | Asynchronní — před prvním použitím je nutné modul WASM instancovat/počkat na něj | Žádná — `import` a synchronní volání |
| Balíček | Spolu s JS se dodává soubor `.wasm` (stovky KB až jednotky MB) | Pouze JS, podporuje tree-shaking |
| Ladění | Krokování blobu WASM (nebo zdrojového kódu C, pokud jej máte) | Krokování skutečného TypeScriptu pomocí source map |
| Model vláken | Některé sestavy spouštějí rozvržení ve Web Workeru | Běží ve volajícím vlákně jako každá funkce v TS |
| Výstupní formáty | Cokoli, s čím byla podkladová sestava v C zkompilována — typicky celá sada Graphviz včetně rastru/PDF | SVG + textové formáty DOT/json/xdot/plain/imagemap — viz níže |

Pokud váš případ použití zní „zavolat funkci, dostat SVG, žádné asynchronní
obřadnosti, žádný soubor WASM k hostování“ — právě k tomu @knowvah/dot-engine
slouží. Pokud váš případ závisí na rastrovém nebo PDF výstupu, viz níže
[Kdy zůstat u WASM](#kdy-zustat-u-wasm).

## Rozdíly v API

Tyto tři knihovny mají různý tvar; tabulka níže ukazuje běžný případ migrace
(přibližně — ověřte v dokumentaci jednotlivých knihoven; viz citace pod
jednotlivými řádky).

| Knihovna | Typické volání | Ekvivalent v @knowvah/dot-engine |
|---|---|---|
| `@viz-js/viz` (nástupce viz.js) | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — asynchronní, `Viz.instance()` vrací Promise | `renderSvg(dot, 'dot')` — synchronní, žádný krok instance/inicializace |
| viz.js 2.x (starší, `new Viz()`) | `new Viz().renderString(dot)` — vrací `Promise<string>` | `renderSvg(dot, 'dot')` — synchronní |
| `@hpcc-js/wasm-graphviz` | jednou `await Graphviz.load()`, pak `graphviz.dot(dot)` (po načtení synchronní) | `renderSvg(dot, engine)` — žádný krok načtení/zahřátí |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — váže výstup do DOM, animuje přechody | `renderSvg(dot, engine)` vrací **řetězec** SVG; do DOM jej vkládáte sami (např. `el.innerHTML = svg`) |

Každé volání @knowvah/dot-engine v pravém sloupci je **synchronní** — není co
očekávat (`await`), protože není co instancovat z binárky WASM. Zahoďte každé
`await`/`.then()` obalující volání @knowvah/dot-engine; nikdy nebylo třeba.

- `Viz.instance()` → Promise a metoda `renderSVGElement()` z `@viz-js/viz` jsou
  zdokumentovány na viz-js.com; potvrzeno publikovaným příkladem použití
  projektu v době psaní.
- `new Viz().renderString(dot)` z viz.js 2.x je API zdokumentované pro tuto
  (dnes nahrazenou) řadu vydání; pokud máte aktuální instalaci, ověřte, zda
  skutečně nejste na `@viz-js/viz`.
- Dvojice `Graphviz.load()` / `graphviz.dot()` z `@hpcc-js/wasm-graphviz` je
  potvrzena publikovaným příkladem použití balíčku v době psaní. Samostatný
  starší balíček `@hpcc-js/wasm` v minulých vydáních navíc nabízel volání
  `graphviz.layout(dot, format, engine)` — než se na přesnou signaturu
  spolehnete, ověřte si dokumentaci nainstalované verze.
- Řetězec `.graphviz().renderDot(dot)` z `d3-graphviz` a skutečnost, že je
  interně postaven na `@hpcc-js/wasm`, je potvrzena publikovaným README
  projektu v době psaní.

### Vazba `renderDot` na DOM je zde mimo rozsah

`d3-graphviz` dělá víc než jen vykreslení SVG: výsledek váže do výběru D3,
porovnává opakovaná vykreslení a animuje přechody mezi rozvrženími.
@knowvah/dot-engine k DOM nemá žádný názor — `renderSvg`/`render` vracejí
prostý řetězec. Pokud chcete animované přechody mezi dvěma rozvrženími ve stylu
d3-graphviz, je to logika, kterou si postavíte nad dvěma voláními `renderSvg`
a vlastním porovnáváním DOM (nebo pro tuto konkrétní funkci dál používejte
d3-graphviz — viz níže).

## Data rozvržení bez zpracování textového formátu

Všechny tři knihovny WASM lze požádat o vlastní formáty JSON nebo prostého
textu Graphviz a souřadnice uzlů a hran pak získáte zpracováním tohoto řetězce
sami. @knowvah/dot-engine textovou okliku přeskakuje: zavolejte `getLayout(g)`
(po `render`) a získáte rovnou typovaný snímek serializovatelný do JSON — žádný
řetězec `-Tjson`/`-Tplain` ke zpracování.

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

Úplný tvar snímku, jednotky a volbu `yAxis` popisuje
[Čtení vypočtené geometrie](/cs/guide/geometry).

## Kdy zůstat u WASM

Buďte k sobě upřímní ohledně rozsahu: @knowvah/dot-engine cílí na SVG a
textové formáty `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx`.
Rastrové formáty (PNG/JPEG/GIF/...) ani PostScript/PDF/EPS **nevytváří** — jde
o záměrnou hranici rozsahu, nikoli o mezeru, která by byla prostě nedokončená.
Přesný seznam necílů viz [Známé odchylky](/cs/divergences).

Pokud vaše aplikace potřebuje výstup `-Tpng` nebo `-Tpdf` přímo z modulu
rozvržení, výše uvedené knihovny založené na WASM tento případ stále pokrývají
— protože spouštějí skutečný Graphviz v C, podporují libovolné výstupní
formáty, s nimiž byla daná sestava zkompilována. V takovém scénáři buď pro tu
jednu cestu v kódu dál používejte knihovnu WASM, nebo vykreslete do `'svg'`
pomocí @knowvah/dot-engine a SVG převeďte na rastr/PDF následně samostatným
nástrojem.

## Viz také

- [Moduly rozvržení](/cs/guide/engines)
- [Vykreslení do jiných formátů](/cs/guide/render-formats)
- [Čtení vypočtené geometrie](/cs/guide/geometry)
- [Známé odchylky](/cs/divergences)
- [Začínáme](/cs/guide/getting-started)
