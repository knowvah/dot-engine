---
sourceHash: a49bdc5fdca8b04f5bd951935e322d616028e44f4567709824dbbd5229f60e3b
---

# Référence des types

Une carte conceptuelle des types publics, regroupés selon l’endroit d’où vous
les obtenez : `createGraph`/`parse` (construire + inspecter), `getLayout`
(instantané de géométrie), `render`/`getDrawOps` (sortie) et le paquet racine
(moteurs, images, mesure du texte, erreurs). Chaque entrée présente un bloc de
forme copié de la source et un objectif en une ligne. Pour une documentation
exhaustive champ par champ (y compris les membres hérités et le JSDoc de chaque
propriété), consultez la [référence TypeDoc](/reference/) générée.

Cette page ne reprend pas l’exposé sur le repère de coordonnées — voir
[Lire la géométrie calculée](/fr/guide/geometry) pour cela. Elle rappelle
toutefois brièvement la note sur l’axe y partout où les champs d’un type
dépendent du repère.

## Construire + inspecter (`@knowvah/dot-engine` / `@knowvah/dot-engine/api`)

### `Graph`

Un handle opaque vers le modèle de graphe interne. Renvoyé par `parse()` et par
`createGraph().graph`. Passez-le à `render`, `getLayout` et `getDrawOps` ; ne le
construisez pas et ne l’inspectez pas directement — le constructeur et
l’analyseur sont les seuls moyens pris en charge d’en produire un.

### `CreateGraphOptions`

```ts
interface CreateGraphOptions {
  directed?: boolean;
  strict?: boolean;
  name?: string;
}
```

Options de `createGraph`. `directed`/`strict` sélectionnent l’un des quatre
`GraphKind` (orienté, non orienté, strict orienté, strict non orienté) ;
`name` définit le nom du graphe (`''` par défaut).

### `GvNode`

```ts
interface GvNode {
  readonly name: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Handle opaque d’un nœud de graphe renvoyé par `builder.addNode(...)`.
`setHtmlAttr` marque la valeur comme une étiquette de type HTML (équivalent de
`label=<...>` dans le texte DOT) afin que le moteur de disposition la mesure
comme du balisage.

### `GvEdge`

```ts
interface GvEdge {
  readonly tail: string;
  readonly head: string;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
}
```

Handle opaque d’une arête de graphe renvoyé par `builder.addEdge(...)`.

### `GvGraphBuilder`

```ts
interface GvGraphBuilder {
  addNode(name: string, attrs?: Record<string, string>): GvNode;
  addEdge(
    tail: GvNode | string,
    head: GvNode | string,
    attrs?: Record<string, string>,
  ): GvEdge;
  addSubgraph(name: string, attrs?: Record<string, string>): GvGraphBuilder;
  setAttr(k: string, v: string): void;
  setHtmlAttr(k: string, v: string): void;
  getAttr(k: string): string | undefined;
  readonly graph: Graph;
}
```

Renvoyé par `createGraph(...)`. `addSubgraph` renvoie un constructeur imbriqué
limité à ce sous-graphe ; les nœuds ajoutés par son intermédiaire sont aussi
membres du graphe racine. `.graph` est le point de transmission vers
`render`/`getLayout`/`getDrawOps`. Voir
[Construire un graphe en code](/fr/guide/build-a-graph).

## Instantané de géométrie (`getLayout`)

::: tip Repère de coordonnées
Les coordonnées natives de graphviz ont l’axe y vers le haut (origine en bas à
gauche). `getLayout` utilise par défaut `yAxis: 'down'` (origine en haut à
gauche, convention d’écran) et inverse chaque coordonnée y ; passez
`{ yAxis: 'up' }` pour obtenir les coordonnées natives de graphviz. Exposé
complet : [Lire la géométrie calculée](/fr/guide/geometry).
:::

### `YAxis` / `GeometryOptions`

```ts
type YAxis = 'up' | 'down';
type GeometryOptions = { yAxis?: YAxis };
```

Options de `getLayout`. `yAxis: 'down'` par défaut.

### `LayoutSnapshot`

```ts
interface LayoutSnapshot {
  bounds: BoundsGeometry;
  nodes: NodeGeometry[];
  edges: EdgeGeometry[];
  clusters: ClusterGeometry[];
}
```

Instantané simple, sérialisable en JSON, de la géométrie calculée d’un graphe,
renvoyé par `getLayout(g, opts?)`. `clusters` liste récursivement chaque
sous-graphe cluster (les clusters imbriqués ont chacun leur propre entrée) ; il
est vide pour les graphes sans clusters.

### `BoundsGeometry`

```ts
interface BoundsGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Boîte englobante globale, en points. Avec `yAxis: 'down'`, `x`/`y` sont
normalisés à `(0, 0)`. Avec `yAxis: 'up'`, `x`/`y` sont le coin inférieur
gauche brut de la boîte englobante du graphe.

### `NodeGeometry`

```ts
interface NodeGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Géométrie par nœud. `x`/`y` sont le centre du nœud. `width`/`height` sont en
**points** — le modèle les stocke en pouces (`ND_width`/`ND_height`) ;
`getLayout` les multiplie par 72 avant de les renvoyer.

### `EdgeGeometry`

```ts
interface EdgeGeometry {
  tail: string;
  head: string;
  points: { x: number; y: number }[];
  label?: { x: number; y: number };
  tailLabel?: { x: number; y: number };
  headLabel?: { x: number; y: number };
  xlabel?: { x: number; y: number };
  sp?: { x: number; y: number };
  ep?: { x: number; y: number };
}
```

Géométrie par arête. `points` concatène, dans l’ordre, chaque point de contrôle
de Bézier de la spline routée (vide si l’arête n’a pas de spline routée).
`label` n’est présent que lorsque l’arête porte une étiquette centrale.

`tailLabel` et `headLabel` sont les positions des étiquettes de port
`taillabel`/`headlabel`. Chacune n’est présente qu’une fois que la disposition
l’a placée — la même condition sous laquelle `render()` émet son `<text>` — de
sorte qu’une étiquette de port qui n’a pas pu être placée (une arête sans
spline routée, par exemple) est signalée comme absente plutôt que comme une
étiquette à l’origine.

`xlabel` est la position de l’étiquette externe `xlabel`. Contrairement à
`label`, elle est choisie par la recherche de placement par forces de graphviz
parmi des positions candidates autour de l’arête, et ne peut donc pas être
déduite de `label` ni du milieu de la spline. Elle obéit à la même condition de
placement : un xlabel déclaré que la recherche n’a pas pu faire tenir est
signalé comme absent, exactement comme `render()` renonce à le dessiner.

`sp` et `ep` sont les points d’attache de la flèche aux extrémités queue et
tête. Lorsqu’une extrémité porte une flèche, la spline est raccourcie pour lui
laisser de la place et la flèche s’étend du dernier point de contrôle jusqu’à
ce point — de sorte qu’un consommateur qui dessine ses propres pointes de
flèche lit la pointe ici au lieu d’en extrapoler une. Chacun n’est présent que
lorsque cette extrémité a réellement une flèche : une arête simple
`digraph { a -> b }` signale donc `ep` et pas de `sp`, et `arrowhead=none` ne
signale ni l’un ni l’autre.

Ce sont les points d’attache sur la frontière du nœud. Le moteur de rendu
propre à Graphviz fait reculer le polygone de flèche qu’il dessine par rapport
à eux d’une quantité qui dépend de `penwidth` ; `ep` est donc le point *vers*
lequel dessiner une flèche, et non une copie de la pointe rendue.

### `ClusterGeometry`

```ts
interface ClusterGeometry {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: { x: number; y: number; width: number; height: number };
}
```

Boîte englobante par cluster. `name` est le nom du sous-graphe cluster (par ex.
`cluster6`) ; les clusters imbriqués encodent leur hiérarchie dans le nom, si
bien qu’aucun lien explicite vers le parent n’est exposé. Suit la même
convention de repère que `BoundsGeometry`.

`label` est l’emplacement du titre du cluster, présent uniquement lorsque le
cluster en déclare un. Ses `x`/`y` sont le **centre** de l’espace de
l’étiquette — comme `EdgeGeometry.label`, et non le coin de la boîte `x`/`y`
ci-dessus — et `width`/`height` sont la taille mesurée du texte ; la boîte de
l’étiquette est donc
`[x - width/2, x + width/2] × [y - height/2, y + height/2]` et se trouve
toujours à l’intérieur de la boîte du cluster. Notez qu’il s’agit du *centre*
de l’étiquette, alors que le `<text>` émis par `render()` porte la ligne de
base, qui est plus bas.

## Rendu (`@knowvah/dot-engine/render`)

### `OutputFormat`

```ts
type OutputFormat =
  | 'svg'
  | 'dot'
  | 'xdot'
  | 'json'
  | 'plain'
  | 'plain-ext'
  | 'imap'
  | 'cmapx';
```

Union fermée des formats acceptés par `render(g, format, opts?)`. Voir
[Rendu vers d’autres formats](/fr/guide/render-formats).

### `RenderOptions`

```ts
interface RenderOptions {
  engine?: EngineName;
  inlineImages?: boolean;
}
```

Options de `render`. `engine` vaut `'dot'` par défaut. `inlineImages` (nouveau)
vaut `false` par défaut ; lorsqu’il vaut `true`, l’émetteur SVG incorpore les
images externes (`image=`/`<IMG>` HTML) sous forme d’URI `data:` en consultant
le résolveur enregistré via `setImageResolver` — un échec du résolveur ou
l’absence d’enregistrement retombe sur le passage direct de `src` brut. Sans
effet sur les formats autres que SVG. Voir
[Travailler avec des images](/fr/guide/images).

::: warning `yAxis` n’est pas un champ de `RenderOptions`
L’orientation des coordonnées ne concerne que `getLayout`. Les chaînes de
format brutes produites par `render` portent les coordonnées natives avec y vers
le haut ; inversez en post-traitement si vous avez besoin de y vers le bas et
ne passez pas par `getLayout`.
:::

### `DrawOpsOptions`

```ts
interface DrawOpsOptions {
  engine?: EngineName;
}
```

Options de `getDrawOps`. `engine` vaut `'dot'` par défaut.

### `Xdot`

```ts
interface Xdot {
  ops: XdotOp[];
  flags: number;
}
```

Résultat analysé d’un flux d’attribut xdot : le tableau d’opérations de dessin
décodé plus un masque de bits d’indicateurs d’état d’analyse. `getDrawOps`
renvoie uniquement le `XdotOp[]` aplati à travers tous les attributs de dessin
du graphe, dans l’ordre de peinture (graphe → nœud → arête) — voir
[Rendu personnalisé avec xdot](/fr/guide/xdot-drawops) pour le tableau complet
des types d’opérations et l’exemple canvas.

### `XdotOp`

```ts
type XdotOp =
  | { kind: 'filled_ellipse' | 'unfilled_ellipse'; ellipse: XdotRect }
  | { kind: 'filled_polygon' | 'unfilled_polygon'; polygon: XdotPolyline }
  | { kind: 'filled_bezier' | 'unfilled_bezier'; bezier: XdotPolyline }
  | { kind: 'polyline'; polyline: XdotPolyline }
  | { kind: 'text'; text: XdotText }
  | { kind: 'fill_color' | 'pen_color'; color: string }
  | { kind: 'grad_fill_color' | 'grad_pen_color'; gradColor: XdotColor }
  | { kind: 'font'; font: XdotFont }
  | { kind: 'style'; style: string }
  | { kind: 'image'; image: XdotImage }
  | { kind: 'fontchar'; fontchar: number };
```

Une opération de dessin xdot décodée, discriminée par `kind`. Chaque variante
porte une propriété de charge utile nommée d’après sa forme — discriminez sur
`kind` dans un `switch` pour y accéder en toute sécurité. Les coordonnées sont
en points, dans le repère natif avec y vers le haut (inversez pour un canvas
avec y vers le bas — voir le guide lié ci-dessus).

### `XdotColor`

```ts
type XdotColor =
  | { type: 'none'; clr: string }
  | { type: 'linear'; ling: XdotLinearGrad }
  | { type: 'radial'; ring: XdotRadialGrad };
```

Une couleur de remplissage/trait xdot résolue : une couleur unie, ou un
dégradé linéaire/radial (`XdotLinearGrad`/`XdotRadialGrad` portent chacun
`x0,y0,x1,y1[,r0,r1]` plus un tableau
`stops: { frac: number; color: string }[]`).

## Paquet racine (`@knowvah/dot-engine`)

### `EngineName`

```ts
type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

type EngineName = BuiltinEngine | (string & {});
```

Un nom de moteur de disposition. Le registre est ouvert (des moteurs
personnalisés peuvent être enregistrés sur un `GvcContext`), donc toute chaîne
est acceptée ; `(string & {})` conserve l’autocomplétion de l’éditeur pour les
moteurs intégrés sans fermer l’ensemble. Voir
[Moteurs de disposition](/fr/guide/engines).

### `ImageSizer`

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;

function setImageSizer(sizer: ImageSizer | null): void;
```

Enregistre un rappel qui renvoie les dimensions intrinsèques d’une image
externe référencée par `image=` ou par une cellule HTML `<IMG>`, pour le
dimensionnement de la disposition. Renvoyez `null` lorsque la taille est
inconnue (conforme au comportement de C face à une image manquante — une
cellule de taille nulle plus un avertissement). Passez `null` à
`setImageSizer` pour effacer un mesureur défini précédemment. Voir
[Utilisation dans le navigateur](/fr/guide/browser).

### `ImageResolver`

```ts
type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;

function setImageResolver(fn: ImageResolver | null): void;
```

Enregistre un rappel qui renvoie les octets bruts d’une image externe, consulté
lorsque `RenderOptions.inlineImages` vaut `true`. Un `Uint8Array` seul renvoyé
déduit son type MIME de l’extension de fichier de `src`. `null` (renvoyé par le
résolveur, ou absence de résolveur enregistré) retombe sur le passage direct de
`src` brut. Voir [Travailler avec des images](/fr/guide/images).

### `TextMeasurer` / `TextSize`

```ts
interface TextMeasurer {
  measure(
    text: string,
    fontname: string,
    fontsize: number,
    flags?: { readonly bold?: boolean; readonly italic?: boolean },
  ): TextSize;
}

interface TextSize {
  w: number;
  h: number;
  yoffsetCenterline?: number;
  yoffsetLayout?: number;
}
```

Mesure de texte enfichable, installée via `setTextMeasurer` (trois
implémentations intégrées sont fournies : `EstimateTextMeasurer`,
`LutTextMeasurer`, `CanvasTextMeasurer`).
`yoffsetCenterline`/`yoffsetLayout` sont des métriques verticales facultatives
(ligne de base→ligne médiane, ligne de base→ascendante) ; omettez-les pour
retomber sur les valeurs par défaut calibrées sur pango. Voir
[Mesure du texte](/fr/guide/text-measurement).

### `RenderResult` et erreurs

```ts
interface RenderResult {
  svg?: string;   // present on success
  errors?: GvError[]; // present on failure; length <= 1 for v1
}

interface GvError {
  type: 'syntax' | 'semantic' | 'render';
  code: 'SYNTAX_ERROR' | 'SYNTAX_UNEXPECTED_EOF'
      | 'EDGE_OP_DIRECTED_IN_UNDIRECTED' | 'EDGE_OP_UNDIRECTED_IN_DIRECTED'
      | 'HTML_PARSE_ERROR' | 'RENDER_ERROR' | 'INTERNAL_ERROR'
      | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE' | 'GENERIC_ERROR';
  message: string;
  friendlyMessage: string;
  location?: { line: number; column: number; offset?: number };
  expected?: GvExpectation[];
}
```

`tryRenderSvg(dotSource, engine)` est la contrepartie à style « résultat » de
`renderSvg` : elle renvoie `{ svg }` en cas de succès ou `{ errors: [one] }` à
la première défaillance au lieu de lever. Elle renvoie pour toute entrée DOT et
ne lève que pour des arguments invalides. Les entrées de `errors` sont des
données simples, sans `cause` ni pile d’appels.

Toute erreur de dot-engine levée étend la classe abstraite `DotEngineError` et
implémente `GvError` :

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}

class ParseError extends DotEngineError {
  readonly type = 'syntax';
  readonly code: GvErrorCode;
  readonly friendlyMessage: string;
  readonly location: { line: number; column: number; offset?: number };
  readonly expected?: GvExpectation[];
  get line(): number;   // convenience getter -> location.line
  get column(): number; // convenience getter -> location.column
}

class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic'; // 'semantic' for UNKNOWN_LAYOUT / UNSUPPORTED_FEATURE
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
  readonly friendlyMessage: string;
}

class InternalError extends DotEngineError {
  readonly type = 'render';
  readonly code = 'INTERNAL_ERROR';
  readonly friendlyMessage: string;
}

function isGvError(e: unknown): e is GvError; // structural; works across bundles
```

`renderSvg` lève `ParseError` pour une source DOT invalide, `RenderError` pour
les échecs de l’étape de disposition ou de rendu et `InternalError` pour un
bogue de dot-engine. Les erreurs de l’appelant lèvent une `TypeError` /
`RangeError` / `Error` standard dont le `code` est un `UsageErrorCode`
(`'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' |
'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`) ; ce ne sont pas des `GvError`. Les
appelants qui veulent des erreurs structurées sans `try`/`catch` devraient
utiliser `tryRenderSvg` à la place. Voir
[Erreurs et exceptions](/fr/guide/errors) pour chaque code.

## Relations

```graphviz
digraph types {
  rankdir=LR;
  bgcolor="transparent";
  node [shape=box, style=rounded, fontname="Helvetica", fontsize=11];
  edge [fontname="Helvetica", fontsize=10];

  subgraph cluster_build {
    label="Build"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    createGraph; GvGraphBuilder; GvNode; GvEdge;
  }
  subgraph cluster_read {
    label="Layout + Read"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    LayoutSnapshot; NodeGeometry; EdgeGeometry; ClusterGeometry; BoundsGeometry;
  }
  subgraph cluster_render {
    label="Render"; labeljust=l; style=dashed; color="gray60"; fontname="Helvetica"; fontsize=11;
    OutputString [label="string"];
    XdotOpArray [label="XdotOp[]"];
  }

  createGraph -> GvGraphBuilder;
  GvGraphBuilder -> GvNode [label="addNode"];
  GvGraphBuilder -> GvEdge [label="addEdge"];
  GvGraphBuilder -> "Graph" [label=".graph"];
  parse -> "Graph";

  "Graph" -> LayoutSnapshot [label="getLayout"];
  LayoutSnapshot -> NodeGeometry;
  LayoutSnapshot -> EdgeGeometry;
  LayoutSnapshot -> ClusterGeometry;
  LayoutSnapshot -> BoundsGeometry;

  "Graph" -> OutputString [label="render"];
  "Graph" -> XdotOpArray  [label="getDrawOps"];
}
```

## Quel type provient de quel appel

| Appel | Renvoie |
|---|---|
| `createGraph(opts?)` | `GvGraphBuilder` |
| `builder.addNode(name, attrs?)` | `GvNode` |
| `builder.addEdge(tail, head, attrs?)` | `GvEdge` |
| `builder.addSubgraph(name, attrs?)` | `GvGraphBuilder` (imbriqué) |
| `parse(dotSource)` | `Graph` |
| `render(g, format, opts?)` | `string` |
| `getLayout(g, opts?)` | `LayoutSnapshot` |
| `getDrawOps(g, opts?)` | `XdotOp[]` |
| `renderSvg(dotSource, engine)` | `string` (lève `DotEngineError`, ou une `TypeError` d’usage) |
| `tryRenderSvg(dotSource, engine)` | `RenderResult` |

Pour chaque champ de chaque type ci-dessus — y compris ceux que cette page
résume — consultez la [référence TypeDoc](/reference/) générée. Pour
l’approfondissement sur le repère de coordonnées (avec des exemples détaillés),
voir [Lire la géométrie calculée](/fr/guide/geometry).
