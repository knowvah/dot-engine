---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Graphviz puhtas TypeScriptis
  tagline: DOT sisse, SVG välja — ilma C-ta. Ei mingit natiivset Graphvizi binaari ega WASM-i. Puhas TypeScript, töötab brauseris.
  actions:
    - theme: brand
      text: Alustamine
      link: /et/guide/getting-started
    - theme: alt
      text: Avage mänguväljak
      link: /et/playground
    - theme: alt
      text: Vaadake GitHubis
      link: https://github.com/knowvah/dot-engine
features:
  - title: Truu C-keelsele Graphvizile
    details: Kanoonilise C-teostuse rida-realt portimine. Mootor dot ühtib natiivse binaariga golden-korpusel range deterministliku tolerantsi piires (±0,01 koordinaatide puhul, mittenumbrilise sisu puhul täpselt).
  - title: Brauseri-natiivne, ilma käitusaegsete sõltuvusteta
    details: Ei mingit C-d — ei natiivset Graphvizi binaari, ei WASM-portimist ega renderdusserverit. Paigutusmootor ise on TypeScript — komplekteerige ja avaldage.
  - title: Kõik kaheksa paigutusmootorit
    details: dot, neato, fdp, sfdp, circo, twopi, osage ja patchwork — renderdatud SVG-ks.
  - title: Programmipärane paigutus ja geomeetria
    details: Ärge ainult renderdage — lugege arvutatud sõlmede asukohad, servade splainid ja klastrite piirid tagasi lihtsa JSON-iks serialiseeritava hetktõmmisena funktsiooniga getLayout(), ilma -Tplain parsimiseta.
---

## Proovige

Allolev redaktor käitab päris teeki teie brauseris. Muutke vasakul DOT-i;
SVG uueneb reaalajas.

<Playground height="360px" />

## Valige oma tee

Olete siin uus? Valige uks, mis sobib sellega, mida parajasti teete:

| Soovin … | Alustage siit |
| --- | --- |
| Mõista, kuidas osad kokku sobivad | [Ülevaade — mõttemudel](/et/guide/overview) |
| Paigaldada ja renderdada oma esimese graafi | [Alustamine](/et/guide/getting-started) |
| Lahendada konkreetse ülesande | [Retseptikogu](/et/guide/recipes) |
| Funktsiooni või tüüpi järele vaadata | [API teatmik](/et/guide/api) · [Tüübid](/et/guide/types) |
| Katsetada ilma paigaldamata | [Mänguväljak](/et/playground) |

Tulete mõnest teisest tööriistast? Vaadake [C dot-käsurealt](/et/guide/migrate-from-c-cli)
või [JS Graphvizi teekidest](/et/guide/migrate-from-js-libs).

Põhjalike, automaatselt genereeritud signatuuride jaoks vaadake
[genereeritud API teatmikku](/reference/). Soovite renderdatud graafe lehele
manustada? Lugege pilditöötluse ja CSP juhiseid jaotisest
[Piltidega töötamine](/et/guide/images).
