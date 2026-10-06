---
sourceHash: 96b80725180c7f6708fcc435c4ad98ed934b7e558b1db664f454212b152ed64d
---
# Utilisation dans le navigateur

@knowvah/dot-engine n’utilise aucune API propre à Node et peut être empaqueté sans risque pour le navigateur. Cette
page couvre les deux points à connaître lors d’une exécution côté client.

## Empaquetage

La bibliothèque est composée de modules ES simples. N’importe quel bundler moderne (Vite, esbuild, Rollup,
webpack) peut l’inclure. Il n’y a aucune dépendance d’exécution à externaliser et aucun
artefact WASM à héberger.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

Le [bac à sable](/fr/playground) de ce site fait exactement cela — il importe le
moteur et appelle `renderSvg` dans le navigateur, sans aller-retour avec un serveur.

## Mesure du texte

Graphviz a besoin des dimensions du texte pour dimensionner les étiquettes. @knowvah/dot-engine s’en charge
automatiquement :

- **Dans le navigateur** (lorsque `document` existe), il mesure le texte avec le
  contexte 2D natif de `<canvas>` — fidèle à l’hôte, puisqu’il s’agit de la même police que celle avec laquelle le
  navigateur rend le SVG.
- **Sous Node**, il utilise par défaut le mesureur intégré **Estimate** — un
  modèle déterministe, utilisable sans interface, qui reproduit l’`estimate_textspan_size` propre à Graphviz.
  Aucune installation de `canvas` ni fichier de police n’est nécessaire pour
  obtenir une disposition correcte sous Node ; un mesureur à table de correspondance (LUT) avec hinting est aussi
  disponible en option pour un dimensionnement plus proche de l’hôte sans dépendance
  canvas native. Voir [Mesure du texte](/fr/guide/text-measurement) pour savoir comment
  sélectionner explicitement un mesureur.

Aucun fichier de police n’est nécessaire pour la disposition, dans tous les cas.

## Polices web : pourquoi le préchargement compte

Les tailles d’étiquettes proviennent de la mesure du texte avec une police. Si une police est déclarée avec
`@font-face` mais n’a pas fini de se charger, le navigateur mesure avec la police de
**repli** à la place, et la disposition est fausse une fois la vraie police arrivée.
Mesuré dans Chromium avec JetBrains Mono : une boîte d’étiquette faisait **70,68 pt** de large lorsqu’elle était
mesurée avant le chargement de la police (repli) et **124,8 pt** après son chargement.

Les points d’entrée asynchrones (`renderSvgAsync`, `renderAsync`, `renderSvgInto`) évitent
cela : ils collectent les polices que le graphe va demander, les chargent via
`document.fonts`, et ne lancent la disposition qu’ensuite. `renderSvgAsync` a produit les
mêmes 124,8 pt que la mesure après chargement.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (par défaut `3000`) est un délai unique partagé par toutes les polices, et non
  par police.
- **`fontIssues`** est une liste de `{ face, reason }`. `reason: 'failed'` signifie que la
  police a échoué (par exemple une 404) ou que son chargement a été rejeté ; `reason: 'timeout'`
  signifie qu’elle n’était pas chargée dans le délai `fontTimeoutMs`. Dans les deux cas, la disposition se poursuit
  avec une police de repli. Chaque problème est aussi signalé par `console.warn`. Les problèmes de police ne
  rejettent jamais la promesse.
- **Limite :** seules les familles déclarées avec `@font-face` peuvent être signalées.
  Une police système ou un nom de famille inconnu est considéré comme « chargé » (il n’y a rien
  à attendre), de sorte qu’un `fontname` mal orthographié n’apparaît jamais dans `fontIssues`.
- **Node et les Workers** n’ont pas de `document.fonts` ; le préchargement des polices est donc ignoré et
  `fontIssues` vaut `[]`. Les points d’accroche d’images fonctionnent toujours. Vous pouvez passer un `fontSet`
  (tout objet ayant `load(font)`) pour fournir le vôtre.

## Rendre dans une page : `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

Elle remplace les enfants de l’élément portant l’identifiant donné par le
`<svg>` rendu (renvoyé sous le nom `element`), en utilisant `DOMParser` et `importNode`, jamais
`innerHTML`. Un identifiant manquant rejette avec `ERR_INVALID_ARG_VALUE`. Le SVG est
nettoyé par défaut ; passez `sanitize` pour utiliser votre propre assainisseur ou `trusted: true`
pour ignorer l’assainissement. Voir la section « Security » du README pour ce que le nettoyeur
supprime et conserve, et maintenez une Content-Security-Policy en place.

## Images externes : `setImageSizer`

Lorsqu’une étiquette de type HTML contient une image externe
(`<IMG SRC="logo.png"/>`), Graphviz a besoin des dimensions intrinsèques de cette image pour
dimensionner la cellule. (L’attribut `image=` d’un nœud n’est pas dimensionné : le nœud conserve sa
boîte normale, comme dans Graphviz natif sans interface.) Comme la bibliothèque ne peut pas
lire le système de fichiers, vous fournissez un sizer :

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

Si vos graphes ne référencent jamais d’images externes, vous n’avez pas besoin de l’appeler.
Pour dimensionner les images de façon asynchrone (par exemple en les chargeant), passez plutôt un
`imageSizer` asynchrone à `renderSvgAsync` ; voir [Images](/fr/guide/images).

## Web Workers

La disposition s’exécute de façon synchrone, de sorte qu’un grand graphe bloque le thread sur lequel elle s’exécute. Exécutez-la
dans un Worker pour garder la page réactive. Dans un Worker il n’y a pas de
`document` ; la bibliothèque mesure donc le texte avec un `OffscreenCanvas` et l’API asynchrone
charge les polices via l’ensemble de polices propre au Worker (`self.fonts`).

Les polices d’un Worker sont distinctes de celles de la page : enregistrez-les dans le Worker
avec l’API `FontFace` (les règles CSS `@font-face` n’atteignent pas les Workers).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Rendez avec `renderSvgAsync` (ou `renderAsync`) dans un Worker, et non `renderSvg`,
au moins jusqu’à ce que chaque police web soit chargée. Chromium continue de mesurer une chaîne de police
avec la police de repli si cette chaîne exacte a été mesurée dans le Worker avant
le chargement de la police, même après son chargement ; l’API asynchrone charge les polices avant de
mesurer, elle ne rencontre donc jamais ce cas.

## Ce qu’il ne faut pas attendre

La bibliothèque cible **SVG** (ainsi que les formats texte `json` / `xdot` / `dot` / image map).
La sortie matricielle (PNG/JPG), PostScript/PDF et les backends interactifs/graphiques
sont hors périmètre — convertissez le SVG en aval si vous avez besoin d’un autre format. Voir
[Divergences connues](/fr/divergences) pour les limites complètes du périmètre.

## Grands graphes : pré-rendre en SVG

Les très grands graphes — environ **plus de 10 000 nœuds ou quelques Mo de source DOT** — sont
impraticables à disposer à l’exécution dans le navigateur. La disposition (mincross, ranking,
routage des splines) est sur-linéaire ; il s’agit donc d’un **plafond d’échelle partagé avec
Graphviz amont, et non d’une limitation propre à ce moteur** : sur de telles entrées,
`dot` natif, les builds WASM (`@hpcc-js/wasm-graphviz`) et ce moteur dépassent tous le
délai ou manquent de mémoire de la même façon. (Ce moteur ne fuit **pas** — son
tas par rendu reste plat ; la limite tient strictement à la taille du graphe. Voir le
[tableau de bord des performances](/perf) pour la comparaison mesurée.)

Pour des graphes de cette échelle, **rendez une fois au moment du build et servez le fichier
`.svg` obtenu** plutôt que de disposer dans le navigateur à chaque affichage — le même motif
que vous utiliseriez même avec `dot` natif, puisqu’il est trop lent pour s’exécuter à chaque requête.

Les adaptateurs de site au moment du build de
[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (publiés sur NPM)
font exactement cela :

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), au moment du build
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), au moment du build
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), au moment du build
- `@knowvah/dot-markdown-it` — intégration markdown-it indépendante du framework

Pour les graphes dynamiques fournis par l’utilisateur lorsque le rendu au moment du build n’est pas une option,
limitez le rendu interactif à des graphes de taille raisonnable et mettez en cache le SVG émis.
