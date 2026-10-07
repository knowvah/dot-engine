---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Saf TypeScript ile Graphviz
  tagline: DOT girer, SVG çıkar — C yok. Yerel Graphviz ikilisi yok, WASM yok. Saf TypeScript, tarayıcıda çalışır.
  actions:
    - theme: brand
      text: Başlayın
      link: /tr/guide/getting-started
    - theme: alt
      text: Deneme alanını açın
      link: /tr/playground
    - theme: alt
      text: GitHub'da görüntüleyin
      link: https://github.com/knowvah/dot-engine
features:
  - title: C Graphviz'e sadık
    details: Kanonik C uygulamasının satır satır portu. dot motoru, golden derleminde yerel ikiliyle sıkı ve deterministik bir toleransla (koordinatlarda ±0,01, sayısal olmayan içerikte birebir) eşleşir.
  - title: Tarayıcıya özgü, çalışma zamanı bağımlılığı yok
    details: C yok — yerel Graphviz ikilisi yok, WASM portu yok, işleme sunucusu yok. Yerleşim motorunun kendisi TypeScript'tir — paketleyin ve yayınlayın.
  - title: Sekiz yerleşim motorunun tümü
    details: dot, neato, fdp, sfdp, circo, twopi, osage ve patchwork — SVG olarak işlenir.
  - title: Programatik yerleşim ve geometri
    details: Yalnızca işlemeyle kalmayın — hesaplanan düğüm konumlarını, kenar spline'larını ve küme sınırlarını getLayout() ile düz, JSON'a serileştirilebilir bir anlık görüntü olarak geri okuyun; -Tplain ayrıştırmaya gerek yok.
---

## Deneyin

Aşağıdaki düzenleyici gerçek kitaplığı tarayıcınızda çalıştırır. Soldaki DOT
kaynak kodunu düzenleyin; SVG canlı olarak güncellenir.

<Playground height="360px" />

## Yolunuzu seçin

Burada yeni misiniz? Yapmak istediğinize uyan kapıyı seçin:

| Yapmak istediğim… | Buradan başlayın |
| --- | --- |
| Parçaların nasıl bir araya geldiğini anlamak | [Genel bakış — zihinsel model](/tr/guide/overview) |
| Kurmak ve ilk grafımı işlemek | [Başlarken](/tr/guide/getting-started) |
| Somut bir görevi çözmek | [Tarif kitabı](/tr/guide/recipes) |
| Bir işlevi veya türü aramak | [API referansı](/tr/guide/api) · [Türler](/tr/guide/types) |
| Kurulum yapmadan denemek | [Deneme Alanı](/tr/playground) |

Başka bir araçtan mı geliyorsunuz? [C `dot` komut satırından](/tr/guide/migrate-from-c-cli)
veya [JS Graphviz kitaplıklarından](/tr/guide/migrate-from-js-libs) geçiş
sayfalarına bakın.

Ayrıntılı, otomatik oluşturulmuş imzalar için
[oluşturulan API referansına](/reference/) bakın. İşlenmiş grafları bir sayfaya mı
gömmek istiyorsunuz? Görsel gömme ve CSP yönergeleri için
[Görsellerle çalışma](/tr/guide/images) sayfasını okuyun.
