import React from 'react';

import {useConfig} from '../../contexts/ConfigContext.jsx';
import {SidebarWorkspaceDropdown} from './SidebarWorkspaceDropdown.jsx';
import PanelForecasts from "../panels/PanelForecasts.jsx";
import PanelDisplay from "../panels/PanelDisplay.jsx";
import PanelSynthesis from "../panels/PanelSynthesis.jsx";
import PanelStations from "../panels/PanelStations.jsx";
import PanelAnalogDates from "../panels/PanelAnalogDates.jsx";


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
