---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Pomiar tekstu

Układ dot potrzebuje szerokości i wysokości każdej etykiety, aby ustalić rozmiary
węzłów i rozmieścić krawędzie. @knowvah/dot-engine mierzy tekst przez jeden
wymienny punkt rozszerzeń, `TextMeasurer`, i sam wybiera, którego użyć — albo możesz
ustawić własny.

## Kontrakt

Są dwa różne cele, które wymagają różnych mierników:

| Cel | Miernik | Deterministyczny? | Kerning / kształtowanie |
|------|----------|----------------|-------------------|
| **Powtarzalny układ** (ten sam wynik wszędzie) | wbudowany model metryk | tak | nie |
| **Układ wierny środowisku** (zgodny z czcionką renderowania) | canvas platformy | nie (zależny od czcionki) | tak |

Sam natywny Graphviz jest wierny środowisku — jego wynik zależy od czcionek
zainstalowanych na maszynie, która go uruchamia. @knowvah/dot-engine pozwala wybrać:
domyślnie deterministyczny, wierny środowisku, gdy go włączysz.

## Automatyczny wybór

Gdy nie ustawisz miernika, @knowvah/dot-engine wybiera go przy każdym renderowaniu:

1. jawny miernik ustawiony przez `setTextMeasurer` (wygrywa, jeśli jest);
2. **przeglądarka** (dostępny `document`) → `<canvas>` strony — wierny środowisku,
   mierzy tą samą czcionką, którą przeglądarka wyrenderuje tekst SVG;
3. **Node** → wbudowany deterministyczny model metryk.

Biblioteka ma **zero zależności uruchomieniowych** i nigdy sama nie importuje
biblioteki czcionek ani `canvas`, więc paczka dla przeglądarki pozostaje mała,
a domyślny tryb w Node nigdy nie czyta systemu plików.

## Pomiar wierny środowisku w Node

Aby w Node uzyskać wynik, którego pudełka pasują do konkretnej czcionki (prawdziwy
kerning i kształtowanie), zainstaluj opcjonalny peer `canvas` i podłącz go raz przy starcie:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` jest zadeklarowany jako **opcjonalna zależność peer** — nie jest instalowany,
dopóki o to nie poprosisz. Gdy Node w interaktywnym terminalu wraca do wbudowanego
modelu, @knowvah/dot-engine wypisuje tę radę jeden raz; wyciszysz ją przez
`GV_FONT_QUIET=1`.

## Własne mierniki

`setTextMeasurer` przyjmuje cokolwiek, co implementuje `TextMeasurer`:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

Wbudowane implementacje są eksportowane do ponownego użycia: `CanvasTextMeasurer`
(opakowuje dowolny kontekst 2D), `EstimateTextMeasurer` (deterministyczny wzorzec
bez hintingu, zgodny z `estimate_textspan_size` Graphviz bez interfejsu — **to
domyślny miernik w Node**) oraz `LutTextMeasurer` (tabela wyszukiwania z hintingiem
dla każdej rodziny czcionek, dostępna jako opcja dla rozmiarów bliższych wiernym
środowisku bez natywnej zależności od `canvas`).

## Dlaczego ten podział

Kerning, ligatury i szerokości glifów spoza ASCII zależą od tablic kształtowania
rzeczywistej czcionki — tabela szerokości na znak nie jest w stanie ich oddać,
a właściwe wartości różnią się w zależności od czcionki (czcionka o stałej szerokości
renderuje `<=` jako dwie komórki; czcionka proporcjonalna zbliża `VA`). Powtarzalny
układ używa więc stałego modelu metryk; dopasowanie do prawdziwej czcionki
renderowania wymaga pomiaru właśnie tą czcionką, co robi miernik oparty na canvas.
