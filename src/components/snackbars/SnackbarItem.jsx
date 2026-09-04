/**
 * @module components/snackbars/SnackbarItem
 * @description Wrapper around MUI Snackbar with configurable origin and auto-hide.
 */

import * as React from 'react';
import Snackbar from '@mui/material/Snackbar';

/**
 * SnackbarItem component.
 * @param {Object} props
 * @param {{vertical:string,horizontal:string}} [props.anchorOrigin] - Position
 * @param {boolean} props.open - Whether snackbar is visible
 * @param {Function} props.onClose - Close callback
 * @param {number} [props.autoHideDuration] - Auto hide ms
 * @param {string|React.ReactNode} props.message - Snackbar content
 */
export function SnackbarItem({anchorOrigin, open, onClose, autoHideDuration, message}) {
  return (
    <Snackbar
      anchorOrigin={anchorOrigin || {vertical: 'bottom', horizontal: 'left'}}
      open={open}
      onClose={onClose}
      autoHideDuration={autoHideDuration || 6000}
      message={message}
    />
  );
}
