/**
 * @module components/toolbar/ToolBar
 * @description Main application toolbar providing access to distribution and analog details modals and central navigation controls.
 */

import React, {Suspense, lazy, useState} from 'react';

import '@/styles/toolbar.css';

import FrameDistributionsIcon from '@/assets/toolbar/frame_distributions.svg?react';
import FrameAnalogsIcon from '@/assets/toolbar/frame_analogs.svg?react';

import Tooltip from '@mui/material/Tooltip';
import {useTranslation} from 'react-i18next';
import ToolbarSquares from './ToolbarSquares.jsx';
import ToolbarCenter from './ToolbarCenter.jsx';

// Lazy loaded: both pull in D3 and their chart components, which the toolbar itself never needs.
const DetailsAnalogsModal = lazy(() => import('@/components/modals/DetailsAnalogsModal.jsx'));
const DistributionsModal = lazy(() => import('@/components/modals/DistributionsModal.jsx'));

/**
 * ToolBar component.
 * @returns {React.ReactElement}
 */
export default function ToolBar() {
  const [detailsAnalogsModalOpen, setDetailsAnalogsModalOpen] = useState(false);
  const [distributionsModalOpen, setDistributionsModalOpen] = useState(false);

  // Each modal's chunk is only requested once it is first opened; from then on it stays
  // mounted so that MUI's closing transition still runs.
  const [detailsAnalogsLoaded, setDetailsAnalogsLoaded] = useState(false);
  const [distributionsLoaded, setDistributionsLoaded] = useState(false);

  const openDetailsAnalogsModal = () => {
    setDetailsAnalogsLoaded(true);
    setDetailsAnalogsModalOpen(true);
  };

  const openDistributionsModal = () => {
    setDistributionsLoaded(true);
    setDistributionsModalOpen(true);
  };

  const handleDetailsAnalogsModalClose = () => {
    setDetailsAnalogsModalOpen(false);
  };

  const handleDistributionsModalClose = () => {
    setDistributionsModalOpen(false);
  };

  const {t} = useTranslation();

  return (
    <>
      <header className="toolbar">
        <ToolbarSquares/>
        <ToolbarCenter/>
        <div className="toolbar-right">
          <Tooltip title={t('toolbar.openDistributions', {defaultValue: 'Open distribution plots'})} arrow>
            <button
              className="toolbar-icon-btn"
              onClick={openDistributionsModal}
              type="button"
              aria-label={t('toolbar.openDistributions', {defaultValue: 'Open distribution plots'})}
            ><FrameDistributionsIcon/></button>
          </Tooltip>
          <Tooltip title={t('toolbar.openAnalogs', {defaultValue: 'Open analogs details'})} arrow>
            <button
              className="toolbar-icon-btn"
              onClick={openDetailsAnalogsModal}
              type="button"
              aria-label={t('toolbar.openAnalogs', {defaultValue: 'Open analogs details'})}
            ><FrameAnalogsIcon/></button>
          </Tooltip>
        </div>
      </header>
      <Suspense fallback={null}>
        {detailsAnalogsLoaded && (
          <DetailsAnalogsModal open={detailsAnalogsModalOpen} onClose={handleDetailsAnalogsModalClose}/>
        )}
        {distributionsLoaded && (
          <DistributionsModal open={distributionsModalOpen} onClose={handleDistributionsModalClose}/>
        )}
      </Suspense>
    </>
  );
}
