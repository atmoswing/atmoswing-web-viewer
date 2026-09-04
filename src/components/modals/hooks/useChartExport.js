/**
 * @module components/modals/hooks/useChartExport
 * @description Binds a modal's chart SVG and filename to the three export handlers ExportMenu
 * expects.
 *
 * Only the SVG lookup and the filename differ between the modals; the wiring below was
 * previously repeated in each.
 */

import {exportChartPDF, exportChartPNG, exportChartSVG} from '../common/chartExport.js';

/**
 * Builds the PNG/SVG/PDF handlers for a chart.
 *
 * Both callbacks are read at click time rather than render time, so a modal whose chart lives
 * behind a tab can point at whichever one is showing.
 *
 * @param {Object} params
 * @param {Function} params.getSVG - Returns the SVG element to export, or null
 * @param {Function} params.getBaseName - Returns the filename without extension
 * @returns {Object} Export handlers
 * @returns {Function} returns.exportSVG - Exports the chart as .svg
 * @returns {Function} returns.exportPNG - Exports the chart as .png
 * @returns {Function} returns.exportPDF - Exports the chart as .pdf
 * @example
 * const {exportPNG, exportSVG, exportPDF} = useChartExport({getSVG, getBaseName});
 * <ExportMenu t={t} onExportPNG={exportPNG} onExportSVG={exportSVG} onExportPDF={exportPDF}/>
 */
export function useChartExport({getSVG, getBaseName}) {
  return {
    exportSVG: () => exportChartSVG(getSVG(), getBaseName()),
    exportPNG: () => exportChartPNG(getSVG(), getBaseName()),
    exportPDF: () => exportChartPDF(getSVG(), getBaseName())
  };
}
