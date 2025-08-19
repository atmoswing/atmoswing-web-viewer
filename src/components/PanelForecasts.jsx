import * as React from 'react';
import Panel from './Panel';
import {useForecasts} from '../ForecastsContext.jsx';
import {SimpleTreeView} from '@mui/x-tree-view/SimpleTreeView';
import {TreeItem} from '@mui/x-tree-view/TreeItem';


export default function PanelForecasts(props) {
    const forecasts = useForecasts();
    const {methodConfigTree} = forecasts;
    const {setSelectedMethodConfig} = forecasts;

    const handleItemSelectionToggle = React.useCallback((event, itemId, isSelected) => {
        if (!isSelected || !itemId) return;
        const [methodId, configId] = itemId.split(':');
        if (!methodId) return;
        const method = methodConfigTree.find(m => m.id === methodId);
        if (!method) return;
        let config = null;
        if (configId) {
            config = method.children.find(c => c.id === configId);
            if (!config) return;
        }
        setSelectedMethodConfig({method, config});
    }, [methodConfigTree, setSelectedMethodConfig]);

    if (!methodConfigTree || methodConfigTree.length === 0) {
        return <Panel title="Forecasts" defaultOpen={props.defaultOpen}>No forecasts available</Panel>;
    }

    return (
        <Panel title="Forecasts" defaultOpen={props.defaultOpen}>
            <SimpleTreeView onItemSelectionToggle={handleItemSelectionToggle} expansionTrigger="iconContainer">
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
        </Panel>
    );
}