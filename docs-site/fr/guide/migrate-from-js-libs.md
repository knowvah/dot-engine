---
sourceHash: 5733693facb69db8bab3b6997342fc5a9281465757bc64ca4fea3ebec54ebeeb
---

# Migrer depuis d’autres bibliothèques JS pour Graphviz

viz.js / `@viz-js/viz`, `@hpcc-js/wasm` (`@hpcc-js/wasm-graphviz`) et
`d3-graphviz` donnent tous accès à Graphviz depuis JavaScript en compilant le
véritable Graphviz en C vers **WebAssembly** et en l’appelant. @knowvah/dot-engine
est un **portage TypeScript** réalisé de zéro — les moteurs de disposition,
l’analyseur et l’émetteur SVG sont du code source TypeScript, pas un binaire
compilé.

Cette différence est l’argument principal, pas une note de bas de page :

| | Enveloppes WASM (viz.js / `@hpcc-js/wasm` / d3-graphviz) | @knowvah/dot-engine |
|---|---|---|
| Implémentation | Le vrai Graphviz en C, compilé en binaire `.wasm` | Portage TypeScript pur, aucun artefact compilé |
| Initialisation du module | Asynchrone — instancier/attendre le module WASM avant la première utilisation | Aucune — `import` puis appel synchrone |
| Bundle | Livrer un fichier `.wasm` (de quelques centaines de Ko à quelques Mo) en plus du JS | JS seulement, compatible tree-shaking |
| Débogage | Parcourir un blob WASM (ou le source C, si vous l’avez) | Parcourir le vrai TypeScript avec des source maps |
| Modèle de threads | Certains builds exécutent la disposition dans un Web Worker | S’exécute sur le thread appelant, comme n’importe quelle fonction TS |
| Formats de sortie | Ceux avec lesquels le build C sous-jacent a été compilé — typiquement l’ensemble complet de Graphviz, matriciel/PDF compris | SVG + les formats texte DOT/json/xdot/plain/imagemap — voir ci-dessous |

Si votre besoin est « appeler une fonction, obtenir du SVG, sans cérémonie
asynchrone ni fichier WASM à héberger », c’est précisément à cela que sert
@knowvah/dot-engine. Si votre besoin dépend d’une sortie matricielle ou PDF,
consultez [Quand rester sur WASM](#when-to-stay-on-wasm) ci-dessous.

## Différences d’API

Les trois bibliothèques n’ont pas la même forme ; le tableau ci-dessous
présente le cas de migration courant (approximatif — vérifiez dans la
documentation propre à chaque bibliothèque ; voir les références sous chaque
ligne).

| Bibliothèque | Appel typique | Équivalent @knowvah/dot-engine |
|---|---|---|
| `@viz-js/viz` (successeur de viz.js) | `Viz.instance().then(viz => viz.renderSVGElement(dot))` — asynchrone, `Viz.instance()` renvoie une Promise | `renderSvg(dot, 'dot')` — synchrone, aucune étape d’instance ni d’initialisation |
| viz.js 2.x (ancien, `new Viz()`) | `new Viz().renderString(dot)` — renvoie une `Promise<string>` | `renderSvg(dot, 'dot')` — synchrone |
| `@hpcc-js/wasm-graphviz` | `await Graphviz.load()` une fois, puis `graphviz.dot(dot)` (synchrone après le chargement) | `renderSvg(dot, engine)` — aucune étape de chargement ni de préchauffage |
| `d3-graphviz` | `d3.select(sel).graphviz().renderDot(dot)` — lie la sortie au DOM, anime les transitions | `renderSvg(dot, engine)` renvoie une **chaîne** SVG ; vous l’insérez vous-même dans le DOM (par ex. `el.innerHTML = svg`) |

Chaque appel @knowvah/dot-engine de la colonne de droite est **synchrone** — il
n’y a aucun module à attendre, car il n’y a pas de binaire WASM à instancier.
Supprimez tout `await`/`.then()` autour d’un appel @knowvah/dot-engine ; il n’a
jamais été nécessaire.

- La Promise de `Viz.instance()` et la méthode `renderSVGElement()` de
  `@viz-js/viz` sont documentées sur viz-js.com ; confirmé par l’exemple
  d’utilisation publié du projet au moment de la rédaction.
- `new Viz().renderString(dot)` de viz.js 2.x est l’API documentée pour cette
  série de versions (désormais remplacée) ; si vous avez une installation
  récente, vérifiez que vous n’êtes pas en réalité sur `@viz-js/viz`.
- Le couple `Graphviz.load()` / `graphviz.dot()` de `@hpcc-js/wasm-graphviz`
  est confirmé par l’exemple d’utilisation publié du paquet au moment de la
  rédaction. Le paquet distinct, plus ancien, `@hpcc-js/wasm` exposait en outre
  un appel `graphviz.layout(dot, format, engine)` dans des versions passées —
  consultez la documentation de votre version installée avant de vous fier à la
  signature exacte.
- L’enchaînement `.graphviz().renderDot(dot)` de `d3-graphviz`, ainsi que le
  fait qu’il repose en interne sur `@hpcc-js/wasm`, sont confirmés par le README
  publié du projet au moment de la rédaction.

### La liaison au DOM de `renderDot` est hors périmètre ici

`d3-graphviz` fait plus que rendre du SVG : il lie le résultat à une sélection
D3, compare les rendus successifs et anime les transitions entre dispositions.
@knowvah/dot-engine n’a aucune opinion sur le DOM — `renderSvg`/`render`
renvoient une simple chaîne. Si vous voulez des transitions animées à la
d3-graphviz entre deux dispositions, c’est une logique que vous construiriez
au-dessus de deux appels à `renderSvg` et de votre propre comparaison du DOM
(ou continuez à utiliser d3-graphviz pour cette fonctionnalité précise — voir
ci-dessous).

## Obtenir les données de disposition sans analyser un format texte

Les trois bibliothèques WASM peuvent fournir les formats JSON ou texte brut
propres à Graphviz, que vous devez ensuite analyser vous-même pour obtenir les
coordonnées des nœuds et des arêtes. @knowvah/dot-engine évite l’aller-retour
par le texte : appelez `getLayout(g)` (après `render`) pour obtenir directement
un instantané typé et sérialisable en JSON — aucune chaîne `-Tjson`/`-Tplain` à
analyser.

```ts
import { createGraph, render, getLayout } from '@knowvah/dot-engine';

const b = createGraph({ directed: true });
b.addNode('a');
b.addNode('b');
b.addEdge('a', 'b');

render(b.graph, 'svg');
const layout = getLayout(b.graph);
// layout.nodes  → [{ name: 'a', x, y, width, height }, ...]
// layout.edges  → [{ tail: 'a', head: 'b', points: [...] }]
// layout.bounds → { x, y, width, height }
```

Consultez [Lire la géométrie calculée](/fr/guide/geometry) pour la forme
complète de l’instantané, les unités et l’option `yAxis`.

## Quand rester sur WASM {#when-to-stay-on-wasm}

Soyez honnête avec vous-même sur le périmètre : @knowvah/dot-engine cible le
SVG ainsi que les formats texte `dot`/`xdot`/`json`/`plain`/`plain-ext`/`imap`/`cmapx`.
Il n’émet **pas** de formats matriciels (PNG/JPEG/GIF/...) ni PostScript/PDF/EPS
— il s’agit d’une limite de périmètre volontaire, pas d’une lacune simplement
inachevée. Consultez [Divergences connues](/fr/divergences) pour la liste exacte
des non-objectifs.

Si votre application a besoin d’une sortie `-Tpng` ou `-Tpdf` directement depuis
le moteur de disposition, les bibliothèques WASM ci-dessus couvrent toujours ce
cas — comme elles exécutent le vrai Graphviz en C, elles prennent en charge les
formats de sortie avec lesquels ce build a été compilé. Dans ce scénario,
continuez à utiliser la bibliothèque WASM pour ce seul chemin de code, ou
rendez en `'svg'` avec @knowvah/dot-engine et convertissez le SVG en image
matricielle ou en PDF en aval avec un outil distinct.

## Voir aussi

- [Moteurs de disposition](/fr/guide/engines)
- [Rendu vers d’autres formats](/fr/guide/render-formats)
- [Lire la géométrie calculée](/fr/guide/geometry)
- [Divergences connues](/fr/divergences)
- [Premiers pas](/fr/guide/getting-started)
