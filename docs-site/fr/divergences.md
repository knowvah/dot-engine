---
sourceHash: e3799316f3f4dfaec51d8f951fa9066e1958ffcc38a402c5fbaabdac99451534
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Divergences connues par rapport à C Graphviz {#known-divergences-from-c-graphviz}

@knowvah/dot-engine vise la plus grande fidélité possible à l’implémentation C
canonique. Le code source C fait office de spécification ; une différence non
répertoriée est traitée comme un défaut, et non comme un comportement accepté.

> **Ce que « correspondre » signifie ici.** Le verdict de parité du corpus
> nommé `conformant` est une **tolérance déterministe stricte**, et *non* une
> égalité littérale octet pour octet du SVG : les coordonnées et chemins
> numériques doivent concorder à **±0.01** près et tout le contenu non numérique
> (balises, couleurs, texte) doit être exactement égal
> (`compareSvg(…, 'deterministic')`). Dans tout ce document, « correspondre » et
> « conforme » renvoient à ce verdict de tolérance. Définition complète :
> [Conformité](./conformance.md).

Lorsque la sortie *diffère* effectivement, elle relève d’exactement une de ces
trois classes :

1. **Écarts acceptés** — des différences que nous avons étudiées, dont nous
   comprenons la cause racine et que nous avons **délibérément choisi de ne pas
   rendre conformes**. Chacune est bornée, caractérisée et justifiée ci-dessous.
   Ce ne sont pas des bogues et elles ne seront pas « corrigées » sans une
   raison précise, traitée séparément.
2. **Longue traîne suivie** — des écarts connus qui *seront* comblés, chacun
   avec un correctif épinglé sur l’oracle. Ils figurent, avec des compteurs à
   jour, dans
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md).
3. **Non-objectifs** — des limites de périmètre intentionnelles (des formats et
   des mécanismes que nous n’avons jamais cherché à reproduire).

Les registres de référence, mis à jour en continu, sont
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(tableau de bord de parité par entrée face à `dot` natif) et
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(inventaire de l’état du portage au niveau des algorithmes).

La source de vérité **lisible par machine** qui indique quels graphes sont
*acceptés* (classe 1 ci-dessus) est
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
L’outillage la joint au moment de produire les rapports : `PARITY-dot.md`
sépare les **écarts acceptés** du retard **suivi**, et la porte de contrôle des
règles en tire sa liste d’autorisations. Les sections en prose ci-dessous
expliquent chaque entrée (A1 est active ; A2, A3 et A8 sont closes et conservées à
titre d’historique ; A10 est active en tant qu’acceptation d’erreur du portage
dans les registres par moteur). Deux tests d’intégration continue empêchent cette
liste de se périmer en silence : `accepted-divergences.test.ts` vérifie que chaque
graphe accepté diverge toujours, et `registry-staleness.test.ts` échoue lorsqu’une
entrée d’un registre par moteur ne correspond plus à sa ligne de balayage validée.

---

## Écarts acceptés (nous ne les rendons délibérément pas conformes) {#accepted-deltas-we-deliberately-do-not-make-conformant}

Nous acceptons un écart — plutôt que de courir après la parité octet pour
octet — uniquement lorsque **toutes** les conditions suivantes sont réunies :

- La cause racine est une **contrainte de portabilité** (quelque chose que
  l’environnement d’exécution JavaScript/navigateur ne peut pas reproduire
  exactement), et non une erreur de logique dans le portage.
- La différence est **infra-perceptible** et démontrablement **bornée**.
- Un correctif aurait un **coût et un rayon d’impact disproportionnés** par
  rapport au gain (en général : il toucherait une primitive partagée utilisée
  par des centaines de graphes déjà conformes, au risque de régressions pour un
  gain d’une fraction de pixel).

Lorsque nous acceptons un écart, nous le caractérisons ici afin que les
utilisateurs ne soient jamais surpris. Les graphes touchés par un écart accepté
sont validés selon un critère **structurel / de tolérance** plutôt qu’un
critère d’égalité d’octets.

### A1. Déterminisme en virgule flottante (moteurs à forces) {#a1-floating-point-determinism-force-directed-engines}

**Concernés :** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (les moteurs
itératifs, à modèle de ressorts). La *disposition* du moteur `dot` n’est **pas**
touchée par ce déterminisme du modèle itératif ; les anciens écarts en virgule flottante du routage des splines de `dot`
(A3, A8) sont clos et conservés ci-dessous à titre d’historique.

> **Périmètre : longtemps une réserve non mesurée, désormais en partie
> mesurée.** Le **relevé SVG principal du moteur dot** (`test/corpus/survey.ts`)
> reste **limité à dot** : l’oracle natif s’exécute sous
> `GVBINDIR=/tmp/ghl`, qui ne lie symboliquement **que** les greffons `core` +
> `dot_layout` (`test/corpus/gen-headless-gvbindir.sh` ne parcourt que
> `core dot_layout` — aucun greffon de disposition `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp`
> n’est présent), et l’oracle comme le portage sont invoqués avec le moteur
> `dot`. Ainsi, des identifiants du corpus comme `*_neato` / `*_circo` /
> `root_twopi` sont des *noms de fichiers* disposés avec `dot` dans ce relevé, et
> non avec leur moteur natif, et A1 ne correspond à **aucun** graphe dans ce
> relevé — non pas parce que les moteurs seraient prouvés conformes, mais parce
> que ce relevé particulier ne les sollicite jamais.
>
> **Mais les six moteurs concernés par A1 disposent désormais de leur propre
> relevé en moteur natif**, via `test/corpus/engine-walk.ts` +
> `parity-report.ts` (indépendant de `GVBINDIR` — chacun lance directement
> `dot -K <engine> -Txdot`), à deux niveaux de rigueur différents documentés
> séparément plus bas : `circo`/`twopi`/`osage` s’exécutent à la même tolérance
> **déterministe de ±0.01** que le relevé dot, avec un triage de cause racine
> par identifiant (« Acceptation au niveau de la piste d’un moteur » plus bas) ;
> `neato`/`fdp`/`sfdp` s’exécutent à une tolérance de **caractérisation de
> ±0.5**, plus lâche, sans triage par identifiant pour l’instant
> (« Caractérisation des moteurs itératifs » plus bas). Chiffres actuels tous
> moteurs confondus :
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Caractérisation.** Ces moteurs exécutent des dispositions numériques
itératives dont les résultats dépendent de l’arrondi en virgule flottante —
précisément de l’opération fusionnée multiplication-addition (FMA) et de
`Math.pow`, qui peuvent différer selon les moteurs JavaScript et les
architectures de processeur. Le portage reproduit l’ordre des opérations de C
là où il le peut (`src/common/fma.ts`, `src/common/arm-pow.ts`) — par exemple
`sfdp` s’aligne sur l’oracle natif à environ 6 chiffres significatifs avec un
PRNG et un `fma` concordants — mais une reproduction exacte, à coordonnées
identiques, **n’est pas garantie d’une plateforme à l’autre**. La topologie est
préservée ; la divergence potentielle se situe dans les coordonnées fines des
nœuds.

**Pourquoi c’est accepté.** C’est une contrainte dure de l’exécution en JS, et
non un choix de conception — de la même famille que les sensibilités `hypot`/FMA de
A3/A8 (closes depuis). Il n’existe aucun moyen de garantir des résultats
transcendants/FMA identiques au bit près sur tous les environnements cibles ;
un critère d’égalité d’octets serait donc infaisable à tester plutôt que
simplement coûteux. **Évaluer A1** (par opposition à simplement l’assortir
d’une réserve) a exigé une piste de parité distincte en moteur natif —
construite le 2026-07-11 sous la forme de `test/corpus/engine-walk.ts` +
`parity-report.ts`, qui relève chaque entrée sous son propre moteur plutôt que
sous `dot`. Le plafond honnête de ce travail est de **réduire** A1 à « aucune
divergence active sur la plateforme de référence », jamais d’éliminer la réserve
inter-plateformes ; les résultats obtenus jusqu’ici (ci-dessous) respectent ce
plafond : `circo`/`twopi`/`osage` ont chacun fait apparaître et expliqué par
leur cause racine une poignée d’instances authentiques de A1/A9, et
`neato`/`fdp`/`sfdp` se situent désormais à 90.5/96.5/68.1 % à moins de 0.5pt du
natif sur l’univers de 929 éléments (graphviz 16.1.0), ce qui signifie que l’arithmétique
portée (`fma.ts`, `arm-pow.ts`, PRNG concordant) tient pour la plupart des
graphes — et chaque identifiant divergent de la univers de 929 éléments est attribué individuellement
par injection (dérive du solveur ou défaut du portage) au lieu d’être laissé en
dérive non triée. Voir la caractérisation des moteurs itératifs ci-dessous.

**Acceptation au niveau de la piste d’un moteur : famille des flèches de twopi.** <a id="a1-twopi-arrows-family"></a>
Le bloc de citation ci-dessus décrit le relevé SVG du moteur dot, où A1 ne
correspond à aucun graphe ; la **piste xdot du moteur** `twopi`, distincte
(`parity-twopi.json`, oracle natif `dot -K twopi -Txdot`,
`test/corpus/engine-walk.ts`), s’exécute *bel et bien* sous son moteur natif et
met en évidence une instance concrète et vérifiée de A1 sur 9 identifiants du
corpus : `graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`,
`linux.x86-arrows_dot`, `macosx-arrows_dot`, `nshare-arrows_dot`,
`share-newarrows`, `windows-newarrows` et (ajouté le 2026-07-28, nouveau dans
l’univers de 905 éléments) son jumeau du répertoire directed/,
`tree-graphs-directed-oldarrows` — chacun divergeant sur une seule arête
dominante (`Z->I` ou `i->Z` ; 12 à 64 différences d’opérations de dessin).
L’A/B par injection (journal de décisions, entrée du 2026-07-10 « injection A/B
verdicts: twopi arrows family EXONERATED... ») a prouvé directement le
mécanisme : exporter le `ND_pos` d’entrée de `spline_edges` natif et
l’injecter dans le `splineEdgesShifted` du portage produit une sortie
**entièrement conforme** sur `graphs-arrows` (`Z->I` devient identique octet
pour octet à l’oracle, avec la même spline de 7/14 points) — la divergence est
donc à 100 % une dérive des positions de nœuds avant routage, issue du solveur
de suppression de chevauchements PRISM de `twopi`, et le routage et l’émission
des splines du portage sont disculpés. Le symptôme visible sur 6 des 8
identifiants est une bascule du nombre de points de Bézier
(`unfilled_bezier[ptCount]: 8 vs 14`) : le nombre de morceaux ajustés par
`Proutespline` est sensible au côté de la frontière d’un obstacle sur lequel
tombe la position dérivée du nœud, de sorte qu’une différence de position
inférieure à l’ULP en aval de la résolution itérative de PRISM fait basculer le
nombre de segments de la spline ajustée (les 2 autres identifiants,
`graphs-arrowsize`/`nshare-arrows_dot`, montrent la même dérive sous la forme
d’un écart de position plus faible, sans bascule du nombre de morceaux).
Accepté au niveau de la piste du moteur via
`test/corpus/accepted-divergences-engines.json`, joint à `PARITY-twopi.md` par
`parity-report.ts` — la même jointure que `accepted.ts` effectue pour
`PARITY-dot.md` sur la piste dot.

L’analyse de cause racine d’`oldarrows` (2026-07-28) a localisé le point exact
de bascule du symptôme de nombre de points de la famille. Son éventail
`i`–`Z`–`I` est colinéaire sur un diamètre de l’anneau, et le `intersect()` de
`directVis` de pathplan bloque une ligne de visée lorsqu’un sommet d’obstacle se
trouve « sur » le segment — alors que la tolérance de colinéarité de 1e-4 de
`wind()` fait qu’un nœud situé à 270pt du segment compte quand même comme
colinéaire, et que `inBetween()` (qui suppose la colinéarité) dégénère alors en
ne testant que la **projection en x** : le sommet bloque si et seulement si son
x tombe strictement à l’intérieur de l’intervalle d’un ULP de large entre les
abscisses des deux extrémités. Lequel des deux arcs radiaux en miroir se courbe
dépend donc de l’ordre au dernier ULP de trois valeurs x nominalement égales
issues de la résolution de PRISM — C courbe `Z->I` (le sommet de l’axe du nœud
`i` tombe dans son intervalle), le portage courbe `i->Z` (le sommet du nœud `I`
tombe dans le sien). Répliquer `directVis` hors ligne sur l’ensemble
d’obstacles exporté de chaque côté reproduit exactement la décision de chaque
côté, et injecter dans le portage le `ND_pos` pré-routage de l’oracle donne 0
différence (`attribution-twopi.json`) — le routage et l’émission sont fidèles à
l’octet.

`1855` est la variante **en miroir** radiale/en étoile du même mécanisme FP de
PRISM avant routage (acceptée le 2026-07-11) : ses 31 feuilles sont exactement
cocirculaires, si bien que la disposition en étoile est symétrique par réflexion
et que la suppression de chevauchements de PRISM se trouve sur un équilibre
instable par symétrie ; une différence de 1 ULP entre le `cos`/`sin` de V8 et
celui de libm sur 5 angles de feuilles dans le `setAbsolutePos` de
`circleLayout` sélectionne le bassin miroir opposé, et toute la disposition
radiale aboutit au miroir exact, selon l’axe des x, de celle de l’oracle
(déplacement maximal d’un nœud de 6.04pt, boîte englobante préservée). L’A/B par
injection a prouvé les deux sens : fournir à PRISM du portage les positions
exactes de `circleLayout` de C reproduit l’oracle nœud pour nœud (3e-14), et ne
rétablir que les 5 positions de feuilles divergentes à l’ULP rebascule toute la
disposition vers le miroir du portage. Analyse complète :
`.agent-notes/twopi-radial-drift-rca.md` (journal de décisions 2026-07-11).

La même étoile diverge sur la piste `circo` (accepté le 2026-10-16, 599
différences d’opérations de dessin, au plus 0.71pt). Le portage reproduit la
contraction FMA et l’ordre d’évaluation de clang dans `circpos.c`, si bien que
31 des 32 positions qui entrent dans PRISM sont exactes au bit près. La dernière
diffère de 1 ULP, car V8 et la libm d’Apple arrondissent `cos`/`sin`
différemment pour trois angles d’enfants dans `positionChildren`. La
triangulation de Delaunay de PRISM bascule alors une diagonale presque
cocirculaire sur l’axe de symétrie. Injection A/B : avec les valeurs natives de
`cos`/`sin`, le portage correspond à l’oracle. Avec les valeurs de V8, le build
natif produit la disposition de l’oracle dans 22 exécutions sur 30 et celle du
portage dans les 8 autres, car GTS ordonne ses arêtes selon l’adresse
d’allocation.

**Caractérisation des moteurs itératifs : neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
Contrairement aux pistes de moteur `circo`/`twopi`/`osage` ci-dessus,
`neato`/`fdp`/`sfdp` ne sont **pas** encore triés par identifiant —
`engine-walk.ts` consigne un champ `tolerance: 0.5` pour ces trois moteurs et
`parity-report.ts` les présente dans une section distincte, « Iterative engines
(±0.5 characterization) », de
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md),
explicitement **non comparable** aux taux de réussite déterministes à ±0.01
donnés ailleurs dans ce document. Compteurs actuels face à graphviz 16.1.0 (univers de 929 éléments ;
le pourcentage de réussite laisse de côté les entrées que l’oracle C ne peut pas
rendre, conformément à [Conformité](./conformance.md)) :

| moteur | relevées | à ±0.5pt | non conformes | erreur du portage / délai dépassé | erreur de l’oracle |
|---|---:|---:|---:|---:|---:|
| `neato` | 929 | 840 (90.5%) | 86 | 1 | 1 |
| `fdp`   | 929 | 893 (96.5%) | 29 | 2 | 4 |
| `sfdp`  | 929 | 633 (68.1%) | 294 | 1 | 0 |

(Le taux de réussite de `fdp` a augmenté
depuis 77.5 % parce que le balayage validé précédent datait de l’état du
portage de la mission précédente.)

(Le premier balayage, le 2026-07-11 à 762 éléments, mesurait 263/311/260 à
±0.5pt — le bond vers les taux actuels vient de correctifs par identifiant
intégrés depuis, principalement la gestion non portée de `user_pos`/`P_SET` dans
neato, la consolidation de l’initialisation des moteurs et la correction
macro-contre-fonction de `setEdgeType`.)

Contrairement au premier balayage, chaque ligne divergente de l’univers de 929
éléments est attribuée individuellement par rapport à graphviz 16.1.0 : le banc
d’injection (`test/corpus/attribute-divergence.ts`) fournit au portage le `ND_pos`
pré-routage de l’oracle natif et recompare, et chaque identifiant divergent actuel
est `drift-exonerated` (le routage et l’émission du portage reproduisent
exactement l’oracle dès que la dérive du solveur est supprimée), sauf deux. Deux
sont des résidus par identifiant acceptés séparément : le résidu CDT de `241_0` sur
sfdp et la disposition NaN de `2556` pour sfdp. `241_0` pour fdp passe depuis
`fix(T9): start swapped cdt faces at the new diagonal as gts does` (voir le paragraphe fdp sous A9). `2471` pour fdp et
`2371` pour sfdp conservaient des positions d’étiquettes d’arête (`lp`) qui différaient
après injection, c’est-à-dire que le placeur de xlabels choisissait un autre candidat.
`2471` s’est résolu dès que le `dotneato_closest` du portage a arrondi comme
l’évaluation de De Casteljau fusionnée et le DIST2 de clang : les ancres des étiquettes
d’arête différaient de 1 à 2 ULP, ce qui faisait basculer le test d’inclusion strict du
placeur. `2371` s’est résolu dès que l’arbre R du portage a copié les rectangles par
valeur, comme le fait C. La disposition fdp native de `2471` varie d’une exécution à
l’autre ; sa ligne n’enregistre donc qu’une exécution. (`42` de sfdp relève de la dérive A1, voir
[`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md).)
L’acceptation de classe ci-dessous formalise l’ensemble disculpé ;
compteurs à jour dans les tableaux de bord par moteur
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**Acceptation de la classe A1-drift (moteurs itératifs, appartenance calculée).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
porte une entrée de **classe** `"A1-drift"` par moteur itératif (`neato`,
`fdp`, `sfdp`) — `{ class: true, attributionFile, ref }` — distincte des
entrées par identifiant utilisées par les pistes `circo`/`twopi`/`osage`
ci-dessus (D2, `plans/iterative-parity-campaign/decisions.md`). Contrairement à
une entrée par identifiant, l’appartenance à la classe n’est jamais énumérée à
la main dans le registre : `parity-report.ts` la calcule au moment du rapport à
partir du `attribution-<engine>.json` correspondant (le banc d’attribution par
injection de T1, `test/corpus/attribute-divergence.ts`) — chaque identifiant
divergent dont le `ND_pos` natif pré-routage a été injecté dans le portage puis
recomparé, et qui se conforme à ±0.5, reçoit `verdict: 'drift-exonerated'` dans
ce fichier, ce qui signifie que les solveurs itératifs des deux moteurs ont
convergé vers des dispositions numériquement différentes mais chacune
cohérente en interne (une différence d’accumulation en virgule flottante selon
la caractérisation de A1 ci-dessus, et non un bogue de routage ou d’émission du
portage). Les preuves par identifiant — forme du seau, nombre de différences
avant et après injection, détection de translation uniforme/de miroir — se
trouvent dans l’artefact d’attribution lui-même, sans être dupliquées dans ce
document ni dans le registre (D2). Un identifiant qui se met ensuite à réussir
franchement, ou dont la ré-attribution change de verdict, sort automatiquement
de la classe à la prochaine régénération du rapport — aucune modification
d’acceptation périmée n’est nécessaire, et aucun test de garde n’échoue. Les
moteurs dont le `attribution-<engine>.json` n’a pas encore été généré affichent
la classe comme « attribution pending » avec zéro membre, ce qui équivaut à
n’avoir aucune acceptation — l’entrée de classe peut précéder ses données (voir
`test/corpus/accepted-divergences-engines.test.ts`).

### A2. Mesure du texte (métriques de police) → disposition pilotée par les étiquettes — CLOS <a id="a2-text-measurement-font-metrics-→-label-driven-layout-—-closed"></a> {#a2-text-measurement-font-metrics-label-driven-layout}

**Statut (2026-07-01) : clos.** Plus aucun identifiant du corpus n’est accepté
sous cette classe ; la section est conservée comme documentation historique du
mécanisme et du point d’extension `TextMeasurer` injectable qui l’a neutralisé.
Des correctifs successifs de la mesure du texte (la bascule vers
`EstimateTextMeasurer`, les métriques verticales tenant compte de la police, le
correctif des octets UTF-8 non ASCII) ont résolu presque toutes les divergences
de disposition pilotées par les étiquettes qui vivaient ici. **`proc3d`** — le
précédent exemple canonique de A2 — est entièrement **`conformant`** sur les
trois répertoires du corpus (`graphs-`/`share-`/`windows-proc3d`) : boîte
englobante identique, zéro différence de données de chemin, zéro différence
d’ancrage d’étiquette.

**Les derniers membres sortis (2026-07-01).** La **famille `NaN`**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) a été conservée ici bien après que
la géométrie de ses nœuds eut déjà atteint exactement celle de C (76/76 points
de référence). Son véritable résidu — 8 extrémités d’arêtes droites sur quatre
paires de 2-cycles opposés (`Target↔TThread`, `Interp↔InterpF`,
`Event↔Target`, `AtomProperties↔NRAtom`) décalées de 6 à 14 pt — a été
rediagnostiqué et s’est révélé n’être **absolument pas un effet des métriques
de police**, mais deux défauts du portage dans le routage multi-arêtes de dot
(mission `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`) :

1. **Ordre des couloirs d’une paire opposée.** Le portage retriait chaque
   groupe d’arêtes parallèles selon le numéro de séquence de création d’origine
   avant d’attribuer les décalages de couloir Multisep ; C attribue les couloirs
   dans l’ordre collecté par edgecmp (représentant avant MAINGRAPH d’abord,
   membre inversé AUXGRAPH ensuite — `dotsplines.c:419`,
   `make_regular_edge:1885-1907`). Un 2-cycle dont le membre inversé avait été
   déclaré en premier dessinait chaque arête sur le couloir de 18 pt de l’autre.
2. **Fausse adjacence à plat sur des arêtes fusionnées entre rangs.**
   `markAdjacent` marquait les entrées `ND_other` sans la garde de même rang de
   C (`flat.c:272-276`), ce qui laissait le court-circuit d’adjacence à plat de
   `groupSize` avaler les ruptures de groupe de portcmp.

Une fois les deux corrigés fidèlement, la famille est **`conformant`** sur les
trois répertoires (par élément : 0 nœud, 0 arête différents), et le même
mécanisme a clos `42`, `clust2`, `ngk10_4` (structural-match → conformant) et
fait passer `b124` de diverged à structural-match — le tout sur des paires de
2-cycles/parallèles.

**Les deux côtés du relevé exécutent le même estimateur — la mesure est
neutralisée.** L’oracle `dot` natif s’exécute sous un `GVBINDIR` sans interface
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`) qui ne lie
symboliquement que les greffons `core` et `dot_layout` — aucun greffon de mise
en page de texte `gd`/`pango`/`quartz`. Cet emplacement étant vide, graphviz
retombe sur son `estimate_textspan_size` intégré. Le `EstimateTextMeasurer` du
portage TypeScript (`src/common/textmeasure.ts`) est un portage fidèle de la
même routine et constitue le choix par défaut sous Node, résolu par
`createMeasurer()` (`src/common/textmeasure-factory.ts`). **Les deux côtés de
chaque comparaison de parité mesurent donc le texte avec l’estimateur
identique** — les véritables avances de glyphes de FreeType/pango n’entrent
jamais dans la comparaison. C’est pourquoi une régression de verdict ici
désigne le code de disposition, et non une police, et c’est pourquoi corriger
les propres bogues de l’estimateur (comptage des octets UTF-8, prise en compte
de la police dans les métriques verticales) a clos l’essentiel de cette classe
plutôt que de simplement réduire un écart de métriques de police.

**Le point d’extension `TextMeasurer` injectable.** Cette neutralisation n’est
possible que parce que la mesure du texte est un point d’extension délibéré, et
non quelque chose de câblé en dur dans l’un ou l’autre moteur. `TextMeasurer`
est une interface à une seule méthode (`measure(text, font, size, flags) → {w,
h, …}`) injectée par dépendance dans chaque site d’appel de dimensionnement
d’étiquette — `polyInit`, `recordInit`, `initEdgeLabels` et `buildNodeLabel`
reçoivent chacun le mesureur en paramètre ; rien ne mesure le texte via une
variable globale. Il est fixé pour les tests/l’IC via `setTextMeasurer(...)` ou
`GV_TEXT_MEASURER=estimate`. Ce point d’extension permet aussi de *prouver*
qu’un résidu ne relève que de la mesure : fournir au portage les largeurs
exactes mesurées par C (capturées depuis l’oracle) et vérifier si la
disposition reproduit alors exactement celle de C. C’est cette expérience qui a
d’abord justifié le verdict A2 pour `proc3d` (voir l’annexe historique
ci-dessous) — la technique reste valable. Son inverse a clos la classe : la
mesure étant prouvée neutralisée des deux côtés du relevé, le résidu d’arêtes
de `NaN` ne pouvait pas être un effet des métriques de police, ce qui a imposé
le rediagnostic qui a trouvé les deux défauts de routage ci-dessus.

::: details Analyse historique (supplantée le 2026-06-30) — conservée pour mémoire
Le contenu ci-dessous décrit un état antérieur de cette classe, avant que la
bascule vers `EstimateTextMeasurer`, les métriques verticales tenant compte de
la police et le correctif des octets UTF-8 non ASCII n’en aient clos la plus
grande partie. Il ne décrit plus le comportement actuel — il n’est conservé que
pour que le raisonnement qui a mené ici ne soit pas perdu. En particulier :
(1) les largeurs « C natif » du tableau de mesures ci-dessous sont des valeurs
**FreeType** issues d’un chemin de rendu avec une vraie police ; le relevé de
parité n’exerce jamais ce chemin — les deux côtés exécutent
`estimate_textspan_size` (voir plus haut) — si bien que le tableau ne reflète
pas la manière dont la parité est actuellement mesurée ; (2) les figures de
superposition et les rendus golden/ours ci-dessous représentent un `proc3d`
**hors corpus** (`graphs/directed/proc3d.gv`, ~2620 pt) qui ne fait pas partie
du relevé de parité ; les variantes `proc3d` du corpus sont désormais
conformes, sans aucune différence, et il n’y a donc aucune superposition à
montrer pour elles ; (3) le récit des abscisses de nœuds de `NaN`/`ratio=compress`
ci-dessous est supplanté — la mesure actuelle montre que les 76 points de nœuds
concordent exactement, si bien que la chaîne erreur de largeur → décalage de
nœud qu’il décrit ne tient plus pour `NaN`.

**`NaN` sous `ratio=compress` (historique).** La famille
`NaN.gv` (`orientation=landscape; ratio=compress; size="16,10"`) était un cas
A2 dont le verdict d’alors aboutissait à *diverged* plutôt qu’à
*structural-match*. Le chemin du simplexe réseau en x avec compression était
fidèle — chaque entrée de contrainte concordait avec C (valeur de la contrainte
de largeur, `minlen` de `containNodes`, nombre d’arêtes auxiliaires 471/poids
1612, `lrBalance` et ordres de rangs tous identiques) *sauf* les demi-largeurs
de 9 nœuds, que le mesureur donnait 0.5–1.03 pt plus larges que C. Le
tassement à poids 1000 de `ratio=compress` rendait **contraignantes** les
contraintes de séparation gauche-droite normalement lâches, si bien que cette
erreur de largeur infra-pixel — invisible sans compression — apparaissait sous
la forme d’un décalage intérieur en x de −3..−5 pt. Ce décalage faisait passer
la spline droite `Target<->TThread` 0.55 pt au-delà d’une paroi de boîte de
nœud, si bien que le routeur la courbait en un morceau de Bézier
supplémentaire (7 points contre 4 pour C) — un écart *structurel*, d’où
*diverged*. Forcer les 9 largeurs aux valeurs de C reproduisait exactement C
(abscisses de nœuds 53/76→0/76 écartées ; spline 7→4 points), ce qui confirmait
que le résidu venait à 100 % des métriques de police en amont, et non du code de
compression ou de spline, **pour cette ancienne divergence**. Preuves complètes
(avec une comparaison visuelle golden-contre-ours côte à côte + la superposition
de l’écart de spline 4 contre 7 points) :
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (exposé en
prose : `…/nan-compress-xcoord.md`).

**Exemple de mesure de métriques de police (historique — FreeType contre
estimation).** Graphviz natif, lorsqu’il s’exécute avec un vrai greffon de mise
en page de texte (et non l’oracle sans interface utilisé par le relevé de
parité), mesure le texte avec les avances de glyphes de FreeType/libgd. Le
`EstimateTextMeasurer` du portage ne réplique pas un rastériseur de glyphes.
Pour la plupart des chaînes, les deux concordent exactement ; pour certaines,
elles diffèrent d’une fraction de point. Exemple mesuré — Times-Roman 14 pt, la
chaîne `"/home/ek/work/src/lefty/lefty.c"` (31 caractères) :

| | largeur |
|---|---|
| C natif (FreeType) | 176.00 pt |
| @knowvah/dot-engine (estimation) | 176.75 pt |
| écart | **+0.75 pt (+0.43%)** |

L’autre ligne d’étiquette du même nœud, `"93736-32246"`, a été mesurée de façon
**identique** (96.00 pt des deux côtés) — l’erreur dépend de la chaîne et
s’accumule par glyphe, et ne résulte pas d’un facteur d’échelle uniforme. Cet
écart FreeType-contre-estimation est réel mais **n’est pas** ce que mesure le
relevé de parité (les deux côtés exécutent `estimate`) ; il ne compterait que si
la sortie de @knowvah/dot-engine était comparée à un rendu C avec une vraie
police en dehors de ce relevé.

**Effet en aval sur l’ancienne divergence de `proc3d` (historique).** La
largeur de l’étiquette détermine la taille du nœud, qui détermine la
disposition :

1. Une étiquette plus large → une boîte de nœud légèrement plus large (pour un
   nœud *ellipse*, la largeur est en outre multipliée par √2, si bien que
   +0.75 pt de texte → +0.53 pt de demi-largeur).
2. Les demi-largeurs des nœuds fixent les contraintes de séparation
   gauche-droite du simplexe réseau des coordonnées x ; ces contraintes sont
   arrondies par `ROUND()` à des entiers, si bien qu’un changement de largeur
   infra-pixel peut faire basculer une contrainte de *N* à *N+1*.
3. Le simplexe réseau sélectionne alors une affectation entière des x
   différente — mais tout aussi optimale —, décalant certaines abscisses de
   nœuds de 1 à 2 unités.

Pour le `proc3d.gv` hors corpus (`graphs/directed/proc3d.gv`, ~2620 pt, qui ne
fait pas partie du relevé de parité), cela a produit une différence d’étendue en
x **≤ 3.55 pt** (**0.13%**), superposée ci-dessous — **vert = `dot` C natif
(golden), rouge = @knowvah/dot-engine (ours)** :

![Superposition proc3d golden contre ours : vert = C, rouge = @knowvah/dot-engine](/img/proc3d-overlay.svg)

En zoomant, la frange apparaissait presque entièrement sur les longues
étiquettes ovales de chemins de fichiers :

![Superposition proc3d, zoomée sur les ovales larges des étiquettes de chemins : vert = C, rouge = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — `dot` natif | Ours — @knowvah/dot-engine |
|---|---|
| ![proc3d rendu par C Graphviz](/img/proc3d-golden.svg) | ![proc3d rendu par @knowvah/dot-engine](/img/proc3d-ours.svg) |

L’exposé autonome (cause racine, chiffres par métrique, commande de
reproduction) se trouve sur sa propre page :
[**proc3d — la divergence canonique A2 de métriques de police (historique)**](/fr/divergences-proc3d-a2).
Cette page décrit une divergence résolue sur une entrée hors corpus ; les
variantes `proc3d` actuelles du corpus sont conformes.

**Pourquoi c’était accepté à l’époque.** Égaler à l’octet les avances par glyphe
de FreeType pour toutes les polices et toutes les chaînes aurait exigé de
répliquer ses tables de métriques, son hinting et ses arrondis — un travail
considérable, fragile, et toujours pas garanti exact. Le mesureur de texte est
une primitive partagée : chaque étiquette du corpus y passe, si bien qu’un
correctif visant une chaîne risquait d’en faire régresser d’autres pour un gain
infra-perceptible.
:::

### A3. Départage par `hypot` dans le routage des splines (`dot`) — CLOS {#a3-hypot-tie-break-in-spline-routing-dot}

**Statut (2026-10-12) : clos.** Plus aucun identifiant du corpus n’est accepté
sous cette classe ; la section est conservée comme documentation historique du
mécanisme. Les anciens membres (`2368`, `graphs-b100`, `graphs-b104`, `241_1`,
`2413_1`, `2413_2`, `graphs-decorate`, `2371`) sont tous **`conformant`** dans le
balayage à neuf (`test/corpus/parity-probe.json`).

**Mécanisme, et ce qui l’a clos.** L’ajusteur de splines (`Proutespline` ->
`findMaxDev`, `src/pathplan/route.ts`) scinde une courbe de Bézier ajustée au
point de route intérieur de déviation maximale. Sur un canal géométriquement
symétrique, les déviations candidates diffèrent d’environ 1 ULP, de sorte que le
gagnant est décidé par l’arithmétique du dernier bit. On avait attribué au
portage un écart irréductible (« le `hypot` d’Apple ne concorde avec aucun
`hypot` portable ») et on l’avait compensé par un départage tolérant,
équivariant par translation. Cette attribution a été infirmée : l’égalité est
décidée par l’arithmétique *exacte* de C, laquelle est reproductible. Le commit
`cdf597bc` (`fix(pathplan): split splines at C's max-deviation point bit for
bit`) l’a portée : le `hypot` de libm pour la distance (`route.c:448`), la
comparaison stricte `>` de C (`route.c:139`) et la fusion `fp-contract` de clang
pour l’évaluation de Bézier (`route.c:137-138`), les déterminants de `mkspline`
(`route.c:181-183`), `dot` (459), `normv` (413), `B01` (488) et `B23` (494). Le
départage tolérant a disparu ; le nœud de jonction de `241_0` est épinglé dans le repère de
routage de C, car C n’est pas équivariant par translation sur de telles
égalités. Cela a clos `2368`, `2371`, `2413_1`, `2413_2`, `graphs-b100`,
`graphs-b104` et `graphs-decorate`.

`241_1` n’était pas une égalité de `hypot` : il a été clos par `87347711`
(`fix(dot): match port-less edge endpoints in flat-adjacent aux layout`). C
regroupe toutes les arêtes à plat adjacentes partageant une arête principale en
un seul appel à `make_flat_adj_edges` et teste la présence de ports sur tout le
groupe ; une arête sans port, sœur d’une arête à port, est donc routée via le
graphe auxiliaire. Le portage scindait le groupe selon la présence de ports et
routait la sœur par `makeSimpleFlat`, dont le découpage tombe sur un autre point
de `bezier_clip` (54.28 contre 54.46 en natif).

Les deux correctifs ont été vérifiés par des balayages de corpus à neuf sans
aucune régression (lignes du journal « T5 land » et « T6 land »,
`plans/plantuml-tracker-2/decision-journal.md`).

**Preuves avant le correctif (historique).** `2368` était le membre de
référence. Son arc `376->76` était scindé vers le coin opposé à celui de C ; le
graphe et les tracés C et portage de cet arc d’avant le correctif sont conservés
pour mémoire.

::: details Définition du graphe (`2368.dot`)
```dot
digraph G {
  compound=true;
  concentrate=true;
  node[shape=box,fontsize="8",color="#909090",height="0.1"];
  edge[style="dashed",fontsize="8",color="#808080",arrowsize="0.5"];
  line7[label="#7"];
  {rank=same; line7;136;}
  line7 -> 136[style=invis];
  line11[label="#11"];
  line7 -> line11[weight=100,style=invis];
  {rank=same; line11;16;}
  line11 -> 16[style=invis];
  line16[label="#16"];
  line11 -> line16[weight=100,style=invis];
  {rank=same; line16;76;376;256;196;436;316;}
  line16 -> 316[style=invis];
  316 -> 76[style=invis];
  76 -> 376[style=invis];
  376 -> 256[style=invis];
  256 -> 196[style=invis];
  196 -> 436[style=invis];
  76 -> 376[label="from1"];
  376 -> 76[label="to1"];
  16 -> 76[label="ignore"];
  196 -> 376[label="from2"];
  376 -> 196[label="to2"];
  136 -> 196[label="ignore"];
  256 -> 436[label="to2"];
  256 -> 376[label="to1"];
  256 -> 316[label="as"];
  436 -> 256[label="from2"];
  376 -> 256[label="from1"];
}
```
:::

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```


### A4. Oracle dans un état reconnu comme défaillant (la famille init_rank / pathplan) {#a4-oracle-in-an-acknowledged-broken-state-the-init-rank-pathplan-family}

**Concernés (balayage graphviz 16.1) :** `1435` (structural-match, maxΔ 0.39 sur
un point de contrôle de spline ; il valait 503 face à l’oracle 15.x — la baisse
n’a pas été isolée par bissection) et `1581` (diverged : nombre d’enfants de
premier niveau 39 contre 22, maxΔ 0).
Les membres de la famille `1939` et `2825` sont **conformes** et ne portent
aucune entrée, et `2470` et `graphs-structs` les ont rejoints le 2026-07-11
(tous deux sont devenus conformes après l’intégration des correctifs ortho
adjacency-spill/chancmpid, fmadd `polylineMidpoint` et arrondi half-even des
égalités — le portage reproduit désormais exactement la sortie de récupération
de l’oracle, y compris les arêtes perdues identiques) ; leurs entrées
d’acceptation sont retirées. **`2796` et `2471` les ont rejoints avec
graphviz 16.1** (tous deux `conformant` dans le balayage à neuf, entrées
d’acceptation retirées) : le portage et l’oracle 16.1 s’accordent désormais sur la
sortie de récupération de `init_rank`, y compris les arêtes perdues. La cause n’a
pas été isolée par bissection (le portage dotgen 16.1 `3cfbf55c` et le correctif
de consommation des arêtes perdues `5b6b9bfc` sont les candidats) ; la
description de `init_rank` ci-dessous est conservée comme mécanisme de la
classe, et les deux identifiants sont épinglés comme conformes par le balayage de
parité.

`1581` et `2825` étaient des cas de récupération après plantage (mission
fix-element-count-bucket) : des entrées issues de fuzzing/dégénérées pour
lesquelles les tests amont affirment **uniquement** que dot ne plante pas
(`test_1581` : aucune violation ASan ; `test_2825` : pas de plantage lorsque
`rebuild_vlists` renvoie -1). C rencontre une `Error:` interne
(`install_in_rank` / `rebuild_vlists: lead is null`) et sa récupération jette
du contenu de la disposition ; le portage aboutit aux **mêmes décisions de
suppression de rankset** (parité des avertissements vérifiée : les mêmes noms de
nœuds/graphes dans les avertissements « already in a rankset » de
`mark_clusters`, cluster.c:317-320).

`2825` est désormais entièrement clos. La mission fix-2825-rebuild-vlists
(après 1581) a d’abord comblé l’écart d’une couche : le portage atteint l’état
d’erreur interne *exact* de C — stderr identique à l’octet, y compris l’ordre
des messages (`Error: rebuild_vlists: lead is null for rank 1` puis la
continuation `agerr(AGPREV, ...)` sans préfixe `concentrate=true may not work
correctly.`) — avec `dotLayoutPipeline` propageant correctement l’échec de
`dot_position` pour ignorer `dot_splines`/`dotneato_postprocess`, comme le
`dotLayout` de C (`if (r != 0) return r;` après `dot_position`,
dotinit.c:322-325). Une suite (partie 2) a ensuite comblé l’écart restant dans
la couche de rendu : l’`emit_node` de C conditionne chaque nœud à
`node_in_box(n, job->clip)` (emit.c:1806-1809), et sur ce chemin d’abandon
`job->clip` est dégénéré car `GD_bb` n’a jamais été fixé par `set_aspect` (dans
la fin ignorée de `dot_position`) — C n’émet donc *aucun* nœud, seulement les
cadres de clusters (eux aussi dégénérés). Le portage a porté cette même garde
`node_in_box` (`src/gvc/device.ts:renderNode`, en utilisant `job.bb`/`job.pad`
comme équivalent mono-page de `job->clip`) et a cessé de recalculer une boîte
englobante plausible à partir des positions vivantes des nœuds lorsque
`g.info.bb` n’est pas défini (`src/gvc/device.ts:render`, `job.bb = g.info.bb`
tel quel, comme le `gvc->bb = GD_bb(g)` d’`init_gvc`, emit.c:3272) — chaque
moteur de disposition fixe déjà lui-même `g.info.bb` avant l’exécution de
`render()` sur tout chemin hors abandon, si bien que c’est identique à l’octet
sur les graphes sains et ne modifie la sortie que sur ce chemin d’abandon.
`2825` est désormais `conformant` (sortie de 4 éléments, identique à l’octet à
l’oracle). Voir `.agent-notes/2825-rebuild-vlists-abort.md` pour le suivi
complet du mécanisme des deux parties. `1581` n’atteint jamais l’état
incohérent (c’est un *autre* bogue amont de fenêtre de cluster, pas
`rebuild_vlists`) et dispose donc intégralement son graphe survivant — cet écart
reste ouvert. La sortie de l’oracle sur `1581` est un débris de récupération
sans sémantique définie par l’amont. Preuves :
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md).
Sur chacune de ces entrées, c’est l’**oracle C** qui est défaillant, de l’aveu
même de graphviz : `2471`, `1939` et `1435` sont
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
en amont (tickets
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), cf.
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)) ; la seule
tentative de correctif, la [MR brouillon !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
reste un brouillon non fusionné (dernière modification le 2026-03-20).
`graphs-structs` relève de l’ancienne classe de perte de routage des records
(#102/#242/#274/#1323) que graphviz 15.0.0 stable rend correctement — une
régression de l’oracle en build de développement.

**Ce que fait C.** Sur les membres `init_rank` (`2796`, `2471`, `1939`), le
graphe auxiliaire des coordonnées x de dot natif ferme un cycle orienté par les
arêtes de contrainte de paroi de cluster ; son
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
ne peut pas parcourir tous les nœuds, affiche `Error: trouble in init_rank`, et
la disposition se poursuit à partir de cet état de récupération — pour
`2471`/`2796`, jusqu’à des débris de triangulation de `Pshortestpath` et des
arêtes perdues. Sur `1435` et `graphs-structs`, l’étape défaillante est pathplan
lui-même (impasses de la triangulation par découpage d’oreilles ; une arête de
port de record perdue).

**Entrées vérifiées, puis rendues fidèles (c’est la partie déterminante).** La
mission `verify-oracle-bug-family`
([dossier](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
a exporté, ligne par ligne, le graphe de contraintes que chaque côté fournit au
simplexe réseau, pour chaque membre de la famille — et a constaté que le
comportement « propre » antérieur du portage sur cette famille provenait de
**quatre véritables défauts du portage**, tous corrigés :

1. `flatEdges` sautait l’appel à
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)
   de C, laissant des fenêtres de rangs de clusters obsolètes après l’insertion
   de vnodes d’étiquettes d’arêtes à plat (cela seul faisait perdre **9**
   arêtes au portage sur `2471` là où C en perd 6).
2. La pénalité d’arête de même `group` se déclenchait sur les boucles plutôt que
   sur les extrémités appartenant au même groupe non vide
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS` utilisait la valeur `_WIN32` de C, 100 ; la plateforme de l’oracle
   utilise 1000
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. Une impasse de triangulation interrompait `Pshortestpath` au lieu du
   avertir-et-continuer de C + repli en ligne droite
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

Après correction, les exports de contraintes NS de la famille sont **identiques
ligne à ligne** à C (253 appels rank2 sur `2471` ; tous les appels sur
`1939`/`1435`/`graphs-structs`), et le portage suit C dans la récupération
reconnue comme défaillante : mêmes arêtes perdues (`3->16` sur 2796 ; les 6
identiques sur 2471), mêmes arbres d’éléments. `1939` est devenu entièrement
conforme. Les écarts numériques résiduels (et les débris de pathplan différents
de 1435) relèvent du comportement *à l’intérieur* de l’état de récupération,
que la politique du projet choisit délibérément de ne pas poursuivre.

**`2723` (erreur de segmentation ; épinglé, non poursuivi).** `dot` natif plante
avec une erreur de segmentation (code de sortie 139) sur `tests/2723.dot` (non
orienté, groupes `rank=same`, arêtes étiquetées), si bien que C n’a aucune
sortie à égaler. Le
[ticket amont #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) est
ouvert et `tests/test_regression.py:test_2723` est `xfail`. Le portage lève
`InternalError` (`INTERNAL_ERROR`, avec une cause `TypeError` provenant de
`src/layout/dot/flat.ts:flatLabelYpos`, où `rank[r-1]` est indéfini). Faute
d’oracle correct, l’échec honnête demeure et le portage n’est pas modifié ;
`src/layout/dot/flat-2723.test.ts` l’épingle. Mettez ce test à jour si l’amont
corrige le ticket.

**Note de politique.** La position antérieure sur A4 (« le portage répond aux
attentes du ticket ; ne pas répliquer ») reposait sur la conviction que le
graphe auxiliaire acyclique du portage provenait d’une variante locale bénigne.
Ce n’était pas le cas — il provenait du défaut (1), qui égarait manifestement
`2471`. La fidélité au code source C l’a emporté : le portage reproduit
désormais les résultats défaillants reconnus de C à partir d’entrées dont
l’identité est vérifiée, et chaque entrée ici doit être **re-mesurée lorsque
l’amont corrige le ticket correspondant** (la sortie de l’oracle changera ;
attendez-vous à ce que ces identifiants s’allument comme des régressions lors de
cette mise à niveau — c’est voulu, ce n’est pas de la pourriture).

**Preuves.** Pages de comparaison par identifiant (rendus côte à côte +
dossiers de preuves) :
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`2796 post-fix addendum`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(base de référence avant correctif conservée dans
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)).
Artefacts de diagnostic : `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Octets d’entrée invalides (représentation de l’encodage) {#a5-invalid-input-bytes-encoding-representation}

**Concerné :** `1367` (diverged, maxΔ 0 — exactement une différence
structurelle).

**Ce qui diffère.** Le fichier d’entrée contient un octet de queue UTF-8 isolé
(`0x80`) à l’intérieur d’un nom de nœud. C traite les octets de queue isolés
0x80–0xBF comme des « caractères valides se représentant eux-mêmes »
(`lib/common/utils.c:1200-1207`, sans avertissement), et le texte `<title>` du
nom de nœud contourne entièrement la conversion de jeu de caractères (les
octets d’`agnameof` vont directement à `gvputs_xml`). Le SVG de l’oracle
contient donc l’octet brut et **n’est pas de l’UTF-8 valide** malgré
l’encodage déclaré. Le portage décode l’entrée UTF-8 invalide avec le repli
latin1 (`0x80 → U+0080`) et émet de l’UTF-8 bien formé (`\xc2\x80`).

**Pourquoi c’est accepté.** La frontière d’E/S du portage, ce sont les chaînes
JS (bibliothèque pour navigateur). Un octet brut invalide ne peut pas faire
l’aller-retour via la valeur de retour sous forme de chaîne de `renderSvg` ;
égaler C à l’octet reviendrait à corrompre l’encodage de sortie pour chaque
consommateur. Le repli latin1 reflète la propre sémantique de récupération de C,
« traité comme Latin-1 » (`utils.c:1249`). C’est une contrainte située sous le
code — la couche de représentation — et non un comportement portable que nous
aurions refusé de porter. Tout le reste de 1367 est conforme : nombres
d’éléments (23 polyline / 103 text / 44 polygon / 24 path) et toutes les
coordonnées concordent après le correctif decorate (T6).

**Il en va de même pour les avertissements HTML `SIDES`.** `sidesfn`
(`lib/common/htmllex.c`) avertit une fois pour chaque octet de la valeur qui n’est
pas `l`, `t`, `r` ou `b`. Elle affiche l’octet avec `%c` et sa valeur `char` signée
avec `%d`. Pour une lettre non ASCII (`é` vaut `0xC3 0xA9`), la version native écrit
deux octets isolés, si bien que son stderr n’est pas non plus de l’UTF-8 valide. Le
portage affiche les deux mêmes avertissements avec les mêmes nombres (`-61`, `-87`).
Comme ses avertissements sont des chaînes JS, il montre chaque octet comme le
caractère ayant ce point de code Latin-1 (`Ã`, `©`).

**Il en va de même pour certaines références numériques de caractère dans les libellés.** `htmlEntityUTF8` (`lib/common/utils.c`) écrit lui-même la valeur d'une référence sur un à trois octets. Pour `&#127;`, `&#2047;`, un substitut (`&#55296;` à `&#57343;`) et toute valeur supérieure à `0xFFFF` (`&#128512;` donne `FF 98 80`), ces octets ne sont pas de l'UTF-8 valide, et la version native les écrit tels quels. Le portage écrit le caractère que désigne la référence. La largeur du texte est estimée octet par octet, donc la largeur du libellé peut aussi différer. Les libellés HTML ne sont pas concernés : expat décode leurs références en UTF-8 valide.

**Preuves.** Page de comparaison de
[`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
(rendu côte à côte + dossier de preuves).

---

### A6. Dépassement de capacité de `unsigned int` du canevas sur une entrée dégénérée {#a6-unsigned-int-canvas-overflow-on-degenerate-input}

**Concernés :** sfdp `2556` (une disposition NaN ; voir l’entrée de la piste du
moteur). `1314` — une entrée issue de fuzzing (`fontsize="991836031967s8"`)
dont la taille de police absurde fait gonfler le dessin à environ 2.75e11 pt — est **conforme** avec graphviz 16.1 et son
acceptation est retirée : le portage réduit désormais la taille de page comme le
fait la conversion `ROUND` native (`47f3165d`) et construit le cadrage de page
dans l’ordre de `setup_page` (`da6c4a53`). Les paragraphes de mécanisme
ci-dessous décrivent la différence d’origine.

**Ce qui se passe.** C stocke `job->width` / `job->height` en **`unsigned int`**
(`gvcjob.h:327-328`). Le `ROUND(...)` de cette énorme taille en points
(`emit.c:1249-1250`) dépasse 32 bits et boucle modulo 2³², et le backend SVG
l’émet via un `%d` **signé** (`gvrender_core_svg.c:258-259`) — C affiche donc
`height="-425618343"`. Le portage conserve la valeur mathématiquement cohérente
(sans bouclage). Toutes les autres valeurs — `cx/cy/rx/ry` de l’ellipse du
nœud, le `translate` racine, le polygone, le `font-size` du texte — sont
identiques à l’octet ; seuls la largeur/hauteur de l’élément `<svg>` de plus
haut niveau diffèrent.

**Pourquoi nous ne le poursuivons pas.** Répliquer le dépassement d’entier
32 bits de C n’est pas un comportement de disposition qui mérite d’être porté,
et l’entrée est dégénérée. À réexaminer si l’amont corrige le dépassement (par
exemple en élargissant le champ ou en plafonnant la taille).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Disposition dégénérée en NaN (`sfdp`, `repulsiveforce` pathologique) {#a6b-degenerate-nan-layout-sfdp-pathological-repulsiveforce}

**Concerné :** `2556` — `repulsiveforce=100` (⇒ la force répulsive utilise
`pow(dist, 101)`), ce qui conduit le solveur à ressorts-électrique à **NaN dans
les deux moteurs**. L’oracle natif lui-même émet des positions de nœuds/arêtes
toutes `nan` et une boîte englobante dégénérée.

**Ce qui se passe.** Toutes les coordonnées étant NaN, les deux implémentations
sérialisent ce déchet différemment : (1) la bb du graphe / le polygone d’arrière-plan
— C arrondit `NaN` en `int`, ce qui donne sur arm64 un déchet à l’échelle de
`INT_MIN` (`bb="0,0,-4.295e+09,
-4.295e+09"`) ; le portage conserve `0`. (2) Les opérations de dessin des arêtes
— la passe d’émission native supprime les `_draw_`/`_hdraw_` d’une spline NaN
(n’émettant que le `pos`), tandis que le portage les émet avec des points de
contrôle NaN. Les dessins de nœuds concordent (les deux les suppriment).
Aucune véritable disposition n’existe d’aucun côté.

**Pourquoi nous ne le poursuivons pas.** Le portage reproduit déjà la *même*
explosion en NaN que le natif — le correctif qui y a conduit est authentique
(voir ci-dessous) ; il ne reste que la manière dont chacun sérialise le déchet
NaN. Répliquer le comportement indéfini de `(int)NaN` de C et sa suppression
du dessin des splines NaN n’est pas une fidélité de disposition significative
sur une entrée dont la disposition est dégénérée dans les deux moteurs. À
réexaminer si l’amont plafonne `repulsiveforce` ou assainit les positions NaN.

**Correctifs du portage qui ont rendu cet état atteignable (non écartés :
de vrais bogues).** Auparavant, le portage ne pouvait même pas atteindre l’état
dégénéré : (1) `armPow` (`src/common/arm-pow.ts`) lançait une exception sur tout
argument hors chemin rapide ; il porte désormais toute la branche des cas
particuliers du `pow.c` d’ARM, de sorte que `pow(NaN, y) = NaN` comme dans
libm. (2) `bezierClip` (`src/common/splines-geom.ts`) bouclait indéfiniment sur
des points de contrôle NaN parce que son test de convergence était la négation
naïve du `while (ABS > .5)` de C (équivalente pour des valeurs finies, pas pour
NaN) ; il reflète désormais exactement C et se termine sur NaN. Les deux sont
fidèles à C et ne concernent que des entrées NaN.

---

### A7. Frontière d’arrondi de `round()` pour la paroi de boîte (`dot`) {#a7-round-box-wall-rounding-boundary-dot}

**Concernés :** `graphs-honda-tokoro` et (ajouté le 2026-07-28, nouveau dans
l’univers de 905 éléments) son jumeau de `graphs/directed/`,
`tree-graphs-directed-honda-tokoro` (tous deux structural-match, maxΔ ≈ 1 pt sur
l’unique arête `n012->n011`). Le jumeau ne diffère que par des attributs
`samearrowhead`, qui ne touchent pas le routage de cette paire — sa géométrie
`n012->n011` est identique à l’octet à celle de l’identifiant accepté, côté
portage comme côté oracle, si bien que le mécanisme ci-dessous s’applique tel
quel.

**Ce qui diffère.** La paroi de la boîte du couloir de tête de `maximal_bbox`
tombe à x=90 en interne dans C contre x=89 dans le portage pour le port
`samehead` partagé des deux parallèles `n012->n011`. La construction du port
partagé (`buildSharedPort`) et le regroupement des parallèles sont tous deux
conformes à C à l’octet ; l’écart de 1 px n’est qu’un artefact de frontière
d’arrondi de `round()` — environ 1e-14 de bruit en virgule flottante en amont
fait basculer vers l’entier voisin une valeur située exactement sur une
frontière `.5`. La formule de `maximal_bbox` du portage reflète déjà
exactement celle de C.

**Pourquoi nous ne le poursuivons pas.** `round()` est une primitive que
traverse chaque arête routée du corpus ; infléchir son comportement à la
frontière pour égaler ce seul cas est un risque de régression à l’échelle du
corpus pour 1 px sur 2 arêtes — la même contrainte de primitive partagée que
l’arrondi de l’enveloppe de contrôle noté dans
`bbox-class-control-hull-vs-curve`. Diagnostic complet :
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. Arrondi `fp-contract`/FMA contre IEEE strict (`dot`) — CLOS {#a8-fp-contract-fma-rounding-vs-strict-ieee-dot}

**Statut (2026-10-12) : clos.** Plus aucun identifiant du corpus n’est accepté
sous cette classe ; la section est conservée comme documentation historique. Les
deux instances connues sont **`conformant`** : `2620` (2026-07-11) et `2646`
(2026-10-12).

**Classe.** clang arm64 compile le binaire de l’oracle avec
`-ffp-contract=on`, fusionnant certaines séquences multiplication-addition en
instructions FMA uniques ; le portage s’exécute sur V8, qui applique l’arrondi
IEEE-754 strict. Sur des entrées identiques au
bit près, les deux divergent de 1 à 2 ULP à l’endroit où le compilateur a choisi
de contracter l’expression. Deux instances étaient connues, à deux endroits différents, avec deux mécanismes
d’amplification différents :

- **2646** — l’ULP naissait dans la résolution cubique `points2coeff`/`solve3` de
  `Proutespline` et faisait basculer directement le nombre de racines de l’ajusteur
  de splines.
- **2620** — l’ULP naissait dans la boucle d’étendue des sommets de polygone de
  `poly_init` (dimensionnement des nœuds) et était amplifié en aval par la
  troncature entière fidèle de `ortho` à chaque relaxation, jusqu’à faire
  basculer une égalité de coût entre corridors du labyrinthe.

**Clos : `2646` (`0cc05181`, `fix(pathplan): mirror clang fma contraction in
spline intersection`).** Trois tronçons longs en mode smode (`edge2575`,
`edge3905`, `edge15467`) se terminent sur une paroi de barrière avec une
tangente parallèle, de sorte que la cubique d’intersection de `splinefits` a une
quasi racine double. `points2coeff` construit cette cubique par annulation
catastrophique ; l’oracle fusionne `route.c:397-398` et `solvers.c:43`, si bien
que le portage en IEEE strict obtenait un nombre de racines de `solve3`
différent, un croisement parasite et une division par deux de `a` supplémentaire
(maxΔ 42.09). La conclusion antérieure selon laquelle c’était irréductible
(« émulation logicielle du FMA dans tout l’ajusteur de splines », avec un
correctif partiel réfuté) a été infirmée : les sites de contraction sont finis et
énumérables. Le portage reflète désormais chaque contraction dans `points2coeff`
(`route.c:397-398`), `splineintersectsline` (371-372, 374, 360-361, 383-384),
`solve3` (`solvers.c:41, 43, 46`) et son `solve2` inliné (80, 85), et
`solve3`/`solve2`/`solve1` sont re-portés à la forme de C. Les 42 432 appels
capturés à `Proutespline` de `2646` sont identiques au bit près à l’oracle
(ligne du journal « T7 land »). Diagnostic d’origine (toujours valable pour le
mécanisme) : `plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Concerné (historique) :** `2620` (était structural-match, maxΔ 585 ; 423
différences sur 24 chemins d’arêtes + 22 pointes de flèche). **Devenu conforme
le 2026-07-11** : le portage fidèle du débordement du tampon d’adjacence de
`sgraph` + de l’inclusion bidirectionnelle de `chancmpid` (voir
`.agent-notes/ortho-maze-circo-rca.md`) a supprimé la divergence ; l’entrée
d’acceptation est retirée et cette section est conservée comme documentation de
la classe A8.

**Ce qui diffère.** Le pipeline `ortho` (`splines=ortho`) est conforme à C à
l’octet pour des entrées identiques — prouvé en injectant l’entrée exacte du
labyrinthe de C (coordonnées, `xsize`/`ysize`) dans l’étape ortho du portage :
378/378 segments routés ressortent identiques à l’octet, donc rien dans
`src/ortho` n’est en cause. La véritable divergence est de 1 à 2 ULP dans
l’*entrée* du labyrinthe : le `ysize` du nœud (et, par accumulation au sein du
rang, `ND_coord.y`) calculé dans la boucle d’étendue des sommets de polygone de
`poly_init` de C (`shapes.c`), qui sous `-ffp-contract=on` fusionne
`R.x += sidelength*cosx` en un FMA environ 1 ULP plus grand que l’arithmétique
IEEE stricte du portage (les deux côtés implémentent l’expression
arithmétiquement identique). `2620` compte 173 nœuds polygonaux à largeur
fractionnaire ; tous montrent C ≥ portage de 1 à 2 ULP. Cet ULP est amplifié —
et non introduit — par la relaxation de Dijkstra d’`ortho`, qui tronque
fidèlement sa distance courante à chaque pas (`sgraph.c:165`, reflété par le
portage sous la forme de `Math.trunc`) sur des poids dérivés des étendues brutes
des cellules (`maze.c:257`). La géométrie décalée d’un ULP fait basculer une
égalité de coût entre corridors pour 4 arêtes routées (chemins + leurs pointes
de flèche) ; les autres différences sont des renumérotations de ±1 piste en
cascade à partir de ces 4 bascules.

**Pourquoi c’est accepté (irréductibilité prouvée par une expérience
contrôlée).** Un banc autonome en C ne faisant varier que `-ffp-contract` a
reproduit les deux côtés sur le sommet d’hexagone divergent :
`-ffp-contract=on` → `310.29250168188713` (concorde avec l’oracle),
`-ffp-contract=off` → `310.29250168188707` (concorde avec le portage), l’opération
divergente étant isolée au sommet `i=3` (`R.x=-0.50000000000000011` fusionné
contre `-0.5` non fusionné). Une seconde expérience d’injection d’entrée (seule
variable : les valeurs d’entrée d’ortho) a confirmé l’amplificateur : fournir au
propre `orthoEdges` du portage les `coord`/`xsize`/`ysize` exacts de C ramène à 0
les 4 divergences de corridors — le code d’ortho n’a aucun défaut, il est
simplement sensible (comme le propre routage à coûts de labyrinthe de C) à un
décalage de 1 à 2 ULP de son entrée. Égaler cela reviendrait à émuler la
contraction FMA précise de clang sur un arbre d’expression compilé de
`poly_init` — poursuivre un artefact de compilation, et non porter une
sémantique du source. Diagnostic complet :
`plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Exception émulée (non acceptée) : `triang.c:ccw`.** Un site de contraction EST
reproduit au bit près plutôt qu’accepté : le `ccw` de pathplan se compile en
`fnmul`+`fmadd` (produit exact moins second produit arrondi), si bien qu’un
point de requête égal au bit près à une extrémité de segment est testé
ISCW/ISCCW au lieu de ISON. `shortest.c:pointintri` rejette alors les
extrémités qui sont des sommets de polygone (« destination point not in any
triangle ») et `makeMultiSpline` retombe sur le routage simple pour chaque
2-cycle fusionné — un comportement massif, discret, à l’échelle du corpus, que
le portage doit égaler. Contrairement aux sites `solve3`/`poly_init` ci-dessus
(au fond d’arbres d’expressions compilés, correctif réfuté), `ccw` est une
fonction compilée unique et autonome à la sémantique nette, si bien que
`src/pathplan/triang.ts` l’émule : un chemin rapide en double simple avec une
borne d’erreur conservatrice là où les signes simple et fusionné concordent de
façon démontrable, et un chemin exact par produit de Dekker + BigInt dyadique
pour les cas proches de zéro.

---

### A9. Trigonométrie de libm à 1 ULP → bascule d’égalité cocirculaire du CDT (multispline `circo`/`twopi`) {#a9-libm-trig-1-ulp-→-cdt-cocircular-tie-flip-circo-twopi-multispline}

**Classe.** Les `Math.sin`/`Math.cos` de V8 ne sont pas identiques au bit près
aux `sin`/`cos` de libm d’Apple (prouvé : désaccord de 1 ULP à `2π·4.5/8`, l’un
des huit angles de coin d’obstacle ellipse). Les coins de l’octogone circonscrit
de `makeObstacle` héritent de cet ULP, si bien que les coordonnées d’entrée du
routeur triangulaire diffèrent de celles de l’oracle d’au plus 6e-14. Les
dispositions symétriques (nœuds de même taille sur un rang/anneau) rendent les
quadrilatères du routeur **exactement cocirculaires** en arithmétique réelle, si
bien que le prédicat d’incercle exact se trouve sur le fil du rasoir : l’ULP en
entrée inverse son signe, la diagonale de la triangulation de Delaunay
contrainte bascule, et le polygone de couloir qui fait échouer `Pshortestpath`
dans l’oracle (« destination point not in any triangle » → repli en spline
simple) réussit dans le portage (ou inversement). Les splines obtenues diffèrent
d’environ 0.2–0.5pt. Cousin des **A3**/**A8** (désormais closes) : une contrainte irréductible de
portabilité en virgule flottante située sous la sémantique du source C — égaler
exigerait de reproduire en JS l’arrondi exact des `sin`/`cos` de libm d’Apple.

**Réévaluation 16.1.** La géométrie du couloir multispline manquait la
contraction FMA de clang (radicande du coin d’ellipse, `mkCtrlPts`, `DIST` =
sqrt(fmadd), le produit scalaire de `line_intersect`) ; `f66ac638` (`fix(neato):
mirror fma contraction in multispline routing geometry`) l’a reflétée. `241_0`
de twopi et de neato — que cette classe avait attribués à l’égalité
cocirculaire ci-dessous — sont devenus **conformes** (acceptations retirées), et
`42` de sfdp s’est révélé ne comporter aucune égalité (c’est de la dérive A1,
voir [`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md)). `241_0` de fdp est devenu **conforme** plus tard, après une seconde correction côté portage de la triangulation (ordre des sommets des faces après un échange d’arête ; voir le paragraphe fdp ci-dessous). `241_0` de circo et sfdp
divergent encore, avec des résidus inchangés ou réduits ; leur attribution à
l’égalité ci-dessous est antérieure à `f66ac638` et n’a **pas été revérifiée par
injection de positions** depuis que ce correctif a montré cette même attribution
erronée pour twopi/neato.

**Concernés :** `241_0` (circo Δ≈0.2 via la bascule de couloir sur l’arête
`1->2` ; `241_0` de sfdp sur la piste de moteur ci-dessous) ; `2343`,
`2239`, `share-b29`, `windows-b29`
(twopi, 1 à 2 différences de position d’étiquette d’arête chacun — l’ULP de
libm naît dans la trigonométrie des sommets unitaires de `poly_init`
(`hypot`/`atan2`/`sin`), place la hauteur calculée d’un nœud un ULP au-delà du
plancher de taille minimale sur lequel l’oracle tombe exactement, et se
propage via `floor()` dans le chargement du R-tree des xlabels jusqu’à une
bascule de candidat d’étiquette unique. Un correctif par `hypot` à arrondi
correct a été essayé et RÉFUTÉ : il corrigeait `2343` mais faisait régresser
`2168_3`, dont le dimensionnement d’octogone passe par le même appel où la
valeur de l’oracle n’est PAS celle arrondie correctement — aucune politique de
`hypot` déterministe n’égale l’oracle sur les deux). `2168_1` figurait à
l’origine dans cette classe mais est devenu conforme dès que le portage a émulé
le `ccw` contracté en FP de l’oracle (`triang.ts` de pathplan) : son échec de
couloir est gouverné par le rejet des extrémités-sommets de `pointintri` sous
FMA, que le portage reproduit désormais au bit près, si bien que l’égalité d’ULP
de la diagonale CDT n’y apparaît plus.

**Pourquoi c’est accepté (irréductibilité prouvée par une expérience
contrôlée).** Le CDT lui-même est disculpé : le `mkSurface` du portage est un
portage fidèle de l’insertion incrémentale de GTS 0.7.6 (`cdt.c` : découpage
1→3 + `swap_if_in_circle` récursif, arêtes de contrainte préalablement créées et
non échangeables, application des contraintes par `remove_intersected_*` +
`triangulate_polygon`), et un banc autonome en C liant la **vraie bibliothèque
GTS** et alimenté par les entrées exactes au bit près du routeur du portage
reproduit la triangulation du portage face pour face (2168_1 : 22/22 ; 241_0 :
185/185). L’évaluation en rationnels exacts du déterminant d’incercle sur les
deux jeux d’entrées confirme l’inversion de signe (+1 avec les entrées du
portage, −1 avec celles de l’oracle). La variable résiduelle — la différence de
1 ULP de la trigonométrie — a été isolée en comparant directement les motifs de
bits de `Math.sin`/`sin`.

**Acceptation au niveau de la piste d’un moteur (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> Les **pistes xdot des moteurs**
twopi/circo (`parity-twopi.json` / `parity-circo.json`, oracle natif
`dot -K <engine> -Txdot`, `test/corpus/engine-walk.ts`, comparaison sémantique
des opérations de dessin à ±0.01 — voir `test/golden/compare-xdot.ts`) font
apparaître ce même mécanisme indépendamment du relevé SVG du moteur dot cité
plus haut : twopi `2239` (1 différence d’opération de dessin — la bascule de
position du texte d’étiquette d’arête `_ldraw_`, le même ULP de trigonométrie
des sommets unitaires de `poly_init` se propageant par la chaîne `floor()` du
R-tree des xlabels ; `2343`, `share-b29` et `windows-b29`, acceptés à l’origine
sous cette entrée, ont été *corrigés* le 2026-07-11 par la contraction fmadd
fidèle dans `polylineMidpoint` — voir le paragraphe de la famille b29 plus bas)
et circo `241_0` (41 différences d’opérations de dessin, Δ≈0.2pt sur la Bézier
routée de l’arête `1->2` — la même bascule de couloir de diagonale CDT ; journal
de décisions, entrée du 2026-07-10 « CDT rewritten as faithful GTS port;
2168_3 outline-ring obstacle; 56/osage bb clobber; A9 filed »). Accepté au
niveau de la piste du moteur via `test/corpus/accepted-divergences-engines.json`,
joint à `PARITY-twopi.md`/`PARITY-circo.md` par `parity-report.ts` — la même
jointure que `accepted.ts` effectue pour `PARITY-dot.md` sur la piste dot.

**circo `2475_2` et `2095_1` — égalité de `hypot` de closestNode cocirculaire
(corrigé).** Dans une composante de 28 nœuds de ce graphe de 10762 nœuds, le
`getRotation` de circo (`circpos.c:73-92`) choisit le nœud du bloc le plus
proche de l’origine de la disposition via `hypot` pour décider de la rotation du
sous-bloc. Deux nœuds cocirculaires sont effectivement équidistants ; le
`Math.hypot` de V8, à arrondi correct, et le `hypot` de libm d’Apple
arrondissent cette distance à 2 ULP d’écart, ce qui inverse le `<` strict,
sélectionne un nœud différent et fait pivoter/réfléchir le sous-bloc d’environ
20° (18 nœuds bougent, maximum 296.7pt ; les 10744 autres nœuds sont identiques
au bit près, de même que l’arbre des blocs, l’ordre du cercle et chaque
`centerAngle`). `2095_1` tombait sur la même égalité (2197 différences
d’opérations de dessin, trois rotations rigides de blocs). Les deux étaient
acceptés jusqu’au 2026-10-16, date à laquelle la recherche du nœud le plus
proche est passée au modèle exact au bit du `hypot` d’Apple dans le portage
(`src/common/libm-hypot.ts`) ; les deux sont désormais conformes. Reproduction
autonome : `.agent-notes/circo-2475-590-repro.dot` ; analyse de cause racine
complète : `.agent-notes/circo-b81-2475-rca.md`.

**twopi `2470` — ULP de coordonnée radiale amplifié par le R-tree des xlabels.**
2470 est un graphe de 140 arêtes dont les étiquettes d’arêtes HTML `<table>`
s’agglutinent sur des ancres radiales quasi coïncidentes. Dans la famille neato,
les étiquettes d’arêtes sont placées comme étiquettes externes par le placeur
glouton de xlabels (`label/xlabels.c`), qui choisit le coin candidat qui se
chevauche le moins via un R-tree ordonné de Hilbert. Les splines et coordonnées
de nœuds du portage concordent avec l’oracle à la précision d’émission (zéro
différence de spline/nœud/boîte englobante, même à 1e-7), mais le `ND_coord.y`
radial d’un nœud diffère d’environ 2 ULP (`sin`/`cos` de libm d’Apple contre
`Math` de V8) — bien en dessous du critère de conformité, mais il chevauche
exactement à 0 la frontière `floor(pos.y − sz.y/2)` dans `objplpmks`, faisant
basculer d’une unité le rectangle R-tree de cet objet. Le changement d’ordre de
Hilbert/de regroupement d’arbre fait que `RTreeSearch` élague une branche
différente, si bien qu’environ 140 étiquettes se calent chacune sur le coin
candidat voisin (chaque écart étant un pas fixe (+largeur, −hauteur de ligne)). Le
placeur, l’ordre des objets, l’arrondi des rectangles, `CombineRect` (qui reflète
fidèlement la bizarrerie min-min de C) et la clé de Hilbert int32 ont chacun été
vérifiés fidèles ; la divergence est l’ULP de trigonométrie radiale en amont,
irréductible pour la même raison que twopi `1855`. Accepté le 2026-07-11 ;
analyse de cause racine complète : `.agent-notes/twopi-2470-rca.md` (qui
documente aussi que la « réussite » matinale de cet identifiant était un
artefact d’un binaire d’oracle périmé, et non une régression du portage).

**osage `1855` — bavure fp-contract sur les sommets d’obstacle.** Distinct de
l’entrée de miroir radial de twopi `1855` ci-dessus : sous osage, les centres de
nœuds sont exacts au bit près par rapport à l’oracle, et les 110 différences
d’opérations de dessin sont trois arêtes routées autour d’obstacles placées du
côté miroir d’une rangée de nœuds (X exact au bit près, Y en miroir). Les
sommets d’obstacle en octogone issus de
`circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) diffèrent de
C de 3 à 4 ULP parce que le `-ffp-contract=on` de clang fusionne les chaînes
`a·b±c` d’`ellipse_tangent_slope`/`line_intersection` en FMA à arrondi unique
tandis que V8 arrondit chaque opération : l’arrondi fusionné de C fait
s’effondrer une colonne de gouttière de valeurs x de coins en un seul double
identique au bit près (exactement colinéaire), alors que celui du portage la
scinde en deux valeurs distantes de 1 ULP. Cela inverse le test de tangence de
visibilité `clear()` — la gouttière n’est plus bloquée —, ajoutant environ 20
arêtes de visibilité, et Dijkstra résout l’égalité d’homotopie haut/bas vers le
côté miroir. Expérience contrôlée : injecter les coordonnées exactes d’obstacle
de C dans le portage par ailleurs intact donne **zéro** arête divergente,
disculpant entièrement l’arrangement légal, la visibilité, Dijkstra et la chaîne
de splines ; injecter seulement les `cos`/`sin` de libm de C est sans effet.
Accepté le 2026-07-11 ; analyse de cause racine complète :
`.agent-notes/osage-spline-family-rca.md`.

**Famille b29 (twopi, corrigée).** Les quatre variantes b29 partageaient un même fil du
rasoir : l’étiquette d’arête `EqmtTyp` (`Node14732->Node14731`) se trouvait sur une
égalité exacte de sélection de côté de placeLabels, dont l’issue dépendait d’une dérive
de disposition twopi de 1 ULP dans les objets environnants. Avec la contraction fmadd
fidèle dans `polylineMidpoint` (correctif de la famille states, 2026-07-11), l’ancre
d’étiquette du portage est devenue identique au bit près à celle de l’oracle, et
pourtant l’égalité se résolvait encore à l’opposé sur deux des quatre variantes
(`graphs-b29`, `linux.i386-b29`) tandis que les deux autres (`share-b29`, `windows-b29`)
étaient conformes — et la différence d’étiquette A9 acceptée de `2343` a entièrement
disparu. Borne : 1 opération de dessin, Δ12pt sur le y de l’étiquette. Le 2026-10-20,
chaque évaluation de Bézier du portage est passée par un seul `bezier()` fusionné, comme
clang contracte le `Bezier` de graphviz (`e37e72f0`). Cela a supprimé la dérive
en amont : `graphs-b29` et `linux.i386-b29` sont désormais conformes eux aussi, et leurs
acceptations sont retirées. Analyse de cause racine complète :
`.agent-notes/twopi-states-rca.md`.

Le même fil du rasoir de placeLabels apparaissait sur la piste **osage** (accepté le
2026-07-11, analyse de cause racine complète : `.agent-notes/osage-small-tail-rca.md`) :
`linux.i386-b29` et `share-b29` (2 différences d’opérations de dessin chacun — l’ancre
en x d’une étiquette d’arête tombe à 878.28 contre 841.06, placée symétriquement autour
du milieu de spline, identique au bit près, 859.67, c’est-à-dire ±la demi-largeur de
l’étiquette ; les deux variantes sont le miroir l’une de l’autre) et `1652` (2
différences d’opérations de dessin — deux arêtes font chacune basculer une ancre
d’étiquette autour d’un milieu identique, l’une en x et l’autre en y, avec des splines
et des pointes de flèche identiques au bit près ; l’oracle rend complètement, ce n’est
donc pas l’instabilité connue de délai dépassé du natif). Dans chaque cas, la géométrie
des arêtes était exacte au bit près et seule l’égalité de sélection du côté de
l’étiquette se résolvait à l’opposé sur un environnement dérivé de 1 ULP. Le `bezier()`
fusionné du 2026-10-20 (`e37e72f0`) a supprimé cette dérive aussi : les trois sont
désormais conformes, de même que `2371` d’osage, non accepté, et leurs acceptations sont
retirées.

La piste osage porte le triplet `polypoly` (`graphs-polypoly`, `share-polypoly`,
`windows-polypoly` ; accepté le 2026-07-11, analyse de cause racine complète dans
`.agent-notes/patchwork-tail-rca.md`) : la seule opération divergente est le
`cos(π+θ)` transcendant brut à un sommet de quadrilatère déformé d’orientation
180 — le `Math.cos` de V8 est à arrondi correct tandis que le `cos` de libm
d’Apple porte une erreur de ±1 ULP dépendant de l’argument (si bien que ce n’est
que sous libm que `|cos(π+θ)| ≠ |cos(θ)|`) ; l’écart de taille de nœud de 1 ULP
alimente le `GRID`/`ceil` de pack, fait basculer une égalité de périmètre, et le
qsort place deux composantes dans les cellules d’empaquetage l’une de l’autre —
un échange rigide de nœuds entiers, sans erreur de forme ni de routage. Aucune
réécriture déterministe ne peut reproduire une transcendante de libm qui n’est
pas à arrondi correct, la forme typique de A9.

Le même mécanisme a été confirmé le 2026-07-28 sur le jumeau plus grand
`tree-graphs-directed-polypoly` (`graphs/directed/polypoly.gv`, nouveau dans
l’univers de 905 éléments ; 112 différences d’opérations de dessin, osage
uniquement). L’opération divergente est le même site de 1 ULP, `cos(π+θ)` du nœud
`9004` — les valeurs `bb.x` de C et du portage concordent octet pour octet avec
l’analyse de cause racine d’origine — mais sur cette entrée de 76 nœuds, la
propagation passe plutôt par `arrayRects` d’osage : `acmpf` trie les cellules de
pack selon la somme brute `width+height`, et la largeur plus haute de 1 ULP de
libm fait trier `9004` strictement avant ses frères pivotés `9000/9002/9006`
tandis que la valeur à arrondi correct de V8 laisse une égalité exacte à 4 que le
qsort instable ordonne différemment — cellules en ordre ligne-colonne
différentes, un échange `9002`/`9006`, et une cascade de `fmax` sur la largeur de
colonne décalant 8 voisins en x. Fournir au propre `arrayRects` du portage les
tailles de nœuds de C contre celles du portage reproduit les 10 nœuds déplacés du
balayage avec des écarts en x concordant à l’octet, bouclant la chaîne causale.

Deux autres instances de piste de moteur ont fait l’objet d’une analyse de cause
racine et ont été acceptées le 2026-07-11 (analyse complète :
`.agent-notes/circo-edge-tail-rca.md`) : twopi `241_0` (6 différences
d’opérations de dessin, attribuées alors à la même égalité d’incercle
cocirculaire du CDT que l’entrée circo ci-dessus ; **retirée avec graphviz 16.1**
— elle est conforme depuis `f66ac638`, la bascule de couloir de 14 points contre
8 points était donc la contraction FMA non reflétée, et non une égalité) et circo
`windows-tree` (10 différences d’opérations de dessin sur une
arête d’éventail — la trigonométrie de placement de circo place `node2.y` un
simple ULP au-dessus de `node8.y` autour de la valeur exactement symétrique
18.0, et la sélection du port de tête dyna de `closestSide` bascule TOP/BOTTOM à
cette égalité exacte ; les positions et boîtes des nœuds sont par ailleurs
identiques au bit près à l’oracle ; **retiré le 2026-10-18** — il est conforme depuis que le DIST2 du portage prend la forme fusionnée de clang, qui tranche cette égalité exacte comme C).

**Piste du moteur sfdp — égalité FP sur les arêtes (`241_0`).**
<a id="a9-sfdp-fp-ties"></a> La piste xdot du moteur sfdp (`parity-sfdp.json`,
`dot -Ksfdp -Txdot` natif, ±0.5) fait apparaître l’égalité d’incercle
cocirculaire du CDT dès lors que les positions natives exactes d’avant routage
sont injectées (la divergence n’est donc PAS une dérive itérative — voir la
classe A1-drift — mais une égalité de prédicat discrète) :

- `241_0` — attribuée à l’égalité d’incercle cocirculaire du CDT (le couloir
  multispline ; non revérifiée après `f66ac638`, voir la réévaluation 16.1
  ci-dessus). Le résidu est une **bascule du nombre de segments** : 7 différences
  d’opérations de dessin sur l’arête 1->2, `ptCount 8 vs 20` (20 différences
  avant `f66ac638`) — le couloir réussit avec une spline de N points là où le
  build natif retombe sur un tracé simple plus court (ou inversement), comme
  dans l’entrée circo `241_0` ci-dessus. Le portage émule déjà la contraction `fmadd`
  d’arm64 dans le prédicat d’incercle/`ccw` (`src/pathplan/triang.ts`,
  `src/common/fma.ts`) et utilise un Delaunay à incercle robuste ; le résidu est
  le 1 ULP entre `sin`/`hypot` de V8 et de libm d’Apple dans l’entrée du
  prédicat, qu’aucun code portable ne reproduit.

> **`42` de sfdp reclassé de A9 à A1-drift (synchronisation graphviz 16.1).** Il
> était répertorié ici comme une égalité d’incercle CDT/libm. La mission a
> constaté autre chose ([`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md)) : l’ancienne
> bascule de couloir était un mauvais portage FMA côté portage dans la géométrie
> du couloir multispline, corrigé par `f66ac638` (`fix(neato): mirror fma
> contraction in multispline routing geometry`) ; avec les positions natives
> injectées, le portage reproduit désormais exactement le xdot natif. Le résidu
> restant (décalages de nœuds de 0.06-0.65 pt) est de la dérive itérative,
> amorcée par un désaccord de 1 ULP entre le `pow(dist, 2)` de libm d’Apple et le
> `pow` ARM du portage au niveau le plus grossier, amplifié par les niveaux plus
> fins — A1 (voir [A1](#a1-floating-point-determinism-force-directed-engines)).

> **`2095` reclassé de A9 à A1-drift (2026-07-22).** Il était auparavant
> répertorié ici comme « le cousin hypot » (dérive inférieure à 0.7pt sur les
> arêtes d’un nœud au nom vide `""->"4"`). Ce résidu était un **artefact du
> banc d’essai** : l’expression régulière `GVTS_POS` de l’injecteur
> d’attribution exigeait ≥1 caractère de nom, si bien que le nœud nommé `""`
> n’était jamais injecté et entraînait ses deux arêtes incidentes. Une fois
> l’injecteur corrigé pour accepter les noms vides (`(.+)`→`(.*)`,
> `src/layout/neato/splines.ts`), sfdp `2095` s’injecte à **0 résidu** — pure
> dérive des forces, couverte par la classe A1-drift calculée, et non une
> égalité FP de routage. Son acceptation par identifiant a été retirée de
> `accepted-divergences-engines.json`. (Même constat que pour fdp `2095`
> ci-dessous.)

**Nouvelle expérience contrôlée (2026-07-21).** Une sonde `hypot` natif contre
V8 (`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`) : compiler le
`hypot` C du système et le comparer au `Math.hypot` de Node sur des entrées
représentatives de déviation d’arête à plat montre un désaccord de 1 ULP sur 2
cas sur 6 (Δ 7.1e-15 et 5.7e-14) — le fil du rasoir du seuil de scission qui
fait basculer le nombre de subdivisions. Irréductible : aucun `hypot` portable ne
reproduit celui de libm d’Apple (le précédent d’`arm-pow.ts` pour la même
frontière). `sfdp.241_0` est accepté au niveau de la piste du moteur via
`accepted-divergences-engines.json`. `sfdp.42` ne relève **pas** de cette classe :
son entrée de registre est A1 (`comparisons/sfdp-42.md`), et la sonde ci-dessus
ne l’a pas expliqué.

La piste xdot du moteur **fdp** (`parity-fdp.json`, `dot -Kfdp -Txdot` natif,
±0.5) montrait auparavant le même graphe, `241_0`, comme relevant de cette classe :
avec les positions exactes d’avant routage de l’oracle injectées, il restait 11
différences numériques d’`unfilled_bezier` sur une seule arête (`0->1#0`, maxΔ
3.39pt), attribuées à l’égalité d’incercle cocirculaire. Cette attribution était
erronée. `fix(T9): start swapped cdt faces at the new diagonal as gts does` (2026-10-22) a trouvé
une erreur de portage : `swap_if_in_circle` de GTS construit ses deux nouvelles faces
comme `gts_face_new(en, e5, e2)` et `gts_face_new(en, e3, e4)` (`cdt.c:509-511`),
et `gts_triangle_vertices` lit une face selon l’ordre de ses arêtes, si bien que le
natif les énumère comme (v3, v4, v2) et (v4, v3, v1) ; le portage stockait les deux
décalées d’un cran, et `triCenter` du routeur multispline sommait les sommets dans
cet ordre. Une fois l’ordre corrigé, `241_0` de fdp concorde avec le natif sur
toutes les pistes (xdot réussi, json conforme, plain et stderr identiques), et ses
entrées de `accepted-divergences-engines.json` et de
`accepted-divergences-json.json` sont retirées. En revanche, le `2095` de fdp
relève de **A1-drift, et non de A9** : injecter l’unique nœud au nom vide (après
correction de l’injecteur d’attribution pour qu’il accepte les nœuds nommés
`""`) ramène son résidu à zéro — la « queue A9 » précédente était le nœud vide
non injecté qui entraînait ses arêtes incidentes. L’acceptation de `2095` pour
sfdp relevait du même angle mort — une nouvelle régénération de l’attribution
sfdp (2026-07-22) avec l’injecteur corrigé a confirmé qu’il s’injecte lui aussi à
0, et son acceptation a été retirée (voir la note `2095 reclassé` ci-dessus).

**sfdp `2168_3` — `sin` d'Apple libm à 1 ULP dans `poly_init` (clos, irréductible).** **Concerné :** sfdp `2168_3` (stderr uniquement : le portage émet un avertissement `Pshortestpath` supplémentaire ; le parcours de la piste xdot passe, car les deux côtés retombent sur des lignes droites). **Ce qui diffère :** `shapes.c:2329` calcule `temp = GAP / sin(gamma)` (portage `src/common/poly-sizing.ts:379`) ; pour gamma = 1.0092081171617377, la libm de macOS renvoie 0.8464104077694533, V8 la valeur correctement arrondie 0.8464104077694532 (1 ULP). L'écart atteint le routeur multispline (`neatosplines.c:428,444` → `multispline.c:598`) comme point de routeur 10/18, y 28.391789367446776 contre …78 ; le trapèze cocirculaire (points 9, 10, 15, 16) est alors triangulé avec une autre diagonale de Delaunay, de sorte que le polygone de couloir de l'arête 1 diffère et que `Pshortestpath` échoue sur le polygone du portage. **Pourquoi accepté :** une expérience contrôlée n'injectant que cette valeur de `sin` rend stderr, triangles, polygones et xdot identiques au natif (`atan2` seul ne suffit pas) ; les positions sfdp sont identiques au bit près, et le prédicat incircle, pathplan, le hypot de `makeObstacle` et l'ordre arithmétique de l'anneau de contour ont été écartés. Y correspondre exige un modèle exact au bit du `sin` d'Apple, dont le source n'est pas public ; aucun code portable ne peut le reproduire (même frontière que le précédent `arm-pow.ts`). **Preuve :** [`plans/post-16-1-followups-2/decision-journal.md`](https://github.com/knowvah/dot-engine/blob/main/plans/post-16-1-followups-2/decision-journal.md), ligne 2026-10-20 T13.

---

### A10. Limite de taille de `Map` de V8 dans l’empaquetage de polyominos (`2784`, cinq moteurs à empaquetage) {#a10-v8-map-size-limit-in-polyomino-packing-2784-five-pack-based-engines}

**Concerné :** `2784` sur `circo`, `twopi`, `neato`, `fdp` et `sfdp`. Le portage
lève une erreur sur les balayages xdot et imagemap des cinq moteurs et sur le
balayage `json` de `circo`. Sur les balayages `json` de `twopi`, `neato`, `fdp` et
`sfdp`, ainsi que sur les balayages `plain` des cinq, l’oracle natif lui-même ne
termine pas dans le budget de temps du balayage ; ces lignes sont donc des erreurs
de l’oracle. Sur `dot`, `osage` et `patchwork`, il réussit.

**Ce qui se passe.** `lib/pack/pack.c` consigne les cellules qu’occupe une
composante dans un `PointSet`. Pour `2784` (un unique nœud de 3e16 pt de haut,
`splines="ortho"`), l’arithmétique entière fidèle de `step`/placement exige
2 011 656 764 cellules ; la version native 16.1.0 se termine en 482 s avec
67.3 Go résidents (101 Go au pic). Le `PointSet` du portage est un `Map`
JavaScript, que V8 plafonne à 2^24 entrées ; il lève donc
`Map maximum size exceeded`.

**Pourquoi c’est accepté.** Une limite d’exécution située sous le code, et non
une lacune logique ; la cause est l’arithmétique fidèle de `97fcccd8` (avant
elle, le portage calculait une petite disposition erronée et n’atteignait jamais
la limite). Le résultat accepté est une erreur levée plutôt qu’un verdict
`diverged` ; les entrées de `accepted-divergences-engines.json`,
`accepted-divergences-json.json` et `accepted-divergences-map.json` déclarent donc
`verdict: "port-error"` avec `errIncludes: "Map maximum size exceeded"` : elles
n’acceptent une erreur du portage que si elle porte ce message. Un autre échec sur
`2784` apparaîtrait comme une faute non acceptée, et
`registry-staleness.test.ts` signalerait l’entrée comme périmée. Preuves :
[`comparisons/2784-pack-cells.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/2784-pack-cells.md).

---

## Longue traîne suivie (attributs de `dot` et cas limites) {#tracked-long-tail-dot-attribute-edge-case}

Avec les **valeurs par défaut**, le moteur `dot` concorde avec le binaire C à une
tolérance déterministe stricte sur le corpus golden (le verdict `conformant` ;
voir la note en tête de page). Les différences restantes forment la **longue
traîne d’attributs et de cas limites** — la partie historiquement difficile de
tout portage de Graphviz. Contrairement aux écarts acceptés ci-dessus, ceux-ci
*seront* comblés ; ils sont suivis en direct, avec compteurs, dans
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md) :

| Catégorie | Ce qui diffère |
|---|---|
| **path-structure** | Routage des splines d’arêtes dans des configurations précises (par exemple certains cas d’arêtes à plat et de couloirs denses). |
| **element-count** | Une fonctionnalité qui émet plus ou moins d’éléments SVG que C dans certains graphes. |
| **color-stroke** | Différences d’émission du contour/remplissage pour certains attributs de style. |
| **parser-gap** | Un petit nombre d’entrées DOT que l’analyseur n’accepte pas encore complètement. |

Si votre graphe n’utilise que des attributs courants et le moteur `dot`, vous
êtes presque certainement sur la voie de concordance à tolérance déterministe.
Si une disposition semble erronée, consultez `PARITY-dot.md` pour cette classe
d’entrée — il s’agit vraisemblablement d’un élément suivi avec une mission de
correctif épinglée sur l’oracle, et non d’une inconnue.

> **Note sur les cas pilotés par les étiquettes.** La classe de mesure du texte
> (A2) est close — plus aucun graphe `dot` n’y est accepté. Un graphe qui se
> trouve aujourd’hui à structural-match est un écart suivi, et non un écart de
> métriques de police.

### Pointes de flèche des arêtes opposées avec `concentrate=true` {#concentrate-true-opposing-edge-arrowheads}

Lorsque `concentrate=true` fusionne une paire anti-parallèle (`A->B; B->A`) en
une seule arête survivante, cette arête doit dessiner une pointe de flèche aux
**deux** extrémités. C’est désormais porté (la branche `conc_opp_flag` de
`arrow_flags` ; voir `src/common/splines-clip.ts:arrowFlags`), si bien que
`graphs-b135`, `167` et `2087` concordent (la divergence `element-count` de
pointe de flèche manquante et son effet de bord sur le `@d` de spline non
découpée ont tous deux disparu).

Certains graphes avec concentrate **conservent un résidu distinct, préexistant**,
que le correctif de pointe de flèche ne traite **pas** — c’est un écart de
position en **abscisse** de nœud (simplexe réseau en x / ports de boussole), et
non un défaut de pointe de flèche :

- **`graphs-b15`, `graphs-b69`** — les grands graphes « ascenseur » de
  records/clusters. Concentrate s’active et fusionne correctement ; le résidu est
  un écart d’abscisse de nœud d’environ 1pt qui s’amplifie en une différence
  d’`element-count`/de `@d` de spline. L’émission de pointe de flèche
  elle-même est désormais correcte (b69 récupère ses polygones de pointes de
  flèche manquants). Voir la note d’agent `b69-concentrate-undermerge` pour la
  cause racine sur les abscisses.
- **`1453`** — diverge encore pour une cause `element-count` de haut niveau sans
  rapport avec la pointe de flèche de conc_opp_flag.
- **`2825`** — au moment de ce correctif de pointe de flèche, divergeait pour une
  cause `element-count` de haut niveau sans rapport avec conc_opp_flag (aucune
  fusion de paire opposée n’y est déclenchée) ; depuis clos par la mission
  fix-2825-rebuild-vlists, voir A4 ci-dessus.

Ce sont des éléments suivis relatifs aux abscisses / à la structure, **et non**
des bogues de pointes de flèche.

### Écarts de fidélité de disposition issus de la mission de fidélité 2.0 (neato, sfdp, fdp, twopi, circo) {#layout-fidelity-gaps-from-the-2-0-fidelity-mission-neato-sfdp-fdp-twopi-circo}

La mission de fidélité 2.0 a fait échouer bruyamment les valeurs d’attributs non
portées (voir le tableau `UNSUPPORTED_FEATURE` dans
[Erreurs et exceptions](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
Elle a laissé ce qui suit, consigné dans `plans/v2-fidelity/decision-journal.md`.

**Bruyant, non porté.** `overlap=voronoi` avec des nœuds qui se chevauchent
lève encore `UNSUPPORTED_FEATURE` dans neato, twopi, circo et sfdp : l’ajusteur
de Voronoï lui-même (l’algorithme de `vAdjust`) n’est pas porté. Le test de
chevauchement qui décide de lever l’erreur est celui de C (`countOverlap` sur
les polygones de nœuds de `poly.c`).

**Écarts connus, encore silencieux.** Le portage rend ces cas sans erreur et
diffère de Graphviz natif. Trouvés par la mission `v2-silent-gaps`
(`plans/v2-silent-gaps/decision-journal.md`) ; ce ne sont pas des écarts
acceptés.

- **L’avertissement « Unrecognized overlap value » de `getAdjustMode` n’est pas
  émis.**
- **Les sommets de polygones pivotés peuvent différer du natif aux derniers bits
  (irréductible : bibliothèque mathématique de l’hôte).** `poly_init` oriente
  chaque sommet avec `atan2`, `hypot`, `sin` et `cos`. Avec des entrées
  identiques au bit près, la libm de macOS et V8 renvoient des derniers bits
  différents (par exemple `atan2(0x3fd6a09e667f3bce, 0xbfd6a09e667f3bca)` : libm
  `…21d1`, V8 `…21d2` ; `hypot` au sommet suivant : libm `…fffd`, V8 `…fffe`),
  si bien qu’une boîte avec `orientation=20` obtient un y de sommet de `-18`
  dans le portage et de `-17.999999999999996` en natif. Graphviz natif lui-même
  varie avec la libm de la plateforme, et un navigateur ne peut pas l’appeler.
  L’arithmétique propre du portage concorde avec C (ordre de `RADIANS` fixé ; 776
  des 1664 coordonnées de sommets échantillonnées sont identiques au bit près, les
  autres diffèrent uniquement à cause de libm). Effet : les verdicts de
  `polyOverlap` en contact exact peuvent basculer ; avec les sommets natifs,
  chaque verdict concorde.
- **sfdp peut différer du natif sous macOS (irréductible : `pow` de la libm de
  l’hôte).** Diagnostiqué avec un sfdp natif instrumenté : les positions restent
  identiques au bit près jusqu’à ce qu’un terme de force répulsive,
  `pow(dist, 1 - p)` (`spring_electrical.c`, `p = -1` donc `pow(x, 2)`), renvoie
  1 ulp de moins que `x*x` avec la libm de macOS (`pow(1.4116727416983157, 2)` :
  libm `1.9928199296540394`, arrondi correct `…396` ; sous macOS `pow(v, 2) !=
  v*v` pour 20 des 16201 `v` échantillonnés). Cela change le `Fnorm` de
  l’itération au dernier bit ; le refroidissement adaptatif de sfdp l’amplifie
  en une disposition différente (souvent en miroir). Le `armPow` du portage est
  le `pow` des optimized-routines d’ARM (glibc ≥ 2.28), c’est-à-dire ce que
  calcule Graphviz sous Linux ; l’oracle macOS est l’exception. Écartés :
  l’initialisation aléatoire (les valeurs explicites de `start=` concordent),
  `pcp_rotate` (la même entrée donne la même sortie), les positions et le terme
  attractif (identiques au bit près). Exemple : un triangle isolé
  `a--b; a--c; b--c` avec la graine par défaut.
- **fdp peut différer du natif à cause du `cos`/`sin` de la libm de l’hôte.** fdp
  suit Graphviz après la 15.0.0 (répulsion à distance `hypot`, `Mlimit`), le
  `hypot` de la libm de l’hôte étant reproduit au bit près
  (`src/common/libm-hypot.ts`, 0 écart sur 400 000 échantillons). 251 des 252
  entrées golden rendables par fdp concordent exactement avec le build natif ;
  la dernière (`parallel-cluster-ldbxtried`) place les nœuds de ports de cluster
  avec `T_Wd * cos(alpha)`, et le `cos(-2.3840764867756761)` de la libm de macOS
  est à 1 ulp du `Math.cos` de V8 ; la boucle de forces de fdp amplifie cela
  jusqu’à environ 3 pouces. Le `cos` d’Apple n’est pas reproductible à partir d’un
  modèle court comme l’est `hypot`.
- **Plantages natifs que le portage définit.** Graphviz natif se termine avec le
  code 139 sur neato `mode=KK` avec `model=mds` et une arête `len` (`mds_model`
  indexe `GD_dist` par un numéro de séquence à base 1 : débordement de tas), et
  sur `model=circuit` avec un graphe non connexe. Le portage écarte les cellules
  hors plage dans le premier cas et retombe sur les plus courts chemins dans le
  second ; il n’existe aucune sortie native à comparer.

---

## Non-objectifs (volontairement non portés) {#intentionally-not-ported-non-goals}

Ce sont des limites de périmètre délibérées, et non des bogues. La bibliothèque
cible le **SVG** (ainsi que les formats texte intermédiaires `json` / `xdot` /
`dot` / imagemap).

- **Autres formats de sortie.** Les formats matriciels (PNG/JPG/GIF/WebP/BMP),
  PostScript/PDF/EPS et les backends graphiques/interactifs sont hors périmètre.
  Utilisez la sortie SVG et convertissez en aval si vous avez besoin d’une image
  matricielle.
- **Pagination `page=` pour le SVG.** `dot` natif ne pagine pas non plus le SVG
  (le périphérique SVG ne positionne aucun drapeau de pagination), si bien que
  `page=` est sans effet sur ce chemin dans les deux implémentations — documenté
  ici uniquement parce que c’est un point de confusion fréquent.
- **Sortie texte `-Tplain`.** Différée (un format texte fidèle), et non exclue.
- **`gvpr`** (le langage de script de traitement de graphes) — hors périmètre.
- **Enveloppes de commodité C++** (`cgraph++`, `gvc++`) — l’API C est portée en
  premier ; une couche de commodité en TypeScript idiomatique, si elle est
  souhaitée, serait un paquet distinct.
- **`fontnames=svg|ps` dans la mesure du texte du navigateur.** Dans un
  navigateur, le mesureur canvas construit sa police à partir de la liste de
  familles `fontnames=native` de l’alias PostScript (`Times-Roman` → `Times,
  serif`), la même police que l’émetteur SVG rend par défaut. `TextMeasurer` ne
  porte aucun contexte de graphe, si bien que les graphes qui définissent
  `fontnames=svg` ou `fontnames=ps` sont mesurés d’après la liste native tandis
  que le SVG nomme la famille svg/ps. Les graisses d’alias que CSS ne définit pas
  (`book`, `demi`, `light`, `medium`, `roman`) sont émises telles quelles, comme
  dans C ; les navigateurs les ignorent et rendent la graisse normale, et le
  mesureur mesure la graisse normale pour concorder. La sortie sous Node n’est
  pas touchée (elle n’utilise jamais le mesureur canvas).
- **Entrée à plusieurs graphes et `NULL` de l’entrée vide.** `parse` et `renderSvg`
  lisent une chaîne DOT comme le fait `agmemread` de cgraph. Après l’accolade fermante
  du premier graphe, `endgraph` (`lib/cgraph/grammar.y`) appelle `aglexeof`
  (`lib/cgraph/scan.l`), qui repousse un jeton de fin de fichier, si bien que rien après
  cette accolade n’est analysé lexicalement ; le texte final, les chaînes ou
  commentaires non terminés et les graphes suivants sont ignorés sans erreur ni
  avertissement. La CLI `dot` rappelle au contraire `agread` et rend chaque graphe d’un
  fichier, de sorte qu’un fichier à deux graphes donne là-bas deux documents SVG et ici
  un seul (le rendu du portage correspond au premier document de la CLI sur les fichiers
  du corpus à plusieurs graphes `1845`, `2835` et `graphs-multi`, qui restent en
  quarantaine). Pour rendre plusieurs graphes, découpez la source et appelez `renderSvg`
  une fois par graphe. Pour une entrée vide ou ne contenant que des commentaires,
  `agmemread` renvoie `NULL` et la CLI n’affiche rien ; `parse` renvoie à la place un
  graphe non orienté vide et `renderSvg` le rend, parce que l’API renvoie un `Graph` et
  un SVG par appel.
- **Mécanismes propres au natif** remplacés par des équivalents sûrs pour le
  navigateur : le chargement dynamique de greffons (`dlopen`) est remplacé par
  l’enregistrement statique des moteurs/moteurs de rendu ; les lectures du
  système de fichiers (polices, images, configuration) sont remplacées par des
  fonctions de rappel fournies par l’appelant (par exemple `setImageSizer`). Le
  comportement est préservé ; le mécanisme diffère.

---

## Signaler une divergence {#reporting-a-divergence}

Si vous trouvez une sortie qui diffère de C et qui n’est **ni** un écart accepté
ci-dessus, ni dans `PARITY-dot.md`, ni un non-objectif, c’est un bogue qui mérite
d’être signalé — le code source C fait office de spécification, et les
divergences non répertoriées sont traitées comme des défauts, et non comme un
comportement accepté.
