---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Migrera från andra JS-bibliotek för Graphviz

viz.js / `@viz-js/viz`, `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`) och
`d3-graphviz` ger alla JavaScript-åtkomst till Graphviz genom att kompilera
det riktiga C-Graphviz till **WebAssembly** och anropa det. @knowvah/dot-engine
är en **TypeScript-portering** skriven från grunden — layoutmotorerna,
tolkaren och SVG-utmataren är TypeScript-källkod, inte en kompilerad binär.

Den skillnaden är huvudpoängen, inte en fotnot:

| | WASM-omslag (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Implementation | Riktiga C-Graphviz, kompilerat till en `.wasm`-binär | Ren TypeScript-portering, ingen kompilerad artefakt |
| Modulinitiering | Asynkron — instansiera/invänta WASM-modulen före första användning | Ingen — `import` och anropa synkront |
| Paketstorlek | Leverera en `.wasm`-fil (hundratals KB till låga MB) vid sidan av JS | Bara JS, kan trädskakas |
| Felsökning | Stega genom en WASM-blob (eller C-källkod, om du har den) | Stega genom den riktiga TypeScript-koden med källkartor |
| Trådmodell | Vissa byggen kör layouten i en Web Worker | Körs på den anropande tråden, som vilken TS-funktion som helst |
| Utdataformat | Det som det underliggande C-bygget kompilerats med — vanligtvis hela Graphviz-uppsättningen, inklusive raster/PDF | SVG + textformaten DOT/json/xdot/plain/imagemap — se nedan |

Om ditt användningsfall är ”anropa en funktion, få SVG tillbaka, ingen
asynkron ceremoni, ingen WASM-fil att hosta” — då är det det här
@knowvah/dot-engine är till för. Om ditt användningsfall beror på raster- eller
PDF-utdata, se [När du ska stanna på WASM](#when-to-stay-on-wasm) nedan.

## API-skillnader

De tre biblioteken har olika form; tabellen nedan visar det vanliga
migreringsfallet (ungefärligt — verifiera mot respektive biblioteks egen
dokumentation; se källhänvisningarna under tabellen).

| Bibliotek | Typiskt anrop | Motsvarighet i @knowvah/dot-engine |
|---|---|---|
| `@viz-js/viz` (efterträdare till viz.js) | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — asynkront, `Viz.instance()` löser ett Promise | `renderSvg(dot, 'dot')` — synkront, inget instans-/init-steg |
| viz.js 2.x (äldre, `new Viz()`) | `new Viz().renderString(dot)` — returnerar ett `Promise<string>` | `renderSvg(dot, 'dot')` — synkront |
| `@hpcc-js/wasm-graphviz` | `await Graphviz.load()` en gång, sedan `graphviz.dot(dot)` (synkront efter laddning) | `renderSvg(dot, engine)` — inget laddnings-/uppvärmningssteg alls |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — binder utdata till DOM, animerar övergångar | `renderSvg(dot, engine)` returnerar en SVG-**sträng**; du sätter in den i DOM själv (till exempel `el.innerHTML = svg`) |

Varje anrop till @knowvah/dot-engine i högerkolumnen är **synkront** — det finns
ingen modul att invänta, eftersom det inte finns någon WASM-binär att
instansiera. Ta bort alla `await`/`.then()` som omger ett anrop till
@knowvah/dot-engine; de behövdes aldrig.

- `@viz-js/viz`s `Viz.instance()` → Promise och metoden `renderSVGElement()`
  är dokumenterade på viz-js.com; bekräftat via projektets publicerade
  användningsexempel vid tidpunkten för skrivandet.
- viz.js 2.x:s `new Viz().renderString(dot)` är det API som dokumenteras för
  den (numera ersatta) utgåvelinjen; om du har en aktuell installation, kontrollera
  om du i själva verket använder `@viz-js/viz`.
- Paret `Graphviz.load()` / `graphviz.dot()` i `@hpcc-js/wasm-graphviz` är
  bekräftat via paketets publicerade användningsexempel vid tidpunkten för
  skrivandet. Det separata, äldre paketet `@hpcc-js/wasm` exponerade dessutom
  anropet `graphviz.layout(dot, format, engine)` i tidigare utgåvor —
  kontrollera din installerade versions egen dokumentation innan du förlitar dig
  på den exakta signaturen.
- Kedjan `.graphviz().renderDot(dot)` i `d3-graphviz`, och att den internt är
  byggd på `@hpcc-js/wasm`, är bekräftad via projektets publicerade README vid
  tidpunkten för skrivandet.

### DOM-bindningen i `renderDot` ligger utanför det här

`d3-graphviz` gör mer än att rendera SVG: det binder resultatet till ett
D3-urval, jämför omrenderingar och animerar övergångar mellan layouter.
@knowvah/dot-engine har ingen åsikt om DOM alls — `renderSvg`/`render`
returnerar en vanlig sträng. Vill du ha animerade övergångar i d3-graphviz-stil
mellan två layouter är det logik du får bygga ovanpå två `renderSvg`-anrop och
din egen DOM-jämförelse (eller fortsätta använda d3-graphviz för just den
funktionen — se nedan).

## Få layoutdata utan att tolka ett strängformat

Alla tre WASM-biblioteken kan be om Graphviz egna JSON- eller textformat, och
sedan tolkar du den strängen själv för att få nod- och kantkoordinater.
@knowvah/dot-engine hoppar över textomvägen: anropa `getLayout(g)` (efter
`render`) för en typad, JSON-serialiserbar ögonblicksbild direkt — ingen
`-Tjson`-/`-Tplain`-sträng att tolka.

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

Se [Läs beräknad geometri](/sv/guide/geometry) för ögonblicksbildens fullständiga
form, enheter och alternativet `yAxis`.

## När du ska stanna på WASM {#when-to-stay-on-wasm}

Var ärlig mot dig själv om omfattningen: @knowvah/dot-engine riktar sig mot SVG
plus textformaten `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx`. Det
skapar **inte** rasterformat (PNG/JPEG/GIF/...) eller PostScript/PDF/EPS — det är
en avsiktlig omfattningsgräns, inte en lucka som bara är ofärdig. Se
[Kända avvikelser](/sv/divergences) för den exakta listan över icke-mål.

Behöver ditt program `-Tpng`- eller `-Tpdf`-utdata direkt från layoutmotorn
täcker de WASM-baserade biblioteken ovan fortfarande det fallet — eftersom de
kör det riktiga C-Graphviz stöder de de utdataformat som bygget kompilerades
med. I det scenariot kan du antingen fortsätta använda WASM-biblioteket för
just den kodvägen, eller rendera till `'svg'` med @knowvah/dot-engine och
konvertera SVG till raster/PDF i efterhand med ett separat verktyg.

## Se även

- [Layoutmotorer](/sv/guide/engines)
- [Rendera till andra format](/sv/guide/render-formats)
- [Läs beräknad geometri](/sv/guide/geometry)
- [Kända avvikelser](/sv/divergences)
- [Kom igång](/sv/guide/getting-started)
