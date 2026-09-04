/**
 * @module components/modals/common/ExportMenu
 * @description Small dropdown menu component offering export options (PNG, SVG, PDF).
 */

import React, {useState} from 'react';
import {Button, Menu, MenuItem} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import {useSnackbar} from '@/contexts/SnackbarContext.jsx';

/**
 * ExportMenu component.
 * @param {Object} props
 * @param {Function} props.t - Translation function
 * @param {Function} props.onExportPNG - Handler to export PNG
 * @param {Function} props.onExportSVG - Handler to export SVG
 * @param {Function} props.onExportPDF - Handler to export PDF
 * @param {Object} [props.sx] - MUI style overrides
 */
export default function ExportMenu({t, onExportPNG, onExportSVG, onExportPDF, sx}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const {enqueueSnackbar} = useSnackbar();
  const open = Boolean(anchorEl);
  const openMenu = (e) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  // The exporters reject on failure. Without this the menu would just close and nothing
  // would happen, leaving the user with no idea the export did not produce a file.
  const runExport = async (format, handler) => {
    closeMenu();
    try {
      await handler?.();
    } catch (e) {
      enqueueSnackbar(t('seriesModal.exportFailed', {format, error: e?.message || String(e)}), {
        variant: 'error'
      });
    }
  };

  const doPNG = () => runExport('PNG', onExportPNG);
  const doSVG = () => runExport('SVG', onExportSVG);
  const doPDF = () => runExport('PDF', onExportPDF);

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<FileDownloadIcon/>}
        onClick={openMenu}
        aria-controls={open ? 'forecast-series-export' : undefined}
        aria-haspopup="true"
        sx={sx}
      >
        {t('seriesModal.export')}
      </Button>
      <Menu
        id="forecast-series-export"
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
      >
        <MenuItem onClick={doPNG}>PNG</MenuItem>
        <MenuItem onClick={doSVG}>SVG</MenuItem>
        <MenuItem onClick={doPDF}>PDF</MenuItem>
      </Menu>
    </>
  );
}
