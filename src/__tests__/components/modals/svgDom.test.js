/**
 * @fileoverview Tests for the SVG/DOM helpers behind chart export.
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  cloneForExport,
  EXPORT_FALLBACK_COLOR,
  downloadBlob,
  getSVGSize,
  inlineAllStyles,
  withTemporaryContainer
} from '@/components/modals/common/svgDom.js';

describe('svgDom', () => {
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

  describe('cloneForExport', () => {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    let host;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      host?.remove();
      host = null;
    });

    it('pins the clone to the colour the chart has on screen, not the page root colour', () => {
      // Dark-mode root colour (index.css) would make currentColor axes white on the white export.
      document.documentElement.style.color = 'rgb(255, 255, 255)';
      host = document.createElement('div');
      host.style.color = 'rgb(10, 20, 30)';
      const svg = document.createElementNS(SVG_NS, 'svg');
      const domain = document.createElementNS(SVG_NS, 'path');
      domain.setAttribute('stroke', 'currentColor');
      svg.appendChild(domain);
      host.appendChild(svg);
      document.body.appendChild(host);

      const clone = cloneForExport(svg);
      expect(clone.style.color).toBe('rgb(10, 20, 30)');

      // Measured off-screen under <body>, the clone keeps the on-screen colour.
      withTemporaryContainer(clone, () => {
        expect(getComputedStyle(clone).color).toBe('rgb(10, 20, 30)');
      });
      document.documentElement.style.color = '';
    });

    it('falls back to a dark colour when the source is not in the document', () => {
      const svg = document.createElementNS(SVG_NS, 'svg');
      const clone = cloneForExport(svg);
      expect(clone.getAttribute('xmlns')).toBe(SVG_NS);
      expect(clone.style.color).toBe(EXPORT_FALLBACK_COLOR);
    });
  });
});
