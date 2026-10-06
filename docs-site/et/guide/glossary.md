---
sourceHash: 66af4fa5a29e8468c7ecdd9bd541c9d7572b0a87dc81ab412cb63c543106fde8
---
# Sõnastik

Üks definitsioon termini kohta, järjestatud ingliskeelse termini järgi
tähestikuliselt (pealkirjade järjekord on sama mis ingliskeelsel lehel). Igaüks viitab juhendi leheküljele (või
lähtekoodile), mis seda põhjalikult käsitleb.

## Klaster

Alamgraaf, mille nimi algab sõnaga `cluster` (nt `subgraph cluster_build`) —
Graphviz joonistab selle eraldi kastina, mis rühmitab selle liikmesõlmed. Sisemiselt
annab @knowvah/dot-engine'i geomeetria hetktõmmis igale klastri alamgraafile
positsioonipõhise nime nagu `cluster6` (`ClusterGeometry.name`), mitte DOT-lähtekoodi
algset nime, seega kui tarbija vajab algset nime, koostab ta enne paigutust
`idByName`-kaardi ja annab pärast seda `snapshot.clusters` võtmed uuesti. Vt
[Retseptid](/et/guide/recipes) võtmete uuesti andmise mustri kohta ja
[Graafi koostamine koodis](/et/guide/build-a-graph) klastrite loomise kohta funktsiooniga `addSubgraph`.

## Vastavus

Mehaaniliselt kontrollitav omadus väite „@knowvah/dot-engine'i renderdus ühtib
C-oraakliga“ taga. Pärast mõlema SVG parsimist normaliseeritud
elemendipuudeks peab iga numbriline väärtus (koordinaadid, teeandmed, `points`)
ühtima kindlas tolerantsis — **±0,01 pt** deterministlike mootorite
(`dot`, `circo`, `twopi`, `osage`, `patchwork`) puhul ja **±0,5 pt**
iteratiivsete jõupõhiste mootorite (`neato`, `fdp`, `sfdp`) puhul — ning iga
mittenumbriline väärtus (sildid, värvid, tekst) peab olema täpselt võrdne. See ei
väida SVG väljundi baithaaval täpset võrdsust. Vt [Vastavus](/et/conformance).

## Koordinaatsüsteem / y-telg

Graphvizi natiivne koordinaatsüsteem on **y-üles**, alguspunktiga alumises
vasakus nurgas; brauserid ja ekraanid on **y-alla**, alguspunktiga üleval vasakul.
`getLayout` kasutab vaikimisi `yAxis: 'down'` (pöörab iga y ümber ja normaliseerib
`bounds` väärtusele `(0, 0)`) ning aktsepteerib `yAxis: 'up'`, et tagastada natiivsed Graphvizi
koordinaadid muutmata kujul. xdot-joonistusoperatsioonid (funktsioonist `getDrawOps`) on alati natiivses
y-üles koordinaatsüsteemis. Vt [Arvutatud geomeetria lugemine](/et/guide/geometry).

## Erinevus

Erinevus @knowvah/dot-engine'i renderduse ja oraakli vahel, mida on
uuritud, mille algpõhjus on tuvastatud ja mis on kataloogitud — erinevalt vaikides
talutust. Kataloogitud erinevused kuuluvad ühte kolmest klassist:
aktsepteeritud deltad (tahtlikult mitte vastavaks tehtud, nt platvormiülene
ujukomaarvude mittedeterminism), jälgitav pikk saba, mida alles suletakse, ja
selgesõnalised mitte-eesmärgid. Loetlemata erinevust käsitletakse veana, mitte
aktsepteeritud käitumisena. Vt [Teadaolevad erinevused](/et/divergences).

## DOT

Graafi kirjelduskeel — `digraph { ... }` / `graph { ... }` sõlme-, serva- ja
atribuudilausetega —, mida @knowvah/dot-engine parsib, enne kui tulemuse
paigutusmootorile edasi annab. Vt [Alustamine](/et/guide/getting-started).

## Pildi mõõtja / lahendaja

Kaks süstitavat liidespunkti välispiltide jaoks (usershape-sõlmed ja `<IMG>`
HTML-sildi lahtrid). `ImageSizer` teatab pildi loomulikku laiust/kõrgust, et
sõlme suuruse ja sildi paigutusega saaks jätkata ilma piksliandmeid laadimata;
`ImageResolver` annab renderdamise ajal manustamiseks tegelikud pildibaidid.
Vt [Pildid](/et/guide/images).

## Paigutusmootor

Üks kaheksast paigutusalgoritmist, mille @knowvah/dot-engine registreerib ja mis valitakse nime järgi
(`renderSvg(dot, engine)`): `dot` (hierarhiline/kihiline), `neato`
(vedrumudel, Kamada–Kawai), `fdp` (jõupõhine), `sfdp` (mitmetasandiline
jõupõhine, suurtele graafidele), `circo` (ringjas), `twopi` (radiaalne),
`osage` (klastritega) ja `patchwork` (squarified puukaart). Vt
[Paigutusmootorid](/et/guide/engines).

## Oraakel

Natiivne C-keelne Graphvizi `dot`-binaar, ehitatud kanoonilisest C-lähtekoodist,
mille vastu iga @knowvah/dot-engine'i renderdust valideeritakse. @knowvah/dot-engine käivitab selle
binaari otse (mitte kunagi WASM-ehitist), et vältida ABI triivi
võrdlusaluse ja portimise vahel. Vt [Vastavus](/et/conformance) ja
[Paarsus](/parity), kuidas oraakliga võrdlusi tehakse ja neist teatatakse.

## Rank / rankdir

`dot`-i hierarhilises paigutuses on **rank** sõlmede kiht, mis asetatakse
joonisel samale sügavusele. `rankdir` määrab suuna, kuhu rangid voolavad —
vaikimisi `TB` (ülevalt alla), või `LR`, `BT`, `RL` — ja see seatakse graafi atribuudina
(`b.setAttr('rankdir', 'LR')`). Vt [Graafi koostamine koodis](/et/guide/build-a-graph).

## Splain / servade marsruutimine

Kõverjas (Bézier) tee, mida mööda serv joonistatakse, arvutatuna
marsruutimiskoodiga, mis väldib sõlme- ja klastritakistusi. @knowvah/dot-engine
pakub marsruudatud kontrollpunkte kui `EdgeGeometry.points` — järjestatud
massiiv `{x, y}` punktidest, punktides —, funktsioonist `getLayout`. Vt
[Arvutatud geomeetria lugemine](/et/guide/geometry).

## Tekstimõõtja

Süstitav liidespunkt (`TextMeasurer`), mis teatab sildi laiuse/kõrguse, et
sõlmede ja servasiltide suurusega saaks enne paigutust jätkata. @knowvah/dot-engine lahendab
ühe automaatselt iga renderduse jaoks — esmalt selgesõnaline `setTextMeasurer`, seejärel
brauseri `<canvas>`, kui see on olemas, seejärel Node'is sisseehitatud deterministlik
`EstimateTextMeasurer` — või aktsepteerib kohandatud teostust. Vt
[Teksti mõõtmine](/et/guide/text-measurement).

## Usershape

Graphvizi termin sõlme kohta, mille kuju on väljastpoolt antud pilt
(atribuudi `image` kaudu), mitte joonistatud hulknurk või ellips.
@knowvah/dot-engine lahendab usershape'id süstitava pildimõõtja/lahendaja
liidespunkti kaudu, mitte ei loe faile otse, mis hoiab teegi brauseriohutuna.
Vt [Pildid](/et/guide/images).

## xdot

Laiendatud DOT-i joonistusoperatsioonide vorming: struktureeritud operatsioonide voog (täite-/joonevärvi
määramine, fondi määramine, ellipsi või hulknurga täitmine/joonistamine, Bézier'
joonistamine, teksti joonistamine), mis kirjeldab täpselt, kuidas renderdatud graaf
tuleks värvida, värvimisjärjekorras. `getDrawOps` tagastab selle voo tüübitud `XdotOp`
väärtustena, et juhtida kohandatud renderdajat (canvas, WebGL, PDF) SVG-d parsimata.
Vt [Oma renderdus xdot-iga](/et/guide/xdot-drawops).
