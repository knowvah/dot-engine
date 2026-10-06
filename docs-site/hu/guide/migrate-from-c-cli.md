---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Átállás a `dot` parancssori eszközről

A C nyelvű `dot`/`neato`/`fdp`/... programok egy `.dot` fájlt (vagy a szabványos
bemenetet) olvasnak, és renderelt fájlt (vagy szabványos kimenetet) írnak. A
@knowvah/dot-engine nem használ fájlrendszert: DOT **sztringet** vesz be, és
renderelt **sztringet** ad vissza (vagy a `getLayout` esetén feldolgozandó
sztring helyett egy egyszerű JavaScript geometriaobjektumot).

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

A fenti fájlolvasás/-írás az Ön kódja, nem a könyvtáré — a @knowvah/dot-engine
soha nem nyúl a lemezhez. Ettől működik módosítás nélkül egy böngészőlapon is,
ahol nincs `input.dot` olvasnivaló.

## `-K<engine>` — az elrendezésmotor

A `-K` választja ki az elrendezésmotort; a @knowvah/dot-engine ugyanazt a nevet
várja a `renderSvg` `engine` argumentumaként vagy a `render` `opts.engine`
mezőjeként. Mind a nyolc motor portolva van:

| `-K` érték | @knowvah/dot-engine `engine` sztring |
|---|---|
| `-Kdot` | `'dot'` (a `render` alapértelmezése is, ha az `engine` elmarad) |
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

Hogy melyik motor mit csinál, és milyen megfelelőségi osztályba tartozik, azt
lásd az [Elrendezésmotorok](/hu/guide/engines) oldalon.

## `-T<format>` — a kimeneti formátum

A `renderSvg` csak SVG-t tud; minden máshoz használja a `render(g, format, opts?)`
függvényt. A @knowvah/dot-engine `OutputFormat` uniója ezeket a `-T` célokat fedi
le:

| `-T` érték | @knowvah/dot-engine `format` sztring | Megjegyzések |
|---|---|---|
| `-Tsvg` | `'svg'` | a `renderSvg` egyetlen kimenete is |
| `-Tdot` | `'dot'` | DOT-forráskód hozzáadott elrendezési attribútumokkal (`pos`, `bb`, ...) |
| `-Txdot` | `'xdot'` | DOT + `_draw_`/`_ldraw_` xdot utasítások |
| `-Tjson` | `'json'` | a teljes gráf JSON-ként |
| `-Tplain` | `'plain'` | szóközzel tagolt csúcs-/élgeometria |
| `-Tplain-ext` | `'plain-ext'` | `plain`, az éleknél portkoordinátákkal kiegészítve |
| `-Timap` | `'imap'` | kiszolgálóoldali HTML-képtérkép |
| `-Tcmapx` | `'cmapx'` | kliensoldali HTML `<map>` elem |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Nem támogatott:** a rasztergrafikus formátumok (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
a `-Tps`/`-Tpdf`/`-Teps`, valamint a grafikus/interaktív háttérrendszerek. Ez
szándékos hatókörhatár — a teljes nem-célok listáját lásd az
[Ismert eltérések](/hu/divergences) oldalon. Ha rasztergrafikára van szüksége,
renderelje `'svg'`-be, és alakítsa át a további lépésben (fej nélküli böngésző,
`resvg` vagy hasonló).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — attribútumok

A parancssori eszköz globális attribútum-kapcsolói a parancssorból állítanak be
alapértéket minden gráfra/csúcsra/élre. A @knowvah/dot-engine-nek nincsenek
parancssori kapcsolói — ugyanezeket az attribútumokat közvetlenül a DOT
forráskódban adja meg, vagy az építő API-n keresztül, ha a gráfot kódból
állítja elő:

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

A teljes építő-API-t lásd a [Gráf felépítése kódból](/hu/guide/build-a-graph)
oldalon.

## Geometria, amelyet a parancssori eszköz közvetlenül nem tud megadni

A `-Tplain` éppen azért létezik, hogy a szkriptek kikaparhassák a csúcs- és
élkoordinátákat a szöveges kimenetből. A @knowvah/dot-engine kihagyja ezt a
kerülőutat: hívja a `getLayout(g)` függvényt a `render` után, és típusos,
JSON-ba szerializálható pillanatképet kap minden csúcspozícióról, élsplineról és
a teljes befoglaló keretről — nincs feldolgozandó szövegformátum.

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

A pillanatkép teljes alakját és az `yAxis` opciót (a natív Graphviz y-tengelye
felfelé nő; a böngészőké lefelé) lásd [A kiszámított geometria kiolvasása](/hu/guide/geometry)
oldalon.

## Betűtípusok és képek: a parancssori eszköz a fájlrendszerét olvassa, a @knowvah/dot-engine nem

A natív `dot` a gépre telepített betűtípusokkal méri a szöveget, az
`image="..."` attribútumokat pedig a munkakönyvtárhoz viszonyított fájlok
olvasásával oldja fel. A @knowvah/dot-engine-nek nincs fájlrendszer-hozzáférése,
ezért mindkettőt a gazdaalkalmazás injektálja, nem a lemezről olvassa:

- **Szövegmérés** — a `setTextMeasurer` egy `TextMeasurer`-t telepít; ha nem
  állít be egyet, a könyvtár automatikusan értelmes alapértelmezést választ
  (böngészős canvas, vagy Node-ban determinisztikus metrikamodell). Lásd:
  [Szövegmérés](/hu/guide/text-measurement).
- **Képek** — a `setImageSizer` (és a beágyazáshoz a `setImageResolver`) lehetővé
  teszi, hogy Ön adja meg a kép belső méreteit és a képadatokat, mivel a
  @knowvah/dot-engine nem tud az Ön nevében fájlt lekérdezni. Lásd:
  [Munka képekkel](/hu/guide/images).

## Lásd még

- [Elrendezésmotorok](/hu/guide/engines)
- [Renderelés más formátumokba](/hu/guide/render-formats)
- [A kiszámított geometria kiolvasása](/hu/guide/geometry)
- [Ismert eltérések](/hu/divergences)
- [Első lépések](/hu/guide/getting-started)
