/**
 * @module components/panels/PanelForecasts
 * @description Panel for selecting forecast method and configuration using a tree view.
 */

import React from 'react';
import Panel from './Panel.jsx';
import {useMethods} from '@/contexts/forecast/ForecastsContext.jsx';
import {useTranslation} from 'react-i18next';
import PanelStatus from './PanelStatus.jsx';
import MethodConfigTree from './MethodConfigTree.jsx';

/**
 * PanelForecasts component wrapping the method/config tree inside a collapsible panel.
 * @param {Object} props
 * @param {boolean} [props.defaultOpen] - Initial open state for panel
 * @returns {React.ReactElement}
 */
export default function PanelForecasts(props) {
  const {t} = useTranslation();
  const {methodConfigTree, selectedMethodConfig, setSelectedMethodConfig} = useMethods();

  if (!methodConfigTree || methodConfigTree.length === 0) {
    return (
      <Panel title={t('panel.forecasts')} defaultOpen={props.defaultOpen}>
        <PanelStatus loading messages={{loading: t('forecasts.loading')}}/>
      </Panel>
    );
  }

  return (
    <Panel title={t('panel.forecasts')} defaultOpen={props.defaultOpen}>
      <MethodConfigTree
        methodConfigTree={methodConfigTree}
        selectedMethodConfig={selectedMethodConfig}
        onSelect={setSelectedMethodConfig}
      />
    </Panel>
  );
}
