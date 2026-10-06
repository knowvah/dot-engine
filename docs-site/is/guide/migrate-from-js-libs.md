---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Flutningur frá öðrum JS-söfnum fyrir Graphviz

viz.js / `@viz-js/viz`, `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`) og
`d3-graphviz` gefa öll JavaScript aðgang að Graphviz með því að þýða raunverulegt
C-Graphviz í **WebAssembly** og kalla inn í það. @knowvah/dot-engine er
**TypeScript-yfirfærsla** frá grunni — uppsetningarvélarnar, þátturinn og
SVG-útgefandinn eru TypeScript-frumkóði, ekki þýdd keyrsluskrá.

Þessi munur er aðalatriðið, ekki neðanmálsgrein:

| | WASM-umbúðir (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Útfærsla | Raunverulegt C-Graphviz, þýtt í `.wasm`-keyrsluskrá | Hrein TypeScript-yfirfærsla, engin þýdd afurð |
| Frumstilling einingar | Ósamstillt — þarf að stofna/bíða eftir WASM-einingunni fyrir fyrstu notkun | Engin — `import` og kallaðu samstillt |
| Búnt | Senda `.wasm`-eign (hundruð KB – lágir MB) með JS | Aðeins JS, trjáhristanlegt |
| Villuleit | Stíga í gegnum WASM-klump (eða C-frumkóða, ef þú hefur hann) | Stíga í gegnum raunverulegt TypeScript með source map-skrám |
| Þráðalíkan | Sumar útgáfur keyra uppsetningu í Web Worker | Keyrir á kallandi þræði, eins og hvert annað TS-fall |
| Úttakssnið | Það sem undirliggjandi C-útgáfa var þýdd með — yfirleitt allt Graphviz-settið, þar á meðal raster/PDF | SVG + textasniðin DOT/json/xdot/plain/imagemap — sjá hér að neðan |

Ef notkunartilvikið þitt er „kalla á fall, fá SVG til baka, engin ósamstillt
seremónía, engin WASM-eign til að hýsa“ — þá er @knowvah/dot-engine fyrir það. Ef
notkunartilvikið þitt byggist á raster- eða PDF-úttaki, sjá
[Hvenær á að halda sig við WASM](#when-to-stay-on-wasm) hér að neðan.

## API-munur

Söfnin þrjú hafa ólíka lögun; taflan hér að neðan sýnir algengasta
flutningstilvikið (áætlað — staðfestu í skjölum hvers safns; sjá
tilvísanir undir hverri línu).

| Safn | Dæmigert kall | Jafngildi í @knowvah/dot-engine |
|---|---|---|
| `@viz-js/viz` (arftaki viz.js) | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — ósamstillt, `Viz.instance()` skilar Promise | `renderSvg(dot, 'dot')` — samstillt, ekkert instance/init-skref |
| viz.js 2.x (eldra, `new Viz()`) | `new Viz().renderString(dot)` — skilar `Promise<string>` | `renderSvg(dot, 'dot')` — samstillt |
| `@hpcc-js/wasm-graphviz` | `await Graphviz.load()` einu sinni, svo `graphviz.dot(dot)` (samstillt eftir hleðslu) | `renderSvg(dot, engine)` — ekkert hleðslu-/upphitunarskref yfirleitt |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — bindur úttakið í DOM og hreyfir umbreytingar | `renderSvg(dot, engine)` skilar SVG-**streng**; þú setur hann sjálf(ur) inn í DOM (t.d. `el.innerHTML = svg`) |

Hvert kall á @knowvah/dot-engine í hægri dálki er **samstillt** — engin eining
til að bíða eftir, því engin WASM-keyrsluskrá er til að stofna. Fjarlægðu allt
`await`/`.then()` utan um kall á @knowvah/dot-engine; þess var aldrei þörf.

- `Viz.instance()` → Promise og `renderSVGElement()`-aðferð `@viz-js/viz` eru
  skjalfest á viz-js.com; staðfest með útgefnu notkunardæmi verkefnisins
  þegar þetta er skrifað.
- `new Viz().renderString(dot)` í viz.js 2.x er API-ið sem er skjalfest fyrir þá
  (nú úreltu) útgáfulínu; ef þú ert með núverandi uppsetningu skaltu athuga
  hvort þú ert í raun á `@viz-js/viz`.
- Parið `Graphviz.load()` / `graphviz.dot()` í `@hpcc-js/wasm-graphviz` er
  staðfest með útgefnu notkunardæmi pakkans þegar þetta er skrifað. Eldri,
  aðskilinn pakki `@hpcc-js/wasm` bauð að auki upp á kallið
  `graphviz.layout(dot, format, engine)` í fyrri útgáfum — athugaðu skjöl
  uppsettu útgáfunnar áður en þú treystir á nákvæma undirskrift.
- Keðjan `.graphviz().renderDot(dot)` í `d3-graphviz`, og að hún byggist innvortis á
  `@hpcc-js/wasm`, er staðfest með útgefnu README verkefnisins
  þegar þetta er skrifað.

### DOM-binding `renderDot` er utan umfangs hér

`d3-graphviz` gerir meira en að teikna SVG: það bindur niðurstöðuna í D3-val,
ber saman endurteiknanir og hreyfir umbreytingar milli uppsetninga.
@knowvah/dot-engine hefur enga skoðun á DOM — `renderSvg`/`render` skila venjulegum
streng. Ef þú vilt hreyfðar umbreytingar í stíl d3-graphviz milli tveggja
uppsetninga er það rökfræði sem þú smíðar ofan á tvö kall á `renderSvg` og eigin
DOM-samanburð (eða heldur áfram að nota d3-graphviz fyrir þann eiginleika — sjá
hér að neðan).

## Uppsetningargögn án þess að þátta strengjasnið

Hægt er að biðja öll þrjú WASM-söfnin um eigin JSON- eða hreintextasnið Graphviz,
og þá þáttarðu strenginn sjálf(ur) til að fá hnit hnúta/leggja.
@knowvah/dot-engine sleppir textahringferðinni: kallaðu á `getLayout(g)` (eftir `render`)
fyrir tegundaða, JSON-raðgeranlega skyndimynd beint — enginn `-Tjson`/`-Tplain`
strengur til að þátta.

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

Sjá [Lesa reiknaða rúmfræði](/is/guide/geometry) fyrir fulla lögun skyndimyndarinnar,
einingar og `yAxis`-valkostinn.

## Hvenær á að halda sig við WASM {#when-to-stay-on-wasm}

Vertu hreinskilin(n) við sjálfa(n) þig um umfang: @knowvah/dot-engine miðar á SVG auk
textasniðanna `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx`. Það gefur
**ekki** út rastasnið (PNG/JPEG/GIF/...) né PostScript/PDF/EPS — þetta eru
vísvitandi mörk umfangs, ekki eyða sem er einfaldlega ókláruð. Sjá
[Þekkt frávik](/is/divergences) fyrir nákvæman lista yfir það sem er ekki markmið.

Ef forritið þitt þarf `-Tpng`- eða `-Tpdf`-úttak beint úr uppsetningarvélinni
ná WASM-söfnin hér að ofan enn yfir það tilvik — þar sem þau keyra raunverulegt
C-Graphviz styðja þau hvaða úttakssnið sem sú útgáfa var þýdd með. Í því tilviki
skaltu annað hvort halda áfram að nota WASM-safnið fyrir þá einu kóðaleið, eða
teikna á `'svg'` með @knowvah/dot-engine og umbreyta SVG-inu í raster/PDF síðar með
sérstöku verkfæri.

## Sjá einnig

- [Uppsetningarvélar](/is/guide/engines)
- [Teikna á önnur snið](/is/guide/render-formats)
- [Lesa reiknaða rúmfræði](/is/guide/geometry)
- [Þekkt frávik](/is/divergences)
- [Fyrstu skref](/is/guide/getting-started)
