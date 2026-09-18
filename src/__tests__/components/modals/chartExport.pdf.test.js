/**
 * @fileoverview Runs exportChartPDF against the real jsPDF and svg2pdf.js.
 *
 * chartExport.test.js mocks both libraries, so on its own it cannot notice a library upgrade
 * that breaks the integration. This file keeps them real and only intercepts the final
 * download, then checks the structure of the PDF that would have been saved.
 */

import {afterEach, describe, expect, it, vi} from 'vitest';

// Real jsPDF, except each document's save() records the output instead of downloading it.
vi.mock('jspdf', async importOriginal => {
  const real = await importOriginal();
  const Real = real.jsPDF || real.default;

  function Capturing(...args) {
    const doc = new Real(...args);
    doc.save = name => {
      globalThis.__savedPdf = {name, bytes: doc.output()};
    };
    return doc;
  }

  Object.setPrototypeOf(Capturing, Real); // statics still resolve to the real class
  Capturing.prototype = Real.prototype;
  return {...real, jsPDF: Capturing, default: Capturing};
});

// svg2pdf.js 2.8.1 declares "type": "module" but its `main` is a UMD file, which Node then
// fails to load. Vite bundles the ES build for the browser (its `module`/`browser` entry), so
// load that same file here.
vi.mock('svg2pdf.js', async () => await import('svg2pdf.js/dist/svg2pdf.es.min.js'));

import {exportChartPDF} from '@/components/modals/common/chartExport.js';

const NS = 'http://www.w3.org/2000/svg';

// jsdom has no SVG layout; svg2pdf only needs a box back to proceed.
if (!window.SVGElement.prototype.getBBox) {
  window.SVGElement.prototype.getBBox = () => ({x: 0, y: 0, width: 0, height: 0});
}

/** A small SVG with the kinds of elements the charts draw. */
function chartLikeSvg() {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '640');
  svg.setAttribute('height', '360');
  const add = (tag, attrs, text) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (text) el.textContent = text;
    svg.appendChild(el);
  };
  add('rect', {x: 0, y: 0, width: 640, height: 360, fill: '#ffffff'});
  add('line', {x1: 56, y1: 300, x2: 600, y2: 300, stroke: '#333', 'stroke-width': 1});
  add('path', {d: 'M56,280 L150,200 L300,150 L450,90 L600,60', fill: 'none', stroke: '#1f77b4', 'stroke-width': 2});
  add('circle', {cx: 300, cy: 150, r: 3, fill: '#1f77b4'});
  add('text', {x: 320, y: 20, 'font-size': 14}, 'Sion - m1/c1');
  document.body.appendChild(svg);
  return svg;
}

describe('exportChartPDF with the real PDF libraries', () => {
  afterEach(() => {
    delete globalThis.__savedPdf;
    document.body.innerHTML = '';
  });

  it('saves a one-page PDF under the requested name', async () => {
    await exportChartPDF(chartLikeSvg(), 'chart');

    expect(globalThis.__savedPdf?.name).toBe('chart.pdf');
    const pdf = String(globalThis.__savedPdf.bytes);
    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(pdf.match(/\/Type\s*\/Page(?!s)/g)).toHaveLength(1);
  });

  it('sizes the page to the chart', async () => {
    await exportChartPDF(chartLikeSvg(), 'chart');

    const box = String(globalThis.__savedPdf.bytes).match(/\/MediaBox\s*\[([^\]]+)\]/)[1]
      .trim().split(/\s+/).map(Number).map(Math.round);
    // jsPDF's 'px' unit maps 640x360 px to 853x480 pt.
    expect(box).toEqual([0, 0, 853, 480]);
  });

  it('draws the chart shapes and text', async () => {
    await exportChartPDF(chartLikeSvg(), 'chart');

    const pdf = String(globalThis.__savedPdf.bytes);
    expect(pdf).toMatch(/\b[mlc]\b/); // path construction
    expect(pdf).toMatch(/\bS\b/); // stroke
    expect(pdf).toMatch(/\bf\*?\b/); // fill
    expect(pdf).toMatch(/\bBT\b[\s\S]*\bT[jJ]\b[\s\S]*\bET\b/); // a text object
    expect(pdf).toContain('Sion');
  });
});
