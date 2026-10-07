---
sourceHash: f2d27a0dea4a09fb6e47ae89ce6cf6d748d7547124a24e8c36d6237d9bad9954
---
# Metin ölçümü

Dot yerleşimi, düğümleri boyutlandırmak ve kenarları yerleştirmek için her etiketin
genişliğine ve yüksekliğine ihtiyaç duyar. @knowvah/dot-engine metni, `TextMeasurer`
adlı tek bir takılabilir genişletme noktası üzerinden ölçer ve hangisinin kullanılacağını
otomatik çözümler — ya da kendinizinkini ayarlayabilirsiniz.

## Sözleşme

İki ayrı hedef vardır ve farklı ölçerler gerektirir:

| Hedef | Ölçer | Deterministik mi? | Kerning / şekillendirme |
|------|----------|----------------|-------------------|
| **Yeniden üretilebilir yerleşim** (her yerde aynı çıktı) | yerleşik metrik model | evet | hayır |
| **Ana makineye sadık yerleşim** (işleme yazı tipiyle eşleşir) | platformun canvas'ı | hayır (yazı tipine bağlı) | evet |

Yerel graphviz'in kendisi ana makineye sadıktır — çıktısı, onu çalıştıran makinede
kurulu yazı tiplerine bağlıdır. @knowvah/dot-engine seçimi size bırakır: varsayılan olarak
deterministik, siz isteyince ana makineye sadık.

## Otomatik çözümleme

Bir ölçer ayarlamadığınızda @knowvah/dot-engine her işlemede birini seçer:

1. `setTextMeasurer` ile ayarlanmış açık bir ölçer (varsa o kazanır);
2. **tarayıcı** (`document` mevcut) → sayfanın `<canvas>` öğesi — ana makineye sadık;
   tarayıcının SVG metnini işleyeceği yazı tipiyle aynısıyla ölçer;
3. **Node** → yerleşik deterministik metrik model.

Kitaplığın **çalışma zamanı bağımlılığı yoktur** ve hiçbir zaman bir yazı tipi kitaplığını
veya `canvas` paketini kendisi içe aktarmaz; böylece tarayıcı paketi küçük kalır ve Node
varsayılanı dosya sistemini hiç okumaz.

## Node'da ana makineye sadık ölçüm

Kutuları belirli bir yazı tipine uyan (gerçek kerning ve şekillendirme) Node çıktısı için
isteğe bağlı `canvas` eş bağımlılığını kurun ve başlangıçta bir kez bağlayın:

```ts
import { setTextMeasurer, CanvasTextMeasurer, renderSvg } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer dependency: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));

const svg = renderSvg('digraph { A -> B }', 'dot');
```

`canvas`, **isteğe bağlı eş bağımlılık** olarak bildirilmiştir — siz istemedikçe
kurulmaz. Node etkileşimli bir terminalde yerleşik modele geri düştüğünde
@knowvah/dot-engine bu öneriyi bir kez yazdırır; `GV_FONT_QUIET=1` ile susturun.

## Özel ölçerler

`setTextMeasurer`, `TextMeasurer` uygulayan her şeyi kabul eder:

```ts
import { setTextMeasurer, type TextMeasurer } from '@knowvah/dot-engine';

const myMeasurer: TextMeasurer = {
  measure: (text, fontname, fontsize) => ({ w: text.length * fontsize * 0.6, h: fontsize }),
};
setTextMeasurer(myMeasurer);
setTextMeasurer(undefined); // restore automatic resolution
```

Yerleşik uygulamalar yeniden kullanım için dışa aktarılır: `CanvasTextMeasurer` (herhangi
bir 2D bağlamı sarar), `EstimateTextMeasurer` (başsız graphviz'in
`estimate_textspan_size` işleviyle eşleşen, deterministik, ipucusuz referans — **Node
varsayılanı budur**) ve `LutTextMeasurer` (yerel `canvas` bağımlılığı olmadan daha yakın
boyutlandırma için isteğe bağlı olarak kullanılabilen, yazı tipi ailesi başına ipuçlu bir
arama tablosu).

## Bu ayrım neden

Kerning, ligatürler ve ASCII dışı glif genişlikleri, gerçek yazı tipinin şekillendirme
tablolarına bağlıdır — karakter başına genişlik tablosu bunları temsil edemez ve doğru
değerler yazı tipine göre değişir (tek aralıklı bir yazı tipi `<=` ifadesini iki hücre
olarak işler; orantılı bir yazı tipi `VA` çiftini birbirine yaklaştırır). Bu yüzden
yeniden üretilebilir yerleşim sabit bir metrik model kullanır; gerçek bir işleme yazı
tipiyle eşleşmek ise o yazı tipiyle ölçmeyi gerektirir; canvas destekli ölçerin yaptığı
da budur.
