---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Migrarea de la instrumentul din linia de comandă `dot`

Binarele C `dot`/`neato`/`fdp`/... citesc un fișier `.dot` (sau stdin) și
scriu un fișier randat (sau stdout). @knowvah/dot-engine nu are sistem de
fișiere: primește un **șir** DOT la intrare și returnează un **șir** randat la
ieșire (sau, cu `getLayout`, un obiect JavaScript de geometrie obișnuit, în
loc de un șir de analizat).

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

Citirile/scrierile de fișiere de mai sus sunt codul dumneavoastră, nu al
bibliotecii — @knowvah/dot-engine nu atinge niciodată discul. Tocmai de aceea
funcționează nemodificat într-o filă de browser, unde nu există un
`input.dot` de citit.

## `-K<engine>` — motorul de aranjare

`-K` selectează motorul de aranjare; @knowvah/dot-engine primește același nume
ca argumentul `engine` al lui `renderSvg` sau câmpul `opts.engine` al lui
`render`. Toate cele opt motoare sunt portate:

| Valoarea `-K` | Șirul `engine` din @knowvah/dot-engine |
|---|---|
| `-Kdot` | `'dot'` (și valoarea implicită pentru `render` când `engine` este omis) |
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

Consultați [Motoare de aranjare](/ro/guide/engines) pentru ce face fiecare și
pentru clasa sa de conformitate.

## `-T<format>` — formatul de ieșire

`renderSvg` produce doar SVG; folosiți `render(g, format, opts?)` pentru orice
altceva. Uniunea `OutputFormat` din @knowvah/dot-engine acoperă aceste ținte
`-T`:

| Valoarea `-T` | Șirul `format` din @knowvah/dot-engine | Note |
|---|---|---|
| `-Tsvg` | `'svg'` | și singura ieșire a lui `renderSvg` |
| `-Tdot` | `'dot'` | cod DOT cu atribute de aranjare (`pos`, `bb`, ...) adăugate |
| `-Txdot` | `'xdot'` | DOT + instrucțiuni xdot `_draw_`/`_ldraw_` |
| `-Tjson` | `'json'` | graful complet ca JSON |
| `-Tplain` | `'plain'` | geometria nodurilor/muchiilor separată prin spații |
| `-Tplain-ext` | `'plain-ext'` | `plain`, plus coordonatele porturilor pe muchii |
| `-Timap` | `'imap'` | hartă de imagine HTML pe partea de server |
| `-Tcmapx` | `'cmapx'` | element HTML `<map>` pe partea de client |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Neacceptate:** formatele raster (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps` și backend-urile grafice/interactive. Acestea sunt o
limită de domeniu deliberată — lista completă a neobiectivelor o găsiți la
[Divergențe cunoscute](/ro/divergences). Dacă aveți nevoie de un raster,
randați în `'svg'` și convertiți ulterior (un browser fără interfață, `resvg`
sau similar).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — atribute

Opțiunile globale de atribute ale CLI-ului setează o valoare implicită pentru
fiecare graf/nod/muchie din linia de comandă. @knowvah/dot-engine nu are
opțiuni de linie de comandă — setați aceleași atribute direct în codul DOT sau
prin API-ul de construire, dacă construiți graful în cod:

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

Consultați [Construirea unui graf în cod](/ro/guide/build-a-graph) pentru
API-ul complet de construire.

## Geometrie pe care CLI-ul nu v-o poate oferi direct

`-Tplain` există tocmai pentru ca scripturile să poată extrage coordonatele
nodurilor/muchiilor din ieșirea text. @knowvah/dot-engine elimină acest
ocol: apelați `getLayout(g)` după `render` pentru a obține o instantanee
tipizată, serializabilă în JSON, a poziției fiecărui nod, a fiecărui spline de
muchie și a casetei de încadrare generale — fără un format text de analizat.

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

Consultați [Citirea geometriei calculate](/ro/guide/geometry) pentru forma
completă a instantaneei și opțiunea `yAxis` (graphviz nativ are axa y în sus;
browserele o au în jos).

## Fonturi și imagini: CLI-ul citește sistemul dumneavoastră de fișiere, @knowvah/dot-engine nu

`dot` nativ măsoară textul cu fonturile instalate pe mașină și rezolvă
atributele `image="..."` citind fișiere relativ la directorul de lucru.
@knowvah/dot-engine nu are acces la sistemul de fișiere, așa că ambele sunt
injectate de aplicația gazdă, nu citite de pe disc:

- **Măsurarea textului** — `setTextMeasurer` instalează un `TextMeasurer`;
  biblioteca alege automat o valoare implicită rezonabilă (canvas-ul
  browserului sau un model determinist de metrici în Node) dacă nu setați
  niciuna. Consultați [Măsurarea textului](/ro/guide/text-measurement).
- **Imagini** — `setImageSizer` (și `setImageResolver` pentru inserare directă)
  vă permit să furnizați dumneavoastră dimensiunile intrinseci ale imaginilor
  și datele imaginilor, deoarece @knowvah/dot-engine nu poate interoga un
  fișier în numele dumneavoastră. Consultați [Lucrul cu imagini](/ro/guide/images).

## Vedeți și

- [Motoare de aranjare](/ro/guide/engines)
- [Randare în alte formate](/ro/guide/render-formats)
- [Citirea geometriei calculate](/ro/guide/geometry)
- [Divergențe cunoscute](/ro/divergences)
- [Primii pași](/ro/guide/getting-started)
