/**
 * @fileoverview Tests for the shared chart export handlers.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';

const {exportChartSVG, exportChartPNG, exportChartPDF} = vi.hoisted(() => ({
  exportChartSVG: vi.fn(),
  exportChartPNG: vi.fn(),
  exportChartPDF: vi.fn()
}));

vi.mock('@/components/modals/common/chartExport.js', () => ({
  exportChartSVG,
  exportChartPNG,
  exportChartPDF
}));

import {useChartExport} from '@/components/modals/hooks/useChartExport.js';

describe('useChartExport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes the current SVG and filename to each exporter', () => {
    const svg = {tagName: 'svg'};
    const {result} = renderHook(() => useChartExport({
      getSVG: () => svg,
      getBaseName: () => 'chart-name'
    }));

    result.current.exportSVG();
    result.current.exportPNG();
    result.current.exportPDF();

    expect(exportChartSVG).toHaveBeenCalledWith(svg, 'chart-name');
    expect(exportChartPNG).toHaveBeenCalledWith(svg, 'chart-name');
    expect(exportChartPDF).toHaveBeenCalledWith(svg, 'chart-name');
  });

  it('reads the SVG at click time, not at render time', () => {
    // The distributions modal exports whichever tab is showing, so the lookup has to run
    // when the menu item is clicked rather than when the hook was called.
    let current = 'first';
    const {result} = renderHook(() => useChartExport({
      getSVG: () => current,
      getBaseName: () => 'name'
    }));

    current = 'second';
    result.current.exportPNG();

    expect(exportChartPNG).toHaveBeenCalledWith('second', 'name');
  });

  it('forwards a null SVG so the exporter can no-op', () => {
    const {result} = renderHook(() => useChartExport({
      getSVG: () => null,
      getBaseName: () => 'name'
    }));

    result.current.exportSVG();

    expect(exportChartSVG).toHaveBeenCalledWith(null, 'name');
  });

  it('does not swallow a rejected export', async () => {
    // ExportMenu catches these to raise a snackbar; the hook must not absorb them first.
    exportChartPDF.mockRejectedValueOnce(new Error('render failed'));
    const {result} = renderHook(() => useChartExport({
      getSVG: () => ({}),
      getBaseName: () => 'name'
    }));

    await expect(result.current.exportPDF()).rejects.toThrow('render failed');
  });
});
