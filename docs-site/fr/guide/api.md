---
sourceHash: e2e54229b04c577dfb514c415c7f02fd786b797b5bfc7a4bbf2e4192d03d0c09
---

# Référence de l’API

La surface publique est volontairement réduite. La plupart des appelants n’ont
besoin que de `renderSvg`. Consultez la [Vue d’ensemble](/fr/guide/overview)
pour savoir quel point d’entrée utiliser, [Types](/fr/guide/types) pour les
formes que chaque fonction consomme et renvoie, et la
[Référence](/reference/) générée pour les signatures exhaustives, chaque champ
et chaque surcharge.

> Les déclarations de types (`.d.ts`) sont produites par `npm run build` (l’étape
> `build:types` exécute `tsc -p tsconfig.build.json`). La table `exports` de
> `package.json` associe des conditions `types` à chaque entrée, de sorte que
> `@knowvah/dot-engine`, `@knowvah/dot-engine/api` et
> `@knowvah/dot-engine/render` résolvent tous leurs types dans les éditeurs et
> les builds en aval.
>
> Le build produit aussi des fichiers de correspondance de déclarations
> (`.d.ts.map`) et des source maps JS, et le paquet livre ses sources `src/` —
> ainsi « aller à la définition » mène directement au vrai TypeScript, ce qui
> facilite la lecture du code et l’ouverture d’une PR.

Cette page est organisée selon les trois points d’entrée (la
[Vue d’ensemble](/fr/guide/overview) explique quand choisir chacun) : le paquet
racine `@knowvah/dot-engine` (analyse + rendu en un seul appel, plus la
configuration globale au processus), `@knowvah/dot-engine/api` (construire un
graphe en code, relire la géométrie calculée) et `@knowvah/dot-engine/render`
(sortie multi-formats et opérations de dessin brutes). Chaque fonction
ci-dessous est aussi réexportée depuis le paquet racine
(`export * from './api/index.js'` / `export * from './render/index.js'` dans
`src/index.ts`) — tout importer depuis `@knowvah/dot-engine` fonctionne, mais
les imports par sous-chemin indiquent plus explicitement quelle couche vous
utilisez.

## `@knowvah/dot-engine` (racine)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Analyse la source DOT, exécute le [moteur de disposition](/fr/guide/engines)
nommé, rend en SVG et renvoie la chaîne SVG. C’est la fonction utilitaire en un
seul appel : elle construit un `GvcContext`, enregistre les huit moteurs
intégrés et le moteur de rendu SVG, dispose, rend, puis libère la disposition —
voir [`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext)
ci-dessous si vous avez besoin de séparer ces étapes.

- **`dotSource`** — source du graphe en langage DOT.
- **`engine`** — `EngineName` : l’un des moteurs intégrés (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) ou n’importe quel nom
  enregistré sur mesure.
- **Lève** une `DotEngineError` pour tout problème lié à l’entrée : `ParseError`
  si `dotSource` est invalide, `RenderError` si la disposition ou le rendu
  échoue, `InternalError` (avec `cause`) pour un bogue de dot-engine. Une
  `TypeError` avec `code` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` si
  `dotSource` ou `engine` est invalide (y compris un nom de moteur non
  enregistré). Voir [Erreurs et exceptions](/fr/guide/errors).

Signature complète, JSDoc et liste des champs de `GvError` :
[Référence](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

Équivalent de `renderSvg` à style « résultat ». Renvoie (sans jamais lever)
pour toute entrée DOT : `{ svg }` en cas de succès ou `{ errors: [one] }` à la
première défaillance ; `svg` et `errors` sont mutuellement exclusifs. Elle ne
lève que pour des arguments invalides (`TypeError`
`ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`). Chaque entrée de `errors`
est une donnée simple, sérialisable en JSON (`type`, `code`, `message`,
`friendlyMessage`, plus `location` / `expected` lorsqu’ils sont présents ; pas
de `cause`, pas de trace d’appels), ce qui permet de l’envoyer à travers une
frontière worker/postMessage ou de la sérialiser dans un journal. Préférez-la à
`renderSvg` + `try`/`catch` lorsque l’appelant veut se brancher sur `code` /
`type` plutôt que d’attraper une exception. Voir
[Erreurs et exceptions](/fr/guide/errors). [Référence](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Analyse le DOT vers le modèle de graphe en mémoire **sans** le disposer. Utile
pour inspecter ou transformer le graphe — ou pour le passer à `getLayout` de
`@knowvah/dot-engine/api` / `render` de `@knowvah/dot-engine/render` — avant le
rendu.

- **Lève** `ParseError` pour des erreurs de syntaxe ou des violations de
  direction d’arête (par ex. `->` dans un graphe non orienté). `ParseError`
  étend `DotEngineError` et implémente `GvError` avec `type: 'syntax'` ; elle
  porte une `location: { line, column, offset? }`. `TypeError`
  `ERR_INVALID_ARG_TYPE` si `dotSource` n’est pas une chaîne.
  [Erreurs et exceptions](/fr/guide/errors), [Référence](/reference/).

### `DotEngineError` / `RenderError` / `InternalError`

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}
class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic';
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
}
class InternalError extends DotEngineError {
  readonly type: 'render';
  readonly code: 'INTERNAL_ERROR';
}
function isGvError(e: unknown): e is GvError;
```

`instanceof DotEngineError` signifie que dot-engine a échoué sur cette entrée.
`RenderError` couvre les échecs connus de disposition ou de rendu (`type` vaut
`semantic` pour `UNKNOWN_LAYOUT` et `UNSUPPORTED_FEATURE`). `InternalError` est
un bogue de dot-engine ; `cause` contient l’erreur d’origine lorsqu’une erreur
a été enveloppée. Les erreurs de l’appelant lèvent à la place une `TypeError` /
`RangeError` / `Error` standard avec un `code`. `isGvError` vérifie la
présence d’un `type` et d’un `code` de type chaîne, et fonctionne donc même
avec des bundles dupliqués. Voir [Erreurs et exceptions](/fr/guide/errors) pour
chaque code et ce que chaque fonction peut lever, [Types](/fr/guide/types)
pour la forme de `GvError`, et [Référence](/reference/) pour la liste des
membres de `GvErrorCode`.

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Enregistre (ou efface, avec `null`) le mesureur de texte global au processus
consulté pendant la disposition pour dimensionner les étiquettes. L’effacer
revient à la valeur par défaut de la bibliothèque (navigateur :
`CanvasTextMeasurer` ; sans interface/Node : `EstimateTextMeasurer`, sauf si un
mesureur LUT est branché — voir [Mesure du texte](/fr/guide/text-measurement)
pour l’ordre de résolution complet et les implémentations `CanvasTextMeasurer` /
`EstimateTextMeasurer` / `LutTextMeasurer` exportées avec ces fonctions).
[Référence](/reference/).

### `setImageSizer` / `setImageResolver`

Deux points d’extension de configuration des images, liés mais distincts — tous
deux des registres globaux au processus qui suivent le même schéma
(enregistrer un rappel, passer `null` pour l’effacer), tous deux sans effet
tant qu’un appelant n’en a pas enregistré un :

- **`setImageSizer`** — indique les *dimensions intrinsèques* d’une image
  externe afin que le moteur de disposition puisse réserver de l’espace pour
  une cellule HTML `<IMG>` ou un attribut de nœud `image=` avant le rendu.
  Renvoyer `null` (ou ne pas enregistrer de mesureur) reproduit le comportement
  de Graphviz natif face à une image manquante : un avertissement et une taille
  nulle.
- **`setImageResolver`** (nouveau — voir [`inlineImages`](#inlineimages)
  ci-dessous) — fournit les *octets* réels de l’image afin que le moteur de
  rendu SVG puisse les incorporer sous forme d’URI `data:` au lieu d’émettre
  `xlink:href="src"` en simple passage direct.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` peut renvoyer un `Uint8Array` seul (type MIME déduit de
l’extension de fichier de `src` — `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`,
`.webp` ; tout le reste retombe sur `application/octet-stream`) ou
`{ bytes, mime }` pour fixer explicitement le type MIME. Renvoyez `null`
lorsque `src` ne peut pas être résolu — le moteur de rendu retombe sur le
passage direct de `src` brut, comme si aucun résolveur n’était enregistré.
Enregistrer un résolveur n’a aucun effet en soi ; il n’est consulté que lorsque
l’option `inlineImages` de `render` vaut `true` (ci-dessous). Voir
[Travailler avec des images](/fr/guide/images) pour un exemple détaillé et
[Référence](/reference/) pour les deux types de rappel.

### `renderSvgAsync` / `renderSvgInto`

```ts
function renderSvgAsync(
  dotSource: string,
  engine: EngineName,
  opts?: AsyncSvgOptions,
): Promise<{ svg: string; fontIssues: FontIssue[] }>;

function renderSvgInto(
  id: string,
  src: string,
  engine: EngineName,
  opts?: RenderSvgIntoOptions,
): Promise<{ element: SVGSVGElement; fontIssues: FontIssue[] }>;

type FontIssue = { face: string; reason: 'failed' | 'timeout' };
type AsyncSvgOptions = Omit<AsyncRenderOptions, 'engine'>;
interface RenderSvgIntoOptions extends AsyncSvgOptions {
  sanitize?: (svg: string) => string;
  trusted?: boolean;
  document?: Document;
}
```

`renderSvgAsync` est la contrepartie asynchrone de `renderSvg` : elle
précharge les polices web et les données d’image dont le graphe a besoin, puis
dispose et rend. `renderSvgInto` rend et remplace les enfants de l’élément
d’id `id`, en assainissant le SVG par défaut (`trusted: true` désactive cette
étape ; `sanitize` remplace le nettoyeur intégré). Les échecs, y compris les
arguments incorrects, sont des rejets de promesse avec les mêmes classes
d’erreur que `renderSvg` ; un id d’élément introuvable rejette avec
`ERR_INVALID_ARG_VALUE`. Les problèmes de police ne rejettent jamais ; ils
reviennent dans `fontIssues`. Voir [Utilisation dans le navigateur](/fr/guide/browser)
et [Images](/fr/guide/images), ainsi que [Référence](/reference/).

### `GvcContext` / `renderWithContext`

```ts
class GvcContext {
  constructor(measurer: TextMeasurer, options?: { debug?: DebugOptions });
  register(plugin: LayoutEngine | RendererPlugin): void;
  layout(g: Graph, engineName: EngineName): void;
  freeLayout(g: Graph, engineName: EngineName): void;
}

function renderWithContext(ctx: GvcContext, g: Graph, format: string): string;
```

Orchestration de plus bas niveau pour les appelants qui doivent piloter la
disposition et le rendu comme des étapes séparées. `renderSvg` est une fonction
utilitaire construite exactement sur cela : construire un contexte, enregistrer
moteurs et moteurs de rendu, `layout`, `renderWithContext`, `freeLayout`.
N’utilisez ces fonctions directement que si vous avez besoin de ce contrôle —
par exemple pour enregistrer un sous-ensemble de moteurs, ajouter un
`LayoutEngine` ou un `RendererPlugin` personnalisé, ou rendre le même graphe
disposé dans plusieurs formats sans relancer la disposition (appelez `layout`
une fois, puis `renderWithContext` pour chaque format, puis `freeLayout`).
[Référence](/reference/).

## `@knowvah/dot-engine/api`

Construction programmatique, insertion sûre d’arêtes et lecture de la
géométrie calculée — la couche pour construire un graphe sans écrire de DOT à
la main et relire sa disposition sous forme de données simples. Voir
[Types](/fr/guide/types) pour `LayoutSnapshot` et ses formes imbriquées.

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Crée un graphe neuf, prêt à être transmis à `render` / `getLayout` /
`getDrawOps`. Valeurs par défaut : `directed: true`, `strict: false`,
`name: ''`. Renvoie un `GvGraphBuilder` — `addNode`, `addEdge`, `addSubgraph`,
`setAttr`/`getAttr`, `setHtmlAttr` (pour les étiquettes en tableau HTML) et une
propriété `.graph` exposant le handle opaque `Graph`. Voir
[Construire un graphe en code](/fr/guide/build-a-graph) et
[Référence](/reference/) pour les interfaces complètes
`GvGraphBuilder`/`GvNode`/`GvEdge`.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Fonction d’aide de plus bas niveau pour l’insertion d’arêtes, sous-jacente à
`GvGraphBuilder.addEdge` — exportée directement pour les appelants qui
travaillent avec les références internes `Node`/`Edge` (par ex. des arêtes
ajoutées à un graphe renvoyé par `parse()`) plutôt qu’avec les handles opaques
`GvNode`/`GvEdge` du constructeur. La plupart des appelants devraient utiliser
`createGraph(...).addEdge(tail, head, attrs?)` à la place.

- **`name`** — clé de l’arête ; vaut `''` (anonyme) par défaut. Ignorée pour le
  dédoublonnage des graphes stricts, qui se fonde sur `(tail, head)` seul
  (symétrique pour les graphes non orientés).
- **Renvoie** la nouvelle arête, ou l’arête existante si `g` est strict et
  qu’une arête `(tail, head)` existe déjà (reproduit `agedge` avec `cflag=1`).

Voir [Construire un graphe en code](/fr/guide/build-a-graph) et
[Référence](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Renvoie un instantané simple, sérialisable en JSON, de la géométrie calculée du
graphe — positions des nœuds, points de contrôle des splines d’arêtes,
étiquettes d’arêtes, boîtes englobantes des clusters et limites globales du
graphe — le tout en points.

- **`g`** — doit déjà avoir été disposé (via `render(g, ...)`, `getDrawOps(g)`
  ou `ctx.layout(g, engine)`) ; appeler `getLayout` sur un graphe pas encore
  disposé lève une erreur au lieu de renvoyer silencieusement une géométrie
  entièrement nulle.
- **`opts.yAxis`** — `'down'` par défaut : coordonnées d’écran, origine en haut
  à gauche, y croissant vers le bas, et `bounds` normalisé à `(0, 0)`. `'up'`
  renvoie les coordonnées natives de Graphviz (origine en bas à gauche, y
  croissant vers le haut) avec `bounds.x`/`bounds.y` au coin inférieur gauche
  brut.
- **Lève** `Error` avec `code` `ERR_INVALID_STATE` si `g` n’a pas été disposé ;
  `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` pour un `g` ou
  des `opts` incorrects. Voir [Erreurs et exceptions](/fr/guide/errors).

`width`/`height` des nœuds sont convertis en points (le modèle interne stocke
des pouces) ; toutes les autres coordonnées sont déjà en points. Voir
[Lire la géométrie calculée](/fr/guide/geometry) pour l’exposé du système de
coordonnées et [Types](/fr/guide/types) / [Référence](/reference/) pour les
listes complètes de champs de `LayoutSnapshot`, `NodeGeometry`, `EdgeGeometry`,
`ClusterGeometry` et `BoundsGeometry`.

### `Graph`

Type de handle opaque réexporté depuis le modèle interne. Seul le *type* est
exposé (pas la classe mutable) — annotez avec lui une variable contenant le
`.graph` d’un constructeur ou un résultat de `parse()`, mais ne construisez pas
ses champs et ne les inspectez pas directement ; utilisez le constructeur,
`getLayout` ou `getDrawOps` pour relire l’état. [Référence](/reference/).

## `@knowvah/dot-engine/render`

Sortie multi-formats et accès aux opérations de dessin brutes — la couche pour
rendre un graphe déjà analysé par `parse` ou construit avec le constructeur.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Dispose un graphe et le rend dans la chaîne du format demandé.

- **`format`** — `OutputFormat` : `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — moteur de disposition (`'dot'` par défaut).
- **`opts.inlineImages`** — voir [ci-dessous](#inlineimages).
- **Lève** `RenderError` en cas d’échec de disposition ou de rendu ;
  `InternalError` pour un bogue de dot-engine ; `TypeError` avec un `code` pour
  des arguments invalides (y compris un moteur ou un format non enregistré).
  Voir [Erreurs et exceptions](/fr/guide/errors).

`opts.engine` reprend le paramètre `engine` de `renderSvg` ; `format` est l’axe
que `renderSvg` n’expose pas (`renderSvg` est figé sur `'svg'`). Voir
[Rendu vers d’autres formats](/fr/guide/render-formats) et
[Référence](/reference/) pour l’union `OutputFormat` complète et la forme de
`RenderOptions`.

#### `inlineImages`

`RenderOptions.inlineImages` (`false` par défaut) incorpore les images externes
sous forme d’URI `data:` au lieu du passage direct brut `xlink:href="src"`. Il
n’a aucun effet tant qu’un résolveur n’est pas enregistré via
`setImageResolver` (ci-dessus) — ni sur les formats autres que SVG. S’il n’est
pas défini, la sortie est identique octet pour octet à celle d’avant
l’existence de cette option.

```ts
import { setImageResolver } from '@knowvah/dot-engine';
import { render } from '@knowvah/dot-engine/render';
import { parse } from '@knowvah/dot-engine';

setImageResolver((src) => {
  // Return the bytes for any src your DOT source references via
  // `image="..."` or an HTML <IMG SRC="...">; null for anything else.
  if (src === 'logo.png') return fetchLogoBytesSync(); // Uint8Array
  return null;
});

const g = parse('digraph { a [image="logo.png" shape=none label=""]; }');
const svg = render(g, 'svg', { inlineImages: true });
// svg now embeds `xlink:href="data:image/png;base64,..."` for the `a` node
// instead of `xlink:href="logo.png"`.
```

Voir [Travailler avec des images](/fr/guide/images) pour le guide complet, y
compris la résolution depuis `fetch` dans le navigateur et depuis le système de
fichiers dans Node.

### `renderAsync`

```ts
function renderAsync(
  g:      Graph,
  format: OutputFormat,
  opts?:  AsyncRenderOptions,
): Promise<{ output: string; fontIssues: FontIssue[] }>;

interface AsyncRenderOptions extends RenderOptions {
  imageSizer?: (src: string) => Promise<{ w: number; h: number } | null>;
  imageResolver?: (
    src: string,
  ) => Promise<{ bytes: Uint8Array; mime?: string } | Uint8Array | null>;
  fontTimeoutMs?: number; // default 3000
  fontSet?: FontSetLike;  // default document.fonts when present
}
```

Contrepartie asynchrone de `render` : mêmes formats et mêmes options
`engine`/`inlineImages`, plus des hooks d’image asynchrones par appel et le
préchargement des polices. Chaque hook d’image s’exécute au plus une fois par
`src` distinct ; une levée d’exception ou un rejet vaut échec de résolution.
La sortie est du balisage non assaini pour les formats à balisage ; voir la
section « Security » du README.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Dispose `g`, rend en xdot et renvoie un tableau plat et typé d’opérations de
dessin — formes de nœuds, segments de texte, couleurs et polices sous forme de
valeurs d’union discriminée (discriminez sur `op.kind` dans un `switch`) — pour
alimenter un moteur de rendu canvas/WebGL/PDF personnalisé sans toucher au SVG
ni à l’encodage en chaîne de xdot. `opts.engine` vaut par défaut
`DEFAULT_DRAW_ENGINE` (`'dot'`).

- **Lève** `ParseError` si la sortie xdot intermédiaire ne peut pas être
  réanalysée (un bogue de dot-engine ; non attendu en pratique) ; `RenderError`
  en cas d’échec de disposition ou de rendu ; `InternalError` pour tout autre
  bogue de dot-engine ; `TypeError` avec un `code` pour des arguments
  invalides. Voir [Erreurs et exceptions](/fr/guide/errors).

Voir [Rendu personnalisé avec xdot](/fr/guide/xdot-drawops) pour la liste des
types d’opérations et un exemple canvas détaillé, et [Types](/fr/guide/types) /
[Référence](/reference/) pour l’union `XdotOp` complète et les formes
`Xdot`/`XdotColor`.
