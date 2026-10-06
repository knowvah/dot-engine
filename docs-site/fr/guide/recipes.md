---
sourceHash: 3d15763baac8b6d86c1f835e1c633c2b13aba787da3d897db25cb3038b8e2d78
---

# Recettes

Des extraits orientés tâches pour les parties du chemin construction →
disposition → lecture de la géométrie qui ne sont pas évidentes à la seule
lecture de la référence de l’API. Chaque recette est un exemple minimal et
exécutable qui n’utilise que la surface publique `@knowvah/dot-engine` /
`@knowvah/dot-engine/api` / `@knowvah/dot-engine/render` — aucune classe de
modèle interne. Voir `/guide/api` pour la liste complète des points d’entrée
dont ces extraits sont tirés.

## 1. Construire un graphe en code et le rendre

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client', { shape: 'box' });
b.addNode('server', { shape: 'box' });
b.addEdge('client', 'server', { label: 'HTTP GET' });

const svg = render(b.graph, 'svg');
```

**Pourquoi :** `createGraph` vous donne un constructeur lorsque la structure de
votre graphe provient de données applicatives plutôt que d’une chaîne DOT
statique ; `render` dispose le graphe et le sérialise en un seul appel.
L’API complète du constructeur (sous-graphes, attributs, comparaison avec
`parse`) se trouve dans `/guide/build-a-graph`.

## 2. Disposer sans rendre, puis lire la géométrie

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

// render() triggers layout as a side effect and leaves the computed
// geometry on the graph. Call it (or the lower-level ctx.layout) BEFORE
// getLayout(), even if you don't need render()'s return value.
render(b.graph, 'svg');

const layout = getLayout(b.graph);
for (const n of layout.nodes) {
  console.log(n.name, n.x, n.y, n.width, n.height);
}
```

**Pourquoi :** `getLayout` est un simple lecteur de géométrie déjà calculée —
il n’exécute pas lui-même la disposition. Si vous l’appelez avant qu’une
disposition ait été exécutée, il lève une `Error` avec le `code`
`ERR_INVALID_STATE` (« getLayout requires a laid-out graph » ; voir
[Erreurs et exceptions](/fr/guide/errors)) plutôt que de renvoyer des
coordonnées périmées ou nulles. Si vous n’avez besoin que de la géométrie et
jamais de la chaîne rendue, ignorez la valeur de retour de `render` — l’effet
de bord de disposition est ce que vous payez réellement.

## 3. Choisir l’axe y pour votre moteur de rendu

```ts
import { getLayout } from '@knowvah/dot-engine';

// Screen/canvas/SVG convention: origin top-left, y increases downward.
const screenLayout = getLayout(g);

// Native graphviz convention: origin bottom-left, y increases upward.
const nativeLayout = getLayout(g, { yAxis: 'up' });
```

**Pourquoi :** graphviz calcule la disposition dans un repère où y est orienté
vers le haut ; la plupart des consommateurs (canvas, DOM, SVG dans le
navigateur) veulent y vers le bas. `getLayout` utilise `'down'` par défaut, si
bien que la plupart des appelants n’ont jamais besoin de l’option. Voir
`/guide/geometry` pour la formule exacte d’inversion et la façon dont `bounds`
diffère entre les deux modes.

## 4. Concilier le repère SVG de `render()` avec celui de `getLayout()`

`render(g, 'svg')` et `getLayout(g)` décrivent le *même* graphe disposé mais
dans des repères différents, et la différence ne se réduit pas à l’inversion
de l’axe y : l’émetteur SVG de `render` change le signe de chaque coordonnée y
avant d’écrire une primitive de forme, puis enveloppe tout le dessin dans un
unique `<g transform="scale(..)
rotate(..) translate(tx,ty)">` qui intègre le remplissage de page de graphviz,
la marge et toute mise à l’échelle ou rotation due à `size=`. `getLayout`
ignore tout cela — il renvoie des coordonnées de modèle normalisées avec une
origine en `(0, 0)` et aucune géométrie de page.

Pour un appel donné à `render()`, les deux repères diffèrent d’une seule
translation constante. Plutôt que de redériver la formule de mise en page de
GVC, déduisez le décalage empiriquement à partir d’un nœud dont vous
connaissez les positions dans les deux repères :

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('start');
b.addNode('end');
b.addEdge('start', 'end');

const svg = render(b.graph, 'svg');
const layout = getLayout(b.graph);

/** Bounding-box center of a `<g id="nodeN" class="node">` block's own
 *  `<polygon points="...">`, keyed by the node name in its `<title>`. */
function svgNodeCenter(svg: string, name: string): { x: number; y: number } | undefined {
  const block = new RegExp(
    `<g id="node\\d+" class="node">\\s*<title>${name}</title>([\\s\\S]*?)</g>`,
  ).exec(svg)?.[1];
  const pts = block !== undefined ? /points="([^"]+)"/.exec(block)?.[1] : undefined;
  if (pts === undefined) return undefined;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const pair of pts.trim().split(/\s+/)) {
    const [x, y] = pair.split(',').map(Number);
    xs.push(x ?? 0);
    ys.push(y ?? 0);
  }
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

const anchor = layout.nodes[0]!;
const rendered = svgNodeCenter(svg, anchor.name)!;
const offset = { dx: rendered.x - anchor.x, dy: rendered.y - anchor.y };

// offset is a pure translation for this render() call. Apply it to any
// other coordinate you scrape out of the same svg string to convert it
// into getLayout()'s frame:
// { x: scrapedX - offset.dx, y: scrapedY - offset.dy }
```

**Pourquoi :** une seule correspondance détermine entièrement le décalage,
puisqu’il s’agit d’une pure translation, ni d’une mise à l’échelle ni d’une
rotation (en supposant les valeurs par défaut de `size=`/`rotate=`). Vous n’en
avez besoin que lorsque vous lisez dans le SVG brut quelque chose que
`getLayout` n’expose pas — voir la recette 5 pour le seul cas courant où c’est
aujourd’hui inévitable.

## 5. Retrouver les positions des étiquettes d’arêtes

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('client');
b.addNode('server');
b.addEdge('client', 'server', { label: 'HTTP GET' });

render(b.graph, 'svg');
const layout = getLayout(b.graph);

for (const e of layout.edges) {
  if (e.label !== undefined) {
    console.log(`${e.tail} -> ${e.head} label center: (${e.label.x}, ${e.label.y})`);
  }
}
```

**Pourquoi :** `EdgeGeometry.label` n’est présent que pour une arête dont
l’attribut `label` a effectivement conduit graphviz à placer une étiquette
centrée ; les arêtes qui n’en ont pas omettent simplement le champ.
`getLayout` ne renvoie que la *position* calculée — pas la chaîne de
l’étiquette ni sa boîte mesurée — donc si votre moteur de rendu doit dessiner
lui-même l’étiquette, associez cette position à la taille que vous avez déjà
mesurée de votre côté pour ce texte d’étiquette (par ex. en renvoyant votre
propre table des tailles d’étiquettes par arête, indexée par la même paire
tail/head que celle utilisée pour construire l’arête).

Les étiquettes de port `taillabel` et `headlabel` reviennent de la même
manière, dans `tailLabel` et `headLabel` :

```ts
b.addEdge('client', 'server', { taillabel: '1', headlabel: '*' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.tailLabel) console.log(`${e.tail} end: (${e.tailLabel.x}, ${e.tailLabel.y})`);
  if (e.headLabel) console.log(`${e.head} end: (${e.headLabel.x}, ${e.headLabel.y})`);
}
```

Chacune n’est présente que si la disposition l’a placée — la même condition
sous laquelle `render()` émet le `<text>` de l’étiquette — il n’est donc pas
nécessaire d’extraire ces positions du SVG rendu.

Un `xlabel` revient dans `xlabel`, avec la même condition de placement. Mieux
vaut le lire que l’approximer : graphviz positionne une étiquette externe par
une recherche de forces parmi des emplacements candidats, et non en décalant le
milieu de la spline, de sorte qu’aucun calcul sur `label` ou `points` ne la
reproduit.

```ts
b.addEdge('a', 'b', { xlabel: 'X' });
render(b.graph, 'svg');

for (const e of getLayout(b.graph).edges) {
  if (e.xlabel) console.log(`xlabel at (${e.xlabel.x}, ${e.xlabel.y})`);
}
```

## 5b. Dessiner vos propres pointes de flèche

```ts
for (const e of getLayout(b.graph).edges) {
  const last = e.points[e.points.length - 1];
  if (e.ep) drawArrow(last, e.ep);   // tip at ep, base at the spline's end
  if (e.sp) drawArrow(e.points[0], e.sp);
}
```

**Pourquoi :** lorsqu’une extrémité porte une flèche, la disposition raccourcit
la spline pour lui laisser de la place et enregistre le point que la flèche
doit atteindre — `ep` du côté de la tête, `sp` du côté de la queue. Les deux
sont absents lorsque l’extrémité n’a pas de flèche, si bien que les tests
ci-dessus servent aussi de « cette extrémité a-t-elle besoin d’une flèche ? ».
Extrapoler une pointe à partir de la direction finale de la spline donne la
bonne direction mais devine la profondeur ; ce sont les valeurs calculées par
graphviz lui-même.

Notez qu’il s’agit de points d’attache sur la frontière du nœud. Le moteur de
rendu propre à Graphviz fait reculer le polygone qu’il dessine par rapport à
ces points d’une quantité qui dépend de `penwidth` ; dessinez donc *jusqu’à*
`ep` plutôt que d’attendre qu’il soit égal à la pointe d’une flèche rendue.

## 6. Associer les noms de clusters de @knowvah/dot-engine aux vôtres

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });

// graphviz only treats a subgraph as a cluster when its name starts with
// the literal prefix "cluster". Generate one synthetic name per caller
// cluster id and remember the reverse mapping before layout runs.
const idByName = new Map<string, string>();
function addCluster(id: string, label: string) {
  const name = `cluster${idByName.size}`;
  idByName.set(name, id);
  return b.addSubgraph(name, { label });
}

const web = addCluster('web-tier', 'Web');
web.addNode('lb');
web.addNode('app1');
web.addEdge('lb', 'app1');

b.addNode('db');
b.addEdge('app1', 'db');

render(b.graph, 'svg');
const layout = getLayout(b.graph);

const clustersByCallerId = new Map(
  layout.clusters.map((c) => [idByName.get(c.name) ?? c.name, c]),
);
// clustersByCallerId.get('web-tier') -> { name, x, y, width, height }
```

**Pourquoi :** `ClusterGeometry.name` renvoie exactement le nom que vous avez
donné à `addSubgraph` — @knowvah/dot-engine ne l’invente pas, ne le renumérote
pas et ne le transforme pas. Si votre modèle de domaine identifie les clusters
par son propre id (qui n’est pas un nom que graphviz accepterait), conservez
vous-même la correspondance id-nom pendant la construction du graphe et
ré-indexez l’instantané `clusters` après la disposition ; n’essayez pas de
retrouver un sens à partir du nom propre à graphviz.

## 6b. Dessiner votre propre bloc de titre de cluster

```ts
for (const c of getLayout(b.graph).clusters) {
  if (!c.label) continue;                     // cluster declared no title
  drawBox(c.x, c.y, c.width, c.height);
  drawTextCentred(c.label.x, c.label.y, c.label.width, c.label.height);
}
```

**Pourquoi :** la disposition réserve de la place pour le titre d’un cluster à
l’intérieur de sa boîte, puis détermine où il va — en respectant `labelloc`,
`labeljust`, `rankdir` et la taille mesurée de l’étiquette elle-même.
`ClusterGeometry.label` publie cet emplacement résolu : un consommateur qui
dessine son propre bloc de titre le lit au lieu de remesurer le texte et de
redériver un décalage qui doit concorder avec celui du moteur.

`label.x`/`label.y` sont le **centre** de l’espace de l’étiquette, contrairement
à `x`/`y` de la boîte, qui désignent un coin. Le `<text>` émis par `render()`
porte quant à lui la *ligne de base*, qui se situe sous le centre — donc si
vous comparez avec la sortie rendue, comparez des centres avec des centres, pas
avec le `y` émis.

## 7. Ajouter de nombreuses arêtes en toute sécurité

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: true, strict: true });

const dependencies: Array<[string, string]> = [
  ['build', 'test'],
  ['test', 'deploy'],
  ['build', 'lint'],
  ['lint', 'test'],
  ['build', 'test'], // duplicate -- collapsed on a strict graph, not doubled
];

for (const [from, to] of dependencies) {
  b.addEdge(from, to);
}

const svg = render(b.graph, 'svg');
```

**Pourquoi :** `addEdge` du constructeur résout `tail`/`head` par nom et crée le
nœud à la première utilisation s’il n’existe pas encore — vous n’avez jamais à
déclarer les nœuds à l’avance avant de câbler une liste d’arêtes issue de
données. Sur un graphe `strict`, répéter la même paire `(tail, head)` renvoie
l’arête existante au lieu d’en ajouter une parallèle, conformément au contrat
de dédoublonnage d’`agedge` de cgraph.

Si vous ajoutez des arêtes à un graphe produit par `parse()` plutôt que par
`createGraph()`, utilisez directement la fonction de plus bas niveau
`addEdge(g, tail, head, name?)` de `@knowvah/dot-engine` avec des références
`Node` que vous détenez déjà :

```ts
import { parse, addEdge } from '@knowvah/dot-engine';

const g = parse('digraph { a; b; }');
const a = g.nodes.get('a')!;
const c = g.nodes.get('b')!;
addEdge(g, a, c);
```

Voir `/reference` pour la signature complète d’`addEdge` et son comportement de
dédoublonnage sur les graphes stricts.

## 8. Tout assembler

Une fonction compacte qui prend un petit graphe de domaine, le dispose et
renvoie les nœuds et arêtes positionnés :

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';
import type { LayoutSnapshot } from '@knowvah/dot-engine';

interface DomainNode {
  id: string;
  label: string;
}

interface DomainEdge {
  from: string;
  to: string;
  label?: string;
}

interface PositionedGraph {
  nodes: Array<{ id: string; x: number; y: number; width: number; height: number }>;
  edges: Array<{
    from: string;
    to: string;
    points: { x: number; y: number }[];
    label?: { x: number; y: number };
  }>;
  width: number;
  height: number;
}

function layoutDomainGraph(nodes: DomainNode[], edges: DomainEdge[]): PositionedGraph {
  const b = createGraph({ directed: true });
  for (const n of nodes) b.addNode(n.id, { label: n.label });
  for (const e of edges) {
    b.addEdge(e.from, e.to, e.label !== undefined ? { label: e.label } : {});
  }

  // render() triggers layout; getLayout() reads the geometry it left behind.
  render(b.graph, 'svg');
  const snap: LayoutSnapshot = getLayout(b.graph);

  return {
    nodes: snap.nodes.map((n) => ({
      id: n.name,
      // graphviz reports the node CENTER; convert to top-left if your
      // renderer expects that instead.
      x: n.x - n.width / 2,
      y: n.y - n.height / 2,
      width: n.width,
      height: n.height,
    })),
    edges: snap.edges.map((e) => ({
      from: e.tail,
      to: e.head,
      points: e.points,
      ...(e.label !== undefined ? { label: e.label } : {}),
    })),
    width: snap.bounds.width,
    height: snap.bounds.height,
  };
}
```

C’est la forme que la plupart des consommateurs finissent par construire
au-dessus de `getLayout` : un seul point d’extension qui prend en entrée vos
propres types de nœuds et d’arêtes, et renvoie en sortie une géométrie
positionnée dans votre propre convention de coordonnées.
