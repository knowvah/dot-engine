---
sourceHash: 33fa90104a012c6ce9d15de21f32270498520e3d281601ddae71c0a48280eee4
layout: home
hero:
  name: "@knowvah/dot-engine"
  text: Graphviz puhtaana TypeScriptinä
  tagline: DOT sisään, SVG ulos — ilman C:tä. Ei natiivia Graphviz-binääriä, ei WASM:ia. Puhdasta TypeScriptiä, toimii selaimessa.
  actions:
    - theme: brand
      text: Aloita tästä
      link: /fi/guide/getting-started
    - theme: alt
      text: Avaa leikkikenttä
      link: /fi/playground
    - theme: alt
      text: Katso GitHubissa
      link: https://github.com/knowvah/dot-engine
features:
  - title: Uskollinen C-Graphvizille
    details: Rivi riviltä tehty porttaus kanoonisesta C-toteutuksesta. Asettelumoottori dot vastaa golden-korpuksessa natiivia binääriä tiukalla, deterministisellä toleranssilla (±0,01 koordinaateissa, ei-numeerinen sisältö täsmälleen).
  - title: Selainnatiivi, ei ajonaikaisia riippuvuuksia
    details: Ei C:tä — ei natiivia Graphviz-binääriä, ei WASM-porttausta, ei renderöintipalvelinta. Itse asettelumoottori on TypeScriptiä — niputa se ja julkaise.
  - title: Kaikki kahdeksan asettelumoottoria
    details: dot, neato, fdp, sfdp, circo, twopi, osage ja patchwork — renderöitynä SVG:ksi.
  - title: Ohjelmallinen asettelu ja geometria
    details: Älä vain renderöi — lue lasketut solmujen sijainnit, kaarten splinit ja klusterien rajat takaisin tavallisena, JSON-serialisoitavana tilannekuvana getLayout()-funktiolla, ilman -Tplain-jäsennystä.
---

## Kokeile

Alla oleva editori ajaa varsinaista kirjastoa selaimessasi. Muokkaa DOT-koodia
vasemmalla; SVG päivittyy reaaliajassa.

<Playground height="360px" />

## Valitse polkusi

Uusi täällä? Valitse ovi, joka sopii siihen, mitä olet tekemässä:

| Haluan… | Aloita tästä |
| --- | --- |
| Ymmärtää, miten osat sopivat yhteen | [Yleiskatsaus — ajattelumalli](/fi/guide/overview) |
| Asentaa ja renderöidä ensimmäisen graafini | [Aloitus](/fi/guide/getting-started) |
| Ratkaista konkreettisen tehtävän | [Reseptikokoelma](/fi/guide/recipes) |
| Hakea funktion tai tyypin | [API-viite](/fi/guide/api) · [Tyypit](/fi/guide/types) |
| Kokeilla ilman asennusta | [Leikkikenttä](/fi/playground) |

Tulossa toisesta työkalusta? Katso [C:n `dot`-komentorivityökalusta](/fi/guide/migrate-from-c-cli)
tai [JS-Graphviz-kirjastoista](/fi/guide/migrate-from-js-libs).

Kattavat, automaattisesti generoidut allekirjoitukset löytyvät
[generoidusta API-viitteestä](/reference/). Haluatko upottaa renderöityjä graafeja sivulle?
Lue [Kuvien käyttö](/fi/guide/images) kuvien upottamisesta ja CSP:stä.
