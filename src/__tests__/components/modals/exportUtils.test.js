/**
 * @fileoverview Tests for exportUtils functions
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  downloadBlob,
  exportChartPDF,
  exportChartPNG,
  exportChartSVG,
  formatExportDatePart,
  getSVGSize,
  inlineAllStyles,
  safeForFilename,
  withTemporaryContainer,
} from '@/components/modals/common/exportUtils.js';

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

describe('exportUtils', () => {
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

  describe('downloadBlob', () => {
    let mockLink;
    let originalCreateObjectURL;
    let originalRevokeObjectURL;

    beforeEach(() => {
      mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn(),
      };

      vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {
      });

      // Mock URL methods properly
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn(() => 'blob:test-url');
      URL.revokeObjectURL = vi.fn();

      vi.useFakeTimers();
    });

    afterEach(() => {
      // Restore URL methods
      if (originalCreateObjectURL) URL.createObjectURL = originalCreateObjectURL;
      if (originalRevokeObjectURL) URL.revokeObjectURL = originalRevokeObjectURL;

      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('creates download link and triggers click', () => {
      const blob = new Blob(['test'], {type: 'text/plain'});
      downloadBlob(blob, 'test.txt');

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('blob:test-url');
      expect(mockLink.download).toBe('test.txt');
      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.remove).toHaveBeenCalled();
    });

    it('revokes object URL after timeout', () => {
      const blob = new Blob(['test'], {type: 'text/plain'});
      downloadBlob(blob, 'test.txt');

      expect(URL.revokeObjectURL).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });
  });

  describe('inlineAllStyles', () => {
    it('inlines computed styles into SVG elements', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      svg.appendChild(rect);

      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        getPropertyValue: (prop) => {
          if (prop === 'fill') return 'rgb(255, 0, 0)';
          if (prop === 'stroke') return 'rgb(0, 0, 0)';
          return '';
        },
      });

      inlineAllStyles(svg);

      const svgStyle = svg.getAttribute('style');
      const rectStyle = rect.getAttribute('style');

      expect(svgStyle).toContain('fill:rgb(255, 0, 0)');
      expect(rectStyle).toContain('fill:rgb(255, 0, 0)');
    });

    it('preserves existing inline styles', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('style', 'opacity:0.5;');

      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        getPropertyValue: (prop) => (prop === 'fill' ? 'red' : ''),
      });

      inlineAllStyles(svg);

      const style = svg.getAttribute('style');
      expect(style).toContain('opacity:0.5;');
      expect(style).toContain('fill:red');
    });

    it('handles elements without computed styles gracefully', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

      vi.spyOn(window, 'getComputedStyle').mockImplementation(() => {
        throw new Error('No computed style');
      });

      expect(() => inlineAllStyles(svg)).not.toThrow();
    });
  });

  describe('getSVGSize', () => {
    it('returns size from width and height attributes', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '800');
      svg.setAttribute('height', '600');

      const size = getSVGSize(svg);
      expect(size).toEqual({width: 800, height: 600});
    });

    it('falls back to viewBox when width/height not present', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 1024 768');

      const size = getSVGSize(svg);
      expect(size).toEqual({width: 1024, height: 768});
    });

    it('falls back to clientWidth/clientHeight', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      Object.defineProperty(svg, 'clientWidth', {value: 640, configurable: true});
      Object.defineProperty(svg, 'clientHeight', {value: 480, configurable: true});

      const size = getSVGSize(svg);
      expect(size).toEqual({width: 640, height: 480});
    });

    it('returns default size when no dimensions available', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

      const size = getSVGSize(svg);
      expect(size).toEqual({width: 800, height: 600});
    });
  });

  describe('withTemporaryContainer', () => {
    it('mounts node temporarily and executes callback', () => {
      const node = document.createElement('div');
      const callback = vi.fn(() => 'result');

      const result = withTemporaryContainer(node, callback);

      expect(callback).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('positions container off-screen', () => {
      const node = document.createElement('div');
      let containerStyle;

      withTemporaryContainer(node, () => {
        containerStyle = node.parentElement.style;
      });

      expect(containerStyle.position).toBe('fixed');
      expect(containerStyle.left).toBe('-9999px');
    });

    it('cleans up container after callback', () => {
      const node = document.createElement('div');
      let parent;

      withTemporaryContainer(node, () => {
        parent = node.parentElement;
      });

      expect(document.body.contains(parent)).toBe(false);
    });

    it('returns callback result', () => {
      const node = document.createElement('div');
      const result = withTemporaryContainer(node, () => 42);

      expect(result).toBe(42);
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

    it('exportChartPDF unmounts its container when rendering throws', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      });
      svg2pdfSpy.mockRejectedValueOnce(new Error('render failed'));
      const svg = makeSVG();
      const before = document.body.childElementCount;

      await exportChartPDF(svg, 'my-chart');

      expect(document.body.childElementCount).toBe(before);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
