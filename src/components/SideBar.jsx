import React from 'react';

import {useConfig} from '../contexts/ConfigContext';
import {SidebarWorkspaceDropdown} from './SidebarWorkspaceDropdown.jsx';
import PanelForecasts from "./PanelForecasts.jsx";
import PanelDisplay from "./PanelDisplay.jsx";
import PanelSynthesis from "./PanelSynthesis.jsx";
import PanelStations from "./PanelStations.jsx";
import PanelAnalogDates from "./PanelAnalogDates.jsx";
import Snackbar from '@mui/material/Snackbar';
import {useTranslation} from 'react-i18next';


export default function SideBar() {
    const {t} = useTranslation();
    const config = useConfig();
    const workspaceOptions = config?.workspaces?.map(ws => ({key: ws.key, name: ws.name})) || [];
    const workspacesLoaded = config?.__workspacesLoaded; // flag from context

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <img src="/logo.svg" alt="Logo"/>
            </div>
            {workspacesLoaded && workspaceOptions.length === 0 && (
                <Snackbar
                    anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
                    open={true}
                    message={t('workspace.noWorkspaces')}
                    autoHideDuration={6000}
                />
            )}
            <SidebarWorkspaceDropdown options={workspaceOptions}/>
            <PanelForecasts defaultOpen={true}/>
            <PanelDisplay defaultOpen={false}/>
            <PanelSynthesis defaultOpen={true}/>
            <PanelStations defaultOpen={false}/>
            <PanelAnalogDates defaultOpen={false}/>
        </aside>
    );
}
