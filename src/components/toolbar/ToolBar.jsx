import React from 'react';

import FrameDistributionsIcon from '../../assets/toolbar/frame_distributions.svg?react';
import FrameAnalogsIcon from '../../assets/toolbar/frame_analogs.svg?react';

import Tooltip from '@mui/material/Tooltip';
import {useTranslation} from 'react-i18next';
import {ModalAnalogs, ModalDistributions} from '../modals';
import ToolbarSquares from './ToolbarSquares.jsx';
import ToolbarCenter from './ToolbarCenter.jsx';

export default function ToolBar() {
  const [modalAnalogsOpen, setModalAnalogsOpen] = React.useState(false);
  const [modalDistributionsOpen, setModalDistributionsOpen] = React.useState(false);

  const handleModalAnalogsClose = (result) => {
    setModalAnalogsOpen(false);
    if (result && typeof result === 'object') {
      console.log('Analogs modal selection:', result);
    }
  };

  const handleModalDistributionsClose = (result) => {
    setModalDistributionsOpen(false);
    if (result && typeof result === 'object') {
      console.log('Distributions modal selection:', result);
    }
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
              onClick={() => setModalDistributionsOpen(true)}
              type="button"
              aria-label={t('toolbar.openDistributions', {defaultValue: 'Open distribution plots'})}
            ><FrameDistributionsIcon/></button>
          </Tooltip>
          <Tooltip title={t('toolbar.openAnalogs', {defaultValue: 'Open analogs details'})} arrow>
            <button
              className="toolbar-icon-btn"
              onClick={() => setModalAnalogsOpen(true)}
              type="button"
              aria-label={t('toolbar.openAnalogs', {defaultValue: 'Open analogs details'})}
            ><FrameAnalogsIcon/></button>
          </Tooltip>
        </div>
      </header>
      <ModalAnalogs open={modalAnalogsOpen} onClose={handleModalAnalogsClose}/>
      <ModalDistributions open={modalDistributionsOpen} onClose={handleModalDistributionsClose}/>
    </>
  );
}
