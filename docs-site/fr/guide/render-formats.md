---
sourceHash: 91734a77ccd994e207575249d86485d95bac98d6ddb3b38481e94ded257de4b9
---

# Rendu vers d’autres formats

`render` dispose un graphe et produit une chaîne dans le format demandé. Elle
accepte n’importe quel `Graph` produit par `parse` ou `createGraph`.

## Signature

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  { engine?: string },
): string;
```

`engine` vaut `'dot'` par défaut. Consultez [Moteurs de disposition](/fr/guide/engines)
pour la liste complète.

## Formats

```ts
type OutputFormat =
  | 'svg'        // SVG markup
  | 'dot'        // DOT source with layout attributes added
  | 'xdot'       // DOT + xdot draw instructions (_draw_ attributes)
  | 'json'       // Full graph as JSON (graphviz json format)
  | 'plain'      // Whitespace-separated node/edge geometry (plain text)
  | 'plain-ext'  // plain, extended with port info
  | 'imap'       // HTML image-map (server-side; clickable areas)
  | 'cmapx';     // HTML client-side image-map
```

## Quand utiliser chaque format

| Format | Usage typique |
|---|---|
| `'svg'` | Intégration dans des pages web ; lisible par un humain ; s’agrandit sans perte |
| `'dot'` | Débogage ; réinjection dans d’autres outils graphviz avec la disposition conservée |
| `'xdot'` | Alimenter un moteur de rendu personnalisé via `getDrawOps` |
| `'json'` | Données de graphe exploitables par machine, pour l’outillage ou l’inspection |
| `'plain'` | Sortie géométrique légère ; facile à analyser dans des scripts |
| `'plain-ext'` | Comme `'plain'`, avec en plus les coordonnées des ports sur les arêtes |
| `'imap'` | Carte-image cliquable côté serveur pour les balises `<img>` |
| `'cmapx'` | Élément `<map>` côté client pour les balises `<img>` |

## Exemples

```ts
import { parse, render } from '@knowvah/dot-engine';

const g = parse(`
  digraph {
    rankdir = LR;
    a [label="Node A"];
    b [label="Node B"];
    a -> b [label="edge"];
  }
`);

// SVG — most common output
const svg = render(g, 'svg');

// Annotated DOT (layout coordinates embedded)
const laid = render(g, 'dot');

// JSON for inspection
const json = render(g, 'json');

// Plain-text geometry
const plain = render(g, 'plain');
```

## Utiliser un autre moteur

```ts
import { createGraph, render } from '@knowvah/dot-engine';

const b = createGraph({ directed: false });
b.addNode('x'); b.addNode('y'); b.addNode('z');
b.addEdge('x', 'y'); b.addEdge('y', 'z'); b.addEdge('z', 'x');

// neato uses a spring-model layout
const svg = render(b.graph, 'svg', { engine: 'neato' });
```

## Relation avec `renderSvg`

`renderSvg(dot, engine)` est une fonction utilitaire qui appelle `parse` +
`render` en une seule étape et se limite à la sortie SVG. Utilisez `render`
directement lorsque vous avez besoin d’un format autre que SVG ou lorsque vous
disposez déjà d’un objet `Graph`.

```ts
// Equivalent
const svg1 = renderSvg(dotSource, 'dot');

const svg2 = render(parse(dotSource), 'svg', { engine: 'dot' });
```
