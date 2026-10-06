---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Migrace z nástroje příkazové řádky `dot`

Binárky C `dot`/`neato`/`fdp`/... čtou soubor `.dot` (nebo stdin) a zapisují
vykreslený soubor (nebo stdout). @knowvah/dot-engine nemá souborový systém:
přijímá **řetězec** DOT a vrací vykreslený **řetězec** (nebo, s `getLayout`,
prostý objekt JavaScriptu s geometrií místo řetězce ke zpracování).

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

Čtení a zápis souborů výše je váš kód, nikoli knihovny — @knowvah/dot-engine
se disku nikdy nedotýká. Právě proto funguje beze změn i v záložce prohlížeče,
kde žádný `input.dot` ke čtení není.

## `-K<engine>` — modul rozvržení

`-K` volí modul rozvržení; @knowvah/dot-engine přebírá stejný název jako
argument `engine` funkce `renderSvg` nebo pole `opts.engine` funkce `render`.
Všech osm modulů je portováno:

| Hodnota `-K` | Řetězec `engine` v @knowvah/dot-engine |
|---|---|
| `-Kdot` | `'dot'` (také výchozí hodnota pro `render`, když `engine` chybí) |
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

Co který modul dělá a do jaké třídy shody patří, najdete v části
[Moduly rozvržení](/cs/guide/engines).

## `-T<format>` — výstupní formát

`renderSvg` umí jen SVG; pro cokoli jiného použijte `render(g, format, opts?)`.
Sjednocení `OutputFormat` v @knowvah/dot-engine pokrývá tyto cíle `-T`:

| Hodnota `-T` | Řetězec `format` v @knowvah/dot-engine | Poznámky |
|---|---|---|
| `-Tsvg` | `'svg'` | také jediný výstup `renderSvg` |
| `-Tdot` | `'dot'` | zdrojový kód DOT s doplněnými atributy rozvržení (`pos`, `bb`, ...) |
| `-Txdot` | `'xdot'` | DOT + instrukce xdot `_draw_`/`_ldraw_` |
| `-Tjson` | `'json'` | celý graf jako JSON |
| `-Tplain` | `'plain'` | geometrie uzlů a hran oddělená mezerami |
| `-Tplain-ext` | `'plain-ext'` | `plain` plus souřadnice portů na hranách |
| `-Timap` | `'imap'` | serverová HTML mapa obrázku |
| `-Tcmapx` | `'cmapx'` | klientský HTML element `<map>` |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Nepodporováno:** rastrové formáty (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps` a grafické/interaktivní backendy. Jde o záměrnou hranici
rozsahu — úplný seznam necílů viz [Známé odchylky](/cs/divergences). Pokud
potřebujete rastr, vykreslete do `'svg'` a převeďte jej následně (bezhlavý
prohlížeč, `resvg` nebo podobně).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — atributy

Globální příznaky atributů v CLI nastavují výchozí hodnotu pro každý graf, uzel
či hranu z příkazové řádky. @knowvah/dot-engine žádné příznaky příkazové řádky
nemá — stejné atributy nastavte přímo ve zdrojovém kódu DOT, nebo přes API
builderu, pokud graf sestavujete v kódu:

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

Úplné API builderu najdete v části [Sestavení grafu v kódu](/cs/guide/build-a-graph).

## Geometrie, kterou vám CLI přímo nedá

`-Tplain` existuje právě proto, aby skripty mohly z textového výstupu vyčítat
souřadnice uzlů a hran. @knowvah/dot-engine tento oklikou přeskakuje: po
`render` zavolejte `getLayout(g)` a získáte typovaný snímek každé pozice uzlu,
každého splinu hrany a celkového ohraničujícího rámečku, serializovatelný do
JSON — žádný textový formát ke zpracování.

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

Úplný tvar snímku a volbu `yAxis` (nativní Graphviz má osu y nahoru, prohlížeče
dolů) popisuje [Čtení vypočtené geometrie](/cs/guide/geometry).

## Písma a obrázky: CLI čte váš souborový systém, @knowvah/dot-engine ne

Nativní `dot` měří text libovolnými písmy nainstalovanými na počítači a atributy
`image="..."` řeší čtením souborů relativně k pracovnímu adresáři.
@knowvah/dot-engine nemá přístup k souborovému systému, takže obojí dodává
hostitelská aplikace, místo aby se to četlo z disku:

- **Měření textu** — `setTextMeasurer` nainstaluje `TextMeasurer`; pokud žádný
  nenastavíte, knihovna automaticky zvolí rozumnou výchozí variantu (canvas
  prohlížeče, nebo deterministický metrický model v Node). Viz
  [Měření textu](/cs/guide/text-measurement).
- **Obrázky** — `setImageSizer` (a `setImageResolver` pro vložení) vám umožní
  dodat vlastní rozměry a data obrázků, protože @knowvah/dot-engine nemůže
  zjistit informace o souboru vaším jménem. Viz
  [Práce s obrázky](/cs/guide/images).

## Viz také

- [Moduly rozvržení](/cs/guide/engines)
- [Vykreslení do jiných formátů](/cs/guide/render-formats)
- [Čtení vypočtené geometrie](/cs/guide/geometry)
- [Známé odchylky](/cs/divergences)
- [Začínáme](/cs/guide/getting-started)
