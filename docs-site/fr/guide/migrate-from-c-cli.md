---
sourceHash: 7638c760f4dc33297b8c499112956cda9094f2d9478dfb5e55ffa06926dea4fb
---

# Migrer depuis l’outil en ligne de commande `dot`

Les binaires C `dot`/`neato`/`fdp`/... lisent un fichier `.dot` (ou l’entrée
standard) et écrivent un fichier rendu (ou la sortie standard).
@knowvah/dot-engine n’a pas de système de fichiers : il prend en entrée une
**chaîne** DOT et renvoie en sortie une **chaîne** rendue (ou, avec
`getLayout`, un objet géométrique JavaScript ordinaire plutôt qu’une chaîne à
analyser).

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

Les lectures et écritures de fichiers ci-dessus relèvent de votre code, pas de
la bibliothèque : @knowvah/dot-engine ne touche jamais au disque. C’est aussi
ce qui lui permet de fonctionner tel quel dans un onglet de navigateur, où il
n’y a pas de `input.dot` à lire.

## `-K<engine>` — le moteur de disposition

`-K` sélectionne le moteur de disposition ; @knowvah/dot-engine reprend le même
nom comme argument `engine` de `renderSvg` ou comme champ `opts.engine` de
`render`. Les huit moteurs sont portés :

| Valeur de `-K` | Chaîne `engine` de @knowvah/dot-engine |
|---|---|
| `-Kdot` | `'dot'` (aussi la valeur par défaut de `render` quand `engine` est omis) |
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

Consultez [Moteurs de disposition](/fr/guide/engines) pour savoir ce que fait
chacun d’eux et sa classe de conformité.

## `-T<format>` — le format de sortie

`renderSvg` ne produit que du SVG ; utilisez `render(g, format, opts?)` pour
tout le reste. L’union `OutputFormat` de @knowvah/dot-engine couvre les cibles
`-T` suivantes :

| Valeur de `-T` | Chaîne `format` de @knowvah/dot-engine | Remarques |
|---|---|---|
| `-Tsvg` | `'svg'` | aussi la seule sortie de `renderSvg` |
| `-Tdot` | `'dot'` | source DOT avec attributs de disposition (`pos`, `bb`, ...) ajoutés |
| `-Txdot` | `'xdot'` | DOT + instructions xdot `_draw_`/`_ldraw_` |
| `-Tjson` | `'json'` | graphe complet en JSON |
| `-Tplain` | `'plain'` | géométrie des nœuds et arêtes séparée par des espaces |
| `-Tplain-ext` | `'plain-ext'` | `plain`, plus les coordonnées des ports sur les arêtes |
| `-Timap` | `'imap'` | carte-image HTML côté serveur |
| `-Tcmapx` | `'cmapx'` | élément HTML `<map>` côté client |

```ts
const svg = render(g, 'svg', { engine: 'dot' });
const json = render(g, 'json');
```

**Non pris en charge :** les formats matriciels (`-Tpng`, `-Tjpg`, `-Tgif`,
...), `-Tps`/`-Tpdf`/`-Teps` et les backends graphiques ou interactifs. Il
s’agit d’une limite de périmètre volontaire — consultez
[Divergences connues](/fr/divergences) pour la liste complète des non-objectifs.
Si vous avez besoin d’une image matricielle, rendez en `'svg'` puis convertissez
en aval (navigateur sans interface, `resvg` ou équivalent).

## `-Gname=val` / `-Nname=val` / `-Ename=val` — attributs

Les options d’attributs globaux de la CLI définissent une valeur par défaut
pour chaque graphe, nœud ou arête depuis la ligne de commande.
@knowvah/dot-engine n’a pas d’options en ligne de commande — définissez les
mêmes attributs directement dans la source DOT, ou via l’API de construction si
vous construisez le graphe en code :

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

Consultez [Construire un graphe en code](/fr/guide/build-a-graph) pour l’API de
construction complète.

## Obtenir une géométrie que la CLI ne fournit pas directement

`-Tplain` existe précisément pour que des scripts puissent extraire les
coordonnées des nœuds et des arêtes d’une sortie texte. @knowvah/dot-engine
évite cet aller-retour : appelez `getLayout(g)` après `render` pour obtenir un
instantané typé et sérialisable en JSON de la position de chaque nœud, de
chaque spline d’arête et de la boîte englobante globale — aucun format texte à
analyser.

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

Consultez [Lire la géométrie calculée](/fr/guide/geometry) pour la forme
complète de l’instantané et l’option `yAxis` (graphviz natif a l’axe y vers le
haut ; les navigateurs l’ont vers le bas).

## Polices et images : la CLI lit votre système de fichiers, pas @knowvah/dot-engine

Le `dot` natif mesure le texte avec les polices installées sur la machine et
résout les attributs `image="..."` en lisant des fichiers relatifs au
répertoire de travail. @knowvah/dot-engine n’a aucun accès au système de
fichiers : les deux sont donc injectés par l’application hôte au lieu d’être
lus sur le disque :

- **Mesure du texte** — `setTextMeasurer` installe un `TextMeasurer` ; la
  bibliothèque choisit automatiquement une valeur par défaut raisonnable (canvas
  du navigateur, ou modèle de métriques déterministe dans Node) si vous n’en
  définissez pas. Voir [Mesure du texte](/fr/guide/text-measurement).
- **Images** — `setImageSizer` (et `setImageResolver` pour l’incorporation)
  vous permettent de fournir vous-même les dimensions intrinsèques et les
  données des images, puisque @knowvah/dot-engine ne peut pas interroger un
  fichier à votre place. Voir [Travailler avec des images](/fr/guide/images).

## Voir aussi

- [Moteurs de disposition](/fr/guide/engines)
- [Rendu vers d’autres formats](/fr/guide/render-formats)
- [Lire la géométrie calculée](/fr/guide/geometry)
- [Divergences connues](/fr/divergences)
- [Premiers pas](/fr/guide/getting-started)
