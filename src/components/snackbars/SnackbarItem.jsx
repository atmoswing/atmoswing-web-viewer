import * as React from 'react';
import Snackbar from '@mui/material/Snackbar';

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
