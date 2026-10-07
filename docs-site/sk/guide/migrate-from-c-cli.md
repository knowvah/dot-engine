---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Migrácia z nástroja `dot` v príkazovom riadku

Binárky `dot`/`neato`/`fdp`/... v jazyku C čítajú súbor `.dot` (alebo stdin)
a zapisujú vykreslený súbor (alebo stdout). @knowvah/dot-engine nemá súborový
systém: na vstupe prijíma **reťazec** DOT a na výstupe vracia vykreslený
**reťazec** (alebo, pri `getLayout`, obyčajný objekt JavaScript s geometriou
namiesto reťazca, ktorý by ste museli spracúvať).

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

Čítanie a zápis súborov vyššie je váš kód, nie kód knižnice — @knowvah/dot-engine
sa disku nikdy nedotkne. Vďaka tomu funguje bez úprav aj v karte prehliadača,
kde nie je žiadny `input.dot`, ktorý by sa dal čítať.

## `-K<engine>` — modul rozloženia

`-K` vyberá modul rozloženia; @knowvah/dot-engine preberá rovnaký názov ako
argument `engine` funkcie `renderSvg` alebo pole `opts.engine` funkcie
`render`. Portovaných je všetkých osem modulov:

| Hodnota `-K` | Reťazec `engine` v @knowvah/dot-engine |
|---|---|
| `-Kdot` | `'dot'` (je to aj predvolená hodnota pre `render`, keď `engine` chýba) |
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

Čo každý z nich robí a do akej triedy zhody patrí, nájdete v časti
[Moduly rozloženia](/sk/guide/engines).

## `-T<format>` — výstupný formát

`renderSvg` je iba pre SVG; na čokoľvek iné použite `render(g, format, opts?)`.
Zjednotený typ `OutputFormat` v @knowvah/dot-engine pokrýva tieto ciele `-T`:

| Hodnota `-T` | Reťazec `format` v @knowvah/dot-engine | Poznámky |
|---|---|---|
| `-Tsvg` | `'svg'` | je to aj jediný výstup `renderSvg` |
| `-Tdot` | `'dot'` | zdrojový kód DOT s pridanými atribútmi rozloženia (`pos`, `bb`, ...) |
| `-Txdot` | `'xdot'` | DOT + inštrukcie xdot `_draw_`/`_ldraw_` |
| `-Tjson` | `'json'` | celý graf ako JSON |
| `-Tplain` | `'plain'` | geometria uzlov a hrán oddelená medzerami |
| `-Tplain-ext` | `'plain-ext'` | `plain`, plus súradnice portov na hranách |
| `-Timap` | `'imap'` | serverová HTML mapa obrázka |
| `-Tcmapx` | `'cmapx'` | klientsky HTML element `<map>` |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Nepodporované:** rastrové formáty (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps` a grafické/interaktívne backendy. Ide o zámernú hranicu
rozsahu — úplný zoznam necieľov nájdete v časti
[Známe odchýlky](/sk/divergences). Ak potrebujete raster, vykreslite do
`'svg'` a skonvertujte ho neskôr (bezhlavý prehliadač, `resvg` alebo
podobný nástroj).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — atribúty

Globálne prepínače atribútov v CLI nastavujú predvolenú hodnotu pre každý
graf/uzol/hranu z príkazového riadka. @knowvah/dot-engine nemá žiadne prepínače
príkazového riadka — rovnaké atribúty nastavte priamo v zdrojovom kóde DOT
alebo cez API buildera, ak graf zostavujete v kóde:

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

Úplné API buildera nájdete v časti [Zostavenie grafu v kóde](/sk/guide/build-a-graph).

## Získanie geometrie, ktorú vám CLI priamo neposkytne

`-Tplain` existuje práve preto, aby skripty mohli z textového výstupu vyberať
súradnice uzlov a hrán. @knowvah/dot-engine tento obchádzkový krok vynecháva:
po `render` zavolajte `getLayout(g)` a získate typovanú snímku
serializovateľnú do JSON s polohou každého uzla, splinom každej hrany
a celkovým ohraničujúcim rámcom — nie je potrebné spracúvať žiadny textový
formát.

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

Úplný tvar snímky a možnosť `yAxis` (natívny Graphviz má os y nahor,
prehliadače nadol) nájdete v časti
[Čítanie vypočítanej geometrie](/sk/guide/geometry).

## Písma a obrázky: CLI číta váš súborový systém, @knowvah/dot-engine nie

Natívny `dot` meria text pomocou akýchkoľvek písiem nainštalovaných v počítači
a atribúty `image="..."` rieši čítaním súborov relatívne k pracovnému
adresáru. @knowvah/dot-engine nemá prístup k súborovému systému, takže obe
veci dodáva hostiteľská aplikácia namiesto čítania z disku:

- **Meranie textu** — `setTextMeasurer` nainštaluje `TextMeasurer`; ak žiadny
  nenastavíte, knižnica si automaticky zvolí rozumnú predvolenú možnosť
  (canvas prehliadača alebo deterministický model metrík v Node). Pozrite
  [Meranie textu](/sk/guide/text-measurement).
- **Obrázky** — `setImageSizer` (a `setImageResolver` na vkladanie) vám
  umožňujú dodať vlastné vnútorné rozmery obrázkov a údaje obrázkov, pretože
  @knowvah/dot-engine nemôže za vás zistiť informácie o súbore. Pozrite
  [Práca s obrázkami](/sk/guide/images).

## Pozrite aj

- [Moduly rozloženia](/sk/guide/engines)
- [Vykreslenie do iných formátov](/sk/guide/render-formats)
- [Čítanie vypočítanej geometrie](/sk/guide/geometry)
- [Známe odchýlky](/sk/divergences)
- [Začíname](/sk/guide/getting-started)
