---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Migrering fra kommandolinjeværktøjet `dot`

C-binærfilerne `dot`/`neato`/`fdp`/... læser en `.dot`-fil (eller stdin) og
skriver en renderet fil (eller stdout). @knowvah/dot-engine har intet
filsystem: den tager en DOT-**streng** ind og returnerer en renderet
**streng** ud (eller, med `getLayout`, et almindeligt JavaScript-geometriobjekt
i stedet for en streng, du skal parse).

```bash
dot -Kneato -Tsvg input.dot -o output.svg
```

```ts
import { renderSvg } from '@knowvah/dot-engine';
import { readFileSync, writeFileSync } from 'node:fs';

const dot = readFileSync('input.dot', 'utf8');
const svg = renderSvg(dot, 'neato');
writeFileSync('output.svg', svg);
```

Fillæsningen og -skrivningen ovenfor er din kode, ikke bibliotekets —
@knowvah/dot-engine rører aldrig disken. Det er også det, der gør, at den
fungerer uændret i en browserfane, hvor der ikke er nogen `input.dot` at læse.

## `-K<engine>` — layoutmotoren

`-K` vælger layoutmotoren; @knowvah/dot-engine tager det samme navn som
`engine`-argumentet til `renderSvg` eller feltet `opts.engine` i `render`. Alle
otte motorer er porteret:

| `-K`-værdi | @knowvah/dot-engine `engine`-streng |
|---|---|
| `-Kdot` | `'dot'` (også standarden for `render`, når `engine` udelades) |
| `-Kneato` | `'neato'` |
| `-Kfdp` | `'fdp'` |
| `-Ksfdp` | `'sfdp'` |
| `-Kcirco` | `'circo'` |
| `-Ktwopi` | `'twopi'` |
| `-Kosage` | `'osage'` |
| `-Kpatchwork` | `'patchwork'` |

```ts
renderSvg(dot, 'neato');
render(g, 'svg', { engine: 'neato' });
```

Se [Layoutmotorer](/da/guide/engines) for, hvad hver enkelt gør, og dens
overensstemmelsesklasse.

## `-T<format>` — outputformatet

`renderSvg` er kun til SVG; brug `render(g, format, opts?)` til alt andet.
@knowvah/dot-engines `OutputFormat`-union dækker disse `-T`-mål:

| `-T`-værdi | @knowvah/dot-engine `format`-streng | Noter |
|---|---|---|
| `-Tsvg` | `'svg'` | også `renderSvg`s eneste output |
| `-Tdot` | `'dot'` | DOT-kildekode med tilføjede layoutattributter (`pos`, `bb`, ...) |
| `-Txdot` | `'xdot'` | DOT + xdot-instruktionerne `_draw_`/`_ldraw_` |
| `-Tjson` | `'json'` | hele grafen som JSON |
| `-Tplain` | `'plain'` | mellemrumsadskilt geometri for knuder/kanter |
| `-Tplain-ext` | `'plain-ext'` | `plain`, plus portkoordinater på kanter |
| `-Timap` | `'imap'` | server-side HTML-billedkort |
| `-Tcmapx` | `'cmapx'` | klient-side HTML-`<map>`-element |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Understøttes ikke:** rasterformater (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps` samt GUI-/interaktive backends. Det er en bevidst
afgrænsning af omfanget — se [Kendte afvigelser](/da/divergences) for den fulde
liste over ikke-mål. Har du brug for et raster, så render til `'svg'` og
konvertér efterfølgende (en headless browser, `resvg` eller lignende).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — attributter

CLI'ens globale attributflag sætter en standardværdi på hver graf/knude/kant
fra kommandolinjen. @knowvah/dot-engine har ingen kommandolinjeflag — sæt de
samme attributter direkte i DOT-kildekoden, eller via builder-API'en, hvis du
konstruerer grafen i kode:

```bash
dot -Gsize=6,6 -Nshape=box -Ecolor=blue -Tsvg input.dot
```

```ts
// DOT source — put the defaults in a top-level attribute statement
const dot = `
  digraph {
    graph [size="6,6"];
    node  [shape=box];
    edge  [color=blue];
    a -> b;
  }
`;
const svg = renderSvg(dot, 'dot');
```

```ts
// Builder — set per-node/per-edge attrs where you create each one
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.setAttr('size', '6,6');
b.addNode('a', { shape: 'box' });
b.addNode('b', { shape: 'box' });
b.addEdge('a', 'b', { color: 'blue' });
const svg = render(b.graph, 'svg');
```

Se [Byg en graf i kode](/da/guide/build-a-graph) for den fulde builder-API.

## Geometri, som CLI'en ikke kan give dig direkte

`-Tplain` findes netop, så scripts kan skrabe knude-/kantkoordinater ud af
tekstoutput. @knowvah/dot-engine springer omvejen over: kald `getLayout(g)`
efter `render` for at få et typet, JSON-serialiserbart snapshot af hver
knudeposition, hver kantspline og den samlede afgrænsningsboks — intet
tekstformat at parse.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes[0] → { name: 'a', x, y, width, height }
```

Se [Læs beregnet geometri](/da/guide/geometry) for snapshottets fulde form og
indstillingen `yAxis` (native graphviz er y-op; browsere er y-ned).

## Skrifttyper og billeder: CLI'en læser dit filsystem, @knowvah/dot-engine gør ikke

Native `dot` måler tekst med de skrifttyper, der er installeret på maskinen, og
slår `image="..."`-attributter op ved at læse filer relativt til
arbejdsmappen. @knowvah/dot-engine har ingen adgang til filsystemet, så begge
dele injiceres af værtsapplikationen i stedet for at blive læst fra disken:

- **Tekstmåling** — `setTextMeasurer` installerer en `TextMeasurer`; biblioteket
  vælger automatisk en fornuftig standard (browser-canvas eller en deterministisk
  metrikmodel i Node), hvis du ikke angiver en. Se
  [Tekstmåling](/da/guide/text-measurement).
- **Billeder** — `setImageSizer` (og `setImageResolver` til indlejring) lader dig
  levere billedernes iboende dimensioner og billeddata selv, da
  @knowvah/dot-engine ikke kan slå en fil op på dine vegne. Se
  [Arbejd med billeder](/da/guide/images).

## Se også

- [Layoutmotorer](/da/guide/engines)
- [Render til andre formater](/da/guide/render-formats)
- [Læs beregnet geometri](/da/guide/geometry)
- [Kendte afvigelser](/da/divergences)
- [Kom godt i gang](/da/guide/getting-started)
