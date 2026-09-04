/**
 * @fileoverview Tests for the chart exporters and their filename helpers
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  exportChartPDF,
  exportChartPNG,
  exportChartSVG,
  formatExportDatePart,
  safeForFilename
} from '@/components/modals/common/chartExport.js';

// jsPDF really does write a file when save() is called, even under jsdom, so both PDF
// libraries are mocked out here.
const savePdf = vi.fn();
const svg2pdfSpy = vi.fn().mockResolvedValue(undefined);

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(function jsPDF() {
    return {save: savePdf};
  })
}));

vi.mock('svg2pdf.js', () => ({
  svg2pdf: (...args) => svg2pdfSpy(...args)
}));

describe('chartExport', () => {
  describe('safeForFilename', () => {
    it('returns "unknown" for empty input', () => {
      expect(safeForFilename('')).toBe('unknown');
      expect(safeForFilename(null)).toBe('unknown');
      expect(safeForFilename(undefined)).toBe('unknown');
    });

    it('replaces problematic characters with underscores', () => {
      expect(safeForFilename('file<name>test')).toBe('file_name_test');
      expect(safeForFilename('file:name|test')).toBe('file_name_test');
      expect(safeForFilename('file/name\\test')).toBe('file_name_test');
      expect(safeForFilename('file"name*test')).toBe('file_name_test');
      expect(safeForFilename('file?name')).toBe('file_name');
    });

    it('replaces spaces with underscores', () => {
      expect(safeForFilename('file name test')).toBe('file_name_test');
      expect(safeForFilename('file  name  test')).toBe('file_name_test');
    });

    it('replaces " - " with single underscore', () => {
      expect(safeForFilename('Station 1 - Method A')).toBe('Station_1_Method_A');
    });

    it('removes leading and trailing underscores', () => {
      expect(safeForFilename('_filename_')).toBe('filename');
      expect(safeForFilename('___file___')).toBe('file');
    });

    it('handles unicode normalization', () => {
      expect(safeForFilename('café')).toContain('cafe');
    });

    it('collapses multiple underscores into one', () => {
      expect(safeForFilename('file___name')).toBe('file_name');
    });
  });

  describe('formatExportDatePart', () => {
    it('formats a forecast date as YYYY-MM-DD', () => {
      expect(formatExportDatePart('2025-11-05T06:00:00')).toBe('2025-11-05');
    });

    it('zero-pads month and day', () => {
      expect(formatExportDatePart('2025-01-02T00:00:00')).toBe('2025-01-02');
    });

    it('returns an empty string for missing or unparseable input', () => {
      expect(formatExportDatePart(null)).toBe('');
      expect(formatExportDatePart('')).toBe('');
      expect(formatExportDatePart('not-a-date')).toBe('');
    });
  });

  describe('chart exporters', () => {
    // jsdom provides no object-URL support, and every exporter goes through it to hand the
    // finished file to the browser.
    let originalCreateObjectURL;
    let originalRevokeObjectURL;

    beforeEach(() => {
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn(() => 'blob:test-url');
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    function makeSVG() {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '200');
      svg.setAttribute('height', '100');
      document.body.appendChild(svg);
      return svg;
    }

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('exportChartSVG downloads a .svg named after the base name', () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      });
      let anchor = null;
      const appendSpy = vi.spyOn(document.body, 'appendChild');

      exportChartSVG(makeSVG(), 'my-chart');

      anchor = appendSpy.mock.calls.map(c => c[0]).find(n => n.tagName === 'A');
      expect(anchor).toBeTruthy();
      expect(anchor.download).toBe('my-chart.svg');
      expect(clickSpy).toHaveBeenCalled();
    });

    it('exportChartSVG is a no-op without an SVG', () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      });
      exportChartSVG(null, 'my-chart');
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('exportChartPNG is a no-op without an SVG', async () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      });
      await exportChartPNG(null, 'my-chart');
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('exportChartPDF is a no-op without an SVG', async () => {
      await expect(exportChartPDF(null, 'my-chart')).resolves.toBeUndefined();
    });

    it('exportChartPDF saves under the base name and unmounts its container', async () => {
      const svg = makeSVG();
      const before = document.body.childElementCount;

      await exportChartPDF(svg, 'my-chart');

      expect(savePdf).toHaveBeenCalledWith('my-chart.pdf');
      expect(svg2pdfSpy).toHaveBeenCalled();
      expect(document.body.childElementCount).toBe(before);
    });

    it('exportChartPDF rejects and unmounts its container when rendering throws', async () => {
      svg2pdfSpy.mockRejectedValueOnce(new Error('render failed'));
      const svg = makeSVG();
      const before = document.body.childElementCount;

      // The caller needs the rejection to show a snackbar; swallowing it here would make
      // a failed export indistinguishable from a successful one.
      await expect(exportChartPDF(svg, 'my-chart')).rejects.toThrow('render failed');

      expect(document.body.childElementCount).toBe(before);
    });
  });
});
