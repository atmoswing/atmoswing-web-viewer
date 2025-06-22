import * as React from 'react';
import Panel from './Panel';
import {SimpleTreeView} from '@mui/x-tree-view/SimpleTreeView';
import {TreeItem} from '@mui/x-tree-view/TreeItem';


export default function PanelForecasts(props) {
    return (
        <Panel title="Forecasts" defaultOpen={props.defaultOpen}>
            <SimpleTreeView>
                <TreeItem itemId="1" label="Analogie circulation (4Zo) ARPEGE">
                    <TreeItem itemId="2" label="Alpes du Nord" />
                    <TreeItem itemId="3" label="Alpes du Sud" />
                </TreeItem>
                <TreeItem itemId="4" label="Analogie circulation (4Zo) CEP">
                    <TreeItem itemId="5" label="Alpes du Nord" />
                    <TreeItem itemId="6" label="Alpes du Sud" />
                </TreeItem>
            </SimpleTreeView>
        </Panel>
    );
}