---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Yerleşim motorları

Graphviz'in sekiz yerleşim motorunun tümü kayıtlıdır. Motor adını `renderSvg`
işlevine ikinci bağımsız değişken olarak geçirin:

```ts
renderSvg(dot, 'neato');
```

| Motor        | Yerleşim biçimi                               |
|--------------|-----------------------------------------------|
| `dot`        | Hiyerarşik / katmanlı yönlü graflar           |
| `neato`      | Yay modeli (Kamada–Kawai)                     |
| `fdp`        | Kuvvet yönlendirmeli                          |
| `sfdp`       | Çok ölçekli kuvvet yönlendirmeli (büyük graflar) |
| `circo`      | Dairesel                                      |
| `twopi`      | Radyal                                        |
| `osage`      | Kümelenmiş                                    |
| `patchwork`  | Kareleştirilmiş ağaç haritası (treemap)       |

## Sadakat notu

Motorlar iki uygunluk sınıfına ayrılır (kesin tanım ve karşılaştırma kodu için
bkz. [Uygunluk](/tr/conformance)):

- **Deterministik** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Aynı
  **±0,01** çıtasına bağlıdır: sayısal koordinatlar ve yollar yerel C ikilisiyle
  ±0,01pt içinde uyuşur; sayısal olmayan tüm içerik (etiketler, renkler, metin)
  golden derleminde birebir aynıdır.
- **Yinelemeli** — `neato`, `fdp`, `sfdp`. Kayan noktalı yuvarlama sırasına
  bağlı olan kuvvet yönlendirmeli/çok ölçekli çözücülerdir; bu yüzden sıkı
  sayısal eşitlik yerine daha gevşek bir **±0,5**pt sınırıyla ve yapısal (aynı
  öğe ağacı) uyumla denetlenirler.

İki çıta da birebir bayt düzeyinde SVG çıktısı iddiası değildir. Güncel geçme
sayıları ve motor başına kabul edilmiş farklılıklar için [Parite](/parity)
sayfasına (motor başına ayrıntı sayfalarıyla) ve
[Bilinen farklılıklar](/tr/divergences) sayfasına bakın.

## Farklı motorları deneyin

Aynı grafın yerleşimlerini karşılaştırmak için “Yerleşim motoru” açılır
menüsünden motoru değiştirin:

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
