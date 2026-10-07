---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Slovník pojmov

Jedna definícia na pojem, v poradí podľa anglického pojmu (poradie nadpisov zostáva rovnaké ako v anglickom origináli). Každá odkazuje na stránku
príručky (alebo zdrojový kód), ktorá pojem rozoberá podrobne.

## Klaster

Podgraf, ktorého názov začína na `cluster` (napr. `subgraph cluster_build`) —
Graphviz ho vykreslí ako samostatný rámček zoskupujúci jeho členské uzly. Vnútorne
geometrický snímok @knowvah/dot-engine premenuje kľúč každého podgrafu klastra na
pozičný názov ako `cluster6` (`ClusterGeometry.name`), nie na pôvodný názov
v zdrojovom DOT, takže spotrebiteľ, ktorý potrebuje pôvodný názov, pred
rozložením zostaví mapu `idByName` a po ňom premenuje kľúče v `snapshot.clusters`. Vzor premenovania kľúčov nájdete v
[Recepty](/sk/guide/recipes) a vytváranie klastrov cez `addSubgraph` v
[Zostavenie grafu](/sk/guide/build-a-graph).

## Zhoda

Mechanicky overovaná vlastnosť, ktorá stojí za tvrdením, že vykreslenie @knowvah/dot-engine
„zodpovedá“ orákulu v C. Po naparsovaní oboch SVG do normalizovaných stromov
prvkov sa každá číselná hodnota (súradnice, dáta ciest, `points`) musí zhodovať
v pevnej tolerancii — **±0,01 pt** pre deterministické moduly
(`dot`, `circo`, `twopi`, `osage`, `patchwork`) a **±0,5 pt** pre
iteratívne silovo riadené moduly (`neato`, `fdp`, `sfdp`) — a každá
nečíselná hodnota (značky, farby, text) musí byť presne rovnaká. Nie je to
tvrdenie o výstupe SVG zhodnom bajt po bajte. Pozrite si [Zhoda](/sk/conformance).

## Súradnicová sústava / os y

Natívna súradnicová sústava Graphviz má os **y smerom nahor** a začiatok v ľavom dolnom
rohu; prehliadače a obrazovky majú os **y smerom nadol** a začiatok vľavo hore.
`getLayout` štandardne používa `yAxis: 'down'` (prevráti každé y a normalizuje
`bounds` na `(0, 0)`) a akceptuje `yAxis: 'up'`, ktoré vráti natívne súradnice graphviz
bez zmeny. Kresliace operácie xdot (z `getDrawOps`) sú vždy v natívnej
sústave s osou y nahor. Pozrite si [Čítanie vypočítanej geometrie](/sk/guide/geometry).

## Odchýlka

Rozdiel medzi vykreslením @knowvah/dot-engine a orákulom, ktorý bol
preskúmaný, ktorého príčina bola zistená a ktorý bol zaradený do katalógu — na rozdiel od
potichu tolerovaného. Katalogizované odchýlky spadajú do jednej z troch tried:
prijaté rozdiely (zámerne sa nerobia zhodnými, napr. multiplatformová
nedeterminovanosť čísel s pohyblivou rádovou čiarkou), sledovaný dlhý chvost, ktorý sa ešte uzatvára, a
výslovné necieľové oblasti. Nezaradený rozdiel sa považuje za chybu, nie za prijaté
správanie. Pozrite si [Známe odchýlky](/sk/divergences).

## DOT

Jazyk na opis grafov — `digraph { ... }` / `graph { ... }` s príkazmi pre
uzly, hrany a atribúty — ktorý @knowvah/dot-engine parsuje predtým, než
výsledok odovzdá modulu rozloženia. Pozrite si [Začíname](/sk/guide/getting-started).

## Merač obrázkov / resolver obrázkov

Dva zásuvné body pre externé obrázky (uzly usershape a bunky `<IMG>`
v HTML popiskoch). `ImageSizer` hlási prirodzenú šírku/výšku obrázka, aby
mohlo pokračovať určovanie veľkosti uzlov a rozloženie popiskov bez načítania pixelových dát;
`ImageResolver` dodáva skutočné bajty obrázka na vloženie pri vykresľovaní.
Pozrite si [Obrázky](/sk/guide/images).

## Modul rozloženia

Jeden z ôsmich algoritmov rozloženia, ktoré @knowvah/dot-engine registruje a ktoré sa vyberajú názvom
(`renderSvg(dot, engine)`): `dot` (hierarchické/vrstvené), `neato`
(pružinový model, Kamada–Kawai), `fdp` (silovo riadené), `sfdp` (viacúrovňové
silovo riadené, pre veľké grafy), `circo` (kruhové), `twopi` (radiálne),
`osage` (klastrové) a `patchwork` (squarified treemap). Pozrite si
[Moduly rozloženia](/sk/guide/engines).

## Orákulum

Natívna binárka `dot` z Graphviz v C, zostavená z kanonického zdrojového kódu v C, voči ktorej
sa overuje každé vykreslenie @knowvah/dot-engine. @knowvah/dot-engine túto
binárku spúšťa priamo (nikdy nie build do WASM), aby sa predišlo rozdielom ABI medzi
referenciou a portom. Ako sa porovnania s orákulom spúšťajú a vykazujú, nájdete v [Zhoda](/sk/conformance) a
[Parita](/parity).

## Rank / rankdir

V hierarchickom rozložení modulu `dot` je **rank** vrstva uzlov umiestnených v
rovnakej hĺbke výkresu. `rankdir` nastavuje smer, ktorým ranky plynú — štandardné
`TB` (zhora nadol), alebo `LR`, `BT`, `RL` — nastavuje sa ako atribút grafu
(`b.setAttr('rankdir', 'LR')`). Pozrite si [Zostavenie grafu](/sk/guide/build-a-graph).

## Spline / vedenie hrán

Zakrivená (Bézierova) dráha, po ktorej sa hrana kreslí, vypočítaná kódom na
vedenie, ktorý obchádza prekážky tvorené uzlami a klastrami. @knowvah/dot-engine sprístupňuje
vypočítané riadiace body ako `EdgeGeometry.points` — usporiadané pole
bodov `{x, y}`, v bodoch — z `getLayout`. Pozrite si
[Čítanie vypočítanej geometrie](/sk/guide/geometry).

## Merač textu

Zásuvný bod (`TextMeasurer`), ktorý hlási šírku/výšku popiskov, aby mohlo pred rozložením
pokračovať určovanie veľkosti uzlov a popiskov hrán. @knowvah/dot-engine pri každom vykreslení
jeden vyberie automaticky — najprv explicitné `setTextMeasurer`, potom
`<canvas>` prehliadača, ak je dostupný, potom vstavaný deterministický
`EstimateTextMeasurer` v Node — alebo akceptuje vlastnú implementáciu. Pozrite si
[Meranie textu](/sk/guide/text-measurement).

## Usershape

Pojem Graphviz pre uzol, ktorého tvarom je externe dodaný obrázok
(cez atribút `image`) namiesto nakresleného mnohouholníka alebo elipsy.
@knowvah/dot-engine rieši usershape cez zásuvný bod merača/resolvera obrázkov
namiesto priameho čítania súborov, vďaka čomu je knižnica bezpečná pre prehliadač.
Pozrite si [Obrázky](/sk/guide/images).

## xdot

Rozšírený formát kresliacich operácií DOT: štruktúrovaný prúd operácií (nastavenie
farby výplne/ťahu, nastavenie písma, vyplnenie/obrys elipsy alebo mnohouholníka, nakreslenie
Bézierovej krivky, nakreslenie textu), ktorý presne opisuje, ako sa má vykreslený graf
namaľovať, v poradí kreslenia. `getDrawOps` vracia tento prúd ako typované hodnoty
`XdotOp` na ovládanie vlastného vykresľovača (canvas, WebGL, PDF) bez parsovania
SVG. Pozrite si [Vlastné vykresľovanie pomocou xdot](/sk/guide/xdot-drawops).
