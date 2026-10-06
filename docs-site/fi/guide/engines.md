---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Asettelumoottorit

Kaikki kahdeksan Graphvizin asettelumoottoria on rekisteröity. Anna moottorin nimi
`renderSvg`-funktion toisena argumenttina:

```ts
renderSvg(dot, 'neato');
```

| Asettelumoottori | Asettelutyyli                                 |
|--------------|-----------------------------------------------|
| `dot`        | Hierarkkiset / kerrokselliset suunnatut graafit |
| `neato`      | Jousimalli (Kamada–Kawai)                     |
| `fdp`        | Voimaohjattu                                  |
| `sfdp`       | Monitasoinen voimaohjattu (suuret graafit)    |
| `circo`      | Ympyrämäinen                                  |
| `twopi`      | Säteittäinen                                  |
| `osage`      | Klusteroitu                                   |
| `patchwork`  | Neliöity puukartta (treemap)                  |

## Huomio tarkkuudesta

Moottorit jakautuvat kahteen yhdenmukaisuusluokkaan (tarkka määritelmä ja vertailukoodi:
[Yhdenmukaisuus](/fi/conformance)):

- **Deterministiset** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Niihin
  sovelletaan samaa **±0,01**:n rajaa: numeeriset koordinaatit ja polut vastaavat
  natiivia C-binääriä ±0,01 pt:n tarkkuudella ja kaikki ei-numeerinen sisältö
  (tagit, värit, teksti) on täsmälleen sama golden-korpuksessa.
- **Iteratiiviset** — `neato`, `fdp`, `sfdp`. Voimaohjatut/monitasoiset ratkaisijat,
  jotka riippuvat liukulukujen pyöristysjärjestyksestä, joten ne tarkistetaan
  löyhemmällä **±0,5** pt:n rajalla ja rakenteellisen (sama elementtipuu) vastaavuuden
  osalta tiukan numeerisen yhtäpitävyyden sijaan.

Kumpikaan raja ei väitä tuotoksen olevan tavu tavulta sama SVG. Ajantasaiset
läpäisymäärät ja moottorikohtaiset hyväksytyt poikkeamat löytyvät sivuilta
[Pariteetti](/parity) (moottorikohtaisine yksityiskohtasivuineen) ja
[Tunnetut poikkeamat](/fi/divergences).

## Kokeile eri moottoreita

Vaihda moottoria alasvetovalikosta ”Asettelumoottori” vertaillaksesi saman graafin asetteluja:

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>

