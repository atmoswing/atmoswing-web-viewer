/**
 * @module contexts/ForecastDetailsContext
 * @description Opens the forecast details window from anywhere in the app, optionally on a given
 * method, configuration, entity and lead. The provider owns the window: its open state, its lazy
 * loading and the boundary that keeps a failure from taking the app down.
 */

import React, {createContext, lazy, useCallback, useContext, useMemo, useState} from 'react';
import LazyModalBoundary from '@/components/modals/common/LazyModalBoundary.jsx';
import {useModalFailureNotice} from '@/components/modals/hooks/useModalFailureNotice.js';

// Lazy loaded: it pulls in D3 and the chart components, which the initial page never needs.
const ForecastDetailsModal = lazy(() => import('@/components/modals/ForecastDetailsModal.jsx'));

const ForecastDetailsContext = createContext({openForecastDetails: () => {}});

/**
 * Selection to open the window on. Every field is optional; a missing one is taken from the app
 * or picked by the window, and a given configuration is kept rather than following the entity.
 *
 * @typedef {Object} ForecastDetailsSelection
 * @property {string|number} [methodId] - Method identifier
 * @property {string|number} [configId] - Configuration identifier
 * @property {string|number} [entityId] - Entity identifier
 * @property {number} [lead] - Lead time in hours
 */

/**
 * Provides `openForecastDetails` and renders the forecast details window.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Components that may open the window
 * @returns {React.ReactElement}
 */
export function ForecastDetailsProvider({children}) {
  const [open, setOpen] = useState(false);
  // One object per opening, so the window re-seeds even when asked again while open.
  const [request, setRequest] = useState(null);
  // The chunk is only requested on first opening; from then on the window stays mounted so that
  // MUI's closing transition still runs.
  const [loaded, setLoaded] = useState(false);

  const openForecastDetails = useCallback((selection = null) => {
    setRequest({selection});
    setLoaded(true);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  // A window that fails is unmounted as well as closed. The boundary resets when `loaded`
  // changes, so the next opening mounts it afresh instead of leaving a dead boundary behind.
  const reset = useCallback(() => {
    setOpen(false);
    setLoaded(false);
  }, []);
  const notifyFailure = useModalFailureNotice(reset);

  const value = useMemo(() => ({openForecastDetails}), [openForecastDetails]);

  return (
    <ForecastDetailsContext.Provider value={value}>
      {children}
      <LazyModalBoundary resetKey={loaded} onFailure={notifyFailure}>
        {loaded && <ForecastDetailsModal open={open} onClose={close} request={request}/>}
      </LazyModalBoundary>
    </ForecastDetailsContext.Provider>
  );
}

/**
 * Hook to open the forecast details window.
 *
 * @returns {Object} Context value
 * @returns {Function} returns.openForecastDetails - `(selection?: ForecastDetailsSelection) => void`
 * @example
 * const {openForecastDetails} = useForecastDetails();
 * openForecastDetails();                                        // the app's current selection
 * openForecastDetails({methodId, configId, entityId, lead: 24}); // a given forecast
 */
export function useForecastDetails() {
  return useContext(ForecastDetailsContext);
}
