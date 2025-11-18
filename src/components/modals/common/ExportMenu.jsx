/**
 * @module components/modals/common/ExportMenu
 * @description Small dropdown menu component offering export options (PNG, SVG, PDF).
 */

import React from 'react';
import {Button, Menu, MenuItem} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PropTypes from 'prop-types';

export default function ExportMenu({t, onExportPNG, onExportSVG, onExportPDF, sx}) {
  /**
   * ExportMenu component.
   * @param {Object} props
   * @param {Function} props.t - Translation function
   * @param {Function} props.onExportPNG - Handler to export PNG
   * @param {Function} props.onExportSVG - Handler to export SVG
   * @param {Function} props.onExportPDF - Handler to export PDF
   * @param {Object} [props.sx] - MUI style overrides
   */

  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const openMenu = (e) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const doPNG = () => {
    closeMenu();
    onExportPNG?.();
  };
  const doSVG = () => {
    closeMenu();
    onExportSVG?.();
  };
  const doPDF = () => {
    closeMenu();
    onExportPDF?.();
  };

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

ExportMenu.propTypes = {
  t: PropTypes.func.isRequired,
  onExportPNG: PropTypes.func.isRequired,
  onExportSVG: PropTypes.func.isRequired,
  onExportPDF: PropTypes.func.isRequired,
  sx: PropTypes.object,
};
