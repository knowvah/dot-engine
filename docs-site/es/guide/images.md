---
sourceHash: 626678082866ff72735554e9cab8e9b0cbeed44bd56cbe0e70417789ecfc91b1
---
# Imágenes

Un nodo con `image="logo.png"` (o una celda `<IMG SRC="logo.png">` de una etiqueta de
tipo HTML) no recibe sus píxeles incrustados por defecto. @knowvah/dot-engine emite el
origen **tal cual**:

```html
<image xlink:href="logo.png" width="64px" height="64px" .../>
```

Lo que muestre el SVG — un `<img>`/`<svg>` en línea del navegador, un shell de Electron, la
compilación de un sitio estático — resuelve ese `href` por su cuenta. Esta página explica
cómo se dimensiona ese href durante el diseño, tres formas de lograr que los píxeles
aparezcan de verdad y las implicaciones de CSP de cada una.

## Cómo fluyen las imágenes

1. El grafo declara `image="logo.png"` en un nodo, o una etiqueta de tipo HTML
   contiene una celda `<IMG>`.
2. Para una celda `<IMG>` de una etiqueta de tipo HTML, Graphviz necesita el **ancho/alto
   intrínseco** de la imagen para dimensionar la celda antes de poder diseñar nada más — la
   biblioteca nunca toca el sistema de archivos ni la red para averiguarlo, así que
   registras un dimensionador (`setImageSizer`, tratado en
   [Uso en el navegador](/es/guide/browser) y de nuevo más abajo para Node). El atributo `image=` de un nodo se dimensiona con el mismo dimensionador y se dibuja dentro del nodo, igual que una celda `<IMG>`; `imagescale` e `imagepos` se aplican a las imágenes de nodo, mientras que `<IMG>` usa su atributo `SCALE` y se centra. La unidad que devuelve el dimensionador se describe en [`setImageSizer`](/es/guide/api#setimagesizer-setimageresolver).
3. El diseño se ejecuta con las dimensiones que tu dimensionador devolvió para cada `<IMG>`.
4. El emisor de SVG (`usershape()` de `src/render/svg.ts`) escribe
   `<image xlink:href="...">` con el recuadro calculado en el paso 3. Por defecto, el
   `href` es la cadena `src` sin procesar, con escapes XML, y nada más.
5. Opcionalmente — si llamaste a `setImageResolver` y renderizaste con
   `{ inlineImages: true }` — el emisor escribe en su lugar
   `xlink:href="data:<mime>;base64,<bytes>"`, un URI `data:` autocontenido.
   Esto es un añadido; no es algo que haga el Graphviz nativo.

El dimensionado y la inserción en línea son dos puntos de extensión independientes, registrados por separado: puedes
dimensionar imágenes sin insertarlas (el caso habitual: alojar el archivo), o hacer
ambas cosas (SVG autocontenido).

## Dimensionado en Node frente a navegador

`setImageSizer` recibe `(src: string) => { w: number; h: number } | null` y
se consulta una vez por cada origen distinto de `image=`/`<IMG>` durante el diseño. Es un
registro global del proceso, con el mismo patrón que `setImageResolver` más abajo: llámalo
una vez antes de `render()`/`renderSvg()`.

**Navegador** — mide la imagen real, ya que dispones de `Image` y
`decode()`:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

const cache = new Map<string, { w: number; h: number }>();

async function warmImageSizes(sources: string[]): Promise<void> {
  for (const src of sources) {
    const img = new Image();
    img.src = src;
    await img.decode();
    cache.set(src, { w: img.naturalWidth, h: img.naturalHeight });
  }
}

// setImageSizer itself must be synchronous, so pre-warm the cache first
// (e.g. await warmImageSizes([...]) before calling render/renderSvg).
setImageSizer((src) => cache.get(src) ?? null);
```

`setImageSizer` es una función de retorno síncrona — no hay ningún `await` dentro —,
así que la vía del navegador resuelve de antemano las dimensiones (mediante `decode()`) en una caché
antes de que se ejecute el diseño y luego lee esa caché de forma síncrona.

**Node** — no hay `Image` del DOM, y la biblioteca no leerá el
sistema de archivos por ti. O bien codificas dimensiones conocidas de forma fija, o las lees tú mismo
(p. ej. de un manifiesto, o de un analizador ligero de cabeceras PNG/JPEG que aportes) y
entregas el resultado de la misma manera:

```ts
import { setImageSizer } from '@knowvah/dot-engine';
import { readFileSync } from 'node:fs';

// Simplest: fixed dimensions known ahead of time.
setImageSizer((src) => (src === 'logo.png' ? { w: 64, h: 64 } : null));

// Or: derive dimensions in your app layer (disk, S3 head request, a
// manifest file you maintain) and hand back the result synchronously.
const manifest = new Map(
  Object.entries(JSON.parse(readFileSync('image-manifest.json', 'utf8'))),
);
setImageSizer((src) => (manifest.get(src) as { w: number; h: number }) ?? null);
```

Si tus grafos nunca hacen referencia a imágenes externas, sáltate todo esto.

## Dimensionador y resolvedor asíncronos (por renderizado)

`setImageSizer` / `setImageResolver` son registros síncronos y globales del proceso,
así que el patrón del navegador de arriba tiene que precalentar una caché. Los puntos de entrada
asíncronos reciben los ganchos **en cada llamada** y los esperan por ti:

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg } = await renderSvgAsync(
  'digraph { a [label=<<TABLE><TR><TD><IMG SRC="logo.png"/></TD></TR></TABLE>>] }',
  'dot',
  {
    imageSizer: async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return { w: img.naturalWidth, h: img.naturalHeight };
    },
    inlineImages: true,
    imageResolver: async (src) => {
      const res = await fetch(src);
      return { bytes: new Uint8Array(await res.arrayBuffer()), mime: res.headers.get('content-type') ?? undefined };
    },
  },
);
```

- Cada gancho se llama **como máximo una vez por cada `src` distinto**, en paralelo, antes de que
  empiece el diseño. Después el motor ejecuta su diseño síncrono normal con los
  resultados recopilados.
- Un gancho que **lanza una excepción o rechaza** se trata como un fallo (`null`), igual que un
  gancho síncrono que devuelve `null`: tamaño cero para el dimensionador, el `src` sin procesar
  tal cual para el resolvedor.
- Cuando se da un gancho asíncrono, un fallo **no** recurre al
  `setImageSizer` / `setImageResolver` global. Cuando no se da, se aplican los globales
  como en `renderSvg`.
- Los ganchos se aplican solo a ese renderizado; no se registra nada global.
- `imageResolver` solo se consulta cuando `inlineImages` es `true`.
- `renderSvgInto` acepta las mismas opciones.

## Hacer que aparezca la imagen

El dimensionado hace que el diseño salga bien; no hace que los píxeles se muestren dondequiera
que acabe mostrándose el SVG. Elige uno de tres enfoques.

### 1. Alojar el archivo

Sirve la imagen en una URL (o en una ruta relativa a donde se
muestre el SVG) que el navegador/consumidor pueda obtener. Es la opción más simple y
no requiere trabajo adicional en el renderizado — pero el contexto de visualización debe poder
llegar a ese origen y, si el SVG se muestra en algún lugar con una CSP `img-src`
estricta, ese origen también debe estar en la lista de permitidos allí (ver más abajo).

### 2. Insertar en línea como URI `data:`

Usa la API de inserción en línea para producir una única cadena SVG autocontenida, sin
ninguna descarga externa: `setImageResolver` proporciona los bytes sin procesar y
`render(g, 'svg', { inlineImages: true })` los incrusta.

```ts
import { render, setImageResolver } from '@knowvah/dot-engine';
import type { ImageResolver } from '@knowvah/dot-engine';

const images = new Map<string, Uint8Array>([
  ['logo.png', /* Uint8Array of the PNG bytes, e.g. fetched or bundled */ new Uint8Array()],
]);

const resolver: ImageResolver = (src) => images.get(src) ?? null;

setImageResolver(resolver);

const svg = render(g, 'svg', { inlineImages: true });
```

`ImageResolver` también puede devolver `{ bytes: Uint8Array; mime?: string }` cuando
quieras indicar un tipo MIME de forma explícita (el emisor, en caso contrario, lo deduce
de la extensión del archivo de origen — `.png` → `image/png`, `.svg` →
`image/svg+xml`, etc., y recurre a `application/octet-stream` para
extensiones desconocidas). Llama a `setImageResolver(null)` para borrar el registro.

::: tip
Prefiere la inserción en línea cuando el SVG viaja a algún sitio que no puede obtener recursos
externos en el momento de mostrarse — clientes de correo, documentación sin conexión, una incrustación con CSP
estricta, o cualquier lugar donde quieras una única cadena autocontenida sin ninguna petición de red
posterior. La contrapartida es el tamaño de la salida: base64 infla la imagen un ~33 %, y
se duplica en cada SVG que la referencia (sin reutilización de la caché del navegador
entre renderizados).
:::

`inlineImages` es `false` por defecto; sin definirlo, la salida es idéntica byte a byte a la
del paso directo previo a la inserción en línea. Solo afecta al formato `svg`: no tiene efecto
sobre `json`/`xdot`/`dot`/otros formatos de texto. Un fallo (no hay resolvedor registrado, o
el resolvedor devuelve `null` para ese `src`) recurre automáticamente al
`src` sin procesar tal cual — la inserción en línea se degrada con elegancia, nunca lanza excepciones.

### 3. Directorios base al estilo de `imagepath`

El atributo de grafo `imagepath` de Graphviz nativo es una lista de directorios separados por dos puntos en los que se buscan los nombres relativos de `image=` y `shapefile=`. El port nunca lee archivos de imagen por sí mismo, así que nunca los recorre ni pide `dir/name` al host: `setImageSizer` y `ImageResolver` siempre reciben el nombre sin procesar, exactamente como está escrito. El port usa `imagepath` solo para decidir qué advertencia se imprime cuando el host no suministra un nombre relativo:

- Con `imagepath` definido, un nombre relativo de `image=`/`shapefile=` que el host no suministra emite `Warning: Filename "<name>" is unsafe` y después `Warning: No or improper image="<name>" for node "<node>"`, como hace el nativo cuando no se puede leer ningún `<dir>/<name>`.
- Un nombre absoluto, o un `imagepath` ausente o vacío, mantiene la línea `Warning: No such file or directory while opening <name>`.

`GV_FILE_PATH` y `SERVER_NAME` no se respetan (son variables de entorno y un navegador no tiene ninguna). Para resolver rutas relativas contra su propio directorio o URL base, anteponga el prefijo al nombre en la capa que construye el código DOT o dentro de sus callbacks `setImageSizer`/`ImageResolver`.

**Tipo de imagen.** Como en el nativo, el tipo se toma de los bytes que devuelve el resolver mediante detección de números mágicos: png, gif, jpeg, bmp, pdf, ps, eps, ico, riff/webp, y svg solo cuando los bytes empiezan por una declaración `<?xml` seguida de `<svg`. Todo lo que mida menos de 20 bytes no se reconoce. Con bytes no reconocidos no se dibuja nada y la imagen no se dimensiona al renderizar. El nativo además advierte con `Warning: "<name>" was not found as a file or as a shape library member`; el port aún no imprime esa línea (véase [Divergencias conocidas](/es/divergences)).

`-Tjson` advierte con `Warning: No loadimage plugin for "png:json"` (el tipo varía) una vez por imagen dibujada, como el nativo, porque este no tiene cargador de imágenes json. `svg`, `xdot`, `dot`, `plain` y `cmapx` no imprimen nada para un tipo reconocido. Una imagen conocida solo a través del sizer no tiene tipo, por lo que no imprime ninguna advertencia de loadimage (véase [Divergencias conocidas](/es/divergences)).

## Pautas de CSP

Si tus grafos los aporta el usuario (una zona de pruebas, una incrustación que renderiza
DOT arbitrario), piensa desde el principio en la política `img-src` de la página.

**Las imágenes insertadas en línea (URI `data:`)** solo necesitan:

```
img-src 'self' data:
```

Como cabecera de respuesta HTTP:

```
Content-Security-Policy: img-src 'self' data:
```

O como etiqueta meta en la página que aloja el SVG:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">
```

Es una política estricta — nunca se contacta con ningún host de imágenes externo, porque los bytes
ya están incrustados en la cadena SVG.

**Las imágenes alojadas (opción 1 de arriba)**, en cambio, necesitan que el contexto de visualización
obtenga las imágenes de dondequiera que estén realmente. Si un grafo aportado por el usuario puede
referenciar una URL arbitraria en `image=`, poner en la lista de permitidos todos los hosts posibles es
a menudo poco práctico, así que una página de zona de pruebas/incrustación puede necesitar algo permisivo:

```
Content-Security-Policy: img-src 'self' data: https:
```

::: warning
Nunca hagas de `img-src *` (ni de ningún `img-src` igual de permisivo) tu valor por defecto
**para todo el sitio**. Limítalo a la página concreta de zona de pruebas/incrustación que necesite renderizar
grafos arbitrarios aportados por el usuario, trátalo como una relajación deliberada y documentada
solo para esa página, y mantén estricta la CSP de todas las demás páginas. Un
`img-src` permisivo permite que un grafo malicioso exfiltre datos mediante canales laterales de URL de imagen
(p. ej. codificando datos en parámetros de consulta contra un host
controlado por un atacante) o cargue contenido remoto no deseado. Si controlas
el conjunto de imágenes, prefiere insertarlas en línea (`data:`) y mantén `img-src 'self'
data:` en todas partes.
:::

## Imágenes que faltan

Si `setImageSizer` devuelve `null` (o no hay ningún dimensionador registrado) para un
origen referenciado, @knowvah/dot-engine sigue el mismo camino fiel a C que un fallo de
`gvusershape` del Graphviz nativo: emite una advertencia y trata la imagen como de **tamaño
cero**, lo que afecta al diseño del recuadro del nodo calculado a su alrededor. Si
`setImageResolver`/`inlineImages` está en juego y el resolvedor falla, el
emisor recurre al `src` sin procesar tal cual en lugar de insertarlo en línea — el
`href` se escribe igualmente, solo que no se resolverá a menos que algo más de la
página pueda obtenerlo. Consulta [Divergencias conocidas](/es/divergences) para ver qué entra y qué
queda fuera del alcance en el manejo de imágenes/ráster en general.
