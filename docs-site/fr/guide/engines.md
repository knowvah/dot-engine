---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Moteurs de disposition

Les huit moteurs de disposition de Graphviz sont tous enregistrés. Passez le
nom du moteur comme deuxième argument de `renderSvg` :

```ts
renderSvg(dot, 'neato');
```

| Moteur       | Style de disposition                          |
|--------------|-----------------------------------------------|
| `dot`        | Graphes orientés hiérarchiques / en couches   |
| `neato`      | Modèle à ressorts (Kamada–Kawai)              |
| `fdp`        | À forces (force-directed)                     |
| `sfdp`       | À forces multi-échelle (grands graphes)       |
| `circo`      | Circulaire                                    |
| `twopi`      | Radial                                        |
| `osage`      | Par clusters                                  |
| `patchwork`  | Treemap carroyé (squarified)                  |

## Note sur la fidélité

Les moteurs se répartissent en deux classes de conformité (voir
[Conformité](/fr/conformance) pour la définition exacte et le code de
comparaison) :

- **Déterministes** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Soumis à
  la même exigence de **±0,01** : les coordonnées et les tracés numériques
  concordent avec le binaire C natif à ±0,01 pt près, et tout le contenu non
  numérique (balises, couleurs, texte) est strictement identique sur le corpus
  golden.
- **Itératifs** — `neato`, `fdp`, `sfdp`. Des solveurs à forces ou
  multi-échelle qui dépendent de l’ordre d’arrondi en virgule flottante ; ils
  sont donc vérifiés avec une borne plus souple de **±0,5** pt et sur une
  concordance structurelle (même arbre d’éléments) plutôt que sur une égalité
  numérique stricte.

Aucune de ces exigences ne revendique une sortie SVG identique octet pour
octet. Pour les décomptes de réussite actuels et les divergences acceptées
par moteur, voir [Parité](/parity) (avec des pages de détail par moteur) et
[Divergences connues](/fr/divergences).

## Essayer différents moteurs

Choisissez un autre **Moteur de disposition** dans la liste déroulante pour
comparer les dispositions d’un même graphe :

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
