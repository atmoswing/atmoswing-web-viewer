/**
 * @module components/sidebar/SidebarWorkspaceDropdown
 * @description Dropdown selector for choosing active workspace region.
 */

import * as React from 'react';
import {useWorkspace} from '@/contexts/WorkspaceContext.jsx';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import {useTranslation} from 'react-i18next';

export function SidebarWorkspaceDropdown({options = []}) {
  /**
   * SidebarWorkspaceDropdown component.
   * @param {Object} props
   * @param {Array<{key:string,name:string}>} props.options - Workspace options
   * @returns {React.ReactElement}
   */

  const {t} = useTranslation();
  const {workspace, setWorkspace} = useWorkspace();

  const handleChange = (event) => {
    setWorkspace(event.target.value);
  };

  const value = workspace || (options[0]?.key ?? '');

  return (
    <FormControl variant="standard" sx={{m: 0}}>
      <Select
        variant="standard"
        className="sidebar-dropdown-input"
        id="select-workspace"
        value={value}
        onChange={handleChange}
        label={t('workspace.label')}
      >
        {options.map(opt => (
          <MenuItem key={opt.key} value={opt.key}>
            {opt.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
