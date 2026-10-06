---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Moduly rozvržení

Je zaregistrováno všech osm modulů rozvržení Graphviz. Název modulu předejte
jako druhý argument funkce `renderSvg`:

```ts
renderSvg(dot, 'neato');
```

| Modul rozvržení | Styl rozvržení                                |
|--------------|-----------------------------------------------|
| `dot`        | Hierarchické / vrstvené orientované grafy     |
| `neato`      | Pružinový model (Kamada–Kawai)                |
| `fdp`        | Silově řízené rozvržení                       |
| `sfdp`       | Vícekrokové silově řízené rozvržení (velké grafy) |
| `circo`      | Kruhové                                       |
| `twopi`      | Radiální                                      |
| `osage`      | Clusterové                                    |
| `patchwork`  | Squarified treemap                            |

## Poznámka k věrnosti

Moduly se dělí do dvou tříd shody (přesnou definici a porovnávací kód najdete
v části [Shoda](/cs/conformance)):

- **Deterministické** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Musí
  splnit stejnou laťku **±0,01**: číselné souřadnice a cesty se na korpusu
  golden testů shodují s nativní binárkou v C v rozmezí ±0,01 pt a veškerý
  nečíselný obsah (značky, barvy, text) je přesně stejný.
- **Iterativní** — `neato`, `fdp`, `sfdp`. Silově řízené, resp. vícekrokové
  řešiče, které závisejí na pořadí zaokrouhlování při práci s čísly s plovoucí
  desetinnou čárkou, a proto se kontrolují s volnější mezí **±0,5** pt a na
  strukturální shodu (stejný strom prvků), nikoli na těsnou číselnou rovnost.

Ani jedna z laťek netvrdí, že výstup SVG je shodný bajt po bajtu. Aktuální
počty úspěšných případů a přijaté odchylky pro jednotlivé moduly najdete v části
[Parita](/parity) (s podrobnými stránkami pro jednotlivé moduly) a ve
[Známých odchylkách](/cs/divergences).

## Vyzkoušejte různé moduly

Přepněte modul v rozbalovací nabídce „Modul rozvržení“ a porovnejte rozvržení téhož grafu:

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
