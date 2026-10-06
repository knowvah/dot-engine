---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Flutningur frá skipanalínuverkfærinu `dot`

C-keyrsluskrárnar `dot`/`neato`/`fdp`/... lesa `.dot`-skrá (eða stdin) og skrifa
teiknaða skrá (eða stdout). @knowvah/dot-engine hefur ekkert skráarkerfi: það
tekur við DOT-**streng** og skilar teiknuðum **streng** (eða, með `getLayout`,
venjulegum JavaScript-rúmfræðihlut í stað strengs sem þarf að þátta).

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

Skráarlestur og -skrif hér að ofan eru þinn kóði, ekki bókasafnsins —
@knowvah/dot-engine snertir aldrei diskinn. Það er líka ástæðan fyrir því að það
virkar óbreytt í vafraflipa þar sem engin `input.dot` er til að lesa.

## `-K<engine>` — uppsetningarvélin

`-K` velur uppsetningarvél; @knowvah/dot-engine tekur sama heiti sem
`engine`-röksemd í `renderSvg` eða `opts.engine`-reitinn í `render`. Allar
átta vélarnar eru yfirfærðar:

| `-K`-gildi | `engine`-strengur í @knowvah/dot-engine |
|---|---|
| `-Kdot` | `'dot'` (einnig sjálfgildi `render` þegar `engine` er sleppt) |
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

Sjá [Uppsetningarvélar](/is/guide/engines) fyrir hlutverk hverrar þeirra og
samræmisflokk.

## `-T<format>` — úttakssniðið

`renderSvg` býður aðeins SVG; notaðu `render(g, format, opts?)` fyrir allt annað.
`OutputFormat`-sambandið í @knowvah/dot-engine nær yfir þessi `-T`-markmið:

| `-T`-gildi | `format`-strengur í @knowvah/dot-engine | Athugasemdir |
|---|---|---|
| `-Tsvg` | `'svg'` | einnig eina úttak `renderSvg` |
| `-Tdot` | `'dot'` | DOT-frumkóði með uppsetningareigindum (`pos`, `bb`, ...) bættum við |
| `-Txdot` | `'xdot'` | DOT + `_draw_`/`_ldraw_` xdot-fyrirmæli |
| `-Tjson` | `'json'` | allt grafið sem JSON |
| `-Tplain` | `'plain'` | rúmfræði hnúta/leggja aðgreind með bilum |
| `-Tplain-ext` | `'plain-ext'` | `plain`, auk port-hnita á leggjum |
| `-Timap` | `'imap'` | HTML-myndakort á þjónshlið |
| `-Tcmapx` | `'cmapx'` | HTML `<map>`-stak á biðlarahlið |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Ekki stutt:** rastasnið (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps` og myndrænir/gagnvirkir bakendar. Þetta eru
vísvitandi mörk umfangs — sjá [Þekkt frávik](/is/divergences) fyrir
fullan lista yfir það sem er ekki markmið. Ef þú þarft rastamynd skaltu teikna á
`'svg'` og umbreyta síðar í ferlinu (haus-laus vafri, `resvg` eða álíka).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — eigindi

Altæku eigindarofar skipanalínunnar setja sjálfgildi á hvert graf/hnút/legg frá
skipanalínunni. @knowvah/dot-engine hefur enga skipanalínurofa — settu sömu
eigindi beint í DOT-frumkóðann, eða í gegnum smiðs-API ef þú smíðar grafið
í kóða:

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

Sjá [Smíða graf í kóða](/is/guide/build-a-graph) fyrir allt smiðs-API.

## Rúmfræði sem skipanalínan getur ekki gefið beint

`-Tplain` er til einmitt svo skript geti skrapað hnita hnúta/leggja úr
textaúttaki. @knowvah/dot-engine sleppir þessari hringferð: kallaðu á `getLayout(g)` eftir
`render` til að fá tegundað, JSON-raðgeranlegt skyndimynd af staðsetningu hvers hnúts,
splínu hvers leggs og heildarafmörkunarkassanum — ekkert textasnið til að þátta.

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

Sjá [Lesa reiknaða rúmfræði](/is/guide/geometry) fyrir fulla lögun skyndimyndarinnar og
`yAxis`-valkostinn (upprunalegt graphviz er y-upp; vafrar eru y-niður).

## Letur og myndir: skipanalínan les skráarkerfið þitt, @knowvah/dot-engine gerir það ekki

Upprunalegt `dot` mælir texta með þeim leturgerðum sem eru uppsettar á vélinni
og leysir `image="..."`-eigindi upp með því að lesa skrár miðað við
vinnumöppuna. @knowvah/dot-engine hefur engan aðgang að skráarkerfinu, svo hvort
tveggja er sprautað inn af hýsilforritinu í stað þess að vera lesið af diski:

- **Textamæling** — `setTextMeasurer` setur upp `TextMeasurer`; bókasafnið
  velur sjálfkrafa skynsamlegt sjálfgildi (canvas í vafra, eða ákvarðandi
  mælilíkan í Node) ef þú stillir ekkert. Sjá
  [Textamæling](/is/guide/text-measurement).
- **Myndir** — `setImageSizer` (og `setImageResolver` fyrir innfellingu) láta þig
  leggja til náttúrulega myndastærð og myndagögn sjálf(ur), þar sem
  @knowvah/dot-engine getur ekki kannað skrá fyrir þína hönd. Sjá
  [Unnið með myndir](/is/guide/images).

## Sjá einnig

- [Uppsetningarvélar](/is/guide/engines)
- [Teikna á önnur snið](/is/guide/render-formats)
- [Lesa reiknaða rúmfræði](/is/guide/geometry)
- [Þekkt frávik](/is/divergences)
- [Fyrstu skref](/is/guide/getting-started)
