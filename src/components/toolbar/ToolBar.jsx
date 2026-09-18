/**
 * @module components/toolbar/ToolBar
 * @description Main application toolbar providing access to the forecast details modal and central navigation controls.
 */

import React, {lazy, useCallback, useState} from 'react';

import '@/styles/toolbar.css';

import FrameDistributionsIcon from '@/assets/toolbar/frame_distributions.svg?react';

import Tooltip from '@mui/material/Tooltip';
import {useTranslation} from 'react-i18next';
import ToolbarSquares from './ToolbarSquares.jsx';
import ToolbarCenter from './ToolbarCenter.jsx';
import LazyModalBoundary from '@/components/modals/common/LazyModalBoundary.jsx';
import {useModalFailureNotice} from '@/components/modals/hooks/useModalFailureNotice.js';

// Lazy loaded: it pulls in D3 and the chart components, which the toolbar itself never needs.
const ForecastDetailsModal = lazy(() => import('@/components/modals/ForecastDetailsModal.jsx'));

/**
 * ToolBar component.
 * @returns {React.ReactElement}
 */
export default function ToolBar() {
  const [detailsOpen, setDetailsOpen] = useState(false);

  // The modal's chunk is only requested once it is first opened; from then on it stays
  // mounted so that MUI's closing transition still runs.
  const [detailsLoaded, setDetailsLoaded] = useState(false);

  const openDetails = () => {
    setDetailsLoaded(true);
    setDetailsOpen(true);
  };

  const handleDetailsClose = () => {
    setDetailsOpen(false);
  };

  // A modal that fails is unmounted as well as closed. Its boundary resets when `loaded`
  // changes, so the next click mounts it afresh instead of leaving a dead boundary behind.
  const resetDetails = useCallback(() => {
    setDetailsOpen(false);
    setDetailsLoaded(false);
  }, []);
  const notifyDetailsFailure = useModalFailureNotice(resetDetails);

  const {t} = useTranslation();

  return (
    <>
      <header className="toolbar">
        <ToolbarSquares/>
        <ToolbarCenter/>
        <div className="toolbar-right">
          <Tooltip title={t('toolbar.openForecastDetails')} arrow>
            <button
              className="toolbar-icon-btn"
              onClick={openDetails}
              type="button"
              aria-label={t('toolbar.openForecastDetails')}
            ><FrameDistributionsIcon/></button>
          </Tooltip>
        </div>
      </header>
      {/* Its own boundary, so a modal that fails cannot take the app with it. */}
      <LazyModalBoundary resetKey={detailsLoaded} onFailure={notifyDetailsFailure}>
        {detailsLoaded && (
          <ForecastDetailsModal open={detailsOpen} onClose={handleDetailsClose}/>
        )}
      </LazyModalBoundary>
    </>
  );
}
