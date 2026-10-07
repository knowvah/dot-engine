---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Moduly rozloženia

Registrovaných je všetkých osem modulov rozloženia Graphviz. Názov modulu odovzdajte ako
druhý argument funkcii `renderSvg`:

```ts
renderSvg(dot, 'neato');
```

| Modul rozloženia | Štýl rozloženia                           |
|--------------|-----------------------------------------------|
| `dot`        | Hierarchické / vrstvené orientované grafy     |
| `neato`      | Pružinový model (Kamada–Kawai)                |
| `fdp`        | Silovo riadené                                |
| `sfdp`       | Viacúrovňové silovo riadené (veľké grafy)     |
| `circo`      | Kruhové                                       |
| `twopi`      | Radiálne                                      |
| `osage`      | Klastrové                                     |
| `patchwork`  | Squarified treemap                            |

## Poznámka k vernosti {#fidelity-note}

Moduly sa delia do dvoch tried zhody (presnú definíciu a porovnávací kód
nájdete v časti [Zhoda](/sk/conformance)):

- **Deterministické** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Platí pre ne
  rovnaká latka **±0,01**: číselné súradnice a cesty sa na korpuse golden testov zhodujú
  s natívnou binárkou v C na ±0,01 pt a všetok nečíselný obsah (značky, farby, text) je
  presne rovnaký.
- **Iteratívne** — `neato`, `fdp`, `sfdp`. Silovo riadené/viacúrovňové riešiče,
  ktoré závisia od poradia zaokrúhľovania pri číslach s pohyblivou rádovou čiarkou, a preto sa
  kontrolujú s voľnejšou hranicou **±0,5** pt a na štrukturálnu zhodu (rovnaký strom
  prvkov), nie na tesnú číselnú rovnosť.

Žiadna z týchto latiek netvrdí, že výstup SVG je zhodný bajt po bajte. Aktuálne počty
úspešných testov a prijaté odchýlky pre jednotlivé moduly nájdete v časti [Parita](/parity)
(so stránkami s podrobnosťami pre každý modul) a [Známe odchýlky](/sk/divergences).

## Vyskúšajte rôzne moduly {#try-different-engines}

Prepnite modul v rozbaľovacom zozname „Modul rozloženia“ a porovnajte rozloženia toho istého grafu:

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
