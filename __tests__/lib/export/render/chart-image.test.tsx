/**
 * Unit tests for renderChartToPng. JSDOM cannot rasterize canvas pixels, so
 * we stub HTMLCanvasElement + global.Image to verify the rasterization
 * pipeline is wired correctly (canvas is sized by pixelRatio, filled with the
 * requested background, and the PNG data URL from `toDataURL` is returned).
 */

import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { renderChartToPng } from '@/lib/export/render/chart-image';

jest.mock('@mantine/core', () => ({
  MantineProvider: jest.fn(({ children }: { children: ReactNode }) => children),
}));

const mockedMantineProvider = jest.mocked(MantineProvider);

const FAKE_DATA_URL = 'data:image/png;base64,FAKE';

let capturedCanvasWidth = 0;
let capturedCanvasHeight = 0;
let capturedFillStyle = '';
let mockToDataUrl: jest.Mock;

function installCanvasStubs() {
  HTMLCanvasElement.prototype.getContext = jest.fn(function (
    this: HTMLCanvasElement
  ) {
    capturedCanvasWidth = this.width;
    capturedCanvasHeight = this.height;
    return {
      fillRect: jest.fn(),
      drawImage: jest.fn(),
      get fillStyle() {
        return capturedFillStyle;
      },
      set fillStyle(v: string) {
        capturedFillStyle = v;
      },
    } as unknown as CanvasRenderingContext2D;
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  mockToDataUrl = jest.fn(() => FAKE_DATA_URL);
  HTMLCanvasElement.prototype.toDataURL =
    mockToDataUrl as unknown as typeof HTMLCanvasElement.prototype.toDataURL;
}

// JSDOM's Image element never fires `onload` for blob URLs; stub it to
// invoke onload on a microtask as a real browser would.
class StubImage {
  onload: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  decoding = 'sync';
  crossOrigin: string | null = null;
  private _src = '';
  get src() {
    return this._src;
  }
  set src(v: string) {
    this._src = v;
    queueMicrotask(() => this.onload?.());
  }
}

let originalImage: typeof Image;
let originalCreateObjectURL: typeof URL.createObjectURL;
let originalRevokeObjectURL: typeof URL.revokeObjectURL;

beforeEach(() => {
  mockedMantineProvider.mockClear();
  installCanvasStubs();
  capturedFillStyle = '';
  capturedCanvasWidth = 0;
  capturedCanvasHeight = 0;
  originalImage = global.Image;
  (global as unknown as { Image: unknown }).Image =
    StubImage as unknown as typeof Image;
  originalCreateObjectURL = URL.createObjectURL;
  originalRevokeObjectURL = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = jest.fn();
});

afterEach(() => {
  (global as unknown as { Image: unknown }).Image = originalImage;
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

function renderSvg() {
  return (
    <svg width={100} height={100}>
      <rect width={100} height={100} fill="#4c9be8" />
    </svg>
  );
}

describe('renderChartToPng', () => {
  it('returns the PNG data URL from canvas.toDataURL', async () => {
    const result = await renderChartToPng(renderSvg(), {
      width: 100,
      height: 100,
      maxPaintWaitMs: 0,
    });
    expect(result).toBe(FAKE_DATA_URL);
  });

  it('removes the host DIV after resolution', async () => {
    await renderChartToPng(renderSvg(), {
      width: 100,
      height: 100,
      maxPaintWaitMs: 0,
    });
    expect(document.querySelectorAll('[data-pptx-chart-host]').length).toBe(0);
  });

  it('rejects when no SVG is rendered into the host', async () => {
    await expect(
      renderChartToPng(<div />, { width: 100, height: 100, maxPaintWaitMs: 0 })
    ).rejects.toThrow(/did not render an SVG/i);
  });

  it('removes the host DIV even when rasterization fails', async () => {
    mockToDataUrl.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(
      renderChartToPng(renderSvg(), { width: 100, height: 100, maxPaintWaitMs: 0 })
    ).rejects.toThrow('boom');
    expect(document.querySelectorAll('[data-pptx-chart-host]').length).toBe(0);
  });

  it('defaults pixelRatio to 2', async () => {
    await renderChartToPng(renderSvg(), {
      width: 100,
      height: 100,
      maxPaintWaitMs: 0,
    });
    expect(capturedCanvasWidth).toBe(200);
    expect(capturedCanvasHeight).toBe(200);
  });

  it('honors a custom pixelRatio', async () => {
    await renderChartToPng(renderSvg(), {
      width: 100,
      height: 100,
      pixelRatio: 3,
      maxPaintWaitMs: 0,
    });
    expect(capturedCanvasWidth).toBe(300);
    expect(capturedCanvasHeight).toBe(300);
  });

  it('sizes the host DIV to the requested dimensions', async () => {
    let capturedStyle: string | null = null;
    // Capture host styles during the Mantine render (before cleanup).
    mockedMantineProvider.mockImplementationOnce(((props: { children?: ReactNode }) => {
      const host = document.querySelector<HTMLElement>('[data-pptx-chart-host]');
      capturedStyle = host?.getAttribute('style') ?? null;
      return props.children as ReactNode;
    }) as unknown as typeof MantineProvider);

    await renderChartToPng(renderSvg(), {
      width: 150,
      height: 200,
      maxPaintWaitMs: 0,
    });

    expect(capturedStyle).not.toBeNull();
    expect(capturedStyle!).toContain('width: 150px');
    expect(capturedStyle!).toContain('height: 200px');
  });

  it("fills the canvas background with 'white' by default", async () => {
    await renderChartToPng(renderSvg(), {
      width: 100,
      height: 100,
      maxPaintWaitMs: 0,
    });
    expect(capturedFillStyle).toBe('white');
  });

  it('honors a custom backgroundColor', async () => {
    await renderChartToPng(renderSvg(), {
      width: 100,
      height: 100,
      maxPaintWaitMs: 0,
      backgroundColor: 'transparent',
    });
    expect(capturedFillStyle).toBe('transparent');
  });

  it('wraps the element in MantineProvider', async () => {
    await renderChartToPng(renderSvg(), {
      width: 100,
      height: 100,
      maxPaintWaitMs: 0,
    });
    expect(mockedMantineProvider).toHaveBeenCalled();
  });
});
