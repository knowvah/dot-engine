---
sourceHash: caef116c0b8959819373d82660fc2c5014f4b538fd6e44c6110d42251eff3955
---
# Images

Un nœud avec `image="logo.png"` (ou une cellule `<IMG SRC="logo.png">` d’une étiquette de type HTML)
n’a pas ses pixels intégrés par défaut. @knowvah/dot-engine émet la
source **telle quelle** :

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

Ce qui affiche le SVG — un `<img>`/`<svg>` en ligne dans un navigateur, une coque
Electron, un build de site statique — résout lui-même cet `href`. Cette page explique
comment cet href est dimensionné pendant la disposition, trois manières de faire réellement
apparaître les pixels, et les implications de chacune pour la CSP.

## Comment les images circulent

1. Le graphe déclare `image="logo.png"` sur un nœud, ou une étiquette de type HTML
   contient une cellule `<IMG>`.
2. Pour une cellule `<IMG>` d’étiquette de type HTML, Graphviz a besoin de la **largeur/hauteur
   intrinsèque** de l’image pour dimensionner la cellule avant de pouvoir disposer quoi que ce soit d’autre — la
   bibliothèque ne touche jamais au système de fichiers ni au réseau pour l’apprendre,
   vous enregistrez donc un sizer (`setImageSizer`, présenté dans
   [Utilisation dans le navigateur](/fr/guide/browser) et de nouveau ci-dessous pour Node). L’attribut
   `image=` d’un nœud n’est **pas** dimensionné par le sizer : comme Graphviz
   natif sans interface, le nœud conserve sa boîte normale et l’image y est dessinée.
3. La disposition s’exécute avec les dimensions que votre sizer a renvoyées pour chaque `<IMG>`.
4. L’émetteur SVG (`usershape()` dans `src/render/svg.ts`) écrit
   `<image xlink:href="...">` avec la boîte calculée à l’étape 3. Par défaut, le
   `href` est la chaîne `src` brute, échappée en XML, rien de plus.
5. Facultativement — si vous avez appelé `setImageResolver` et rendu avec
   `{ inlineImages: true }` — l’émetteur écrit à la place
   `xlink:href="data:<mime>;base64,<bytes>"`, une URI `data:` autonome.
   C’est un ajout ; ce n’est pas ce que fait Graphviz natif.

Le dimensionnement et l’inlining sont deux points d’extension indépendants, enregistrés séparément : vous pouvez
dimensionner les images sans les inliner (le cas courant — héberger le fichier), ou faire
les deux (SVG autonome).

## Dimensionner sous Node et dans le navigateur

`setImageSizer` prend `(src: string) => { w: number; h: number } | null` et
est consulté une fois par source `image=`/`<IMG>` distincte pendant la disposition. C’est un
enregistrement global au processus, selon le même modèle que `setImageResolver` ci-dessous — appelez-le
une fois avant `render()`/`renderSvg()`.

**Navigateur** — mesurez l’image réelle, puisque vous disposez déjà de `Image` et
de `decode()` :

```ts
import { setImageSizer } from '@knowvah/dot-engine';

const cache = new Map<string, { w: number; h: number }>();

async function warmImageSizes(sources: string[]): Promise<void> {
  for (const src of sources) {
    const img = new Image();
    img.src = src;
    await img.decode();
    cache.set(src, { w: img.naturalWidth, h: img.naturalHeight });
  }
}

// setImageSizer itself must be synchronous, so pre-warm the cache first
// (e.g. await warmImageSizes([...]) before calling render/renderSvg).
setImageSizer((src) => cache.get(src) ?? null);
```

`setImageSizer` est un callback synchrone — il n’y a aucun `await` à l’intérieur —
le chemin navigateur pré-résout donc les dimensions (via `decode()`) dans un cache
avant l’exécution de la disposition, puis lit ce cache de façon synchrone.

**Node** — il n’y a pas de `Image` du DOM, et la bibliothèque ne lira pas le
système de fichiers à votre place. Soit vous codez en dur les dimensions connues, soit vous les lisez vous-même
(par ex. depuis un manifeste, ou un analyseur léger d’en-têtes PNG/JPEG que vous fournissez) et
transmettez le résultat de la même manière :

```ts
import { setImageSizer } from '@knowvah/dot-engine';
import { readFileSync } from 'node:fs';

// Simplest: fixed dimensions known ahead of time.
setImageSizer((src) => (src === 'logo.png' ? { w: 64, h: 64 } : null));

// Or: derive dimensions in your app layer (disk, S3 head request, a
// manifest file you maintain) and hand back the result synchronously.
const manifest = new Map(
  Object.entries(JSON.parse(readFileSync('image-manifest.json', 'utf8'))),
);
setImageSizer((src) => (manifest.get(src) as { w: number; h: number }) ?? null);
```

Si vos graphes ne référencent jamais d’images externes, ignorez complètement cette étape.

## Sizer et resolver asynchrones (par rendu)

`setImageSizer` / `setImageResolver` sont des enregistrements synchrones et globaux au processus,
de sorte que le motif navigateur ci-dessus doit pré-chauffer un cache. Les points d’entrée
asynchrones prennent les hooks **à chaque appel** et les attendent pour vous :

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg } = await renderSvgAsync(
  'digraph { a [label=<<TABLE><TR><TD><IMG SRC="logo.png"/></TD></TR></TABLE>>] }',
  'dot',
  {
    imageSizer: async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return { w: img.naturalWidth, h: img.naturalHeight };
    },
    inlineImages: true,
    imageResolver: async (src) => {
      const res = await fetch(src);
      return { bytes: new Uint8Array(await res.arrayBuffer()), mime: res.headers.get('content-type') ?? undefined };
    },
  },
);
```

- Chaque hook est appelé **au plus une fois par `src` distinct**, en parallèle, avant
  le début de la disposition. Le moteur exécute ensuite sa disposition synchrone normale sur les
  résultats collectés.
- Un hook qui **lève une exception ou rejette** est traité comme un échec (`null`), exactement comme un
  hook synchrone renvoyant `null` : taille nulle pour le sizer, transmission du `src` brut pour
  le resolver.
- Lorsqu’un hook asynchrone est fourni, un échec ne se rabat **pas** sur le
  `setImageSizer` / `setImageResolver` global. Lorsqu’il n’est pas fourni, les globaux s’appliquent
  comme dans `renderSvg`.
- Les hooks ne s’appliquent qu’à ce rendu ; rien de global n’est enregistré.
- `imageResolver` n’est consulté que lorsque `inlineImages` vaut `true`.
- `renderSvgInto` accepte les mêmes options.

## Faire apparaître l’image

Le dimensionnement règle la disposition ; il ne fait pas apparaître les pixels là où le
SVG finit par être affiché. Choisissez l’une de trois approches.

### 1. Héberger le fichier

Servez l’image à une URL (ou un chemin relatif à l’endroit où le SVG est
affiché) que le navigateur/consommateur peut récupérer. C’est l’option la plus simple et
elle ne demande aucun travail supplémentaire au rendu — mais le contexte d’affichage doit pouvoir
atteindre cette origine, et si le SVG est affiché quelque part avec une CSP `img-src` stricte, cette
origine doit aussi y être autorisée (voir ci-dessous).

### 2. Inliner sous forme d’URI `data:`

Utilisez l’API d’inlining pour produire une chaîne SVG autonome sans aucune
récupération externe : `setImageResolver` fournit les octets bruts, et
`render(g, 'svg', { inlineImages: true })` les intègre.

```ts
import { render, setImageResolver } from '@knowvah/dot-engine';
import type { ImageResolver } from '@knowvah/dot-engine';

const images = new Map<string, Uint8Array>([
  ['logo.png', /* Uint8Array of the PNG bytes, e.g. fetched or bundled */ new Uint8Array()],
]);

const resolver: ImageResolver = (src) => images.get(src) ?? null;

setImageResolver(resolver);

const svg = render(g, 'svg', { inlineImages: true });
```

`ImageResolver` peut aussi renvoyer `{ bytes: Uint8Array; mime?: string }` lorsque
vous voulez indiquer explicitement un type MIME (l’émetteur en déduit sinon un
à partir de l’extension du fichier source — `.png` → `image/png`, `.svg` →
`image/svg+xml`, etc., avec repli sur `application/octet-stream` pour les
extensions inconnues). Appelez `setImageResolver(null)` pour effacer l’enregistrement.

::: tip
Préférez l’inlining lorsque le SVG voyage vers un endroit qui ne peut pas récupérer de ressources
externes au moment de l’affichage — clients de messagerie, documents hors ligne, intégration à CSP stricte,
ou partout où vous voulez une unique chaîne autonome sans requête réseau supplémentaire. Le
compromis est la taille de la sortie : le base64 gonfle l’image d’environ 33 %, et
elle est dupliquée dans chaque SVG qui la référence (aucune réutilisation du cache du navigateur
entre les rendus).
:::

`inlineImages` vaut `false` par défaut ; sans le définir, la sortie est identique octet pour octet
à la transmission d’avant l’inlining. Il n’affecte que le format `svg` — il n’a aucun effet
sur `json`/`xdot`/`dot`/les autres formats texte. Un échec (aucun resolver enregistré, ou
le resolver renvoie `null` pour ce `src`) se rabat automatiquement sur la transmission du
`src` brut — l’inlining se dégrade en douceur, il ne lève jamais d’exception.

### 3. Répertoires de base de type `imagepath`

L’attribut de graphe `imagepath` de Graphviz natif indique au binaire C un
répertoire de recherche de type système de fichiers/`GDFONTPATH` par rapport auquel résoudre les valeurs
`image=` relatives. @knowvah/dot-engine n’implémente pas `imagepath` — le portage ne lit jamais
lui-même les données d’image depuis le disque, il n’y a donc aucun chemin par rapport auquel résoudre
(voir [Divergences connues](/fr/divergences) pour les limites complètes du périmètre). Si vos
graphes utilisent des chemins `image=` relatifs, résolvez-les par rapport à votre propre
répertoire/URL de base dans la couche qui construit le source DOT ou dans vos
callbacks `setImageSizer`/`ImageResolver` — les deux reçoivent la chaîne `src` brute
exactement comme écrite dans le graphe ; lui ajouter en préfixe un chemin de base
avant la recherche est donc un motif normal et autorisé.

## Conseils sur la CSP

Si vos graphes sont fournis par les utilisateurs (un bac à sable, une intégration qui rend
du DOT arbitraire), réfléchissez dès le départ à la politique `img-src` de la page.

**Les images inlinées (URI `data:`)** n’exigent que :

```
img-src 'self' data:
```

Comme en-tête de réponse HTTP :

```
Content-Security-Policy: img-src 'self' data:
```

Ou comme balise meta dans la page qui héberge le SVG :

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

C’est strict — aucun hôte d’images externe n’est jamais contacté, car les octets
sont déjà intégrés à la chaîne SVG.

**Les images hébergées (option 1 ci-dessus)**, en revanche, exigent que le contexte d’affichage
récupère les images là où elles se trouvent réellement. Si un graphe fourni par l’utilisateur peut
référencer une URL `image=` arbitraire, autoriser chaque hôte possible est
souvent irréaliste, de sorte qu’une page de bac à sable/d’intégration peut avoir besoin de quelque chose de permissif :

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
Ne faites jamais de `img-src *` (ni d’aucun `img-src` tout aussi permissif) votre valeur par défaut **à l’échelle du site**.
Limitez-le à la page de bac à sable/d’intégration précise qui doit rendre
des graphes arbitraires fournis par les utilisateurs, traitez-le comme un assouplissement délibéré et documenté
pour cette seule page, et gardez strict le CSP de toutes les autres pages. Un
`img-src` permissif permet à un graphe malveillant d’exfiltrer des données via des canaux auxiliaires d’URL d’image
(par ex. en encodant des données dans les paramètres de requête vers un hôte contrôlé par
l’attaquant) ou de charger du contenu distant indésirable. Si vous maîtrisez
l’ensemble des images, préférez l’inlining (`data:`) et conservez `img-src 'self'
data:` partout.
:::

## Images manquantes

Si `setImageSizer` renvoie `null` (ou si aucun sizer n’est enregistré) pour une
source référencée, @knowvah/dot-engine suit le même chemin fidèle au C que l’échec de
`gvusershape` de Graphviz natif : il émet un avertissement et traite l’image comme de **taille
nulle**, ce qui affecte la disposition de la boîte du nœud calculée autour d’elle. Si
`setImageResolver`/`inlineImages` est en jeu et que le resolver échoue, l’
émetteur se rabat sur la transmission du `src` brut au lieu d’inliner — le
`href` est quand même écrit, mais il ne se résoudra pas à moins que quelque chose d’autre dans la
page puisse le récupérer. Voir [Divergences connues](/fr/divergences) pour ce qui est dans le
périmètre ou en dehors pour la gestion des images/matriciel en général.
