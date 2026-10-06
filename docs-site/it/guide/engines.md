---
sourceHash: 616f97a2fa8ffcabcf858e44e35372f1ed973566855990ca52be0169f39c9cb1
---
# Motori di layout

Tutti e otto i motori di layout di Graphviz sono registrati. Passa il nome del motore come
secondo argomento a `renderSvg`:

```ts
renderSvg(dot, 'neato');
```

| Motore di layout | Stile di layout                              |
|--------------|-----------------------------------------------|
| `dot`        | Grafi orientati gerarchici / a livelli        |
| `neato`      | Modello a molle (Kamada–Kawai)                |
| `fdp`        | A forze dirette                               |
| `sfdp`       | A forze dirette multiscala (grafi grandi)     |
| `circo`      | Circolare                                     |
| `twopi`      | Radiale                                       |
| `osage`      | A cluster                                     |
| `patchwork`  | Treemap squarified                            |

## Nota sulla fedeltà

I motori si dividono in due classi di conformità (vedi [Conformità](/it/conformance)
per la definizione esatta e il codice di confronto):

- **Deterministici** — `dot`, `circo`, `twopi`, `osage`, `patchwork`. Sottoposti alla
  stessa soglia di **±0,01**: le coordinate numeriche e i percorsi coincidono con il
  binario C nativo entro ±0,01 pt e tutti i contenuti non numerici (tag, colori, testo) sono
  esattamente uguali sul corpus golden.
- **Iterativi** — `neato`, `fdp`, `sfdp`. Solutori a forze dirette/multiscala
  che dipendono dall'ordine di arrotondamento in virgola mobile, quindi sono verificati con un
  limite più largo di **±0,5** pt e sulla concordanza strutturale (stesso albero di elementi)
  anziché sull'uguaglianza numerica stretta.

Nessuna delle due soglie equivale a dichiarare un output SVG identico byte per byte. Per i
conteggi di test superati aggiornati e le eventuali divergenze accettate per motore, vedi [Parità](/parity) (con
pagine di dettaglio per motore) e [Divergenze note](/it/divergences).

## Provare motori diversi

Cambia il motore nel menu a discesa «Motore di layout» per confrontare i layout dello stesso grafo:

<Playground
  height="380px"
  :initial="`graph {\n  a -- b; a -- c; a -- d;\n  b -- c; c -- d; d -- b;\n  b -- e; c -- f;\n}`"
  engine="neato"
/>
