---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Graphviz, en TypeScript pur
  tagline: DOT en entrée, SVG en sortie — sans C. Sans binaire Graphviz natif, sans WASM. TypeScript pur, exécuté dans le navigateur.
  actions:
    - theme: brand
      text: Commencer
      link: /fr/guide/getting-started
    - theme: alt
      text: Ouvrir le bac à sable
      link: /fr/playground
    - theme: alt
      text: Voir sur GitHub
      link: https://github.com/knowvah/dot-engine
features:
  - title: Fidèle au Graphviz en C
    details: Un portage ligne à ligne de l’implémentation canonique en C. Le moteur dot correspond au binaire natif avec une tolérance déterministe très serrée (±0,01 sur les coordonnées, contenu non numérique strictement identique) sur le corpus golden.
  - title: Natif pour le navigateur, aucune dépendance d’exécution
    details: Pas de C — ni binaire Graphviz natif, ni portage WASM, ni serveur de rendu. Le moteur de disposition lui-même est écrit en TypeScript — empaquetez-le et livrez.
  - title: Les huit moteurs de disposition
    details: dot, neato, fdp, sfdp, circo, twopi, osage et patchwork — rendus en SVG.
  - title: Disposition et géométrie par programmation
    details: Ne vous contentez pas du rendu — relisez les positions calculées des nœuds, les splines des arêtes et les limites des clusters sous forme d’un instantané JSON sérialisable via getLayout(), sans avoir à analyser -Tplain.
---

## Essayez

L’éditeur ci-dessous exécute la vraie bibliothèque, dans votre navigateur.
Modifiez le DOT à gauche ; le SVG se met à jour en direct.

<Playground height="360px" />

## Choisissez votre parcours

Nouveau ici ? Choisissez la porte qui correspond à ce que vous faites :

| Je veux… | Commencer ici |
| --- | --- |
| Comprendre comment les pièces s’articulent | [Vue d’ensemble — le modèle mental](/fr/guide/overview) |
| Installer et rendre mon premier graphe | [Premiers pas](/fr/guide/getting-started) |
| Résoudre une tâche concrète | [Livre de recettes](/fr/guide/recipes) |
| Chercher une fonction ou un type | [Référence de l’API](/fr/guide/api) · [Types](/fr/guide/types) |
| Expérimenter sans rien installer | [Bac à sable](/fr/playground) |

Vous venez d’un autre outil ? Voir [Depuis la CLI `dot` en C](/fr/guide/migrate-from-c-cli)
ou [Depuis les bibliothèques JS pour Graphviz](/fr/guide/migrate-from-js-libs).

Pour des signatures exhaustives et générées automatiquement, consultez la
[référence de l’API générée](/reference/). Vous voulez intégrer des graphes rendus dans une page ?
Lisez [Travailler avec des images](/fr/guide/images) pour l’inlining des images et les conseils sur la CSP.
