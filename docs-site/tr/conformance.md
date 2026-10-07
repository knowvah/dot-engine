---
sourceHash: 9c653332a94ce7180323ec7cd584987db329e4217af01dd06692e410c0c22a8c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Uygunluk: “eşleşme” ne demek {#conformance-what-match-means}

@knowvah/dot-engine, kâhin olarak kanonik C Graphviz ikilisine karşı doğrulanır.
Bu proje bir grafın C ile **eşleştiğini** söylediğinde — `conformant` adlı parite
kararı —, bununla mekanik olarak denetlenen belirli bir özellik kastedilir;
SVG metninin harfi harfine bayt bayt eşitliği **değil**.

> **Tanım.** Bir port işlemesi, her iki SVG de normalleştirilmiş bir öğe ağacına
> ayrıştırıldıktan sonra, kâhin işlemesiyle **uyumludur** (conformant), eğer:
>
> 1. her **sayısal** değer (koordinatlar, yol verisi, `points`, `viewBox`,
>    `transform` parametreleri) kâhinle sabit bir **tolerans** dahilinde
>    uyuşuyorsa ve
> 2. her **sayısal olmayan** değer (etiket adları, renkler, metin içeriği,
>    öznitelik anahtarları, numaralandırılmış öznitelik değerleri) **tam olarak
>    eşitse**.
>
> Herhangi bir sayısal değer toleransı aşarsa veya herhangi bir sayısal olmayan
> değer farklıysa, işleme uyumlu **değildir**.

## Neden harfi harfine bayt değil? {#why-not-literal-bytes}

SVG, kayan noktalı koordinatları ondalık metin olarak serileştirir. Matematiksel
olarak denk iki işleme, IEEE-754 yuvarlaması, kayan noktalı işlemlerin sırası ve
CPU'ya ve JS motoruna göre değişen platforma bağlı `libm`/FMA davranışı yüzünden
yine de yazdırılan son basamakta birbirinden ayrılabilir. Bu nedenle harfi harfine
bir bayt çıtası, bu kitaplığın hedeflediği çalışma zamanları (tarayıcılar, Node,
farklı CPU'lar) genelinde yalnızca katı olmakla kalmaz, **sınanamaz** olurdu.
Uygunluk, gerçekten önemli olan özelliği — bir izleyicinin gördüğü geometriyi ve
içeriği — algılanamayacak kadar küçük bir sınıra bağlar.

## Tam tolerans {#the-exact-tolerance}

Tolerans **motor sınıfına göre** belirlenir ve
[`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
içinde tanımlanır:

| Sınıf | Tolerans (pt) | Motorlar |
|---|---:|---|
| `deterministic` | **±0.01** | `dot`, `circo`, `twopi`, `osage`, `patchwork` |
| `iterative` | **±0.5** | `neato`, `fdp`, `sfdp` |

Belirlenimci motorlar, C'nin tamsayı/yazdırılan koordinatlarını esasen tam olarak
yeniden üretir; bu yüzden ±0.01 yalnızca ondalık biçimlendirme gürültüsünü emer.
Yinelemeli (kuvvet yönelimli) motorlar, son bit sonuçları platformlar arasında
yeniden üretilemeyen aşkın fonksiyonlara bağlıdır; bu yüzden daha gevşek bir sınır
taşırlar ve ek olarak **yapısal** eşitlik açısından da denetlenirler (aynı öğe
ağacı).

**plain/plain-ext** yüzeyi için bir uyarı: plain, koordinatları inç cinsinden 5
anlamlı basamakla (`%.5g`) yazdırır; bu yüzden ≥ 100 büyüklüklerde yazdırma
kuantumu (0.01) ±0.01 toleransına eşit olur. Çok büyük graflarda, 5. basamağın
yuvarlama sınırını aşan, ULP'nin altındaki bir yerleşim farkı tam bir 0.01
adımı olarak yazdırılır ve işaretlenir; oysa altta yatan geometri ~1e-11 pt
hassasiyetle aynıdır (bkz. circo `2108` kabulü, günlük 2026-07-28). Noktayla
(pt) yazdıran xdot/json yüzeyleri, bu aralıkta geometri karşılaştırmasının
yetkili kaynağıdır.

**Derlem parite taraması**, motordan bağımsız olarak her grafı `deterministic`
kipinde (±0.01) değerlendirir — bkz.
[`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
(`diffVerdict` → `compareSvg(port, oracle, 'deterministic')`).

## Kodu okuyun {#read-the-code}

Yukarıdaki tanım bir niyet beyanı değildir — karşılaştırma kodunun tam olarak
yaptığı şeydir. Kendiniz doğrulamak için:

- [`test/golden/compare.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/compare.ts)
  — `TOLERANCES` (±0.01 / ±0.5 tablosu) ve `compareSvg`; bu işlev iki
  normalleştirilmiş ağacı dolaşır ve öznitelik öznitelik (1) numaralı kuralı
  (sayısal değer tolerans dahilinde) ile (2) numaralı kuralı (sayısal olmayan
  değer tam eşit) uygular.
- [`test/golden/normalize.ts`](https://github.com/knowvah/dot-engine/blob/main/test/golden/normalize.ts)
  — ham SVG'nin karşılaştırılabilir öğe ağacına nasıl ayrıştırıldığı.
- [`test/corpus/survey.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/survey.ts)
  — aşağıdaki kararlardan birini atayan `diffVerdict`. `survey.ts` yalnızca `dot`
  SVG hattını kapsar.
- [`test/corpus/engine-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/engine-walk.ts)
  — motor başına **xdot** taraması (`npx tsx test/corpus/engine-walk.ts <engine>`);
  yukarıdaki tabloyla aynı sınıf ayrımını uygular
  (`neato`/`fdp`/`sfdp` için `TOLERANCE = 0.5`, diğer her motor için `0.01`) ve
  SVG yerine anlamsal çizim işlemi akışlarını (`compareXdot`) karşılaştırır.
  `circo`/`twopi`/`osage`/`patchwork`/`neato`/`fdp`/`sfdp` hatları bu şekilde
  ölçülür; `dot`'un kendi xdot hattı ise kardeş araç olan
  [`xdot-walk.ts`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/xdot-walk.ts)
  dosyasını kullanır.

## Kararlar {#the-verdicts}

Tarama her grafa tam olarak bir karar atar. Hat başına güncel sayılar:
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md)
her motor × yüzey hattını (hem belirlenimci hem yinelemeli) özetler;
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
`dot` SVG panosudur ve diğer her motorun `test/corpus/` içinde yanında kendi
`PARITY-<engine>.md` panosu bulunur:

| Karar | Anlamı |
|---|---|
| **`conformant`** | Yukarıdaki tanıma göre kâhinle eşleşir (sayısal değerler tolerans dahilinde, sayısal olmayanlar tam eşit). |
| **`structural-match`** | Öğe ağacı aynıdır, ancak bir veya daha fazla sayısal değer toleransı aşar. |
| **`diverged`** | Öğe ağaçları farklıdır (eksik/fazladan bir öğe ya da sayısal olmayan bir uyuşmazlık). |
| **`errored` / `timeout`** | Port girdiyi işleyemedi (`errored`; motor başına hatlarda `port-error`) ya da zaman bütçesini aştı (`timeout`). Başarısızlık olarak puanlanır: geçme yüzdesinin paydasında sayılır, asla geçti olarak değil. |
| **`oracle-error`** | C kâhini girdiyi işleyemedi, dolayısıyla karşılaştırılacak bir referans yok. Kapsam dışı: geçme yüzdesinin paydasından hariç tutulur. |

Her panodaki **geçme yüzdesi** `conformant / (surveyed − oracle-error)` değeridir.

“Conformant” çıtadır; “structural-match” anlamlı bir ilerlemedir (şekil doğru,
koordinatlar hâlâ kayıyor); “diverged”, “errored” ve “timeout” gerçek boşluklardır.
Bunların hiçbiri bayt bayt aynı çıktı iddiası değildir.

Bazı graflar belirli bir motorda **hiçbir karar taşımaz**: aşağıdaki *motor
dışlamalarına* bakın.

### Motor dışlamaları {#engine-exclusions}

Dışlanmış bir `(graf, motor)` çifti yürütülmez; dolayısıyla ne uyumludur ne de
farklıdır — orada yalnızca ölçülmez. Bu, karşılaştırmanın *yapıldığı* ve farkın
belgelenmiş bir nedenle bağışlandığı kabul edilmiş bir farklılıktan ayrıdır.

Çıta bilerek yüksektir; çünkü incelenmemiş bir graf, bilinen bir maliyet değil bir
kapsama boşluğudur. Bir kayıt için üç koşulun hepsi gerekir: motorun algoritması
girdide kanıtlanabilir biçimde devreye giremez, atlamak gerçek zaman kazandırır ve
aynı davranış daha ucuz bir hatta doğrulanmıştır. *Yavaş* olmak açıkça yeterli
değildir — zayıf bir port/kâhin oranı, gerçek bir performans kusurunun tam olarak
nasıl göründüğüdür ve buna dayanarak dışlamak, derlemin var olma amacını gizlerdi.

Her dışlama mekanizmasıyla birlikte
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md#engine-exclusions)
içinde listelenir; kayıt defteri `test/corpus/engine-exclusions.json` dosyasıdır.
Bu kuralı doğuran örnek `2222`'dir: 28.303 düğüm bildirir ve hiç kenar bildirmez.
İlişkilendirilecek bir şey olmadığından, her kuvvet yönelimli ve radyal motor
ortak bileşen paketleyiciye devreder ve kendi algoritmalarının hiçbiri çalışmaz —
kâhin çıktılarının bayt bayt aynı olması bunu doğrular. `dot` farklı bir yol izler
ve bunu altı saniyede uyumlu biçimde kapsar.
