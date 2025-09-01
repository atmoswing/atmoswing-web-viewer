import React from 'react';

import {useConfig} from '../contexts/ConfigContext';
import {SidebarWorkspaceDropdown} from './SidebarWorkspaceDropdown.jsx';
import PanelForecasts from "./PanelForecasts.jsx";
import PanelDisplay from "./PanelDisplay.jsx";
import PanelAlarms from "./PanelAlarms.jsx";
import PanelStations from "./PanelStations.jsx";
import PanelAnalogDates from "./PanelAnalogDates.jsx";
import Snackbar from '@mui/material/Snackbar';


export default function SideBar() {
    const config = useConfig();
    const workspaceOptions = config?.workspaces?.map(ws => ({
        key: ws.key,
        name: ws.name
    })) || [];

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <img src="./logo.svg" alt="Logo"/>
            </div>
            {workspaceOptions.length === 0 && (
                <Snackbar
                    anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
                    open={true}
                    message="No workspaces available. Please check your configuration."
                    autoHideDuration={6000}
                />
            )}
            <SidebarWorkspaceDropdown
                options={workspaceOptions}
            />
            <PanelForecasts defaultOpen={true}/>
            <PanelDisplay defaultOpen={false}/>
            <PanelAlarms defaultOpen={true}/>
            <PanelStations defaultOpen={false}/>
            <PanelAnalogDates defaultOpen={false}/>
        </aside>
    );
}