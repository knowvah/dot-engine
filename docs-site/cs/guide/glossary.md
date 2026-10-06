---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Slovníček

Jedna definice na pojem, řazeno abecedně podle anglického pojmu. Každá odkazuje na
stránku příručky (nebo zdrojový kód), která pojem popisuje podrobně.

## Cluster

Podgraf, jehož název začíná na `cluster` (např. `subgraph cluster_build`) —
Graphviz ho vykreslí jako samostatný rámeček seskupující jeho uzly. Interně
geometrický snímek @knowvah/dot-engine přeznačí každý podgraf typu cluster na
poziční název jako `cluster6` (`ClusterGeometry.name`), nikoli na název
ze zdrojového kódu DOT, takže příjemce, který potřebuje původní název, si před
rozvržením sestaví mapu `idByName` a poté přeznačí `snapshot.clusters`. Vzor
přeznačení najdete v části
[Recepty](/cs/guide/recipes) a vytváření clusterů přes `addSubgraph` v části
[Sestavení grafu v kódu](/cs/guide/build-a-graph).

## Shoda

Mechanicky kontrolovaná vlastnost, na které stojí tvrzení, že vykreslení z @knowvah/dot-engine
„odpovídá“ orákulu v C. Po převodu obou SVG na normalizované stromy
prvků se musí každá číselná hodnota (souřadnice, data cest, `points`) shodovat
v pevné toleranci — **±0,01 pt** u deterministických modulů
(`dot`, `circo`, `twopi`, `osage`, `patchwork`) a **±0,5 pt** u
iterativních silově řízených modulů (`neato`, `fdp`, `sfdp`) — a každá
nečíselná hodnota (značky, barvy, text) musí být přesně stejná. Netvrdí
se shoda výstupu SVG bajt po bajtu. Viz [Shoda](/cs/conformance).

## Souřadnicová soustava / osa y

Nativní souřadnicový systém Graphviz má osu **y nahoru** a počátek v levém
dolním rohu; prohlížeče a obrazovky mají osu **y dolů** a počátek vlevo nahoře.
`getLayout` má výchozí hodnotu `yAxis: 'down'` (převrátí každé y a normalizuje
`bounds` na `(0, 0)`) a přijímá `yAxis: 'up'`, které vrátí nativní souřadnice
Graphviz beze změny. Kreslicí operace xdot (z `getDrawOps`) jsou vždy
v nativní soustavě s osou y nahoru. Viz [Čtení vypočtené geometrie](/cs/guide/geometry).

## Odchylka

Rozdíl mezi vykreslením z @knowvah/dot-engine a orákulem, který byl
prozkoumán, jehož příčina byla nalezena a který je zaevidován — na rozdíl od tichého
tolerování. Zaevidované odchylky spadají do jedné ze tří tříd: přijaté
rozdíly (záměrně nesjednocené, např. nedeterminismus
čísel s plovoucí desetinnou čárkou napříč platformami), sledovaný dlouhý chvost, který se stále
uzavírá, a výslovné necíle. Nezaevidovaný rozdíl se považuje za vadu, nikoli za
přijaté chování. Viz [Známé odchylky](/cs/divergences).

## DOT

Jazyk pro popis grafů — `digraph { ... }` / `graph { ... }` s příkazy pro
uzly, hrany a atributy — který @knowvah/dot-engine parsuje dříve, než výsledek
předá modulu rozvržení. Viz [Začínáme](/cs/guide/getting-started).

## Zjišťovač velikosti obrázků / resolver

Dva zásuvné body (rozhraní) pro externí obrázky (uzly s usershape a buňky `<IMG>`
v popiscích ve stylu HTML). `ImageSizer` hlásí přirozenou šířku/výšku obrázku, aby
mohlo pokračovat určování velikosti uzlů a rozvržení popisků bez načítání pixelových dat;
`ImageResolver` dodává skutečné bajty obrázku pro vložení při vykreslení.
Viz [Obrázky](/cs/guide/images).

## Modul rozvržení

Jeden z osmi algoritmů rozvržení, které @knowvah/dot-engine registruje a které se vybírají jménem
(`renderSvg(dot, engine)`): `dot` (hierarchické/vrstvené), `neato`
(pružinový model, Kamada–Kawai), `fdp` (silově řízené), `sfdp` (vícekrokové
silově řízené, pro velké grafy), `circo` (kruhové), `twopi` (radiální),
`osage` (clusterové) a `patchwork` (squarified treemap). Viz
[Moduly rozvržení](/cs/guide/engines).

## Orákulum

Nativní binárka `dot` z C Graphviz, sestavená z kanonického zdrojového kódu v C, proti které
se ověřuje každé vykreslení z @knowvah/dot-engine. @knowvah/dot-engine tuto
binárku spouští přímo (nikdy ne sestavení WASM), aby se předešlo rozchodu ABI mezi
referencí a portací. Jak se srovnání s orákulem provádějí a vykazují, viz
[Shoda](/cs/conformance) a [Parita](/parity).

## Rank / rankdir

V hierarchickém rozvržení modulu `dot` je **rank** vrstva uzlů umístěných ve
stejné hloubce výkresu. `rankdir` určuje směr, kterým ranky postupují — výchozí
`TB` (shora dolů), nebo `LR`, `BT`, `RL` — nastavuje se jako atribut grafu
(`b.setAttr('rankdir', 'LR')`). Viz [Sestavení grafu v kódu](/cs/guide/build-a-graph).

## Spline / vedení hran

Zakřivená (Bézierova) dráha, po které se hrana kreslí, vypočtená kódem
pro vedení hran, který se vyhýbá překážkám v podobě uzlů a clusterů. @knowvah/dot-engine zpřístupňuje
vypočtené řídicí body jako `EdgeGeometry.points` — uspořádané pole bodů
`{x, y}` v bodech — z `getLayout`. Viz
[Čtení vypočtené geometrie](/cs/guide/geometry).

## Měřič textu

Zásuvný bod (`TextMeasurer`), který hlásí šířku/výšku popisků, aby
určování velikosti uzlů a popisků hran mohlo proběhnout před rozvržením. @knowvah/dot-engine
jeden vybere automaticky při každém vykreslení — nejdřív explicitní `setTextMeasurer`, pak
`<canvas>` prohlížeče, je-li k dispozici, pak vestavěný deterministický
`EstimateTextMeasurer` v Node — nebo přijme vlastní implementaci. Viz
[Měření textu](/cs/guide/text-measurement).

## Usershape

Termín Graphviz pro uzel, jehož tvarem je externě dodaný obrázek
(přes atribut `image`), nikoli nakreslený mnohoúhelník nebo elipsa.
@knowvah/dot-engine řeší usershape přes zásuvné rozhraní zjišťovače velikosti/resolveru obrázků,
místo aby četl soubory přímo, čímž zůstává knihovna bezpečná pro prohlížeč.
Viz [Obrázky](/cs/guide/images).

## xdot

Rozšířený formát kreslicích operací DOT: strukturovaný proud operací (nastavení
barvy výplně/čáry, nastavení písma, vyplnění/obtažení elipsy nebo mnohoúhelníku, kreslení
Bézierovy křivky, kreslení textu), který přesně popisuje, jak se má vykreslený graf
namalovat, v pořadí malování. `getDrawOps` vrací tento proud jako typované hodnoty `XdotOp`
pro řízení vlastního vykreslovače (canvas, WebGL, PDF) bez parsování
SVG. Viz [Vlastní vykreslování pomocí kreslicích operací xdot](/cs/guide/xdot-drawops).
