---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Üleminek käsurea tööriistalt `dot`

C-keelsed programmid `dot`/`neato`/`fdp`/... loevad `.dot`-faili (või stdin-i) ja
kirjutavad renderdatud faili (või stdout-i). @knowvah/dot-engine'il ei ole
failisüsteemi: see võtab sisse DOT-**sõne** ja tagastab renderdatud **sõne**
(või `getLayout`-iga tavalise JavaScripti geomeetriaobjekti sõne asemel, mida
peaksite alles parsima).

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

Ülaltoodud failide lugemine/kirjutamine on teie kood, mitte teegi oma —
@knowvah/dot-engine ei puuduta kunagi ketast. Just see võimaldab sel töötada
muutmata kujul ka brauseri vahekaardil, kus ei ole `input.dot`-i, mida lugeda.

## `-K<engine>` — paigutusmootor

`-K` valib paigutusmootori; @knowvah/dot-engine võtab sama nime argumendina
`engine` funktsioonile `renderSvg` või väljana `opts.engine` funktsioonile
`render`. Kõik kaheksa mootorit on portitud:

| `-K` väärtus | @knowvah/dot-engine `engine`-sõne |
|---|---|
| `-Kdot` | `'dot'` (ka `render`-i vaikeväärtus, kui `engine` on ära jäetud) |
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

Iga mootori ülesande ja selle vastavusklassi kohta vt
[Paigutusmootorid](/et/guide/engines).

## `-T<format>` — väljundvorming

`renderSvg` on ainult SVG jaoks; kõige muu jaoks kasutage `render(g, format,
opts?)`. @knowvah/dot-engine'i `OutputFormat`-liit katab need `-T` sihid:

| `-T` väärtus | @knowvah/dot-engine `format`-sõne | Märkused |
|---|---|---|
| `-Tsvg` | `'svg'` | ka `renderSvg`-i ainus väljund |
| `-Tdot` | `'dot'` | DOT-lähtekood lisatud paigutusatribuutidega (`pos`, `bb`, ...) |
| `-Txdot` | `'xdot'` | DOT + `_draw_`/`_ldraw_` xdot-käsud |
| `-Tjson` | `'json'` | kogu graaf JSON-ina |
| `-Tplain` | `'plain'` | tühikutega eraldatud sõlmede/servade geomeetria |
| `-Tplain-ext` | `'plain-ext'` | `plain`, lisaks portide koordinaadid servadel |
| `-Timap` | `'imap'` | serveripoolne HTML-pildikaart |
| `-Tcmapx` | `'cmapx'` | kliendipoolne HTML `<map>`-element |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Ei toetata:** rasterivormingud (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps` ning graafilised/interaktiivsed taustaprogrammid. Need on
tahtlik ulatuse piir — täieliku mitte-eesmärkide loendi leiate jaotisest
[Teadaolevad erinevused](/et/divergences). Kui vajate rasterpilti, renderdage
`'svg'`-ks ja teisendage järgmises etapis (peata brauser, `resvg` või midagi
sarnast).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — atribuudid

CLI globaalsed atribuudilipud määravad käsurealt vaikeväärtuse igale
graafile/sõlmele/servale. @knowvah/dot-engine'il käsurealippe ei ole — määrake
samad atribuudid otse DOT-lähtekoodis või koostaja API kaudu, kui koostate
graafi koodis:

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

Täieliku koostaja API kohta vt [Graafi koostamine koodis](/et/guide/build-a-graph).

## Geomeetria, mida CLI otse anda ei saa

`-Tplain` on olemas just selleks, et skriptid saaksid sõlmede/servade
koordinaate tekstiväljundist kraapida. @knowvah/dot-engine jätab selle ringi
vahele: kutsuge pärast `render`-it `getLayout(g)`, et saada tüübitud,
JSON-iks serialiseeritav hetktõmmis iga sõlme positsioonist, serva splainist ja
üldisest piirdekastist — parsida ei ole vaja ühtegi tekstivormingut.

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

Hetktõmmise täieliku kuju ja `yAxis` valiku (natiivne Graphviz on y-telg
ülespoole; brauserid on y-telg allapoole) leiate jaotisest
[Arvutatud geomeetria lugemine](/et/guide/geometry).

## Fondid ja pildid: CLI loeb teie failisüsteemi, @knowvah/dot-engine mitte

Natiivne `dot` mõõdab teksti masinasse installitud fontidega ja lahendab
atribuute `image="..."` failide lugemisega töökataloogi suhtes.
@knowvah/dot-engine'il failisüsteemi juurdepääsu ei ole, seega antakse mõlemad
kasutajarakenduse poolt ette, mitte ei loeta kettalt:

- **Teksti mõõtmine** — `setTextMeasurer` paigaldab `TextMeasurer`-i; teek
  valib mõistliku vaikeväärtuse automaatselt (brauseri canvas või
  deterministlik mõõdumudel Node'is), kui te seda ise ei määra. Vt
  [Teksti mõõtmine](/et/guide/text-measurement).
- **Pildid** — `setImageSizer` (ja `setImageResolver` sisseliitmiseks) lasevad
  teil ise anda piltide omasuurused ja pildiandmed, kuna @knowvah/dot-engine ei
  saa teie eest faili olekut pärida. Vt
  [Piltidega töötamine](/et/guide/images).

## Vt ka

- [Paigutusmootorid](/et/guide/engines)
- [Renderdamine teistesse vormingutesse](/et/guide/render-formats)
- [Arvutatud geomeetria lugemine](/et/guide/geometry)
- [Teadaolevad erinevused](/et/divergences)
- [Alustamine](/et/guide/getting-started)
