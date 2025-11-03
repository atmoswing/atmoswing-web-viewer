import React from 'react';

import {useConfig} from '../contexts/ConfigContext';
import {SidebarWorkspaceDropdown} from './SidebarWorkspaceDropdown.jsx';
import PanelForecasts from "./PanelForecasts.jsx";
import PanelDisplay from "./PanelDisplay.jsx";
import PanelSynthesis from "./PanelSynthesis.jsx";
import PanelStations from "./PanelStations.jsx";
import PanelAnalogDates from "./PanelAnalogDates.jsx";


export default function SideBar() {
    const config = useConfig();
    const workspaceOptions = config?.workspaces?.map(ws => ({key: ws.key, name: ws.name})) || [];

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <img src="/logo.svg" alt="Logo"/>
            </div>
            <SidebarWorkspaceDropdown options={workspaceOptions}/>
            <PanelForecasts defaultOpen={true}/>
            <PanelDisplay defaultOpen={false}/>
            <PanelSynthesis defaultOpen={true}/>
            <PanelStations defaultOpen={false}/>
            <PanelAnalogDates defaultOpen={false}/>
        </aside>
    );
}
