---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Mesure du texte

La disposition dot a besoin de la largeur et de la hauteur de chaque étiquette pour dimensionner les nœuds et placer
les arêtes. @knowvah/dot-engine mesure le texte via un unique point d’extension enfichable, le
`TextMeasurer`, et détermine automatiquement lequel utiliser — ou vous pouvez définir le
vôtre.

## Le contrat

Il y a deux objectifs distincts, qui appellent des mesureurs différents :

| Objectif | Mesureur | Déterministe ? | Crénage / mise en forme |
|------|----------|----------------|-------------------|
| **Disposition reproductible** (même sortie partout) | modèle de métriques intégré | oui | non |
| **Disposition fidèle à l’hôte** (correspond à la police de rendu) | le canvas de la plateforme | non (dépend de la police) | oui |

Graphviz natif est lui-même fidèle à l’hôte — sa sortie dépend des polices
installées sur la machine qui l’exécute. @knowvah/dot-engine vous laisse choisir : déterministe
par défaut, fidèle à l’hôte lorsque vous l’activez.

## Résolution automatique

Lorsque vous ne définissez pas de mesureur, @knowvah/dot-engine en choisit un à chaque rendu :

1. un mesureur explicite défini via `setTextMeasurer` (prioritaire s’il est présent) ;
2. **navigateur** (`document` disponible) → le `<canvas>` de la page — fidèle à l’hôte,
   mesurant avec la même police que celle avec laquelle le navigateur rendra le texte SVG ;
3. **Node** → le modèle de métriques déterministe intégré.

La bibliothèque n’a **aucune dépendance d’exécution** et n’importe jamais elle-même de bibliothèque de polices ni
`canvas`, de sorte que le bundle navigateur reste petit et que la valeur par défaut sous Node ne lit jamais
le système de fichiers.

## Mesure fidèle à l’hôte sous Node

Pour une sortie Node dont les boîtes s’ajustent à une police précise (crénage et mise en forme réels),
installez la dépendance de pair optionnelle `canvas` et branchez-la une fois au démarrage :

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` est déclaré comme **dépendance de pair optionnelle** — elle n’est pas installée
sauf si vous la demandez. Lorsque Node se rabat sur le modèle intégré dans un
terminal interactif, @knowvah/dot-engine affiche ce conseil une seule fois ; faites-le taire avec
`GV_FONT_QUIET=1`.

## Mesureurs personnalisés

`setTextMeasurer` accepte tout ce qui implémente `TextMeasurer` :

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

Les implémentations intégrées sont exportées pour être réutilisées : `CanvasTextMeasurer` (enveloppe tout
contexte 2D), `EstimateTextMeasurer` (la référence déterministe, sans hinting, qui
correspond à l’`estimate_textspan_size` de graphviz sans interface — **c’est la valeur par défaut
sous Node**) et `LutTextMeasurer` (une table de correspondance avec hinting par famille de police,
disponible en option pour un dimensionnement plus proche sans dépendance native à `canvas`).

## Pourquoi cette séparation

Le crénage, les ligatures et les largeurs de glyphes non ASCII dépendent des tables de mise en forme
de la police réelle — une table de largeurs par caractère ne peut pas les représenter, et les bonnes valeurs
diffèrent selon la police (une police à chasse fixe rend `<=` sur deux cellules ; une police proportionnelle
rapproche `VA` par crénage). Une disposition reproductible utilise donc un modèle de métriques fixe ;
s’accorder à une vraie police de rendu exige de mesurer avec cette police, ce que fait
le mesureur adossé au canvas.
