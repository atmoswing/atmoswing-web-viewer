/**
 * @module components/modals/common/ExportMenu
 * @description Small dropdown menu component offering export options (PNG, SVG, PDF).
 */

import React, {useState} from 'react';
import {Button, Menu, MenuItem} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import {useSnackbar} from '@/contexts/SnackbarContext.jsx';

/**
 * One export format offered by the menu.
 *
 * @typedef {Object} ExportFormat
 * @property {string} label - Menu entry and the format named in an error message (e.g. 'PNG')
 * @property {Function} onExport - Performs the export; may return a promise that rejects
 * @property {boolean} [disabled] - Greys the entry out when there is nothing to export, which
 *   tells the user more than a menu that closes with no file, or an error afterwards
 */

/**
 * Export button with a menu of formats.
 *
 * The formats are passed in, so each window offers what fits the view on screen: images for a
 * chart, CSV for a table.
 *
 * @param {Object} props
 * @param {Function} props.t - Translation function
 * @param {Array<ExportFormat>} props.formats - Formats to offer, in menu order
 * @param {Object} [props.sx] - MUI style overrides
 * @returns {React.ReactElement}
 * @example
 * <ExportMenu t={t} formats={[{label: 'CSV', onExport: exportCsv}]}/>
 */
export default function ExportMenu({t, formats, sx}) {
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
        {(formats || []).map(({label, onExport, disabled}) => (
          <MenuItem
            key={label}
            disabled={!!disabled}
            // A disabled entry keeps its handler in MUI; only its pointer events are off.
            onClick={() => !disabled && runExport(label, onExport)}
          >{label}</MenuItem>
        ))}
      </Menu>
    </>
  );
}
