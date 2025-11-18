/**
 * @module components/toolbar/ToolBar
 * @description Main application toolbar providing access to distribution and analog details modals and central navigation controls.
 */

import React from 'react';

import FrameDistributionsIcon from '@/assets/toolbar/frame_distributions.svg?react';
import FrameAnalogsIcon from '@/assets/toolbar/frame_analogs.svg?react';

import Tooltip from '@mui/material/Tooltip';
import {useTranslation} from 'react-i18next';
import {DetailsAnalogsModal, DistributionsModal} from '@/components/modals';
import ToolbarSquares from './ToolbarSquares.jsx';
import ToolbarCenter from './ToolbarCenter.jsx';

export default function ToolBar() {
  /**
   * ToolBar component.
   * @returns {React.ReactElement}
   */

  const [detailsAnalogsModalOpen, setDetailsAnalogsModalOpen] = React.useState(false);
  const [distributionsModalOpen, setDistributionsModalOpen] = React.useState(false);

  const handleDetailsAnalogsModalClose = (result) => {
    setDetailsAnalogsModalOpen(false);
  };

  const handleDistributionsModalClose = (result) => {
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
              onClick={() => setDistributionsModalOpen(true)}
              type="button"
              aria-label={t('toolbar.openDistributions', {defaultValue: 'Open distribution plots'})}
            ><FrameDistributionsIcon/></button>
          </Tooltip>
          <Tooltip title={t('toolbar.openAnalogs', {defaultValue: 'Open analogs details'})} arrow>
            <button
              className="toolbar-icon-btn"
              onClick={() => setDetailsAnalogsModalOpen(true)}
              type="button"
              aria-label={t('toolbar.openAnalogs', {defaultValue: 'Open analogs details'})}
            ><FrameAnalogsIcon/></button>
          </Tooltip>
        </div>
      </header>
      <DetailsAnalogsModal open={detailsAnalogsModalOpen} onClose={handleDetailsAnalogsModalClose}/>
      <DistributionsModal open={distributionsModalOpen} onClose={handleDistributionsModalClose}/>
    </>
  );
}
