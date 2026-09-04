/**
 * @module components/modals/common/exportUtils
 * @description Chart export helpers: safe filename generation, SVG style inlining, dimension
 * extraction, temporary DOM mounting, and the SVG/PNG/PDF exporters shared by the chart modals.
 *
 * The exporters reject rather than logging and returning: a failed export has to reach the
 * user, and only the calling component can show a snackbar. They still unmount any temporary
 * container and revoke any object URL on the way out.
 */

import {parseForecastDate} from '@/utils/forecastDateUtils.js';

/**
 * Sanitize a string for safe use as a filename (drops/normalizes problematic characters)
 * @param {string} s - Input string
 * @returns {string} Sanitized filename-friendly string
 */
export function safeForFilename(s) {
  if (!s) return 'unknown';
  let out = String(s)
    .normalize('NFKD')
    .replace(' - ', '_')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
  out = Array.from(out).map(ch => (ch.charCodeAt(0) < 32 ? '_' : ch)).join('');
  return out.replace(/^_+|_+$/g, '');
}

/**
 * Trigger a download of a Blob with the given filename
 * @param {Blob} blob - Data blob
 * @param {string} filename - Filename to save
 * @returns {void}
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Inline computed style properties into all nodes of a given SVG element.
 * Helpful to preserve appearance when exporting SVG/PNG/PDF without external CSS.
 * @param {SVGElement} svg - Root SVG element to inline styles into
 * @returns {void}
 */
export function inlineAllStyles(svg) {
  const recurse = (el) => {
    if (!(el instanceof Element)) return;
    try {
      const cs = getComputedStyle(el);
      const styleProps = [
        'fill', 'stroke', 'stroke-width', 'stroke-opacity', 'fill-opacity', 'font-size', 'font-family', 'font-weight', 'opacity', 'text-anchor', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'background', 'background-color'
      ];
      let inline = '';
      styleProps.forEach(p => {
        const v = cs.getPropertyValue(p);
        if (v) inline += `${p}:${v};`;
      });
      if (inline) {
        const prev = el.getAttribute('style') || '';
        el.setAttribute('style', prev + inline);
      }
    } catch { /* ignore style computation failures */
    }
    for (let i = 0; i < el.children.length; i++) recurse(el.children[i]);
  };
  recurse(svg);
}

/**
 * Determine pixel size of an SVG element using width/height or viewBox fallback.
 * @param {SVGElement} svg - SVG element
 * @returns {{width:number,height:number}} Dimensions object
 */
export function getSVGSize(svg) {
  const widthAttr = svg.getAttribute('width');
  const heightAttr = svg.getAttribute('height');
  const viewBoxAttr = svg.getAttribute('viewBox');
  if (widthAttr && heightAttr) {
    const w = parseFloat(widthAttr);
    const h = parseFloat(heightAttr);
    if (Number.isFinite(w) && Number.isFinite(h)) return {width: w, height: h};
  }
  if (viewBoxAttr) {
    const parts = viewBoxAttr.split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) return {width: parts[2], height: parts[3]};
  }
  return {width: svg.clientWidth || 800, height: svg.clientHeight || 600};
}

/**
 * Temporarily mount a node (e.g., cloned SVG) in a hidden container in the DOM
 * to allow layout/style computations, then run a callback and cleanup.
 * @param {Node} node - DOM node to mount temporarily
 * @param {Function} cb - Callback executed while node is mounted
 * @returns {*} Return value of callback
 */
export function withTemporaryContainer(node, cb) {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '0';
  container.style.height = '0';
  container.appendChild(node);
  document.body.appendChild(container);
  try {
    try {
      inlineAllStyles(node);
    } catch { /* ignore */
    }
    return cb && cb();
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Clones an SVG element and tags it with the SVG namespace, ready for serialization.
 * @private
 * @param {SVGElement} svg - Source SVG element
 * @returns {SVGElement} Detached clone
 */
function cloneForExport(svg) {
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return clone;
}

/**
 * Formats a forecast date as the YYYY-MM-DD prefix used in export filenames.
 * Accepts the application's forecast date format first, then any Date-parseable string.
 *
 * @param {string|null} forecastDate - Raw forecast date
 * @returns {string} Formatted date, or an empty string when it cannot be parsed
 * @example
 * formatExportDatePart('2025-11-05T00:00:00') // Returns: "2025-11-05"
 */
export function formatExportDatePart(forecastDate) {
  if (!forecastDate) return '';
  try {
    const d = parseForecastDate(forecastDate) || new Date(forecastDate);
    if (!d || isNaN(d)) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch {
    return '';
  }
}

/**
 * Exports an SVG element as a downloadable .svg file.
 *
 * @param {SVGElement|null} svg - Chart SVG to export; no-op when null
 * @param {string} baseName - Filename without extension
 * @returns {void}
 * @throws {Error} When serialization or the download fails
 */
export function exportChartSVG(svg, baseName) {
  if (!svg) return;
  const clone = cloneForExport(svg);
  const serializer = new XMLSerializer();
  withTemporaryContainer(clone, () => {
    const svgStr = serializer.serializeToString(clone);
    const blob = new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'});
    downloadBlob(blob, `${baseName}.svg`);
  });
}

/**
 * Rasterizes an SVG element and exports it as a downloadable .png file.
 *
 * @param {SVGElement|null} svg - Chart SVG to export; no-op when null
 * @param {string} baseName - Filename without extension
 * @param {Object} [options] - Rasterization options
 * @param {number} [options.scale=3] - Pixel scale factor applied to the SVG dimensions
 * @param {string} [options.background='#ffffff'] - Canvas background colour
 * @returns {Promise<void>}
 * @throws {Error} When the SVG cannot be rasterized
 */
export async function exportChartPNG(svg, baseName, options = {}) {
  if (!svg) return;
  const {scale = 3, background = '#ffffff'} = options;
  const clone = cloneForExport(svg);
  const {width, height} = getSVGSize(clone);
  const serializer = new XMLSerializer();
  let svgStr;
  withTemporaryContainer(clone, () => {
    svgStr = serializer.serializeToString(clone);
  });
  const url = URL.createObjectURL(new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'}));
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    downloadBlob(blob, `${baseName}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Exports an SVG element as a vector .pdf file, loading jsPDF and svg2pdf on demand
 * so they stay out of the initial bundle.
 *
 * @param {SVGElement|null} svg - Chart SVG to export; no-op when null
 * @param {string} baseName - Filename without extension
 * @returns {Promise<void>}
 * @throws {Error} When the PDF libraries cannot be loaded or rendering fails
 */
export async function exportChartPDF(svg, baseName) {
  if (!svg) return;
  let jsPDFLib, svg2pdfModule;
  try {
    jsPDFLib = await import('jspdf');
    svg2pdfModule = await import('svg2pdf.js');
  } catch (e) {
    throw new Error(`Failed to load the PDF libraries: ${e?.message || e}`, {cause: e});
  }
  const jsPDF = jsPDFLib.jsPDF || jsPDFLib.default || jsPDFLib;
  const svg2pdf = svg2pdfModule.svg2pdf || svg2pdfModule.default || svg2pdfModule;
  if (!jsPDF || !svg2pdf) {
    throw new Error('PDF libraries did not provide the expected exports');
  }

  const clone = cloneForExport(svg);
  // Mounted by hand rather than via withTemporaryContainer: the node has to stay in the
  // document for the whole async svg2pdf call, which the synchronous helper cannot span.
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.appendChild(clone);
  document.body.appendChild(container);
  try {
    try {
      inlineAllStyles(clone);
    } catch { /* export without inlined styles rather than failing */
    }
    let {width: svgW, height: svgH} = getSVGSize(clone);
    try {
      const bbox = clone.getBBox();
      if (bbox && Number.isFinite(bbox.width) && Number.isFinite(bbox.height) && bbox.width > 0 && bbox.height > 0) {
        const pad = 2;
        svgW = bbox.width + pad * 2;
        svgH = bbox.height + pad * 2;
        clone.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${svgW} ${svgH}`);
      } else {
        clone.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
      }
    } catch {
      clone.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
    }
    const pdfWidth = Math.round(svgW);
    const pdfHeight = Math.round(svgH);
    clone.setAttribute('width', String(pdfWidth));
    clone.setAttribute('height', String(pdfHeight));
    const pdf = new jsPDF({
      unit: 'px',
      format: [pdfWidth, pdfHeight],
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait'
    });
    await svg2pdf(clone, pdf, {x: 0, y: 0, width: pdfWidth, height: pdfHeight});
    pdf.save(`${baseName}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
