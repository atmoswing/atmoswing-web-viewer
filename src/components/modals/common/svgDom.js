/**
 * @module components/modals/common/svgDom
 * @description DOM plumbing the chart exporters need: cloning an SVG, inlining its computed
 * styles, measuring it, mounting it off-screen and handing a blob to the browser.
 *
 * Nothing here knows about charts; it is the part of exporting that is just DOM work.
 */

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
 * @param {SVGElement} svg - Source SVG element
 * @returns {SVGElement} Detached clone
 */
export function cloneForExport(svg) {
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return clone;
}
