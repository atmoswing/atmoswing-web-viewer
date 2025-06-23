import * as React from 'react';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

export function SidebarWorkspaceDropdown({options = [], value, onChange, label}) {
    const [wksp, setWorkspace] = React.useState('');
    const handleChange = (event) => {
        setWorkspace(event.target.value);
    };

    return (
        <FormControl variant="standard" sx={{ m: 0 }}>
            <Select
                className="sidebar-dropdown-input"
                id="select-workspace"
                value={wksp}
                onChange={handleChange}
                label="Workspace"
            >
                {options.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}