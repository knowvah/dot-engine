---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Erreurs et exceptions

dot-engine lève deux sortes d’erreurs. Le type d’erreur que vous interceptez
vous indique qui doit changer quelque chose.

## Deux familles, une règle

| Famille | Comment la reconnaître | Signification | Qui agit |
|--------|---------------------|---------|----------|
| Échec de dot-engine | `err instanceof DotEngineError` | dot-engine a échoué sur cette entrée : DOT incorrect, erreur fatale que Graphviz lui-même signalerait, fonctionnalité Graphviz non prise en charge, ou bogue de dot-engine | L’auteur du DOT, ou un rapport de bogue |
| Erreur d’usage | `TypeError` / `RangeError` / `Error` standard avec un `err.code` commençant par `ERR_` | L’appel était incorrect : type d’argument erroné, nom de moteur ou de format inconnu, mauvais ordre d’appel | Le code appelant |

Branchez-vous sur `.code`, pas sur le texte du message. Les messages peuvent
changer d’une version à l’autre ; les codes sont stables.

Les erreurs d’usage ne sont pas des `DotEngineError` et n’implémentent pas
`GvError`. Leur `name` reste `TypeError`, `RangeError` ou `Error`, comme dans
Node.js.

## Référence des classes

Les quatre classes ci-dessous étendent toutes `DotEngineError` et implémentent
la forme `GvError` (`type`, `code`, `message`, `friendlyMessage`, et
éventuellement `location` et `expected`).

### `DotEngineError` (abstraite)

La base commune. `instanceof DotEngineError` est vrai pour toute erreur que
dot-engine lève au sujet de son entrée. Elle ne peut pas être construite
directement. `type`, `code` et `friendlyMessage` sont définis par les
sous-classes.

### `ParseError`

| Élément | Valeur |
|------|-------|
| Levée quand | La source DOT n’est pas valide, ou utilise un mauvais opérateur d’arête pour le type de graphe |
| `type` | `syntax` |
| Codes | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Champs | `location` (`{ line, column, offset? }`), `expected` (attentes de l’analyseur ; `SYNTAX_*` uniquement), accesseurs `line` et `column` |
| Action de l’appelant | Corriger la source DOT. Montrer `location` et `friendlyMessage` à l’auteur |

`GENERIC_ERROR` sur une `ParseError` signifie que la source est imbriquée si
profondément que l’analyseur a épuisé la pile.

### `HtmlParseError`

| Élément | Valeur |
|------|-------|
| Levée quand | N’atteint aujourd’hui jamais un appelant (voir ci-dessous) |
| `type` | `semantic` |
| Codes | `HTML_PARSE_ERROR` |
| Champs | `tag` (le jeton fautif). Pas de `location` ni de `expected` |
| Action de l’appelant | Aucune. Pour repérer une étiquette incorrecte, comparez la sortie rendue à ce que vous attendiez |

L’analyseur d’étiquettes de type HTML lève `HtmlParseError` pour un élément
inconnu, un attribut mal formé ou un `<TABLE>`, `<HR>` ou `<VR>` mal placé.
L’étape de disposition l’intercepte et laisse l’étiquette sans contenu, comme
le fait Graphviz : le graphe est tout de même rendu, avec une étiquette vide.
Aucune fonction publique ne la propage.

`HtmlParseError` n’est pas exportée depuis la racine du paquet. Si l’une d’elles
vous parvenait un jour, `err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'`
permet de l’identifier.

### `RenderError`

| Élément | Valeur |
|------|-------|
| Levée quand | La disposition ou le rendu échoue d’une façon que Graphviz lui-même signalerait, le graphe nomme un moteur de disposition indisponible, ou le graphe utilise une fonctionnalité de Graphviz que dot-engine n’a pas portée |
| `type` | `render` pour `RENDER_ERROR` ; `semantic` pour `UNKNOWN_LAYOUT` et `UNSUPPORTED_FEATURE` |
| Codes | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Champs | `cause` lorsque l’échec a enveloppé une autre erreur. Pas de `location` |
| Action de l’appelant | `RENDER_ERROR` : modifier le graphe. `UNKNOWN_LAYOUT` : corriger l’attribut `layout=`. `UNSUPPORTED_FEATURE` : éviter la fonctionnalité (par exemple sfdp avec `rotation=45` ; voir le [tableau](#unsupported-feature-reference)) |

### `InternalError`

| Élément | Valeur |
|------|-------|
| Levée quand | Une assertion ou un invariant interne à dot-engine échoue, ou une erreur qui n’émane pas de dot-engine s’échappe du pipeline de disposition ou de rendu |
| `type` | `render` |
| Codes | `INTERNAL_ERROR` |
| Champs | `cause` (l’erreur d’origine, lorsqu’une erreur a été enveloppée) |
| Action de l’appelant | Signaler un bogue avec la source DOT qui l’a déclenché |

Rien de ce que l’auteur du DOT peut modifier n’évitera de façon fiable une
`InternalError`.

## Référence des codes

### `GvErrorCode`

| Code | Classe | `type` | Signification | Cause typique | Action de l’appelant | Levé par |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Jeton inattendu | Faute de frappe, `;` ou `}` manquant | Corriger le DOT à `location` | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | La source se termine au milieu d’une instruction | `{`, `[` ou chaîne non fermé | Corriger le DOT à `location` | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` dans un graphe non orienté | `graph { a -> b }` | Utiliser `--` | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` dans un digraph | `digraph { a -- b }` | Utiliser `->` | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Source trop profondément imbriquée pour être analysée | Sous-graphes imbriqués de façon pathologique | Aplatir le DOT | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Étiquette de type HTML mal formée | Élément inconnu, attribut incorrect | Aucune : l’étiquette est rendue vide | Aucun (interceptée en interne) |
| `RENDER_ERROR` | `RenderError` | `render` | Une erreur fatale de disposition ou de rendu que Graphviz signalerait aussi | Entrée mal formée pour une étape de disposition | Modifier le graphe | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | L’attribut `layout=` du graphe ne nomme aucun moteur enregistré | `layout="foo"` | Corriger l’attribut | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | Le graphe demande une fonctionnalité de Graphviz que dot-engine n’a pas portée | sfdp avec `rotation=45` | Éviter la fonctionnalité | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | Bogue de dot-engine | Assertion échouée, levée d’exception étrangère | Signaler un bogue | `renderSvg`, `render`, `getDrawOps`, méthodes du constructeur, `GvcContext.layout` (non enveloppée) |

### `UsageErrorCode`

| Code | Classe | Signification | Cause typique | Action de l’appelant | Levé par |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Mauvais type, `null`, ou argument obligatoire manquant | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Corriger l’appel | Toute fonction publique qui prend des arguments |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Bon type, valeur inconnue | Nom de moteur ou de format non enregistré ; `getLayout(g, { yAxis: 'other' })` | Utiliser un nom enregistré ou une valeur autorisée | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Argument numérique hors de sa plage | Réservé | Corriger l’appel | Aucune fonction publique ne la lève aujourd’hui |
| `ERR_INVALID_STATE` | `Error` | Appel effectué dans le mauvais état | `getLayout` avant la disposition | Disposer d’abord (`render(g, ...)` ou `ctx.layout`) | `getLayout` |

Un argument de moteur non enregistré est rejeté même lorsque la source DOT
définit un attribut `layout=` valide. L’argument est vérifié en premier.

## Référence des erreurs `UNSUPPORTED_FEATURE` {#unsupported-feature-reference}

Chacune des valeurs d’attribut ci-dessous fait lever à la disposition une
`RenderError` avec le code `UNSUPPORTED_FEATURE` là où Graphviz natif
exécuterait un algorithme que dot-engine n’a pas porté. L’alternative était de
rendre une disposition qui diffère de celle de Graphviz sans le dire. La
vérification ne se déclenche que lorsque la condition de la colonne « Se
déclenche quand » est remplie ; le même attribut ailleurs est rendu
normalement. Pour éviter l’erreur, retirez l’attribut ou remplacez-le par une
valeur prise en charge.

| Moteur | Attribut et valeur | Se déclenche quand | Fonctionnalité Graphviz requise |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | Toujours (une fois que le graphe a 2 nœuds ou plus et que `maxiter` n’est pas négatif) | Majoration de stress hiérarchique (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Seulement lorsque Graphviz construirait des contraintes : `diredgeconstraints` est vrai ou `hier*`, `overlap=ipsep`, ou le graphe a un cluster de premier niveau. Sans contraintes, il s’exécute comme une majoration de stress, comme dans Graphviz | Majoration contrainte (`stress_majorization_cola`) |
| neato | `start=self` | `mode` vaut `major` (la valeur par défaut) ou `ipsep` | Initialisation intelligente (`smart_ini`). Avec `mode=KK` ou `mode=sgd`, il journalise `start=0 not supported with mode=self - ignored` une fois par rendu, comme Graphviz |
| neato | `model=subset` | `mode` vaut `major` ou `KK` | Le modèle de distance subset |
| neato | `model=circuit` | `mode` vaut `major`, ou `KK` sur un graphe connexe. `KK` sur un graphe non connexe sans `pack` ni `packmode` journalise un avertissement et utilise les plus courts chemins, comme Graphviz | Le modèle de distance circuit (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (insensible à la casse) | Le graphe (pour twopi, une composante ; pour sfdp, le graphe entier ou une composante) a 2 nœuds ou plus et le décompte de chevauchements propre à Graphviz (`countOverlap`, qui teste les polygones des nœuds) est supérieur à 0. Les nœuds qui ne se touchent que par leur boîte englobante ne le déclenchent pas. circo n’y parvient que pour un graphe à une seule composante (avec plusieurs composantes, Graphviz ignore aussi `overlap`). sfdp n’y parvient que lorsque `overlap` n’est pas un mode prism | Suppression des chevauchements par Voronoï (`vAdjust`) |
| fdp | `overlap=` l’un de `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | Le mode est atteint après les essais d’itérations de forces `N:`, c’est-à-dire lorsque ces essais ne suppriment pas tous les chevauchements (ou que `N` vaut 0 ou est absent). Le préfixe `N:` est autorisé, par exemple `3:voronoi` | L’algorithme d’ajustement `removeOverlapWith` correspondant |
| fdp | `splines=compound` | Toujours, avec ou sans clusters | Routage des arêtes évitant les clusters (`compoundEdges`) |
| sfdp | `smoothing=` toute valeur sauf `none` ou `0` | Toujours | `post_process_smoothing` |
| sfdp | `rotation=` tout nombre non nul | Toujours | `rotate()` avant la suppression des chevauchements |
| sfdp | `label_scheme=1` à `4` | Un nœud nommé `|edgelabel|...` existe, `overlap` se résout en mode `prism`, et soit le schéma vaut 3 ou 4, soit le schéma vaut 1 ou 2 et les essais prism sont supérieurs à 0 (`overlap=prism` avec un nombre, pas le `prism0` par défaut). Les valeurs supérieures à 4 comptent comme 0. Les étiquettes d’arêtes ordinaires ne le déclenchent jamais | Gestion des nœuds d’étiquettes d’arêtes (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (aussi `0`, `false`) | Tout graphe ayant au moins un nœud. Le message nomme le schéma résolu | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (aussi `2`) | Tout graphe ayant au moins un nœud. Le message nomme le schéma résolu | `spring_electrical_embedding_fast` |
| tous les moteurs | Une forme de nœud dessinée par un cas spécial de `round_corners` qui n’est pas porté | Le nœud utilise cette forme. Message : `special shape N not yet ported` | La branche de dessin `round_corners` de la forme. C’est une garde interne contre un numéro de forme sans cas de dessin ; aucune forme nommée n’est connue pour l’atteindre |

La plupart des messages ont la forme `<attribute>=<value>: <what> is not supported yet`.
Les exceptions sont `smoothing` et `rotation` (qui nomment la routine
manquante), les lignes fdp et la ligne des formes, qui utilisent les
formulations ci-dessus. Branchez-vous sur `err.code === 'UNSUPPORTED_FEATURE'`,
pas sur le texte.

Les valeurs qui sélectionnent le comportement par défaut (par exemple
`quadtree=normal`, `true`, `yes`, `1`) et les valeurs acceptées par Graphviz
qui sont portées (par exemple `start=regular`, `start=random`, `model=mds`,
`mode=KK`, `mode=sgd`, `overlap=prism`, la famille `scale` et, sur neato,
twopi, circo et sfdp, `overlap=oscale`, `vpsc` et les modes `ortho*` /
`portho*`) sont rendues normalement.

## Référence par fonction

« Usage » désigne une `TypeError` avec `ERR_INVALID_ARG_TYPE`, sauf si une
ligne nomme un autre code.

| Fonction | Peut lever |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Usage (`dotSource` ou `engine` n’est pas une chaîne) ; `TypeError` `ERR_INVALID_ARG_VALUE` (moteur non enregistré) ; `ParseError` ; `RenderError` ; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Usage (`dotSource` ou `engine` n’est pas une chaîne) ; `TypeError` `ERR_INVALID_ARG_VALUE` (moteur non enregistré). Rien d’autre : tout échec lié à l’entrée DOT est renvoyé dans `errors` |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` n’est pas une chaîne) ; `ParseError` |
| `render(g, format, opts?)` | Usage (`g`, `format` ou `opts` de mauvais type) ; `TypeError` `ERR_INVALID_ARG_VALUE` (moteur ou format non enregistré) ; `RenderError` ; `InternalError` |
| `getDrawOps(g, opts?)` | Usage (`g` ou `opts` de mauvais type) ; `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` non enregistré) ; `RenderError` ; `ParseError` (le xdot intermédiaire n’a pas pu être réanalysé : un bogue de dot-engine) ; `InternalError` |
| `createGraph(opts?)` et méthodes du constructeur (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Usage (types d’arguments incorrects, y compris des valeurs d’attribut qui ne sont pas des chaînes) ; `InternalError` (le modèle de graphe n’a pas pu créer un nœud ou un sous-graphe) |
| `addEdge(g, tail, head, name?)` (depuis `/api`) | Usage (`g`, `tail` ou `head` qui n’est pas un objet ; `name` qui n’est pas une chaîne) |
| `getLayout(g, opts?)` | Usage (`g` ou `opts` n’est pas un objet) ; `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` différent de `'up'` ou `'down'`) ; `Error` `ERR_INVALID_STATE` (graphe non disposé) |
| `new GvcContext(measurer, options?)` | Usage (`measurer` n’a pas de fonction `measure` ; `options` n’est pas un objet) |
| `ctx.register(plugin)` | Usage (ce n’est ni un greffon de rendu ni un moteur de disposition) |
| `ctx.layout(g, engine)` | Usage (`g` n’est pas un objet, `engine` n’est pas une chaîne) ; `TypeError` `ERR_INVALID_ARG_VALUE` (moteur non enregistré) ; `RenderError` `UNKNOWN_LAYOUT`. Les échecs du moteur se propagent sans enveloppe |
| `ctx.freeLayout(g, engine)` | Usage ; `TypeError` `ERR_INVALID_ARG_VALUE` (moteur non enregistré). Les échecs du moteur se propagent sans enveloppe |
| `ctx.bestRenderer(format)` | Usage (`format` n’est pas une chaîne) ; `TypeError` `ERR_INVALID_ARG_VALUE` (aucun moteur de rendu pour `format`) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Usage (`ctx` n’est pas un `GvcContext`, `g` n’est pas un objet, `format` n’est pas une chaîne) ; `TypeError` `ERR_INVALID_ARG_VALUE` (aucun moteur de rendu pour `format`). Les échecs de rendu se propagent sans enveloppe |
| `setImageSizer(sizer)` | Usage (n’est ni une fonction ni `null`) |
| `setImageResolver(fn)` | Usage (n’est ni une fonction ni `null`) |
| `setTextMeasurer(measurer)` | Usage (n’est ni un `TextMeasurer` ni `undefined`) |

### Quelles fonctions enveloppent les levées d’exceptions étrangères

| Fonctions | Comportement face à une levée inattendue (hors dot-engine) |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Enveloppée en `InternalError` ; `cause` est l’erreur d’origine |
| `renderWithContext` et toutes les méthodes de `GvcContext` | **Non enveloppée.** Un bogue du moteur parvient à l’appelant tel que le moteur l’a levé, par exemple une `TypeError` simple sans `code` |

Si vous utilisez `GvcContext` directement, considérez une erreur qui n’est ni
une `DotEngineError` ni une erreur d’usage comme un bogue de dot-engine.

## `tryRenderSvg` ou `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| DOT incorrect ou échec de disposition | Lève une `DotEngineError` | Renvoie `{ errors: [one] }` |
| Arguments incorrects | Lève une erreur d’usage | Lève une erreur d’usage |
| Valeur d’erreur | Une `Error` avec une pile d’appels et `cause` | Données simples : `type`, `code`, `message`, `friendlyMessage`, plus `location` / `expected` lorsqu’ils sont présents |
| À utiliser quand | L’échec doit interrompre l’appelant | Vous vous branchez sur `code`, ou envoyez l’erreur à travers `postMessage` ou dans un journal |

`tryRenderSvg` ne lève jamais pour une entrée DOT, quelle qu’elle soit. Elle
ne lève que lorsque les arguments eux-mêmes sont invalides, ce qui est un
bogue du code appelant. Les objets d’erreur qu’elle renvoie ne portent ni
`cause` ni trace d’appels.

## Échecs enveloppés et `cause`

Lorsque `renderSvg`, `render` ou `getDrawOps` intercepte une erreur que
dot-engine n’a pas levée, elle lève une `InternalError` dont `cause` est
l’erreur d’origine. Le `message` est le message d’origine.

`cause` n’est pas énumérable, donc `JSON.stringify(err)` l’omet. Parcourez la
chaîne explicitement lorsque vous journalisez (voir le dernier exemple
ci-dessous).

## Vérifications entre bundles

`instanceof DotEngineError` fonctionne au sein d’une même copie de la
bibliothèque. Si deux copies peuvent être chargées (bundles dupliqués, hôte de
greffons), utilisez `isGvError(e)`. Elle vérifie la présence d’un `type` et d’un
`code` de type chaîne et fonctionne d’une copie à l’autre. Elle accepte aussi
les objets simples renvoyés par `tryRenderSvg`.

## Exemples

Séparer les deux familles :

```ts
import { renderSvg, DotEngineError, ParseError } from '@knowvah/dot-engine';

function renderOrExplain(dot: string): string {
  try {
    return renderSvg(dot, 'dot');
  } catch (err: unknown) {
    if (err instanceof ParseError) {
      const { line, column } = err.location;
      return `DOT error at ${line}:${column}: ${err.friendlyMessage}`;
    }
    if (err instanceof DotEngineError) {
      return `${err.code}: ${err.friendlyMessage}`;
    }
    // A usage error: the call was wrong. Do not swallow it.
    throw err;
  }
}
```

Traiter un résultat de `tryRenderSvg` :

```ts
import { tryRenderSvg } from '@knowvah/dot-engine';

const result = tryRenderSvg('digraph { a ->', 'dot');
if (result.svg !== undefined) {
  console.log(result.svg.length);
} else {
  const [first] = result.errors ?? [];
  console.error(first?.code, first?.location);
}
```

Journaliser une `InternalError` avec sa cause :

```ts
import { InternalError } from '@knowvah/dot-engine';

function describeChain(err: unknown): string[] {
  const lines: string[] = [];
  let current: unknown = err;
  while (current instanceof Error) {
    lines.push(`${current.name}: ${current.message}`);
    current = current.cause;
  }
  return lines;
}

export function logFailure(err: unknown): void {
  if (err instanceof InternalError) {
    // Report this: it is a dot-engine bug. `cause` is the original error.
    console.error(describeChain(err).join(' <- '));
  }
}
```

## Voir aussi

- [Référence de l’API (sélection)](/fr/guide/api) pour la signature de chaque fonction.
- [Types](/fr/guide/types) pour les formes `GvError` et `RenderResult`.
- [API générée (TypeDoc)](/reference/) pour les unions complètes `GvErrorCode` et `UsageErrorCode`.
