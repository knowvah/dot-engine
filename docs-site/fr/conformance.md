---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Conformité : ce que « correspondre » veut dire {#conformance-what-match-means}

@knowvah/dot-engine est validé face au binaire C canonique de Graphviz, utilisé comme oracle.
Lorsque ce projet dit qu’un graphe **correspond** à C — le verdict de parité
nommé `conformant` —, cela désigne une propriété précise, vérifiée mécaniquement, et **non**
une égalité littérale octet pour octet du texte SVG.

> **Définition.** Un rendu du portage est **conforme** au rendu de l’oracle lorsque,
> après analyse des deux SVG en un arbre d’éléments normalisé :
>
> 1. chaque valeur **numérique** (coordonnées, données de chemin, `points`, `viewBox`,
>    paramètres de `transform`) concorde avec l’oracle dans une **tolérance**
>    fixe, et
> 2. chaque valeur **non numérique** (noms de balises, couleurs, contenu textuel, clés
>    d’attributs, valeurs d’attributs énumérées) est **exactement égale**.
>
> Si une valeur numérique dépasse la tolérance, ou si une valeur non numérique
> diffère, le rendu n’est **pas** conforme.

## Pourquoi pas des octets littéraux ? {#why-not-literal-bytes}

Le SVG sérialise les coordonnées en virgule flottante sous forme de texte décimal. Deux rendus
mathématiquement équivalents peuvent néanmoins différer au dernier chiffre imprimé à cause de
l’arrondi IEEE-754, de l’ordre des opérations en virgule flottante et du comportement de
`libm`/FMA propre à chaque plateforme, qui varie selon le processeur et le moteur JS. Un critère
d’égalité littérale des octets serait donc **infaisable à tester** sur les environnements
d’exécution que cette bibliothèque cible (navigateurs, Node, processeurs
différents), plutôt que simplement strict. La conformité fixe la propriété qui compte
réellement — la géométrie et le contenu que voit un lecteur — à une borne
assez petite pour être infra-perceptible.

## La tolérance exacte {#the-exact-tolerance}

La tolérance est définie **par classe de moteur**, dans
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts) :

| Classe | Tolérance (pt) | Moteurs |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

Les moteurs déterministes reproduisent pour l’essentiel exactement les coordonnées entières/imprimées de C,
si bien que ±0.01 n’absorbe que le bruit de formatage décimal. Les moteurs
itératifs (à forces) dépendent de fonctions transcendantes dont les résultats au dernier bit
ne sont pas reproductibles d’une plateforme à l’autre ; ils portent donc une borne plus lâche et
sont en outre vérifiés pour l’égalité **structurelle** (même arbre d’éléments).

Une réserve pour la surface **plain/plain-ext** : plain imprime les coordonnées en
pouces avec 5 chiffres significatifs (`%.5g`), si bien que pour des grandeurs ≥ 100 le quantum
d’impression (0.01) égale la tolérance de ±0.01. Sur de très grands graphes, une différence de
disposition inférieure à l’ULP qui tombe sur une frontière d’arrondi du 5e chiffre
est imprimée comme un plein pas de 0.01 et signalée, alors que la géométrie sous-jacente
est identique à ~1e-11 pt près (voir l’acceptation circo `2108`,
journal 2026-07-28). Les surfaces xdot/json, qui impriment en points, sont la
comparaison de géométrie de référence dans ce régime.

Le **relevé de parité du corpus** évalue chaque graphe en mode `deterministic`
(±0.01) quel que soit le moteur — voir
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## Lire le code {#read-the-code}

La définition ci-dessus n’est pas une aspiration rédigée en prose — c’est exactement ce que fait
le code de comparaison. Pour le vérifier vous-même :

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (le tableau ±0.01 / ±0.5), et `compareSvg`, qui parcourt les deux
  arbres normalisés et applique la règle (1) numérique-dans-la-tolérance et la règle (2)
  non-numérique-exact attribut par attribut.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — comment le SVG brut est analysé en arbre d’éléments comparable.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — `diffVerdict`, qui attribue l’un des verdicts ci-dessous. `survey.ts` ne couvre
  que la piste SVG de `dot`.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — le relevé **xdot** par moteur (`npx tsx test/corpus/engine-walk.ts <engine>`),
  qui applique la même séparation de classes que le tableau ci-dessus
  (`TOLERANCE = 0.5` pour `neato`/`fdp`/`sfdp`, `0.01` pour tout autre moteur)
  et compare des flux d’opérations de dessin sémantiques (`compareXdot`) plutôt que du SVG. C’est
  ainsi que sont mesurées les pistes `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp` ;
  la propre piste xdot de `dot` utilise l’outil frère
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts).

## Les verdicts {#the-verdicts}

Le relevé attribue à chaque graphe exactement un verdict. Compteurs à jour par piste :
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
récapitule chaque piste moteur × surface (déterministe comme itérative) ;
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
est le tableau de bord SVG de `dot`, et chaque autre moteur possède son propre
tableau de bord `PARITY-<engine>.md` à côté, dans `test/corpus/` :

| Verdict | Signification |
|---|---|
| **`conformant`** | Concorde avec l’oracle selon la définition ci-dessus (numérique dans la tolérance, non numérique exact). |
| **`structural-match`** | Même arbre d’éléments, mais une ou plusieurs valeurs numériques dépassent la tolérance. |
| **`diverged`** | Les arbres d’éléments diffèrent (un élément manquant/en trop ou une différence non numérique). |
| **`errored` / `timeout`** | Le portage n’a pas pu rendre l’entrée (`errored` ; `port-error` sur les pistes par moteur) ou a dépassé son budget de temps (`timeout`). Compté comme un échec : figure au dénominateur du pourcentage de réussite, jamais comme une réussite. |
| **`oracle-error`** | L’oracle C n’a pas pu rendre l’entrée, il n’y a donc aucune référence avec laquelle comparer. Hors périmètre : exclu du dénominateur du pourcentage de réussite. |

Le **pourcentage de réussite** de chaque tableau de bord est `conformant / (surveyed − oracle-error)`.

« Conformant » est le seuil ; « structural-match » est un progrès significatif (bonne forme,
coordonnées encore en dérive) ; « diverged », « errored » et « timeout » sont de vrais écarts.
Aucun de ces verdicts n’affirme une sortie identique à l’octet.

Certains graphes ne portent **aucun verdict** sur un moteur donné : voir les
*exclusions de moteur* ci-dessous.

### Exclusions de moteur {#engine-exclusions}

Un couple (graphe, moteur) exclu n’est pas parcouru ; il n’est donc ni conforme ni
divergent — il n’est simplement pas mesuré là. Cela se distingue d’un écart
accepté, où la comparaison *a bien eu lieu* et où la différence est pardonnée avec
une cause documentée.

Le seuil est volontairement élevé, car un graphe non examiné est un trou de couverture
et non un coût connu. Une entrée exige les trois conditions : l’algorithme du moteur
ne peut démontrablement pas s’engager sur l’entrée, l’ignorer fait gagner un temps réel,
et le même comportement est vérifié sur une piste moins coûteuse. Être *lent* n’est expressément pas
suffisant — un mauvais rapport portage/oracle est précisément l’aspect que prend un véritable défaut
de performance, et exclure sur ce critère masquerait justement ce
pour quoi le corpus existe.

Chaque exclusion est répertoriée avec son mécanisme dans
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions) ;
le registre est `test/corpus/engine-exclusions.json`. Le cas qui l’a motivée est
`2222`, qui déclare 28 303 nœuds et aucune arête : faute de quoi que ce soit à relier,
chaque moteur à forces et radial délègue au dispositif commun d’empaquetage de
composantes et aucun de leurs propres algorithmes ne s’exécute — ce que confirme le fait que
leurs sorties d’oracle sont identiques à l’octet. `dot` emprunte un autre chemin et le couvre de
façon conforme en six secondes.
