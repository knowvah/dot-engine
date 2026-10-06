---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Glossaire

Une définition par terme, classées par ordre alphabétique du terme anglais (les titres
conservent donc l’ordre de la version anglaise). Chacune renvoie à la page du guide (ou au
code source) qui l’aborde en détail.

## Cluster

Un sous-graphe dont le nom commence par `cluster` (par ex. `subgraph cluster_build`) —
Graphviz le rend sous la forme d’une boîte distincte regroupant ses nœuds membres. En interne,
l’instantané de géométrie de @knowvah/dot-engine renomme chaque sous-graphe cluster en un nom
positionnel comme `cluster6` (`ClusterGeometry.name`), et non le nom du source DOT ; un
consommateur qui a besoin du nom d’origine construit donc une table `idByName` avant la
disposition et renomme `snapshot.clusters` ensuite. Voir
[Recettes](/fr/guide/recipes) pour le motif de renommage et
[Construire un graphe](/fr/guide/build-a-graph) pour créer des clusters via `addSubgraph`.

## Conformité

La propriété vérifiée mécaniquement qui sous-tend l’affirmation selon laquelle un rendu de
@knowvah/dot-engine « correspond » à l’oracle C. Une fois les deux SVG analysés en arbres
d’éléments normalisés, chaque valeur numérique (coordonnées, données de tracé, `points`) doit
concorder à une tolérance fixe près — **±0,01 pt** pour les moteurs déterministes
(`dot`, `circo`, `twopi`, `osage`, `patchwork`) et **±0,5 pt** pour les moteurs
itératifs à forces (`neato`, `fdp`, `sfdp`) — et chaque valeur non numérique (balises, couleurs, texte) doit
être strictement identique. Ce n’est pas une revendication de sortie SVG identique octet pour octet. Voir [Conformité](/fr/conformance).

## Repère de coordonnées / axe y

Le système de coordonnées natif de Graphviz a **y vers le haut**, origine dans le coin inférieur
gauche ; les navigateurs et les écrans ont **y vers le bas**, origine en haut à gauche.
`getLayout` utilise par défaut `yAxis: 'down'` (inversant chaque y et normalisant
`bounds` à `(0, 0)`) et accepte `yAxis: 'up'` pour renvoyer inchangées les coordonnées
natives de graphviz. Les opérations de dessin xdot (issues de `getDrawOps`) sont toujours dans le
repère natif y vers le haut. Voir [Lire la géométrie calculée](/fr/guide/geometry).

## Divergence

Une différence entre un rendu de @knowvah/dot-engine et l’oracle qui a été
étudiée, dont la cause racine a été identifiée, et qui a été cataloguée — par opposition à une différence
tolérée en silence. Les divergences cataloguées relèvent de l’une de trois classes : écarts
acceptés (délibérément non rendus conformes, par ex. le non-déterminisme
en virgule flottante entre plateformes), une longue traîne suivie qu’il reste à résorber, et
des non-objectifs explicites. Une différence non listée est traitée comme un défaut, et non comme un comportement
accepté. Voir [Divergences connues](/fr/divergences).

## DOT

Le langage de description de graphes — `digraph { ... }` / `graph { ... }` avec des
instructions de nœuds, d’arêtes et d’attributs — que @knowvah/dot-engine analyse avant de
transmettre le résultat à un moteur de disposition. Voir [Premiers pas](/fr/guide/getting-started).

## Image sizer / resolver

Les deux points d’extension injectables pour les images externes (nœuds usershape et cellules
`<IMG>` des étiquettes HTML). Un `ImageSizer` indique la largeur/hauteur naturelle d’une image afin que le
dimensionnement des nœuds et la disposition des étiquettes puissent se poursuivre sans charger les données de pixels ; un
`ImageResolver` fournit les octets réels de l’image à intégrer au moment du rendu.
Voir [Images](/fr/guide/images).

## Moteur de disposition

L’un des huit algorithmes de disposition que @knowvah/dot-engine enregistre, sélectionné par son nom
(`renderSvg(dot, engine)`) : `dot` (hiérarchique/en couches), `neato`
(modèle à ressorts, Kamada–Kawai), `fdp` (à forces), `sfdp` (à forces
multi-échelle, pour les grands graphes), `circo` (circulaire), `twopi` (radial),
`osage` (par clusters) et `patchwork` (treemap carroyé). Voir
[Moteurs de disposition](/fr/guide/engines).

## Oracle

Le binaire `dot` natif de Graphviz en C, compilé à partir de la source C canonique, par rapport auquel
chaque rendu de @knowvah/dot-engine est validé. @knowvah/dot-engine lance ce
binaire directement (jamais une version WASM) pour éviter toute dérive d’ABI entre la
référence et le portage. Voir [Conformité](/fr/conformance) et
[Parité](/parity) pour savoir comment les comparaisons avec l’oracle sont exécutées et rapportées.

## Rang / rankdir

Dans la disposition hiérarchique de `dot`, un **rang** (rank) est une couche de nœuds placés à la
même profondeur dans le dessin. `rankdir` définit la direction dans laquelle les rangs s’enchaînent — la
valeur par défaut `TB` (de haut en bas), ou `LR`, `BT`, `RL` — définie comme attribut de graphe
(`b.setAttr('rankdir', 'LR')`). Voir [Construire un graphe](/fr/guide/build-a-graph).

## Spline / routage des arêtes

Le chemin courbe (de Bézier) le long duquel une arête est dessinée, calculé par un code de
routage qui contourne les obstacles que sont les nœuds et les clusters. @knowvah/dot-engine expose les
points de contrôle routés sous la forme `EdgeGeometry.points` — un tableau ordonné de
points `{x, y}`, en points — depuis `getLayout`. Voir
[Lire la géométrie calculée](/fr/guide/geometry).

## Mesureur de texte

Le point d’extension injectable (`TextMeasurer`) qui indique la largeur/hauteur des étiquettes afin que le
dimensionnement des nœuds et des étiquettes d’arêtes puisse se poursuivre avant la disposition. @knowvah/dot-engine en résout un
automatiquement à chaque rendu — d’abord un `setTextMeasurer` explicite, puis le
`<canvas>` du navigateur s’il est disponible, puis l’`EstimateTextMeasurer` déterministe
intégré sous Node — ou accepte une implémentation personnalisée. Voir
[Mesure du texte](/fr/guide/text-measurement).

## Usershape

Le terme de Graphviz pour un nœud dont la forme est une image fournie de l’extérieur
(via l’attribut `image`) plutôt qu’un polygone ou une ellipse dessinés.
@knowvah/dot-engine résout les usershapes via le point d’extension injectable
d’image sizer/resolver plutôt que de lire directement des fichiers, ce qui garde la bibliothèque sûre pour le navigateur.
Voir [Images](/fr/guide/images).

## xdot

Le format d’opérations de dessin DOT étendu : un flux structuré d’opérations (définir la
couleur de remplissage/de trait, définir la police, remplir/tracer une ellipse ou un polygone, dessiner une
courbe de Bézier, dessiner du texte) décrivant exactement comment un graphe rendu doit être
peint, dans l’ordre de peinture. `getDrawOps` renvoie ce flux sous forme de valeurs
`XdotOp` typées pour piloter un moteur de rendu personnalisé (canvas, WebGL, PDF) sans analyser
le SVG. Voir [Rendu personnalisé avec xdot](/fr/guide/xdot-drawops).
