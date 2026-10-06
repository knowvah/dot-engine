---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Átállás más JS-es Graphviz-könyvtárakról

A viz.js / `@viz-js/viz`, a `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`) és a
`d3-graphviz` mind úgy teszi elérhetővé a Graphviz-et JavaScriptből, hogy a
valódi C nyelvű Graphviz-et **WebAssembly**-re fordítja, és abba hív bele. A
@knowvah/dot-engine a nulláról írt **TypeScript-portolás** — az elrendezésmotorok,
az értelmező és az SVG-kibocsátó TypeScript-forráskód, nem lefordított bináris.

Ez a különbség a lényeg, nem lábjegyzet:

| | WASM-burkolók (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Megvalósítás | Valódi C nyelvű Graphviz, `.wasm` binárisra fordítva | Tiszta TypeScript-portolás, lefordított artefaktum nélkül |
| Modul inicializálása | Aszinkron — az első használat előtt példányosítani/megvárni kell a WASM-modult | Nincs — `import`, majd szinkron hívás |
| Csomag | Egy `.wasm` eszközt kell szállítani a JS mellett (több száz KB – néhány MB) | Csak JS, tree-shake-elhető |
| Hibakeresés | Egy WASM-blobban (vagy a C forrásban, ha megvan) kell lépkedni | A valódi TypeScriptben lépkedhet forrástérképekkel |
| Szálkezelési modell | Egyes buildek Web Workerben futtatják az elrendezést | A hívó szálon fut, mint bármely TS-függvény |
| Kimeneti formátumok | Amivel a mögöttes C build készült — jellemzően a teljes Graphviz-készlet, a raszter/PDF is | SVG + a DOT/json/xdot/plain/imagemap szöveges formátumok — lásd lent |

Ha az Ön esete az, hogy „hívok egy függvényt, kapok SVG-t, aszinkron szertartás
nélkül, kiszolgálandó WASM-eszköz nélkül” — a @knowvah/dot-engine pontosan erre
való. Ha az Ön esete raszter- vagy PDF-kimenettől függ, lásd lent a
[Mikor érdemes a WASM-nál maradni](#when-to-stay-on-wasm) részt.

## API-különbségek

A három könyvtár alakja eltérő; az alábbi táblázat a gyakori átállási eset
(hozzávetőleges — ellenőrizze az egyes könyvtárak saját dokumentációjában; a
hivatkozásokat lásd a sorok alatt).

| Könyvtár | Tipikus hívás | @knowvah/dot-engine megfelelő |
|---|---|---|
| `@viz-js/viz` (a viz.js utódja) | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — aszinkron, a `Viz.instance()` Promise-t ad | `renderSvg(dot, 'dot')` — szinkron, példány-/inicializálási lépés nélkül |
| viz.js 2.x (örökölt, `new Viz()`) | `new Viz().renderString(dot)` — `Promise<string>`-et ad | `renderSvg(dot, 'dot')` — szinkron |
| `@hpcc-js/wasm-graphviz` | egyszer `await Graphviz.load()`, utána `graphviz.dot(dot)` (betöltés után szinkron) | `renderSvg(dot, engine)` — egyáltalán nincs betöltési/bemelegítési lépés |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — a kimenetet a DOM-ba köti, animálja az átmeneteket | a `renderSvg(dot, engine)` SVG-**sztringet** ad; a DOM-ba Ön szúrja be (pl. `el.innerHTML = svg`) |

A jobb oldali oszlopban minden @knowvah/dot-engine-hívás **szinkron** — nincs mire
várni, mert nincs példányosítandó WASM-bináris. Hagyjon el minden `await`-et/
`.then()`-t, amely @knowvah/dot-engine-hívást burkol; sosem volt rá szükség.

- A `@viz-js/viz` `Viz.instance()` → Promise és `renderSVGElement()` metódusa a
  viz-js.com oldalon van dokumentálva; a projekt közzétett használati példáján
  keresztül megerősítve, az írás idején.
- A viz.js 2.x `new Viz().renderString(dot)` hívása az ahhoz a (mára
  felváltott) kiadási vonalhoz dokumentált API; ha aktuális telepítést használ,
  ellenőrizze, hogy valójában a `@viz-js/viz`-en van-e.
- A `@hpcc-js/wasm-graphviz` `Graphviz.load()` / `graphviz.dot()` párosa a csomag
  közzétett használati példáján keresztül megerősítve, az írás idején. A külön,
  régebbi `@hpcc-js/wasm` csomag a korábbi kiadásokban ezen felül egy
  `graphviz.layout(dot, format, engine)` hívást is kínált — a pontos szignatúrára
  támaszkodás előtt ellenőrizze a telepített verzió saját dokumentációját.
- A `d3-graphviz` `.graphviz().renderDot(dot)` láncát, és azt, hogy belsőleg a
  `@hpcc-js/wasm`-ra épül, a projekt közzétett README-je erősíti meg az írás
  idején.

### A `renderDot` DOM-kötése itt nem tartozik a hatókörbe {#renderdot-dom-binding}

A `d3-graphviz` többet tesz SVG renderelésénél: az eredményt D3-szelekcióhoz
köti, különbségeket számol az újrarenderelések között, és animálja a két
elrendezés közötti átmeneteket. A @knowvah/dot-engine-nek egyáltalán nincs
DOM-vonatkozású véleménye — a `renderSvg`/`render` egyszerű sztringet ad vissza.
Ha d3-graphviz-stílusú, animált átmeneteket szeretne két elrendezés között, azt
két `renderSvg`-hívásra és saját DOM-összehasonlításra kell építenie (vagy erre
az egy funkcióra tovább használhatja a d3-graphviz-et — lásd lent).

## Elrendezési adatok sztringformátum feldolgozása nélkül

Mind a három WASM-könyvtártól kérhető a Graphviz saját JSON- vagy egyszerű
szöveges formátuma, majd a sztringet Ön dolgozza fel a csúcs-/élkoordinátákért.
A @knowvah/dot-engine kihagyja a szöveges kerülőutat: hívja a `getLayout(g)`
függvényt (a `render` után), és közvetlenül típusos, JSON-ba szerializálható
pillanatképet kap — nincs feldolgozandó `-Tjson`/`-Tplain` sztring.

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

A pillanatkép teljes alakját, mértékegységeit és az `yAxis` opciót lásd
[A kiszámított geometria kiolvasása](/hu/guide/geometry) oldalon.

## Mikor érdemes a WASM-nál maradni {#when-to-stay-on-wasm}

Legyen őszinte magával a hatókörről: a @knowvah/dot-engine az SVG-t és a
`dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx` szöveges formátumokat célozza.
**Nem** bocsát ki rasztergrafikus formátumokat (PNG/JPEG/GIF/...) vagy
PostScriptet/PDF-et/EPS-t — ez szándékos hatókörhatár, nem pusztán befejezetlen
hiány. A pontos nem-célok listáját lásd az [Ismert eltérések](/hu/divergences)
oldalon.

Ha az alkalmazásának közvetlenül az elrendezőmotorból van szüksége `-Tpng` vagy
`-Tpdf` kimenetre, a fenti WASM-alapú könyvtárak ezt az esetet továbbra is
lefedik — mivel a valódi C nyelvű Graphviz-et futtatják, azokat a kimeneti
formátumokat támogatják, amelyekkel az adott build készült. Ebben a
forgatókönyvben vagy használja tovább a WASM-könyvtárat arra az egy kódútra,
vagy renderelje `'svg'`-be a @knowvah/dot-engine-nel, és alakítsa az SVG-t
raszterré/PDF-fé a további lépésben egy külön eszközzel.

## Lásd még

- [Elrendezésmotorok](/hu/guide/engines)
- [Renderelés más formátumokba](/hu/guide/render-formats)
- [A kiszámított geometria kiolvasása](/hu/guide/geometry)
- [Ismert eltérések](/hu/divergences)
- [Első lépések](/hu/guide/getting-started)
