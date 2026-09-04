/**
 * @module components/panels/MethodConfigTree
 * @description Tree view for picking a forecast method and, optionally, one of its configurations.
 */

import React, {useCallback, useMemo} from 'react';
import {SimpleTreeView} from '@mui/x-tree-view/SimpleTreeView';
import {TreeItem} from '@mui/x-tree-view/TreeItem';

/**
 * Method/configuration selection tree.
 *
 * Tree item ids encode the selection as `methodId` or `methodId:configId`, which is what lets a
 * single selected-items array address both levels.
 *
 * @param {Object} props - Component props
 * @param {Array} props.methodConfigTree - Methods, each with a `children` array of configurations
 * @param {Object|null} props.selectedMethodConfig - Current `{method, config}` selection
 * @param {Function} props.onSelect - Called with `{method, config}` when the selection changes
 * @returns {React.ReactElement}
 * @example
 * <MethodConfigTree methodConfigTree={tree} selectedMethodConfig={sel} onSelect={setSel}/>
 */
export default function MethodConfigTree({methodConfigTree, selectedMethodConfig, onSelect}) {
  const handleSelectedItemsChange = useCallback((_, itemIds) => {
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

  const selectedItems = useMemo(() => {
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
