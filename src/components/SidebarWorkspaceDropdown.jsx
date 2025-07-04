import * as React from 'react';
import { useWorkspace } from '../WorkspaceContext';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

export function SidebarWorkspaceDropdown({options = []}) {
    const { workspace, setWorkspace } = useWorkspace();

    React.useEffect(() => {
        if (options.length > 0) {
            setWorkspace(options[0].key);
        }
    }, [options, setWorkspace]);

    const handleChange = (event) => {
        setWorkspace(event.target.value);
    };

    return (
        <FormControl variant="standard" sx={{ m: 0 }}>
            <Select
                className="sidebar-dropdown-input"
                id="select-workspace"
                value={workspace}
                onChange={handleChange}
                label="Workspace"
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