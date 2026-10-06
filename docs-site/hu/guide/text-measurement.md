---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Szövegmérés

A dot elrendezéshez minden címke szélességére és magasságára szükség van a csúcsok
méretezéséhez és az élek elhelyezéséhez. A @knowvah/dot-engine a szöveget egyetlen,
cserélhető bővítési ponton, a `TextMeasurer`-en keresztül méri, és automatikusan
eldönti, melyiket használja — vagy beállíthatja a sajátját.

## A szerződés

Két külön cél van, és eltérő mérőket igényelnek:

| Cél | Mérő | Determinisztikus? | Kerning / alakformálás |
|------|----------|----------------|-------------------|
| **Reprodukálható elrendezés** (mindenhol azonos kimenet) | beépített metrikamodell | igen | nem |
| **Gazdagéphez hű elrendezés** (egyezik a renderelő betűtípussal) | a platform canvasa | nem (betűtípusfüggő) | igen |

Maga a natív Graphviz gazdagéphez hű — a kimenete a futtató gépen telepített
betűtípusoktól függ. A @knowvah/dot-engine lehetővé teszi a választást:
alapértelmezésben determinisztikus, ha igényli, gazdagéphez hű.

## Automatikus feloldás

Ha nem állít be mérőt, a @knowvah/dot-engine renderelésenként választ egyet:

1. a `setTextMeasurer`-rel beállított kifejezett mérő (ha van, ez nyer);
2. **böngésző** (van `document`) → az oldal `<canvas>`-a — gazdagéphez hű, ugyanazzal
   a betűtípussal mér, amellyel a böngésző az SVG-szöveget rendereli;
3. **Node** → a beépített determinisztikus metrikamodell.

A könyvtárnak **nulla futásidejű függősége** van, és soha nem importál betűtípus-
könyvtárat vagy magát a `canvas`-t, így a böngészős csomag kicsi marad, a Node
alapértelmezés pedig soha nem olvassa a fájlrendszert.

## Gazdagéphez hű mérés Node-ban

Ha olyan Node-kimenetre van szüksége, amelynek dobozai egy adott betűtípushoz
illeszkednek (valódi kerning és alakformálás), telepítse az opcionális `canvas`
peert, és egyszer, indításkor kösse be:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

A `canvas` **opcionális peer függőségként** van deklarálva — nem települ, ha nem
kéri. Ha a Node interaktív terminálban a beépített modellre tér vissza, a
@knowvah/dot-engine egyszer kiírja ezt a tanácsot; a `GV_FONT_QUIET=1`-gyel
elnémíthatja.

## Egyéni mérők

A `setTextMeasurer` bármit elfogad, ami implementálja a `TextMeasurer`-t:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

A beépített implementációk újrafelhasználhatók, exportálva vannak: `CanvasTextMeasurer`
(bármely 2D kontextust becsomagolja), `EstimateTextMeasurer` (a determinisztikus,
hintelés nélküli referencia, amely megegyezik a fej nélküli Graphviz
`estimate_textspan_size` függvényével — **ez a Node alapértelmezése**), és
`LutTextMeasurer` (hintelt, betűcsaládonkénti keresőtábla, opcionálisan elérhető
a közelebbi méretezéshez natív `canvas` függőség nélkül).

## Miért ez a felosztás

A kerning, a ligatúrák és a nem ASCII glifek szélessége a tényleges betűtípus
alakformálási tábláitól függ — a karakterenkénti szélességtábla ezeket nem tudja
ábrázolni, és a helyes értékek betűtípusonként eltérnek (egy egyenközű betűtípus a
`<=`-t két cellaként rendereli; egy arányos betűtípus a `VA`-t közelebb kerninget kap).
A reprodukálható elrendezés ezért rögzített metrikamodellt használ; egy valódi
renderelő betűtípushoz való illeszkedéshez az adott betűtípussal kell mérni, és
ezt teszi a canvas-alapú mérő.
