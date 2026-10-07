---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Migreren vanaf de `dot`-commandoregeltool

De C-binaries `dot`/`neato`/`fdp`/... lezen een `.dot`-bestand (of stdin) en
schrijven een gerenderd bestand (of stdout). @knowvah/dot-engine heeft geen
bestandssysteem: het neemt een DOT-**string** aan en geeft een gerenderde
**string** terug (of, met `getLayout`, een gewoon JavaScript-geometrieobject in
plaats van een string die u nog moet parsen).

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

Het lezen en schrijven van bestanden hierboven is uw code, niet die van de
bibliotheek — @knowvah/dot-engine raakt nooit de schijf aan. Dat is ook wat
ervoor zorgt dat het ongewijzigd werkt in een browsertabblad zonder
`input.dot` om te lezen.

## `-K<engine>` — de lay-out-engine

`-K` kiest de lay-out-engine; @knowvah/dot-engine neemt dezelfde naam als het
argument `engine` van `renderSvg` of het veld `opts.engine` van `render`. Alle
acht engines zijn geport:

| `-K`-waarde | @knowvah/dot-engine-`engine`-string |
|---|---|
| `-Kdot` | `'dot'` (ook de standaardwaarde voor `render` wanneer `engine` ontbreekt) |
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

Zie [Lay-out-engines](/nl/guide/engines) voor wat elk ervan doet en de
conformiteitsklasse ervan.

## `-T<format>` — het uitvoerformaat

`renderSvg` geeft alleen SVG; gebruik `render(g, format, opts?)` voor al het
andere. De `OutputFormat`-union van @knowvah/dot-engine dekt deze `-T`-doelen:

| `-T`-waarde | @knowvah/dot-engine-`format`-string | Opmerkingen |
|---|---|---|
| `-Tsvg` | `'svg'` | ook de enige uitvoer van `renderSvg` |
| `-Tdot` | `'dot'` | DOT-broncode met toegevoegde lay-out-attributen (`pos`, `bb`, ...) |
| `-Txdot` | `'xdot'` | DOT + xdot-instructies `_draw_`/`_ldraw_` |
| `-Tjson` | `'json'` | volledige graaf als JSON |
| `-Tplain` | `'plain'` | door witruimte gescheiden geometrie van knopen en kanten |
| `-Tplain-ext` | `'plain-ext'` | `plain`, plus poortcoördinaten op kanten |
| `-Timap` | `'imap'` | server-side HTML-afbeeldingskaart |
| `-Tcmapx` | `'cmapx'` | client-side HTML-`<map>`-element |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Niet ondersteund:** rasterformaten (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps` en GUI-/interactieve backends. Dit is een bewuste
scopegrens — zie [Bekende afwijkingen](/nl/divergences) voor de volledige lijst
met niet-doelen. Als u een rasterafbeelding nodig hebt, render dan naar `'svg'`
en converteer verderop in de keten (een headless browser, `resvg` of iets
vergelijkbaars).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — attributen

De globale attribuutvlaggen van de CLI stellen vanaf de commandoregel een
standaardwaarde in voor elke graaf/knoop/kant. @knowvah/dot-engine heeft geen
commandoregelvlaggen — stel dezelfde attributen rechtstreeks in de DOT-broncode
in, of via de builder-API als u de graaf in code opbouwt:

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

Zie [Een graaf bouwen in code](/nl/guide/build-a-graph) voor de volledige
builder-API.

## Geometrie die de CLI u niet rechtstreeks kan geven

`-Tplain` bestaat juist zodat scripts knoop-/kantcoördinaten uit tekstuitvoer
kunnen schrapen. @knowvah/dot-engine slaat die omweg over: roep `getLayout(g)`
aan na `render` voor een getypeerde, naar JSON te serialiseren momentopname van
elke knooppositie, elke kantspline en het totale omsluitende kader — geen
tekstformaat om te parsen.

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

Zie [Berekende geometrie uitlezen](/nl/guide/geometry) voor de volledige vorm
van de momentopname en de optie `yAxis` (native graphviz is y-omhoog; browsers
zijn y-omlaag).

## Lettertypen en afbeeldingen: de CLI leest uw bestandssysteem, @knowvah/dot-engine niet

Native `dot` meet tekst met de lettertypen die op de machine zijn geïnstalleerd
en lost `image="..."`-attributen op door bestanden te lezen relatief ten
opzichte van de werkmap. @knowvah/dot-engine heeft geen toegang tot het
bestandssysteem, dus beide worden door de hostapplicatie aangeleverd in plaats
van van schijf gelezen:

- **Tekstmeting** — `setTextMeasurer` installeert een `TextMeasurer`; de
  bibliotheek kiest automatisch een verstandige standaard (browsercanvas, of een
  deterministisch metriekmodel in Node) als u er geen instelt. Zie
  [Tekstmeting](/nl/guide/text-measurement).
- **Afbeeldingen** — met `setImageSizer` (en `setImageResolver` voor inlining)
  levert u zelf de intrinsieke afbeeldingsafmetingen en afbeeldingsgegevens aan,
  omdat @knowvah/dot-engine niet namens u een bestand kan opvragen. Zie
  [Werken met afbeeldingen](/nl/guide/images).

## Zie ook

- [Lay-out-engines](/nl/guide/engines)
- [Renderen naar andere formaten](/nl/guide/render-formats)
- [Berekende geometrie uitlezen](/nl/guide/geometry)
- [Bekende afwijkingen](/nl/divergences)
- [Aan de slag](/nl/guide/getting-started)
