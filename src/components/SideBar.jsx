import React, {useState} from 'react';

import {SidebarWorkspaceDropdown} from './SidebarWorkspaceDropdown.jsx';
import PanelForecasts from "./PanelForecasts.jsx";
import PanelGisLayers from "./PanelGisLayers.jsx";
import PanelAlarms from "./PanelAlarms.jsx";
import PanelCaption from "./PanelCaption.jsx";
import PanelStations from "./PanelStations.jsx";
import PanelAnalogDates from "./PanelAnalogDates.jsx";


export default function SideBar() {
    const [workspaceSelected, workspaceSetSelected] = useState('zap');
    const workspaceOptions = [
        { value: 'zap', label: 'ZAP' },
        { value: 'adn', label: 'Alpes du Nord' },
        { value: 'laci', label: 'Loire-Allier-Cher-Indre' }
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <img src="./logo.svg" alt="Logo"/>
            </div>
            <SidebarWorkspaceDropdown
                options={workspaceOptions}
                value={workspaceSelected}
                onChange={workspaceSetSelected}
            />
            <PanelForecasts defaultOpen={true}/>
            <PanelGisLayers defaultOpen={false}/>
            <PanelAlarms defaultOpen={true}/>
            <PanelStations defaultOpen={false}/>
            <PanelAnalogDates defaultOpen={false}/>
            <PanelCaption defaultOpen={true}/>
        </aside>
    );
}