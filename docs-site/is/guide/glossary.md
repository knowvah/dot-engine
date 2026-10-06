---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Orðasafn

Ein skilgreining á hvert hugtak, í stafrófsröð eftir enska hugtakinu (fyrirsagnirnar halda
enskri röð). Hver vísar á handbókarsíðuna (eða frumkóðann) sem fjallar ítarlega um það.

## Klasi (cluster)

Hlutnet sem nafn þess byrjar á `cluster` (t.d. `subgraph cluster_build`) —
Graphviz teiknar það sem sérstakan kassa sem flokkar hnútana sem í því eru. Innbyrðis
gefur rúmfræðiskyndimynd @knowvah/dot-engine hverju klasahlutneti
staðsetningarbundið nafn eins og `cluster6` (`ClusterGeometry.name`), ekki nafnið
úr DOT-frumkóðanum, svo notandi sem þarf upprunalega nafnið býr til
`idByName`-kort fyrir uppsetningu og gefur lyklum `snapshot.clusters` ný nöfn
á eftir. Sjá
[Uppskriftir](/is/guide/recipes) fyrir mynstrið til að endurnefna lykla og
[Smíða graf í kóða](/is/guide/build-a-graph) til að búa til klasa með `addSubgraph`.

## Samræmi

Vélrænt prófaði eiginleikinn á bak við fullyrðinguna um að teikning @knowvah/dot-engine
„samsvari“ C-véfréttinni. Eftir að báðar SVG-myndirnar hafa verið þáttaðar í staðlað
þáttatré þarf hvert tölugildi (hnit, ferilgögn, `points`) að stemma
innan fastra vikmarka — **±0,01pt** fyrir ákvarðandi vélarnar
(`dot`, `circo`, `twopi`, `osage`, `patchwork`) og **±0,5pt** fyrir
ítrekandi kraftstýrðu vélarnar (`neato`, `fdp`, `sfdp`) — og hvert
gildi sem ekki er tala (tög, litir, texti) þarf að vera nákvæmlega eins. Þetta er ekki
fullyrðing um SVG-úttak sem er bæti fyrir bæti eins. Sjá [Samræmi](/is/conformance).

## Hnitakerfi / y-ás

Upprunalegt hnitakerfi Graphviz er **y-upp**, með upphafspunkt í neðra vinstra
horni; vafrar og skjáir eru **y-niður**, með upphafspunkt efst til vinstri.
`getLayout` notar sjálfgefið `yAxis: 'down'` (snýr hverju y og staðlar
`bounds` á `(0, 0)`) og tekur við `yAxis: 'up'` til að skila upprunalegum Graphviz-hnitum
óbreyttum. Teikniaðgerðir xdot (úr `getDrawOps`) eru alltaf í upprunalegu
y-upp hnitakerfi. Sjá [Lesa reiknaða rúmfræði](/is/guide/geometry).

## Frávik

Munur á teikningu @knowvah/dot-engine og véfréttinni sem hefur verið
rannsakaður, rakinn til orsaka og skráður — öfugt við að vera
þegjandi umborinn. Skráð frávik falla í einn af þremur flokkum:
samþykktur munur (vísvitandi ekki gerður samræmdur, t.d. ákvarðanaleysi
fleytitalna milli palla), langur hali sem enn er verið að loka, og
ótvíræð markmið utan umfangs. Óskráður munur telst galli, ekki samþykkt
hegðun. Sjá [Þekkt frávik](/is/divergences).

## DOT

Graflýsingarmálið — `digraph { ... }` / `graph { ... }` með
yfirlýsingum um hnúta, leggi og eigindi — sem @knowvah/dot-engine þáttar áður en
niðurstaðan er afhent uppsetningarvél. Sjá [Fyrstu skref](/is/guide/getting-started).

## Myndamælir / myndaleysir (image sizer / resolver)

Tveir innsprautanlegu tengipunktarnir fyrir ytri myndir (usershape-hnúta og
`<IMG>`-hólf í HTML-merkjum). `ImageSizer` skilar náttúrulegri breidd/hæð myndar
svo hægt sé að reikna stærð hnúta og uppsetningu merkja án þess að hlaða punktagögnum;
`ImageResolver` skilar raunverulegum myndabætum til innfellingar við
teikningu. Sjá [Myndir](/is/guide/images).

## Uppsetningarvél

Eitt af reikniritunum átta sem @knowvah/dot-engine skráir, valið með nafni
(`renderSvg(dot, engine)`): `dot` (stigskipt/lagskipt), `neato`
(gormalíkan, Kamada–Kawai), `fdp` (kraftstýrt), `sfdp` (fjölkvarða
kraftstýrt, fyrir stór gröf), `circo` (hringlaga), `twopi` (geislalaga),
`osage` (klasað) og `patchwork` (ferningað trjákort). Sjá
[Uppsetningarvélar](/is/guide/engines).

## Véfrétt

Innbyggða C-keyrsluskráin Graphviz `dot`, smíðuð úr upprunalega C-frumkóðanum, sem
sérhver teikning @knowvah/dot-engine er sannreynd gegn. @knowvah/dot-engine ræsir þessa
keyrsluskrá beint (aldrei WASM-byggingu) til að forðast ABI-rek milli
viðmiðunar og yfirfærslu. Sjá [Samræmi](/is/conformance) og
[Jöfnuður](/parity) um hvernig samanburður við véfréttina er keyrður og skýrt frá honum.

## Rank / rankdir (þrep)

Í stigskiptri uppsetningu `dot` er **rank** (þrep) lag af hnútum sem er sett á
sama dýpi í teikningunni. `rankdir` ákvarðar stefnuna sem þrepin liggja í — sjálfgefið
`TB` (ofan frá og niður), eða `LR`, `BT`, `RL` — og er sett sem
grafeigindi (`b.setAttr('rankdir', 'LR')`). Sjá [Smíða graf í kóða](/is/guide/build-a-graph).

## Splína / leggjaleiðing

Ferillinn (Bézier) sem leggur er teiknaður eftir, reiknaður af
leiðingarkóða sem sneiðir hjá hindrunum í formi hnúta og klasa. @knowvah/dot-engine
skilar leiddu stýripunktunum sem `EdgeGeometry.points` — raðað fylki af
`{x, y}`-punktum, í punktum — úr `getLayout`. Sjá
[Lesa reiknaða rúmfræði](/is/guide/geometry).

## Textamælir

Innsprautanlegi tengipunkturinn (`TextMeasurer`) sem skilar breidd/hæð merkja svo
hægt sé að reikna stærð hnúta og leggjamerkja fyrir uppsetningu. @knowvah/dot-engine velur einn
sjálfkrafa við hverja teikningu — fyrst skýrt `setTextMeasurer`, síðan
`<canvas>` vafrans ef það er til, síðan innbyggða ákvarðandi
`EstimateTextMeasurer` í Node — eða tekur við eigin útfærslu. Sjá
[Textamæling](/is/guide/text-measurement).

## Usershape

Hugtak Graphviz um hnút þar sem lögunin er ytri mynd sem látin er í té
(með eigindinu `image`) fremur en teiknaður marghyrningur eða sporbaugur.
@knowvah/dot-engine leysir usershape-hnúta í gegnum innsprautanlega tengipunktinn fyrir myndastærð/-leysingu
fremur en að lesa skrár beint, sem heldur safninu vafraöruggu.
Sjá [Myndir](/is/guide/images).

## xdot

Útvíkkaða DOT-sniðið fyrir teikniaðgerðir: skipulagður straumur aðgerða (setja
fyllingar-/línulit, setja letur, fylla/draga útlínur sporbaugs eða marghyrnings, teikna
Bézier-feril, teikna texta) sem lýsir nákvæmlega hvernig teiknað graf á að
málast, í málunarröð. `getDrawOps` skilar þessum straumi sem tegundaðum `XdotOp`-gildum
til að knýja eigin teiknara (canvas, WebGL, PDF) án þess að þátta SVG.
Sjá [Eigin teiknun með xdot](/is/guide/xdot-drawops).
