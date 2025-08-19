import * as React from 'react';
import Panel from './Panel';
import {useWorkspace} from '../WorkspaceContext';
import {SimpleTreeView} from '@mui/x-tree-view/SimpleTreeView';
import {TreeItem} from '@mui/x-tree-view/TreeItem';


export default function PanelForecasts(props) {
    const {getMethodConfigTree} = useWorkspace();
    const methodConfigTree = getMethodConfigTree();

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