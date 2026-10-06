---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Virheet ja poikkeukset

dot-engine heittää kahdenlaisia virheitä. Se, minkä tyyppisen virheen nappaat,
kertoo, kenen täytyy muuttaa jotakin.

## Kaksi perhettä, yksi sääntö

| Perhe | Miten tunnistat | Merkitys | Kuka toimii |
|--------|---------------------|---------|----------|
| dot-enginen epäonnistuminen | `err instanceof DotEngineError` | dot-engine epäonnistui tällä syötteellä: virheellinen DOT, kohtalokas virhe, jonka Graphviz itsekin ilmoittaisi, Graphviz-ominaisuus, jota ei ole portattu, tai dot-enginen virhe | DOTin kirjoittaja tai virheraportti |
| Käyttövirhe | tavallinen `TypeError` / `RangeError` / `Error`, jonka `err.code` alkaa merkkijonolla `ERR_` | Kutsu oli väärä: väärä argumenttityyppi, tuntematon moottorin tai muodon nimi, väärä kutsujärjestys | Kutsuva koodi |

Haaraudu `.code`-arvon, älä viestitekstin perusteella. Viestit voivat muuttua
julkaisujen välillä; koodit ovat vakaita.

Käyttövirheet eivät ole `DotEngineError`-virheitä, eivätkä ne toteuta
`GvError`-rajapintaa. Niiden `name` pysyy arvona `TypeError`, `RangeError` tai
`Error`, kuten Node.js:ssä.

## Luokkaviite

Kaikki neljä alla olevaa luokkaa laajentavat `DotEngineError`-luokkaa ja
toteuttavat `GvError`-muodon (`type`, `code`, `message`, `friendlyMessage`,
valinnaiset `location` ja `expected`).

### `DotEngineError` (abstrakti)

Yhteinen kantaluokka. `instanceof DotEngineError` on tosi jokaiselle virheelle,
jonka dot-engine nostaa syötteestään. Sitä ei voi luoda suoraan. `type`, `code`
ja `friendlyMessage` määritellään aliluokissa.

### `ParseError`

| Kohde | Arvo |
|------|-------|
| Heitetään, kun | DOT-lähdekoodi ei ole kelvollista tai käyttää graafin lajille väärää kaarioperaattoria |
| `type` | `syntax` |
| Koodit | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Kentät | `location` (`{ line, column, offset? }`), `expected` (jäsentimen odotukset; vain `SYNTAX_*`), `line`- ja `column`-getterit |
| Kutsujan toimenpide | Korjaa DOT-lähdekoodi. Näytä `location` ja `friendlyMessage` kirjoittajalle |

`GENERIC_ERROR` `ParseError`-virheessä tarkoittaa, että lähdekoodi on niin
syvään sisäkkäistä, että jäsentimen pino loppui.

### `HtmlParseError`

| Kohde | Arvo |
|------|-------|
| Heitetään, kun | Ei nykyisin koskaan päädy kutsujalle (katso alla) |
| `type` | `semantic` |
| Koodit | `HTML_PARSE_ERROR` |
| Kentät | `tag` (virheellinen token). Ei `location`- eikä `expected`-kenttää |
| Kutsujan toimenpide | Ei mitään. Löytääksesi virheellisen selitteen vertaa renderöityä tulostetta odottamaasi |

HTML-tyyppisen selitteen jäsennin nostaa `HtmlParseError`-virheen tuntemattomasta
elementistä, virheellisestä attribuutista tai väärin sijoitetusta `<TABLE>`-,
`<HR>`- tai `<VR>`-elementistä. Asetteluvaihe nappaa sen ja jättää selitteen
ilman sisältöä, kuten Graphviz: graafi renderöityy silti, tyhjällä selitteellä.
Mikään julkinen funktio ei välitä sitä eteenpäin.

`HtmlParseError` ei ole viety pakettijuuresta. Jos sellainen joskus päätyy
sinulle, `err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'`
tunnistaa sen.

### `RenderError`

| Kohde | Arvo |
|------|-------|
| Heitetään, kun | Asettelu tai renderöinti epäonnistuu tavalla, jonka Graphviz itsekin ilmoittaisi, graafi nimeää käytettävissä olemattoman asettelumoottorin tai graafi käyttää Graphviz-ominaisuutta, jota dot-engine ei ole portannut |
| `type` | `render` arvolle `RENDER_ERROR`; `semantic` arvoille `UNKNOWN_LAYOUT` ja `UNSUPPORTED_FEATURE` |
| Koodit | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Kentät | `cause`, kun epäonnistuminen kääri toisen virheen. Ei `location`-kenttää |
| Kutsujan toimenpide | `RENDER_ERROR`: muuta graafia. `UNKNOWN_LAYOUT`: korjaa `layout=`-attribuutti. `UNSUPPORTED_FEATURE`: vältä ominaisuutta (esimerkiksi sfdp arvolla `rotation=45`; katso [taulukko](#unsupported-feature-viite)) |

### `InternalError`

| Kohde | Arvo |
|------|-------|
| Heitetään, kun | dot-enginen sisäinen väite tai invariantti epäonnistuu tai muu kuin dot-enginen virhe karkaa asettelu- tai renderöintiputkesta |
| `type` | `render` |
| Koodit | `INTERNAL_ERROR` |
| Kentät | `cause` (alkuperäinen virhe, kun sellainen kääriytyi) |
| Kutsujan toimenpide | Raportoi virhe sen DOT-lähdekoodin kanssa, joka sen laukaisi |

Mikään, mitä DOTin kirjoittaja voi muuttaa, ei luotettavasti vältä
`InternalError`-virhettä.

## Koodiviite

### `GvErrorCode`

| Koodi | Luokka | `type` | Merkitys | Tyypillinen syy | Kutsujan toimenpide | Nostaa |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Odottamaton token | Kirjoitusvirhe, puuttuva `;` tai `}` | Korjaa DOT kohdassa `location` | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | Lähdekoodi päättyi kesken lauseen | Sulkematon `{`, `[` tai merkkijono | Korjaa DOT kohdassa `location` | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` suuntaamattomassa graafissa | `graph { a -> b }` | Käytä `--` | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` suunnatussa graafissa (digraph) | `digraph { a -- b }` | Käytä `->` | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Lähdekoodi liian syvään sisäkkäistä jäsennettäväksi | Patologisesti sisäkkäiset aligraafit | Litistä DOT | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Virheellinen HTML-tyyppinen selite | Tuntematon elementti, virheellinen attribuutti | Ei mitään: selite renderöityy tyhjänä | Ei mikään (napataan sisäisesti) |
| `RENDER_ERROR` | `RenderError` | `render` | Kohtalokas asettelu- tai renderöintivirhe, jonka Graphviz myös ilmoittaisi | Virheellinen syöte asetteluvaiheelle | Muuta graafia | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | Graafin `layout=`-attribuutti nimeää moottorin, jota ei ole rekisteröity | `layout="foo"` | Korjaa attribuutti | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | Graafi pyytää Graphviz-ominaisuutta, jota dot-engine ei ole portannut | sfdp arvolla `rotation=45` | Vältä ominaisuutta | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | dot-enginen virhe | Epäonnistunut väite, vieras heitto | Raportoi virhe | `renderSvg`, `render`, `getDrawOps`, rakentajan metodit, `GvcContext.layout` (kääräisemättä) |

### `UsageErrorCode`

| Koodi | Luokka | Merkitys | Tyypillinen syy | Kutsujan toimenpide | Nostaa |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Väärä tyyppi, `null` tai puuttuva pakollinen argumentti | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Korjaa kutsu | Jokainen julkinen funktio, joka ottaa argumentteja |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Oikea tyyppi, tuntematon arvo | Rekisteröimätön moottorin tai muodon nimi; `getLayout(g, { yAxis: 'other' })` | Käytä rekisteröityä nimeä tai sallittua arvoa | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Numeerinen argumentti alueensa ulkopuolella | Varattu | Korjaa kutsu | Mikään julkinen funktio ei nosta sitä nykyisin |
| `ERR_INVALID_STATE` | `Error` | Kutsu tehty väärässä tilassa | `getLayout` ennen asettelua | Aseta ensin (`render(g, ...)` tai `ctx.layout`) | `getLayout` |

Rekisteröimätön moottoriargumentti hylätään, vaikka DOT-lähdekoodi asettaisi
kelvollisen `layout=`-attribuutin. Argumentti tarkistetaan ensin.

## `UNSUPPORTED_FEATURE`-viite {#unsupported-feature-viite}

Jokainen alla oleva attribuutin arvo saa asettelun heittämään `RenderError`-virheen
koodilla `UNSUPPORTED_FEATURE` kohdissa, joissa natiivi Graphviz ajaisi
algoritmin, jota dot-engine ei ole portannut. Vaihtoehto olisi ollut
renderöidä asettelu, joka eroaa Graphvizista kertomatta siitä. Tarkistus
laukeaa vain, kun sarakkeen "Laukeaa, kun" ehto täyttyy; sama attribuutti muualla
renderöityy normaalisti. Virheen välttämiseksi poista attribuutti tai vaihda se
tuettuun arvoon.

| Moottori | Attribuutti ja arvo | Laukeaa, kun | Tarvittava Graphviz-ominaisuus |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | Aina (kun graafissa on 2+ solmua ja `maxiter` ei ole negatiivinen) | Hierarkkinen stressimajorisointi (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Vain kun Graphviz rakentaisi rajoitteita: `diredgeconstraints` on tosi tai `hier*`, `overlap=ipsep`, tai graafissa on ylätason klusteri. Ilman rajoitteita se ajetaan stressimajorisointina, kuten Graphvizissa | Rajoitettu majorisointi (`stress_majorization_cola`) |
| neato | `start=self` | `mode` on `major` (oletus) tai `ipsep` | Älykäs alustus (`smart_ini`). Arvoilla `mode=KK` tai `mode=sgd` se kirjaa viestin `start=0 not supported with mode=self - ignored` kerran renderöintiä kohden, kuten Graphviz |
| neato | `model=subset` | `mode` on `major` tai `KK` | Osajoukkoetäisyysmalli |
| neato | `model=circuit` | `mode` on `major` tai `KK` yhtenäisessä graafissa. `KK` epäyhtenäisessä graafissa ilman `pack`- tai `packmode`-arvoa kirjaa varoituksen ja käyttää lyhimpiä polkuja, kuten Graphviz | Piirietäisyysmalli (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (kirjainkoosta riippumaton) | Graafissa (twopilla komponentissa; sfdp:llä koko graafissa tai komponentissa) on 2+ solmua ja Graphvizin oma päällekkäisyyslaskuri (`countOverlap`, joka testaa solmujen monikulmiot) on yli 0. Solmut, jotka koskettavat vain rajauslaatikoillaan, eivät laukaise sitä. circo saavuttaa sen vain yhden komponentin graafille (usealla komponentilla Graphviz ohittaa myös `overlap`-arvon). sfdp saavuttaa sen vain, kun `overlap` ei ole prism-tila | Voronoi-päällekkäisyyden poisto (`vAdjust`) |
| fdp | `overlap=` jokin arvoista `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | Tila saavutetaan `N:`-voimaiteraatioyritysten jälkeen, eli kun nuo yritykset eivät poista kaikkia päällekkäisyyksiä (tai `N` on 0 tai puuttuu). `N:`-etuliite on sallittu, esimerkiksi `3:voronoi` | Vastaava `removeOverlapWith`-säätöalgoritmi |
| fdp | `splines=compound` | Aina, klustereiden kanssa tai ilman | Klustereita väistävä kaarten reititys (`compoundEdges`) |
| sfdp | `smoothing=` mikä tahansa paitsi `none` tai `0` | Aina | `post_process_smoothing` |
| sfdp | `rotation=` mikä tahansa nollasta poikkeava luku | Aina | `rotate()` ennen päällekkäisyyden poistoa |
| sfdp | `label_scheme=1` – `4` | Solmu nimeltä `|edgelabel|...` on olemassa, `overlap` ratkeaa `prism`-tilaan, ja joko skeema on 3 tai 4, tai skeema on 1 tai 2 ja prism-yritykset ovat yli 0 (`overlap=prism` luvun kanssa, ei oletus `prism0`). Arvot yli 4 lasketaan arvoksi 0. Tavalliset kaarten selitteet eivät koskaan laukaise sitä | Kaariselitesolmujen käsittely (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (myös `0`, `false`) | Mikä tahansa graafi, jossa on vähintään yksi solmu. Viesti nimeää ratkaistun skeeman | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (myös `2`) | Mikä tahansa graafi, jossa on vähintään yksi solmu. Viesti nimeää ratkaistun skeeman | `spring_electrical_embedding_fast` |
| kaikki moottorit | Solmun muoto, joka piirretään portaamattomalla `round_corners`-erikoistapauksella | Solmu käyttää kyseistä muotoa. Viesti: `special shape N not yet ported` | Muodon `round_corners`-piirtohaara. Tämä on sisäinen vartija muodon numerolle, jolla ei ole piirtotapausta; mikään nimetty muoto ei tiettävästi saavuta sitä |

Useimmat viestit ovat muotoa `<attribute>=<value>: <what> is not supported yet`.
Poikkeuksia ovat `smoothing` ja `rotation` (jotka nimeävät puuttuvan rutiinin),
fdp-rivit ja muotorivi, jotka käyttävät yllä olevia sanamuotoja. Haaraudu
`err.code === 'UNSUPPORTED_FEATURE'`-ehdon, älä tekstin perusteella.

Arvot, jotka valitsevat oletuksen (esimerkiksi `quadtree=normal`, `true`, `yes`,
`1`), sekä Graphvizin hyväksymät arvot, jotka on portattu (esimerkiksi
`start=regular`, `start=random`, `model=mds`, `mode=KK`, `mode=sgd`,
`overlap=prism`, `scale`-perhe sekä neatolla, twopilla, circolla ja sfdp:llä
`overlap=oscale`, `vpsc` ja `ortho*` / `portho*` -tilat), renderöityvät
normaalisti.

## Funktiokohtainen viite

"Käyttö" tarkoittaa `TypeError`-virhettä koodilla `ERR_INVALID_ARG_TYPE`, ellei
rivi nimeä toista koodia.

| Funktio | Voi heittää |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Käyttö (`dotSource` tai `engine` ei ole merkkijono); `TypeError` `ERR_INVALID_ARG_VALUE` (moottoria ei ole rekisteröity); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Käyttö (`dotSource` tai `engine` ei ole merkkijono); `TypeError` `ERR_INVALID_ARG_VALUE` (moottoria ei ole rekisteröity). Ei mitään muuta: jokainen DOT-syötteen epäonnistuminen palautetaan `errors`-kentässä |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` ei ole merkkijono); `ParseError` |
| `render(g, format, opts?)` | Käyttö (`g`, `format` tai `opts` väärää tyyppiä); `TypeError` `ERR_INVALID_ARG_VALUE` (moottoria tai muotoa ei ole rekisteröity); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Käyttö (`g` tai `opts` väärää tyyppiä); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` ei ole rekisteröity); `RenderError`; `ParseError` (välivaiheen xdotia ei voitu jäsentää uudelleen: dot-enginen virhe); `InternalError` |
| `createGraph(opts?)` ja rakentajan metodit (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Käyttö (väärät argumenttityypit, mukaan lukien attribuuttien arvot, jotka eivät ole merkkijonoja); `InternalError` (graafimalli ei onnistunut luomaan solmua tai aligraafia) |
| `addEdge(g, tail, head, name?)` (paketista `/api`) | Käyttö (ei-olio `g`, `tail` tai `head`; ei-merkkijono `name`) |
| `getLayout(g, opts?)` | Käyttö (`g` tai `opts` ei ole olio); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` ei ole `'up'` tai `'down'`); `Error` `ERR_INVALID_STATE` (graafia ei ole asetettu) |
| `new GvcContext(measurer, options?)` | Käyttö (`measurer`-oliolla ei ole `measure`-funktiota; `options` ei ole olio) |
| `ctx.register(plugin)` | Käyttö (ei ole renderöijäliitännäinen eikä asettelumoottori) |
| `ctx.layout(g, engine)` | Käyttö (`g` ei ole olio, `engine` ei ole merkkijono); `TypeError` `ERR_INVALID_ARG_VALUE` (moottoria ei ole rekisteröity); `RenderError` `UNKNOWN_LAYOUT`. Moottorin epäonnistumiset välittyvät kääräisemättöminä |
| `ctx.freeLayout(g, engine)` | Käyttö; `TypeError` `ERR_INVALID_ARG_VALUE` (moottoria ei ole rekisteröity). Moottorin epäonnistumiset välittyvät kääräisemättöminä |
| `ctx.bestRenderer(format)` | Käyttö (`format` ei ole merkkijono); `TypeError` `ERR_INVALID_ARG_VALUE` (muodolle `format` ei ole renderöijää) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Käyttö (`ctx` ei ole `GvcContext`, `g` ei ole olio, `format` ei ole merkkijono); `TypeError` `ERR_INVALID_ARG_VALUE` (muodolle `format` ei ole renderöijää). Renderöintivirheet välittyvät kääräisemättöminä |
| `setImageSizer(sizer)` | Käyttö (ei funktio eikä `null`) |
| `setImageResolver(fn)` | Käyttö (ei funktio eikä `null`) |
| `setTextMeasurer(measurer)` | Käyttö (ei `TextMeasurer` eikä `undefined`) |

### Mitkä funktiot käärivät vieraat heitot

| Funktiot | Käyttäytyminen odottamattomassa (ei-dot-engine-) heitossa |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Käärittynä `InternalError`-virheeksi; `cause` on alkuperäinen virhe |
| `renderWithContext` ja jokainen `GvcContext`-metodi | **Ei käärittynä.** Moottorin virhe saavuttaa kutsujan sellaisenaan kuin moottori sen heitti, esimerkiksi tavallisena `TypeError`-virheenä ilman `code`-arvoa |

Jos käytät `GvcContext`-oliota suoraan, käsittele virhettä, joka ei ole
`DotEngineError` eikä käyttövirhe, dot-enginen virheenä.

## `tryRenderSvg` vai `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| Virheellinen DOT tai asettelun epäonnistuminen | Heittää `DotEngineError`-virheen | Palauttaa `{ errors: [one] }` |
| Virheelliset argumentit | Heittää käyttövirheen | Heittää käyttövirheen |
| Virhearvo | `Error`, jolla on pinojälki ja `cause` | Tavallista dataa: `type`, `code`, `message`, `friendlyMessage` sekä `location` / `expected`, kun ne ovat saatavilla |
| Käytä, kun | Epäonnistumisen pitää keskeyttää kutsuja | Haarautut `code`-arvon perusteella tai lähetät virheen `postMessage`-kutsulla tai lokiin |

`tryRenderSvg` ei koskaan heitä mistään DOT-syötteestä. Se heittää vain, kun
argumentit itse ovat virheellisiä, mikä on kutsuvan koodin virhe. Sen
palauttamissa virheolioissa ei ole `cause`-kenttää eikä pinojälkeä.

## Käärityt epäonnistumiset ja `cause`

Kun `renderSvg`, `render` tai `getDrawOps` nappaa virheen, jota dot-engine ei
nostanut, se heittää `InternalError`-virheen, jonka `cause` on alkuperäinen
virhe. `message` on alkuperäinen viesti.

`cause` ei ole luetteloitava (non-enumerable), joten `JSON.stringify(err)` jättää
sen pois. Kulje ketju läpi eksplisiittisesti lokittaessasi (katso viimeinen
esimerkki alla).

## Pakettien väliset tarkistukset

`instanceof DotEngineError` toimii yhden kirjastokopion sisällä. Jos kaksi
kopiota voi latautua (päällekkäiset bundlet, liitännäisten isäntä), käytä
`isGvError(e)`. Se tarkistaa merkkijonomuotoisen `type`- ja `code`-kentän ja
toimii kopioiden yli. Se hyväksyy myös tavalliset oliot, jotka `tryRenderSvg`
palauttaa.

## Esimerkkejä

Erottele kaksi perhettä:

```ts
import { renderSvg, DotEngineError, ParseError } from '@knowvah/dot-engine';

function renderOrExplain(dot: string): string {
  try {
    return renderSvg(dot, 'dot');
  } catch (err: unknown) {
    if (err instanceof ParseError) {
      const { line, column } = err.location;
      return `DOT error at ${line}:${column}: ${err.friendlyMessage}`;
    }
    if (err instanceof DotEngineError) {
      return `${err.code}: ${err.friendlyMessage}`;
    }
    // A usage error: the call was wrong. Do not swallow it.
    throw err;
  }
}
```

Käsittele `tryRenderSvg`-tulos:

```ts
import { tryRenderSvg } from '@knowvah/dot-engine';

const result = tryRenderSvg('digraph { a ->', 'dot');
if (result.svg !== undefined) {
  console.log(result.svg.length);
} else {
  const [first] = result.errors ?? [];
  console.error(first?.code, first?.location);
}
```

Lokita `InternalError` syineen:

```ts
import { InternalError } from '@knowvah/dot-engine';

function describeChain(err: unknown): string[] {
  const lines: string[] = [];
  let current: unknown = err;
  while (current instanceof Error) {
    lines.push(`${current.name}: ${current.message}`);
    current = current.cause;
  }
  return lines;
}

export function logFailure(err: unknown): void {
  if (err instanceof InternalError) {
    // Report this: it is a dot-engine bug. `cause` is the original error.
    console.error(describeChain(err).join(' <- '));
  }
}
```

## Katso myös

- [API-viite (valikoitu)](/fi/guide/api) kunkin funktion allekirjoituksesta.
- [Tyypit](/fi/guide/types) `GvError`- ja `RenderResult`-muodoista.
- [Generoitu API (TypeDoc)](/reference/) täydestä `GvErrorCode`- ja `UsageErrorCode`-unionista.
