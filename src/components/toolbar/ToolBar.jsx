/**
 * @module components/toolbar/ToolBar
 * @description Main application toolbar providing access to the forecast details modal and central navigation controls.
 */

import React from 'react';

import '@/styles/toolbar.css';

import FrameDistributionsIcon from '@/assets/toolbar/frame_distributions.svg?react';

import Tooltip from '@mui/material/Tooltip';
import {useTranslation} from 'react-i18next';
import ToolbarSquares from './ToolbarSquares.jsx';
import ToolbarCenter from './ToolbarCenter.jsx';
import {useForecastDetails} from '@/contexts/ForecastDetailsContext.jsx';

/**
 * ToolBar component.
 * @returns {React.ReactElement}
 */
export default function ToolBar() {
  const {openForecastDetails} = useForecastDetails();
  const {t} = useTranslation();

  return (
    <header className="toolbar">
      <ToolbarSquares/>
      <ToolbarCenter/>
      <div className="toolbar-right">
        <Tooltip title={t('toolbar.openForecastDetails')} arrow>
          <button
            className="toolbar-icon-btn"
            onClick={() => openForecastDetails()}
            type="button"
            aria-label={t('toolbar.openForecastDetails')}
          ><FrameDistributionsIcon/></button>
        </Tooltip>
      </div>
    </header>
  );
}
