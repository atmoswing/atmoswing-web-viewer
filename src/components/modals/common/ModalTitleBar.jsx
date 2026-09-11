/**
 * @module components/modals/common/ModalTitleBar
 * @description Title row shared by the modals: the title, optional actions beside it, and a
 * close button pinned to the top-right corner.
 */

import React from 'react';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Renders a modal's title bar.
 *
 * The close label is passed in already translated, so the bar does not depend on which
 * translation namespace the modal uses.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.title - Title text
 * @param {Function} props.onClose - Called when the close button is clicked
 * @param {string} props.closeLabel - Accessible label for the close button
 * @param {React.ReactNode} [props.children] - Actions shown after the title, such as an export menu
 * @returns {React.ReactElement}
 * @example
 * <ModalTitleBar title={stationName} onClose={handleClose} closeLabel={t('seriesModal.close')}>
 *   <ExportMenu t={t} onExportPNG={exportPNG} onExportSVG={exportSVG} onExportPDF={exportPDF}/>
 * </ModalTitleBar>
 */
export default function ModalTitleBar({title, onClose, closeLabel, children}) {
  return (
    <DialogTitle sx={{pr: 5}}>
      {title}
      {children}
      <IconButton
        aria-label={closeLabel}
        onClick={onClose}
        size="small"
        sx={{position: 'absolute', right: 8, top: 8}}
      >
        <CloseIcon fontSize="small"/>
      </IconButton>
    </DialogTitle>
  );
}
