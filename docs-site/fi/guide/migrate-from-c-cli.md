---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Siirtyminen `dot`-komentorivityökalusta

C-kielinen `dot`/`neato`/`fdp`/... -binääri lukee `.dot`-tiedoston (tai
stdinin) ja kirjoittaa renderöidyn tiedoston (tai stdoutin).
@knowvah/dot-engine:llä ei ole tiedostojärjestelmää: se ottaa sisään DOT-
**merkkijonon** ja palauttaa renderöidyn **merkkijonon** (tai, `getLayout`-
funktiolla, tavallisen JavaScript-geometriaolion jäsennettävän merkkijonon
sijaan).

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

Yllä olevat tiedostojen luku- ja kirjoituskutsut ovat sinun koodiasi, eivät
kirjaston — @knowvah/dot-engine ei koske levyyn koskaan. Se on myös syy,
miksi se toimii sellaisenaan selaimen välilehdessä, jossa ei ole
`input.dot`-tiedostoa luettavaksi.

## `-K<engine>` — asettelumoottori

`-K` valitsee asettelumoottorin; @knowvah/dot-engine ottaa saman nimen
`renderSvg`-funktion `engine`-argumenttina tai `render`-funktion
`opts.engine`-kenttänä. Kaikki kahdeksan moottoria on portattu:

| `-K`-arvo | @knowvah/dot-engine `engine`-merkkijono |
|---|---|
| `-Kdot` | `'dot'` (myös `render`-funktion oletus, kun `engine` jätetään pois) |
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

Katso sivulta [Asettelumoottorit](/fi/guide/engines), mitä kukin niistä tekee
ja mikä on sen yhdenmukaisuusluokka.

## `-T<format>` — tulostemuoto

`renderSvg` tuottaa vain SVG:tä; käytä `render(g, format, opts?)`-funktiota
kaikkeen muuhun. @knowvah/dot-engine:n `OutputFormat`-unioni kattaa nämä
`-T`-kohteet:

| `-T`-arvo | @knowvah/dot-engine `format`-merkkijono | Huomautuksia |
|---|---|---|
| `-Tsvg` | `'svg'` | myös `renderSvg`-funktion ainoa tuloste |
| `-Tdot` | `'dot'` | DOT-lähdekoodi, johon on lisätty asettelun attribuutit (`pos`, `bb`, ...) |
| `-Txdot` | `'xdot'` | DOT + `_draw_`/`_ldraw_`-xdot-käskyt |
| `-Tjson` | `'json'` | koko graafi JSON-muodossa |
| `-Tplain` | `'plain'` | välilyönnein erotettu solmujen/kaarten geometria |
| `-Tplain-ext` | `'plain-ext'` | `plain` sekä kaarten porttikoordinaatit |
| `-Timap` | `'imap'` | palvelinpuolen HTML-kuvakartta |
| `-Tcmapx` | `'cmapx'` | asiakaspuolen HTML-`<map>`-elementti |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Ei tuettu:** rasterimuodot (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps` sekä graafiset/interaktiiviset taustajärjestelmät.
Nämä ovat tietoinen rajaus — täydellinen tavoitteiden ulkopuolisten asioiden
luettelo on sivulla [Tunnetut poikkeamat](/fi/divergences). Jos tarvitset
rasterikuvan, renderöi muotoon `'svg'` ja muunna se jatkokäsittelyssä
(päätön selain, `resvg` tai vastaava).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — attribuutit

Komentorivin globaalit attribuuttilipukkeet asettavat oletusarvon jokaiselle
graafille/solmulle/kaarelle komentoriviltä. @knowvah/dot-engine:llä ei ole
komentorivilippuja — aseta samat attribuutit suoraan DOT-lähdekoodissa tai
rakentajan API:lla, jos rakennat graafin koodissa:

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

Täysi rakentajan API on sivulla [Graafin rakentaminen koodissa](/fi/guide/build-a-graph).

## Geometria, jota komentorivi ei anna suoraan

`-Tplain` on olemassa juuri sitä varten, että skriptit voivat kaapia solmujen
ja kaarten koordinaatit tekstitulosteesta. @knowvah/dot-engine ohittaa tämän
kierroksen: kutsu `getLayout(g)` `render`-funktion jälkeen, niin saat
tyypitetyn, JSON-serialisoitavan tilannekuvan jokaisen solmun sijainnista,
kaaren splinestä ja kokonaisrajauslaatikosta — ei tekstimuotoa jäsennettäväksi.

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

Täysi tilannekuvan muoto ja `yAxis`-valitsin (natiivi graphviz on y-ylös;
selaimet ovat y-alas) ovat sivulla [Lasketun geometrian lukeminen](/fi/guide/geometry).

## Fontit ja kuvat: komentorivi lukee tiedostojärjestelmääsi, @knowvah/dot-engine ei

Natiivi `dot` mittaa tekstin millä tahansa koneelle asennetuilla fonteilla ja
ratkaisee `image="..."`-attribuutit lukemalla tiedostoja suhteessa työhakemistoon.
@knowvah/dot-engine:llä ei ole pääsyä tiedostojärjestelmään, joten molemmat
syötetään isäntäsovelluksesta sen sijaan, että ne luettaisiin levyltä:

- **Tekstin mittaus** — `setTextMeasurer` asentaa `TextMeasurer`-olion;
  kirjasto valitsee järkevän oletuksen automaattisesti (selaimen canvas tai
  deterministinen metriikkamalli Nodessa), jos et aseta sellaista. Katso
  [Tekstin mittaus](/fi/guide/text-measurement).
- **Kuvat** — `setImageSizer` (ja `setImageResolver` upottamista varten)
  antavat sinun toimittaa kuvan luontaiset mitat ja kuvadatan itse, koska
  @knowvah/dot-engine ei voi tarkistaa tiedostoa puolestasi. Katso
  [Kuvien käyttö](/fi/guide/images).

## Katso myös

- [Asettelumoottorit](/fi/guide/engines)
- [Renderöinti muihin muotoihin](/fi/guide/render-formats)
- [Lasketun geometrian lukeminen](/fi/guide/geometry)
- [Tunnetut poikkeamat](/fi/divergences)
- [Aloitus](/fi/guide/getting-started)
