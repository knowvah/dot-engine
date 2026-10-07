---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Migrera från kommandoradsverktyget `dot`

C-binärerna `dot`/`neato`/`fdp`/... läser en `.dot`-fil (eller stdin) och
skriver en renderad fil (eller stdout). @knowvah/dot-engine har inget
filsystem: det tar en DOT-**sträng** in och returnerar en renderad **sträng**
(eller, med `getLayout`, ett vanligt JavaScript-geometriobjekt i stället för
en sträng att tolka).

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

Filläsningen och filskrivningen ovan är din kod, inte bibliotekets —
@knowvah/dot-engine rör aldrig disken. Det är också det som gör att det
fungerar oförändrat i en webbläsarflik utan någon `input.dot` att läsa.

## `-K<engine>` — layoutmotorn

`-K` väljer layoutmotor; @knowvah/dot-engine tar samma namn som argumentet
`engine` till `renderSvg` eller fältet `opts.engine` i `render`. Alla åtta
motorer är portade:

| `-K`-värde | @knowvah/dot-engine `engine`-sträng |
|---|---|
| `-Kdot` | `'dot'` (också standardvärdet för `render` när `engine` utelämnas) |
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

Se [Layoutmotorer](/sv/guide/engines) för vad var och en gör och dess
överensstämmelseklass.

## `-T<format>` — utdataformatet

`renderSvg` hanterar bara SVG; använd `render(g, format, opts?)` för allt
annat. @knowvah/dot-engines union `OutputFormat` täcker dessa `-T`-mål:

| `-T`-värde | @knowvah/dot-engine `format`-sträng | Anmärkningar |
|---|---|---|
| `-Tsvg` | `'svg'` | också `renderSvg`s enda utdata |
| `-Tdot` | `'dot'` | DOT-källkod med tillagda layoutattribut (`pos`, `bb`, ...) |
| `-Txdot` | `'xdot'` | DOT + xdot-instruktioner i `_draw_`/`_ldraw_` |
| `-Tjson` | `'json'` | hela grafen som JSON |
| `-Tplain` | `'plain'` | blankstegsseparerad nod-/kantgeometri |
| `-Tplain-ext` | `'plain-ext'` | `plain`, plus portkoordinater på kanter |
| `-Timap` | `'imap'` | serversidig HTML-bildkarta |
| `-Tcmapx` | `'cmapx'` | klientsidigt HTML-element `<map>` |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Stöds inte:** rasterformat (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps` samt grafiska/interaktiva bakändar. Det här är en
avsiktlig omfattningsgräns — se [Kända avvikelser](/sv/divergences) för hela
listan över icke-mål. Behöver du ett rasterformat renderar du till `'svg'` och
konverterar i efterhand (en huvudlös webbläsare, `resvg` eller liknande).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — attribut

CLI:ts globala attributflaggor sätter ett standardvärde för varje graf, nod
och kant från kommandoraden. @knowvah/dot-engine har inga kommandoradsflaggor —
sätt samma attribut direkt i DOT-källkoden, eller via byggar-API:t om du
konstruerar grafen i kod:

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

Se [Bygg en graf i kod](/sv/guide/build-a-graph) för hela byggar-API:t.

## Geometri som CLI:t inte kan ge dig direkt

`-Tplain` finns just för att skript ska kunna skrapa nod- och kantkoordinater
ur textutdata. @knowvah/dot-engine hoppar över den omvägen: anropa
`getLayout(g)` efter `render` för att få en typad, JSON-serialiserbar
ögonblicksbild av varje nodposition, varje kantspline och den övergripande
begränsningsrutan — inget textformat att tolka.

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

Se [Läs beräknad geometri](/sv/guide/geometry) för ögonblicksbildens fullständiga
form och alternativet `yAxis` (inbyggda graphviz har y uppåt; webbläsare har y
nedåt).

## Teckensnitt och bilder: CLI:t läser ditt filsystem, @knowvah/dot-engine gör det inte

Inbyggda `dot` mäter text med de teckensnitt som råkar vara installerade på
maskinen och löser attributet `image="..."` genom att läsa filer relativt
arbetskatalogen. @knowvah/dot-engine har ingen åtkomst till filsystemet, så
båda injiceras av värdapplikationen i stället för att läsas från disk:

- **Textmätning** — `setTextMeasurer` installerar en `TextMeasurer`; om du
  inte anger någon väljer biblioteket automatiskt en rimlig standard
  (webbläsarens canvas, eller en deterministisk måttmodell i Node). Se
  [Textmätning](/sv/guide/text-measurement).
- **Bilder** — med `setImageSizer` (och `setImageResolver` för inbäddning)
  anger du själv bildernas inneboende mått och bilddata, eftersom
  @knowvah/dot-engine inte kan göra `stat` på en fil åt dig. Se
  [Arbeta med bilder](/sv/guide/images).

## Se även

- [Layoutmotorer](/sv/guide/engines)
- [Rendera till andra format](/sv/guide/render-formats)
- [Läs beräknad geometri](/sv/guide/geometry)
- [Kända avvikelser](/sv/divergences)
- [Kom igång](/sv/guide/getting-started)
