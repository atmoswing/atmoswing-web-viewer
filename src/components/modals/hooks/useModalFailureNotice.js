/**
 * @module components/modals/hooks/useModalFailureNotice
 * @description Tells the user a modal could not be shown, for use as a `LazyModalBoundary`
 * `onFailure` handler.
 */

import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {useSnackbar} from '@/contexts/SnackbarContext.jsx';

/**
 * Returns a failure handler that shows an error snackbar.
 *
 * A chunk still missing after the automatic reload means the page is out of date, which only
 * reloading fixes, so that case asks for a reload rather than reporting a generic failure.
 *
 * @param {Function} [onClose] - Called first, to reset whatever state opened the modal
 * @returns {Function} `(error, {stale}) => void`
 * @example
 * const notifyFailure = useModalFailureNotice(() => setOpen(false));
 * <LazyModalBoundary onFailure={notifyFailure}>...</LazyModalBoundary>
 */
export function useModalFailureNotice(onClose) {
  const {t} = useTranslation();
  const {enqueueSnackbar} = useSnackbar();

  return useCallback((error, {stale} = {}) => {
    onClose?.();
    enqueueSnackbar(t(stale ? 'errors.pageOutdated' : 'errors.modalFailed'), {variant: 'error'});
  }, [onClose, enqueueSnackbar, t]);
}
