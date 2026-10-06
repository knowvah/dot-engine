---
sourceHash: 133104b64763457635328188088e909f4552d8353f4a7468655c540706263625
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# proc3d — la divergence canonique A2 de métriques de police (historique) {#proc3d-—-the-canonical-a2-font-metric-divergence-historical}

::: tip Statut : résolu — proc3d est désormais conforme
Depuis la bascule vers `EstimateTextMeasurer` (`239c51b`, 2026-06-25), le
portage comme l’oracle C sans interface mesurent le texte avec le même modèle
`estimate_textspan_size`.
Relancer la reproduction ci-dessous sur l’arbre actuel donne **0 différence,
maxDelta 0** pour `tests/graphs/proc3d.gv` — l’écart documenté sur cette page
ne se reproduit plus. La classe A2 dans son ensemble s’est **effondrée** pour
les instances proc3d du corpus ; voir [Divergences connues §A2](/fr/divergences#a2-text-measurement-font-metrics-label-driven-layout)
et [Parité](/parity) pour des compteurs actuels, non figés. Cette page est conservée comme
analyse historique de la cause racine — le mécanisme ci-dessous est réel et
instructif, il ne produit simplement plus d’écart observable sur ce graphe.
:::

`proc3d` (`graphs-proc3d` / `share-proc3d` / `windows-proc3d`) était le cas
d’école de [métriques de police A2](/fr/divergences#a2-text-measurement-font-metrics-label-driven-layout) :
une différence infra-pixel de mesure du texte décalait de quelques points les
abscisses des nœuds, faisant atterrir le graphe à **structural-match**. Cette
page est l’exposé autonome auquel renvoie la liste des divergences, qui décrit
*pourquoi* cela se produisait avant l’unification des mesureurs.

## Entrée {#input}

| | |
|---|---|
| **Moteur** | `dot` |
| **Source** | `tests/graphs/proc3d.gv` (issu du corpus de tests amont de [Graphviz](https://gitlab.com/graphviz/graphviz/-/blob/main/tests/graphs/proc3d.gv)) — 443 lignes |
| **Attributs clés** | `fontname=Courier`, `orientation=land`, `size="10,7.5"`, `ranksep=1.0` |

## Pourquoi elle divergeait (cause racine, à l’époque) {#why-it-diverged-root-cause-at-the-time}

La disposition par simplexe réseau en x était fidèle ; la seule différence
était que le mesureur de police du portage, à cette époque, donnait à certaines
**étiquettes larges** une largeur supérieure d’une fraction de point à la
mesure de l’oracle natif, appuyée sur FreeType. Les étiquettes les plus larges
de proc3d sont les ovales de chemins de fichiers — par exemple
`/home/ek/work/src/lefty/lefty.c`, la chaîne exacte que
[`known-divergences.md` §A2](/fr/divergences#a2-text-measurement-font-metrics-label-driven-layout)
a mesurée à **+0.75 pt (+0.43%)**. Une étiquette plus large donnait un nœud un
peu plus large, dont la demi-largeur alimentait les contraintes de séparation
gauche-droite arrondies par `ROUND()` ; le simplexe réseau choisissait alors une
affectation entière des x légèrement différente (tout aussi optimale). Le
résultat était un décalage en x quasi uniforme de **≤ 3.55 pt** sur un dessin
d’environ 2620 pt — rang, ordre, topologie et coordonnées y identiques. Le
correctif n’était pas un rustinage propre à proc3d : la bascule vers
`EstimateTextMeasurer` a placé les deux côtés sur le même modèle de mesure sans
interface, ce qui a éliminé l’écart de sur-mesure des étiquettes larges à
l’origine de ce décalage.

## L’écart — golden contre ours, superposés {#the-delta-—-golden-vs-ours-overlaid}

Golden (**vert**) et ours (**rouge**) superposés dans le même cadre. À pleine
échelle, ils se fondent en brun — le décalage est infra-perceptible (d’où
*structural-match*).

![Superposition proc3d golden contre ours, dessin complet : vert = C, rouge = @knowvah/dot-engine](/img/proc3d-overlay.svg)

En zoomant, la frange vert/rouge apparaît **presque entièrement sur les longues
étiquettes ovales de chemins de fichiers** — exactement les chaînes larges que le
mesureur sur-mesure. Les nœuds de code/boîtes restent coïncidents :

![Superposition proc3d zoomée sur les ovales larges des étiquettes de chemins : vert = C, rouge = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

## Dessins complets — golden d’abord, ours ensuite {#full-drawings-—-golden-first-ours-second}

| Golden — `dot` natif | Ours — @knowvah/dot-engine |
|---|---|
| ![proc3d rendu par C Graphviz](/img/proc3d-golden.svg) | ![proc3d rendu par @knowvah/dot-engine](/img/proc3d-ours.svg) |

## Chiffres (au moment de la rédaction de cette page) {#numbers-at-the-time-this-page-was-written}

| métrique | valeur |
|---|---|
| verdict | structural-match |
| maxDelta (portage contre natif) | 3.55 pt |
| étiquettes décalées en x | 73 / 73 (quasi uniforme) |
| étendue x du dessin | ~2620 pt → le décalage est de 0.13% |
| rang / ordre / topologie / y | identiques à C |

**Chiffres actuels** (revérifiés sur l’arbre en cours) : verdict
**conformant**, 0 différence, maxDelta 0 — voir la note de statut en tête de
cette page. Les images de superposition ci-dessus sont conservées comme
instantané du mécanisme, et non comme comparaison en direct.

## Reproduire {#reproduce}

L’oracle natif s’exécute sous le `GVBINDIR` sans interface (`/tmp/ghl`, issu de
`test/corpus/gen-headless-gvbindir.sh`) afin que les deux côtés utilisent le même
mesureur `estimate_textspan_size` — voir
[§A2 « Isolating the algorithm from the font backend »](/fr/divergences#a2-text-measurement-font-metrics-label-driven-layout).

```sh
# port
GV_TEXT_MEASURER=estimate \
  npx tsx test/corpus/render-one.ts ~/git/graphviz/tests/graphs/proc3d.gv dot

# native C oracle (headless, estimate measurer)
GVBINDIR=/tmp/ghl \
  ~/git/graphviz/build/cmd/dot/dot -Tsvg ~/git/graphviz/tests/graphs/proc3d.gv
```

L’exécuter aujourd’hui produit des SVG concordants (0 différence à la tolérance
`deterministic` de ±0.01) plutôt que l’écart de 3.55pt décrit ci-dessus.
