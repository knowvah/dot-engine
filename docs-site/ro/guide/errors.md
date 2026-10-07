---
sourceHash: 545227fb3a0a91494ed7a2c299e5a9ca93a594d68d99e0596f743e7597dfbae9
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Erori și excepții

dot-engine aruncă două feluri de erori. Felul pe care îl interceptați vă
spune cine trebuie să schimbe ceva.

## Două familii, o singură regulă

| Familie | Cum o recunoașteți | Semnificație | Cine acționează |
|--------|---------------------|---------|----------|
| Eșec dot-engine | `err instanceof DotEngineError` | dot-engine a eșuat pe această intrare: DOT invalid, o eroare fatală pe care ar raporta-o și Graphviz însuși, o funcționalitate Graphviz neacceptată sau o eroare (bug) în dot-engine | Autorul DOT sau un raport de bug |
| Eroare de utilizare | `TypeError` / `RangeError` / `Error` standard cu `err.code` care începe cu `ERR_` | Apelul a fost greșit: tip de argument incorect, nume de motor sau de format necunoscut, ordine greșită a apelurilor | Codul apelant |

Ramificați după `.code`, nu după textul mesajului. Mesajele se pot schimba între
versiuni; codurile sunt stabile.

Erorile de utilizare nu sunt `DotEngineError` și nu implementează `GvError`.
`name` rămâne `TypeError`, `RangeError` sau `Error`, ca în Node.js.

## Referință pe clase

Toate cele patru clase de mai jos extind `DotEngineError` și implementează forma
`GvError` (`type`, `code`, `message`, `friendlyMessage`, plus `location` și
`expected`, opționale).

### `DotEngineError` (abstractă)

Baza comună. `instanceof DotEngineError` este adevărat pentru orice eroare pe
care dot-engine o ridică în legătură cu intrarea sa. Nu poate fi construită
direct. `type`, `code` și `friendlyMessage` sunt definite de subclase.

### `ParseError`

| Element | Valoare |
|------|-------|
| Aruncată când | Sursa DOT nu este validă sau folosește operatorul de muchie greșit pentru tipul grafului |
| `type` | `syntax` |
| Coduri | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Câmpuri | `location` (`{ line, column, offset? }`), `expected` (așteptările analizorului; doar pentru `SYNTAX_*`), accesorii `line` și `column` |
| Acțiunea apelantului | Corectați sursa DOT. Afișați autorului `location` și `friendlyMessage` |

`GENERIC_ERROR` la un `ParseError` înseamnă că sursa are o imbricare atât de
adâncă încât analizorul a rămas fără stivă.

### `HtmlParseError`

| Element | Valoare |
|------|-------|
| Aruncată când | Nu ajunge niciodată la un apelant în prezent (vedeți mai jos) |
| `type` | `semantic` |
| Coduri | `HTML_PARSE_ERROR` |
| Câmpuri | `tag` (tokenul vinovat). Fără `location` sau `expected` |
| Acțiunea apelantului | Niciuna. Pentru a găsi o etichetă greșită, comparați ieșirea randată cu ceea ce vă așteptați |

Analizorul de etichete de tip HTML ridică `HtmlParseError` pentru un element
necunoscut, un atribut malformat sau un `<TABLE>`, `<HR>` ori `<VR>` plasat
greșit. Etapa de aranjare o interceptează și lasă eticheta fără conținut, ca
Graphviz: graful se randează în continuare, cu o etichetă goală. Nicio funcție
publică nu o propagă.

`HtmlParseError` nu este exportată din rădăcina pachetului. Dacă totuși ajunge
vreodată la dumneavoastră, `err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'`
o identifică.

### `RenderError`

| Element | Valoare |
|------|-------|
| Aruncată când | Aranjarea sau randarea eșuează într-un mod pe care Graphviz însuși l-ar raporta, graful numește un motor de aranjare indisponibil sau graful folosește o funcționalitate Graphviz pe care dot-engine nu a portat-o |
| `type` | `render` pentru `RENDER_ERROR`; `semantic` pentru `UNKNOWN_LAYOUT` și `UNSUPPORTED_FEATURE` |
| Coduri | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Câmpuri | `cause` când eșecul a învelit o altă eroare. Fără `location` |
| Acțiunea apelantului | `RENDER_ERROR`: schimbați graful. `UNKNOWN_LAYOUT`: corectați atributul `layout=`. `UNSUPPORTED_FEATURE`: evitați funcționalitatea (de exemplu, sfdp cu `rotation=45`; vedeți [tabelul](#unsupported-feature-reference)) |

### `InternalError`

| Element | Valoare |
|------|-------|
| Aruncată când | O aserțiune sau o invariantă din interiorul dot-engine eșuează sau o eroare care nu provine din dot-engine scapă din fluxul de aranjare sau de randare |
| `type` | `render` |
| Coduri | `INTERNAL_ERROR` |
| Câmpuri | `cause` (eroarea originală, când a fost învelită una) |
| Acțiunea apelantului | Raportați un bug împreună cu sursa DOT care l-a declanșat |

Nimic din ce poate schimba autorul DOT nu va evita în mod fiabil un
`InternalError`.

## Referință pe coduri

### `GvErrorCode`

| Cod | Clasă | `type` | Semnificație | Cauză tipică | Acțiunea apelantului | Generat de |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Token neașteptat | Greșeală de tastare, `;` sau `}` lipsă | Corectați DOT la `location` | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | Sursa s-a încheiat în mijlocul unei instrucțiuni | `{`, `[` sau șir neînchis | Corectați DOT la `location` | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` într-un graf neorientat | `graph { a -> b }` | Folosiți `--` | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` într-un digraf | `digraph { a -- b }` | Folosiți `->` | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Sursă prea adânc imbricată pentru a fi analizată | Subgrafuri imbricate patologic | Aplatizați DOT-ul | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Etichetă de tip HTML malformată | Element necunoscut, atribut greșit | Niciuna: eticheta se randează goală | Niciuna (interceptată intern) |
| `RENDER_ERROR` | `RenderError` | `render` | O eroare fatală de aranjare sau randare pe care ar raporta-o și Graphviz | Intrare malformată pentru o etapă de aranjare | Schimbați graful | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | Atributul `layout=` al grafului numește un motor neînregistrat | `layout="foo"` | Corectați atributul | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | Graful cere o funcționalitate Graphviz pe care dot-engine nu a portat-o | sfdp cu `rotation=45` | Evitați funcționalitatea | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | Bug în dot-engine | Aserțiune eșuată, aruncare externă | Raportați un bug | `renderSvg`, `render`, `getDrawOps`, metodele constructorului, `GvcContext.layout` (neînvelită) |

### `UsageErrorCode`

| Cod | Clasă | Semnificație | Cauză tipică | Acțiunea apelantului | Generat de |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Tip greșit, `null` sau un argument obligatoriu lipsă | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Corectați apelul | Fiecare funcție publică ce primește argumente |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Tip corect, valoare necunoscută | Nume de motor sau de format neînregistrat; `getLayout(g, { yAxis: 'other' })` | Folosiți un nume înregistrat sau o valoare permisă | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Argument numeric în afara intervalului | Rezervat | Corectați apelul | Nicio funcție publică nu o generează în prezent |
| `ERR_INVALID_STATE` | `Error` | Apel făcut în starea greșită | `getLayout` înainte de aranjare | Aranjați mai întâi (`render(g, ...)` sau `ctx.layout`) | `getLayout` |

Un argument de motor neînregistrat este respins chiar și atunci când sursa DOT
setează un atribut `layout=` valid. Argumentul este verificat primul.

## Referință pentru `UNSUPPORTED_FEATURE` {#unsupported-feature-reference}

Fiecare valoare de atribut de mai jos face ca aranjarea să arunce un
`RenderError` cu codul `UNSUPPORTED_FEATURE` acolo unde Graphviz nativ ar rula
un algoritm pe care dot-engine nu l-a portat. Alternativa era să se randeze o
aranjare care diferă de Graphviz fără a spune acest lucru. Verificarea se
declanșează doar când condiția din coloana „Se declanșează când” este
îndeplinită; același atribut în alte situații se randează normal. Pentru a evita
eroarea, eliminați atributul sau schimbați-l într-o valoare acceptată.

| Motor | Atribut și valoare | Se declanșează când | Funcționalitate Graphviz necesară |
|--------|--------------------|------------|-------------------------|
| neato | `mode=hier` | Întotdeauna (după ce graful are 2+ noduri și `maxiter` nu este negativ) | Majorizare de stres ierarhică (`stress_majorization_with_hierarchy`) |
| neato | `mode=ipsep` | Doar când Graphviz ar construi constrângeri: `diredgeconstraints` este adevărat sau `hier*`, `overlap=ipsep` ori graful are un cluster de nivel superior. Fără constrângeri rulează ca majorizare de stres, ca în Graphviz | Majorizare constrânsă (`stress_majorization_cola`) |
| neato | `start=self` | `mode` este `major` (implicit) sau `ipsep` | Inițializare inteligentă (`smart_ini`). Sub `mode=KK` sau `mode=sgd` înregistrează o dată pe randare `start=0 not supported with mode=self - ignored`, ca Graphviz |
| neato | `model=subset` | `mode` este `major` sau `KK` | Modelul de distanță subset |
| neato | `model=circuit` | `mode` este `major`, sau `KK` pe un graf conex. `KK` pe un graf neconex, fără `pack` sau `packmode`, înregistrează un avertisment și folosește cele mai scurte căi, ca Graphviz | Modelul de distanță circuit (`circuit_model`) |
| neato, twopi, circo, sfdp | `overlap=voronoi` (insensibil la majuscule) | Graful (pentru twopi, o componentă; pentru sfdp, întregul graf sau o componentă) are 2+ noduri, iar numărătoarea proprie a Graphviz pentru suprapuneri (`countOverlap`, care testează poligoanele nodurilor) este peste 0. Nodurile care se ating doar prin caseta de încadrare nu o declanșează. circo ajunge aici doar pentru un graf cu o singură componentă (la mai multe componente Graphviz ignoră și el `overlap`). sfdp ajunge aici doar când `overlap` nu este un mod prism | Eliminarea suprapunerilor Voronoi (`vAdjust`) |
| fdp | `overlap=` unul dintre `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho`, `ortho_yx`, `orthoxy`, `orthoyx`, `portho`, `portho_yx`, `porthoxy`, `porthoyx` | Modul este atins după încercările de iterații de forțe `N:`, adică atunci când acele încercări nu elimină toate suprapunerile (sau `N` este 0 ori lipsește). Prefixul `N:` este permis, de exemplu `3:voronoi` | Algoritmul de ajustare `removeOverlapWith` corespunzător |
| fdp | `splines=compound` | Întotdeauna, cu sau fără clustere | Rutarea muchiilor cu ocolirea clusterelor (`compoundEdges`) |
| sfdp | `smoothing=` orice în afară de `none` sau `0` | Întotdeauna | `post_process_smoothing` |
| sfdp | `rotation=` orice număr nenul | Întotdeauna | `rotate()` înainte de eliminarea suprapunerilor |
| sfdp | `label_scheme=1` până la `4` | Există un nod numit `|edgelabel|...`, `overlap` se rezolvă în modul `prism`, iar fie schema este 3 sau 4, fie schema este 1 sau 2 și încercările prism sunt peste 0 (`overlap=prism` cu un număr, nu implicitul `prism0`). Valorile peste 4 se numără ca 0. Etichetele obișnuite de muchie nu o declanșează niciodată | Tratarea nodurilor-etichetă de muchie (`edge_labeling_scheme`) |
| sfdp | `quadtree=none` (de asemenea `0`, `false`) | Orice graf cu cel puțin un nod. Mesajul numește schema rezolvată | `spring_electrical_embedding_slow` |
| sfdp | `quadtree=fast` (de asemenea `2`) | Orice graf cu cel puțin un nod. Mesajul numește schema rezolvată | `spring_electrical_embedding_fast` |
| toate motoarele | O formă de nod desenată printr-un caz special `round_corners` care nu este portat | Nodul folosește acea formă. Mesaj: `special shape N not yet ported` | Ramura de desenare `round_corners` a formei. Aceasta este o gardă internă împotriva unui număr de formă fără caz de desenare; nu se cunoaște nicio formă cu nume care să ajungă aici |

Cele mai multe mesaje au forma `<attribute>=<value>: <what> is not supported yet`.
Excepțiile sunt `smoothing` și `rotation` (care numesc rutina lipsă), rândurile
fdp și rândul formelor, care folosesc formulările de mai sus. Ramificați după
`err.code === 'UNSUPPORTED_FEATURE'`, nu după text.

Valorile care selectează implicitul (de exemplu `quadtree=normal`, `true`,
`yes`, `1`) și valorile acceptate de Graphviz care sunt portate (de exemplu
`start=regular`, `start=random`, `model=mds`, `mode=KK`, `mode=sgd`,
`overlap=prism`, familia `scale` și, pe neato, twopi, circo și sfdp,
`overlap=oscale`, `vpsc` și modurile `ortho*` / `portho*`) se randează normal.

## Referință pe funcții

„Utilizare” înseamnă `TypeError` cu `ERR_INVALID_ARG_TYPE`, cu excepția cazului
în care un rând numește alt cod.

| Funcție | Poate arunca |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Utilizare (`dotSource` sau `engine` nu este șir); `TypeError` `ERR_INVALID_ARG_VALUE` (motor neînregistrat); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Utilizare (`dotSource` sau `engine` nu este șir); `TypeError` `ERR_INVALID_ARG_VALUE` (motor neînregistrat). Nimic altceva: orice eșec legat de intrarea DOT este returnat în `errors` |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` nu este șir); `ParseError` |
| `render(g, format, opts?)` | Utilizare (`g`, `format` sau `opts` de tip greșit); `TypeError` `ERR_INVALID_ARG_VALUE` (motor sau format neînregistrat); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Utilizare (`g` sau `opts` de tip greșit); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` neînregistrat); `RenderError`; `ParseError` (xdot-ul intermediar nu a putut fi reanalizat: un bug dot-engine); `InternalError` |
| `createGraph(opts?)` și metodele constructorului (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Utilizare (tipuri de argumente greșite, inclusiv valori de atribute care nu sunt șiruri); `InternalError` (modelul grafului nu a reușit să creeze un nod sau un subgraf) |
| `addEdge(g, tail, head, name?)` (din `/api`) | Utilizare (`g`, `tail` sau `head` care nu sunt obiecte; `name` care nu este șir) |
| `getLayout(g, opts?)` | Utilizare (`g` sau `opts` nu este obiect); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` nu este `'up'` sau `'down'`); `Error` `ERR_INVALID_STATE` (graf nearanjat) |
| `new GvcContext(measurer, options?)` | Utilizare (`measurer` nu are funcția `measure`; `options` nu este obiect) |
| `ctx.register(plugin)` | Utilizare (nu este un plugin de randator sau un motor de aranjare) |
| `ctx.layout(g, engine)` | Utilizare (`g` nu este obiect, `engine` nu este șir); `TypeError` `ERR_INVALID_ARG_VALUE` (motor neînregistrat); `RenderError` `UNKNOWN_LAYOUT`. Eșecurile motorului se propagă neînvelite |
| `ctx.freeLayout(g, engine)` | Utilizare; `TypeError` `ERR_INVALID_ARG_VALUE` (motor neînregistrat). Eșecurile motorului se propagă neînvelite |
| `ctx.bestRenderer(format)` | Utilizare (`format` nu este șir); `TypeError` `ERR_INVALID_ARG_VALUE` (niciun randator pentru `format`) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Utilizare (`ctx` nu este un `GvcContext`, `g` nu este obiect, `format` nu este șir); `TypeError` `ERR_INVALID_ARG_VALUE` (niciun randator pentru `format`). Eșecurile de randare se propagă neînvelite |
| `setImageSizer(sizer)` | Utilizare (nu este funcție sau `null`) |
| `setImageResolver(fn)` | Utilizare (nu este funcție sau `null`) |
| `setTextMeasurer(measurer)` | Utilizare (nu este un `TextMeasurer` sau `undefined`) |

### Ce funcții învelesc aruncările externe

| Funcții | Comportament la o aruncare neașteptată (care nu provine din dot-engine) |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Învelită ca `InternalError`; `cause` este eroarea originală |
| `renderWithContext` și fiecare metodă `GvcContext` | **Neînvelită.** Un bug de motor ajunge la apelant ca orice a aruncat motorul, de exemplu un `TypeError` simplu fără `code` |

Dacă folosiți direct `GvcContext`, tratați o eroare care nu este nici
`DotEngineError`, nici eroare de utilizare ca pe un bug dot-engine.

## `tryRenderSvg` sau `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| DOT invalid sau eșec de aranjare | Aruncă un `DotEngineError` | Returnează `{ errors: [one] }` |
| Argumente greșite | Aruncă o eroare de utilizare | Aruncă o eroare de utilizare |
| Valoarea erorii | Un `Error` cu stivă și `cause` | Date simple: `type`, `code`, `message`, `friendlyMessage`, plus `location` / `expected` când sunt prezente |
| Folosiți când | Eșecul trebuie să oprească apelantul | Ramificați după `code` sau trimiteți eroarea prin `postMessage` ori într-un jurnal |

`tryRenderSvg` nu aruncă niciodată pentru nicio intrare DOT. Aruncă doar când
argumentele în sine sunt invalide, ceea ce este un bug în codul apelant.
Obiectele de eroare pe care le returnează nu au `cause` și nici urmă de stivă.

## Eșecuri învelite și `cause`

Când `renderSvg`, `render` sau `getDrawOps` interceptează o eroare pe care
dot-engine nu a ridicat-o, aruncă un `InternalError` al cărui `cause` este
eroarea originală. `message` este mesajul original.

`cause` este neenumerabil, deci `JSON.stringify(err)` îl omite. Parcurgeți
lanțul în mod explicit când înregistrați în jurnal (vedeți ultimul exemplu de
mai jos).

## Verificări între pachete

`instanceof DotEngineError` funcționează în interiorul unei singure copii a
bibliotecii. Dacă pot fi încărcate două copii (pachete duplicate, o gazdă de
pluginuri), folosiți `isGvError(e)`. Verifică existența unor `type` și `code`
de tip șir și funcționează între copii. Acceptă și obiectele simple pe care le
returnează `tryRenderSvg`.

## Exemple

Separați cele două familii:

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

Gestionați un rezultat `tryRenderSvg`:

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

Înregistrați în jurnal un `InternalError` împreună cu cauza lui:

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

## Vedeți și

- [Referință API (selecție)](/ro/guide/api) pentru semnătura fiecărei funcții.
- [Tipuri](/ro/guide/types) pentru formele `GvError` și `RenderResult`.
- [API generat (TypeDoc)](/reference/) pentru uniunile complete `GvErrorCode` și `UsageErrorCode`.
