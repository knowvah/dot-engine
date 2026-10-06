---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Szószedet

Fogalmanként egy meghatározás, az angol kifejezés szerinti betűrendben (a
fejezetek az angol sorrendet követik). Mindegyik arra az útmutatóoldalra (vagy
forráskódra) hivatkozik, amely részletesen tárgyalja.

## Cluster (klaszter)

Olyan részgráf, amelynek neve `cluster`-rel kezdődik (pl. `subgraph cluster_build`) —
a Graphviz különálló dobozként rendereli, amely a tagcsúcsait csoportosítja. Belül a
@knowvah/dot-engine geometriai pillanatképe minden klaszter-részgráfot pozicionális
névvel, például `cluster6`-tal kulcsol újra (`ClusterGeometry.name`), nem a DOT
forráskódbeli névvel, így az a fogyasztó, akinek az eredeti névre van szüksége,
az elrendezés előtt `idByName` térképet épít, majd utána újrakulcsolja a
`snapshot.clusters`-t. Az újrakulcsolás mintáját lásd: [Receptek](/hu/guide/recipes),
a klaszterek `addSubgraph`-fal való létrehozását pedig: [Gráf felépítése kódból](/hu/guide/build-a-graph).

## Conformance (megfelelőség)

Az a gépileg ellenőrzött tulajdonság, amely a @knowvah/dot-engine renderelés és a C
orákulum „egyezése” mögött áll. Miután mindkét SVG normalizált elemfává lett
feldolgozva, minden numerikus értéknek (koordináták, útvonaladatok, `points`)
rögzített tűrésen belül kell megegyeznie — **±0,01 pt** a determinisztikus
motoroknál (`dot`, `circo`, `twopi`, `osage`, `patchwork`) és **±0,5 pt** az
iteratív erővezérelt motoroknál (`neato`, `fdp`, `sfdp`) —, és minden nem numerikus
értéknek (címkék, színek, szöveg) pontosan egyeznie kell. Ez nem állítja, hogy az
SVG-kimenet bájtról bájtra azonos. Lásd: [Megfelelőség](/hu/conformance).

## Coordinate frame / y-axis (koordinátarendszer / y tengely)

A Graphviz natív koordinátarendszere **y felfelé** növekvő, az origó a bal alsó
sarokban van; a böngészők és képernyők **y lefelé** növekvők, az origó a bal
felső sarokban van. A `getLayout` alapértelmezése `yAxis: 'down'` (minden y-t
megfordít, és a `bounds`-ot `(0, 0)`-ra normalizálja), az `yAxis: 'up'` pedig a
natív Graphviz-koordinátákat adja vissza változatlanul. Az xdot rajzolási
műveletek (a `getDrawOps`-ból) mindig a natív, y felfelé növekvő rendszerben
vannak. Lásd: [A kiszámított geometria kiolvasása](/hu/guide/geometry).

## Divergence (eltérés)

A @knowvah/dot-engine renderelés és az orákulum közötti különbség, amelyet
kivizsgáltak, kiderítették az okát, és katalogizáltak — szemben azzal, hogy
csendben eltűrnék. A katalogizált eltérések három osztályba tartoznak: elfogadott
különbségek (szándékosan nem tették megfelelővé, pl. a platformok közötti
lebegőpontos nemdeterminizmus), egy még zárás alatt álló, nyomon követett hosszú
farok, és kifejezett nem-célok. A fel nem sorolt különbség hibának számít, nem
elfogadott viselkedésnek. Lásd: [Ismert eltérések](/hu/divergences).

## DOT

A gráfleíró nyelv — `digraph { ... }` / `graph { ... }` csúcs-, él- és
attribútumutasításokkal —, amelyet a @knowvah/dot-engine feldolgoz, mielőtt az
eredményt egy elrendezésmotornak adná át. Lásd: [Első lépések](/hu/guide/getting-started).

## Image sizer / resolver (képméretező / képfeloldó)

A külső képek két injektálható bővítési pontja (usershape csúcsok és `<IMG>`
HTML-címkecellák). Az `ImageSizer` megadja a kép természetes szélességét/magasságát,
hogy a csúcsméretezés és a címkeelrendezés pixeladatok betöltése nélkül
folytatódhasson; az `ImageResolver` a renderelés idején szolgáltatja a beágyazáshoz
a tényleges képbájtokat. Lásd: [Képek](/hu/guide/images).

## Layout engine (elrendezésmotor)

A @knowvah/dot-engine által regisztrált nyolc elrendezési algoritmus egyike, név
szerint kiválasztva (`renderSvg(dot, engine)`): `dot` (hierarchikus/rétegzett),
`neato` (rugómodell, Kamada–Kawai), `fdp` (erővezérelt), `sfdp` (többléptékű
erővezérelt, nagy gráfokhoz), `circo` (körkörös), `twopi` (sugaras), `osage`
(klaszteres) és `patchwork` (négyzetesített treemap). Lásd:
[Elrendezésmotorok](/hu/guide/engines).

## Oracle (orákulum)

A natív C Graphviz `dot` bináris, a kanonikus C forráskódból építve, amellyel
szemben minden @knowvah/dot-engine renderelést validálnak. A @knowvah/dot-engine
közvetlenül ezt a binárist indítja el (soha nem WASM-buildet), hogy elkerülje az
ABI-eltolódást a referencia és a portolás között. Az orákulum-összehasonlítások
futtatásáról és jelentéséről lásd: [Megfelelőség](/hu/conformance) és
[Paritás](/parity).

## Rank / rankdir

A `dot` hierarchikus elrendezésében a **rank** (rang) a rajzban azonos mélységben
elhelyezett csúcsok rétege. A `rankdir` állítja be a rangok irányát — alapértelmezés
szerint `TB` (fentről lefelé), vagy `LR`, `BT`, `RL` —, gráfattribútumként megadva
(`b.setAttr('rankdir', 'LR')`). Lásd: [Gráf felépítése kódból](/hu/guide/build-a-graph).

## Spline / edge routing (spline / élvezetés)

Az a görbe (Bézier) útvonal, amely mentén egy élet megrajzolnak, és amelyet a
csúcs- és klaszterakadályokat megkerülő vezetőkód számít ki. A @knowvah/dot-engine
a vezetett kontrollpontokat `EdgeGeometry.points` néven teszi elérhetővé — a
`getLayout` által visszaadott, rendezett `{x, y}` pontokból álló tömb, pontokban
(pt). Lásd: [A kiszámított geometria kiolvasása](/hu/guide/geometry).

## Text measurer (szövegmérő)

Az injektálható bővítési pont (`TextMeasurer`), amely megadja a címke
szélességét/magasságát, hogy a csúcs- és élcímke-méretezés az elrendezés előtt
folytatódhasson. A @knowvah/dot-engine renderelésenként automatikusan választ egyet
— először egy kifejezett `setTextMeasurer`-t, majd a böngésző `<canvas>`-át, ha
elérhető, végül a Node-ban a beépített determinisztikus `EstimateTextMeasurer`-t —,
vagy egyéni implementációt fogad el. Lásd: [Szövegmérés](/hu/guide/text-measurement).

## Usershape

A Graphviz kifejezése olyan csúcsra, amelynek alakja egy külsőleg megadott kép
(az `image` attribútumon keresztül), nem pedig rajzolt sokszög vagy ellipszis.
A @knowvah/dot-engine a usershape-eket az injektálható képméretező/képfeloldó
bővítési ponton keresztül oldja fel, nem közvetlenül fájlokat olvasva, így a
könyvtár böngészőbiztos marad. Lásd: [Képek](/hu/guide/images).

## xdot

A kiterjesztett DOT rajzolásiművelet-formátuma: műveletek strukturált folyama
(kitöltési/körvonalszín beállítása, betűtípus beállítása, ellipszis vagy sokszög
kitöltése/körvonalazása, Bézier rajzolása, szöveg rajzolása), amely pontosan leírja,
hogyan kell a renderelt gráfot megfesteni, festési sorrendben. A `getDrawOps`
ezt a folyamot típusos `XdotOp` értékekként adja vissza, hogy SVG feldolgozása
nélkül hajtson meg egy egyéni renderelőt (canvas, WebGL, PDF). Lásd:
[Egyéni renderelés xdot rajzolási műveletekkel](/hu/guide/xdot-drawops).
