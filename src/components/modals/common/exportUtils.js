/**
 * Sanitize a string for safe use as a filename (drops/normalizes problematic characters)
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

