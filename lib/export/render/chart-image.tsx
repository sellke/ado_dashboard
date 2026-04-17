'use client';

import { MantineProvider } from '@mantine/core';
import type { ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

export interface ChartCaptureOptions {
  width: number;
  height: number;
  /** Defaults to 2 (retina). Higher = crisper image, larger file. */
  pixelRatio?: number;
  /** Defaults to 'white' to avoid transparent bleed against dark slide backgrounds. */
  backgroundColor?: string;
  /**
   * Max time to wait for the chart's SVG to render in the hidden host before
   * capture. Recharts' ResponsiveContainer uses ResizeObserver asynchronously,
   * so a single rAF is insufficient. Defaults to 600ms. Set to 0 for tests.
   */
  maxPaintWaitMs?: number;
}

function rafTick(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 16);
    }
  });
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

async function waitForChartPaint(host: HTMLElement, maxMs: number): Promise<void> {
  if (maxMs <= 0) return;

  const findSvg = () => host.querySelector('svg');
  const isSvgReady = () => {
    const svg = findSvg();
    if (!svg) return false;
    const rect = svg.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  if (isSvgReady()) return;

  await rafTick();

  const hasChartWrapper = !!host.querySelector(
    '.chart-container, .recharts-responsive-container, .recharts-wrapper'
  );
  if (!hasChartWrapper && !findSvg()) return;

  const deadline = nowMs() + maxMs;
  while (nowMs() < deadline && !isSvgReady()) {
    await rafTick();
  }
}

/**
 * Copies computed text-related CSS onto SVG text nodes so fonts and sizes
 * persist after serialization. Recharts uses attribute-based styling for
 * fill/stroke (which serialize naturally) but relies on CSS for text
 * properties like font-family and font-size.
 */
function inlineTextStyles(original: Element, clone: Element): void {
  if (original.tagName === 'text' || original.tagName === 'tspan') {
    try {
      const computed = window.getComputedStyle(original);
      const style = (clone as HTMLElement).style;
      style.fontFamily = computed.fontFamily;
      style.fontSize = computed.fontSize;
      style.fontWeight = computed.fontWeight;
      if (computed.fill && computed.fill !== 'none') {
        style.fill = computed.fill;
      }
    } catch {
      // getComputedStyle can throw on detached nodes — non-fatal.
    }
  }

  const origChildren = Array.from(original.children);
  const cloneChildren = Array.from(clone.children);
  const n = Math.min(origChildren.length, cloneChildren.length);
  for (let i = 0; i < n; i++) {
    inlineTextStyles(origChildren[i], cloneChildren[i]);
  }
}

/**
 * Rasterizes a live Recharts SVG element to a PNG data URL via the
 * SVG → Blob → Image → Canvas → toDataURL pipeline.
 *
 * This bypasses html-to-image entirely. Recharts emits pure SVG with
 * inline fill/stroke attributes, which round-trip reliably through an
 * Image element; html-to-image's full-DOM capture was producing blank
 * PNGs because its DOM clone lost Recharts' computed SVG dimensions.
 */
async function svgToPngDataUrl(
  svg: SVGElement,
  targetWidth: number,
  targetHeight: number,
  pixelRatio: number,
  backgroundColor: string
): Promise<string> {
  const rect = svg.getBoundingClientRect();
  const intrinsicW = rect.width || targetWidth;
  const intrinsicH = rect.height || targetHeight;

  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('width', String(intrinsicW));
  clone.setAttribute('height', String(intrinsicH));
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${intrinsicW} ${intrinsicH}`);
  }

  inlineTextStyles(svg, clone);

  const svgString = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('SVG rasterizer: image load failed'));
      img.src = blobUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(targetWidth * pixelRatio));
    canvas.height = Math.max(1, Math.round(targetHeight * pixelRatio));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('SVG rasterizer: 2D context unavailable');

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Center the SVG in the target rectangle if its intrinsic aspect ratio
    // differs from the requested host size — produces framed/letter-boxed
    // output instead of stretching.
    const scale = Math.min(
      canvas.width / intrinsicW,
      canvas.height / intrinsicH
    );
    const drawW = intrinsicW * scale;
    const drawH = intrinsicH * scale;
    const offsetX = (canvas.width - drawW) / 2;
    const offsetY = (canvas.height - drawH) / 2;

    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

let captureCounter = 0;

export async function renderChartToPng(
  element: ReactElement,
  {
    width,
    height,
    pixelRatio = 2,
    backgroundColor = 'white',
    maxPaintWaitMs = 600,
  }: ChartCaptureOptions
): Promise<string> {
  const captureId = ++captureCounter;
  const startedAt = nowMs();
  const log = (msg: string, extra?: unknown) => {
    if (extra !== undefined) {
      console.log(`[pptx-export][capture #${captureId}] ${msg}`, extra);
    } else {
      console.log(`[pptx-export][capture #${captureId}] ${msg}`);
    }
  };

  const host = document.createElement('div');
  host.setAttribute('data-pptx-chart-host', '');
  host.style.cssText =
    `position: absolute; left: -99999px; top: 0; ` +
    `width: ${width}px; height: ${height}px; background: ${backgroundColor};`;
  document.body.appendChild(host);

  log(`mount start width=${width} height=${height}`);

  let root: Root | null = null;
  try {
    root = createRoot(host);
    root.render(<MantineProvider>{element}</MantineProvider>);

    await waitForChartPaint(host, maxPaintWaitMs);
    await rafTick();

    const svg = host.querySelector('svg') as SVGElement | null;
    if (!svg) {
      // Dump a digestible snapshot of what *was* rendered so we can see whether
      // the component returned null/text (component-level skip) vs. a chart
      // wrapper without an SVG (measurement failure).
      const contentPreview = host.innerHTML
        .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '<style>…</style>')
        .slice(0, 800);
      const wrapperCount = host.querySelectorAll(
        '.chart-container, .recharts-responsive-container, .recharts-wrapper'
      ).length;
      const textCount = host.querySelectorAll('p').length;
      log(
        `WARN: no <svg> found (innerHTMLlen=${host.innerHTML.length} ` +
          `wrappers=${wrapperCount} paragraphs=${textCount})`
      );
      log(`WARN: host content preview:`, contentPreview);
      throw new Error('Chart did not render an SVG within the paint wait budget');
    }

    const svgRect = svg.getBoundingClientRect();
    log(`pre-capture svg=${svgRect.width}×${svgRect.height}`);

    const dataUrl = await svgToPngDataUrl(
      svg,
      width,
      height,
      pixelRatio,
      backgroundColor
    );
    const elapsed = Math.round(nowMs() - startedAt);
    log(`capture ok dataUrl.length=${dataUrl.length} elapsed=${elapsed}ms`);
    return dataUrl;
  } catch (err) {
    console.error(`[pptx-export][capture #${captureId}] failed:`, err);
    throw err;
  } finally {
    if (root) root.unmount();
    host.remove();
  }
}
