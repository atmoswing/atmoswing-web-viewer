import * as React from 'react';
import Panel from './Panel.jsx';
import {useMethods} from '@/contexts/ForecastsContext.jsx';
import {SimpleTreeView} from '@mui/x-tree-view/SimpleTreeView';
import {TreeItem} from '@mui/x-tree-view/TreeItem';
import {useTranslation} from 'react-i18next';
import PanelStatus from './PanelStatus.jsx';

// Presentational component for method/config selection tree.
// Props: methodConfigTree, selectedMethodConfig, onSelect
export function MethodConfigTree({methodConfigTree, selectedMethodConfig, onSelect}) {
  const handleSelectedItemsChange = React.useCallback((_, itemIds) => {
    if (!itemIds || itemIds.length === 0) return;
    const itemId = Array.isArray(itemIds) ? itemIds[0] : itemIds;
    if (!itemId) return;
    const [methodId, configId] = itemId.split(':');
    if (!methodId) return;
    const method = methodConfigTree.find(m => m.id === methodId);
    if (!method) return;
    let config = null;
    if (configId) config = method.children.find(c => c.id === configId) || null;
    onSelect({method, config});
  }, [methodConfigTree, onSelect]);

  const selectedItems = React.useMemo(() => {
    if (!selectedMethodConfig?.method) return [];
    if (selectedMethodConfig.config) return [`${selectedMethodConfig.method.id}:${selectedMethodConfig.config.id}`];
    return [selectedMethodConfig.method.id];
  }, [selectedMethodConfig]);

  return (
    <SimpleTreeView
      expansionTrigger="iconContainer"
      selectedItems={selectedItems}
      onSelectedItemsChange={handleSelectedItemsChange}
      multiSelect={false}
    >
      {methodConfigTree.map(method => (
        <TreeItem key={method.id} itemId={method.id} label={method.name}>
          {method.children.map(cfg => (
            <TreeItem
              key={`${method.id}:${cfg.id}`}
              itemId={`${method.id}:${cfg.id}`}
              label={cfg.name}
            />
          ))}
        </TreeItem>
      ))}
    </SimpleTreeView>
  );
}

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
