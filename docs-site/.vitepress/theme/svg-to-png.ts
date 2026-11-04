// SPDX-License-Identifier: EPL-2.0
/**
 * Rasterizes a standalone SVG document to a PNG blob for the Playground's
 * export. Client-only: it needs `Image`, `document` and `URL.createObjectURL`.
 */

const PNG_SCALE = 2;

export function svgToPng(markup: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(
      new Blob([markup], { type: 'image/svg+xml' }),
    );
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(img.naturalWidth * PNG_SCALE);
      canvas.height = Math.ceil(img.naturalHeight * PNG_SCALE);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      // No background fill: the SVG paints its own bgcolor polygon, and a
      // bgcolor=transparent graph should stay transparent in the PNG.
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // This callback runs after the executor has returned, so a throw here
      // would not reject the Promise. toBlob throws SecurityError synchronously
      // on a tainted canvas.
      try {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))),
          'image/png',
        );
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not rasterize the SVG'));
    };
    img.src = url;
  });
}
