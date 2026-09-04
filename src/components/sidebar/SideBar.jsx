/**
 * @module components/sidebar/SideBar
 * @description Application sidebar containing workspace selector and forecast-related panels.
 */

import React from 'react';

import '@/styles/sidebar.css';

import {useConfig} from '@/contexts/ConfigContext.jsx';
import {SidebarWorkspaceDropdown} from './SidebarWorkspaceDropdown.jsx';
import {PanelAnalogDates, PanelDisplay, PanelForecasts, PanelStations, PanelSynthesis} from "../panels";


/**
 * SideBar component.
 * @returns {React.ReactElement}
 */
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
