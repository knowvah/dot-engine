// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import { svgToPng } from '../../docs-site/.vitepress/theme/svg-to-png.js';

const NATURAL_WIDTH = 10.5;
const NATURAL_HEIGHT = 20;
const SCALED_WIDTH = 21;
const SCALED_HEIGHT = 40;
const OBJECT_URL = 'blob:svg';
const SETTLE_TIMEOUT = 'still pending';

type ToBlob = (callback: (blob: Blob | null) => void, type: string) => void;

interface Stage {
  loads?: boolean;
  context?: unknown;
  toBlob?: ToBlob;
}

interface StagedCanvas {
  width: number;
  height: number;
}

/** Stubs the browser APIs `svgToPng` uses and returns what it observes. */
function stageBrowser(stage: Stage): {
  canvas: StagedCanvas;
  revoked: string[];
} {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () =>
      'context' in stage ? stage.context : { drawImage: () => undefined },
    toBlob: stage.toBlob ?? (() => undefined),
  };
  const revoked: string[] = [];
  class StagedImage {
    naturalWidth = NATURAL_WIDTH;
    naturalHeight = NATURAL_HEIGHT;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_url: string) {
      // Browsers fire these as tasks, after the Promise executor has returned.
      queueMicrotask(() =>
        stage.loads === false ? this.onerror?.() : this.onload?.(),
      );
    }
  }
  vi.stubGlobal('Image', StagedImage);
  vi.stubGlobal('document', { createElement: () => canvas });
  vi.stubGlobal('URL', {
    createObjectURL: () => OBJECT_URL,
    revokeObjectURL: (url: string) => revoked.push(url),
  });
  return { canvas, revoked };
}

/** The promise's outcome, or `SETTLE_TIMEOUT` if it never settles. */
function settled(promise: Promise<Blob>): Promise<unknown> {
  return Promise.race([
    promise.catch((e: unknown) => e),
    new Promise((resolve) => setTimeout(() => resolve(SETTLE_TIMEOUT), 50)),
  ]);
}

afterEach(() => vi.unstubAllGlobals());

describe('svgToPng', () => {
  it('resolves the encoded blob from a canvas at twice the natural size', async () => {
    const blob = new Blob(['png'], { type: 'image/png' });
    const { canvas, revoked } = stageBrowser({
      toBlob: (callback) => callback(blob),
    });

    expect(await svgToPng('<svg/>')).toBe(blob);
    expect([canvas.width, canvas.height]).toEqual([SCALED_WIDTH, SCALED_HEIGHT]);
    expect(revoked).toEqual([OBJECT_URL]);
  });

  it('rejects when toBlob throws, as it does on a tainted canvas', async () => {
    const tainted = new DOMException('Tainted canvases', 'SecurityError');
    stageBrowser({
      toBlob: () => {
        throw tainted;
      },
    });

    expect(await settled(svgToPng('<svg/>'))).toBe(tainted);
  });

  it('rejects when the encoder yields no blob', async () => {
    stageBrowser({ toBlob: (callback) => callback(null) });

    await expect(svgToPng('<svg/>')).rejects.toThrow('PNG encoding failed');
  });

  it('rejects when the canvas has no 2D context', async () => {
    stageBrowser({ context: null });

    await expect(svgToPng('<svg/>')).rejects.toThrow(
      'Canvas 2D context unavailable',
    );
  });

  it('rejects and revokes the URL when the image fails to load', async () => {
    const { revoked } = stageBrowser({ loads: false });

    await expect(svgToPng('<svg/>')).rejects.toThrow(
      'Could not rasterize the SVG',
    );
    expect(revoked).toEqual([OBJECT_URL]);
  });
});
