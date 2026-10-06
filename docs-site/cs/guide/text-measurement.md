---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Měření textu

Rozvržení modulem dot potřebuje šířku a výšku každého popisku, aby určilo velikost uzlů a umístilo
hrany. @knowvah/dot-engine měří text přes jediný zásuvný bod, `TextMeasurer`,
a automaticky určí, který použít — nebo můžete nastavit
vlastní.

## Smlouva

Existují dva odlišné cíle a každý vyžaduje jiný měřič:

| Cíl | Měřič | Deterministický? | Kerning / tvarování |
|------|----------|----------------|-------------------|
| **Reprodukovatelné rozvržení** (stejný výstup všude) | vestavěný metrický model | ano | ne |
| **Rozvržení věrné hostiteli** (odpovídá vykreslovanému písmu) | canvas platformy | ne (závisí na písmu) | ano |

Samotný nativní Graphviz je věrný hostiteli — jeho výstup závisí na písmech
nainstalovaných ve stroji, na kterém běží. @knowvah/dot-engine vám dává na výběr: ve výchozím nastavení
deterministický, věrný hostiteli, když si to zvolíte.

## Automatické určení

Pokud měřič nenastavíte, @knowvah/dot-engine při každém vykreslení vybere jeden:

1. explicitní měřič nastavený přes `setTextMeasurer` (má přednost, je-li přítomen);
2. **prohlížeč** (k dispozici je `document`) → `<canvas>` stránky — věrně hostiteli,
   měří stejným písmem, kterým prohlížeč vykreslí text SVG;
3. **Node** → vestavěný deterministický metrický model.

Knihovna má **nulové závislosti za běhu** a sama nikdy neimportuje knihovnu písem ani
`canvas`, takže balíček pro prohlížeč zůstává malý a výchozí volba v Node nikdy
nečte souborový systém.

## Měření věrné hostiteli v Node

Pro výstup v Node, jehož rámečky odpovídají konkrétnímu písmu (skutečný kerning a tvarování),
nainstalujte volitelný peer `canvas` a při startu ho jednou zapojte:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas` je deklarován jako **volitelná peer závislost** — nenainstaluje se,
dokud o to nepožádáte. Když Node sáhne po vestavěném modelu v
interaktivním terminálu, @knowvah/dot-engine vypíše tuto radu jednou; ztlumíte ji pomocí
`GV_FONT_QUIET=1`.

## Vlastní měřiče

`setTextMeasurer` přijímá cokoli, co implementuje `TextMeasurer`:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

Vestavěné implementace jsou exportovány pro opakované použití: `CanvasTextMeasurer` (obalí libovolný
2D kontext), `EstimateTextMeasurer` (deterministická, nehintovaná reference, která
odpovídá `estimate_textspan_size` z Graphviz bez displeje — **to je výchozí
volba v Node**) a `LutTextMeasurer` (hintovaná vyhledávací tabulka pro každou rodinu písem,
k dispozici jako volitelná možnost pro přesnější velikosti bez nativní závislosti na `canvas`).

## Proč toto rozdělení

Kerning, ligatury a šířky glyfů mimo ASCII závisejí na tvarovacích tabulkách
skutečného písma — tabulka šířek po znacích je vyjádřit nemůže a správné hodnoty
se u každého písma liší (neproporcionální písmo vykreslí `<=` jako dvě buňky; proporcionální písmo
zkrátí mezeru u `VA`). Reprodukovatelné rozvržení proto používá pevný metrický model;
shoda se skutečným vykreslovaným písmem vyžaduje měření právě tímto písmem, což je to, co
dělá měřič opřený o canvas.
