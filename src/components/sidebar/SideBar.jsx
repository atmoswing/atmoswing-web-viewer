import React from 'react';

import {useConfig} from '../../contexts/ConfigContext.jsx';
import {SidebarWorkspaceDropdown} from './SidebarWorkspaceDropdown.jsx';
import {PanelAnalogDates, PanelDisplay, PanelForecasts, PanelStations, PanelSynthesis} from "../panels";


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
