---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Migrare dallo strumento a riga di comando `dot`

I binari C `dot`/`neato`/`fdp`/... leggono un file `.dot` (o lo standard input)
e scrivono un file renderizzato (o lo standard output). @knowvah/dot-engine non
ha un filesystem: prende in ingresso una **stringa** DOT e restituisce una
**stringa** renderizzata (oppure, con `getLayout`, un semplice oggetto
JavaScript con la geometria anziché una stringa da analizzare).

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

Le letture e scritture di file qui sopra sono codice tuo, non della libreria:
@knowvah/dot-engine non tocca mai il disco. È anche ciò che gli permette di
funzionare senza modifiche in una scheda del browser, dove non c'è alcun
`input.dot` da leggere.

## `-K<engine>`: il motore di layout

`-K` seleziona il motore di layout; @knowvah/dot-engine accetta lo stesso nome
come argomento `engine` di `renderSvg` o come campo `opts.engine` di `render`.
Tutti e otto i motori sono stati portati:

| Valore di `-K` | Stringa `engine` di @knowvah/dot-engine |
|---|---|
| `-Kdot` | `'dot'` (è anche il valore predefinito di `render` quando `engine` è omesso) |
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

Vedi [Motori di layout](/it/guide/engines) per cosa fa ciascuno e per la sua
classe di conformità.

## `-T<format>`: il formato di output

`renderSvg` produce solo SVG; usa `render(g, format, opts?)` per tutto il
resto. L'unione `OutputFormat` di @knowvah/dot-engine copre questi target `-T`:

| Valore di `-T` | Stringa `format` di @knowvah/dot-engine | Note |
|---|---|---|
| `-Tsvg` | `'svg'` | è anche l'unico output di `renderSvg` |
| `-Tdot` | `'dot'` | sorgente DOT con attributi di layout (`pos`, `bb`, ...) aggiunti |
| `-Txdot` | `'xdot'` | DOT + istruzioni xdot `_draw_`/`_ldraw_` |
| `-Tjson` | `'json'` | grafo completo in JSON |
| `-Tplain` | `'plain'` | geometria di nodi/archi separata da spazi |
| `-Tplain-ext` | `'plain-ext'` | `plain`, più le coordinate delle porte sugli archi |
| `-Timap` | `'imap'` | mappa immagine HTML lato server |
| `-Tcmapx` | `'cmapx'` | elemento HTML `<map>` lato client |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Non supportati:** i formati raster (`-Tpng`, `-Tjpg`, `-Tgif`, ...),
`-Tps`/`-Tpdf`/`-Teps` e i backend grafici/interattivi. Si tratta di un
confine di ambito voluto: vedi [Divergenze note](/it/divergences) per l'elenco
completo di ciò che non rientra negli obiettivi. Se ti serve un raster,
renderizza in `'svg'` e converti a valle (un browser headless, `resvg` o
simili).

## `-Gname=val` / `-Nname=val` / `-Ename=val`: gli attributi

I flag globali degli attributi della CLI impostano un valore predefinito per
ogni grafo/nodo/arco dalla riga di comando. @knowvah/dot-engine non ha flag da
riga di comando: imposta gli stessi attributi direttamente nel sorgente DOT, o
tramite l'API del builder se costruisci il grafo nel codice:

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

Vedi [Costruire un grafo nel codice](/it/guide/build-a-graph) per l'API
completa del builder.

## Ottenere la geometria che la CLI non può darti direttamente

`-Tplain` esiste proprio perché gli script possano estrarre le coordinate di
nodi e archi dall'output testuale. @knowvah/dot-engine salta il passaggio
intermedio: chiama `getLayout(g)` dopo `render` per ottenere un'istantanea
tipizzata e serializzabile in JSON di ogni posizione dei nodi, di ogni spline
degli archi e del riquadro di delimitazione complessivo, senza alcun formato
testuale da analizzare.

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

Vedi [Leggere la geometria calcolata](/it/guide/geometry) per la forma completa
dell'istantanea e l'opzione `yAxis` (Graphviz nativo ha y verso l'alto; i
browser hanno y verso il basso).

## Font e immagini: la CLI legge il tuo filesystem, @knowvah/dot-engine no

`dot` nativo misura il testo con i font installati sulla macchina e risolve gli
attributi `image="..."` leggendo file relativi alla directory di lavoro.
@knowvah/dot-engine non ha accesso al filesystem, quindi entrambe le cose
vengono iniettate dall'applicazione ospite anziché lette dal disco:

- **Misurazione del testo**: `setTextMeasurer` installa un `TextMeasurer`; se
  non ne imposti uno, la libreria ne sceglie automaticamente uno ragionevole
  (il canvas del browser, oppure un modello metrico deterministico in Node).
  Vedi [Misurazione del testo](/it/guide/text-measurement).
- **Immagini**: `setImageSizer` (e `setImageResolver` per l'incorporamento)
  permettono di fornire tu stesso le dimensioni intrinseche e i dati
  dell'immagine, dato che @knowvah/dot-engine non può eseguire lo stat di un
  file per tuo conto. Vedi [Lavorare con le immagini](/it/guide/images).

## Vedi anche

- [Motori di layout](/it/guide/engines)
- [Rendering in altri formati](/it/guide/render-formats)
- [Leggere la geometria calcolata](/it/guide/geometry)
- [Divergenze note](/it/divergences)
- [Primi passi](/it/guide/getting-started)
