/**
 * @fileoverview Tests for exportUtils functions
 */

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {
  safeForFilename,
  downloadBlob,
  inlineAllStyles,
  getSVGSize,
  withTemporaryContainer,
} from '@/components/modals/common/exportUtils.js';

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
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});

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
});

